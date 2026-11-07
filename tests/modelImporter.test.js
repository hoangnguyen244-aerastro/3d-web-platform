import test from 'node:test';
import assert from 'node:assert/strict';
import { IMPORT_EXTENSIONS, fileExtension, validateModelFile, import3DFile } from '../src/loaders/modelImporter.js';

function fakeFile(name, contents) {
  const bytes = new TextEncoder().encode(contents);
  return { name, size: bytes.length, arrayBuffer: async () => bytes.buffer };
}

test('recognizes common formats without case sensitivity', () => {
  assert.equal(fileExtension('PART.STL'), 'stl');
  assert.equal(fileExtension('sample.MODEL.OBJ'), 'obj');
  assert.ok(IMPORT_EXTENSIONS.includes('usdz'));
  assert.ok(IMPORT_EXTENSIONS.includes('pdb'));
});

test('rejects unsupported, empty and oversized local files', () => {
  assert.throws(() => validateModelFile(fakeFile('model.step', 'geometry')), /Unsupported format/);
  assert.throws(() => validateModelFile({ name: 'empty.stl', size: 0 }), /empty/);
  assert.throws(() => validateModelFile({ name: 'huge.obj', size: 51 * 1024 * 1024 }), /50 MB/);
});

test('parses OBJ into one or more selectable meshes', async () => {
  const obj = 'o Triangle\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n';
  const result = await import3DFile(fakeFile('triangle.obj', obj));
  assert.ok(result.meshCount >= 1);
  assert.equal(result.extension, 'obj');
  assert.ok(result.scene.isObject3D);
});

test('parses ASCII STL into a mesh', async () => {
  const stl = 'solid test\nfacet normal 0 0 1\n outer loop\n  vertex 0 0 0\n  vertex 1 0 0\n  vertex 0 1 0\n endloop\nendfacet\nendsolid test';
  const result = await import3DFile(fakeFile('triangle.stl', stl));
  assert.equal(result.meshCount, 1);
  assert.equal(result.pointCount, 0);
});

test('parses point-cloud XYZ without claiming mesh support', async () => {
  const result = await import3DFile(fakeFile('points.xyz', '0 0 0\n1 1 1\n2 2 2\n'));
  assert.equal(result.meshCount, 0);
  assert.equal(result.pointCount, 3);
});
