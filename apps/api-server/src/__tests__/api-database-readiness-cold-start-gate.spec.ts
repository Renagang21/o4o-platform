/**
 * API DB readiness · 콜드스타트 트래픽 게이트 계약
 *
 * WO-O4O-API-DATABASE-READINESS-AND-COLD-START-TRAFFIC-GATE-FINAL-CLOSURE-V1
 *
 * 고정하는 계약
 *   1. HTTP listen 은 DB 연결(startupService.initialize) · 도메인 라우트 등록 · READY 전환 뒤에만 호출된다.
 *   2. 프로덕션에서 DB 연결 실패 = process exit non-zero. GRACEFUL_STARTUP 은 프로덕션에서 무시된다.
 *   3. DB 재시도는 상한이 있고(5회 · 15s · 백오프) 총 예산이 Cloud Run startup probe(240s) 안이다.
 *   4. /health/ready 는 상태 정본 READY + DB SELECT 1 일 때만 200, 그 외 503. catch 로 200 을 만들지 않는다.
 *   5. liveness(/health) 와 readiness(/health/ready) 의미가 분리된다.
 *   6. startup 은 migration · seed .up() 을 실행하지 않는다(선행 계약 보존).
 *   7. deploy workflow: migration job → deploy 순서 · GRACEFUL_STARTUP env 0 · 배포 검증은 /health/ready · 실패 삼킴 0.
 *   8. shutdown 은 SHUTTING_DOWN 으로 전환해 readiness 를 내린다.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  transitionStartupState,
  getStartupState,
  isServerReady,
  isGracefulStartupAllowed,
  __resetStartupStateForTests,
  DB_CONNECT_MAX_ATTEMPTS,
  DB_CONNECT_ATTEMPT_TIMEOUT_MS,
  DB_CONNECT_RETRY_BASE_DELAY_MS,
  DB_CONNECT_TOTAL_BUDGET_MS,
} from '../bootstrap/startup-state.js';

const SRC = join(__dirname, '..');
const REPO = join(SRC, '..', '..', '..');
const read = (p: string) => readFileSync(p, 'utf8');
/** 주석 줄 제거 — 판정 근거 주석이 코드 계약처럼 읽히지 않게 한다. */
const code = (p: string) =>
  read(p)
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');

const CLOUD_RUN_STARTUP_PROBE_TIMEOUT_MS = 240_000; // 현재 revision: tcpSocket · timeoutSeconds 240 · failureThreshold 1

describe('startup-state — 상태 전환 정본', () => {
  beforeEach(() => __resetStartupStateForTests());

  it('STARTING → DB_CONNECTING → READY 순서로만 준비 상태가 된다', () => {
    expect(getStartupState()).toBe('STARTING');
    expect(isServerReady()).toBe(false);
    transitionStartupState('DB_CONNECTING');
    expect(isServerReady()).toBe(false);
    transitionStartupState('READY');
    expect(isServerReady()).toBe(true);
  });

  it('STARTING 에서 곧바로 READY 로 건너뛸 수 없다 (DB 단계 생략 금지)', () => {
    expect(() => transitionStartupState('READY')).toThrow(/Invalid startup state transition/);
    expect(isServerReady()).toBe(false);
  });

  it('FAILED · SHUTTING_DOWN 은 종단 상태다', () => {
    transitionStartupState('DB_CONNECTING');
    transitionStartupState('FAILED', 'database-connect');
    expect(() => transitionStartupState('READY')).toThrow();
    __resetStartupStateForTests();
    transitionStartupState('DB_CONNECTING');
    transitionStartupState('READY');
    transitionStartupState('SHUTTING_DOWN', 'SIGTERM');
    expect(isServerReady()).toBe(false);
    expect(() => transitionStartupState('READY')).toThrow();
  });

  it('GRACEFUL_STARTUP 은 프로덕션에서 항상 무시된다', () => {
    expect(isGracefulStartupAllowed({ NODE_ENV: 'production' })).toBe(false);
    expect(isGracefulStartupAllowed({ NODE_ENV: 'production', GRACEFUL_STARTUP: 'true' })).toBe(false);
    expect(isGracefulStartupAllowed({ NODE_ENV: 'development' })).toBe(true);
    expect(isGracefulStartupAllowed({ NODE_ENV: 'development', GRACEFUL_STARTUP: 'false' })).toBe(false);
    expect(isGracefulStartupAllowed({ NODE_ENV: 'test' })).toBe(true);
  });
});

