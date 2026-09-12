/**
 * WO-O4O-DATABASE-MIGRATION-OWNERSHIP-STARTUP-HEALTH-AND-LEGACY-DEPLOY-TOOLING-FINAL-CLOSURE-V1
 * — canonical 회귀 가드
 *
 * 고정하는 계약 (WO §8):
 *   8.1 startup        — API startup 은 migration 을 실행하지 않는다
 *   8.2 migration owner — deploy workflow 의 migration job 이 유일한 소유자이고, 성공이 deploy 의 선행 조건
 *   8.3 독립 runner     — 구형 standalone runner · dangling package script · 하드코딩 자격정보 0
 *   8.4 health         — 항상-성공 검사기(DatabaseChecker) 0 · readiness/liveness 계약 유지
 *   8.5 PM2            — PM2 script 0 · 부재 파일 참조 0 · Cloud Run 시작 명령 유지
 *
 * 작성 원칙 (WO §8 마지막 문단): 줄 번호·전문 복사에 의존하지 않는다. 주석을 제거한 코드에서
 * 호출 형태만 단언하고, workflow 는 YAML 을 파싱해 step 순서·설정을 본다.
 *
 * 근거 정본: docs/checks/CHECK-O4O-DATABASE-MIGRATION-OWNERSHIP-STARTUP-HEALTH-AND-LEGACY-DEPLOY-TOOLING-FINAL-CLOSURE-V1.md
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const API = path.join(REPO, 'apps', 'api-server');
const abs = (rel: string) => path.join(REPO, ...rel.split('/'));
const exists = (rel: string) => fs.existsSync(abs(rel));
const read = (rel: string) => fs.readFileSync(abs(rel), 'utf-8');
/** 제거 근거 주석이 단언을 오탐시키지 않도록 주석을 걷어낸다. */
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

const STARTUP = 'apps/api-server/src/services/startup.service.ts';
const WORKFLOW = 'apps/api-server/../../.github/workflows/deploy-api.yml';

/** 최소 YAML step 파서 — `- name:` 으로 시작하는 step 블록을 순서대로 자른다 (외부 의존 없음). */
function workflowSteps(): Array<{ name: string; body: string }> {
  const text = read(WORKFLOW);
  const lines = text.split('\n');
  const out: Array<{ name: string; body: string }> = [];
  let cur: { name: string; body: string[] } | null = null;
  for (const line of lines) {
    const m = /^\s{4}-\s+name:\s*(.+?)\s*$/.exec(line);
    if (m) {
      if (cur) out.push({ name: cur.name, body: cur.body.join('\n') });
      cur = { name: m[1], body: [] };
    } else if (cur) {
      cur.body.push(line);
    }
  }
  if (cur) out.push({ name: cur.name, body: cur.body.join('\n') });
  return out;
}

// ---------------------------------------------------------------------------

