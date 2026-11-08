import { validateModelFile, fileExtension } from '../loaders/modelImporter.js';

export const PRIVATE_BUCKET = 'asset-originals';
export const MAX_CLOUD_FILE_BYTES = 50 * 1024 * 1024;
export const CLOUD_ALLOWED_EXTENSIONS = new Set(['glb', 'gltf', 'fbx', 'obj', 'dae', '3ds', 'stl', 'ply', '3mf', 'usdz', 'vtk', 'pcd', 'xyz', 'pdb']);

export function safeAssetName(name) {
  const clean = String(name || '').replace(/[\\/\u0000-\u001f<>:"|?*]/g, '_').trim().slice(0, 160);
  return clean || 'Untitled model';
}

export function assetStoragePath(userId, assetId, extension) {
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[0-9a-f-]{36}$/i.test(assetId)) {
    throw new Error('Invalid asset or account identifier.');
  }
  if (!CLOUD_ALLOWED_EXTENSIONS.has(extension)) throw new Error('Unsupported file extension.');
  return `${userId}/${assetId}/original.${extension}`;
}

export async function listOwnedAssets(client, userId) {
  if (!client || !userId) throw new Error('Sign in to access Cloud Library.');
  const { data, error } = await client.from('assets')
    .select('id,title,original_name,storage_path,format,size_bytes,created_at')
    .eq('owner_id', userId).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
}

export async function uploadOwnedAsset(client, userId, file) {
  if (!client || !userId) throw new Error('Sign in before uploading.');
  const ext = validateModelFile(file);
  if (file.size > MAX_CLOUD_FILE_BYTES) throw new Error('The maximum cloud file size is 50 MB.');
  const id = crypto.randomUUID();
  const path = assetStoragePath(userId, id, ext);
  const { error: uploadError } = await client.storage.from(PRIVATE_BUCKET)
    .upload(path, file, { upsert: false, cacheControl: '60', contentType: file.type || 'application/octet-stream' });
  if (uploadError) throw uploadError;
  try {
    const { data, error } = await client.from('assets').insert({
      id, owner_id: userId,
      title: safeAssetName(file.name), original_name: safeAssetName(file.name),
      storage_path: path, format: fileExtension(file.name), size_bytes: file.size,
    }).select('id').single();
    if (error) throw error;
    return data.id;
  } catch (error) {
    // Best-effort cleanup of a file whose metadata could not be saved.
    await client.storage.from(PRIVATE_BUCKET).remove([path]);
    throw error;
  }
}

export async function openOwnedAsset(client, asset) {
  if (!client || !asset?.storage_path) throw new Error('No cloud model selected.');
  const { data, error } = await client.storage.from(PRIVATE_BUCKET).download(asset.storage_path);
  if (error) throw error;
  const file = new File([data], asset.original_name, { type: data.type || 'application/octet-stream' });
  validateModelFile(file);
  return file;
}

export async function deleteOwnedAsset(client, asset) {
  if (!client || !asset?.id || !asset?.storage_path) throw new Error('No cloud model selected.');
  // Delete the private object before removing metadata, so failures stay retryable.
  const { error: storageError } = await client.storage.from(PRIVATE_BUCKET).remove([asset.storage_path]);
  if (storageError) throw storageError;
  const { error } = await client.from('assets').delete().eq('id', asset.id);
  if (error) throw error;
}
