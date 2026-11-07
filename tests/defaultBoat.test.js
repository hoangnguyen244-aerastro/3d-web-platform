import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BOAT_BYTES, DEFAULT_BOAT_FILENAME, DEFAULT_BOAT_SHA256, loadBoatFile } from '../src/loaders/defaultBoat.js';

test('default boat manifest refers to the supplied original FBX', () => {
  assert.equal(DEFAULT_BOAT_FILENAME, 'Boat.fbx');
  assert.equal(DEFAULT_BOAT_BYTES, 1131936);
  assert.equal(DEFAULT_BOAT_SHA256.length, 64);
});
test('default loader reports missing asset without crashing application', async () => {
  await assert.rejects(loadBoatFile('/models/Boat.fbx', async () => ({ ok:false,status:404 })), /not installed/);
});
test('default loader rejects altered file sizes rather than silently importing a different model', async () => {
  await assert.rejects(loadBoatFile('/models/Boat.fbx', async () => ({
    ok:true,arrayBuffer:async()=>new Uint8Array(10).buffer
  })), /size differs/);
});
