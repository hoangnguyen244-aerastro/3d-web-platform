// Pure slot identity/access helpers. Never mutate a neighboring material slot.
export function materialsOf(mesh) {
  const value = mesh?.material;
  return Array.isArray(value) ? value : value ? [value] : [];
}
export function slotKey(meshId, slotIndex) {
  return meshId + ':' + slotIndex;
}
export function materialAt(mesh, slotIndex) {
  return materialsOf(mesh)[slotIndex] || null;
}
export function setMaterialAt(mesh, slotIndex, material) {
  const current = materialsOf(mesh);
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= current.length || !material) {
    throw new RangeError('Invalid material slot index.');
  }
  if (Array.isArray(mesh.material)) mesh.material = current.map((value, index) => index === slotIndex ? material : value);
  else mesh.material = material;
}
export function materialSlotCount(mesh) {
  return materialsOf(mesh).length;
}

/** Preserve author-provided names across shader, PBR and preset replacements. */
export function materialSlotNames(mesh) {
  return materialsOf(mesh).map((material, index) => {
    const name = typeof material?.name === 'string' ? material.name.trim() : '';
    return name || `Material ${index + 1}`;
  });
}
