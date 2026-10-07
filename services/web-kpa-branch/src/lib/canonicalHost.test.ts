/**
 * WO-O4O-KPA-BRANCH-SERVICE-CATALOG-AND-HANDOFF-ALIGNMENT-V1 — 옛 분회 경로 → kpa.neture.co.kr
 */
import { describe, expect, it } from 'vitest';
import { legacyBranchRedirectUrl } from './canonicalHost';

describe('legacyBranchRedirectUrl', () => {
  it.each([
    ['kpa-society.co.kr', '/kpa', '', '', 'https://kpa.neture.co.kr/'],
    ['kpa-society.co.kr', '/kpa/', '', '', 'https://kpa.neture.co.kr/'],
    ['kpa-society.co.kr', '/kpa/o4o-pilot', '', '', 'https://kpa.neture.co.kr/o4o-pilot'],
    ['www.kpa-society.co.kr', '/kpa/o4o-pilot/mypage/fees', '?y=2026', '#top', 'https://kpa.neture.co.kr/o4o-pilot/mypage/fees?y=2026#top'],
    ['kpa-society.co.kr', '/kpa/login', '', '', 'https://kpa.neture.co.kr/login'],
    ['kpa-society.co.kr', '/kpa/handoff', '?token=t&returnTo=%2Fseoul', '', 'https://kpa.neture.co.kr/handoff?token=t&returnTo=%2Fseoul'],
    ['kpa-society.co.kr', '/kpa//evil.example/x', '', '', 'https://kpa.neture.co.kr//evil.example/x'], // host 는 바뀌지 않는다
  ])('%s%s%s → %s', (host, path, search, hash, expected) => {
    expect(legacyBranchRedirectUrl(host, path, search, hash)).toBe(expected);
  });

  it.each([
    ['kpa.neture.co.kr', '/o4o-pilot'], // canonical
    ['kpa.neture.co.kr', '/kpa/o4o-pilot'], // canonical 호스트의 /kpa 는 basename 이 흡수한다
    ['kpa-society.co.kr', '/'], // 호스트 루트 = kpa-society 앱(이 번들이 서빙하지 않는다)
    ['kpa-society.co.kr', '/kpanews'], // prefix 경계
    ['branch.example.or.kr', '/kpa/notice'], // 분회 자체 도메인의 일반 경로
    ['localhost', '/kpa/o4o-pilot'],
    ['kpa-branch-web-xyz-du.a.run.app', '/kpa/o4o-pilot'],
  ])('%s%s → 이동하지 않는다', (host, path) => {
    expect(legacyBranchRedirectUrl(host, path)).toBeNull();
  });
});
