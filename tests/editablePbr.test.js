import test from 'node:test';
import assert from 'node:assert/strict';
import { MeshBasicMaterial, MeshPhongMaterial, MeshStandardMaterial, MeshPhysicalMaterial, Texture } from 'three';
import { createEditablePbr } from '../src/utils/editablePbr.js';
import { materialAt, setMaterialAt } from '../src/utils/materialSlots.js';

test('OBJ/FBX Phong material gains independent editable metalness and roughness', () => {
  const source = new MeshPhongMaterial({ color: '#ff6633', shininess: 40 });
  const mesh = { material: [source, new MeshPhongMaterial({ color: '#00aaee' })] };
  const untouched = materialAt(mesh, 1);
  const edited = createEditablePbr(materialAt(mesh, 0));
  assert.equal(edited.isMeshStandardMaterial, true);
  edited.roughness = 0.26;
  edited.metalness = 0.82;
  setMaterialAt(mesh, 0, edited);
  assert.equal(materialAt(mesh, 0).roughness, 0.26);
  assert.equal(materialAt(mesh, 0).metalness, 0.82);
  assert.equal(materialAt(mesh, 1), untouched);
  assert.equal(source.color.getHexString(), 'ff6633');
  edited.dispose(); source.dispose(); untouched.dispose();
});
test('legacy Basic material retains texture and transparency when converted to PBR', () => {
  const map = new Texture();
  const original = new MeshBasicMaterial({ color: '#338899', map, transparent: true, opacity: 0.45 });
  const pbr = createEditablePbr(original);
  assert.equal(pbr.isMeshStandardMaterial, true);
  assert.equal(pbr.map, map);
  assert.equal(pbr.opacity, 0.45);
  assert.equal(pbr.transparent, true);
  assert.ok(pbr.roughness >= 0 && pbr.roughness <= 1);
  pbr.dispose(); original.dispose(); map.dispose();
});
test('native Standard / Physical materials clone without replacing their PBR data', () => {
  for (const material of [new MeshStandardMaterial({ roughness: .13, metalness: .91 }), new MeshPhysicalMaterial({ roughness: .24, metalness: .78 })]) {
    const cloned = createEditablePbr(material);
    assert.notEqual(cloned, material);
    assert.equal(cloned.roughness, material.roughness);
    assert.equal(cloned.metalness, material.metalness);
    assert.equal(cloned.type, material.type);
    cloned.dispose(); material.dispose();
  }
});
