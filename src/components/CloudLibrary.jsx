import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '../cloud/supabaseClient.js';
import { listOwnedAssets, uploadOwnedAsset, openOwnedAsset, deleteOwnedAsset } from '../cloud/cloudLibrary.js';
import { IMPORT_ACCEPT } from '../loaders/modelImporter.js';

export default function CloudLibrary({ user, onOpenFile }) {
  const [assets, setAssets] = useState([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function reload() {
    if (!user || !supabase) return;
    const data = await listOwnedAssets(supabase, user.id);
    setAssets(data);
  }
  useEffect(() => {
    let active = true;
    setAssets([]);
    setMessage('');
    if (user && supabase) {
      listOwnedAssets(supabase, user.id).then(data => {
        if (active) setAssets(data);
      }).catch(error => {
        if (active) setMessage('Cloud Library unavailable: ' + error.message);
      });
    }
    return () => { active = false; };
  }, [user?.id]);

  async function addFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user || pending) return;
    setPending(true);
    setMessage('');
    try {
      await uploadOwnedAsset(supabase, user.id, file);
      await reload();
      setMessage('Model uploaded to your private Cloud Library.');
    } catch (error) { setMessage('Upload failed: ' + error.message); }
    finally { setPending(false); }
  }

  async function openFile(asset) {
    if (pending) return;
    setPending(true);
    setMessage('');
    try {
      const file = await openOwnedAsset(supabase, asset);
      onOpenFile(file);
      setMessage('Opened from your private library. Edits in the viewer are not synced automatically.');
    } catch (error) { setMessage('Unable to open model: ' + error.message); }
    finally { setPending(false); }
  }

  async function removeFile(asset) {
    if (pending || !window.confirm('Permanently delete "' + asset.title + '" from your private library?')) return;
    setPending(true);
    setMessage('');
    try {
      await deleteOwnedAsset(supabase, asset);
      await reload();
      setMessage('Model deleted.');
    } catch (error) { setMessage('Unable to delete model: ' + error.message); }
    finally { setPending(false); }
  }

  if (!supabaseConfigured || !user) return null;
  return <section className="cloud-panel cloud-library" aria-label="Private Cloud Library">
    <div className="cloud-panel-heading"><h2>☁ My Cloud Library</h2><span>Private · Signed in</span></div>
    <p className="cloud-hint">Upload original 3D files to your private account. Only you can open or remove them. No public sharing or paid downloads are enabled yet.</p>
    <label className="cloud-file-button">↑ Upload a 3D file
      <input type="file" accept={IMPORT_ACCEPT} onChange={addFile} disabled={pending}/>
    </label>
    <button type="button" onClick={() => reload().catch(error => setMessage(error.message))} disabled={pending}>Refresh</button>
    {!assets.length && <p className="cloud-hint">No cloud models yet.</p>}
    {assets.length > 0 && <ul className="cloud-asset-list">
      {assets.map(asset => <li key={asset.id}>
        <span><strong>{asset.title}</strong><small>{asset.format.toUpperCase()} · {(asset.size_bytes / 1024 / 1024).toFixed(2)} MB</small></span>
        <button type="button" onClick={() => openFile(asset)} disabled={pending}>Open in Viewer</button>
        <button type="button" onClick={() => removeFile(asset)} disabled={pending}>Delete</button>
      </li>)}
    </ul>}
    {pending && <p role="status">Working with your private files...</p>}
    {message && <p role="status" className="cloud-message">{message}</p>}
  </section>;
}
