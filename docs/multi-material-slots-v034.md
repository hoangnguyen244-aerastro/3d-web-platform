# v0.3.4 — Multi-Material Slot Inspector (feature preview)

This branch builds **on the 14-format importer** from `feature/v0.3.3-multiformat-import`. The stable public `main` stays at v0.3.3 until release approval. The importer was manually tested 8/8 on Windows and its build/tests passed before this branch was created.

## What changes

A mesh with multiple materials now offers a **Material 1 / N** dropdown in **Mesh Renderer**. Every indexed material keeps its own original reference, editable PBR clone, uploaded textures, GLSL shader, ink outline, shader uniforms and Reset state.

- Changing a material property in slot 2 should not alter slot 1.
- Texture uploads, shader compilation/application, Return to PBR and **Reset selected material slot** target only the selected slot.
- Save Preset includes the current slot's material state; Load Preset applies to the selected slot.
- Mesh visibility is **mesh-wide**, not slot-specific. Changing it from either slot affects the whole mesh.
- Individual slots are meaningful only on mesh geometries containing groups assigned to separate material indices. A GLB with several meshes, each with one material, will continue to show one slot for each mesh.
- A selected slot's inverted-hull anime outline uses the mesh's geometry groups and masks the other material slots. It requires static geometry with normals, as before.
- Imported scientific point clouds remain viewable but are not mesh materials.

## Ready-to-test multi-material OBJ

Download [demo-two-material-slots.obj](../examples/models/demo-two-material-slots.obj) via GitHub's Raw/Download option. This one OBJ mesh declares `LeftRegion` and `RightRegion` using two `usemtl` groups; it does not need an external `.mtl` file.

## Windows acceptance test checklist

1. In GitHub Desktop choose `feature/v0.3.4-multi-material-slots` and Fetch/Pull origin.
2. Run `npm.cmd run test`, `npm.cmd run dev`.
3. Open `demo-two-material-slots.obj`; select `TwoMaterialPanel` in Hierarchy. Verify **Material 1 / 2** and **Material 2 / 2** options.
4. Change Base Color of slot 1 to red. Switch to slot 2 and set blue. Check the two halves differ, and selecting each slot shows the correct color.
5. Upload an Albedo texture to slot 2; confirm slot 1 is unchanged. Remove/reset slot 2 and verify slot 1 stays red.
6. Apply Anime Toon GLSL to slot 1; select slot 2 and confirm its PBR material and textures remain. Return slot 1 to PBR.
7. Save a preset from slot 2, change its color, then Load Preset. Confirm only slot 2 is restored.
8. Use Reset selected material slot on slot 1; verify slot 2 remains unchanged.
9. Open the existing robot GLB, FBX, STL and XYZ samples; verify mesh selection, import, controls and point clouds still work.
10. Repeat changes across slots and switch model files; confirm no stale mesh/slot state or renderer errors.

## Known limitations

- Still operates on one selected mesh at a time; material visibility is per mesh.
- The GLSL *source editor* is shared in the UI; applying its code targets only the active material slot. Switch the slot before pressing Compile & Apply. Save Preset records each applied slot's shader.
- Presets store PBR settings and shader source, not uploaded texture bytes.
- Some FBX, USDZ, DAE or 3DS formats can have material grouping different from OBJ/glTF and may require additional normalization.
- This is a preview, not a CAD kernel or physics simulator. No STEP/IGES/SolidWorks-native input, volumetric data simulation or GLB export.
