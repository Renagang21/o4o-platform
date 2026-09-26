/**
 * Handoff exchange 는 쿠키를 받지 않는다 — 정적 계약
 *   CHECK-O4O-URL-FIRST-CENSUS-V1 §19-1 (관리자 세션 사용자 교체)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 배경
 *
 *   exchange 응답은 토큰을 body 로 돌려주고, 동시에 `.neture.co.kr` 도메인 쿠키도 내려준다.
 *   HandoffPage 가 `credentials: 'include'` 로 호출하면 브라우저가 그 쿠키를 저장하고,
 *   쿠키만으로 인증하는 admin-dashboard(admin.neture.co.kr) 가 넘겨받은 사용자로 바뀐다.
 *
 *   localStorage 전략 서비스는 세션을 body 토큰으로만 복원하므로 쿠키가 필요 없다
 *   (2026-03-17 adb23b828 에서 제거됐다가 2026-09-14 2464f2494 에서 재유입).
 *
 * 이 spec 은 배포되는 HandoffPage 가 exchange 를 credentials 없이 호출하는 것을 고정한다.
 * web-account 는 쿠키 전략 앱(미배포 · 카탈로그 미등록)이라 대상에서 뺀다.
 *
 * DB · 네트워크 0 — 텍스트 검사만 한다.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO = path.resolve(__dirname, '..', '..', '..', '..');

const HANDOFF_PAGES = [
  'services/web-neture/src/pages/HandoffPage.tsx',
  'services/web-store/src/pages/HandoffPage.tsx',
  'services/web-lecture/src/pages/HandoffPage.tsx',
  'services/web-pharmacy-hub/src/pages/HandoffPage.tsx',
  'services/web-k-cosmetics/src/pages/HandoffPage.tsx',
  'services/web-kpa-branch/src/pages/HandoffPage.tsx',
  'services/web-kpa-society/src/pages/HandoffPage.tsx',
];

/** 주석은 위반이 아니다 — 경위를 적은 문장까지 잡으면 가드가 무력화된다. */
const codeOnly = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

describe('HandoffPage — exchange 는 credentials 없이 호출한다', () => {
  it.each(HANDOFF_PAGES)('%s', (rel) => {
    const file = path.join(REPO, rel);
    expect(fs.existsSync(file)).toBe(true);
    const src = codeOnly(fs.readFileSync(file, 'utf-8'));

    expect(src).toContain('/auth/handoff/exchange');
    expect(src).not.toMatch(/credentials\s*:\s*['"]include['"]/);
  });
});
