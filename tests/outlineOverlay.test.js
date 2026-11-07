import test from 'node:test';
import assert from 'node:assert/strict';
import { BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three';
import { createOutlineOverlay, disposeOutlineOverlay } from '../src/utils/outlineOverlay.js';

function fixture() {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([
    -1, 0, -1, 0, 0, -1, -1, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0, 1,
  ], 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(Array.from({ length: 6 }, () => [0, 1, 0]).flat(), 3));
  geometry.setIndex([0, 1, 2, 1, 3, 2, 1, 4, 3, 4, 5, 3]);
  geometry.addGroup(0, 6, 0);
  geometry.addGroup(6, 6, 1);
  const parent = new Group();
  const mesh = new Mesh(geometry, [new MeshStandardMaterial(), new MeshStandardMaterial()]);
  parent.add(mesh);
  return { parent, mesh, geometry };
}
test('outline is detached from mesh and does not change its bounding box', () => {
  const { parent, mesh, geometry } = fixture();
  const outline = createOutlineOverlay(mesh, 0, 0.025);
  assert.equal(outline.parent, null);
  assert.equal(mesh.children.length, 0);
  assert.equal(parent.children.length, 1);
  assert.equal(outline.geometry, geometry);
  assert.equal(outline.material.length, 2);
  assert.equal(outline.material[0].isRawShaderMaterial, true);
  assert.equal(outline.material[1].visible, false);
  assert.equal(outline.matrixAutoUpdate, false);
  assert.equal(outline.frustumCulled, false);
  disposeOutlineOverlay(outline);
  mesh.material.forEach(x => x.dispose()); geometry.dispose();
});
test('outline can target the second material slot independently', () => {
  const { mesh, geometry } = fixture();
  const outline = createOutlineOverlay(mesh, 1, 0.08);
  assert.equal(outline.material[0].visible, false);
  assert.equal(outline.material[1].isRawShaderMaterial, true);
  assert.ok(outline.material[1].uniforms.uOutlineWidth.value > 0);
  disposeOutlineOverlay(outline);
  mesh.material.forEach(x => x.dispose()); geometry.dispose();
});
test('unsupported skinned or missing-normal mesh never causes a rendering mutation', () => {
  const { mesh, geometry } = fixture();
  mesh.isSkinnedMesh = true;
  assert.throws(() => createOutlineOverlay(mesh, 0), /static mesh/);
  mesh.isSkinnedMesh = false;
  geometry.deleteAttribute('normal');
  assert.throws(() => createOutlineOverlay(mesh, 0), /vertex normals/);
  assert.equal(mesh.children.length, 0);
  mesh.material.forEach(x => x.dispose()); geometry.dispose();
});
