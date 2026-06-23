uniform float uHitFlash;

vec3 applyHitFlash(vec3 color, float flash) {
  return mix(color, vec3(1.0, 0.12, 0.08), clamp(flash, 0.0, 1.0));
}
