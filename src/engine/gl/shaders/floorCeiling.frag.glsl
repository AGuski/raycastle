uniform vec2 uResolution;
uniform float uColumns;
uniform vec2 uPlayerPos;
uniform float uDir;
uniform float uFocal;
uniform float uMaxZ;
uniform sampler2D uFloorTex;
uniform sampler2D uCeilingTex;
uniform sampler2D uZBuffer;

out vec4 outColor;

void main() {
  vec2 frag = gl_FragCoord.xy;
  float halfH = uResolution.y * 0.5;

  float nx = frag.x / uResolution.x;
  float camX = nx - 0.5;
  float angle = atan(camX, uFocal);
  float cosA = cos(angle);
  if (abs(cosA) < 0.001) {
    discard;
  }

  float yTop = uResolution.y - frag.y;
  bool isFloor = yTop > halfH;

  float z = isFloor
    ? halfH / (yTop - halfH)
    : halfH / (halfH - yTop);

  int col = int(clamp(nx * uColumns, 0.0, uColumns - 1.0));
  float zLimit = texelFetch(uZBuffer, ivec2(col, 0), 0).r;
  if (z > uMaxZ || z >= zLimit) {
    discard;
  }

  float invCos = 1.0 / cosA;
  vec2 world = uPlayerPos
    + z * vec2(cos(uDir + angle), sin(uDir + angle)) * invCos;
  vec2 uv = fract(world);

  vec3 color = isFloor
    ? texture(uFloorTex, uv).rgb
    : texture(uCeilingTex, uv).rgb;

  outColor = vec4(applyFog(color, z), 1.0);
}
