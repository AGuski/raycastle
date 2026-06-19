precision highp float;

uniform vec2 uResolution;

out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 center = uv - 0.5;
  float dist = length(center);
  float vignette = smoothstep(0.85, 0.35, dist);
  outColor = vec4(0.0, 0.0, 0.0, (1.0 - vignette) * 0.35);
}
