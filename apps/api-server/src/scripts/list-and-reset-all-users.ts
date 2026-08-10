/**
 * List All Users and Reset Their Passwords — ⛔ DISABLED
 *
 * WO-O4O-PASSWORD-RESET-SCRIPT-IDENTITY-V2-ALIGNMENT-V1
 *
 * Deprecated under Identity V2.
 * Do NOT re-enable without a dedicated policy decision and a rollback plan.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 폐기하는가
 *   Identity V2 는 로그인 자격을 2계층으로 나눈다.
 *     L1 `users.password`                     — serviceKey 없는 로그인
 *     L2 `service_credentials.password_hash`  — serviceKey 있는 로그인(웹 로그인 폼 전부)
 *   `auth-login.service.ts` 는 credential 이 있으면 **`users.password` 를 보지 않는다**
 *   (`targetHash = credentialHash ?? user.password`).
 *
 *   이 스크립트는 L1 만 일괄 변경했으므로 "전체 초기화"라는 이름과 실제 동작이 어긋난다.
 *   실측(2026-08-09): credential 40건 중 18건이 L1 과 상이 → 그 계정들은 서비스 로그인이
 *   **그대로 남는다.** 운영자는 "전부 초기화됐다"고 오인하게 된다.
 *
 * 재활성화 금지 사유 (원본 구현이 갖고 있던 추가 위험)
 *   1. 전 계정 L1 을 **같은 값**으로 만든다.
 *   2. 전 사용자 이메일과 **평문 비밀번호를 로그로 출력**했다.
 *   3. 대상 필터가 없어 되돌릴 수 없다(이전 해시 보존 없음).
 *
 * 대체 경로
 *   L1 단건 복구   : 플랫폼 관리자 비밀번호 재설정
 *                    `PATCH /api/v1/admin/platform-accounts/:id/password`
 *                    (적용 범위 `unaffectedServiceKeys` 안내 포함)
 *   L2 서비스 자격 : 각 서비스의 비밀번호 찾기(`/forgot-password`) 또는
 *                    운영자 서비스별 비밀번호 변경(serviceKey·Membership 범위 검증)
 *   전역 일괄 초기화는 **지원하지 않는다.** 필요가 확인되면 별도 WO 로 설계한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 구현 노트
 *   원본 구현은 git 이력에 남아 있다(본 파일의 직전 리비전).
 *   여기에 dead code 로 남기지 않는 이유:
 *     - 평문 비밀번호 출력 코드가 그대로 남으면 guard 제거 시 즉시 재현된다.
 *     - `database/connection.js` 정적 import 가 **안내 출력보다 먼저** 평가되어,
 *       엔티티 로딩 오류가 나면 폐기 안내가 보이지 않는다(실측 확인).
 *   그래서 DB 를 import 하지 않는 안내 전용 stub 으로 둔다.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 비활성화 안내. CLI·프로그램 호출 양쪽에서 같은 문구를 쓴다. */
const DISABLED_MESSAGE = [
  'This script is disabled under Identity V2.',
  'It reset only users.password (L1) and did not reset service_credentials (L2).',
  'Accounts with service credentials would keep their service login password unchanged,',
  'so a "global reset" is misleading and unsafe.',
  '',
  'Use instead:',
  '  - L1 (platform) single-account reset : PATCH /api/v1/admin/platform-accounts/:id/password',
  '  - L2 (service) credential reset      : per-service password reset (/forgot-password)',
  '                                         or operator service-scoped password change',
  '',
  'Do not perform a global password reset.',
].join('\n');

/**
 * ⛔ 항상 throw 한다. DB 연결·조회·UPDATE 를 수행하지 않는다.
 *
 * 프로그램 호출(import)도 CLI 와 동일하게 막기 위해 함수 진입부에서 차단한다.
 */
async function listAndResetAllUsers(_options: { password?: string } = {}): Promise<never> {
  throw new Error(
    `list-and-reset-all-users is disabled under Identity V2 (global password reset is not supported).\n\n${DISABLED_MESSAGE}`,
  );
}

/**
 * 직접 실행 여부 판정.
 *
 * 기존 관례인 `import.meta.url === \`file://${process.argv[1]}\`` 는 **Windows 에서 항상 false** 다
 * (`process.argv[1]` 은 `C:\...` 역슬래시, `import.meta.url` 은 `file:///C:/...`).
 * 폐기 안내가 출력되는 것이 이 파일의 유일한 기능이므로 경로를 정규화해 비교한다.
 */
function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

// CLI 진입 — DB 를 건드리지 않고 안내만 출력하고 종료한다.
if (isDirectRun()) {
  console.error(`\n⛔ list-and-reset-all-users is DISABLED under Identity V2\n\n${DISABLED_MESSAGE}\n`);
  process.exit(1);
}

export { listAndResetAllUsers };
