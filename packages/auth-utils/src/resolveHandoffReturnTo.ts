/** Normalize an internal handoff destination without permitting external navigation. */
export function resolveHandoffReturnTo(raw: string | null, origin: string): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  if (Array.from(raw).some((char) => {
    const point = char.codePointAt(0)!;
    return point < 32 || point === 127 || char === '\\';
  })) return '/';
  const target = new URL(raw, origin);
  return target.origin === origin ? `${target.pathname}${target.search}${target.hash}` : '/';
}

/** Build the reload URL with a fixed origin, checking the service base as well. */
export function buildHandoffDestination(path: string, origin: string, basename = ''): string {
  const target = new URL(`${basename}${path}`, origin);
  if (target.origin !== origin) throw new Error('Invalid handoff destination');
  return `${origin}${target.pathname}${target.search}${target.hash}`;
}
