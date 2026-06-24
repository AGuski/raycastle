uniform vec2 uResolution;
uniform float uSpacing;
uniform sampler2D uTexture;
uniform ivec2 uTexSize;
uniform sampler2D uZBuffer;
uniform float uTime;
uniform float uLayerSeed;
uniform float uSmokeOnly;
uniform float uVolumetric; // >0.5 relights the lich BODY (not the smoke)

flat in float vDepth;
flat in float vTexColumn;
in float vTexRow;

out vec4 outColor;

float sampleAlpha(float col, float rowF) {
  int c = clamp(int(col), 0, uTexSize.x - 1);
  int r = clamp(int(rowF), 0, uTexSize.y - 1);
  return texelFetch(uTexture, ivec2(c, r), 0).a;
}

// Snap texture-space coords to a chunky pixel grid for the procedural plume.
vec2 pixelateTex(vec2 pos, float blockSize) {
  return (floor(pos / blockSize) + 0.5) * blockSize;
}

#define RINGS 8
#define DIRS 12

void main() {
  int col = int(clamp(floor(gl_FragCoord.x / uSpacing), 0.0, 65535.0));
  float zLimit = texelFetch(uZBuffer, ivec2(col, 0), 0).r;
  if (vDepth >= zLimit) {
    discard;
  }

  float fcol = vTexColumn;
  float frow = vTexRow * float(uTexSize.y);
  vec4 tex = texelFetch(uTexture, ivec2(int(fcol), int(frow)), 0);
  float bodyAlpha = tex.a;

  // Plume is evaluated on a coarse pixel grid so it reads as chunky pixel-art
  // smoke instead of smooth gradients. Block size scales with texture resolution.
  float pixBlock = max(float(max(uTexSize.x, uTexSize.y)) * 0.004, 2.0);
  vec2 pix = pixelateTex(
    vec2(fcol, frow) + vec2(uLayerSeed * 11.0, uLayerSeed * 7.0),
    pixBlock
  );
  float pcol = pix.x;
  float prow = pix.y;

  // Outward glow: a normalized, distance-weighted blur of the body's alpha.
  // Averaging (instead of max over discrete rings) yields a continuous gradient
  // with no concentric "shells" or hard outer cutoff. Radius scales with the
  // texture size so the halo keeps a consistent on-screen thickness.
  float radius = float(max(uTexSize.x, uTexSize.y)) * 0.085;
  float aura = 0.0;
  float weightSum = 0.0;
  for (int ring = 1; ring <= RINGS; ring++) {
    float t = float(ring) / float(RINGS);
    float rad = radius * t;
    // Smooth gaussian-like weight: strong near the body, trailing softly to 0.
    float w = exp(-t * t * 2.5);
    for (int d = 0; d < DIRS; d++) {
      float ang = (float(d) / float(DIRS)) * 6.2831853;
      float a = sampleAlpha(pcol + cos(ang) * rad, prow + sin(ang) * rad);
      aura += a * w;
      weightSum += w;
    }
  }
  aura /= weightSum;
  // Gentle gain so the soft blur still reaches usable opacity without a hard rim.
  aura = clamp(aura * 2.2, 0.0, 1.0);

  // Upward plume: ACCUMULATE body coverage from directly below with a height
  // fade. Summation (not max) builds a smooth vertical gradient that is strong
  // just above the body and trails off softly with height -- so the top is a
  // gradient by construction, never a translated copy of the silhouette. The
  // rising-noise field below then carves this gradient into wisps.
  float layerTime = uTime + uLayerSeed * 19.1;
  float plumeReach = radius * 3.2;
  float xWander = (noise(vec2(pcol * 0.06, layerTime * 0.3)) - 0.5) * radius * 0.9;
  float plume = 0.0;
  for (int step = 1; step <= 14; step++) {
    float t = float(step) / 14.0;
    float rowBelow = prow - plumeReach * t;
    float spread = radius * (0.25 + 0.7 * t);
    float a = max(
      sampleAlpha(pcol + xWander, rowBelow),
      max(
        sampleAlpha(pcol + xWander - spread, rowBelow),
        sampleAlpha(pcol + xWander + spread, rowBelow)
      )
    );
    plume += a * (1.0 - t);
  }
  plume = clamp(plume * 0.06, 0.0, 1.0);

  float coverage = max(max(aura, bodyAlpha), plume);

  if (coverage < 0.02) {
    discard;
  }

  // Rising-smoke field on the same pixel grid as the plume.
  vec2 sp = pix * 0.022;
  float n1 = fbm(sp + vec2(0.0, -layerTime * 2.4));
  float n2 = fbm(sp * 2.1 + vec2(layerTime * 0.7, -layerTime * 3.6));
  float flame = clamp(n1 * 0.7 + n2 * 0.5, 0.0, 1.0);

  // Hard pixel-art steps instead of smooth noise ramps.
  flame = floor(flame * 4.0) / 4.0;

  // Carve the static halo with the moving field so the cloud's SHAPE animates.
  // Letting this fall all the way to zero (no flat baseline) means the outer
  // boundary dissolves into wisps instead of revealing the aura's edge.
  float tendril = step(0.35, flame);

  // Concentrate the miasma on the upper body and let it fade to almost nothing
  // toward the legs/hem, so it reads as darkness rising and burning off the top.
  // vTexRow is 1 at the top, 0 at the bottom; the curve keeps the bottom clean.
  float lift = 1.35 * pow(clamp(vTexRow, 0.0, 1.0), 1.7);
  float crown = smoothstep(0.55, 0.95, vTexRow);

  // Glow that lives outside the silhouette. A soft (smoothstep) body mask keeps
  // the contact line from reading as a hard outline against the painted edge.
  float halo = coverage * (1.0 - smoothstep(0.25, 0.75, bodyAlpha));

  // The rising-noise `tendril` carves the (already soft-topped) coverage into
  // wisps, so the plume dissolves organically with no hard ceiling.
  float smoke = clamp(
    halo * tendril * lift * mix(1.15, 1.55, crown) * 1.4,
    0.0,
    1.0
  );
  // Posterize smoke opacity to a few discrete levels for pixel-art dithering.
  smoke = floor(smoke * 5.0) / 5.0;

  // --- MIASMA PALETTE (hardcoded; this is the one place to change its color) ---
  // The smoke/halo uses ONLY these colors plus the sprite's alpha for shape --
  // it never samples the sprite's RGB, so it is immune to texture compression.
  // `abyss` is the deep near-black; `coldGlow` is the cold, desaturated highlight
  // that matches the charcoal robe and icy-blue eyes.
  const vec3 abyss = vec3(0.001, 0.0012, 0.001);
  const vec3 coldGlow = vec3(0.07, 0.10, 0.14);
  // How strongly the robe's own dark mass is pulled toward `abyss`, anchoring the
  // silhouette to this intended deep black so it can't drift toward, e.g., the
  // greenish-grey of a lossily compressed sprite. 0 = use the sprite's RGB as-is.
  const float bodySink = 0.7;

  vec3 smokeColor = mix(abyss, coldGlow, floor(flame * 3.0) / 3.0 * halo);

  // Tint the body's own edges with creeping, flickering darkness too.
  float edge = (1.0 - smoothstep(0.2, 0.9, bodyAlpha)) * bodyAlpha;
  vec3 color = mix(tex.rgb, coldGlow, edge * flame * 0.6 * lift);

  // Sink the robe's dark tones toward the hardcoded abyss -- strongest on the
  // upper body (`lift`) and for already-dark pixels -- so the hood reads as deep
  // black while painted highlights (skull, glowing eyes) are preserved.
  float bodyLuma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  float darkMask = 1.0 - smoothstep(0.0, 0.32, bodyLuma);
  color = mix(color, abyss, clamp(darkMask * lift * bodySink, 0.0, 1.0));

  // Relight the lich's BODY with the shared baseline (skull/eyes stay emissive);
  // the smoke and halo below are intentionally left flat.
  if (uVolumetric > 0.5) {
    int brow = clamp(int(frow), 0, uTexSize.y - 1);
    vec2 grad = volLumaGradTexel(uTexture, uTexSize, int(vTexColumn), brow);
    color *= volumetricLight(grad, tex.rgb, uTime);
  }

  color = mix(color, smokeColor, smoke);

  if (uSmokeOnly > 0.5) {
    if (smoke < 0.02) {
      discard;
    }
    outColor = vec4(applyFog(smokeColor, vDepth), smoke * 0.82);
    return;
  }

  float outAlpha = clamp(max(bodyAlpha, smoke * 0.95), 0.0, 1.0);
  outColor = vec4(applyFog(applyHitFlash(color, uHitFlash), vDepth), outAlpha);
}
