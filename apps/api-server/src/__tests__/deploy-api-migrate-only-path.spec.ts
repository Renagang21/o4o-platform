/**
 * deploy-api.yml — MIGRATE-ONLY 경로 계약 · 일반 배포 경로 불변
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 — 배포 2 전 경계 보정.
 *   배포 2 는 migration 6·7·8·9 → 공식 CLI dry-run → 사용자 판단 → --apply → API 전환 순서다.
 *   종전 경로(`build-and-deploy` 한 잡 = 이미지 → migration → API 배포)에는 migration 과 API 사이에
 *   멈춤 지점이 없고, 승인 대기(required reviewers)에 기대던 절차는 그 규칙이 삭제되며 쓸 수 없게 됐다.
 *   그래서 `workflow_dispatch` 입력 `migrate_only=true` 를 두었다:
 *     - (당시) `DEPLOY_ENABLED` 게이트를 열지 않고 실행. WO-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1 이후 게이트는
 *       `DEPLOY_FREEZE` 이며 migrate_only 에도 적용된다(freeze 중 = migration 0). push trigger 는 은퇴했다.
 *     - 태그 ref(`refs/tags/deploy/*`) + expected_sha 일치를 먼저 검사 (fail-closed)
 *     - migration Job 을 방금 push 한 이미지 digest 로 고정
 *     - Deploy · Verify step 은 실행하지 않는다
 *
 * 이 spec 은 조건식을 시나리오별로 **실제 평가**해 두 경로를 고정한다. 네트워크 · DB 0.
 */
import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const WF_TEXT = fs.readFileSync(path.join(REPO, '.github', 'workflows', 'deploy-api.yml'), 'utf-8');
const WF = YAML.parse(WF_TEXT);

type Ctx = {
  eventName: 'push' | 'workflow_dispatch';
  /** 'true' = 배포 가능(DEPLOY_FREEZE='false') · 그 외 = freeze */
  gate: string;
  affected?: string;
  inputs?: Record<string, string>;
};

/**
 * GitHub Actions 식을 이 워크플로가 쓰는 부분집합으로만 평가한다.
 * (문자열 비교 · && · || · 괄호. `github.event.inputs` 는 push 에서 null.)
 */
