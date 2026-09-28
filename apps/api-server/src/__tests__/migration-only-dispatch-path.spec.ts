/**
 * migration 전용 실행 경로 — 회귀 가드
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (배포 2 전 경계 보정) item 1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 고정하는 계약
 *
 *   ① `migrate-api.yml` 은 **migration Job 하나만** 돌리고 멈춘다.
 *      `gcloud run deploy` · `update-traffic` · `:latest` 이동 · 다른 one-off job
 *      재고정이 들어오면 "migration 만" 이라는 성질이 사라진다.
 *
 *   ② push trigger 가 없다. 운영 DB 를 바꾸는 경로가 commit 으로 자동 실행되면 안 된다.
 *
 *   ③ `environment:` 를 붙이지 않는다. 이 경로의 존재 이유가 **승인 대기 타이밍에
 *      의존하지 않는 것**이다 (2026-09-27: 승인 대기 중 required reviewers 규칙 삭제로
 *      배포 2 시도가 미실행 종료 · 운영 변화 0).
 *      대신 게이트는 확인 문구 · SHA 형식 · origin/main 도달성 · 배포 게이트 닫힘이다.
 *
 *   ④ `DEPLOY_ENABLED` 를 열지 않아도 동작하고, **열려 있으면 거부**한다.
 *      열어 두면 main push 가 다른 코드까지 배포하므로 이 경로가 그것을 요구하면 안 되고,
 *      반대로 배포 경로가 살아 있는 동안 같은 Job 을 두 run 이 건드리면 안 된다.
 *
 *   ⑤ 이미지 빌드 정의는 **한 벌**이다. deploy 경로와 같은 composite action 을 쓴다.
 *      두 벌이면 tsc→백업→tsup→복원 순서 같은 것이 한쪽에만 남아 stale dist 가 나간다.
 *
 * 작성 원칙: 줄 번호에 의존하지 않는다. YAML 텍스트에서 계약만 단언한다.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, ...rel.split('/')), 'utf-8');

const MIGRATE_WF = '.github/workflows/migrate-api.yml';
const DEPLOY_WF = '.github/workflows/deploy-api.yml';
const BUILD_ACTION = '.github/actions/build-api-image/action.yml';

/** 주석(`#`)을 걷어낸 본문 — 설명 문구가 단언을 오탐시키지 않게 한다. */
function codeOnly(text: string): string {
  return text
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n');
}

describe('migration 전용 경로 — 파일 존재와 빌드 정의 단일화', () => {
  it('migrate-api.yml 과 build-api-image action 이 있다', () => {
    expect(fs.existsSync(path.join(REPO, ...MIGRATE_WF.split('/')))).toBe(true);
    expect(fs.existsSync(path.join(REPO, ...BUILD_ACTION.split('/')))).toBe(true);
  });

  it('두 경로가 같은 composite action 으로 이미지를 만든다 (정의 1벌)', () => {
    const mig = codeOnly(read(MIGRATE_WF));
    const dep = codeOnly(read(DEPLOY_WF));
    expect(mig).toContain('uses: ./.github/actions/build-api-image');
    expect(dep).toContain('uses: ./.github/actions/build-api-image');
    // 빌드 절차가 workflow 안에 다시 인라인되지 않았다.
    for (const wf of [mig, dep]) {
      expect(wf).not.toContain('docker buildx build');
      expect(wf).not.toContain('pnpm run build:api');
    }
  });

  it('composite action 은 빌드 불변식을 그대로 갖고 있다 (이동이지 재작성이 아니다)', () => {
    const act = read(BUILD_ACTION);
    // tsc(migrations) → 백업 → tsup → 복원 순서
    expect(act).toContain('pnpm run build');
    expect(act).toContain('pnpm run build:api');
    expect(act).toContain('/tmp/database-backup');
    expect(act).toContain('migration-config.js');
    // stale dist 재발 방지
    expect(act).toContain('CACHEBUST');
    // 번들 존재 확인 (main.js = 서비스, migrate.js = Job)
    expect(act).toContain('dist/main.js');
    expect(act).toContain('dist/migrate.js');
    // digest 를 남긴다 — 태그는 움직일 수 있다
    expect(act).toContain('digest=');
  });

  it('`:latest` 이동은 입력으로만 일어난다 (기본값은 이동하지 않음)', () => {
    const act = read(BUILD_ACTION);
    expect(act).toMatch(/push_latest:[\s\S]{0,200}?default: 'false'/);
    expect(act).toContain('LATEST_TAG_ARGS');
    const mig = codeOnly(read(MIGRATE_WF));
    expect(mig).toMatch(/push_latest:\s*'false'/);
  });
});

