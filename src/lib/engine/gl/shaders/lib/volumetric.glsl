precision highp float;

// Shared "fake volumetric" relight: emboss a sprite's painted luminance into a
// normal and light it with a drifting, flickering torch. Applied as a baseline
// to all sprites (and the weapon), so it is NOT a SpriteEffect variant -- the
// caller computes a luminance gradient (sampling style varies) and this turns it
// into a light multiplier.

const float VOL_RELIEF = 3.5;   // emboss strength from luminance
const float VOL_SWEEP = 0.55;   // horizontal drift of the torch
const float VOL_AMBIENT = 0.5;  // shadow floor
const float VOL_FLICKER = 0.1;  // torch flicker
const float VOL_LEVELS = 5.0;   // posterization bands

// Light multiplier for one fragment. `lumaGrad` points toward brighter pixels;
// `baseRgb` is the sprite's own color (used to keep emissive highlights lit).
float volumetricLight(vec2 lumaGrad, vec3 baseRgb, float time) {
  vec3 normal = normalize(vec3(-lumaGrad * VOL_RELIEF, 1.0));
  vec3 lightDir = normalize(vec3(sin(time * 0.9) * VOL_SWEEP, 0.4, 0.85));
  // Cheap torch flicker: two detuned sines summed, no noise lib needed.
  float flick = 1.0 + VOL_FLICKER * 0.5 * (sin(time * 11.0) + sin(time * 17.3));
  // Half-lambert wrap so the far side fades softly to ambient (no black rim).
  float wrap = dot(normal, lightDir) * 0.5 + 0.5;
  float light = mix(VOL_AMBIENT, 1.0, wrap * wrap) * flick;
  light = floor(light * VOL_LEVELS + 0.5) / VOL_LEVELS;
  // Already-bright (emissive-looking) pixels stay lit regardless of normal.
  float luma = dot(baseRgb, vec3(0.299, 0.587, 0.114));
  float emissive = smoothstep(0.75, 0.95, luma);
  return mix(light, max(light, 1.0), emissive);
}

// texelFetch luminance gradient for sprites/walls that sample on the texel grid.
float volLumaTexel(sampler2D tex, ivec2 texSize, int c, int r) {
  c = clamp(c, 0, texSize.x - 1);
  r = clamp(r, 0, texSize.y - 1);
  return dot(texelFetch(tex, ivec2(c, r), 0).rgb, vec3(0.299, 0.587, 0.114));
}

vec2 volLumaGradTexel(sampler2D tex, ivec2 texSize, int col, int row) {
  int d = max(int(float(texSize.y) * 0.004), 1);
  return vec2(
    volLumaTexel(tex, texSize, col + d, row) - volLumaTexel(tex, texSize, col - d, row),
    volLumaTexel(tex, texSize, col, row + d) - volLumaTexel(tex, texSize, col, row - d)
  );
}
