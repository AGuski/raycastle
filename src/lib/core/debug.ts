let debugEnabled = false;

export function isDebugEnabled(): boolean {
  return debugEnabled;
}

export function toggleDebug(): boolean {
  debugEnabled = !debugEnabled;
  return debugEnabled;
}
