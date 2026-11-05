// A verified API response anchors the signage clock; elapsed time is monotonic
// so changing the PC clock does not extend a cached required video's window.
let anchor: { server: number; elapsed: number } | null = null;
export function calibrateSignageClock(value?: string): void {
  if (!value) return;
  const server = Date.parse(value);
  if (Number.isFinite(server)) anchor = { server, elapsed: performance.now() };
}
export function signageNow(): number {
  return anchor ? anchor.server + performance.now() - anchor.elapsed : Date.now();
}
