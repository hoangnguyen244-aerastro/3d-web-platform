// GLSL ES 1.00 · WebGL 1/2 compatible (via Three.js RawShaderMaterial)
// Anime toon shading uses stepped diffuse lighting and a subtle rim highlight.
export const ANIME_TOON_VERTEX = `precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;
varying vec3 vViewNormal;
varying vec2 vUv;
void main() {
  vUv = uv;
  vViewNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const ANIME_TOON_FRAGMENT = `precision highp float;
uniform float uTime;
uniform float uIntensity;
uniform vec3 uColor;
uniform sampler2D uTexture;
uniform float uUseTexture;
varying vec3 vViewNormal;
varying vec2 vUv;
void main() {
  vec3 N = normalize(vViewNormal);
  // Slowly orbit the light around the mesh. The shifting cel bands make uTime Speed easy to test.
  vec3 L = normalize(vec3(0.80 * sin(uTime * 1.4), 0.55, 0.85 * cos(uTime * 1.4)));
  float diffuse = max(dot(N, L), 0.0);
  float band = diffuse > 0.78 ? 1.0 : (diffuse > 0.38 ? 0.72 : 0.38);
  vec3 base = uColor;
  if (uUseTexture > 0.5) base *= texture2D(uTexture, vUv).rgb;
  float rim = pow(1.0 - max(N.z, 0.0), 3.0);
  float rimBand = step(0.65, rim) * 0.18;
  float softPulse = 0.88 + 0.12 * sin(uTime * 2.0);
  gl_FragColor = vec4(base * (band + rimBand) * uIntensity * softPulse, 1.0);
}`;

// Inverted-hull outline uses a second BackSide draw of the mesh geometry.
export const ANIME_OUTLINE_VERTEX = `precision highp float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float uOutlineWidth;
void main() {
  vec3 expanded = position + normal * uOutlineWidth;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(expanded, 1.0);
}`;

export const ANIME_OUTLINE_FRAGMENT = `precision highp float;
void main() {
  gl_FragColor = vec4(0.06, 0.045, 0.09, 1.0);
}`;