function evaluate(expr: string, c: Ctx): boolean {
  const inputs = c.eventName === 'workflow_dispatch' ? { force_deploy: 'false', base_sha: '', head_sha: '', migrate_only: 'false', expected_sha: '', ...c.inputs } : undefined;
  const js = expr
    .replace(/\s+/g, ' ')
    // DEPLOY_FREEZE: 'false' 일 때만 배포 가능 — gate 'true' ↔ freeze 'false'
    .replace(/vars\.DEPLOY_FREEZE/g, "(__gate === 'true' ? 'false' : 'true')")
    .replace(/needs\.detect\.outputs\.api_deploy_affected/g, '__affected')
    .replace(/github\.event_name/g, '__event')
    .replace(/github\.event\.inputs\.(\w+)/g, (_m, k: string) => `__in(${JSON.stringify(k)})`);
  if (/[a-z_]+\.[a-z_]+/i.test(js.replace(/'[^']*'/g, '').replace(/__in\("[^"]*"\)/g, ''))) {
    throw new Error(`평가기가 모르는 식: ${expr}`);
  }
  // GH: null != 'true' → true, null == 'true' → false (JS == 와 같은 결과만 쓴다)
  const fn = new Function('__gate', '__affected', '__event', '__in', `return (${js});`);
  return Boolean(fn(c.gate, c.affected ?? 'true', c.eventName, (k: string) => (inputs ? inputs[k] : null)));
}

const job = WF.jobs['build-and-deploy'];
const holdNotice = WF.jobs['freeze-notice'];
const steps: Array<{ name: string; if?: string; run?: string }> = job.steps;
const stepRuns = (name: string, c: Ctx) => {
  const s = steps.find((x) => x.name === name);
  if (!s) throw new Error(`step 없음: ${name}`);
  return s.if ? evaluate(s.if, c) : true;
};

const DEPLOY_STEPS = ['Deploy to Cloud Run', 'Verify deployment'];
const MIGRATE_ONLY_STEPS = ['Migrate-only preflight (tag ref · SHA 고정 검사)', 'Migrate-only stop (API traffic 불변 기록)'];

describe('입력 계약', () => {
  it('workflow_dispatch 에 migrate_only · expected_sha 입력이 있다 (기본 false · 빈 값)', () => {
    const inputs = WF.on.workflow_dispatch.inputs;
    expect(inputs.migrate_only.default).toBe('false');
    expect(inputs.expected_sha.default).toBe('');
  });

  it('push trigger 는 은퇴했다 — 자동 배포는 deploy-auto.yml 의 dispatch 로만 (WO-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1)', () => {
    expect(WF.on.push).toBeUndefined();
    expect(WF.on.workflow_dispatch).toBeDefined();
    expect(WF.on.workflow_dispatch.inputs.rollout_mode.default).toBe('verified');
  });
});

describe('일반 배포 경로 — 종전과 같다', () => {
  it.each<[string, Ctx, boolean]>([
    ['push · 게이트 열림 · 영향 있음 → 실행', { eventName: 'push', gate: 'true' }, true],
    ['push · 게이트 닫힘 → skip', { eventName: 'push', gate: 'false' }, false],
    ['push · 게이트 열림 · 영향 없음 → skip', { eventName: 'push', gate: 'true', affected: 'false' }, false],
    ['수동 · 게이트 닫힘 → skip', { eventName: 'workflow_dispatch', gate: 'false' }, false],
    ['수동 · 게이트 열림 → 실행', { eventName: 'workflow_dispatch', gate: 'true' }, true],
    ['판정 재현(base_sha) · force 없음 → skip', { eventName: 'workflow_dispatch', gate: 'true', inputs: { base_sha: 'a'.repeat(40) } }, false],
    ['판정 재현(base_sha) · force → 실행', { eventName: 'workflow_dispatch', gate: 'true', inputs: { base_sha: 'a'.repeat(40), force_deploy: 'true' } }, true],
  ])('%s', (_label, c, expected) => {
    expect(evaluate(job.if, c)).toBe(expected);
  });

  it('일반 실행에서는 배포 step 이 전부 돌고 migrate-only step 은 돌지 않는다', () => {
    for (const c of [{ eventName: 'push', gate: 'true' }, { eventName: 'workflow_dispatch', gate: 'true' }] as Ctx[]) {
      for (const s of DEPLOY_STEPS) expect(stepRuns(s, c)).toBe(true);
      for (const s of MIGRATE_ONLY_STEPS) expect(stepRuns(s, c)).toBe(false);
      expect(stepRuns('Run database migrations', c)).toBe(true);
    }
  });

  it('게이트 닫힘 안내 job 은 일반 실행에서 그대로 뜬다', () => {
    expect(evaluate(holdNotice.if, { eventName: 'push', gate: 'false' })).toBe(true);
    expect(evaluate(holdNotice.if, { eventName: 'push', gate: 'true' })).toBe(false);
  });
});

describe('MIGRATE-ONLY 경로', () => {
  const mo = (gate: string): Ctx => ({
    eventName: 'workflow_dispatch',
    gate,
    inputs: { migrate_only: 'true', expected_sha: 'b'.repeat(40) },
  });

  it('freeze 가 아니면 잡이 열린다 (detect 결과와 무관)', () => {
    expect(evaluate(job.if, mo('true'))).toBe(true);
    expect(evaluate(job.if, { ...mo('true'), affected: 'false' })).toBe(true);
  });

  it('DEPLOY_FREEZE 중에는 migrate_only 도 열리지 않는다 (cutover 정책 — freeze = migration 0)', () => {
    expect(evaluate(job.if, mo('false'))).toBe(false);
  });

  it('게이트가 열려 있어도 배포 step 은 돌지 않는다 — migration 후 정지', () => {
    for (const gate of ['false', 'true']) {
      for (const s of DEPLOY_STEPS) expect(stepRuns(s, mo(gate))).toBe(false);
      for (const s of MIGRATE_ONLY_STEPS) expect(stepRuns(s, mo(gate))).toBe(true);
      expect(stepRuns('Run database migrations', mo(gate))).toBe(true);
      expect(stepRuns('Build and Push Docker image', mo(gate))).toBe(true);
    }
  });

  it('freeze 안내는 freeze 일 때만 — migrate_only 여부와 무관 (freeze 중 migration 도 0 이므로 안내가 맞다)', () => {
    expect(evaluate(holdNotice.if, mo('false'))).toBe(true);
    expect(evaluate(holdNotice.if, mo('true'))).toBe(false);
  });

  it('push 이벤트로는 migrate-only 가 될 수 없다', () => {
    expect(evaluate(job.if, { eventName: 'push', gate: 'false' })).toBe(false);
  });

  it('preflight 가 첫 step 이고 태그 ref · 40자 SHA · 일치를 검사한다 (fail-closed)', () => {
    expect(steps[0].name).toBe(MIGRATE_ONLY_STEPS[0]);
    const run = steps[0].run ?? '';
    expect(run).toContain('refs/tags/deploy/*');
    expect(run).toMatch(/\^\[0-9a-f\]\{40\}\$/);
    expect(run).toMatch(/"\$\{EXPECTED_SHA\}" != "\$\{GITHUB_SHA\}"/);
    expect((run.match(/exit 1/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('migration Job 은 migrate_only 에서 방금 push 한 digest 로 고정된다', () => {
    const build = steps.find((s) => s.name === 'Build and Push Docker image')!.run ?? '';
    expect(build).toContain('IMAGE_DIGEST=${IMAGE_DIGEST}');
    const mig = steps.find((s) => s.name === 'Run database migrations')!.run ?? '';
    expect(mig).toMatch(/migrate_only \}\}" = "true"[\s\S]*@\$\{\{ env\.IMAGE_DIGEST \}\}/);
    expect(mig).toContain('gcloud run jobs execute o4o-api-migrations');
    expect(mig).toContain('--wait');
  });

  it('migrate_only 빌드는 :latest 를 옮기지 않는다', () => {
    const build = steps.find((s) => s.name === 'Build and Push Docker image')!.run ?? '';
    expect(build).toMatch(/migrate_only \}\}" != "true"[\s\S]*TAG_ARGS\+=\(--tag "\$\{LATEST_IMAGE\}"\)/);
  });

  it('정지 step 은 쓰기 명령이 없다 (describe · list 만)', () => {
    const stop = steps.find((s) => s.name === MIGRATE_ONLY_STEPS[1])!.run ?? '';
    expect(stop).toMatch(/services describe/);
    expect(stop).not.toMatch(/\b(deploy|update|update-traffic|execute|delete)\b/);
  });

  it('순서: 이미지 push → migration → 정지 → (배포 step 은 migrate_only 에서 skip)', () => {
    const idx = (n: string) => steps.findIndex((s) => s.name === n);
    expect(idx('Build and Push Docker image')).toBeLessThan(idx('Run database migrations'));
    expect(idx('Run database migrations')).toBeLessThan(idx(MIGRATE_ONLY_STEPS[1]));
    expect(idx(MIGRATE_ONLY_STEPS[1])).toBeLessThan(idx('Deploy to Cloud Run'));
  });
});