describe('migration 전용 경로 — 트리거와 게이트', () => {
  const raw = read(MIGRATE_WF);
  const code = codeOnly(raw);

  it('workflow_dispatch 전용이다 (push · schedule trigger 0)', () => {
    expect(code).toContain('workflow_dispatch:');
    // `on:` 블록에 push/schedule 가 없다. 들여쓰기 2칸 키만 본다.
    expect(code).not.toMatch(/^\s{2}push:/m);
    expect(code).not.toMatch(/^\s{2}schedule:/m);
  });

  it('environment 를 붙이지 않는다 (승인 대기 타이밍 비의존)', () => {
    expect(code).not.toMatch(/^\s+environment:/m);
  });

  it('DEPLOY_ENABLED 를 실행 조건으로 요구하지 않고, 열려 있으면 거부한다', () => {
    // `if: vars.DEPLOY_ENABLED == 'true'` 같은 job 게이트가 없다.
    expect(code).not.toMatch(/if:[^\n]*DEPLOY_ENABLED\s*==\s*'true'/);
    // 대신 런타임에서 거부한다.
    expect(code).toContain('DEPLOY_ENABLED');
    expect(code).toMatch(/if \[ "\$\{DEPLOY_ENABLED\}" = "true" \]; then[\s\S]{0,400}?exit 1/);
  });

  it('확인 문구와 SHA 형식을 검증한다', () => {
    expect(code).toContain('RUN-MIGRATIONS-ON-PRODUCTION');
    expect(code).toContain('[0-9a-f]{40}');
  });

  it('origin/main 에서 도달 가능한 commit 만 허용한다', () => {
    expect(code).toContain('git merge-base --is-ancestor');
    expect(code).toContain('origin/main');
  });
});

describe('migration 전용 경로 — 배포를 하지 않는다', () => {
  const code = codeOnly(read(MIGRATE_WF));

  it('Cloud Run 서비스 배포·트래픽 전환이 없다', () => {
    expect(code).not.toContain('gcloud run deploy');
    expect(code).not.toContain('update-traffic');
    expect(code).not.toContain('run services update');
  });

  it('migration Job 하나만 건드린다 (다른 one-off job 재고정 0)', () => {
    const jobWrites = code
      .split('\n')
      .filter((l) => /gcloud run jobs (create|update)/.test(l));
    expect(jobWrites.length).toBeGreaterThan(0);
    // 모두 MIGRATION_JOB 변수를 쓴다 — 이름을 직접 박은 다른 job 이 없다.
    for (const line of jobWrites) {
      expect(line).toContain('"${MIGRATION_JOB}"');
    }
    expect(code).toContain('MIGRATION_JOB: o4o-api-migrations');
  });

  it('canonical runner 를 쓰고 실패를 삼키지 않는다', () => {
    expect(code).toContain('--args="dist/migrate.js"');
    expect(code).toContain('gcloud run jobs execute "${MIGRATION_JOB}"');
    expect(code).toContain('--wait');
    expect(code).not.toContain('continue-on-error');
    // 실행 step 에서 실패를 흡수하지 않는다. `|| \` 로 이어지는 create→update fallback 은
    // deploy 경로와 동일한 형태이므로 `|| true` 만 금지한다.
    expect(code).not.toMatch(/\|\|\s*true\b/);
  });

  it('실행 결과를 요약에 남긴다 (workflow success 만으로는 무엇이 돌았는지 모른다)', () => {
    expect(code).toContain('GITHUB_STEP_SUMMARY');
    expect(code).toContain('jobs executions list');
  });
});

describe('기존 배포 경로는 그대로다', () => {
  const code = codeOnly(read(DEPLOY_WF));

  it('DEPLOY_ENABLED fail-closed 게이트와 production environment 가 유지된다', () => {
    expect(code).toMatch(/vars\.DEPLOY_ENABLED == 'true'/);
    expect(code).toContain('environment: production');
  });

  it('migration → deploy 순서와 canonical runner 가 유지된다', () => {
    const migAt = code.indexOf('gcloud run jobs execute o4o-api-migrations');
    const depAt = code.indexOf('gcloud run deploy');
    expect(migAt).toBeGreaterThan(-1);
    expect(depAt).toBeGreaterThan(migAt);
    expect(code).toContain('--args="dist/migrate.js"');
  });

  it('push trigger 는 그대로 유지된다 (배포 경로는 자동 실행이 정상이다)', () => {
    expect(code).toMatch(/^\s{2}push:/m);
  });
});
