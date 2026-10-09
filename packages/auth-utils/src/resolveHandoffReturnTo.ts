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
