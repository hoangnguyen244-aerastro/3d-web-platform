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
- The GLSL source editor shows the shader saved for the currently selected slot when you switch slots (or the default starter script for a PBR slot). Applying code targets the active slot only. Unsaved text edits should be compiled or copied before switching slots. Save Preset records each applied slot's shader.
- Presets store PBR settings and shader source, not uploaded texture bytes.
- Some FBX, USDZ, DAE or 3DS formats can have material grouping different from OBJ/glTF and may require additional normalization.
- This is a preview, not a CAD kernel or physics simulator. No STEP/IGES/SolidWorks-native input, volumetric data simulation or GLB export.


## Hotfix verification: Toon Shader crash / locked Roughness slider

The previous v0.3.4 preview caused the browser to close or freeze when the Anime Toon shader was applied. Outlines are now implemented as **detached scene overlays**, not nested under the original mesh. Unsupported meshes skip the outline with a status message. New automated regression tests confirm the outline leaves the original mesh scene graph intact and targets only the chosen material slot.

Imported OBJ/FBX materials often use `MeshPhongMaterial` or `MeshBasicMaterial`, whose Roughness/Metalness fields do not exist. Editing PBR properties now converts **only that material slot** to an editable `MeshStandardMaterial`, preserving available color, texture and transparency.

### Test order (to isolate possible GPU/browser issues)

1. Load `demo-two-material-slots.obj`, select slot 1, disable **Ink outline**, then **Load Anime Toon Demo** and **Compile & Apply**. Observe shader coloring without silhouette. Note: loading the demo turns Ink outline back on, so disable it **after** clicking Load Anime Toon Demo.
2. Select slot 1, enable **Ink outline**, Compile & Apply again. It should show a black silhouette without a browser crash.
3. Switch to slot 2; verify its PBR surface remains untouched. Apply Anime Toon to slot 2 and confirm both shaders work.
4. Return both slots to PBR and move Roughness slider to 0.1, 0.5 and 0.9. The displayed value and reflected appearance should respond independently on both slots.
5. Repeat on Sample Robot Head and on any known FBX material. Reset and change model files; verify there are no stuck outlines or GPU crashes.

GitHub Actions tests/build verify static shader state, PBR conversion and detached scene-graph behavior. **Actual GPU rendering still requires Windows browser acceptance.** Do not merge until shader and Roughness tests pass.

## Final UX fixes — November 2026

### Live Anime Toon outline thickness
With a compiled and active Anime Toon shader **and Ink outline enabled**, moving **Outline Thickness** now updates `uOutlineWidth` on the existing outline material in real time without clicking Compile & Apply again. The preview still needs **Compile & Apply** if the outline itself is initially enabled or disabled.

### Imported material names
The Material dropdown displays material names from the source asset (e.g. `LeftRegion`, `RightRegion` from OBJ `usemtl`, or material names from GLB/FBX) with the slot number suffix. Only materials without a name use the fallback `Material N`. Names are captured during import/registration, so applying shaders or presets does not overwrite the original labels.

### Final browser checks before approving release
1. Load `demo-two-material-slots.obj`, select `TwoMaterialPanel`; dropdown must show `LeftRegion · 1/2` and `RightRegion · 2/2`.
2. Load an external named GLB/FBX and confirm material names match the source wherever supplied by the loader.
3. Apply Anime Toon with Ink outline on slot 1. Drag Thickness from `0.005` to `0.1` while observing the viewer. The outline should respond **without another Apply**.
4. Switch to slot 2, apply a separate shader and change thickness. Slot 1's outline width and material should stay unchanged.
5. Check Return to PBR, Reset and imported file switching, ensuring no browser crash.

**Release gate:** GitHub Actions covers structural behavior and production compilation; the real-time WebGL behavior and imported material labels should also be confirmed manually in Windows before merging this PR.
