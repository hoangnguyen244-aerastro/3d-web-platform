import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BackSide, Box3, BoxHelper, Color, Mesh, NoColorSpace, RawShaderMaterial, SRGBColorSpace, TextureLoader, Vector3 } from 'three';
import SampleRobot from './SampleRobot.jsx';
import { ANIME_OUTLINE_VERTEX, ANIME_OUTLINE_FRAGMENT } from '../shaders/animeToon.js';

const TEXTURE_SLOTS = ['map', 'normalMap', 'metalnessMap', 'roughnessMap', 'emissiveMap'];
const COLOR_SLOTS = new Set(['map', 'emissiveMap']);

function firstMaterial(node) {
  return Array.isArray(node.material) ? node.material[0] : node.material;
}
function setFirstMaterial(node, material) {
  if (Array.isArray(node.material)) node.material = [material, ...node.material.slice(1)];
  else node.material = material;
}
function disposeModel(scene) {
  if (!scene) return;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  scene.traverse(node => {
    if (!node.isMesh) return;
    if (node.geometry) geometries.add(node.geometry);
    (Array.isArray(node.material) ? node.material : [node.material]).filter(Boolean).forEach(mat => {
      materials.add(mat);
      Object.values(mat).forEach(value => { if (value?.isTexture) textures.add(value); });
    });
  });
  geometries.forEach(x => x.dispose());
  materials.forEach(x => x.dispose());
  textures.forEach(x => x.dispose());
}
function collectMeshes(root) {
  if (!root) return [];
  const results = [];
  root.traverse(node => {
    if (!node.isMesh || !node.geometry) return;
    const vertices = node.geometry.getAttribute('position')?.count || 0;
    const elements = node.geometry.index?.count || vertices;
    results.push({
      id: node.uuid, name: node.name || ('Mesh ' + (results.length + 1)),
      vertices, triangles: Math.floor(elements / 3),
    });
  });
  return results;
}
function inspectorInfo(entry) {
  if (!entry) return null;
  const material = entry.mode === 'shader' ? entry.pbr || entry.original : firstMaterial(entry.mesh);
  const textures = {};
  TEXTURE_SLOTS.forEach(slot => {
    const tex = material?.[slot];
    textures[slot] = tex ? entry.textureNames.get(slot) || 'GLB texture' : '';
  });
  return {
    mode: entry.mode, visible: entry.mesh.visible,
    wireframe: Boolean(material?.wireframe),
    baseColor: material?.color?.getHexString ? '#' + material.color.getHexString() : '#ffffff',
    emissive: material?.emissive?.getHexString ? '#' + material.emissive.getHexString() : '#000000',
    metalness: Number(material?.metalness ?? 0),
    roughness: Number(material?.roughness ?? 1),
    textures,
    slotCount: Array.isArray(entry.mesh.material) ? entry.mesh.material.length : 1,
    uniforms: entry.uniformSettings || { color: '#ffffff', speed: 1, intensity: 1 },
    shader: entry.mode === 'shader' ? entry.shaderSettings : null,
  };
}
function Camera({ scene, resetToken, autoRotate }) {
  const controls = useRef(null);
  const { camera } = useThree();
  const frame = useMemo(() => {
    if (!scene) return { center: new Vector3(0, 0.1, 0), distance: 5.5 };
    const box = new Box3().setFromObject(scene);
    if (box.isEmpty()) return { center: new Vector3(), distance: 5.5 };
    const center = box.getCenter(new Vector3());
    const radius = Math.max(box.getSize(new Vector3()).length() / 2, 0.1);
    return { center, distance: Math.max(radius / Math.sin(camera.fov * Math.PI / 360) * 1.35, 1.5) };
  }, [scene, camera]);
  useEffect(() => {
    camera.position.copy(frame.center).addScaledVector(new Vector3(1, .7, 1).normalize(), frame.distance);
    camera.near = Math.max(0.01, frame.distance / 1000);
    camera.far = Math.max(2000, frame.distance * 100);
    camera.updateProjectionMatrix();
    if (controls.current) {
      controls.current.target.copy(frame.center);
      controls.current.minDistance = Math.max(.1, frame.distance * .2);
      controls.current.maxDistance = Math.max(10, frame.distance * 10);
      controls.current.update();
    }
  }, [frame, resetToken, camera]);
  return <OrbitControls ref={controls} autoRotate={autoRotate} autoRotateSpeed={1.2} makeDefault/>;
}
function Highlight({ root, selectedMeshId }) {
  const { scene } = useThree();
  const helper = useRef(null);
  useEffect(() => {
    const target = root?.getObjectByProperty('uuid', selectedMeshId);
    if (!target?.isMesh) return;
    const box = new BoxHelper(target, 0xffd166);
    box.raycast = () => {};
    box.renderOrder = 999;
    scene.add(box);
    helper.current = box;
    return () => {
      scene.remove(box);
      box.geometry.dispose();
      box.material.dispose();
      if (helper.current === box) helper.current = null;
    };
  }, [root, selectedMeshId, scene]);
  useFrame(() => helper.current?.update());
  return null;
}
function Scene({ file, color, metalness, roughness, autoRotate, showGrid, resetToken,
  onStatus, onMeshesChange, selectedMeshId, onSelectMesh, editCommand, onInspectorChange }) {
  const [loadedModel, setLoadedModel] = useState(null);
  const model = loadedModel?.file === file ? loadedModel.scene : null;
  const registeredScenes = useRef(new WeakSet());
  const robotRef = useRef(null);
  const registry = useRef(new Map());
  const activeRoot = file ? model : robotRef.current;
  const previousGlobal = useRef({ color, metalness, roughness });

  useEffect(() => {
    let cancelled = false;
    let loaded = null;
    setLoadedModel(null);
    if (!file) return () => { cancelled = true; };
    (async () => {
      try {
        const gltf = await new GLTFLoader().parseAsync(await file.arrayBuffer(), '');
        loaded = gltf.scene;
        if (cancelled) { disposeModel(loaded); return; }
        setLoadedModel({ file, scene: loaded });
        onStatus('Đã mở ' + file.name + ' (' + (file.size / 1048576).toFixed(2) + ' MB).');
      } catch (error) {
        if (!cancelled) onStatus('Không thể mở GLB: ' + (error?.message || 'File không hợp lệ.'));
      }
    })();
    return () => {
      cancelled = true;
      if (loaded && !registeredScenes.current.has(loaded)) disposeModel(loaded);
    };
  }, [file, onStatus]);

  useEffect(() => {
    const current = new Map();
    const root = file ? model : robotRef.current;
    root?.traverse(node => {
      if (!node.isMesh) return;
      current.set(node.uuid, {
        mesh: node, original: firstMaterial(node),
        pbr: null, shader: null, outline: null, mode: 'pbr',
        shaderSettings: null,
        uniformSettings: { color: firstMaterial(node)?.color?.getHexString ? '#' + firstMaterial(node).color.getHexString() : '#ffffff', speed: 1, intensity: 1 },
        uploads: new Map(), textureNames: new Map(),
        originalVisible: node.visible,
      });
    });
    registry.current = current;
    if (file && model) registeredScenes.current.add(model);
    onMeshesChange(collectMeshes(root));
    onInspectorChange(null);
    return () => {
      current.forEach(entry => {
        entry.mesh.visible = entry.originalVisible;
        setFirstMaterial(entry.mesh, entry.original);
        clearOutline(entry);
        entry.pbr?.dispose();
        entry.shader?.dispose();
        entry.uploads.forEach(texture => texture.dispose());
      });
      if (registry.current === current) registry.current = new Map();
      if (file && model) {
        registeredScenes.current.delete(model);
        disposeModel(model);
      }
      onMeshesChange([]);
      onInspectorChange(null);
    };
  }, [file, model, onMeshesChange, onInspectorChange]);

  function workingPbr(entry) {
    if (!entry.pbr) {
      entry.pbr = entry.original.clone();
    }
    return entry.pbr;
  }
  function clearOutline(entry) {
    if (!entry.outline) return;
    entry.mesh.remove(entry.outline);
    entry.outline.material.dispose();
    // Geometry is shared with the original mesh: never dispose it here.
    entry.outline = null;
  }
  function createOutline(entry, widthFraction) {
    const mesh = entry.mesh;
    if (mesh.isSkinnedMesh || !mesh.geometry?.getAttribute('normal')) {
      onStatus('Outline needs a static mesh with vertex normals.');
      return;
    }
    mesh.geometry.computeBoundingSphere();
    const radius = Math.max(mesh.geometry.boundingSphere?.radius || 1, 0.001);
    const material = new RawShaderMaterial({
      vertexShader: ANIME_OUTLINE_VERTEX,
      fragmentShader: ANIME_OUTLINE_FRAGMENT,
      side: BackSide,
      uniforms: { uOutlineWidth: { value: radius * widthFraction } },
    });
    const outline = new Mesh(mesh.geometry, material);
    outline.name = 'Ink outline helper (not selectable)';
    outline.raycast = () => {};
    outline.frustumCulled = mesh.frustumCulled;
    outline.renderOrder = -1;
    mesh.add(outline);
    entry.outline = outline;
  }
  function applyShaderToEntry(entry, options) {
    clearOutline(entry);
    entry.shader?.dispose();
    const pbr = entry.pbr || entry.original;
    const texture = pbr?.map || null;
    const settings = entry.uniformSettings;
    const shader = new RawShaderMaterial({
      vertexShader: options.vertex, fragmentShader: options.fragment,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(settings.color) },
        uTexture: { value: texture },
        uUseTexture: { value: texture ? 1 : 0 },
        uIntensity: { value: settings.intensity },
      },
    });
    entry.shader = shader;
    entry.mode = 'shader';
    entry.shaderSettings = {
      vertex: options.vertex, fragment: options.fragment,
      outlineEnabled: Boolean(options.outlineEnabled), outlineSize: options.outlineSize || 0.025,
    };
    setFirstMaterial(entry.mesh, shader);
    if (options.outlineEnabled) createOutline(entry, options.outlineSize || 0.025);
  }
  function notify(entry) { onInspectorChange(inspectorInfo(entry)); }
  useEffect(() => {
    notify(registry.current.get(selectedMeshId));
  }, [selectedMeshId, file, model, onInspectorChange]);

  // Preserve v0.2's global controls without altering original GLB textures on initial load.
  useEffect(() => {
    const old = previousGlobal.current;
    const changed = old.color !== color || old.metalness !== metalness || old.roughness !== roughness;
    previousGlobal.current = { color, metalness, roughness };
    if (!changed) return;
    registry.current.forEach(entry => {
      const material = entry.mode === 'shader' ? null : workingPbr(entry);
      if (!material?.isMeshStandardMaterial) return;
      material.color.set(color);
      material.metalness = metalness;
      material.roughness = roughness;
      material.needsUpdate = true;
      setFirstMaterial(entry.mesh, material);
    });
    notify(registry.current.get(selectedMeshId));
  }, [color, metalness, roughness, selectedMeshId]);

  useEffect(() => {
    if (!editCommand) return;
    const entry = registry.current.get(editCommand.meshId);
    if (!entry) return;
    const { type, property, value, slot } = editCommand;
    if (type === 'reset') {
      clearOutline(entry);
      entry.shader?.dispose(); entry.shader = null;
      entry.shaderSettings = null;
      entry.uniformSettings = { color: entry.original?.color?.getHexString ? '#' + entry.original.color.getHexString() : '#ffffff', speed: 1, intensity: 1 };
      entry.pbr?.dispose(); entry.pbr = null;
      entry.uploads.forEach(texture => texture.dispose());
      entry.uploads.clear(); entry.textureNames.clear();
      entry.mode = 'pbr';
      entry.mesh.visible = entry.originalVisible;
      setFirstMaterial(entry.mesh, entry.original);
    } else if (type === 'visible') {
      entry.mesh.visible = value;
    } else if (type === 'shader') {
      applyShaderToEntry(entry, editCommand);
    } else if (type === 'uniform') {
      const u = entry.uniformSettings;
      if (property === 'color' && /^#[0-9a-fA-F]{6}$/.test(value)) u.color = value;
      if (property === 'speed' && Number.isFinite(value)) u.speed = Math.max(0, Math.min(5, value));
      if (property === 'intensity' && Number.isFinite(value)) u.intensity = Math.max(0, Math.min(2, value));
      if (entry.shader) {
        entry.shader.uniforms.uColor.value.set(u.color);
        entry.shader.uniforms.uIntensity.value = u.intensity;
      }
    } else if (type === 'preset') {
      const preset = editCommand.preset;
      const material = workingPbr(entry);
      if (material.color?.isColor) material.color.set(preset.pbr.baseColor);
      if (material.emissive?.isColor) material.emissive.set(preset.pbr.emissive);
      if ('metalness' in material) material.metalness = preset.pbr.metalness;
      if ('roughness' in material) material.roughness = preset.pbr.roughness;
      material.wireframe = preset.pbr.wireframe;
      material.needsUpdate = true;
      entry.mesh.visible = preset.visible;
      entry.uniformSettings = { ...preset.uniforms };
      if (preset.mode === 'shader') applyShaderToEntry(entry, preset.shader);
      else {
        clearOutline(entry);
        entry.shader?.dispose();
        entry.shader = null;
        entry.shaderSettings = null;
        entry.mode = 'pbr';
        setFirstMaterial(entry.mesh, material);
      }
    } else if (type === 'pbr') {
      clearOutline(entry);
      entry.mode = 'pbr';
      setFirstMaterial(entry.mesh, entry.pbr || entry.original);
    } else if (type === 'property' || type === 'wireframe') {
      const mat = workingPbr(entry);
      if (type === 'wireframe') mat.wireframe = value;
      else if (property === 'color' || property === 'emissive') {
        if (mat[property]?.isColor) mat[property].set(value);
      } else if (property === 'metalness' || property === 'roughness') {
        if (property in mat) mat[property] = value;
      }
      mat.needsUpdate = true;
      if (entry.mode !== 'shader') setFirstMaterial(entry.mesh, mat);
      if (type === 'wireframe' && entry.shader) entry.shader.wireframe = value;
    } else if (type === 'removeTexture' && TEXTURE_SLOTS.includes(slot)) {
      const mat = workingPbr(entry);
      const oldUpload = entry.uploads.get(slot);
      mat[slot] = null;
      if (oldUpload) oldUpload.dispose();
      entry.uploads.delete(slot); entry.textureNames.delete(slot);
      mat.needsUpdate = true;
      if (entry.mode !== 'shader') setFirstMaterial(entry.mesh, mat);
      if (slot === 'map' && entry.shader) {
        entry.shader.uniforms.uTexture.value = null;
        entry.shader.uniforms.uUseTexture.value = 0;
      }
    } else if (type === 'texture' && TEXTURE_SLOTS.includes(slot)) {
      const { file: imageFile } = editCommand;
      const objectUrl = URL.createObjectURL(imageFile);
      const mat = workingPbr(entry);
      new TextureLoader().load(objectUrl, texture => {
        URL.revokeObjectURL(objectUrl);
        if (registry.current.get(editCommand.meshId) !== entry) { texture.dispose(); return; }
        texture.colorSpace = COLOR_SLOTS.has(slot) ? SRGBColorSpace : NoColorSpace;
        texture.flipY = false; // GLB UV convention
        const oldUpload = entry.uploads.get(slot);
        if (oldUpload) oldUpload.dispose();
        entry.uploads.set(slot, texture);
        entry.textureNames.set(slot, imageFile.name);
        mat[slot] = texture;
        mat.needsUpdate = true;
        if (entry.mode !== 'shader') setFirstMaterial(entry.mesh, mat);
        if (slot === 'map' && entry.shader) {
          entry.shader.uniforms.uTexture.value = texture;
          entry.shader.uniforms.uUseTexture.value = 1;
        }
        notify(entry);
        onStatus('Texture applied: ' + imageFile.name + ' → ' + slot);
      }, undefined, () => {
        URL.revokeObjectURL(objectUrl);
        onStatus('Không thể mở texture: ' + imageFile.name);
      });
    }
    notify(entry);
  }, [editCommand, onInspectorChange, onStatus]);

  useFrame(state => {
    registry.current.forEach(entry => {
      if (entry.shader) entry.shader.uniforms.uTime.value = state.clock.elapsedTime * entry.uniformSettings.speed;
    });
  });

  function selectFromPointer(event) {
    if (!event.object?.isMesh) return;
    event.stopPropagation();
    onSelectMesh(event.object.uuid);
  }
  return <>
    <color attach="background" args={['#111c2b']}/>
    <ambientLight intensity={1.3}/><directionalLight position={[4,6,5]} intensity={2}/>
    {file ? model && <group onPointerDown={selectFromPointer}><primitive object={model}/></group> :
      <group ref={robotRef} onPointerDown={selectFromPointer}><SampleRobot color="#58b8ff" metalness={0.35} roughness={0.42}/></group>}
    {!file && <ContactShadows position={[0,-1.3,0]} scale={5} opacity={0.35} blur={2} far={3}/>}
    {showGrid && <gridHelper args={[20,20,'#4a7392','#263b52']} position={[0,-1.32,0]}/>}
    <Camera scene={file ? model : null} resetToken={resetToken} autoRotate={autoRotate}/>
    <Highlight root={activeRoot} selectedMeshId={selectedMeshId}/>
  </>;
}

export default function ModelViewer(props) {
  return <div className="canvas">
    <Canvas camera={{ position:[3.5,2.5,5], fov:42 }} dpr={[1,1.75]}
      onPointerMissed={() => props.onSelectMesh(null)}>
      <Suspense fallback={null}><Scene {...props}/></Suspense>
    </Canvas>
  </div>;
}