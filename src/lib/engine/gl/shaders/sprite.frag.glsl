uniform vec2 uResolution;
uniform float uSpacing;
uniform sampler2D uTexture;
uniform ivec2 uTexSize;
flat in float vDepth;
flat in float vTexColumn;
uniform sampler2D uZBuffer;
uniform float uTime;
uniform float uVolumetric; // >0.5 applies the baseline volumetric relight
in float vTexRow;

out vec4 outColor;

void main() {
  int col = int(clamp(floor(gl_FragCoord.x / uSpacing), 0.0, 65535.0));
  float zLimit = texelFetch(uZBuffer, ivec2(col, 0), 0).r;
  if (vDepth >= zLimit) {
    discard;
  }

  int texCol = int(vTexColumn);
  int row = clamp(
    int(floor(vTexRow * float(uTexSize.y))),
    0,
    uTexSize.y - 1
  );
  vec4 tex = texelFetch(uTexture, ivec2(texCol, row), 0);
  if (tex.a < 0.05) {
    discard;
  }

  vec3 color = tex.rgb;
  if (uVolumetric > 0.5) {
    vec2 grad = volLumaGradTexel(uTexture, uTexSize, texCol, row);
    color *= volumetricLight(grad, tex.rgb, uTime);
  }

  outColor = vec4(applyFog(applyHitFlash(color, uHitFlash), vDepth), tex.a);
}
