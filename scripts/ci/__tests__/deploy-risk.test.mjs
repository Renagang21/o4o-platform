/**
 * WO-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1 — deploy-risk.mjs 회귀 시험 (node:test · 의존성 0 · 네트워크 0)
 *
 *   R  risk_level 분류 (WO §28 Detector)
 *   S  serving SHA → target SHA (WO §28 Serving SHA) — git/gcloud 는 주입 대체
 *   G  serving SHA 수집 (gcloud 응답 fixture)
 *   D  shadow would-be 결정
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COMMIT_LABEL,
  DEPLOY_TARGETS,
  LEVEL_1,
  LEVEL_2,
  LEVEL_3,
  assessRisk,
  assessServingGap,
  classifyAdminDeploy,
  isNonRuntimeFile,
  matchLevel3,
  readServingSha,
  summarizeShadow,
  wouldBeDecision,
} from '../deploy-risk.mjs';
import { buildWorkspaceGraph } from '../detect-affected.mjs';

const graph = buildWorkspaceGraph();
const files = (...paths) => paths.map((p) => (Array.isArray(p) ? { status: p[0], path: p[1] } : { status: 'M', path: p }));
const risk = (...paths) => assessRisk(files(...paths), graph);

describe('R. risk_level 분류', () => {
  it('R1 docs-only → LEVEL_1 · 배포 없음', () => {
    const r = risk('docs/checks/CHECK-X.md', 'docs/investigations/IR-Y.md', 'README.md');
    assert.equal(r.risk_level, LEVEL_1);
    assert.equal(r.deploy_required, false);
    assert.deepEqual(r.affected_services, []);
  });

  it('R2 CI-only (#259 형태: ci-security.yml) → LEVEL_1 · 배포 없음', () => {
    const r = risk('.github/workflows/ci-security.yml');
    assert.equal(r.risk_level, LEVEL_1);
    assert.equal(r.deploy_required, false);
  });

  it('R2b CI 도구 · 테스트만 → LEVEL_1', () => {
    const r = risk(
      '.github/workflows/ci-pipeline.yml',
      'scripts/ci/__tests__/detect-affected.test.mjs',
      'apps/api-server/src/__tests__/x.spec.ts',
      'services/web-neture/src/components/__tests__/A.test.tsx',
      'packages/auth-react/src/__tests__/emailAuth.test.tsx',
    );
    assert.equal(r.risk_level, LEVEL_1);
    assert.equal(r.deploy_required, false);
    assert.equal(r.level3_hits.length, 0, '테스트 파일은 auth 경로여도 위험이 아니다');
  });

  it('R2c 운영 CLI(apps/api-server/src/scripts) → 배포 없음 + advisory', () => {
    const r = risk('apps/api-server/src/scripts/apply-something.ts');
    assert.equal(r.deploy_required, false);
    assert.ok(r.advisories.some((a) => a.includes('운영 CLI')));
  });

  it('R3 frontend runtime → LEVEL_2 · 해당 서비스만', () => {
    const r = risk('services/web-neture/src/pages/HomePage.tsx');
    assert.equal(r.risk_level, LEVEL_2);
    assert.deepEqual(r.affected_services, ['neture']);
  });

  it('R4 backend runtime → LEVEL_2 · api 만', () => {
    const r = risk('apps/api-server/src/services/ai-tools/hospital-drug-surface.ts');
    assert.equal(r.risk_level, LEVEL_2);
    assert.deepEqual(r.affected_services, ['api']);
  });

  it('R5 migration → LEVEL_3 (api)', () => {
    const r = risk(['A', 'apps/api-server/src/database/migrations/1790683000000-CreateX.ts']);
    assert.equal(r.risk_level, LEVEL_3);
    assert.equal(r.services.api.level, LEVEL_3);
    assert.ok(r.level3_hits.some((h) => h.rule === 'db-migration'));
  });

  it('R5b incremental manifest · migration runner → LEVEL_3', () => {
    assert.equal(risk('apps/api-server/src/database/incremental/manifest.ts').risk_level, LEVEL_3);
    assert.equal(risk('apps/api-server/src/migrate.ts').risk_level, LEVEL_3);
  });

  it('R6 auth backend → LEVEL_3', () => {
    const r = risk('apps/api-server/src/modules/auth/controllers/email-auth.controller.ts');
    assert.equal(r.risk_level, LEVEL_3);
    assert.equal(r.services.api.level, LEVEL_3);
  });

  it('R6b auth 공용 package → 소비 서비스 전부 LEVEL_3, 비소비 서비스는 영향 없음', () => {
    const r = risk('packages/auth-react/src/email/EmailLoginForm.tsx');
    assert.equal(r.risk_level, LEVEL_3);
    for (const key of r.affected_services) assert.equal(r.services[key].level, LEVEL_3, key);
    assert.equal(r.services['hospital-pharmacy'].affected, false);
    assert.equal(r.services['signage-player'], undefined, 'signage-player 는 배포 대상에서 은퇴했다');
  });

  it('R6c auth frontend (LoginPage · AuthContext) → LEVEL_3, Author* 는 아님', () => {
    assert.equal(risk('services/web-store/src/pages/LoginPage.tsx').risk_level, LEVEL_3);
    assert.equal(risk('services/web-neture/src/contexts/AuthContext.tsx').risk_level, LEVEL_3);
    assert.equal(risk('services/web-neture/src/components/AuthorCard.tsx').risk_level, LEVEL_2);
  });

  it('R6e 세션 origin 판정은 인증 경계다 (refinement replay 미탐: 773d6c54c utils/session-origin.ts)', () => {
    assert.equal(risk('apps/api-server/src/utils/session-origin.ts').risk_level, LEVEL_3);
  });

  it('R6d 콘텐츠 handoff 는 인증이 아니다 (replay 오탐 보정)', () => {
    assert.equal(risk('apps/api-server/src/modules/neture/services/supplier-library-handoff.service.ts').risk_level, LEVEL_2);
    assert.equal(risk('apps/api-server/src/services/handoff-token.service.ts').risk_level, LEVEL_3);
  });

  it('R7 RBAC (roles · role 회수 · membership · middleware · guard) → LEVEL_3', () => {
    for (const p of [
      'apps/api-server/src/types/roles.ts',
      'apps/api-server/src/utils/role-revoke-safety.ts',
      'apps/api-server/src/controllers/operator/MembershipConsoleController.ts',
      'apps/api-server/src/modules/neture/middleware/neture-identity.middleware.ts',
      'apps/api-server/src/modules/neture/guards/drug-access.guard.ts',
      'packages/security-core/src/service-scope-guard.ts',
      'services/web-neture/src/lib/role-constants.ts',
    ]) {
      assert.equal(risk(p).risk_level, LEVEL_3, p);
    }
  });

  it('R8 infra / deploy pipeline → LEVEL_3', () => {
    const r = risk('.github/workflows/deploy-api.yml');
    assert.equal(r.risk_level, LEVEL_3);
    assert.equal(r.services.api.level, LEVEL_3);
    assert.equal(risk('services/web-neture/Dockerfile').risk_level, LEVEL_3);
    assert.equal(risk('apps/api-server/package.production.json').risk_level, LEVEL_3);
  });

  it('R8b rollout 방식만 바뀜 → 배포 불필요(L1) · 다음 배포는 통제(L3) (refinement: 종전 전체 L3)', () => {
    const only = risk('scripts/ci/cloud-run-rollout.mjs');
    assert.equal(only.risk_level, LEVEL_1);
    assert.equal(only.deploy_required, false);
    assert.ok(only.services.neture.rollout.length > 0, 'rollout 방식 변경은 기록된다');
    const withFe = risk('scripts/ci/cloud-run-rollout.mjs', 'services/web-neture/src/pages/HomePage.tsx');
    assert.equal(withFe.services.neture.level, LEVEL_3, 'rollout 방식 변경 뒤 첫 배포는 통제 대상');
    assert.equal(withFe.services.store.affected, false, '다른 서비스는 배포되지 않는다');
  });

  it('R8c 판정/게이트 스크립트(ci-gate · deploy-risk · shadow workflow) → control-only L1', () => {
    const r = risk('scripts/ci/ci-gate.mjs', 'scripts/ci/deploy-risk.mjs', '.github/workflows/cd-risk-gate-shadow.yml');
    assert.equal(r.risk_level, LEVEL_1);
    assert.equal(r.deploy_required, false);
  });

  it('R8d deploy workflow 원문을 못 읽으면 종전처럼 보수 판정(L3)', () => {
    const r = risk('.github/workflows/deploy-web-services.yml');
    assert.equal(r.risk_level, LEVEL_3);
    assert.equal(r.services.neture.level, LEVEL_3);
    assert.ok(r.advisories.some((a) => a.includes('의미 분석 불가')));
  });

  it('R9 결제 민감 runtime · 스케줄 job(DB write) → LEVEL_3', () => {
    assert.equal(risk('apps/api-server/src/services/neture/checkout-fulfillment-bridge.service.ts').risk_level, LEVEL_3);
    assert.equal(risk('apps/api-server/src/jobs/privacy-retention.job.ts').risk_level, LEVEL_3);
  });

  it('R10 서비스 삭제 → LEVEL_3', () => {
    const hits = matchLevel3('services/web-lecture/package.json', 'D');
    assert.ok(hits.some((h) => h.rule === 'service-deletion'));
  });

  it('R11 섞이면 최대 등급 · 서비스별 등급은 독립', () => {
    const r = risk('services/web-neture/src/pages/HomePage.tsx', 'apps/api-server/src/database/migrations/1790683000000-X.ts');
    assert.equal(r.risk_level, LEVEL_3);
    assert.equal(r.services.api.level, LEVEL_3);
    assert.equal(r.services.neture.level, LEVEL_2, 'migration 은 neture 의 등급을 올리지 않는다');
  });

  it('R12 isNonRuntimeFile 경계', () => {
    assert.equal(isNonRuntimeFile('apps/api-server/src/__tests__/a.spec.ts'), true);
    assert.equal(isNonRuntimeFile('apps/api-server/tests/multi-tenant/a.ts'), true);
    assert.equal(isNonRuntimeFile('packages/ui/vitest.config.mjs'), true);
    assert.equal(isNonRuntimeFile('apps/api-server/src/main.ts'), false);
  });

  it('R13 Admin 배포 축은 CI 전역 경로에 반응하지 않는다 (기존 admin_affected 와 다름)', () => {
    assert.equal(classifyAdminDeploy(files('.github/workflows/ci-security.yml'), graph).admin_deploy_affected, false);
    assert.equal(classifyAdminDeploy(files('scripts/lint-ratchet.mjs'), graph).admin_deploy_affected, false);
    assert.equal(classifyAdminDeploy(files('apps/admin-dashboard/src/App.tsx'), graph).admin_deploy_affected, true);
    assert.equal(classifyAdminDeploy(files('.github/workflows/deploy-admin.yml'), graph).admin_deploy_affected, true);
    assert.equal(classifyAdminDeploy(files('unmapped/thing.txt'), graph).admin_deploy_affected, true, '매핑 불가 = 안전 fallback');
  });

  it('R14 변경 0건 → 배포 없음', () => {
    const r = assessRisk([], graph);
    assert.equal(r.deploy_required, false);
    assert.equal(r.risk_level, LEVEL_1);
  });
});

// ---------------------------------------------------------------------------

const T = 'a'.repeat(40);
const OLD = 'b'.repeat(40);
const OLDER = 'c'.repeat(40);
const fakeProvider = (diffs, { ancestors = true, missing = [] } = {}) => ({
  exists: (sha) => !missing.includes(sha),
  isAncestor: () => ancestors,
  changedFiles: (base) => (diffs[base] ? { ok: true, files: diffs[base] } : { ok: false, reason: 'no diff' }),
  readLock: () => undefined,
});
const allServing = (sha) => Object.fromEntries(DEPLOY_TARGETS.map((t) => [t.key, { sha, source: 'revision-label' }]));

describe('S. serving SHA → target SHA', () => {
  it('S1 serving == target → 전 서비스 UP_TO_DATE · 배포 없음', () => {
    const out = assessServingGap(T, allServing(T), graph, fakeProvider({}));
    for (const e of Object.values(out)) {
      assert.equal(e.status, 'UP_TO_DATE');
      assert.equal(e.deploy_required, false);
    }
  });

  it('S2 serving 이 오래됨 → 누적 diff 전체를 본다 (마지막 commit 이 docs 여도 앞의 migration 을 놓치지 않는다)', () => {
    const accumulated = files(['A', 'apps/api-server/src/database/migrations/1790683000000-X.ts'], 'docs/checks/CHECK-Z.md');
    const out = assessServingGap(T, allServing(OLD), graph, fakeProvider({ [OLD]: accumulated }));
    assert.equal(out.api.status, 'BEHIND');
    assert.equal(out.api.level, LEVEL_3);
    assert.equal(out.neture.deploy_required, false);
    assert.equal(out.neture.status, 'BEHIND_NO_RUNTIME_CHANGE');
  });

  it('S3 서비스마다 serving SHA 가 다르면 서비스별 diff 를 쓴다', () => {
    const serving = allServing(T);
    serving.api = { sha: OLD, source: 'revision-label' };
    serving.neture = { sha: OLDER, source: 'registry-tag' };
    const diffs = {
      [OLD]: files('apps/api-server/src/services/x.service.ts'),
      [OLDER]: files('services/web-neture/src/pages/HomePage.tsx', 'apps/api-server/src/modules/auth/x.ts'),
    };
    const out = assessServingGap(T, serving, graph, fakeProvider(diffs));
    assert.equal(out.api.level, LEVEL_2, 'api 는 자기 gap(OLD..T)만 본다');
    assert.equal(out.neture.level, LEVEL_2, 'neture gap 의 auth backend 변경은 neture 등급이 아니다');
    assert.equal(out.neture.deploy_required, true);
    assert.equal(out.admin.status, 'UP_TO_DATE');
  });

  it('S4 serving SHA 불명 · traffic 분할 · 이력 없음 · 비조상 → LEVEL_3 fail-safe', () => {
    const serving = allServing(T);
    serving.api = { sha: null, source: 'label 없음' };
    serving.admin = { sha: null, source: 'serving revision 2개', ambiguous: true };
    serving.neture = { sha: OLD, source: 'registry-tag' };
    const out = assessServingGap(T, serving, graph, fakeProvider({}, { missing: [OLD] }));
    for (const key of ['api', 'admin', 'neture']) {
      assert.equal(out[key].status, 'UNKNOWN', key);
      assert.equal(out[key].level, LEVEL_3, key);
      assert.equal(out[key].deploy_required, true, key);
    }
    const nonAncestor = assessServingGap(T, allServing(OLD), graph, fakeProvider({ [OLD]: [] }, { ancestors: false }));
    assert.equal(nonAncestor.api.level, LEVEL_3);
    assert.match(nonAncestor.api.reasons[0], /조상이 아님/);
  });

  it('S5 target 형식 오류 → 전부 LEVEL_3', () => {
    const out = assessServingGap('not-a-sha', allServing(OLD), graph, fakeProvider({}));
    assert.equal(out.api.level, LEVEL_3);
  });
});

describe('G. serving SHA 수집 (gcloud read-only)', () => {
  const ok = (value) => ({ status: 0, stdout: typeof value === 'string' ? value : JSON.stringify(value), stderr: '' });
  const target = DEPLOY_TARGETS.find((t) => t.key === 'neture');

  it('G1 revision label 우선', () => {
    const run = (_cmd, args) => {
      if (args[2] === 'describe' && args[1] === 'services') return ok({ status: { traffic: [{ revisionName: 'r1', percent: 100 }] } });
      if (args[1] === 'revisions') return ok({ metadata: { labels: { [COMMIT_LABEL]: OLD } }, spec: { containers: [{ image: 'x@sha256:1' }] } });
      throw new Error('unexpected');
    };
    assert.deepEqual(readServingSha(target, run), { sha: OLD, source: 'revision-label', revision: 'r1' });
  });

  it('G2 label 없으면 digest → registry 태그', () => {
    const run = (_cmd, args) => {
      if (args[1] === 'services') return ok({ status: { traffic: [{ revisionName: 'r1', percent: 100 }, { revisionName: 'r0', percent: 0 }] } });
      if (args[1] === 'revisions') return ok({ metadata: { labels: {} }, spec: { containers: [{ image: 'gcr.io/p/neture-web@sha256:abc' }] } });
      if (args[0] === 'container') {
        assert.ok(args.includes('--filter=digest=sha256:abc'));
        return ok(`${OLDER},latest\n`);
      }
      throw new Error('unexpected');
    };
    assert.deepEqual(readServingSha(target, run), { sha: OLDER, source: 'registry-tag', revision: 'r1' });
  });

  it('G3 traffic 분할 → ambiguous', () => {
    const run = () => ok({ status: { traffic: [{ revisionName: 'r1', percent: 50 }, { revisionName: 'r2', percent: 50 }] } });
    const r = readServingSha(target, run);
    assert.equal(r.sha, null);
    assert.equal(r.ambiguous, true);
  });

  it('G4 태그 없는 digest(multi-arch index) → sha null', () => {
    const run = (_cmd, args) => {
      if (args[1] === 'services') return ok({ status: { traffic: [{ revisionName: 'r1', percent: 100 }] } });
      if (args[1] === 'revisions') return ok({ metadata: {}, spec: { containers: [{ image: 'ar/api-server@sha256:def' }] } });
      return ok('');
    };
    assert.equal(readServingSha(target, run).sha, null);
  });

  it('G5 수집은 describe · list-tags 만 쓴다 (쓰기 명령 0)', () => {
    const seen = [];
    const run = (cmd, args) => {
      seen.push([cmd, ...args].join(' '));
      if (args[1] === 'services') return ok({ status: { traffic: [{ revisionName: 'r1', percent: 100 }] } });
      if (args[1] === 'revisions') return ok({ metadata: {}, spec: { containers: [{ image: 'g/x@sha256:1' }] } });
      return ok('');
    };
    readServingSha(target, run);
    for (const c of seen) assert.doesNotMatch(c, /\b(deploy|update|update-traffic|delete|execute|set)\b/, c);
  });
});

describe('D. shadow would-be 결정', () => {
  const e = (level, deploy = true) => ({ level, deploy_required: deploy });
  it('D1 우선순위: 배포 없음 → CI → freeze → LEVEL_3 → 자동', () => {
    assert.equal(wouldBeDecision(e(LEVEL_2, false), { ciGreen: false, freeze: true }), 'NO_DEPLOY');
    assert.equal(wouldBeDecision(e(LEVEL_2), { ciGreen: false, freeze: false }), 'BLOCKED_CI_NOT_GREEN');
    assert.equal(wouldBeDecision(e(LEVEL_2), { ciGreen: null, freeze: false }), 'BLOCKED_CI_NOT_GREEN', 'CI 상태 불명도 차단');
    assert.equal(wouldBeDecision(e(LEVEL_2), { ciGreen: true, freeze: true }), 'BLOCKED_DEPLOY_FREEZE');
    assert.equal(wouldBeDecision(e(LEVEL_3), { ciGreen: true, freeze: false }), 'BLOCKED_HIGH_RISK_CONTROLLED_DEPLOY_REQUIRED');
    assert.equal(wouldBeDecision(e(LEVEL_2), { ciGreen: true, freeze: false }), 'AUTO_DEPLOY_WITH_REVISION_SMOKE');
  });

  it('D2 요약은 mode=shadow 이고 필수 기록 항목을 갖는다', () => {
    const per = assessServingGap(T, allServing(T), graph, fakeProvider({}));
    const s = summarizeShadow({ target: T, perService: per, ciGreen: true, freeze: false, deployEnabled: false });
    assert.equal(s.mode, 'shadow');
    for (const k of ['timestamp', 'target_sha', 'risk_level', 'deploy_required', 'affected_services', 'services']) assert.ok(k in s, k);
    assert.ok(s.services.every((x) => 'serving_sha' in x && 'would_be' in x));
  });
});
