import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, BoxHelper, Vector3 } from 'three';
import SampleRobot from './SampleRobot.jsx';

function disposeScene(scene) {
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

function MaterialModel({ scene, color, metalness, roughness }) {
  useEffect(() => {
    scene.traverse(node => {
      if (!node.isMesh) return;
      (Array.isArray(node.material) ? node.material : [node.material]).forEach(mat => {
        if (!mat?.isMeshStandardMaterial) return;
        mat.color.set(color);
        mat.metalness = metalness;
        mat.roughness = roughness;
        mat.needsUpdate = true;
      });
    });
  }, [scene, color, metalness, roughness]);
  return <primitive object={scene}/>;
}

function FramedCamera({ scene, resetToken, autoRotate }) {
  const controls = useRef(null);
  const { camera } = useThree();
  const frame = useMemo(() => {
    if (!scene) return { center: new Vector3(0, 0.1, 0), distance: 5.5 };
    const box = new Box3().setFromObject(scene);
    if (box.isEmpty()) return { center: new Vector3(), distance: 5.5 };
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const radius = Math.max(size.length() / 2, 0.1);
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

function collectMeshes(root) {
  if (!root) return [];
  const items = [];
  root.traverse(node => {
    if (!node.isMesh || !node.geometry) return;
    const geometry = node.geometry;
    const vertices = geometry.getAttribute('position')?.count || 0;
    const count = geometry.index?.count || vertices;
    items.push({
      id: node.uuid,
      name: node.name || ('Mesh ' + (items.length + 1)),
      vertices,
      triangles: Math.floor(count / 3),
    });
  });
  return items;
}

function SelectionHighlight({ root, selectedMeshId }) {
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

  useFrame(() => { helper.current?.update(); });
  return null;
}

function Scene({ file, color, metalness, roughness, autoRotate, showGrid, resetToken, onStatus, onMeshesChange, selectedMeshId, onSelectMesh }) {
  const [model, setModel] = useState(null);
  const robotRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let loaded = null;
    setModel(null);
    if (!file) return () => { cancelled = true; };
    (async () => {
      try {
        const buffer = await file.arrayBuffer();
        const gltf = await new GLTFLoader().parseAsync(buffer, '');
        loaded = gltf.scene;
        if (cancelled) { disposeScene(loaded); return; }
        loaded.traverse(node => {
          if (!node.isMesh || !node.material) return;
          node.material = Array.isArray(node.material)
            ? node.material.map(mat => mat.clone()) : node.material.clone();
        });
        setModel(loaded);
        onStatus('Đã mở ' + file.name + ' (' + (file.size / 1048576).toFixed(2) + ' MB).');
      } catch (error) {
        if (!cancelled) onStatus('Không thể mở GLB: ' + (error?.message || 'File không hợp lệ.'));
      }
    })();
    return () => { cancelled = true; disposeScene(loaded); };
  }, [file, onStatus]);

  useEffect(() => {
    const root = file ? model : robotRef.current;
    onMeshesChange(collectMeshes(root));
    return () => onMeshesChange([]);
  }, [file, model, onMeshesChange]);

  function selectFromPointer(event) {
    if (!event.object?.isMesh) return;
    event.stopPropagation();
    onSelectMesh(event.object.uuid);
  }

  return <>
    <color attach="background" args={['#111c2b']}/>
    <ambientLight intensity={1.3}/><directionalLight position={[4,6,5]} intensity={2}/>
    {file ? model && <group onPointerDown={selectFromPointer}><MaterialModel scene={model} color={color} metalness={metalness} roughness={roughness}/></group> :
      <group ref={robotRef} onPointerDown={selectFromPointer}><SampleRobot color={color} metalness={metalness} roughness={roughness}/></group>}
    {!file && <ContactShadows position={[0,-1.3,0]} scale={5} opacity={0.35} blur={2} far={3}/>}
    {showGrid && <gridHelper args={[20,20,'#4a7392','#263b52']} position={[0,-1.32,0]}/>}
    <FramedCamera scene={file ? model : null} resetToken={resetToken} autoRotate={autoRotate}/>
    <SelectionHighlight root={file ? model : robotRef.current} selectedMeshId={selectedMeshId}/>
  </>;
}

export default function ModelViewer(props) {
  return <div className="canvas">
    <Canvas camera={{ position: [3.5,2.5,5], fov:42 }} dpr={[1,1.75]} onPointerMissed={() => props.onSelectMesh(null)}>
      <Suspense fallback={null}><Scene {...props}/></Suspense>
    </Canvas>
  </div>;
}