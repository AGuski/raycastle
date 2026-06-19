in vec2 aPosition;
in vec2 aTexCoord;
in float aDepth;

uniform vec2 uResolution;

out vec2 vTexCoord;

void main() {
  vTexCoord = aTexCoord;
  vec2 clip = vec2(
    aPosition.x / uResolution.x * 2.0 - 1.0,
    1.0 - aPosition.y / uResolution.y * 2.0
  );
  gl_Position = vec4(clip, aDepth, 1.0);
}
