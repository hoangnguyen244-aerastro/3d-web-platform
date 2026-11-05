precision highp float;
uniform vec3 uColor;
uniform sampler2D uTexture;
uniform float uUseTexture;
varying vec3 vViewNormal;
varying vec2 vUv;
void main() {
  vec3 N = normalize(vViewNormal);
  vec3 L = normalize(vec3(0.5, 0.8, 1.0));
  float diffuse = max(dot(N, L), 0.0);
  float band = diffuse > 0.78 ? 1.0 : (diffuse > 0.38 ? 0.72 : 0.38);
  vec3 base = uColor;
  if (uUseTexture > 0.5) base *= texture2D(uTexture, vUv).rgb;
  float rim = pow(1.0 - max(N.z, 0.0), 3.0);
  float rimBand = step(0.65, rim) * 0.18;
  gl_FragColor = vec4(base * (band + rimBand), 1.0);
}
