precision highp float;
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
}
