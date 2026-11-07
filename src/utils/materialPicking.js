import { materialSlotCount } from './materialSlots.js';

/**
 * Determine the material assigned to the exact triangle clicked in the viewport.
 * three.js supplies face.materialIndex for multi-material raycast intersections.
 * Fallback to geometry groups for loaders that only populate faceIndex.
 */
export function materialSlotFromHit(mesh, hit = {}) {
  const count = materialSlotCount(mesh);
  if (count <= 1) return 0;
  const faceSlot = hit.face?.materialIndex;
  if (Number.isInteger(faceSlot) && faceSlot > 0 && faceSlot < count) return faceSlot;
  const triangle = hit.faceIndex;
  if (Number.isInteger(triangle) && triangle >= 0) {
    const triangleOffset = triangle * 3;
    const group = (mesh.geometry?.groups || []).find(({start, count: length}) =>
      triangleOffset >= start && triangleOffset < start + length);
    if (group && Number.isInteger(group.materialIndex) &&
        group.materialIndex >= 0 && group.materialIndex < count) return group.materialIndex;
  }
  return Number.isInteger(faceSlot) && faceSlot >= 0 && faceSlot < count ? faceSlot : 0;
}
