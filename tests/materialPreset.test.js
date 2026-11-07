import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMaterialPreset, makeMaterialPreset } from '../src/utils/materialPreset.js';

const pbr = {
  format: '3d-web-platform-material-preset',
  version: 1, mode: 'pbr',
  pbr: { baseColor: '#aabbcc', emissive: '#000000', metalness: 0.35, roughness: 0.5, wireframe: false },
  visible: true,
};

test('validates a portable PBR preset', () => {
  assert.equal(parseMaterialPreset(pbr).pbr.baseColor, '#aabbcc');
  assert.equal(parseMaterialPreset(pbr).mode, 'pbr');
});
test('normalizes user-controlled uniform ranges', () => {
  const value = parseMaterialPreset({ ...pbr, uniforms: { color: '#123abc', speed: 99, intensity: -20 } });
  assert.deepEqual(value.uniforms, { color: '#123abc', speed: 5, intensity: 0 });
});
test('rejects malformed or unsupported formats', () => {
  assert.throws(() => parseMaterialPreset({ ...pbr, version: 2 }), /Unsupported/);
  assert.throws(() => parseMaterialPreset({ ...pbr, pbr: { ...pbr.pbr, baseColor: 'red' } }), /Invalid PBR/);
  assert.throws(() => parseMaterialPreset({ ...pbr, mode: 'shader' }), /Shader preset/);
});
test('round-trips GLSL shader sources and outline settings', () => {
  const input = {
    ...pbr, mode: 'shader',
    shader: { vertex: 'void main(){}', fragment: 'void main(){}', outlineEnabled: true, outlineSize: 0.04 },
    uniforms: { color: '#ff33aa', speed: 2, intensity: 0.75 },
  };
  const encoded = JSON.parse(JSON.stringify(parseMaterialPreset(input)));
  assert.deepEqual(parseMaterialPreset(encoded), parseMaterialPreset(input));
});
test('exports inspector material without embedding bitmaps', () => {
  const material = makeMaterialPreset({
    mode: 'pbr', baseColor: '#ffffff', emissive: '#000000', metalness: .2,
    roughness: .6, wireframe: false, visible: true,
    textures: { map: 'my-texture.png' },
  });
  assert.equal(material.pbr.roughness, .6);
  assert.equal(JSON.stringify(material).includes('my-texture.png'), false);
});
