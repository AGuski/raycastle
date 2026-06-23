// CONFIG reads navigator.userAgent at module load, which has no meaning during
// SSR, and the inspector renders to a <canvas> — so render this route on the
// client only.
export const ssr = false;
