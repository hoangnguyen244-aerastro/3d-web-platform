# Model Viewer v0.3.2 — Material Inspector (feature preview)

This branch adds a Unity-inspired inspector for individual mesh materials. It does not deploy to GitHub Pages until merged into main.

## How to try it

1. Check out `feature/v0.3.2-material-inspector` in GitHub Desktop.
2. Run `npm.cmd install` (only if dependencies have not been installed) and `npm.cmd run dev`.
3. Click a robot part or upload a self-contained GLB (up to 50 MB).
4. Select a mesh from Hierarchy, then use Inspector for color, metalness, roughness, emission, visibility and wireframe.
5. Import PNG/JPEG/WebP textures up to 15 MB into the PBR slots.
6. For custom GPU shaders, paste GLSL ES 1.00 source code or import one vertex file (.vert/.vs/.glsl) and one fragment file (.frag/.fs/.glsl). Click **Compile & Apply**.
7. Click **Return to PBR** to restore the selected mesh's edited PBR material or **Reset selected material** to revert that mesh to its material before editing.

## Shader authoring

Raw WebGL GLSL only: not Unity ShaderLab, HLSL, JavaScript or a Unity .shader asset. Vertex and fragment sources must be complete GLSL ES 1.00 scripts. No shader files are sent to a server.

The default example can be edited in the Inspector. Supported demo uniforms, when declared in your source:

- `uTime`: elapsed seconds
- `uColor`: base color of the selected mesh
- `uTexture`: its Albedo texture (if present)
- `uUseTexture`: 1.0 if a map exists, otherwise 0.0

Three.js supplies standard transform matrices (e.g. `projectionMatrix`, `modelViewMatrix`) for RawShaderMaterial. You must declare the uniforms and attributes you reference.

**Example vertex source:**

```glsl
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

**Example fragment source:**

```glsl
precision highp float;
uniform float uTime;
uniform vec3 uColor;
uniform sampler2D uTexture;
uniform float uUseTexture;
varying vec2 vUv;
void main() {
  vec3 c = uColor;
  if (uUseTexture > 0.5) c *= texture2D(uTexture, vUv).rgb;
  gl_FragColor = vec4(c * (0.8 + 0.2 * sin(uTime * 2.0)), 1.0);
}
```

## Limitations

- The inspector edits **the first material slot** of a mesh with multiple materials.
- PBR textures use the glTF channel conventions: Metallic = blue channel; Roughness = green channel.
- Textures require valid UV coordinates. No shader graph, custom material uniform inspector, GLSL editor diagnostics beyond WebGL compile/link errors, or GLB export yet.
- Edits live only in this browser session; reloading the page resets changes.
- The default custom shader uses simple unlit output, so its lighting does not match PBR.
- Some untrusted shaders can overload a GPU. Test your own scripts and save work first.
- This project is hosted as a static website; files are processed locally and not uploaded.

## Suggested manual acceptance checks

- Sample robot meshes remain selectable with yellow bounding boxes.
- Changing head color affects the head, not the arms.
- Loading an Albedo PNG shows its texture only on the selected mesh.
- Loading a Normal texture updates only the selected PBR material.
- The default GLSL vertex and fragment pair compiles and animates a subtle color pulse.
- A deliberately invalid fragment shader reports a compile error and retains the prior appearance.
- Return to PBR restores the PBR state; Reset selected material restores the initial state.
- Switching GLB files clears stale selection; camera reset/grid/benchmark tab still work.

