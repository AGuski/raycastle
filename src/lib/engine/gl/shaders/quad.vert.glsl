in vec2 aPosition;
in vec2 aTexCoord;
in float aDepth;
flat out float vDepth;
flat out float vTexColumn;

uniform vec2 uResolution;

out float vTexRow;

void main() {
  vTexColumn = aTexCoord.x;
  vTexRow = aTexCoord.y;
  vDepth = aDepth;
  vec2 clip = vec2(
    aPosition.x / uResolution.x * 2.0 - 1.0,
    1.0 - aPosition.y / uResolution.y * 2.0
  );
  gl_Position = vec4(clip, 0.0, 1.0);
}
