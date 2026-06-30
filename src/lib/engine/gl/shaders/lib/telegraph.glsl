uniform float uTelegraph;

// Pre-strike "tell": a soft white glow that brightens the sprite as an enemy
// winds up, peaking on the strike. Kept subtle so it reads as a default "about
// to attack" cue rather than a dramatic super-charge.
vec3 applyTelegraph(vec3 color, float t) {
  if (t <= 0.0) {
    return color;
  }
  vec3 glow = vec3(1.0);
  vec3 tinted = mix(color, glow, clamp(t * 0.3, 0.0, 1.0));
  return tinted + glow * t * 0.12;
}