describe('8.1 startup — API startup 은 migration 을 실행하지 않는다', () => {
  const src = code(STARTUP);

  it.each([
    ['runMigrations(', /runMigrations\s*\(/],
    ['showMigrations(', /showMigrations\s*\(/],
    ['migration.up(queryRunner) 직접 실행', /\.up\s*\(\s*queryRunner\s*\)/],
    ['Seed migration 필터 fallback', /\.migrations\s*\.filter\s*\(/],
    ['migration 용 createQueryRunner', /createQueryRunner\s*\(/],
  ])('startup 소스에 %s 가 없다', (_label, re) => {
    expect(src).not.toMatch(re);
  });

  it('startup 은 DatabaseChecker 를 더 이상 사용하지 않는다', () => {
    expect(src).not.toMatch(/DatabaseChecker/);
    expect(src).not.toMatch(/database-checker/);
  });

  it('DB 연결 재시도와 GRACEFUL_STARTUP 정책은 보존된다 (제거 범위 밖)', () => {
    expect(src).toMatch(/AppDataSource\.initialize\s*\(/);
    expect(src).toMatch(/GRACEFUL_STARTUP/);
  });
});

describe('8.2 migration owner — deploy workflow 의 migration job 이 유일한 소유자', () => {
  const steps = workflowSteps();
  const names = steps.map((s) => s.name);
  const idx = (n: string) => names.indexOf(n);

  it('workflow 에 migration job step 이 있고 canonical runner(dist/migrate.js) 를 쓴다', () => {
    const mig = steps.find((s) => s.name === 'Run database migrations');
    expect(mig).toBeDefined();
    expect(mig!.body).toMatch(/gcloud run jobs execute o4o-api-migrations/);
    expect(mig!.body).toMatch(/dist\/migrate\.js/);
    expect(mig!.body).toMatch(/--wait/);
  });

  it('migration job 은 "Deploy to Cloud Run" 보다 앞에서 실행된다 (성공이 deploy 의 선행 조건)', () => {
    expect(idx('Build and Push Docker image')).toBeGreaterThan(-1);
    expect(idx('Run database migrations')).toBeGreaterThan(idx('Build and Push Docker image'));
    expect(idx('Deploy to Cloud Run')).toBeGreaterThan(idx('Run database migrations'));
  });

  it('migration job 실패를 무시하는 설정이 없다', () => {
    const mig = steps.find((s) => s.name === 'Run database migrations')!;
    expect(mig.body).not.toMatch(/continue-on-error/);
    expect(mig.body).not.toMatch(/\|\|\s*true\b/);
  });

  it('API service 의 시작 명령에 migration 실행이 없다', () => {
    const dockerfile = read('apps/api-server/Dockerfile');
    const cmd = /^CMD\s+\[(.+)\]/m.exec(dockerfile)?.[1] ?? '';
    expect(cmd).toContain('dist/main.js');
    expect(cmd).not.toMatch(/migrat/);
    const deploy = steps.find((s) => s.name === 'Deploy to Cloud Run')!;
    expect(deploy.body).not.toMatch(/migrate\.js|migration:run/);
  });

  it('migration job 진입점(migrate.ts)은 실패 시 exit 1 이며 history 테이블을 쓴다', () => {
    const m = code('apps/api-server/src/migrate.ts');
    expect(m).toMatch(/process\.exit\(1\)/);
    expect(m).toMatch(/migrationsTableName:\s*'typeorm_migrations'/);
    expect(m).toMatch(/transaction:\s*'each'/);
  });
});

describe('8.3 독립 runner — 구형 standalone runner · dangling script · 하드코딩 자격정보 0', () => {
  it.each([
    ['apps/api-server/scripts/run-migration-standalone.mjs'],
    ['apps/api-server/scripts/run-migrations.mjs'],
    ['apps/api-server/scripts/run-migration.js'],
    ['apps/api-server/scripts/fix-user-roles-table.mjs'],
    ['apps/api-server/src/utils/database-checker.ts'],
  ])('%s 가 없다', (rel) => {
    expect(exists(rel)).toBe(false);
  });

  it('package.json 에 migration:run:prod (dangling dist/database/run-migration.js) 가 없다', () => {
    const pkg = JSON.parse(read('apps/api-server/package.json')) as { scripts: Record<string, string> };
    expect(pkg.scripts['migration:run:prod']).toBeUndefined();
    for (const v of Object.values(pkg.scripts)) {
      expect(v).not.toMatch(/run-migration-standalone|run-migrations\.mjs|database\/run-migration\.js/);
    }
  });

  it('api-server scripts/ 에 DB 자격정보 fallback 하드코딩이 없다', () => {
    const dir = path.join(API, 'scripts');
    const offenders: string[] = [];
    for (const f of fs.readdirSync(dir)) {
      if (!/\.(mjs|js|ts)$/.test(f)) continue;
      const body = fs.readFileSync(path.join(dir, f), 'utf-8');
      if (/password:\s*process\.env\.DB_PASSWORD\s*\|\|\s*['"]/.test(body)) offenders.push(f);
      if (/DB_PASSWORD\s*\|\|\s*['"][^'"]+['"]/.test(body)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it('로컬 개발용 TypeORM CLI migration 명령은 보존된다', () => {
    const pkg = JSON.parse(read('apps/api-server/package.json')) as { scripts: Record<string, string> };
    for (const k of ['migration:run', 'migration:show', 'migration:revert', 'migration:generate', 'db:setup']) {
      expect(pkg.scripts[k]).toBeDefined();
    }
  });
});

describe('8.4 health — 항상-성공 검사기 0 · readiness/liveness 계약 유지', () => {
  it('requiredTables=[] · pending=[] 상수 로 무조건 성공하던 DatabaseChecker 가 없다', () => {
    expect(exists('apps/api-server/src/utils/database-checker.ts')).toBe(false);
    const hits: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (!/node_modules|dist|__tests__/.test(e.name)) walk(p); continue; }
        if (!/\.ts$/.test(e.name)) continue;
        if (/DatabaseChecker|database-checker/.test(fs.readFileSync(p, 'utf-8').replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, ''))) hits.push(path.relative(REPO, p));
      }
    };
    walk(path.join(API, 'src'));
    expect(hits).toEqual([]);
  });

  it('은퇴한 themes/posts/pages/products/orders 를 현재 정본처럼 검사하는 optionalTables 가 없다', () => {
    const src = fs.readdirSync(path.join(API, 'src', 'utils')).filter((f) => f.endsWith('.ts'))
      .map((f) => code(`apps/api-server/src/utils/${f}`)).join('\n');
    expect(src).not.toMatch(/optionalTables\s*=/);
  });

  it('readiness 는 실제 DB 질의로 판정하고 실패 시 503 을 반환한다 (계약 유지)', () => {
    const h = code('apps/api-server/src/routes/health.ts');
    expect(h).toMatch(/router\.get\('\/ready'/);
    expect(h).toMatch(/SELECT 1/);
    expect(h).toMatch(/status\(503\)/);
  });

  it('liveness(/health) 는 DB 와 무관하게 즉시 200 을 반환한다 (Cloud Run probe · deploy verify 계약 유지)', () => {
    const main = code('apps/api-server/src/main.ts');
    const m = /app\.get\('\/health'[\s\S]{0,400}?status\((\d+)\)/.exec(main);
    expect(m?.[1]).toBe('200');
  });
});

describe('8.5 PM2 — script 0 · 부재 파일 참조 0 · Cloud Run 시작 명령 유지', () => {
  const pkg = JSON.parse(read('apps/api-server/package.json')) as { scripts: Record<string, string> };

  it('PM2 · deploy:* · monitor · validate:env script 가 없다', () => {
    const keys = Object.keys(pkg.scripts);
    expect(keys.filter((k) => /^pm2:|^deploy:|^monitor$|^validate:env$/.test(k))).toEqual([]);
    for (const v of Object.values(pkg.scripts)) {
      expect(v).not.toMatch(/\bpm2\b|ecosystem\.config|pm2-monitor|pm2-env-validator/);
    }
  });

  it('script 가 참조하는 apps/api-server 내부 파일은 모두 존재한다 (dangling 0)', () => {
    const missing: string[] = [];
    for (const [k, v] of Object.entries(pkg.scripts)) {
      // 경로 토큰 전체를 잡는다: `scripts/x.ts` · `src/scripts/x.ts` · `../../scripts/x.js` · `scripts/dev/x.ts`
      // (부분 문자열 `scripts/x` 만 잡으면 src/ · ../../ 접두 경로가 오탐된다)
      for (const ref of v.matchAll(/(?<![\w./-])((?:\.\.\/)*(?:src\/)?scripts\/[\w./-]+\.(?:mjs|js|ts|sh|sql))(?![\w./-])/g)) {
        if (!fs.existsSync(path.resolve(API, ref[1]))) missing.push(`${k} → ${ref[1]}`);
      }
      for (const ref of v.matchAll(/\b(ecosystem\.config[\w.]*\.c?js)\b/g)) {
        if (!fs.existsSync(path.join(API, ref[1]))) missing.push(`${k} → ${ref[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('Cloud Run canonical 시작 명령(dist/main)과 개발 명령이 보존된다', () => {
    expect(pkg.scripts.start).toMatch(/dist\/main\b/);
    expect(pkg.scripts['start:prod']).toMatch(/dist\/main\b/);
    expect(pkg.scripts.dev).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
  });
});
