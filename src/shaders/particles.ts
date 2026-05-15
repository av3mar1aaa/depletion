export const particlesVertexShader = /* glsl */ `
uniform float uTime;
uniform float uSize;
attribute float aSeed;

varying float vAlpha;

void main() {
  vec3 pos = position;

  float speed = 0.04 + aSeed * 0.08;
  float angle = uTime * speed;
  float c = cos(angle);
  float s = sin(angle);
  pos.xz = mat2(c, -s, s, c) * pos.xz;

  pos.y += sin(uTime * 0.25 + aSeed * 6.2831) * 0.12;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  gl_PointSize = uSize * (0.5 + aSeed * 0.6) * (1.0 / max(-mvPos.z, 0.1));

  vAlpha = 0.35 + aSeed * 0.55;
}
`

export const particlesFragmentShader = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  float d = distance(gl_PointCoord, vec2(0.5));
  if (d > 0.5) discard;

  float alpha = smoothstep(0.5, 0.0, d) * vAlpha;

  gl_FragColor = vec4(uColor, alpha);
  #include <colorspace_fragment>
}
`
