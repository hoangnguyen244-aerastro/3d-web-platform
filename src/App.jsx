import { useRef, useState } from 'react';
import ModelViewer from './components/ModelViewer.jsx';
import './v02.css';

export default function App() {
  const [tab, setTab] = useState('viewer');
  const [file, setFile] = useState(null);
  const [color, setColor] = useState('#58b8ff');
  const [metalness, setMetalness] = useState(0.35);
  const [roughness, setRoughness] = useState(0.42);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [resetCamera, setResetCamera] = useState(0);
  const [status, setStatus] = useState('Robot mẫu đang được hiển thị.');
  const input = useRef(null);

  function chooseFile(e) {
    const chosen = e.target.files?.[0];
    e.target.value = '';
    if (!chosen) return;
    if (!chosen.name.toLowerCase().endsWith('.glb')) {
      setStatus('Chỉ hỗ trợ .glb tự chứa ở phiên bản này.');
      return;
    }
    if (chosen.size > 50 * 1024 * 1024) {
      setStatus('File lớn hơn 50 MB. Hãy tối ưu trước khi mở.');
      return;
    }
    setFile(chosen);
    setStatus('Đang mở ' + chosen.name + '...');
  }
  function sampleRobot() {
    setFile(null);
    setColor('#58b8ff');
    setMetalness(0.35);
    setRoughness(0.42);
    setResetCamera(n => n + 1);
    setStatus('Đã trở về robot mẫu.');
  }
  return <div className="app">
    <header><div><strong>◈ 3D Web Platform</strong><small>Interactive 3D · Research tools</small></div><span>v0.2</span></header>
    <section className="intro"><p className="eyebrow">YOUR 3D WORKSPACE</p><h1>Explore. Configure. Compare.</h1><p>Interactive model viewing and compression research tools.</p></section>
    <nav aria-label="Modules">
      <button className={tab==='viewer'?'active':''} onClick={()=>setTab('viewer')}>◈ Model Viewer</button>
      <button className={tab==='benchmark'?'active':''} onClick={()=>setTab('benchmark')}>▥ Compression Benchmark</button>
    </nav>
    {tab === 'viewer' ? <div className="workspace">
      <section className="panel viewer">
        <h3>{file?.name || 'Sample Robot'} <span>3D preview</span></h3>
        <div className="v02-toolbar">
          <input ref={input} type="file" hidden accept=".glb,model/gltf-binary" onChange={chooseFile} aria-label="Open GLB" />
          <button onClick={()=>input.current?.click()}>↑ Open GLB</button>
          <button onClick={sampleRobot} disabled={!file}>↺ Sample robot</button>
          <button onClick={()=>setResetCamera(n=>n+1)}>◎ Reset camera</button>
        </div>
        <ModelViewer file={file} color={color} metalness={metalness} roughness={roughness}
          autoRotate={autoRotate} showGrid={showGrid} resetToken={resetCamera} onStatus={setStatus}/>
        <p className="caption">Drag to orbit · Scroll to zoom · Right-drag to pan</p>
        <p className="v02-status" role="status">{status}</p>
      </section>
      <aside className="panel controls"><h3>Material & scene settings</h3>
        <p className="v02-help">Applies a color tint and PBR values to compatible meshes. Original textures stay attached.</p>
        <label htmlFor="model-color">Base color</label>
        <div className="colors"><input id="model-color" type="color" value={color} onChange={e=>setColor(e.target.value)}/><code>{color.toUpperCase()}</code></div>
        <label htmlFor="model-metalness">Metalness: {metalness.toFixed(2)}</label>
        <input id="model-metalness" type="range" min="0" max="1" step="0.01" value={metalness} onChange={e=>setMetalness(Number(e.target.value))}/>
        <label htmlFor="model-roughness">Roughness: {roughness.toFixed(2)}</label>
        <input id="model-roughness" type="range" min="0" max="1" step="0.01" value={roughness} onChange={e=>setRoughness(Number(e.target.value))}/>
        <label className="check">Auto-rotate <input type="checkbox" checked={autoRotate} onChange={e=>setAutoRotate(e.target.checked)}/></label>
        <label className="check">Show grid <input type="checkbox" checked={showGrid} onChange={e=>setShowGrid(e.target.checked)}/></label>
        <button className="reset" onClick={()=>{setColor('#58b8ff');setMetalness(.35);setRoughness(.42)}}>Reset material</button>
        <p className="note">Files stay in your browser and are not uploaded. Self-contained .glb files up to 50 MB are supported; per-mesh editing is planned for v0.3.</p>
      </aside>
    </div> : <section className="panel benchmark"><h2>Compression Benchmark</h2><p>Phase 2: Compare original and compressed 3D models, synchronized cameras, metrics and reports.</p><p className="note">The benchmark engine has not been implemented yet.</p></section>}
    <footer>React + Three.js + React Three Fiber · Model Viewer v0.2</footer>
  </div>;
}