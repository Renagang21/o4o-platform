/**
 * `/login` 진입 시 로그인 후 돌아갈 경로를 고른다.
 *
 *   우선순위: `location.state.from` → `?returnUrl=` → `?redirect=`(레거시 호출부 호환).
 *   같은 origin 의 상대 경로만 허용한다 — `//host` · `/\host` · 절대 URL 은 버린다.
 *
 * 펀딩(유통참여형 펀딩) 화면들이 `?redirect=` 로 보냈지만 로그인 리다이렉트가 `returnUrl` 만
 * 읽어 로그인 후 원래 화면으로 돌아가지 못했다(CHECK-O4O-URL-FIRST-CENSUS-V1 §19-7).
 */
export function isSafeReturnPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
  );
}

export function resolveLoginReturnPath(state: unknown, search: string): string | undefined {
  const params = new URLSearchParams(search);
  const candidates = [
    (state as { from?: unknown } | null | undefined)?.from,
    params.get('returnUrl'),
    params.get('redirect'),
  ];
  for (const c of candidates) {
    if (c == null || c === '') continue;
    return isSafeReturnPath(c) ? c : undefined;
  }
  return undefined;
}
