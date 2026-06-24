uniform float uDeathDissolve;

vec3 applyDeathDissolve(vec3 color, float alpha, float progress) {
  if (progress <= 0.0) {
    return color;
  }

  vec2 seed = gl_FragCoord.xy * 0.07;
  float noise = fract(sin(dot(seed, vec2(127.1, 311.7))) * 43758.5453);
  float threshold = progress * 1.15;
  if (noise < threshold) {
    discard;
  }

  float ember = smoothstep(0.15, 0.85, progress);
  vec3 emberColor = mix(color, vec3(1.0, 0.28, 0.08), ember * 0.85);
  emberColor *= 1.0 + ember * 0.35;
  return emberColor;
}
