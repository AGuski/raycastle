precision highp float;

uniform float uFogStart;
uniform float uFogInvRange;
uniform vec3 uFogColor;

float fogAmount(float z) {
  return clamp((z - uFogStart) * uFogInvRange, 0.0, 1.0);
}

vec3 applyFog(vec3 color, float z) {
  return mix(color, uFogColor, fogAmount(z));
}
