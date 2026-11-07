import test from 'node:test';
import assert from 'node:assert/strict';
import { BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial } from 'three';
import { materialSlotFromHit } from '../src/utils/materialPicking.js';

function mesh() {
 const geo = new BufferGeometry();
 geo.setAttribute('position',new Float32BufferAttribute([
 0,0,0, 1,0,0, 0,1,0,
 1,0,0, 1,1,0, 0,1,0,
 ],3));
 geo.addGroup(0,3,0);geo.addGroup(3,3,1);
 return new Mesh(geo,[new MeshStandardMaterial(),new MeshStandardMaterial()]);
}
test('clicking a triangle in group 0 selects material 0',()=>{
 const m=mesh();
 assert.equal(materialSlotFromHit(m,{faceIndex:0,face:{materialIndex:0}}),0);
});
test('clicking second material group selects slot 1',()=>{
 const m=mesh();
 assert.equal(materialSlotFromHit(m,{faceIndex:1,face:{materialIndex:1}}),1);
 assert.equal(materialSlotFromHit(m,{faceIndex:1,face:{materialIndex:0}}),1);
});
test('single-material mesh always chooses slot 0',()=>{
 const m=mesh();m.material=m.material[0];
 assert.equal(materialSlotFromHit(m,{faceIndex:1,face:{materialIndex:1}}),0);
});
test('invalid group or hit never chooses nonexisting slot',()=>{
 const m=mesh();
 assert.equal(materialSlotFromHit(m,{faceIndex:20,face:{materialIndex:99}}),0);
});
