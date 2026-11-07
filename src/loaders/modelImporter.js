// Local-only 3D import adapters. No upload and no remote asset lookup.
// Model file and embedded resources only: sidecar .mtl/.bin/.png files are not resolved.
import { BufferGeometry, Group, Mesh, MeshStandardMaterial, Points, PointsMaterial, DoubleSide } from 'three';

export const IMPORT_FORMATS = Object.freeze({
  glb: 'glTF binary',
  gltf: 'glTF JSON (embedded resources)',
  fbx: 'Autodesk FBX',
  obj: 'Wavefront OBJ',
  stl: 'STL (CAD / printing)',
  ply: 'PLY (surface / scan)',
  '3mf': '3MF (additive manufacturing)',
  usdz: 'USDZ (archived USD)',
  vtk: 'VTK POLYDATA (scientific surface)',
  pcd: 'PCD (point cloud)',
  xyz: 'XYZ (point cloud)',
  pdb: 'PDB (molecular atoms)',
});
export const IMPORT_EXTENSIONS = Object.freeze(Object.keys(IMPORT_FORMATS));
export const IMPORT_ACCEPT = IMPORT_EXTENSIONS.map(x => '.' + x).join(',');

export function fileExtension(name) {
  return String(name).toLowerCase().split('.').pop();
}
export function validateModelFile(file) {
  if (!file || !IMPORT_EXTENSIONS.includes(fileExtension(file.name))) {
    throw new Error('Unsupported format. Supported: ' + IMPORT_ACCEPT + '.');
  }
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('Files larger than 50 MB are not supported in this browser preview.');
  }
  if (file.size === 0) throw new Error('The selected file is empty.');
  return fileExtension(file.name);
}
function createSurface(geometry, name) {
  if (!geometry?.getAttribute('position')?.count) throw new Error('No vertices found in the file.');
  if (!geometry.getAttribute('normal') && geometry.index) geometry.computeVertexNormals();
  const material = new MeshStandardMaterial({ color: '#a7c9df', roughness: 0.75, metalness: 0.05, side: DoubleSide, vertexColors: geometry.hasAttribute('color') });
  const node = new Mesh(geometry, material);
  node.name = name;
  return node;
}
function createCloud(geometry, name) {
  if (!geometry?.getAttribute('position')?.count) throw new Error('No 3D points found in the file.');
  const points = new Points(geometry, new PointsMaterial({
    color: '#ffffff', size: 0.025, sizeAttenuation: true, vertexColors: geometry.hasAttribute('color'),
  }));
  points.name = name;
  return points;
}
function asGroup(node) {
  if (node?.isGroup || node?.isScene) return node;
  const group = new Group();
  group.add(node);
  return group;
}
function geometryHasFaces(geo) {
  return Boolean(geo.index?.count || geo.getAttribute('normal')?.count);
}
// Fallback for geometry-only PLY that holds a pure point set.
function plyObject(geometry) {
  return geometryHasFaces(geometry) ? createSurface(geometry, 'PLY Surface') : createCloud(geometry, 'PLY Points');
}

/**
 * Reads one model from a File. Sidecar dependencies are unsupported; use
 * embedded glTF/FBX resources or convert to a self-contained GLB beforehand.
 */
export async function import3DFile(file) {
  const ext = validateModelFile(file);
  const data = await file.arrayBuffer();
  let scene;
  switch (ext) {
    case 'glb':
    case 'gltf': {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const input = ext === 'gltf' ? new TextDecoder().decode(data) : data;
      const gltf = await new GLTFLoader().parseAsync(input, '');
      scene = gltf.scene;
      break;
    }
    case 'fbx': {
      const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
      scene = new FBXLoader().parse(data, '');
      break;
    }
    case 'obj': {
      const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
      scene = new OBJLoader().parse(new TextDecoder().decode(data));
      break;
    }
    case 'stl': {
      const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
      scene = createSurface(new STLLoader().parse(data), 'STL Surface');
      break;
    }
    case 'ply': {
      const { PLYLoader } = await import('three/addons/loaders/PLYLoader.js');
      scene = plyObject(new PLYLoader().parse(data));
      break;
    }
    case '3mf': {
      const { ThreeMFLoader } = await import('three/addons/loaders/3MFLoader.js');
      scene = new ThreeMFLoader().parse(data);
      break;
    }
    case 'usdz': {
      // The version-pinned three.js USDZLoader supports a subset of USDZ files.
      const { USDZLoader } = await import('three/addons/loaders/USDZLoader.js');
      scene = new USDZLoader().parse(data);
      break;
    }
    case 'vtk': {
      const { VTKLoader } = await import('three/addons/loaders/VTKLoader.js');
      scene = createSurface(new VTKLoader().parse(data), 'VTK Surface');
      break;
    }
    case 'pcd': {
      const { PCDLoader } = await import('three/addons/loaders/PCDLoader.js');
      scene = new PCDLoader().parse(data, file.name);
      break;
    }
    case 'xyz': {
      const { XYZLoader } = await import('three/addons/loaders/XYZLoader.js');
      scene = createCloud(new XYZLoader().parse(new TextDecoder().decode(data)), 'XYZ Point Cloud');
      break;
    }
    case 'pdb': {
      const { PDBLoader } = await import('three/addons/loaders/PDBLoader.js');
      const pdb = new PDBLoader().parse(new TextDecoder().decode(data));
      scene = createCloud(pdb.geometryAtoms, 'PDB Atoms');
      break;
    }
    default:
      throw new Error('Unsupported 3D format: ' + ext);
  }
  if (!scene) throw new Error('The loader returned no 3D scene.');
  const root = asGroup(scene);
  let meshCount = 0, pointCount = 0;
  root.traverse(node => {
    if (node.isMesh) meshCount++;
    if (node.isPoints) pointCount += node.geometry?.getAttribute('position')?.count || 0;
  });
  if (meshCount === 0 && pointCount === 0) throw new Error('No visible mesh or point cloud was found.');
  return { scene: root, extension: ext, meshCount, pointCount };
}
