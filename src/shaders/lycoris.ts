export const lycorisVertexShader = /* glsl */ `
uniform float uTime;
uniform float uBloom;
uniform float uPhase;
uniform float uHeight;
uniform float uLift;
uniform float uOpen;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying float vV;

void main() {
  vec3 pos = position;
  vec3 norm = normal;
  float v = pos.y / uHeight;
  vV = v;

  // (Hover effect now applied in world space below — no local stretch here)

  // Gentle S-curve along length — single soft bend, not ribbon-flag waves
  float waveT = uPhase * 6.2831;
  pos.x += sin(v * 2.0 + waveT) * 0.014 * v;
  pos.z += cos(v * 1.6 + waveT * 0.7) * 0.011 * v;

  // Mild twist
  float twist = (0.3 + uPhase * 0.35) * v * uBloom;
  float ct = cos(twist), st = sin(twist);
  pos.xz = mat2(ct, -st, st, ct) * pos.xz;
  norm.xz = mat2(ct, -st, st, ct) * norm.xz;

  // Backward curl — varied per petal; HOVER moderately straightens petals upward
  float curlFactor = uBloom * (1.0 - uOpen * 0.62);
  float curl = (2.2 + uPhase * 1.1) * smoothstep(0.0, 1.0, v) * curlFactor;
  float cc = cos(curl), sc = sin(curl);
  pos.yz = mat2(cc, -sc, sc, cc) * pos.yz;
  norm.yz = mat2(cc, -sc, sc, cc) * norm.yz;

  // Light wind — gentle continuous sway
  float windT = uTime * 0.7 + uPhase * 6.2831;
  float windScale = v * v;
  pos.x += sin(windT + v * 2.5) * 0.045 * windScale;
  pos.z += cos(windT * 0.9 + v * 2.0) * 0.038 * windScale;
  pos.y += sin(windT * 0.6 + v * 3.0) * 0.020 * windScale;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);

  // HOVER: petals bloom UPWARD in world space — tips rise, bases stay anchored
  worldPos.y += uOpen * 0.50 * v;

  // World-space lift — petals fly upward and scatter outward during scroll transition
  float liftStrength = 0.8 + uPhase * 1.6;
  worldPos.y += uLift * liftStrength;
  worldPos.x += uLift * 0.55 * sin(uPhase * 6.2831);
  worldPos.z += uLift * 0.55 * cos(uPhase * 6.2831);

  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * norm);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

export const lycorisFragmentShader = /* glsl */ `
uniform vec3 uColorBase;
uniform vec3 uColorMid;
uniform vec3 uColorTip;
uniform vec3 uColorGlow;
uniform vec3 uColorSpec;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying float vV;

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(vec3(0.25, 0.75, 0.65));

  float NdotL = abs(dot(N, L));
  float NdotV = abs(dot(N, V));

  // Softer cel-shading — natural light falloff with subtle stylization
  float lit = smoothstep(0.32, 0.55, NdotL);

  // Length gradient
  float t = pow(smoothstep(0.0, 1.0, vV), 1.7);
  vec3 baseColor = mix(uColorBase, uColorMid, smoothstep(0.0, 0.55, t));
  baseColor = mix(baseColor, uColorTip, smoothstep(0.42, 1.0, t));

  vec3 color = baseColor * (0.28 + 0.65 * lit);

  // Subtle wet sheen on curl ridges — present but not plastic
  vec3 R = reflect(-L, N);
  float RdotV = max(dot(R, V), 0.0);
  float spec = pow(RdotV, 18.0);
  color = mix(color, uColorSpec, spec * 0.32);

  // Rim glow at silhouette
  float rim = smoothstep(0.6, 0.95, 1.0 - NdotV);
  color = mix(color, uColorGlow, rim * 0.28);

  color = pow(max(color, vec3(0.0)), vec3(0.92));

  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
`
