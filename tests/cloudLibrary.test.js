import test from 'node:test';
import assert from 'node:assert/strict';
import { assetStoragePath, safeAssetName, uploadOwnedAsset, listOwnedAssets, deleteOwnedAsset, openOwnedAsset } from '../src/cloud/cloudLibrary.js';

const uid = '00000000-0000-4000-8000-000000000001';
const id = '00000000-0000-4000-8000-000000000002';

test('storage paths cannot cross account directories or accept unsupported extensions', () => {
  assert.equal(assetStoragePath(uid, id, 'fbx'), uid + '/' + id + '/original.fbx');
  assert.throws(() => assetStoragePath('../../other', id, 'fbx'), /Invalid/);
  assert.throws(() => assetStoragePath(uid, id, 'exe'), /Unsupported/);
  assert.equal(safeAssetName('../Boat.fbx'), '.._Boat.fbx');
});

test('upload writes original to private bucket and inserts owner-scoped metadata', async () => {
  const actions = [];
  const client = {
    storage: { from(bucket) {
      assert.equal(bucket,'asset-originals');
      return { upload: async (path,file,opts) => {
        actions.push({kind:'upload',path,file,opts});return {error:null};
      }, remove:async paths=>{actions.push({kind:'remove',paths});return {error:null}} };
    }},
    from(table) { assert.equal(table,'assets'); return {
      insert(row){ actions.push({kind:'insert',row}); return {select(){return {single:async()=>({data:{id:row.id},error:null})}}}; }
    }}
  };
  const previousCrypto = globalThis.crypto;
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{randomUUID:()=>id}});
  try {
    const file={name:'Boat.fbx',size:4096,type:'application/octet-stream'};
    const result=await uploadOwnedAsset(client,uid,file);
    assert.equal(result,id);
    assert.equal(actions[0].path, uid+'/'+id+'/original.fbx');
    assert.equal(actions[0].opts.upsert,false);
    assert.equal(actions[1].row.owner_id,uid);
  } finally {Object.defineProperty(globalThis,'crypto',{configurable:true,value:previousCrypto});}
});

test('list enforces account ID and private opening uses authenticated download', async()=>{
  let selected;
  const client={
    from:()=>({select:()=>({eq:(field,idValue)=>{selected=[field,idValue];return {order:()=>({limit:async()=>({data:[],error:null})})}}})}),
    storage:{from:()=>({download:async()=>({data:new Blob(['o Cube\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3']),error:null})})}
  };
  assert.deepEqual(await listOwnedAssets(client,uid),[]);
  assert.deepEqual(selected,['owner_id',uid]);
  const f=await openOwnedAsset(client,{storage_path:uid+'/'+id+'/original.obj',original_name:'Cube.obj'});
  assert.equal(f.name,'Cube.obj');
});

test('delete removes private storage object before its record',async()=>{
  const order=[];
  const client={storage:{from:()=>({remove:async()=>{order.push('storage');return {error:null}}})},
    from:()=>({delete:()=>({eq:async()=>{order.push('metadata');return {error:null}}})})};
  await deleteOwnedAsset(client,{id,storage_path:uid+'/'+id+'/original.fbx'});
  assert.deepEqual(order,['storage','metadata']);
});
