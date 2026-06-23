precision highp float;

precision highp float;

uniform sampler2D uTexture;

in vec2 vTexCoord;

out vec4 outColor;

void main() {
  vec4 tex = texture(uTexture, vTexCoord);
  if (tex.a < 0.05) {
    discard;
  }
  outColor = tex;
}
