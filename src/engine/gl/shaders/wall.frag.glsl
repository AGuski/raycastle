uniform vec2 uResolution;
uniform sampler2D uTexture;
uniform ivec2 uTexSize;
uniform int uSolid;
uniform vec3 uSolidColor;

flat in float vDepth;
flat in float vTexColumn;
in float vTexRow;

out vec4 outColor;

void main() {
  vec3 color;
  if (uSolid != 0) {
    color = uSolidColor;
  } else {
    int col = int(vTexColumn);
    int row = clamp(
      int(floor(vTexRow * float(uTexSize.y))),
      0,
      uTexSize.y - 1
    );
    color = texelFetch(uTexture, ivec2(col, row), 0).rgb;
  }
  outColor = vec4(applyFog(color, vDepth), 1.0);
}
