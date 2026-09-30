/**
 * WO-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1 — 배포 workflow 배선 계약 (텍스트 정적 검사 · 의존성 0)
 *
 * 스크립트 단위 시험만으로는 workflow 가 그 스크립트를 **실제로 호출하는지** 를 보장하지 못한다.
 * 여기서는 세 deploy workflow · shadow workflow 의 배선이 조용히 빠지거나 바뀌는 회귀를 막는다.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf-8');
const DEPLOY = ['.github/workflows/deploy-api.yml', '.github/workflows/deploy-web-services.yml', '.github/workflows/deploy-admin.yml'];
const count = (text, re) => (text.match(re) ?? []).length;

describe('Phase 1 — CI gate 는 모든 배포 경로 앞에 있다', () => {
  for (const file of DEPLOY) {
    it(`${file}: ci-gate job 이 --enforce 로 CI green 을 요구한다`, () => {
      const wf = read(file);
      assert.match(wf, /^ {2}ci-gate:\n/m);
      assert.match(wf, /node scripts\/ci\/ci-gate\.mjs --target "\$\{\{ github\.sha \}\}" --wait-seconds \d+ --enforce/);
      assert.match(wf, /actions: read/);
    });
  }

  it('모든 배포 job 이 ci-gate 를 needs 로 가진다 (api 1 · web 9 · admin 1)', () => {
    assert.match(read(DEPLOY[0]), /build-and-deploy:[\s\S]*?needs: \[detect, ci-gate\]/);
    assert.equal(count(read(DEPLOY[1]), /^ {4}needs: \[detect-changes, ci-gate\]$/gm), 9);
    assert.match(read(DEPLOY[2]), /\n {2}deploy:[\s\S]*?needs: \[detect, ci-gate\]/);
  });
});

describe('Phase 2 — 배포되는 모든 revision 에 commit SHA label 을 남긴다', () => {
  for (const file of DEPLOY) {
    it(`${file}: gcloud run deploy 수 == o4o-commit-sha label 수`, () => {
      const wf = read(file);
      const deploys = count(wf, /gcloud run deploy /g);
      assert.ok(deploys > 0);
      assert.equal(count(wf, /--update-labels="o4o-commit-sha=\$\{\{ github\.sha \}\}"/g), deploys);
    });
  }
});

describe('Phase 4 — verified rollout 은 선택형이고 기본은 종전 동작이다', () => {
  for (const file of DEPLOY) {
    it(`${file}: rollout_mode 기본 legacy · verified 에서만 --no-traffic --tag`, () => {
      const wf = read(file);
      assert.match(wf, /rollout_mode:\n\s+description: [^\n]+\n\s+required: false\n\s+default: 'legacy'/);
      assert.match(wf, /if \[ "\$\{\{ github\.event\.inputs\.rollout_mode \}\}" = "verified" \]; then\s+ROLLOUT_ARGS=\(--no-traffic "--tag=sha-\$\{GITHUB_SHA:0:12\}"\)/);
    });
  }

  it('web · admin 은 verified 에서 새 revision tag URL smoke 후 전환한다', () => {
    const web = read(DEPLOY[1]);
    assert.equal(count(web, /phase: plan/g), 9);
    assert.equal(count(web, /phase: finish/g), 9);
    assert.equal(count(read(DEPLOY[2]), /phase: finish/g), 1);
    const action = read('.github/actions/cloud-run-verified-rollout/action.yml');
    const smoke = action.indexOf('cloud-run-rollout.mjs smoke');
    const sw = action.indexOf('cloud-run-rollout.mjs switch');
    assert.ok(smoke > 0 && sw > smoke, 'smoke 가 switch 보다 먼저');
  });

  it('api 는 verified 에서 readiness → switch → 전환 후 검사(실패 시 rollback) 순서다', () => {
    const wf = read(DEPLOY[0]);
    const i = (s) => wf.indexOf(s);
    assert.ok(i('--mode readiness') > i('- name: Deploy to Cloud Run'));
    assert.ok(i('cloud-run-rollout.mjs switch') > i('--mode readiness'));
    assert.ok(i('cloud-run-rollout.mjs verify') > i('cloud-run-rollout.mjs switch'));
    assert.match(wf, /- name: Verify deployment\n\s+if: github\.event\.inputs\.migrate_only != 'true' && github\.event\.inputs\.rollout_mode != 'verified'/);
  });
});

describe('§21 · §22 — hold 문구 · optional env', () => {
  for (const file of DEPLOY) {
    it(`${file}: hold 문구에 종료된 과거 사유(Lecture Phase 2)가 없다`, () => {
      const hold = /deploy-hold-notice:[\s\S]*?(?=\n {2}[a-z-]+:\n)/.exec(read(file))?.[0] ?? '';
      assert.match(hold, /Production deploy currently paused by deployment gate/);
      assert.doesNotMatch(hold, /Lecture Phase 2|data cutover/);
    });
  }

  it('deploy-api: optional env 4개를 빈 값으로 직접 --set-env-vars 하지 않는다', () => {
    const wf = read(DEPLOY[0]);
    assert.doesNotMatch(wf, /--set-env-vars="(AI_DEFAULT_PROVIDER|AI_DEFAULT_MODEL_OPENAI|TOSS_PAYMENTS_CLIENT_KEY|TOSS_PAYMENTS_SECRET_KEY)=/);
    assert.match(wf, /cloud-run-env\.mjs optional/);
    assert.match(wf, /"\$\{OPTIONAL_ENV\[@\]\}"/);
  });
});

describe('shadow workflow — 기록만 한다', () => {
  const wf = read('.github/workflows/cd-risk-gate-shadow.yml');
  it('CI Pipeline 완료(main)에 반응하고 판정기를 shadow 로 실행한다', () => {
    assert.match(wf, /workflow_run:\n\s+workflows: \['CI Pipeline'\]\n\s+types: \[completed\]\n\s+branches: \[main\]/);
    assert.match(wf, /deploy-risk\.mjs[\s\S]*--serving-from-gcloud/);
    assert.doesNotMatch(wf, /--enforce/);
  });
  it('쓰기 명령 0 — deploy · update-traffic · jobs execute · variable set 없음', () => {
    assert.doesNotMatch(wf, /gcloud run deploy|update-traffic|jobs execute|gh variable set|cloud-run-rollout\.mjs (switch|rollback)/);
  });
  it('이름이 deploy-* 가 아니다 (판정기의 배포 기계 규칙 · 배포 workflow 목록과 섞이지 않음)', () => {
    assert.ok(!path.basename('.github/workflows/cd-risk-gate-shadow.yml').startsWith('deploy-'));
  });
});
