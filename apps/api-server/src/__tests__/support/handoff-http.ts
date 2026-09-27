/**
 * handoff 컨트롤러용 Express req/res 대역 (테스트 support · 테스트 파일이 아니다)
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * handoff spec 세 개가 같은 `mockReq` / `mockRes` 를 각자 갖고 있었다. 한쪽만 고치면 세 spec 의
 * 전제가 조용히 달라지고(실제로 `headers` 누락으로 두 spec 이 동시에 깨졌다) 저장소 전체 중복
 * 지표에도 그대로 잡힌다.
 *
 * `jest.mock` 팩토리는 hoisting 제약이 있어 옮기지 않았다 — 여기 있는 것은 순수 헬퍼뿐이다.
 */

/**
 * 실제 Express req 가 언제나 갖는 것(`headers` · `cookies`)을 포함한다.
 * 빠뜨리면 토큰 추출이 터진다 — handoff 발급이 access token 의 세션 귀속을 읽는다(§8).
 */
export function mockHandoffReq(
  body: Record<string, unknown>,
  origin?: string,
  opts: { user?: unknown; accessToken?: string } = {},
): any {
  return {
    body,
    user: opts.user,
    headers: opts.accessToken ? { authorization: `Bearer ${opts.accessToken}` } : {},
    cookies: {},
    get: (h: string) => (h.toLowerCase() === 'origin' ? origin : undefined),
  };
}

/**
 * 쿠키를 내리는 **모든** 경로를 기록한다 — exchange 는 어떤 것도 호출하지 않아야 한다
 * (URL-FIRST-CENSUS §19-1 · §21-2: body 토큰만, Set-Cookie 0).
 */
export function mockHandoffRes(): any {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (c: number) => {
    res.statusCode = c;
    return res;
  };
  res.json = (b: unknown) => {
    res.body = b;
    return res;
  };
  res.cookie = jest.fn(() => res);
  res.setHeader = jest.fn(() => res);
  res.append = jest.fn(() => res);
  return res;
}
