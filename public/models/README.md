# Boat.fbx — default model asset

Place the **original, unmodified binary file** `Boat.fbx` in this directory:
`public/models/Boat.fbx` (case-sensitive on GitHub Pages).

The project automatically fetches it at startup from `import.meta.env.BASE_URL + 'models/Boat.fbx'`, checks the original file size and SHA-256, then loads the exact FBX using Three.js FBXLoader. **Do not convert it to OBJ or an optimized GLB** if material order and embedded texture preservation are important.

Original attachment inspected:
- Binary FBX version **7700**, size **1,131,936 bytes**.
- SHA-256: `25536d1b9c63e62cbf83dbc82850ea173011884101aad6d1c47b1581bfbd7540`.
- Meshes: `Accessories`, `Boat_Body`.
- Materials in original connections:
  - `Accessories`: `Boat_Acc_mat1`, `Boat_Acc_mat2_emmis`.
  - `Boat_Body`: `Boat_teeth_horn_mat`, `Boat_Hair_mat`, `Boat_Body_mat`, `Boat_Eyes_mat`, `Boat_Clothes_mat`.
- 2 PNG textures are embedded in the FBX binary: `T_EM139_01.png` (299,808 bytes) and `T_EM139_02.png` (317,970 bytes).

The imported materials and their order are handled by FBXLoader. This is not a lossless FBX editor: the Three.js loader renders a supported subset of FBX shaders and doesn't promise to interpret every proprietary material/animation property.

**Why the asset is not present yet:** GitHub connector's text-file actions can update source code, but cannot ingest the uploaded binary directly. A repository contributor needs to copy `Boat.fbx` from the provided attachment to this folder and commit/push it on `feature/v0.3.4-multi-material-slots` before merging PR #4. If absent, the app shows the previous Sample Robot instead of crashing.
