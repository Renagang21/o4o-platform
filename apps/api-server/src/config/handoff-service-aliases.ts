/** A finite transport alias, not a service identity, membership, or caller-selected origin. */
export function getHandoffServiceAlias(key: unknown) {
  return key === 'carepharm' ? {
    key: 'carepharm', sessionServiceKey: 'neture', origin: 'https://carepharm.neture.co.kr',
  } as const : undefined;
}

/** Restrict the alias to the screens it actually serves. No arbitrary redirect/query contract. */
export function isCarePharmHandoffPath(path: string): boolean {
  // Reject ASCII controls rather than allowing URL normalization to discard them.
  // eslint-disable-next-line no-control-regex
  if (path.includes('#') || path.includes('\\') || /[\u0000-\u001f\u007f]/.test(path)) return false;
  const url = new URL(path, 'https://carepharm.neture.co.kr');
  const pathname = path.split('?')[0];
  // Reject URL normalization, encoded separators, and lookalike business namespaces.
  if (url.origin !== 'https://carepharm.neture.co.kr' || url.pathname !== pathname) return false;
  const memberPage = /^\/(?:my\/participation|materials|tools)?$/.test(pathname);
  const forumPage = /^\/communities\/business(?:%3[Aa]|:)carepharm\/forum(?:\/(?:posts|write|my-posts|request|owned)|\/post\/[A-Za-z0-9_-]{1,160}|\/owned\/[A-Fa-f0-9-]{36}\/members)?$/.test(pathname);
  if (!memberPage && !forumPage) return false;
  const keys = [...url.searchParams.keys()];
  if (keys.length !== new Set(keys).size) return false;
  return keys.every(key => {
    const value = url.searchParams.get(key)!;
    if (key === 'store' || key === 'category' || key === 'content') return /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);
    if (key === 'page') return /^[1-9]\d{0,5}$/.test(value);
    return key === 'board' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
  });
}
