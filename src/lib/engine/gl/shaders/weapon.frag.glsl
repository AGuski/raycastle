precision highp float;

uniform sampler2D uTexture;
uniform vec2 uTexSize;
uniform float uVolumetric; // >0.5 enables the baseline relight
uniform float uTime;

in vec2 vTexCoord;

out vec4 outColor;

float wpnLuma(vec2 uv) {
  return dot(texture(uTexture, uv).rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec4 tex = texture(uTexture, vTexCoord);
  if (tex.a < 0.05) {
    discard;
  }

  vec3 color = tex.rgb;
  if (uVolumetric > 0.5) {
    // UV-space gradient (the weapon pass samples in normalized coords).
    vec2 px = vec2(2.0) / uTexSize;
    vec2 grad = vec2(
      wpnLuma(vTexCoord + vec2(px.x, 0.0)) - wpnLuma(vTexCoord - vec2(px.x, 0.0)),
      wpnLuma(vTexCoord + vec2(0.0, px.y)) - wpnLuma(vTexCoord - vec2(0.0, px.y))
    );
    color *= volumetricLight(grad, tex.rgb, uTime);
  }

  outColor = vec4(color, tex.a);
}
