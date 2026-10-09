/**
 * WO-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1 — 배포 workflow 배선 계약 (텍스트 정적 검사 · 의존성 0)
 *
 * 스크립트 단위 시험만으로는 workflow 가 그 스크립트를 **실제로 호출하는지** 를 보장하지 못한다.
 * 여기서는 세 deploy workflow · deploy-auto 의 배선이 조용히 빠지거나 바뀌는 회귀를 막는다.
 * WO-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1: 게이트 = DEPLOY_FREEZE · push trigger 은퇴 · 서비스 단위 concurrency.
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

  // web 6 — pharmacy-hub-web 배포 은퇴 · signage-player-web 배포 은퇴(WO-O4O-RETIRED-WEB-SERVICES-DEPLOYMENT-AND-INFRA-CLEANUP-V1) ·
  //         k-cosmetics-web 배포 은퇴(WO-O4O-KCOSMETICS-RETIREMENT-PHASE1A-WEB-APP-AND-DEPLOY-TARGET-V1).
  it('모든 배포 job 이 ci-gate 를 needs 로 가진다 (api 1 · web 6 · admin 1)', () => {
    assert.match(read(DEPLOY[0]), /build-and-deploy:[\s\S]*?needs: \[detect, ci-gate\]/);
    assert.equal(count(read(DEPLOY[1]), /^ {4}needs: \[detect-changes, ci-gate\]$/gm), 6);
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

describe('Phase 4 — verified rollout (cutover 후 기본값)', () => {
  for (const file of DEPLOY) {
    it(`${file}: rollout_mode 기본 verified · verified 에서만 --no-traffic --tag`, () => {
      const wf = read(file);
      assert.match(wf, /rollout_mode:\n\s+description: [^\n]+\n\s+required: false\n\s+default: 'verified'/);
      // `inputs.*` — workflow_dispatch · workflow_call(Unified Delivery) 양쪽에서 같은 값 (github.event.inputs 는 호출 시 호출자 것)
      assert.match(wf, /if \[ "\$\{\{ inputs\.rollout_mode \}\}" = "verified" \]; then\s+ROLLOUT_ARGS=\(--no-traffic "--tag=sha-\$\{GITHUB_SHA:0:12\}"\)/);
    });
  }

  it('web · admin 은 verified 에서 새 revision tag URL smoke 후 전환한다', () => {
    const web = read(DEPLOY[1]);
    assert.equal(count(web, /phase: plan/g), 6);
    assert.equal(count(web, /phase: finish/g), 6);
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
    assert.match(wf, /- name: Verify deployment\n\s+if: inputs\.migrate_only != 'true' && inputs\.rollout_mode != 'verified'/);
  });
});

describe('DEPLOY_FREEZE cutover — 게이트 · trigger · 동시성 (WO-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1)', () => {
  for (const file of DEPLOY) {
    it(`${file}: DEPLOY_ENABLED 참조 0 · push trigger 0 (자동 배포는 deploy-auto 만)`, () => {
      const wf = read(file);
      assert.doesNotMatch(wf, /DEPLOY_ENABLED/);
      assert.doesNotMatch(wf, /^ {2}push:/m);
      assert.match(wf, /^ {2}workflow_dispatch:/m);
    });

    it(`${file}: 배포 · ci-gate job 은 DEPLOY_FREEZE == 'false' 일 때만 (fail-closed) · freeze-notice 는 그 반대`, () => {
      const wf = read(file);
      const deployIfs = count(wf, /vars\.DEPLOY_FREEZE == 'false'/g);
      const expected = file.endsWith('web-services.yml') ? 7 : 2; // web: ci-gate 1 + deploy 6 · api/admin: ci-gate 1 + deploy 1
      assert.equal(deployIfs, expected);
      assert.match(wf, /^ {2}freeze-notice:\n(?: {4}#.*\n)* {4}if: vars\.DEPLOY_FREEZE != 'false'\n/m);
      assert.doesNotMatch(wf, /DEPLOY_FREEZE == 'true'|DEPLOY_FREEZE != 'true'/, '"true" 비교는 부재 · 오타를 허용으로 만든다');
    });

    it(`${file}: 서비스 단위 concurrency (ref 단위 아님)`, () => {
      const group = /concurrency:\n(?: {2}#.*\n)* {2}group: ([^\n]+)\n {2}cancel-in-progress: false/.exec(read(file))?.[1];
      assert.ok(group, 'concurrency group 없음');
      assert.doesNotMatch(group, /github\.ref/);
    });
  }

  it('web concurrency 는 서비스 입력별 group', () => {
    assert.match(read(DEPLOY[1]), /group: deploy-web-\$\{\{ inputs\.service \|\| 'all' \}\}/);
  });

  it('api migrate_only 도 freeze 가 적용된다', () => {
    const job = /\n {2}build-and-deploy:[\s\S]*?\n {4}if: >-\n([\s\S]*?)\n\n/.exec(read(DEPLOY[0]))?.[1] ?? '';
    assert.match(job, /^\s+vars\.DEPLOY_FREEZE == 'false' &&\n\s+\(\(github\.event_name == 'workflow_dispatch' && inputs\.migrate_only == 'true'\) \|\|/);
  });
});

describe('Unified Delivery — reusable deploy 진입점 (WO-O4O-CICD-UNIFIED-DELIVERY-PIPELINE-V1)', () => {
  const callInputs = (wf) => /\n {2}workflow_call:\n {4}inputs:\n([\s\S]*?)\n(?=\S)/.exec(wf)?.[1] ?? '';
  for (const file of DEPLOY) {
    it(`${file}: workflow_call 진입점 — rollout_mode 기본 verified · dry_run 기본 'false' · migrate_only 미노출`, () => {
      const inputs = callInputs(read(file));
      assert.match(inputs, /rollout_mode:\n\s+type: string\n\s+required: false\n\s+default: 'verified'/);
      assert.match(inputs, /dry_run:\n(?:\s+description: [^\n]+\n)?\s+type: string\n\s+required: false\n\s+default: 'false'/);
      assert.doesNotMatch(inputs, /migrate_only|expected_sha/, 'migrate_only 는 수동(dispatch) 전용');
    });
    it(`${file}: github.event.inputs 참조 0 (workflow_call 에서는 호출자 이벤트의 입력이 된다)`, () => {
      assert.doesNotMatch(read(file), /github\.event\.inputs/);
    });
    it(`${file}: dry_run 이면 ci-gate 가 열리지 않는다 (→ build · migration · deploy 0)`, () => {
      const gate = /\n {2}ci-gate:\n[\s\S]*?\n {4}if: (>-\n[\s\S]*?\n {4}runs-on|[^\n]+)/.exec(read(file))?.[1] ?? '';
      assert.match(gate, /vars\.DEPLOY_FREEZE == 'false' && inputs\.dry_run != 'true'/);
    });
  }

  it('web: 서비스 지정은 입력 유무로 판단 (workflow_call 에서 event_name 은 호출자 것)', () => {
    const wf = read(DEPLOY[1]);
    assert.match(wf, /if \[ -n "\$\{\{ inputs\.service \}\}" \]; then/);
    assert.doesNotMatch(wf, /"\$\{\{ github\.event_name \}\}" = "workflow_dispatch"/);
    assert.match(callInputs(wf), /service:\n\s+type: string\n\s+required: true/);
  });
});

describe('Unified Delivery — delivery.yml · promote.yml', () => {
  const wf = read('.github/workflows/delivery.yml');
  const promote = read('.github/workflows/promote.yml');

  it('main CI Pipeline 완료에 반응하고 run 이름 = 실제 target SHA', () => {
    assert.match(wf, /workflow_run:\n\s+workflows: \['CI Pipeline'\]\n\s+types: \[completed\]\n\s+branches: \[main\]/);
    assert.match(wf, /^run-name: Delivery \$\{\{ github\.event\.workflow_run\.head_sha \|\| inputs\.target_sha \}\}$/m);
    assert.match(wf, /if: github\.event_name != 'workflow_run' \|\| github\.event\.workflow_run\.event == 'push'/);
  });

  it('TARGET_SHA identity — workflow SHA(github.sha)를 판정기에 넘긴다 (target ≠ github.sha 면 SUPERSEDED)', () => {
    assert.match(wf, /--plan-only --target "\$TARGET_SHA" --workflow-sha "\$GITHUB_SHA"/);
    assert.match(wf, /ref: \$\{\{ env\.TARGET_SHA \}\}/);
  });

  it('자동 경로에 태그 · dispatch · 직접 배포 명령 0 — reusable workflow 호출만', () => {
    assert.doesNotMatch(wf, /git tag|refs\/tags|deploy\/auto|\/dispatches|gh workflow run|gcloud run deploy|update-traffic|jobs execute|gh variable set/);
    assert.match(wf, /uses: \.\/\.github\/workflows\/deploy-api\.yml/);
    assert.equal(count(wf, /uses: \.\/\.github\/workflows\/deploy-web-services\.yml/g), 2);
    assert.match(wf, /uses: \.\/\.github\/workflows\/deploy-admin\.yml/);
    assert.equal(count(wf, /secrets: inherit/g), 4);
  });

  it('API 에 의존하는 프런트는 API 성공 뒤에만 · 독립 프런트는 병렬', () => {
    assert.match(wf, /deploy-web-after-api:[\s\S]*?needs: \[classify, deploy-api\][\s\S]*?needs\.deploy-api\.result == 'success'/);
    assert.match(wf, /deploy-web-parallel:[\s\S]*?needs: classify\n/);
    assert.match(wf, /deploy-admin:[\s\S]*?admin_after_api == 'true' && needs\.deploy-api\.result == 'success'/);
  });

  it('DELIVERY_ENFORCE 일 때만 자동 배포 · 아니면 SHADOW 판정만 (배포 job 실행 0 · commit status 0)', () => {
    assert.match(wf, /DELIVERY_ENFORCE: '(true|false)'/);
    assert.match(wf, /\[ "\$EVENT" = "workflow_run" \] && \[ "\$DELIVERY_ENFORCE" = "true" \]; then\n\s+ARGS\+=\(--dry-run false --status-context "\$STATUS_CONTEXT"\)/);
    assert.match(wf, /ARGS\+=\(--shadow --dry-run true\)/);
  });

  it('자동 경로는 한 번에 한 판정 · promote 는 별도 group (자동 대기열을 밀어내지 않는다)', () => {
    assert.match(wf, /group: \$\{\{ github\.event_name == 'workflow_run' && 'delivery-production' \|\| format\('delivery-\{0\}', github\.run_id\) \}\}/);
    assert.match(promote, /concurrency:\n\s+group: promote-production\n\s+cancel-in-progress: false/);
  });

  it('promote: 입력은 SHA 하나(필수) — delivery 를 mode=promote 로 호출, 태그 · dispatch 0', () => {
    assert.match(promote, /sha:\n\s+description: [^\n]+\n\s+required: true/);
    assert.match(promote, /uses: \.\/\.github\/workflows\/delivery\.yml\n\s+with:\n\s+mode: promote\n\s+target_sha: \$\{\{ inputs\.sha \}\}/);
    assert.doesNotMatch(promote, /rollout_mode|deploy\/|git tag/);
    assert.match(promote, /statuses: write/);
  });
});

describe('§21 · §22 — freeze 안내 · optional env', () => {
  for (const file of DEPLOY) {
    it(`${file}: 안내 문구에 종료된 과거 사유(Lecture Phase 2)가 없다`, () => {
      const notice = /freeze-notice:[\s\S]*?(?=\n {2}[a-z-]+:\n)/.exec(read(file))?.[0] ?? '';
      assert.match(notice, /Production deploy frozen/);
      assert.doesNotMatch(notice, /Lecture Phase 2|data cutover|DEPLOY_ENABLED/);
    });
  }

  it('deploy-api: optional env 4개를 빈 값으로 직접 --set-env-vars 하지 않는다', () => {
    const wf = read(DEPLOY[0]);
    assert.doesNotMatch(wf, /--set-env-vars="(AI_DEFAULT_PROVIDER|AI_DEFAULT_MODEL_OPENAI|TOSS_PAYMENTS_CLIENT_KEY|TOSS_PAYMENTS_SECRET_KEY)=/);
    assert.match(wf, /cloud-run-env\.mjs optional/);
    assert.match(wf, /"\$\{OPTIONAL_ENV\[@\]\}"/);
  });
});

describe('deploy-auto — 은퇴 (Unified Delivery P3 cutover)', () => {
  const wf = read('.github/workflows/deploy-auto.yml');
  const delivery = read('.github/workflows/delivery.yml');
  it('main CI 에 반응하지 않는다 — workflow_run trigger 0 (자동 경로는 delivery.yml 하나)', () => {
    assert.doesNotMatch(wf, /^\s+workflow_run:/m);
    assert.match(delivery, /workflow_run:\n\s+workflows: \['CI Pipeline'\]\n\s+types: \[completed\]\n\s+branches: \[main\]/);
    assert.throws(() => read('.github/workflows/cd-risk-gate-shadow.yml'), 'shadow workflow 는 은퇴');
  });
  it('job 은 수동 dispatch 로도 실행되지 않는다 (if: false) · 태그 · dispatch 권한 없음', () => {
    assert.match(wf, /decide-and-deploy:[\s\S]*?\n\s+if: false\n/);
    assert.match(wf, /permissions:\n\s+contents: read\n/);
    assert.doesNotMatch(wf, /contents: write|actions: write|statuses: write/);
  });
  it('cutover 는 같은 commit — delivery.yml 은 enforcement (두 자동 경로가 동시에 배포 권한을 갖지 않는다)', () => {
    assert.match(delivery, /DELIVERY_ENFORCE: 'true'/);
  });
  it('직접 배포 명령 0', () => {
    assert.doesNotMatch(wf, /gcloud run deploy|update-traffic|jobs execute|gh variable set/);
  });
});

describe('저장소 전체 — DEPLOY_ENABLED 는 배포 결정에 쓰이지 않는다', () => {
  it('workflow · actions 에 DEPLOY_ENABLED 참조 0', () => {
    for (const f of [...DEPLOY, '.github/workflows/deploy-auto.yml', '.github/workflows/ci-pipeline.yml', '.github/actions/cloud-run-verified-rollout/action.yml']) {
      assert.doesNotMatch(read(f), /DEPLOY_ENABLED/, f);
    }
  });
});

// WO-O4O-PUBLIC-COLLABORATOR-PRODUCTION-BOUNDARY-AND-MAIN-PROTECTION-V1
// production credential 은 `production` environment secret(배포 ref = main · deploy/* tag) 이다.
// credential 을 쓰는 job 이 environment 를 잃으면 secret 을 못 받거나, repository secret 으로 되돌아가는 회귀가 된다.
describe('Public collaborator 경계 — production credential 은 environment 안에서만 · 수동 실행은 소유자만', () => {
  const OWNER = "(github.event_name != 'workflow_dispatch' || github.triggering_actor == github.repository_owner)";
  const jobsUsingCredential = (wf) =>
    wf
      .split(/\n(?= {2}[a-z][a-z0-9-]*:\n)/)
      .filter((b) => /secrets\.(?!GITHUB_TOKEN\b)[A-Z]|google-github-actions\/auth@/.test(b));

  for (const file of [...DEPLOY, '.github/workflows/delivery.yml']) {
    it(`${file}: credential 을 쓰는 job 은 모두 environment: production`, () => {
      const blocks = jobsUsingCredential(read(file));
      assert.ok(blocks.length > 0, file);
      for (const b of blocks) assert.match(b, /^ {4}environment: production$/m, b.split('\n')[0]);
    });
  }
  for (const file of DEPLOY) {
    it(`${file}: ci-gate 는 직접 dispatch 를 소유자에게만 연다`, () => {
      const gate = read(file).split(/\n(?= {2}ci-gate:\n)/)[1].split(/\n(?= {2}[a-z][a-z0-9-]*:\n)/)[0];
      assert.ok(gate.includes(OWNER), file);
    });
  }
});

// WO-O4O-GITHUB-ACTIONS-GCP-WIF-CUTOVER-V1
// GCP 인증은 GitHub OIDC → WIF → github-actions SA impersonation 하나다. 장기 SA key(GCP_SA_KEY · credentials_json) 회귀를 막는다.
// provider 조건(repository_id · owner_id · environment=production · ref · 소유자 dispatch · 허용 workflow)은 GCP 쪽에 있다.
describe('GCP 인증 = WIF — 장기 SA key 0', () => {
  const PROVIDER = 'projects/117791934476/locations/global/workloadIdentityPools/github-actions/providers/o4o-platform';
  const SA = 'github-actions@netureyoutube.iam.gserviceaccount.com';
  const SMOKE = '.github/workflows/gcp-wif-auth-smoke.yml';
  const WIF_USERS = [...DEPLOY, '.github/workflows/delivery.yml', SMOKE];
  const ALL = [
    ...WIF_USERS,
    '.github/workflows/deploy-auto.yml',
    '.github/workflows/promote.yml',
    '.github/workflows/ci-pipeline.yml',
    '.github/actions/cloud-run-verified-rollout/action.yml',
    '.github/actions/setup-build-env/action.yml',
  ];
  const jobs = (wf) => wf.split(/\n(?= {2}[a-z][a-z0-9-]*:\n)/).filter((b) => /google-github-actions\/auth@/.test(b));

  it('workflow · action 에 GCP_SA_KEY · credentials_json 참조 0', () => {
    for (const f of ALL) assert.doesNotMatch(read(f), /GCP_SA_KEY|credentials_json/, f);
  });

  for (const file of WIF_USERS) {
    it(`${file}: 모든 auth step 이 같은 WIF provider · SA 를 쓴다`, () => {
      const wf = read(file);
      const auths = count(wf, /uses: google-github-actions\/auth@/g);
      assert.ok(auths > 0, file);
      assert.equal(count(wf, new RegExp(`workload_identity_provider: ${PROVIDER}$`, 'gm')), auths);
      assert.equal(count(wf, new RegExp(`service_account: ${SA.replace(/[.]/g, '\\.')}$`, 'gm')), auths);
    });

    it(`${file}: auth 를 쓰는 job 은 id-token: write 를 갖는다 (job 또는 workflow 수준)`, () => {
      const wf = read(file);
      const top = wf.split(/\njobs:\n/)[0];
      for (const b of jobs(wf)) {
        const jobPerms = b.match(/^ {4}permissions:\n((?: {6}.+\n)+)/m);
        const perms = jobPerms ? jobPerms[1] : top;
        assert.match(perms, /id-token: write/, b.split('\n')[0]);
      }
    });
  }

  it('smoke workflow: 수동 · 소유자 · production environment · read-only (배포 · secret · token 출력 0)', () => {
    const wf = read(SMOKE);
    assert.match(wf, /^on:\n {2}workflow_dispatch:\n/m);
    assert.match(wf, /if: github\.triggering_actor == github\.repository_owner/);
    assert.match(wf, /^ {4}environment: production$/m);
    assert.doesNotMatch(wf, /secrets\.|gcloud run deploy|update-traffic|jobs execute|print-access-token|print-identity-token|token_format/);
  });
});

// WO-O4O-PRODUCTION-SECRET-ENVIRONMENT-MIGRATION-AND-COLLABORATOR-SAFETY-CLOSURE-V1
// production credential 의 resolve scope 검증 — 값 출력 0 · 배포 · GCP 0 · 소유자만. repository-scope job 은 일부러
// environment 밖이다(collaborator branch workflow 와 같은 시야 — 이전 후 ABSENT 여야 한다).
describe('Production secret resolution check — 값 노출 0', () => {
  const FILE = '.github/workflows/production-secret-resolution-check.yml';
  // 주석(판정 안내 — `gh secret list --env production` 등)은 제외하고 실행 줄만 본다
  const wf = read(FILE)
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n');
  const NAMES = ['GCP_DB_NAME', 'GCP_DB_USERNAME', 'GCP_JWT_SECRET', 'SMTP_USER', 'SMTP_PASS', 'GEMINI_API_KEY', 'OPENAI_API_KEY'];

  it('수동 · 두 job 모두 소유자만 · environment-scope 만 production environment', () => {
    assert.match(wf, /^on:\n {2}workflow_dispatch:\n/m);
    assert.equal(count(wf, /if: github\.triggering_actor == github\.repository_owner/g), 2);
    assert.equal(count(wf, /^ {4}environment: production$/gm), 1);
    assert.match(wf, /\n {2}environment-scope:\n[\s\S]*?\n {4}environment: production\n/);
  });
  it('production credential 7개를 두 scope 에서 같은 이름으로 읽는다', () => {
    for (const n of NAMES) assert.equal(count(wf, new RegExp(`${n}: \\$\\{\\{ secrets\\.${n} \\}\\}`, 'g')), 2, n);
    assert.doesNotMatch(wf, /GCP_SA_KEY|GCP_DB_PASSWORD|E2E_/);
  });
  it('원문 · 전체 digest 출력 0 — fingerprint 는 sha256 앞 6자만 · 배포 · GCP · token 0', () => {
    assert.equal(count(wf, /digest\("hex"\)\.slice\(0, 6\)/g), 2);
    assert.doesNotMatch(wf, /echo "?\$\{?(GCP|SMTP|GEMINI|OPENAI)|console\.log\(v\)|console\.log\(process\.env\[n\]\)|base64/);
    assert.doesNotMatch(wf, /google-github-actions\/auth@|gcloud |id-token: write|gh secret|gh variable/);
    assert.match(wf, /^permissions:\n {2}contents: read\n/m);
  });
});

// WO-O4O-CLOUD-RUN-RUNTIME-SA-LEAST-PRIVILEGE-V1
// Cloud Run runtime identity = 전용 최소권한 SA. 플래그가 빠지면 새 서비스 · job 생성이 default compute SA(roles/editor) 로 돌아간다
// (github-actions 는 compute SA 에 actAs 권한이 없어 그 경로는 실패한다 — 명시 고정으로 막는다).
describe('Cloud Run runtime SA — 모든 deploy · job create/update 에 전용 SA 명시', () => {
  const RUNTIME_SA = 'o4o-runtime@netureyoutube.iam.gserviceaccount.com';
  for (const file of DEPLOY) {
    it(`${file}: env RUNTIME_SA = ${RUNTIME_SA}`, () => {
      assert.match(read(file), new RegExp(`^ {2}RUNTIME_SA: ${RUNTIME_SA.replace(/[.]/g, '\\.')}$`, 'm'));
    });
    it(`${file}: gcloud run deploy · jobs create · jobs update 수 == --service-account=\${{ env.RUNTIME_SA }} 수`, () => {
      const wf = read(file);
      const cmds = count(wf, /gcloud run (deploy|jobs create|jobs update) /g);
      assert.ok(cmds > 0, file);
      assert.equal(count(wf, /--service-account=\$\{\{ env\.RUNTIME_SA \}\}/g), cmds);
      assert.doesNotMatch(wf, /-compute@developer\.gserviceaccount\.com/);
    });
  }
});

// WO-O4O-GITHUB-ACTIONS-RUN-ADMIN-TO-DEVELOPER-V1
// github-actions = roles/run.developer (setIamPolicy 없음). 배포가 Cloud Run IAM 을 바꾸면 그 배포는 권한 부족으로 실패한다.
// 공개 접근(allUsers → run.invoker)은 서비스 IAM 에 이미 있고, 새 서비스는 최초 1회 소유자가 부여한다.
describe('Cloud Run IAM 무변경 배포 — github-actions run.developer', () => {
  const ALL = [...DEPLOY, '.github/workflows/delivery.yml', '.github/workflows/promote.yml', '.github/actions/cloud-run-verified-rollout/action.yml'];
  for (const file of ALL) {
    it(`${file}: --allow-unauthenticated · IAM policy 변경 명령 0`, () => {
      const wf = read(file);
      assert.doesNotMatch(wf, /--allow-unauthenticated|add-iam-policy-binding|remove-iam-policy-binding|set-iam-policy|--invoker-iam/);
    });
  }
  it('rollout 스크립트도 IAM 을 바꾸지 않는다 (update-traffic · describe 만)', () => {
    const src = read('scripts/ci/cloud-run-rollout.mjs');
    assert.doesNotMatch(src, /iam-policy|setIamPolicy|allow-unauthenticated/);
  });
});
