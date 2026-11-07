import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceShaderTime } from '../src/utils/shaderClock.js';

test('speed scales animation advance without changing the phase abruptly', () => {
  let t = advanceShaderTime(1, 0.05, 1);
  assert.ok(Math.abs(t - 1.05) < 1e-9);
  t = advanceShaderTime(t, 0.05, 2);
  assert.ok(Math.abs(t - 1.15) < 1e-9);
  t = advanceShaderTime(t, 0.05, 0);
  assert.ok(Math.abs(t - 1.15) < 1e-9);
});
test('caps frame gaps when the tab was inactive', () => {
  assert.equal(advanceShaderTime(2, 5, 1), 2.1);
  assert.equal(advanceShaderTime(2, -1, 1), 2);
});
test('clamps invalid or out-of-range speed', () => {
  assert.equal(advanceShaderTime(0, 0.1, 100), 0.5);
  assert.equal(advanceShaderTime(3, 0.1, -1), 3);
  assert.equal(advanceShaderTime(3, 0.1, Number.NaN), 3.1);
});
