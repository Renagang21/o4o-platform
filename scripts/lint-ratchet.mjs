#!/usr/bin/env node
/**
 * WO-O4O-CI-BLOCKING-GATE-FINALIZATION-V1 — ESLint 회귀 차단 ratchet
 *
 * 배경:
 *   CI 의 lint 단계는 `continue-on-error: true` 였다. 즉 ESLint 오류가 몇 건이든,
 *   심지어 새 오류가 계속 늘어나도 CI 는 항상 GREEN 이었다.
 *
 * 이 스크립트가 하는 일:
 *   `pnpm run lint` 과 **동일한 ESLint 설정·동일한 검사 범위(루트에서 `eslint .`)** 로
 *   저장소 전체를 검사하고, 오류 수가 baseline 을 넘으면 실패한다.
 *   출력만 JSON 포매터로 받는다 — 사람이 읽는 요약줄을 regex 로 파싱하는 것보다 신뢰할 수 있다.
 *
 * 하지 않는 일 (의도적):
 *   - 검사 범위 축소 없음
 *   - ESLint rule 완화 없음
 *   - eslint-disable 대량 추가 없음
 *   - baseline 숫자를 맞추기 위한 코드 수정 없음
 *
 * 한계 (명시):
 *   이것은 **순증 차단**이지 오류 1:1 동일성 판정이 아니다.
 *   한 커밋에서 1건 고치고 1건 추가하면 통과한다. 그럼에도 "무한정 늘어나도 GREEN"
 *   이던 이전 상태보다는 실질적인 게이트다.
 *
 * 제거 조건:
 *   ERROR_BASELINE 이 0 이 되면 이 스크립트를 지우고 CI 단계를 `pnpm run lint` 단독
 *   실행으로 되돌린다.
 *
 * baseline 갱신 규칙:
 *   **내리는 방향으로만** 갱신한다. 오류를 실제로 고친 뒤 이 숫자를 낮춘다.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** 현재 남아 있는 기존 ESLint 오류 수. 내리는 방향으로만 갱신할 것. */
// WO-O4O-SIGNAGE-LEGACY-STACK-SIMPLIFICATION-AND-TABLET-AUTHORING-CLOSURE-V1:
//   main(65) 과 본 브랜치(63) 가 같은 줄을 각각 낮춰 merge 충돌 → 병합 트리에서 실측 재산출.
//   실측 64 (44 파일, 전부 본 작업과 무관한 기존 오류). 추정값을 쓰지 않는다.
const ERROR_BASELINE = 55;

const baseline = Number(process.env.LINT_ERROR_BASELINE ?? ERROR_BASELINE);
const reportPath = join(tmpdir(), `eslint-ratchet-${process.pid}.json`);

// `pnpm run lint` (scripts/dev.mjs) 과 동일한 명령: 루트에서 `eslint .`
// Windows 에서 npx 는 .cmd 라 shell 경유가 필요하다(Node 의 spawn EINVAL 회피).
// CI(Linux)는 shell 없이 실행하므로 인용이 아예 필요 없다.
const isWindows = process.platform === 'win32';
const eslint = spawnSync(
  'npx',
  ['eslint', '.', '-f', 'json', '-o', isWindows ? `"${reportPath}"` : reportPath],
  { stdio: 'inherit', shell: isWindows },
);

// exit 1 = lint 오류 존재(정상 경로). 2 이상 = ESLint 실행 자체 실패.
if (eslint.status === null || eslint.status > 1) {
  console.error(`::error::ESLint 실행이 실패했습니다 (status=${eslint.status}, error=${eslint.error})`);
  process.exit(1);
}

let results;
try {
  results = JSON.parse(readFileSync(reportPath, 'utf8'));
} catch (err) {
  console.error(`::error::ESLint JSON 리포트를 읽지 못했습니다: ${err.message}`);
  process.exit(1);
} finally {
  rmSync(reportPath, { force: true });
}

const errors = results.reduce((n, r) => n + r.errorCount, 0);
const warnings = results.reduce((n, r) => n + r.warningCount, 0);

console.log(`ESLint: ${errors} errors, ${warnings} warnings (error baseline ${baseline})`);

if (errors > baseline) {
  console.log('');
  console.log('신규 ESLint 오류:');
  for (const r of results) {
    for (const m of r.messages) {
      if (m.severity !== 2) continue;
      console.log(`  ${r.filePath}:${m.line}:${m.column}  ${m.ruleId ?? 'fatal'}  ${m.message}`);
    }
  }
  console.log('');
  console.log(`::error::ESLint 오류가 baseline 을 초과했습니다 (${errors} > ${baseline}). 신규 오류를 수정하세요.`);
  process.exit(1);
}

if (errors < baseline) {
  console.log(
    `::notice::ESLint 오류가 ${baseline} → ${errors} 로 줄었습니다. ` +
      `scripts/lint-ratchet.mjs 의 ERROR_BASELINE 을 ${errors} 로 낮춰 주세요.`,
  );
}

process.exit(0);
