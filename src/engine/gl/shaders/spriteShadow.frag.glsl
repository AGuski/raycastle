uniform vec2 uResolution;
uniform float uSpacing;
uniform sampler2D uTexture;
uniform ivec2 uTexSize;
uniform sampler2D uZBuffer;
uniform float uShadowAlpha;
uniform float uSampleFrac;
uniform float uBlurRadius;

flat in float vDepth;
flat in float vTexColumn;
in float vTexRow;

out vec4 outColor;

float sampleAlpha(int col, int row) {
  int c = clamp(col, 0, uTexSize.x - 1);
  int r = clamp(row, 0, uTexSize.y - 1);
  return texelFetch(uTexture, ivec2(c, r), 0).a;
}

float blurredAlpha(int texCol, int row) {
  float radius = clamp(uBlurRadius, 1.0, 10.0);
  float sum = 0.0;
  float weightSum = 0.0;

  for (int dy = -5; dy <= 5; dy++) {
    for (int dx = -10; dx <= 10; dx++) {
      vec2 offset = vec2(float(dx), float(dy));
      float dist = length(offset / vec2(radius * 1.6, radius * 0.75));
      if (dist > 1.0) {
        continue;
      }

      float weight = 1.0 - dist;
      weight *= weight;
      sum += sampleAlpha(texCol + dx, row + dy) * weight;
      weightSum += weight;
    }
  }

  return weightSum > 0.0 ? sum / weightSum : 0.0;
}

void main() {
  int col = int(clamp(floor(gl_FragCoord.x / uSpacing), 0.0, 65535.0));
  float zLimit = texelFetch(uZBuffer, ivec2(col, 0), 0).r;
  if (vDepth >= zLimit) {
    discard;
  }

  int texCol = int(vTexColumn);
  float sampleRows = max(uSampleFrac, 0.05) * float(uTexSize.y);
  int row = clamp(
    int((1.0 - vTexRow) * sampleRows),
    0,
    uTexSize.y - 1
  );

  float alpha = blurredAlpha(texCol, row);
  if (alpha < 0.02) {
    discard;
  }

  alpha *= uShadowAlpha;
  alpha *= smoothstep(0.0, 0.65, vTexRow);
  alpha *= mix(0.2, 1.0, applyFog(vec3(1.0), vDepth).r);

  outColor = vec4(0.0, 0.0, 0.0, alpha);
}
