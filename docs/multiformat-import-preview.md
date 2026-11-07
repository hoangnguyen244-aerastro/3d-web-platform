# Multi-format 3D Importer — pre-v0.3.4 feature preview

The importer is developed **before** the v0.3.4 Multi-Material Slot Inspector. It is isolated on `feature/v0.3.3-multiformat-import`; the published `main` v0.3.3 is untouched.

## Implemented format families

| Field | Supported extensions | What opens |
|---|---|---|
| General 3D / animation | `.glb`, `.gltf`, `.fbx`, `.obj`, `.dae`, `.3ds` | Scene meshes and available embedded materials |
| 3D printing / CAD exchange meshes | `.stl`, `.ply`, `.3mf` | Triangulated mesh geometry |
| USD scene archive | `.usdz` | Subset supported by the Three.js USDZLoader bundled in this version |
| Scientific surface | `.vtk` | **Legacy VTK POLYDATA geometry only**, not every VTK dataset |
| LiDAR / particles / point samples | `.pcd`, `.xyz` | Point cloud visualization |
| Molecular structure | `.pdb` | Molecular atoms shown as points; not bonds, surfaces or dynamics |

**File size limit:** 50 MB per file, processed locally in the browser. Other formats (STEP/STP, IGES/IGS, SolidWorks SLDPRT/SLDASM, CATIA, Parasolid, IFC, Abaqus ODB, ANSYS, HDF5, NetCDF, DICOM, LAMMPS dump, LIGGGHTS, OpenFOAM, simulation results, trajectories and most volume/field formats) are **not supported** by this importer. The project does **not** simulate physics, calculate particle trajectories, process finite elements, compute molecular dynamics or convert native CAD solids to meshes.

Single-file import means **sidecar dependencies are not loaded**. Prefer self-contained GLB or embedded glTF/FBX content. OBJ can show geometry without MTL/texture references; external glTF buffers and texture URLs are not resolved. USDZ compatibility depends on the specific archive contents and the pinned Three.js loader.

## Behavior

1. Click **Open 3D Model** and choose a supported file.
2. Mesh-based formats appear in the Hierarchy and retain the existing mesh selection/material/shader tools wherever their material supports those properties.
3. Point clouds are rendered in the viewport, but **do not appear in the mesh Hierarchy** and are not editable through the Material Inspector yet.
4. Reset Camera frames the loaded scene. Use Return to Sample Robot to clear a model. Switching files disposes model resources.
5. Errors are displayed in the status bar without modifying `main`. Open one model at a time.

## Downloadable test models

To test without searching for external assets, download these small files using GitHub's **Raw → Download** option:

- [Demo OBJ pyramid](../examples/models/demo-pyramid.obj) — triangle surface; should appear in the mesh Hierarchy.
- [Demo STL triangle](../examples/models/demo-triangle.stl) — CAD/printing geometry.
- [Demo XYZ particles](../examples/models/demo-particles.xyz) — scientific point samples; appear in the viewport but not the mesh Hierarchy.

## Windows verification

Run `npm.cmd run test` then `npm.cmd run dev` after checkout of the feature branch.

- Import the robot/sample `.glb` and verify all established v0.3.3 workflows still work.
- Import a simple `.obj` and see a mesh in Hierarchy; rotate/zoom and select it.
- Import a triangulated `.stl` and a `.ply` surface; inspect geometry, reset camera and color.
- Import a `.fbx` with embedded resources; check orientation and material behavior. Animation playback is not implemented.
- Import a self-contained `.3mf` and a compatible `.usdz`; report model-specific failures. Some USDZ dialects are unsupported.
- Import a VTK POLYDATA surface (`.vtk`), PCD and XYZ point clouds, and a PDB molecule; verify geometry or points display as expected.
- Import a deliberately unsupported `.step` or an invalid file renamed `.obj` and check for an informative error.
- Switch between different file types repeatedly and ensure old objects disappear and Sample Robot restores correctly.

## Subsequent stage: v0.3.4 Multi-Material Slot Inspector

Only after verifying the multi-format importer on Windows should we start the next branch from the approved stable version. The planned inspector will allow selecting a material slot for a mesh with several material groups. It must preserve per-slot maps and settings during shader, preset and Reset workflows.
