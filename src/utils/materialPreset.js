// Portable, versioned material preset. Uploaded bitmap texture bytes are intentionally excluded.
export const MATERIAL_PRESET_VERSION = 1;
const hex = value => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
const finite = x => typeof x === 'number' && Number.isFinite(x);
const clamp = (x, min, max) => Math.min(max, Math.max(min, x));

export function parseMaterialPreset(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.format !== '3d-web-platform-material-preset' || raw.version !== MATERIAL_PRESET_VERSION) {
    throw new Error('Unsupported material preset format or version.');
  }
  if (raw.mode !== 'pbr' && raw.mode !== 'shader') throw new Error('Preset mode must be pbr or shader.');
  if (!raw.pbr || !hex(raw.pbr.baseColor) || !hex(raw.pbr.emissive) || !finite(raw.pbr.metalness) || !finite(raw.pbr.roughness)) {
    throw new Error('Invalid PBR material properties.');
  }
  if (raw.mode === 'shader' && (!raw.shader || typeof raw.shader.vertex !== 'string' || typeof raw.shader.fragment !== 'string' ||
    !raw.shader.vertex.trim() || !raw.shader.fragment.trim() || raw.shader.vertex.length > 65536 || raw.shader.fragment.length > 65536)) {
    throw new Error('Shader preset must include valid GLSL source (up to 64 KB per stage).');
  }
  const u = raw.uniforms || {};
  return {
    format: '3d-web-platform-material-preset', version: MATERIAL_PRESET_VERSION, mode: raw.mode,
    pbr: {
      baseColor: raw.pbr.baseColor, emissive: raw.pbr.emissive,
      metalness: clamp(raw.pbr.metalness, 0, 1), roughness: clamp(raw.pbr.roughness, 0, 1),
      wireframe: Boolean(raw.pbr.wireframe),
    },
    visible: raw.visible !== false,
    shader: raw.mode === 'shader' ? {
      vertex: raw.shader.vertex, fragment: raw.shader.fragment,
      outlineEnabled: Boolean(raw.shader.outlineEnabled),
      outlineSize: clamp(finite(raw.shader.outlineSize) ? raw.shader.outlineSize : 0.025, 0.005, 0.1),
    } : null,
    uniforms: {
      color: hex(u.color) ? u.color : raw.pbr.baseColor,
      speed: clamp(finite(u.speed) ? u.speed : 1, 0, 5),
      intensity: clamp(finite(u.intensity) ? u.intensity : 1, 0, 2),
    },
  };
}

export function makeMaterialPreset(inspector) {
  return parseMaterialPreset({
    format: '3d-web-platform-material-preset', version: MATERIAL_PRESET_VERSION,
    mode: inspector.mode, pbr: {
      baseColor: inspector.baseColor, emissive: inspector.emissive,
      metalness: inspector.metalness, roughness: inspector.roughness,
      wireframe: inspector.wireframe,
    },
    visible: inspector.visible, shader: inspector.shader,
    uniforms: inspector.uniforms,
  });
}
