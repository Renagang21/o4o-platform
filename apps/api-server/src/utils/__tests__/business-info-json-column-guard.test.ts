/**
 * WO-O4O-BUSINESSINFO-JSON-COLUMN-CONCAT-RUNTIME-FAILURE-FIX-V1
 *
 * `users."businessInfo"` 는 PostgreSQL **`json`** 컬럼이다 (`jsonb` 아님 — 실측 2026-08-12).
 * `json` 과 `jsonb` 사이 cast 는 assignment('a') 뿐이라 `COALESCE` 처럼 **implicit** 해석이
 * 필요한 자리에 섞어 쓰면 **런타임에 실패**한다.
 *
 *   ERROR: COALESCE could not convert type jsonb to json
 *
 * 이 오류는 컴파일·테스트로 안 잡히고 프로덕션에서만 터졌다 (Cloud Run 로그 2026-07-23).
 * 게다가 일부 경로는 catch 로 삼켜 200 을 반환했기 때문에 사용자는 저장된 줄 알았다.
 *
 * 이 테스트는 **소스 전체를 스캔해** 그 패턴이 다시 들어오는 것을 막는다.
 * 부분 갱신이 필요하면 `utils/business-info-write.ts` 를 쓴다.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC_ROOT = join(__dirname, '..', '..');

/** migration 은 과거 시점 기록이며 자체적으로 명시 캐스트를 쓴다 — 스캔 대상 아님. */
const SKIP_DIRS = new Set(['node_modules', 'migrations', '__tests__', 'dist']);

function collectTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) collectTsFiles(full, out);
    } else if (entry.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * 위험 패턴: businessInfo 를 jsonb 로 취급하되 **명시 캐스트 없이** COALESCE 에 넣는 경우.
 * 안전한 형태는 `"businessInfo"::jsonb` 처럼 먼저 캐스트한 것이다.
 */
const UNSAFE = /COALESCE\(\s*"businessInfo"\s*,/i;

/**
 * 주석은 스캔 대상이 아니다 — 이 WO 의 교정 주석들이 금지 패턴을 **설명하기 위해** 인용하고 있고,
 * 그것까지 위반으로 잡으면 가드가 자기 문서를 막는다. 실행되는 코드만 본다.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

describe('users."businessInfo" 는 json 컬럼이다 — jsonb 표현식 직접 적용 금지', () => {
  const files = collectTsFiles(SRC_ROOT);

  it('스캔 대상 소스가 실제로 수집된다 (가드가 빈 집합에 통과하지 않도록)', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('COALESCE("businessInfo", ...) 패턴이 런타임 코드에 없다', () => {
    const offenders = files
      .filter((f) => UNSAFE.test(stripComments(readFileSync(f, 'utf8'))))
      .map((f) => f.slice(SRC_ROOT.length + 1).replace(/\\/g, '/'));

    expect(offenders).toEqual([]);
  });

  it('businessInfo 를 갱신하는 SQL 은 명시 캐스트(::jsonb 읽기 / ::json 복귀)를 쓴다', () => {
    // 정본 생성기 자신은 제외한다 — 컬럼명을 상수로 조립하므로 리터럴 스캔에 걸리지 않고,
    // 표현식 자체는 business-info-write.test.ts 가 직접 고정한다.
    const CANONICAL_BUILDER = 'utils/business-info-write.ts';

    const writers = files.filter((f) => {
      if (f.slice(SRC_ROOT.length + 1).replace(/\\/g, '/') === CANONICAL_BUILDER) return false;
      const src = stripComments(readFileSync(f, 'utf8'));
      return /UPDATE\s+users[\s\S]{0,200}?SET[\s\S]{0,200}?"businessInfo"\s*=/i.test(src);
    });

    // 인라인 SQL 로 businessInfo 를 직접 쓰는 파일이 남아 있다면,
    // 반드시 `"businessInfo"::jsonb` 읽기 캐스트를 동반해야 한다.
    for (const f of writers) {
      const src = stripComments(readFileSync(f, 'utf8'));
      const rel = f.slice(SRC_ROOT.length + 1).replace(/\\/g, '/');
      // 파라미터 통째 대입(`= $1::jsonb` / `= $1`)은 부분 갱신이 아니므로 이 가드의 대상이 아니다.
      const readsColumnAsJsonb = /"businessInfo"::jsonb/.test(src);
      const assignsWholeValue = /"businessInfo"\s*=\s*\$\d+(::jsonb|::json)?/.test(src);
      expect(`${rel}: ${readsColumnAsJsonb || assignsWholeValue}`).toBe(`${rel}: true`);
    }
  });
});
