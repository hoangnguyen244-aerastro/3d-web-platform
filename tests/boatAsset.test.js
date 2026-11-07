import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DEFAULT_BOAT_BYTES, DEFAULT_BOAT_SHA256 } from '../src/loaders/defaultBoat.js';

const asset = new URL('../public/models/Boat.fbx', import.meta.url);
// This test becomes active as soon as the original binary is committed.
// Until then PR #4 remains in draft and is not considered release-ready.
test('installed Boat.fbx matches original attachment and contains embedded textures', { skip: !existsSync(asset) && 'Boat.fbx not yet committed' }, () => {
  const data = readFileSync(asset);
  assert.equal(data.length, DEFAULT_BOAT_BYTES);
  assert.equal(createHash('sha256').update(data).digest('hex'), DEFAULT_BOAT_SHA256);
  assert.ok(data.subarray(0, 23).toString('ascii').startsWith('Kaydara FBX Binary'));
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(data.toString('latin1').split(pngSignature.toString('latin1')).length - 1, 2);
});
