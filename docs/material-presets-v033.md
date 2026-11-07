# 3D Web Platform v0.3.3 — Material Presets & Shader Uniforms (feature preview)

This branch adds local, portable material presets and live uniform controls to the Unity-inspired Inspector. The public website remains on v0.3.2 until a reviewed merge.

## Try on Windows

1. In GitHub Desktop, Fetch origin and switch to `feature/v0.3.3-presets-uniforms`.
2. In the repository, run `npm.cmd run dev`.
3. Select robot **Head**, set Base Color (for example red), and use **Save Preset** in the Material Presets panel. Browser downloads a `.material.json` file.
4. Change Base Color to green, click **Load Preset** and select the downloaded JSON. The head should return to the saved red.
5. Click **Load Anime Toon Demo** and **Compile & Apply**, then change live `uColor`, `uTime Speed`, and `uIntensity` in the Custom Shader panel. The shader should change without recompiling.
6. Save the shader preset. Click **Return to PBR**, then **Load Preset** to restore the shader and optional outline. Original textures should stay attached.
7. Import an invalid JSON file or a file with wrong `version` and confirm the error is shown without changing the mesh.
8. Verify mesh selection, independent Inspector scrolling, GLB loading, texture upload, shader error checks and reset continue to work.

You can run automated format tests with `npm.cmd run test`, and a production build with `npm.cmd run build`.

## Format and important limitations

The JSON preset is version 1: `format: "3d-web-platform-material-preset"`, `version: 1`, `mode: "pbr" | "shader"`. It saves base/emissive colors, metallic/roughness, wireframe and visibility. In shader mode, it also includes the full vertex/fragment GLSL sources, outline settings and standard live uniform settings. The file is portable across meshes where the shader's attributes are available.

**Image textures are not embedded** and uploaded textures are left untouched when loading a preset. Texture maps are retained on the mesh you are editing, not transferred from the exporting mesh. This avoids huge data URLs and shader preset files; portable texture packaging and a material library are future work.

The three controlled uniforms are `uColor` (vec3), `uTime` (float, animated according to the speed control), and `uIntensity` (float). The shader has to declare these names to use them. The built-in anime demo shader now declares all three.

Other existing limits remain: only material slot 1 is editable on multi-material meshes; skinned/animated meshes are not supported by inverted-hull outlines; GLSL ES 1.00 rather than Unity ShaderLab/HLSL; edits to a model are browser-session-only and GLB export is not implemented.

All preset parsing is done locally in your browser. Imported JSON is format-checked and embedded GLSL is syntax checked before application. Use trusted shader sources; WebGL shader code runs on the GPU and can overload rendering.

## Rollback

Switch GitHub Desktop back to `main` to use the stable v0.3.2 release. Do not merge this feature branch before Windows acceptance tests pass.
