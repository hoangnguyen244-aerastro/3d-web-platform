import test from 'node:test';
import assert from 'node:assert/strict';
import { materialsOf, materialAt, materialSlotCount, setMaterialAt, slotKey } from '../src/utils/materialSlots.js';
import { import3DFile } from '../src/loaders/modelImporter.js';

test('changing slot 2 keeps slot 1 material reference intact', () => {
  const first = { name: 'Red' }, second = { name: 'Blue' }, updated = { name: 'Gold' };
  const mesh = { material: [first, second] };
  setMaterialAt(mesh, 1, updated);
  assert.equal(materialSlotCount(mesh), 2);
  assert.equal(materialAt(mesh, 0), first);
  assert.equal(materialAt(mesh, 1), updated);
  assert.notEqual(mesh.material[1], second);
  assert.equal(slotKey('mesh-123', 1), 'mesh-123:1');
});
test('single-material meshes still work with slot index zero', () => {
  const original = { color: 'white' }, updated = { color: 'pink' };
  const mesh = { material: original };
  setMaterialAt(mesh, 0, updated);
  assert.equal(mesh.material, updated);
  assert.deepEqual(materialsOf(mesh), [updated]);
  assert.throws(() => setMaterialAt(mesh, 1, original), RangeError);
});
test('invalid material indices do not modify any material', () => {
  const first = {}, second = {};
  const mesh = { material: [first, second] };
  assert.throws(() => setMaterialAt(mesh, -1, {}), RangeError);
  assert.throws(() => setMaterialAt(mesh, 2, {}), RangeError);
  assert.throws(() => setMaterialAt(mesh, 0, null), RangeError);
  assert.deepEqual(mesh.material, [first, second]);
});
test('OBJ with two usemtl groups exposes a multi-material mesh', async () => {
  const data = `o TestPanel
v -1 0 -1
v 0 0 -1
v 1 0 -1
v -1 0 1
v 0 0 1
v 1 0 1
usemtl LeftRegion
f 1 4 5
f 1 5 2
usemtl RightRegion
f 2 5 6
f 2 6 3
`;
  const bytes = new TextEncoder().encode(data);
  const file = { name: 'two-materials.obj', size: bytes.length, arrayBuffer: async () => bytes.buffer };
  const { scene } = await import3DFile(file);
  let candidate;
  scene.traverse(node => { if (node.isMesh && materialSlotCount(node) > 1) candidate = node; });
  assert.ok(candidate, 'OBJLoader should create a multi-material mesh');
  assert.ok(candidate.geometry.groups.length >= 2);
  const original = materialAt(candidate, 0);
  const replacement = materialAt(candidate, 1).clone();
  setMaterialAt(candidate, 1, replacement);
  assert.equal(materialAt(candidate, 0), original);
  replacement.dispose();
});
