precision highp float;

uniform vec2 uResolution;
uniform float uHurtVignette;

out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 center = uv - 0.5;
  float dist = length(center);
  float vignette = smoothstep(0.85, 0.35, dist);
  float darkAlpha = (1.0 - vignette) * 0.35;

  float hurt = clamp(uHurtVignette, 0.0, 1.0);
  float hurtEdge = smoothstep(0.25, 0.95, dist);
  vec3 hurtColor = vec3(0.55, 0.02, 0.01);
  float hurtAlpha = hurt * hurtEdge * 0.72;

  vec3 color = mix(vec3(0.0), hurtColor, hurtAlpha / max(darkAlpha + hurtAlpha, 0.001));
  float alpha = darkAlpha + hurtAlpha;

  outColor = vec4(color, alpha);
}
