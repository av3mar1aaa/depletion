export const kakuganVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const kakuganFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uPupilSize;
uniform float uReveal;
uniform float uFlicker;
uniform float uSurge;

varying vec2 vUv;

#define PI 3.14159265
#define TWO_PI 6.28318530

float hash(float x) { return fract(sin(x * 12.9898) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash2(i + vec2(0.0, 0.0)), hash2(i + vec2(1.0, 0.0)), u.x),
    mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

const float PLANE_W = 4.0;
const float PLANE_H = 2.0;
const float halfW = 1.45;
const float halfH = 0.5;
const float Rcircle = 2.225;
const float dOff = 1.725;

void main() {
  vec2 world = (vUv - 0.5) * vec2(PLANE_W, PLANE_H);

  // ===== ALMOND EYE OUTLINE =====
  float topD = length(world - vec2(0.0, -dOff)) - Rcircle;
  float botD = length(world - vec2(0.0,  dOff)) - Rcircle;
  float eyeDist = max(topD, botD);
  float eyeMask = smoothstep(0.012, -0.012, eyeDist);

  if (eyeMask < 0.001) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float r = length(world);
  float a = atan(world.y, world.x);

  // ===== 3D EYEBALL SHADING =====
  vec2 sphereCoord = vec2(world.x / halfW, world.y / halfH);
  float sphereR2 = clamp(dot(sphereCoord, sphereCoord), 0.0, 1.0);
  float sphereZ = sqrt(1.0 - sphereR2 * 0.85);
  vec3 N = normalize(vec3(sphereCoord * 0.6, sphereZ));
  vec3 L = normalize(vec3(-0.3, 0.55, 0.85));
  float lambert = max(dot(N, L), 0.0);
  float ambient = 0.55 + 0.45 * lambert;
  float depthVignette = smoothstep(0.0, 0.08, -eyeDist);

  // ===== DEEP PURE BLACK SCLERA =====
  vec3 color = vec3(0.001, 0.0, 0.0);

  // ===== COMPACT PUPIL/IRIS ASSEMBLY (small red ring at center) =====
  const float irisR = 0.07;
  // Pupil expands almost to the iris boundary at max dilation
  float pupilR = 0.014 + uPupilSize * 0.050;

  float insideIris = smoothstep(irisR + 0.008, irisR - 0.003, r);

  if (insideIris > 0.001) {
    vec3 deepBlood = vec3(0.20, 0.0, 0.025);
    vec3 bloodRed  = vec3(0.65, 0.0, 0.05);
    vec3 hotRed    = vec3(0.88, 0.02, 0.04);

    float irisLerp = clamp(r / irisR, 0.0, 1.0);
    vec3 irisColor = mix(deepBlood, bloodRed, smoothstep(0.0, 0.55, irisLerp));
    irisColor = mix(irisColor, hotRed, smoothstep(0.65, 1.0, irisLerp));
    irisColor *= ambient;

    float n = noise(world * 70.0);
    irisColor *= 0.92 + n * 0.12;

    // Cog/rose pattern within the ring (6 spokes)
    float petalT = sin(a * 6.0 - PI / 6.0) * 0.5 + 0.5;
    float ringT = clamp((r - pupilR) / max(irisR - pupilR, 0.001), 0.0, 1.0);
    float spokes = smoothstep(0.55, 0.85, petalT)
                 * smoothstep(0.1, 0.45, ringT)
                 * smoothstep(1.0, 0.6, ringT);
    irisColor += vec3(0.45, 0.0, 0.02) * spokes * 0.55;

    // PUPIL — dark hole inside red ring
    float pupilSoft = smoothstep(pupilR + 0.003, pupilR - 0.002, r);
    irisColor = mix(irisColor, vec3(0.0), pupilSoft);

    // Pupil bright rim
    float pupilRim = smoothstep(0.003, 0.0, abs(r - pupilR + 0.001));
    irisColor += vec3(0.6, 0.0, 0.025) * pupilRim * 0.9;

    // Tiny central glint inside pupil
    float centerGlint = exp(-pow(r / 0.0035, 2.0));
    irisColor += vec3(0.85, 0.0, 0.03) * centerGlint * 0.85;

    // Outer iris rim (limbus)
    float limbus = smoothstep(0.008, 0.0, abs(r - irisR + 0.003));
    irisColor += vec3(0.55, 0.0, 0.02) * limbus * 0.9;

    color = mix(color, irisColor, insideIris);
  }

  // ===== OUTER GLOW around the small iris — tight, dim =====
  float glow = exp(-pow(r / 0.10, 1.8));
  color += vec3(0.32, 0.0, 0.010) * glow * 0.25;

  // ===== TREE-BRANCH VEINS — flowing curves with halo aura =====
  float veinIntensity = 0.0;

  // === MAIN BRANCHES — sin-based S-curves, evenly distributed around the eye ===
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    // Evenly distribute around circle (every 30°) with small jitter for naturalness
    float baseAngle = (fi / 12.0) * TWO_PI + (hash(fi) - 0.5) * 0.35;

    vec2 dir = vec2(cos(baseAngle), sin(baseAngle));
    vec2 perpAxis = vec2(-dir.y, dir.x);
    float along = dot(world, dir);
    vec2 perpVec = world - dir * along;
    float perpSigned = dot(perpVec, perpAxis);

    float startR = irisR + 0.005;
    float endR = startR + 0.30 + hash(fi + 11.0) * 0.55;
    float tParam = clamp((along - startR) / max(endR - startR, 0.001), 0.0, 1.0);

    float curveA = (hash(fi + 7.0) - 0.5) * 0.18;
    float curveB = (hash(fi + 17.0) - 0.5) * 0.09;
    float curveOffset = curveA * sin(tParam * PI) + curveB * sin(tParam * PI * 2.0);

    float perpDist = abs(perpSigned - curveOffset);

    float thickness = mix(0.0055, 0.0011, tParam);

    // Sharp core + soft halo (jellyfish-membrane aura around the line)
    float core = smoothstep(thickness, thickness * 0.25, perpDist);
    float halo = smoothstep(thickness * 4.5, thickness * 0.6, perpDist);
    float line = max(core, halo * 0.40);

    float bounds = smoothstep(startR - 0.005, startR + 0.008, along)
                 * smoothstep(endR + 0.015, endR - 0.005, along);
    line *= bounds;

    // Slow base pulse + occasional fast lightning sparkle
    float pulse = 0.78 + 0.16 * sin(uTime * 0.55 + fi * 1.3);
    float sparkleIdx = floor(uTime * 2.6 + fi * 0.41);
    float sparklePhase = fract(uTime * 2.6 + fi * 0.41);
    float sparkleSeed = hash(sparkleIdx + fi * 23.0);
    float sparkleOn = step(0.82, sparkleSeed);
    float sparkleEnv = sparkleOn * exp(-sparklePhase * 7.5);

    float intensity = pulse + sparkleEnv * 0.55;
    veinIntensity = max(veinIntensity, line * intensity);
  }

  // === SUB-BRANCHES — 2 per main, originate on the curved main path ===
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    // Must match main vein angle exactly so sub-branches start on actual main path
    float mainAngle = (fi / 12.0) * TWO_PI + (hash(fi) - 0.5) * 0.35;
    vec2 mainDir = vec2(cos(mainAngle), sin(mainAngle));
    vec2 mainPerp = vec2(-mainDir.y, mainDir.x);

    float mainStartR = irisR + 0.005;
    float mainEndR = mainStartR + 0.30 + hash(fi + 11.0) * 0.55;
    float mainCurveA = (hash(fi + 7.0) - 0.5) * 0.18;
    float mainCurveB = (hash(fi + 17.0) - 0.5) * 0.09;

    for (int j = 0; j < 2; j++) {
      float fj = float(j);

      float splitDist = irisR + 0.07 + fj * 0.11 + hash(fi + fj * 5.0 + 100.0) * 0.06;

      float splitTParam = clamp(
        (splitDist - mainStartR) / max(mainEndR - mainStartR, 0.001),
        0.0, 1.0
      );
      float mainCurveAtSplit = mainCurveA * sin(splitTParam * PI)
                             + mainCurveB * sin(splitTParam * PI * 2.0);
      vec2 splitPos = mainDir * splitDist + mainPerp * mainCurveAtSplit;

      float side = (fj < 0.5) ? 1.0 : -1.0;
      float subAngleOff = side * (0.40 + hash(fi + fj * 13.0 + 200.0) * 0.45);
      float subAngle = mainAngle + subAngleOff;
      vec2 sdir = vec2(cos(subAngle), sin(subAngle));
      vec2 sperpAxis = vec2(-sdir.y, sdir.x);

      vec2 rel = world - splitPos;
      float salong = dot(rel, sdir);
      vec2 sperpVec = rel - sdir * salong;
      float sperpSigned = dot(sperpVec, sperpAxis);

      float subLen = 0.12 + hash(fi + fj * 19.0 + 400.0) * 0.20;
      float subT = clamp(salong / max(subLen, 0.001), 0.0, 1.0);

      float sCurveA = (hash(fi + fj * 17.0 + 300.0) - 0.5) * 0.16;
      float sCurveB = (hash(fi + fj * 23.0 + 500.0) - 0.5) * 0.07;
      float subCurveOffset = sCurveA * sin(subT * PI) + sCurveB * sin(subT * PI * 2.0);

      float sperpDist = abs(sperpSigned - subCurveOffset);

      float sThickness = mix(0.0040, 0.0009, subT);

      float sCore = smoothstep(sThickness, sThickness * 0.25, sperpDist);
      float sHalo = smoothstep(sThickness * 4.5, sThickness * 0.6, sperpDist);
      float subLine = max(sCore, sHalo * 0.40);

      float sBounds = smoothstep(0.0, 0.008, salong)
                    * smoothstep(subLen + 0.01, subLen - 0.005, salong);
      subLine *= sBounds;

      float subPulse = 0.78 + 0.16 * sin(uTime * 0.55 + (fi + fj * 5.0) * 1.3);
      float subSparkleIdx = floor(uTime * 2.6 + (fi + fj * 5.0) * 0.41);
      float subSparklePhase = fract(uTime * 2.6 + (fi + fj * 5.0) * 0.41);
      float subSparkleSeed = hash(subSparkleIdx + (fi + fj * 5.0) * 23.0);
      float subSparkleOn = step(0.82, subSparkleSeed);
      float subSparkleEnv = subSparkleOn * exp(-subSparklePhase * 7.5);

      float subIntensity = subPulse + subSparkleEnv * 0.50;
      veinIntensity = max(veinIntensity, subLine * subIntensity * 0.78);
    }
  }

  // Deep dark blood color — drawn-line look.
  // During surge (page transition), veins ignite into bright lightning.
  vec3 veinColor = vec3(0.38, 0.0, 0.012);
  vec3 surgeColor = vec3(0.55, 0.0, 0.015);
  vec3 finalVeinColor = mix(veinColor, surgeColor, uSurge);
  float veinBoost = mix(0.88, 1.55, uSurge);
  color += finalVeinColor * veinIntensity * veinBoost;

  // Surge halo — subtle dark-blood pulse around the iris
  float surgeGlow = exp(-pow(r / 0.22, 1.5));
  color += vec3(0.32, 0.0, 0.012) * surgeGlow * uSurge * 0.4;

  // ===== DEPTH VIGNETTE =====
  color *= mix(0.72, 1.0, depthVignette);

  // ===== APPLY MASK + REVEAL =====
  color *= eyeMask;
  color *= uReveal;
  float alpha = eyeMask * uReveal;

  gl_FragColor = vec4(color, alpha);
}
`
