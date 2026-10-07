/**
 * 분회 공용 호스트 kpa.neture.co.kr — 정적 계약 (CHECK-O4O-URL-FIRST-CENSUS-V1 §21-10)
 *
 * - 분회 앱은 `kpa.neture.co.kr` 을 공용 호스트로 판정해야 한다(아니면 자체 도메인으로 오판 → "분회 없음").
 * - 옛 공용 경로 `kpa-society.co.kr/kpa/{slug}` 판정과 `/kpa` asset base 는 그대로 유지한다.
 * DB · 네트워크 0 — 텍스트 검사만 한다.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, rel), 'utf-8');

describe('kpa-branch 공용 호스트', () => {
  const tenant = read('services/web-kpa-branch/src/lib/tenant.tsx');

  it('kpa.neture.co.kr 이 공용 호스트 목록에 있다', () => {
    const block = tenant.slice(tenant.indexOf('const PLATFORM_HOSTS'), tenant.indexOf('];', tenant.indexOf('const PLATFORM_HOSTS')));
    expect(block).toContain("'kpa.neture.co.kr'");
    expect(block).toContain("'kpa-society.co.kr'");
    expect(block).toContain("'www.kpa-society.co.kr'");
  });

  it('옛 `/kpa` prefix 와 asset base 를 유지한다', () => {
    expect(tenant).toContain("export const PUBLIC_BASE_PATH = '/kpa';");
    expect(read('services/web-kpa-branch/vite.config.ts')).toContain("base: '/kpa/'");
  });
});
