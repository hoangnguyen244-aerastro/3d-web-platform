import { BackSide, Mesh, MeshStandardMaterial, RawShaderMaterial } from 'three';
import { materialSlotCount, materialsOf } from './materialSlots.js';
import { ANIME_OUTLINE_VERTEX, ANIME_OUTLINE_FRAGMENT } from '../shaders/animeToon.js';

/**
 * Creates a detached outline mesh. Never parent it under the source mesh:
 * doing so alters bounds/picking and may break React Three Fiber reconciliation.
 * The owning Scene attaches it at its root and copies matrixWorld each frame.
 */
export function createOutlineOverlay(mesh, slotIndex, widthFraction = 0.025) {
  if (mesh.isSkinnedMesh || !mesh.geometry?.getAttribute('normal')) {
    throw new Error('Outline needs a static mesh with vertex normals.');
  }
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= materialSlotCount(mesh)) {
    throw new RangeError('Invalid material slot for outline.');
  }
  mesh.geometry.computeBoundingSphere();
  const radius = Math.max(mesh.geometry.boundingSphere?.radius || 1, 0.001);
  const width = Math.max(0.005, Math.min(0.1, widthFraction));
  const material = new RawShaderMaterial({
    vertexShader: ANIME_OUTLINE_VERTEX,
    fragmentShader: ANIME_OUTLINE_FRAGMENT,
    side: BackSide,
    depthWrite: false,
    uniforms: { uOutlineWidth: { value: radius * width } },
  });
  // One draw per actual geometry group. Other slots use invisible placeholders;
  // this prevents shader outlines from covering unrelated mesh regions.
  const outlineMaterials = materialSlotCount(mesh) > 1
    ? materialsOf(mesh).map((_, index) => index === slotIndex
      ? material : new MeshStandardMaterial({ visible: false }))
    : material;
  const outline = new Mesh(mesh.geometry, outlineMaterials);
  outline.name = 'Ink outline overlay (not selectable)';
  outline.raycast = () => {};
  outline.frustumCulled = false;
  outline.renderOrder = 1;
  outline.matrixAutoUpdate = false;
  return outline;
}
export function disposeOutlineOverlay(outline) {
  if (!outline) return;
  materialsOf(outline).forEach(material => material.dispose());
  // The shared geometry belongs to the source mesh; do not dispose it here.
}
