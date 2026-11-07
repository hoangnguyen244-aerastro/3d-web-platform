import { useEffect, useRef, useState } from 'react';
import ModelViewer from './components/ModelViewer.jsx';
import { IMPORT_ACCEPT, IMPORT_FORMATS, validateModelFile } from './loaders/modelImporter.js';
import { makeMaterialPreset, parseMaterialPreset } from './utils/materialPreset.js';
import { ANIME_TOON_VERTEX, ANIME_TOON_FRAGMENT } from './shaders/animeToon.js';
import './v02.css';
import './v031.css';
import './v032.css';
import './anime-demo.css';
import './v033.css';
import './importer.css';
import './v034.css';

const DEFAULT_VERTEX = `precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const DEFAULT_FRAGMENT = `precision highp float;
uniform float uTime;
uniform float uIntensity;
uniform vec3 uColor;
uniform sampler2D uTexture;
uniform float uUseTexture;
varying vec2 vUv;
void main() {
  vec3 base = uColor;
  if (uUseTexture > 0.5) base *= texture2D(uTexture, vUv).rgb;
  float pulse = 0.76 + 0.24 * sin(uTime * 2.0);
  gl_FragColor = vec4(base * pulse * uIntensity, 1.0);
}`;

const MAPS = [
  ['map', 'Albedo / Base Map', 'sRGB'],
  ['normalMap', 'Normal Map', 'Linear'],
  ['metalnessMap', 'Metallic Map (B channel)', 'Linear'],
  ['roughnessMap', 'Roughness Map (G channel)', 'Linear'],
  ['emissiveMap', 'Emission Map', 'sRGB'],
];

function verifyGLSL(vertex, fragment) {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return 'WebGL is unavailable in this browser.';
  const compile = (kind, code) => {
    const shader = gl.createShader(kind);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    const error = gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? '' : gl.getShaderInfoLog(shader);
    return { shader, error };
  };
  const v = compile(gl.VERTEX_SHADER, vertex);
  const f = compile(gl.FRAGMENT_SHADER, fragment);
  let message = v.error ? 'Vertex shader: ' + v.error : f.error ? 'Fragment shader: ' + f.error : '';
  if (!message) {
    const program = gl.createProgram();
    gl.attachShader(program, v.shader);
    gl.attachShader(program, f.shader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) message = 'Shader link: ' + gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
  }
  gl.deleteShader(v.shader);
  gl.deleteShader(f.shader);
  return message;
}

export default function App() {
  const [tab, setTab] = useState('viewer');
  const [file, setFile] = useState(null);
  const [meshes, setMeshes] = useState([]);
  const [selectedMeshId, setSelectedMeshId] = useState(null);
  const [selectedMaterialSlot, setSelectedMaterialSlot] = useState(0);
  const [inspector, setInspector] = useState(null);
  const [color, setColor] = useState('#58b8ff');
  const [metalness, setMetalness] = useState(0.35);
  const [roughness, setRoughness] = useState(0.42);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [resetCamera, setResetCamera] = useState(0);
  const [status, setStatus] = useState('Robot mẫu đang được hiển thị.');
  const [shaderMessage, setShaderMessage] = useState('');
  const [vertex, setVertex] = useState(DEFAULT_VERTEX);
  const [fragment, setFragment] = useState(DEFAULT_FRAGMENT);
  const [outlineEnabled, setOutlineEnabled] = useState(false);
  const [outlineSize, setOutlineSize] = useState(0.025);
  const [edit, setEdit] = useState(null);
  const input = useRef(null);
  const presetInput = useRef(null);
  const [presetMessage, setPresetMessage] = useState('');
  const idCounter = useRef(0);
  const selectionRef = useRef(null);
  selectionRef.current = selectedMeshId;
  const selectedSlotRef = useRef(0);
  selectedSlotRef.current = selectedMaterialSlot;
  const chosen = meshes.find(mesh => mesh.id === selectedMeshId);
  const lastEditorSlot = useRef(null);
  useEffect(() => {
    if (!inspector || !selectedMeshId) return;
    const current = selectedMeshId + ':' + selectedMaterialSlot;
    if (lastEditorSlot.current === current) return;
    lastEditorSlot.current = current;
    setVertex(inspector.shader?.vertex || DEFAULT_VERTEX);
    setFragment(inspector.shader?.fragment || DEFAULT_FRAGMENT);
    setOutlineEnabled(Boolean(inspector.shader?.outlineEnabled));
    setOutlineSize(inspector.shader?.outlineSize || 0.025);
  }, [inspector, selectedMeshId, selectedMaterialSlot]);

  function command(type, extra = {}) {
    if (!selectedMeshId) return;
    setEdit({ sequence: ++idCounter.current, meshId: selectedMeshId, slotIndex: selectedMaterialSlot, type, ...extra });
  }
  function select(id) {
    setSelectedMeshId(id);
    setSelectedMaterialSlot(0);
    setInspector(null);
    setShaderMessage('');
    setPresetMessage('');
  }
  function selectMaterialSlot(index) {
    if (!chosen || index < 0 || index >= chosen.slotCount) return;
    setSelectedMaterialSlot(index);
    setInspector(null);
    setShaderMessage('');
    setPresetMessage('');
  }
  function chooseFile(event) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    try { validateModelFile(selected); }
    catch (error) { setStatus(error.message); return; }
    select(null);
    setMeshes([]);
    setFile(selected);
    setStatus('Đang mở ' + selected.name + '...');
  }
  function sampleRobot() {
    select(null); setMeshes([]); setFile(null);
    setColor('#58b8ff'); setMetalness(.35); setRoughness(.42);
    setResetCamera(n => n + 1);
    setStatus('Đã trở về robot mẫu.');
  }
  function textureUpload(event, slot) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(selected.type)) {
      setShaderMessage('Texture must be PNG, JPEG or WebP.'); return;
    }
    if (selected.size > 15 * 1024 * 1024) {
      setShaderMessage('Texture must be under 15 MB.'); return;
    }
    command('texture', { slot, file: selected });
    setShaderMessage('');
  }
  async function shaderFile(event, stage) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    if (selected.size > 64 * 1024) {
      setShaderMessage('GLSL source must be under 64 KB.'); return;
    }
    const source = await selected.text();
    if (stage === 'vertex') setVertex(source);
    else setFragment(source);
    setShaderMessage('Loaded ' + selected.name + '. Click Compile & Apply to test.');
  }
  function loadAnimeDemo() {
    setVertex(ANIME_TOON_VERTEX);
    setFragment(ANIME_TOON_FRAGMENT);
    setOutlineEnabled(true);
    setOutlineSize(0.025);
    setShaderMessage('Anime Toon + Ink Outline demo loaded. Click Compile & Apply.');
  }
  function applyShader() {
    if (!chosen) return;
    const error = verifyGLSL(vertex, fragment);
    if (error) { setShaderMessage(error); return; }
    command('shader', { vertex, fragment, outlineEnabled, outlineSize });
    setShaderMessage(outlineEnabled ? 'GLSL compiled. Anime ink outline enabled for supported meshes.' : 'Shaders compiled and linked successfully. Applied to selected mesh.');
  }
  function savePreset() {
    if (!chosen || !inspector) return;
    try {
      const preset = makeMaterialPreset(inspector);
      const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = (chosen.name.replace(/[^a-z0-9_-]/gi, '_').slice(0, 45) || 'material') + '-slot-' + (selectedMaterialSlot + 1) + '.material.json';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setPresetMessage('Preset downloaded. Texture image bytes are not included.');
    } catch (error) { setPresetMessage(error.message); }
  }
  async function loadPreset(event) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected || !chosen) return;
    if (selected.size > 180 * 1024) {
      setPresetMessage('Preset file is too large (max 180 KB).'); return;
    }
    const intendedMesh = selectedMeshId;
    const intendedSlot = selectedMaterialSlot;
    try {
      const preset = parseMaterialPreset(JSON.parse(await selected.text()));
      if (preset.mode === 'shader') {
        const error = verifyGLSL(preset.shader.vertex, preset.shader.fragment);
        if (error) throw new Error(error);
      }
      if (intendedMesh !== selectionRef.current || intendedSlot !== selectedSlotRef.current) {
        setPresetMessage('Mesh selection changed. Select the target again before importing.'); return;
      }
      if (preset.shader) {
        setVertex(preset.shader.vertex);
        setFragment(preset.shader.fragment);
        setOutlineEnabled(preset.shader.outlineEnabled);
        setOutlineSize(preset.shader.outlineSize);
      }
      command('preset', { preset });
      setPresetMessage('Material preset applied to selected slot. Existing texture maps are retained.');
    } catch (error) { setPresetMessage('Cannot import preset: ' + error.message); }
  }
  return <div className="app">
    <header><div><strong>◈ 3D Web Platform</strong><small>Interactive 3D · Research tools</small></div><span>v0.3.4 · multi-material slots preview</span></header>
    <section className="intro"><p className="eyebrow">YOUR 3D WORKSPACE</p><h1>Explore. Configure. Compare.</h1><p>Model viewer · Unity-style material inspector · WebGL GLSL lab</p></section>
    <nav aria-label="Modules">
      <button className={tab === 'viewer' ? 'active' : ''} onClick={() => setTab('viewer')}>◈ Model Viewer</button>
      <button className={tab === 'benchmark' ? 'active' : ''} onClick={() => setTab('benchmark')}>▥ Compression Benchmark</button>
    </nav>
    {tab === 'viewer' ? <div className="workspace inspector-workspace">
      <section className="panel viewer">
        <h3>{file?.name || 'Sample Robot'} <span>Scene view</span></h3>
        <div className="v02-toolbar">
          <input ref={input} type="file" hidden accept={IMPORT_ACCEPT} onChange={chooseFile} aria-label="Open 3D model"/>
          <button onClick={() => input.current?.click()}>↑ Open 3D Model</button>
          <button onClick={sampleRobot} disabled={!file}>↺ Sample robot</button>
          <button onClick={() => setResetCamera(n => n + 1)}>◎ Reset camera</button>
        </div>
        <details className="importer-details">
          <summary>Supported formats · {Object.keys(IMPORT_FORMATS).length} formats</summary>
          <p>{Object.entries(IMPORT_FORMATS).map(([extension, label]) => '.' + extension + ' — ' + label).join(' · ')}</p>
          <p>Single local file only. glTF/FBX should contain embedded assets; OBJ/MTL sidecars and external textures are not loaded. Scientific point clouds render in the Scene View but are not editable as mesh materials.</p>
        </details>
        <ModelViewer file={file} color={color} metalness={metalness} roughness={roughness}
          autoRotate={autoRotate} showGrid={showGrid} resetToken={resetCamera}
          onStatus={setStatus} onMeshesChange={setMeshes} selectedMeshId={selectedMeshId} selectedMaterialSlot={selectedMaterialSlot}
          onSelectMesh={select} editCommand={edit} onInspectorChange={setInspector}/>
        <p className="caption">Left click to select · Drag to orbit · Scroll to zoom · Right-drag to pan</p>
        <p className="v02-status" role="status">{status}</p>
      </section>

      <aside className="panel inspector-side" tabIndex={0} aria-label="Material Inspector — scroll to edit shader and texture settings">
        <section className="unity-section">
          <div className="unity-section-title"><span>▤ Hierarchy</span><small>{meshes.length} meshes</small></div>
          <div className="mesh-list unity-mesh-list" role="listbox" aria-label="Model meshes">
            {meshes.length ? meshes.map(mesh =>
              <button key={mesh.id} type="button" role="option" aria-selected={selectedMeshId === mesh.id}
                className={selectedMeshId === mesh.id ? 'mesh-row selected' : 'mesh-row'} onClick={() => select(mesh.id)}>
                <span className="mesh-icon">◇</span><span className="mesh-name">{mesh.name}</span>
                <span className="mesh-tris">{mesh.triangles.toLocaleString()} tris</span>
              </button>) : <p className="mesh-empty">{status.startsWith('Cannot open 3D model') ? 'Invalid or unsupported model.' : status.includes('0 meshes,') && status.includes('points') ? 'Point cloud loaded. Scientific points are displayed in Scene View; the mesh Inspector is not available for point data yet.' : 'No meshes yet.'}</p>}
          </div>
        </section>

        <section className="unity-section">
          <div className="unity-section-title"><span>⚙ Inspector</span><small>{chosen ? 'Mesh' : 'No selection'}</small></div>
          {!chosen ? <p className="unity-placeholder">Select a mesh from Hierarchy or click it in the Scene view.</p> : <>
            <div className="unity-object">
              <strong>◇ {chosen.name}</strong>
              <span>{chosen.vertices.toLocaleString()} vertices · {chosen.triangles.toLocaleString()} triangles</span>
            </div>
            <div className="unity-component">
              <div className="unity-component-heading">▾ Mesh Renderer <small>{chosen.materialNames?.[selectedMaterialSlot] || 'Material ' + (selectedMaterialSlot + 1)} · {selectedMaterialSlot + 1}/{chosen.slotCount}</small></div>
              <div className="unity-row"><label>Shader</label><strong>{inspector?.mode === 'shader' ? 'Custom WebGL GLSL' : 'Standard PBR'}</strong></div>
              <div className="unity-material-slots">
                <label htmlFor="selected-material-slot">Active material slot</label>
                <select id="selected-material-slot" value={selectedMaterialSlot}
                  onChange={e => selectMaterialSlot(Number(e.target.value))}>
                  {Array.from({ length: chosen.slotCount }, (_, index) =>
                    <option key={index} value={index}>{chosen.materialNames?.[index] || 'Material ' + (index + 1)} · {index + 1}/{chosen.slotCount}</option>)}
                </select>
                <p className="unity-tip">PBR color, textures, shader, presets and Reset affect only this slot. Visibility is a mesh-wide setting.</p>
              </div>
              <div className="unity-row"><label>Visible</label><input type="checkbox" checked={inspector?.visible ?? true} onChange={e => command('visible', { value: e.target.checked })}/></div>
              <div className="unity-row"><label>Wireframe</label><input type="checkbox" checked={inspector?.wireframe ?? false} onChange={e => command('wireframe', { value: e.target.checked })}/></div>
            </div>
            <div className="unity-component">
              <div className="unity-component-heading">▾ Material Properties</div>
              <div className="unity-row"><label>Base Color</label><input aria-label="Selected mesh base color" type="color" value={inspector?.baseColor || '#ffffff'} disabled={inspector?.mode === 'shader'} onChange={e => command('property', { property: 'color', value: e.target.value })}/></div>
              {['metalness', 'roughness'].map(key => <div key={key} className="unity-slider-row">
                <label>{key === 'metalness' ? 'Metallic' : 'Smoothness / Roughness'} <span>{Number(inspector?.[key] ?? 0).toFixed(2)}</span></label>
                <input type="range" min="0" max="1" step="0.01" disabled={inspector?.mode === 'shader'}
                  value={inspector?.[key] ?? 0} onChange={e => command('property', { property:key, value:Number(e.target.value) })}/>
              </div>)}
              <div className="unity-row"><label>Emissive</label><input aria-label="Selected mesh emissive color" type="color" value={inspector?.emissive || '#000000'} disabled={inspector?.mode === 'shader'} onChange={e => command('property', { property:'emissive', value:e.target.value })}/></div>
            </div>
            <div className="unity-component">
              <div className="unity-component-heading">▾ Texture Slots <small>PNG · JPEG · WebP</small></div>
              {MAPS.map(([slot, label, colorMode]) => <div className="unity-texture-row" key={slot}>
                <div><strong>{label}</strong><small>{colorMode} · {inspector?.textures?.[slot] || 'None'}</small></div>
                <label className="unity-upload">Import<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => textureUpload(e, slot)}/></label>
                <button type="button" onClick={() => command('removeTexture', { slot })} disabled={!inspector?.textures?.[slot]}>×</button>
              </div>)}
              <p className="unity-tip">Metallic uses blue (B), Roughness green (G) in glTF PBR. UV mapping required.</p>
            </div>
            <div className="unity-component">
              <div className="unity-component-heading">▾ Material Presets <small>v0.3.3</small></div>
              <p className="unity-tip">Save this mesh's current PBR properties, GLSL source, outline and shader uniform values in a portable .json file. Uploaded image pixels are not embedded.</p>
              <div className="unity-action-row">
                <button type="button" onClick={savePreset} disabled={!inspector}>↓ Save Preset</button>
                <button type="button" onClick={() => presetInput.current?.click()}>↑ Load Preset</button>
                <input ref={presetInput} type="file" hidden accept=".json,application/json" onChange={loadPreset}/>
              </div>
              {presetMessage && <p className="unity-compiler-log" role="status">{presetMessage}</p>}
            </div>
            <div className="unity-component">
              <div className="unity-component-heading">▾ Custom Shader · GLSL <small>WebGL</small></div>
              <p className="unity-tip">Standalone GLSL ES 1.00 vertex + fragment sources. RawShaderMaterial, not Unity ShaderLab/HLSL or JavaScript.</p>
              <div className="anime-demo-box">
                <strong>✦ Anime Toon + Ink Outline</strong>
                <p>3-step cel shading, rim light and a black inverted-hull silhouette around the selected mesh.</p>
                <button type="button" className="anime-demo-button" onClick={loadAnimeDemo}>Load Anime Toon Demo</button>
              </div>
              <label className="unity-check">Ink outline (static meshes) <input type="checkbox" checked={outlineEnabled} onChange={e=>setOutlineEnabled(e.target.checked)}/></label>
              <div className="unity-slider-row"><label>Outline Thickness <span>{outlineSize.toFixed(3)}</span></label><input type="range" min="0.005" max="0.1" step="0.005" value={outlineSize} disabled={!outlineEnabled} onChange={e=>{ const size = Number(e.target.value); setOutlineSize(size); if (inspector?.mode === 'shader' && inspector?.shader?.outlineEnabled) command('outlineThickness', { value: size }); }}/></div>
              <p className="unity-tip">Outline thickness updates live when a shader outline is active. Enabling or disabling the outline still requires Compile & Apply. Skinned meshes are excluded.</p>
              <div className="unity-uniform-panel">
                <strong>Shader Uniforms · Live</strong>
                <div className="unity-row"><label htmlFor="shader-uniform-color">uColor</label>
                  <input id="shader-uniform-color" type="color" value={inspector?.uniforms?.color || '#ffffff'} onChange={e => command('uniform', {property:'color',value:e.target.value})}/>
                </div>
                {['speed','intensity'].map(property => <div className="unity-slider-row" key={property}>
                  <label htmlFor={'uniform-'+property}>{property === 'speed' ? 'uTime Speed' : 'uIntensity'} <span>{Number(inspector?.uniforms?.[property] ?? 1).toFixed(2)}</span></label>
                  <input id={'uniform-'+property} type="range" min="0" max={property === 'speed' ? '5' : '2'} step="0.05"
                    value={inspector?.uniforms?.[property] ?? 1} onChange={e => command('uniform', { property, value:Number(e.target.value) })}/>
                </div>)}
                <p className="unity-tip">uColor and uIntensity update without recompiling. uTime Speed changes elapsed-time animation. Custom GLSL must declare each uniform to use it.</p>
              </div>
              <label className="unity-code-label">Vertex Shader <span>.vert / .glsl</span></label>
              <textarea className="unity-code" rows={8} spellCheck={false} value={vertex} onChange={e => setVertex(e.target.value)}/>
              <label className="unity-upload unity-upload-inline">↑ Upload Vertex GLSL<input type="file" accept=".vert,.vs,.glsl,.txt" onChange={e => shaderFile(e, 'vertex')}/></label>
              <label className="unity-code-label">Fragment Shader <span>.frag / .glsl</span></label>
              <textarea className="unity-code" rows={8} spellCheck={false} value={fragment} onChange={e => setFragment(e.target.value)}/>
              <label className="unity-upload unity-upload-inline">↑ Upload Fragment GLSL<input type="file" accept=".frag,.fs,.glsl,.txt" onChange={e => shaderFile(e, 'fragment')}/></label>
              <div className="unity-action-row">
                <button type="button" className="unity-primary" onClick={applyShader}>Compile & Apply</button>
                <button type="button" onClick={() => command('pbr')}>Return to PBR</button>
              </div>
              {shaderMessage && <p className="unity-compiler-log" role="status">{shaderMessage}</p>}
              <p className="unity-tip">Built-in demo uniforms: uTime, uColor, uTexture, uUseTexture. Custom GLSL runs on the GPU; use trusted files.</p>
            </div>
            <button className="unity-reset" onClick={() => command('reset')}>↺ Reset selected material slot</button>
          </>}
        </section>
        <section className="unity-section">
          <div className="unity-section-title">Scene Settings</div>
          <label className="unity-check">Auto-rotate <input type="checkbox" checked={autoRotate} onChange={e => setAutoRotate(e.target.checked)}/></label>
          <label className="unity-check">Show grid <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)}/></label>
          <details className="unity-legacy"><summary>Global PBR override (v0.2)</summary>
            <p>Overrides properties on all Standard PBR meshes. Use Inspector controls for individual mesh editing.</p>
            <label>Color <input type="color" value={color} onChange={e => setColor(e.target.value)}/></label>
            <label>Metalness {metalness.toFixed(2)} <input type="range" min="0" max="1" step=".01" value={metalness} onChange={e => setMetalness(+e.target.value)}/></label>
            <label>Roughness {roughness.toFixed(2)} <input type="range" min="0" max="1" step=".01" value={roughness} onChange={e => setRoughness(+e.target.value)}/></label>
            <button onClick={() => {setColor('#58b8ff'); setMetalness(.35); setRoughness(.42);}}>Reset global settings</button>
          </details>
          <p className="unity-tip">Everything runs locally in the browser. No model, texture or shader is uploaded to a server. Changes are session-only (GLB export comes later).</p>
        </section>
      </aside>
    </div> : <section className="panel benchmark"><h2>Compression Benchmark</h2><p>Original vs compressed model comparison is planned. No compression engine is implemented yet.</p></section>}
    <footer>React + Three.js + React Three Fiber · Multi-Material Slot Inspector v0.3.4</footer>
  </div>;
}