// Exact original user-supplied FBX is served as a static asset, not converted or
// reconstructed: this preserves its embedded PNGs, mesh groups and material order.
export const DEFAULT_BOAT_FILENAME = 'Boat.fbx';
export const DEFAULT_BOAT_SHA256 = '25536d1b9c63e62cbf83dbc82850ea173011884101aad6d1c47b1581bfbd7540';
export const DEFAULT_BOAT_BYTES = 1131936;

export async function loadBoatFile(url, request = fetch) {
  const response = await request(url);
  if (!response.ok) throw new Error('Boat.fbx is not installed in public/models yet (HTTP ' + response.status + ').');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== DEFAULT_BOAT_BYTES) {
    throw new Error('Boat.fbx size differs from the supplied original. Expected ' + DEFAULT_BOAT_BYTES + ' bytes.');
  }
  const signature = new TextDecoder().decode(new Uint8Array(bytes, 0, 18));
  if (!signature.startsWith('Kaydara FBX Binary')) throw new Error('Boat.fbx has an invalid binary FBX signature.');
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    const sha = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    if (sha !== DEFAULT_BOAT_SHA256) throw new Error('Boat.fbx checksum does not match the supplied original.');
  }
  return new File([bytes], DEFAULT_BOAT_FILENAME, { type: 'application/octet-stream' });
}