describe('DB 연결 재시도 예산', () => {
  it('상한이 명시돼 있고 무한 재시도가 아니다', () => {
    expect(DB_CONNECT_MAX_ATTEMPTS).toBeGreaterThan(0);
    expect(DB_CONNECT_MAX_ATTEMPTS).toBeLessThanOrEqual(10);
    expect(DB_CONNECT_ATTEMPT_TIMEOUT_MS).toBeGreaterThan(0);
    expect(DB_CONNECT_RETRY_BASE_DELAY_MS).toBeGreaterThan(0);
  });

  it('총 예산이 Cloud Run startup probe timeout(240s) 안에 들어온다', () => {
    // 5 × 15s + (3 + 6 + 9 + 12)s = 105s
    expect(DB_CONNECT_TOTAL_BUDGET_MS).toBe(105_000);
    expect(DB_CONNECT_TOTAL_BUDGET_MS).toBeLessThan(CLOUD_RUN_STARTUP_PROBE_TIMEOUT_MS);
  });

  it('startup.service 의 루프가 상수를 쓰고 고정 긴 sleep 이 없다', () => {
    const s = code(join(SRC, 'services', 'startup.service.ts'));
    expect(s).toMatch(/const maxRetries = DB_CONNECT_MAX_ATTEMPTS/);
    expect(s).toMatch(/DB_CONNECT_ATTEMPT_TIMEOUT_MS\)/);
    expect(s).not.toMatch(/setTimeout\([^)]*,\s*\d{5,}\)/); // 5자리 이상 고정 ms 없음
  });
});

