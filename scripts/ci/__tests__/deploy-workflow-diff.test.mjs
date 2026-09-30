/**
 * WO-O4O-CICD-CI-GATE-STABILIZATION-AND-RISK-DETECTOR-REFINEMENT-V1 — workflow 변경 분류 · build-arg 귀속 · 위험 감소 삭제
 * (node:test · git/네트워크 0 — workflow 원문은 인라인 fixture, 소비 판정은 주입)
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LEVEL_1, LEVEL_2, LEVEL_3, assessRisk } from '../deploy-risk.mjs';
import { analyzeWorkflowChange, parseWorkflow } from '../deploy-workflow-diff.mjs';
import { WEB_SERVICES, buildWorkspaceGraph } from '../detect-affected.mjs';

const WF = '.github/workflows/deploy-web-services.yml';
const webKeys = WEB_SERVICES.map((s) => s.key);
const graph = buildWorkspaceGraph();

const BASE = `name: Deploy Web Services (Cloud Run)
on:
  push:
    branches:
      - main
env:
  PROJECT_ID: netureyoutube
  VITE_SERVICE_URL_KPA_SOCIETY: https://kpa-society.co.kr
  VITE_UNIFIED_STORE_HANDOFF: 'false'
jobs:
  deploy-hold-notice:
    runs-on: ubuntu-latest
    steps:
      - name: Report deploy hold
        run: |
          echo "사유: Lecture Phase 2 cutover 전"
  deploy-kpa-society:
    needs: detect-changes
    if: vars.DEPLOY_FREEZE == 'false'
    steps:
      - name: Build and push Docker image
        run: |
          docker build \\
            --platform linux/amd64 \\
            --build-arg VITE_SERVICE_URL=\${{ env.VITE_SERVICE_URL_KPA_SOCIETY }} \\
            --build-arg VITE_UNIFIED_STORE_HANDOFF=\${{ env.VITE_UNIFIED_STORE_HANDOFF }} \\
            -f services/web-kpa-society/Dockerfile \\
            .
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy kpa-society-web \\
            --memory=256Mi \\
            --max-instances=5
  deploy-neture:
    needs: detect-changes
    steps:
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy neture-web \\
            --memory=256Mi \\
            --max-instances=5
`;

const mutate = (pairs) => pairs.reduce((t, [a, b]) => {
  assert.ok(t.includes(a), `fixture 에 없음: ${a}`);
  return t.replace(a, b);
}, BASE);
const analyze = (head, consumes = () => true) => analyzeWorkflowChange(WF, BASE, head, { webKeys, consumes });
const empty = (a) => a.build.length + a.config.length + a.rollout.length + a.auth.length === 0;

describe('W. deploy workflow 변경 분류 (§8)', () => {
  it('W1 CONTROL-ONLY — 주석 · hold 문구 · if · needs 만 → 모든 서비스 영향 0', () => {
    const head = mutate([
      ['echo "사유: Lecture Phase 2 cutover 전"', 'echo "Production deploy currently paused by deployment gate"'],
      ["if: vars.DEPLOY_FREEZE == 'false'", "if: vars.DEPLOY_FREEZE == 'false' && needs.ci-gate.result == 'success'"],
      ['    needs: detect-changes\n    if:', '    needs: [detect-changes, ci-gate]\n    # CI gate 추가\n    if:'],
    ]);
    const a = analyze(head);
    for (const k of webKeys) assert.ok(empty(a[k]), `${k} 영향 없어야 함`);
    assert.ok(a['kpa-society'].control > 0);
  });

  it('W2 BUILD INPUT — build-arg env 값 변경, 서비스가 ARG 를 읽음 → 그 서비스만 build', () => {
    const a = analyze(mutate([['https://kpa-society.co.kr', 'https://pharmacy.neture.co.kr']]), () => true);
    assert.equal(a['kpa-society'].build.length, 1);
    assert.ok(empty(a.neture), 'env 를 참조하지 않는 서비스는 무영향');
  });

  it('W3 BUILD INPUT 인데 ARG 를 아무도 읽지 않음(실측: kpa-society/k-cosmetics VITE_SERVICE_URL) → 무영향 + 사유', () => {
    const a = analyze(mutate([['https://kpa-society.co.kr', 'https://pharmacy.neture.co.kr']]), (arg) => (arg === 'VITE_SERVICE_URL' ? false : true));
    assert.ok(empty(a['kpa-society']));
    assert.match(a['kpa-society'].notes[0], /VITE_SERVICE_URL 를 읽지 않음/);
  });

  it('W4 인증 진입 build 입력(VITE_UNIFIED_STORE_HANDOFF) → build + auth (LEVEL_3 대상)', () => {
    const a = analyze(mutate([["VITE_UNIFIED_STORE_HANDOFF: 'false'", "VITE_UNIFIED_STORE_HANDOFF: 'true'"]]));
    assert.equal(a['kpa-society'].build.length, 1);
    assert.equal(a['kpa-society'].auth.length, 1);
  });

  it('W5 ROLLOUT — ROLLOUT_ARGS · --update-labels 추가(8526b64e1 형태) → rollout 만', () => {
    const head = mutate([
      ['          gcloud run deploy kpa-society-web \\', '          ROLLOUT_ARGS=()\n          gcloud run deploy kpa-society-web \\'],
      ['            --max-instances=5\n  deploy-neture', '            --max-instances=5 "${ROLLOUT_ARGS[@]}" --update-labels="o4o-commit-sha=${{ github.sha }}"\n  deploy-neture'],
    ]);
    const a = analyze(head);
    const k = a['kpa-society'];
    assert.ok(k.rollout.length >= 2, JSON.stringify(k));
    assert.equal(k.build.length + k.config.length, 0, '--max-instances 는 그대로이므로 config 변경 아님');
    assert.ok(empty(a.neture));
  });

  it('W6 DEPLOY CONFIG — Cloud Run 리소스 flag 변경 → config', () => {
    const a = analyze(mutate([['--memory=256Mi \\\n            --max-instances=5\n  deploy-neture', '--memory=512Mi \\\n            --max-instances=5\n  deploy-neture']]));
    assert.deepEqual([...a['kpa-society'].config].sort(), ['--memory=256Mi', '--memory=512Mi']);
    assert.ok(empty(a.neture));
  });

  it('W7 어떤 job 도 참조하지 않는 top env(PROJECT_ID) 변경 → 모든 서비스 config', () => {
    const a = analyze(mutate([['PROJECT_ID: netureyoutube', 'PROJECT_ID: other-project']]));
    for (const k of webKeys) assert.ok(a[k].config.length >= 1 && a[k].config.every((c) => c.includes('PROJECT_ID')), k);
  });

  it('W9 빌드 환경(checkout · sparse · gcloud 설치) 변경은 배포 방식 — rollout (replay: 6ae232ea1)', () => {
    const head = mutate([
      ['      - name: Deploy to Cloud Run\n        run: |\n          gcloud run deploy kpa-society-web', '      - uses: actions/checkout@v6\n        with:\n          sparse-checkout: |\n            /*\n            !/apps/api-server/src/scripts/data/\n      - name: Deploy to Cloud Run\n        run: |\n          gcloud run deploy kpa-society-web'],
    ]);
    const k = analyze(head)['kpa-society'];
    assert.ok(k.rollout.length >= 3, JSON.stringify(k));
    assert.equal(k.build.length + k.config.length, 0);
  });

  it('W8 판정 불가 — 원문 없음 · jobs 없음 → null (호출자 보수 fallback)', () => {
    assert.equal(analyzeWorkflowChange(WF, undefined, BASE, { webKeys }), null);
    assert.equal(analyzeWorkflowChange(WF, BASE, 'not a workflow', { webKeys }), null);
    assert.equal(analyzeWorkflowChange('.github/workflows/other.yml', BASE, BASE, { webKeys }), null);
    assert.ok(parseWorkflow(BASE).sections.has('job:deploy-kpa-society'));
  });
});

describe('W+. assessRisk 통합 — 원문 주입 시 workflow 변경이 서비스별로 귀속된다', () => {
  const run = (head, consumes = () => true) =>
    assessRisk([{ status: 'M', path: WF }], graph, { readFile: (which) => (which === 'base' ? BASE : head), consumes });

  it('control-only workflow 변경 → LEVEL_1 · 배포 없음 (종전: 9개 전부 L3)', () => {
    const r = run(mutate([['echo "사유: Lecture Phase 2 cutover 전"', 'echo "paused"']]));
    assert.equal(r.risk_level, LEVEL_1);
    assert.equal(r.deploy_required, false);
  });

  it('rollout-only workflow 변경 → 배포 없음 · rollout 기록', () => {
    const r = run(mutate([['          gcloud run deploy kpa-society-web \\', '          ROLLOUT_ARGS=()\n          gcloud run deploy kpa-society-web \\']]));
    assert.equal(r.deploy_required, false);
    assert.ok(r.services['kpa-society'].rollout.length > 0);
  });

  it('소비되지 않는 build-arg 값 변경 → 배포 없음', () => {
    const r = run(mutate([['https://kpa-society.co.kr', 'https://pharmacy.neture.co.kr']]), () => false);
    assert.equal(r.deploy_required, false);
  });

  it('소비되는 build-arg 변경 → 그 서비스만 LEVEL_2', () => {
    const r = run(mutate([['https://kpa-society.co.kr', 'https://pharmacy.neture.co.kr']]), () => true);
    assert.deepEqual(r.affected_services, ['kpa-society']);
    assert.equal(r.services['kpa-society'].level, LEVEL_2);
  });

  it('배포 설정 변경 → 그 서비스만 LEVEL_3', () => {
    const r = run(mutate([['--memory=256Mi \\\n            --max-instances=5\n  deploy-neture', '--memory=512Mi \\\n            --max-instances=5\n  deploy-neture']]));
    assert.deepEqual(r.affected_services, ['kpa-society']);
    assert.equal(r.services['kpa-society'].level, LEVEL_3);
    assert.ok(r.level3_hits.some((h) => h.rule === 'deploy-config'));
  });

  it('인증 진입 build 입력 → LEVEL_3', () => {
    const r = run(mutate([["VITE_UNIFIED_STORE_HANDOFF: 'false'", "VITE_UNIFIED_STORE_HANDOFF: 'true'"]]));
    assert.equal(r.services['kpa-society'].level, LEVEL_3);
    assert.ok(r.level3_hits.some((h) => h.rule === 'auth-build-input'));
  });

  it('신규 추가(A) deploy workflow → 보수 fallback L3', () => {
    const r = assessRisk([{ status: 'A', path: WF }], graph, { readFile: () => BASE });
    assert.equal(r.risk_level, LEVEL_3);
  });
});

describe('D. 위험 감소 삭제 (§10 · §11)', () => {
  const f = (status, path) => ({ status, path });

  it('DB write one-off job 진입점 삭제만 (e2adfe4f3 형태) → L3 아님 · risk_reducing 기록', () => {
    const r = assessRisk([f('D', 'apps/api-server/src/drug-seed-candidate-import-job.ts'), f('D', 'apps/api-server/src/drug-seed-promotion-apply-job.ts')], graph);
    assert.equal(r.services.api.level, LEVEL_2, '이미지에서 파일이 빠지므로 배포는 필요 · 위험 증가 아님');
    assert.equal(r.risk_reducing.length, 2);
    assert.equal(r.level3_hits.length, 0);
  });

  it('삭제 + 같은 규칙의 새 진입점 추가(이동 우회) → downgrade 하지 않는다', () => {
    const r = assessRisk([f('D', 'apps/api-server/src/drug-seed-candidate-import-job.ts'), f('A', 'apps/api-server/src/jobs/drug-seed-v2.job.ts')], graph);
    assert.equal(r.services.api.level, LEVEL_3);
    assert.equal(r.risk_reducing.length, 0);
  });

  it('migration 삭제 · middleware/guard 삭제는 위험 감소가 아니다 (L3 유지)', () => {
    assert.equal(assessRisk([f('D', 'apps/api-server/src/database/migrations/1790683000000-X.ts')], graph).services.api.level, LEVEL_3);
    assert.equal(assessRisk([f('D', 'apps/api-server/src/modules/neture/guards/drug-access.guard.ts')], graph).services.api.level, LEVEL_3);
    assert.equal(assessRisk([f('D', 'apps/api-server/src/common/middleware/auth/authentication.middleware.ts')], graph).services.api.level, LEVEL_3);
  });

  it('추가 · 수정된 DB write 진입점은 여전히 L3', () => {
    assert.equal(assessRisk([f('A', 'apps/api-server/src/jobs/new-backfill.job.ts')], graph).services.api.level, LEVEL_3);
    assert.equal(assessRisk([f('M', 'apps/api-server/src/jobs/privacy-retention.job.ts')], graph).services.api.level, LEVEL_3);
  });
});
