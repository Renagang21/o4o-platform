/**
 * O4O Core 계약 경로(B 등급) 단일 목록 — WO-O4O-CORE-OWNERSHIP-AND-CHANGE-BOUNDARY-V1.
 *
 * 정본 설명: docs/baseline/O4O-CORE-REGISTRY-V1.md (등급 A/B/C · 소유 · 변경 절차).
 * 이 목록을 쓰는 곳:
 *   - scripts/ci/pr-overlap.mjs — 바뀐 파일이 여기에 걸리면 PR 에 `core-change` 라벨을 단다(병합 gate 아님).
 *   - .github/CODEOWNERS — 각 패턴이 같은 문자열로 있어야 한다(scripts/ci/__tests__/core-paths.test.mjs 가 대조).
 *
 * 패턴 문법은 CODEOWNERS 와 같게 제한한다(둘을 같은 문자열로 유지하기 위해).
 *   - `/` 로 시작하는 저장소 루트 기준 경로만 쓴다.
 *   - `/` 로 끝나면 그 디렉터리 아래 전부, 아니면 그 파일 하나.
 *   - glob(`*`)은 쓰지 않는다.
 * 새 경로는 실제로 존재하는 경로만 넣는다(테스트가 존재를 확인한다).
 */

/** @type {{ area: string, path: string }[]} */
export const CORE_PATHS = [
  // identity · authorization · membership (F9 · F10 · F11)
  { area: 'identity', path: '/apps/api-server/src/modules/auth/' },
  { area: 'identity', path: '/apps/api-server/src/common/middleware/auth/' },
  { area: 'identity', path: '/apps/api-server/src/common/middleware/auth.middleware.ts' },
  { area: 'identity', path: '/apps/api-server/src/common/middleware/membership-guard.middleware.ts' },
  { area: 'identity', path: '/apps/api-server/src/middleware/service-membership.middleware.ts' },
  { area: 'identity', path: '/apps/api-server/src/modules/policy-acceptance/' },
  { area: 'identity', path: '/apps/api-server/src/modules/service-legal/' },
  { area: 'identity', path: '/apps/api-server/src/entities/LinkedAccount.ts' },
  { area: 'identity', path: '/apps/api-server/src/controllers/admin/AdminUserController.ts' },
  { area: 'identity', path: '/apps/api-server/src/controllers/operator/MembershipConsoleController.ts' },
  { area: 'identity', path: '/packages/security-core/' },
  { area: 'identity', path: '/packages/auth-utils/' },
  { area: 'identity', path: '/packages/auth-client/' },
  { area: 'identity', path: '/packages/types/src/auth.ts' },
  // organization · store identity
  { area: 'organization', path: '/packages/organization-core/' },
  { area: 'organization', path: '/packages/platform-core/' },
  // commerce contract (CLAUDE.md §4 · CHECKOUT-STABLE-DECLARATION-V2)
  { area: 'commerce', path: '/apps/api-server/src/services/checkout.service.ts' },
  { area: 'commerce', path: '/apps/api-server/src/services/cart/' },
  { area: 'commerce', path: '/apps/api-server/src/entities/checkout/' },
  { area: 'commerce', path: '/apps/api-server/src/entities/cart/' },
  { area: 'commerce', path: '/packages/payment-core/' },
  // product · supplier offer · distribution (F8 · F12)
  { area: 'product', path: '/apps/api-server/src/modules/neture/entities/' },
  { area: 'product', path: '/apps/api-server/src/modules/neture/services/master-link-policy.ts' },
  { area: 'product', path: '/apps/api-server/src/modules/neture/services/offer-write-policy.ts' },
  { area: 'product', path: '/apps/api-server/src/modules/neture/services/supplier-offer-distribution.service.ts' },
  { area: 'product', path: '/apps/api-server/src/modules/neture/services/offer-service-approval.service.ts' },
  { area: 'product', path: '/apps/api-server/src/modules/neture/services/offer-service-price.service.ts' },
  { area: 'product', path: '/apps/api-server/src/modules/neture/services/spot-price-policy.service.ts' },
  { area: 'product', path: '/apps/api-server/src/modules/neture/services/recruitment-supply-price.service.ts' },
  { area: 'product', path: '/apps/api-server/src/modules/neture/services/bulk-match.service.ts' },
  { area: 'product', path: '/apps/api-server/src/modules/neture/services/alias.service.ts' },
  { area: 'product', path: '/apps/api-server/src/modules/neture/services/catalog.service.ts' },
  { area: 'product', path: '/apps/api-server/src/modules/neture/utils/product-identifier.util.ts' },
  { area: 'product', path: '/apps/api-server/src/modules/neture/guards/drug-commerce.guard.ts' },
  { area: 'product', path: '/apps/api-server/src/utils/gtin.ts' },
  { area: 'product', path: '/apps/api-server/src/modules/product-policy-v2/' },
  { area: 'product', path: '/apps/api-server/src/entities/ProductApproval.ts' },
  { area: 'product', path: '/apps/api-server/src/modules/store-core/entities/' },
  // AI execution · usage accounting
  { area: 'ai', path: '/packages/ai-core/' },
  { area: 'ai', path: '/apps/api-server/src/modules/ai-policy/' },
  { area: 'ai', path: '/packages/file-understanding-core/' },
  // Personal Assistant 판단 · local-agent 프로토콜 계약 (C 후보 포함 — 분리 전까지 B 로 관리)
  { area: 'assistant', path: '/apps/api-server/src/services/assistant/' },
  { area: 'assistant', path: '/apps/api-server/src/services/ai-tools/work-planner.ts' },
  { area: 'assistant', path: '/apps/api-server/src/services/ai-tools/unified-request-router.ts' },
  { area: 'assistant', path: '/apps/api-server/src/services/ai-tools/task-modality-router.ts' },
  { area: 'assistant', path: '/apps/api-server/src/services/ai-tools/workflow-candidate.ts' },
  { area: 'assistant', path: '/apps/api-server/src/services/ai-tools/work-experience.ts' },
  { area: 'assistant', path: '/apps/api-server/src/services/local-agent/browser-dom-contract.ts' },
  { area: 'assistant', path: '/tools/o4o-local-agent/src/browser-dom-limits.mjs' },
  { area: 'assistant', path: '/tools/o4o-local-agent/src/handlers.mjs' },
  { area: 'assistant', path: '/tools/o4o-local-agent/release/' },
  // schema · entity registry · entity packages
  { area: 'schema', path: '/apps/api-server/src/database/entities.ts' },
  { area: 'schema', path: '/apps/api-server/src/database/migrations/' },
  { area: 'schema', path: '/apps/api-server/src/database/incremental/' },
  { area: 'schema', path: '/packages/cms-core/' },
  { area: 'schema', path: '/packages/forum-core/src/backend/entities/' },
  { area: 'schema', path: '/packages/digital-signage-core/src/backend/entities/' },
  { area: 'schema', path: '/packages/interactive-content-core/src/entities/' },
  { area: 'schema', path: '/packages/education-extension/src/entities/' },
  { area: 'schema', path: '/packages/lms-core/src/entities/' },
  { area: 'schema', path: '/packages/mail-core/src/entities/' },
  { area: 'schema', path: '/packages/market-trial/src/entities/' },
  { area: 'schema', path: '/packages/asset-copy-core/src/entities/' },
  { area: 'schema', path: '/packages/action-log-core/src/action-log.entity.ts' },
];

/**
 * 저장소 상대 경로(앞에 `/` 없음, GitHub API `filename` 형식)가 Core 계약 경로인지.
 * @param {string} file
 */
export function corePathOf(file) {
  const p = '/' + String(file).replace(/^\/+/, '');
  return CORE_PATHS.find((c) => (c.path.endsWith('/') ? p.startsWith(c.path) : p === c.path)) ?? null;
}

/**
 * PR 파일 목록(GitHub API 형식, 이름 변경 전 경로 포함) 중 Core 계약 경로에 걸리는 파일.
 * @param {{ filename: string, previous_filename?: string }[]} files
 * @returns {{ file: string, area: string }[]}
 */
export function coreChangesOf(files) {
  const out = [];
  const seen = new Set();
  for (const f of files) {
    for (const name of [f.filename, f.previous_filename]) {
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const hit = corePathOf(name);
      if (hit) out.push({ file: name, area: hit.area });
    }
  }
  return out;
}