describe('main.ts — listen 은 DB 준비 · 라우트 등록 · READY 이후에만', () => {
  const main = code(join(SRC, 'main.ts'));
  const idx = (re: RegExp) => {
    const m = re.exec(main);
    return m ? m.index : -1;
  };

  it('startupService.initialize() → registerDomainRoutes → READY 전환 → httpServer.listen 순서다', () => {
    const iInit = idx(/await startupService\.initialize\(\)/);
    const iRoutes = idx(/await registerDomainRoutes\(app/);
    const iReady = idx(/transitionStartupState\('READY'\)/);
    const iListen = idx(/httpServer\.listen\(/);
    expect(iInit).toBeGreaterThan(-1);
    expect(iRoutes).toBeGreaterThan(iInit);
    expect(iReady).toBeGreaterThan(iRoutes);
    expect(iListen).toBeGreaterThan(iReady);
  });

  it('listen 호출은 정확히 한 곳이다', () => {
    expect(main.match(/httpServer\.listen\(/g)?.length).toBe(1);
  });

  it('초기화 실패는 프로덕션에서 exit(1) 이며 GRACEFUL 분기는 isGracefulStartupAllowed 로만 열린다', () => {
    expect(main).toMatch(/if \(!isGracefulStartupAllowed\(\)\) \{[\s\S]{0,300}?process\.exit\(1\)/);
    expect(main).not.toMatch(/process\.env\.GRACEFUL_STARTUP/);
  });

  it('startup 경로에 migration · seed 직접 실행이 없다 (선행 계약 보존)', () => {
    const startup = code(join(SRC, 'services', 'startup.service.ts'));
    for (const s of [main, startup]) {
      expect(s).not.toMatch(/runMigrations|showMigrations|\.up\(\s*queryRunner/);
    }
    expect(read(join(SRC, 'database', 'connection.ts'))).toMatch(/synchronize:\s*false/);
  });

  it('startup.service 의 DB 실패 처리: 프로덕션 throw + FAILED 전환, "Continuing without database" 는 비프로덕션 게이트 안에만 있다', () => {
    const s = code(join(SRC, 'services', 'startup.service.ts'));
    expect(s).toMatch(/if \(isGracefulStartupAllowed\(\)\) \{[\s\S]{0,400}?Continuing without database/);
    expect(s).toMatch(/transitionStartupState\('FAILED', 'database-connect'\)/);
    expect(s).toMatch(/transitionStartupState\('DB_CONNECTING'\)/);
    expect(s).not.toMatch(/process\.env\.GRACEFUL_STARTUP/);
  });

  it('startup 로그에 host · username · database 이름을 남기지 않는다', () => {
    const s = code(join(SRC, 'services', 'startup.service.ts'));
    expect(s).not.toMatch(/logger\.info\('Database configuration:'/);
    expect(s).toMatch(/Database configuration presence/);
  });
});

describe('health — liveness 와 readiness 분리', () => {
  const health = code(join(SRC, 'routes', 'health.ts'));

  it('readiness 는 상태 정본 READY 를 먼저 요구하고 DB SELECT 1 로 판정한다', () => {
    const fn = /async function checkReadiness\(\)[\s\S]*?\n}/.exec(health)?.[0] ?? '';
    expect(fn).toMatch(/getStartupState\(\) !== 'READY'/);
    expect(fn).toMatch(/SELECT 1/);
    expect(fn).toMatch(/catch[\s\S]*?return false/);
    expect(fn).not.toMatch(/catch[\s\S]*?return true/);
  });

  it('/ready 는 not-ready · 예외 모두 503 이며 200 으로 위장하지 않는다', () => {
    const route = /router\.get\('\/ready'[\s\S]*?\n\}\);/.exec(health)?.[0] ?? '';
    expect((route.match(/status\(503\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(route).not.toMatch(/catch[\s\S]*?status\(200\)/);
  });

  it('liveness(/health · /health/live) 는 DB 를 확인하지 않는다', () => {
    const main = code(join(SRC, 'main.ts'));
    const live = /app\.get\('\/health'[\s\S]*?\n\}\);/.exec(main)?.[0] ?? '';
    expect(live).toMatch(/status\(200\)/);
    expect(live).not.toMatch(/AppDataSource|SELECT/);
    const liveRoute = /router\.get\('\/live'[\s\S]*?\n\}\);/.exec(health)?.[0] ?? '';
    expect(liveRoute).not.toMatch(/AppDataSource|SELECT/);
  });

  it('health 응답 코드에 접속 문자열 · host · username 을 담지 않는다', () => {
    expect(health).not.toMatch(/DB_HOST|DB_USERNAME|DB_PASSWORD|connectionString/);
  });

  it('shutdown 은 SHUTTING_DOWN 으로 전환하고 서버를 close 한다', () => {
    const s = code(join(SRC, 'bootstrap', 'setup-shutdown.ts'));
    expect(s).toMatch(/transitionStartupState\('SHUTTING_DOWN'/);
    expect(s).toMatch(/httpServer\.close\(/);
  });
});

describe('deploy-api.yml — migration 소유권 · 배포 검증', () => {
  const wf = read(join(REPO, '.github', 'workflows', 'deploy-api.yml'));
  const wfCode = wf
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');

  it('migration job 이 Deploy to Cloud Run 보다 앞이다', () => {
    const iMig = wf.indexOf('name: Run database migrations');
    const iDep = wf.indexOf('name: Deploy to Cloud Run');
    expect(iMig).toBeGreaterThan(-1);
    expect(iDep).toBeGreaterThan(iMig);
  });

  it('GRACEFUL_STARTUP env 를 설정하지 않는다 (프로덕션에서 dead configuration)', () => {
    expect(wfCode).not.toMatch(/GRACEFUL_STARTUP=/);
  });

  it('배포 검증은 /health/ready 를 보며 상한 있는 재시도 뒤 exit 1 로 실패를 반환한다', () => {
    const verifyRaw = /- name: Verify deployment[\s\S]*?(?=\n {4}- name: |\n\s*$)/.exec(wf)?.[0] ?? '';
    const verify = verifyRaw
      .split('\n')
      .filter((l) => !/^\s*#/.test(l))
      .join('\n');
    expect(verify).toMatch(/\/health\/ready/);
    expect(verify).toMatch(/for i in \{1\.\.5\}/);
    expect(verify).toMatch(/exit 1/);
    expect(verify).not.toMatch(/continue-on-error|\|\| true/);
  });

  it('API service 와 migration job 은 서로 다른 진입점을 쓴다', () => {
    expect(wfCode).toMatch(/dist\/migrate\.js/);
    expect(read(join(SRC, '..', 'Dockerfile'))).toMatch(/dist\/main\.js/);
  });
});
