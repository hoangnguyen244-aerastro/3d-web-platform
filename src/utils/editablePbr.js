import { Color, MeshStandardMaterial } from 'three';

// Preserve supported PBR materials unchanged as a clone; normalize legacy OBJ/FBX
// Phong/Basic/Toon materials to editable Standard PBR only for the selected slot.
export function createEditablePbr(original) {
  if (!original) throw new Error('Cannot edit an empty material slot.');
  if (original.isMeshStandardMaterial || original.isMeshPhysicalMaterial) return original.clone();
  return new MeshStandardMaterial({
    name: original.name || 'Imported PBR',
    color: original.color?.clone() || new Color('#ffffff'),
    emissive: original.emissive?.clone() || new Color('#000000'),
    metalness: 0,
    roughness: typeof original.shininess === 'number'
      ? Math.max(0.05, Math.min(1, 1 - original.shininess / 120)) : 0.7,
    map: original.map || null,
    normalMap: original.normalMap || null,
    metalnessMap: original.metalnessMap || null,
    roughnessMap: original.roughnessMap || null,
    emissiveMap: original.emissiveMap || null,
    transparent: Boolean(original.transparent),
    opacity: original.opacity ?? 1,
    side: original.side,
    wireframe: Boolean(original.wireframe),
    vertexColors: Boolean(original.vertexColors),
  });
}
