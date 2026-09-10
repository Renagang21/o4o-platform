/**
 * WO-O4O-LOCAL-WORK-AGENT-ONECLICK-PAIRING-V1 — 계약 고정 (§21)
 *
 * V0 의 Local Execution Runtime 자체는 바뀌지 않았다. 바뀐 것은 **연결하는 방법** 하나다.
 * 그래서 여기서 고정하는 것도 그 한 지점의 경계다.
 *
 *   - 승인권은 로그인한 브라우저만 받을 수 있고, 단명 · 1회용이다 (§7)
 *   - 승인권에는 password · cookie · refresh token 이 실리지 않는다 (§2·§8)
 *   - localhost 창구는 loopback 에만 열리고, 허용된 O4O 도메인만 상대한다 (§4·§12·§13)
 *   - 이미 연결된 PC 는 조용히 성공하고, 남의 PC 는 임의로 뺏지 않는다 (§15·§16)
 *
 * §21 의 11~14 (tool roundtrip · unknown action · offline 감지)는 연결 방식과 무관한
 * V0 계약이므로 `local-agent-runtime.spec.ts` 가 그대로 담당한다. 같은 것을 두 번
 * 검사해도 강도는 올라가지 않는다.
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { spawn, type ChildProcess } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import {
  createPairingGrant,
  openAgentSession,
  redeemPairingGrant,
} from '../services/local-agent/local-agent-service.js';
import { makeDb, pairAndRegister, REGISTER } from './helpers/local-agent-db-stub.js';

const repoRoot = join(__dirname, '..', '..', '..', '..');
const agentSrcDir = join(repoRoot, 'tools', 'o4o-local-agent', 'src');
const readAgent = (f: string) => readFileSync(join(agentSrcDir, f), 'utf8');

/**
 * 주석을 걷어낸 소스.
 *
 * 이 코드의 주석은 "무엇을 일부러 하지 않는가" 를 설명하느라 금지 문자열
 * (`Access-Control-Allow-Credentials`, `0.0.0.0`) 을 그대로 담고 있다.
 * 단언 대상은 실행되는 코드다.
 */
const codeOf = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ─── 1·2. 승인권 발급 (§21-1·§21-2) ──────────────────────────────────────────

describe('1~2. pairing grant 는 로그인한 브라우저만 받는다', () => {
  it('1. 인증된 사용자는 단명 · 1회용 승인권을 받는다', async () => {
    const db = makeDb();
    const { grant, expiresAt } = await createPairingGrant(db.dataSource, 'user-1');

    expect(typeof grant).toBe('string');
    expect(grant.length).toBeGreaterThan(20);
    // 사람이 옮겨 적을 코드가 아니다 — 사전 기반 5+5 형식이 남아 있으면 안 된다.
    expect(grant).not.toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);

    const ttlMs = new Date(expiresAt).getTime() - Date.now();
    // §7: 1~5분. 사람이 개입하지 않으므로 짧은 쪽을 쓴다.
    expect(ttlMs).toBeGreaterThan(30 * 1000);
    expect(ttlMs).toBeLessThanOrEqual(5 * 60 * 1000);

    // 평문은 서버에 남지 않는다 (§23 raw token 저장 금지).
    expect(JSON.stringify(db.pairings)).not.toContain(grant);
    expect(db.pairings[0].code_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('1. 버튼을 연달아 눌러도 살아 있는 승인권은 1개뿐이다', async () => {
    const db = makeDb();
    const first = await createPairingGrant(db.dataSource, 'user-1');
    await createPairingGrant(db.dataSource, 'user-1');

    const stale = await redeemPairingGrant(db.dataSource, { grant: first.grant, ...REGISTER });
    expect(stale).toEqual({ ok: false, reason: 'INVALID_PAIRING_GRANT' });
  });

  it('2. 승인권 발급 라우트는 인증 미들웨어 뒤에 있다 (미인증 발급 차단)', () => {
    const routes = readFileSync(join(__dirname, '..', 'routes', 'local-agent.routes.ts'), 'utf8');
    expect(routes).toContain("router.post('/pairing-grants', authenticate,");
    // 사용자 축의 두 경로 모두 authenticate 를 통과해야 한다.
    expect(routes).toContain("router.get('/devices', authenticate,");
    // 수동 코드 발급 경로는 남아 있지 않다 (§19).
    expect(routes).not.toContain('createPairingCode');
    expect(routes).not.toContain('consumePairingAndRegisterDevice');
  });
});

// ─── 4·5. 만료 · replay (§21-4·§21-5) ────────────────────────────────────────

describe('4~5. 만료된 승인권 · 재사용은 거부된다', () => {
  it('4. 만료된 승인권은 거부된다', async () => {
    const db = makeDb();
    const { grant } = await createPairingGrant(db.dataSource, 'user-1');
    db.pairings[0].expires_at = new Date(Date.now() - 1).toISOString();

    expect(await redeemPairingGrant(db.dataSource, { grant, ...REGISTER })).toEqual({
      ok: false,
      reason: 'PAIRING_EXPIRED',
    });
    expect(db.devices).toHaveLength(0);
  });

  it('5. 같은 승인권을 다시 제출하면 거부된다 (replay)', async () => {
    const db = makeDb();
    const { grant } = await createPairingGrant(db.dataSource, 'user-1');

    const first = await redeemPairingGrant(db.dataSource, { grant, ...REGISTER });
    const replay = await redeemPairingGrant(db.dataSource, { grant, ...REGISTER });

    expect(first.ok).toBe(true);
    expect(replay).toEqual({ ok: false, reason: 'INVALID_PAIRING_GRANT' });
    // replay 가 device 를 하나 더 만들지 못한다.
    expect(db.devices).toHaveLength(1);
  });

  it('5. 동시에 도착한 두 요청 중 하나만 성공한다', async () => {
    const db = makeDb();
    const { grant } = await createPairingGrant(db.dataSource, 'user-1');

    const [a, b] = await Promise.all([
      redeemPairingGrant(db.dataSource, { grant, ...REGISTER }),
      redeemPairingGrant(db.dataSource, { grant, ...REGISTER }),
    ]);

    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect(db.devices).toHaveLength(1);
  });
});

// ─── 7·8. 이미 연결된 PC · 남의 PC (§21-7·§21-8) ─────────────────────────────

describe('7~8. device 귀속', () => {
  it('7. 이미 연결된 같은 PC 는 idempotent 성공이다 (duplicate device 0)', async () => {
    const db = makeDb();
    const reg = await pairAndRegister(db, 'user-1');

    const { grant } = await createPairingGrant(db.dataSource, 'user-1');
    const again = await redeemPairingGrant(db.dataSource, {
      grant,
      ...REGISTER,
      claimedDeviceId: reg.deviceId,
      claimedCredential: reg.agentCredential,
    });

    expect(again).toEqual({ ok: true, status: 'already_connected', deviceId: reg.deviceId });
    expect(db.devices).toHaveLength(1);
    // 기존 credential 은 바뀌지 않는다 — agent 가 쓰던 것이 계속 유효해야 한다.
    const session = await openAgentSession(db.dataSource, reg.deviceId, reg.agentCredential);
    expect(session.ok).toBe(true);
  });

  it('8. 다른 사용자에게 연결된 PC 는 임의로 재귀속되지 않는다', async () => {
    const db = makeDb();
    const other = await pairAndRegister(db, 'owner-42');

    const { grant } = await createPairingGrant(db.dataSource, 'user-1');
    const outcome = await redeemPairingGrant(db.dataSource, {
      grant,
      ...REGISTER,
      claimedDeviceId: other.deviceId,
      claimedCredential: other.agentCredential,
    });

    expect(outcome).toEqual({ ok: false, reason: 'DEVICE_ALREADY_PAIRED' });
    // 소유자는 그대로다.
    expect(db.devices).toHaveLength(1);
    expect(db.devices[0].user_id).toBe('owner-42');
    // 그리고 승인권은 태워지지 않았다 — 사용자가 버튼을 다시 누를 필요가 없다 (§16).
    expect(db.pairings.filter((p) => p.consumed_at === null)).toHaveLength(1);
  });

  it('8. 남의 deviceId 만 적어 보내는 것으로는 존재 여부조차 알 수 없다', async () => {
    const db = makeDb();
    const other = await pairAndRegister(db, 'owner-42');

    const { grant } = await createPairingGrant(db.dataSource, 'user-1');
    const outcome = await redeemPairingGrant(db.dataSource, {
      grant,
      ...REGISTER,
      claimedDeviceId: other.deviceId,
      claimedCredential: 'guessed-credential',
    });

    // credential 증명이 없으면 주장은 무시되고 그냥 새 device 가 된다 (§14).
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.status).toBe('connected');
    expect(db.devices).toHaveLength(2);
  });
});

// ─── 10. agent credential (§21-10) ───────────────────────────────────────────

describe('10. 연결 결과로 발급되는 것은 기기 전용 자격증명뿐이다', () => {
  it('발급된 credential 로 세션이 열리고, 서버에는 해시만 남는다', async () => {
    const db = makeDb();
    const reg = await pairAndRegister(db, 'user-1');

    const session = await openAgentSession(db.dataSource, reg.deviceId, reg.agentCredential);
    expect(session.ok).toBe(true);

    const dump = JSON.stringify({ p: db.pairings, d: db.devices, s: db.sessions });
    expect(dump).not.toContain(reg.agentCredential);
    expect(dump).not.toContain(reg.grant);
  });

  it('브라우저 자격을 읽거나 재사용하는 경로가 없다 (§17)', () => {
    const routes = readFileSync(join(__dirname, '..', 'routes', 'local-agent.routes.ts'), 'utf8');
    expect(routes).not.toContain('req.cookies');
    expect(routes).not.toContain('headers.cookie');

    const service = readFileSync(
      join(__dirname, '..', 'services', 'local-agent', 'local-agent-service.ts'),
      'utf8',
    );
    // 소유자는 grant 에서 파생된다. agent 가 본문으로 사용자를 지목할 수 없다 (§14).
    expect(service).toContain('pairing.user_id');
    expect(service).not.toContain('input.userId');
  });
});

// ─── 9. 유출 0 (§21-9) ────────────────────────────────────────────────────────

describe('9. cookie · token 이 agent 로 건너가지 않는다', () => {
  it('브라우저 측 호출은 credentials 를 명시적으로 생략한다', () => {
    const client = readFileSync(
      join(repoRoot, 'services', 'web-neture', 'src', 'api', 'localAgent.ts'),
      'utf8',
    );
    // localhost 로 가는 두 호출 모두 쿠키를 싣지 않는다.
    expect(codeOf(client).match(/credentials: 'omit'/g) ?? []).toHaveLength(2);
    expect(client).not.toContain("credentials: 'include'");
    // 승인권을 저장하거나 화면에 남기지 않는다.
    expect(client).not.toContain('localStorage');
    expect(client).not.toContain('sessionStorage');
  });

  it('agent 는 응답에 Allow-Credentials 를 주지 않는다 (쿠키를 받을 수단이 없다)', () => {
    expect(codeOf(readAgent('local-server.mjs'))).not.toContain(
      'Access-Control-Allow-Credentials',
    );
  });

  it('agent 는 loopback 에만 bind 하고 wildcard origin 을 쓰지 않는다', () => {
    const server = codeOf(readAgent('local-server.mjs'));
    expect(server.match(/\.listen\(/g) ?? []).toHaveLength(1);
    expect(server).toContain("server.listen(LOCAL_AGENT_PORT, '127.0.0.1'");
    expect(server).not.toMatch(/listen\([^)]*0\.0\.0\.0/);
    expect(server).not.toContain("'Access-Control-Allow-Origin': '*'");
    // 허용 목록은 https 로 시작하는 실제 O4O 도메인뿐이다.
    const origins = [...server.matchAll(/'(https?:\/\/[^']+)'/g)].map((m) => m[1]);
    expect(origins.length).toBeGreaterThan(0);
    for (const origin of origins) {
      expect(origin.startsWith('https://')).toBe(true);
      expect(origin).not.toContain('*');
    }
  });

  it('agent 에는 여전히 임의 실행 · 임의 파일 접근 수단이 없다', () => {
    const server = codeOf(readAgent('local-server.mjs'));
    for (const forbidden of ['child_process', 'node:fs', 'exec(', 'spawn(', 'eval(']) {
      expect(server).not.toContain(forbidden);
    }
    // 브라우저에 노출되는 endpoint 는 두 개뿐이다 (§11).
    const endpoints = [...server.matchAll(/url === '([^']+)'/g)].map((m) => m[1]).sort();
    expect(endpoints).toEqual(['/health', '/pair']);
  });

  it('수동 코드 입력 UI 가 존재하지 않는다 (§26 MANUAL CODE ENTRY = 0)', () => {
    const card = readFileSync(
      join(repoRoot, 'services', 'web-neture', 'src', 'components', 'mypage', 'LocalAgentCard.tsx'),
      'utf8',
    );
    expect(card).not.toContain('<input');
    expect(card).not.toContain('pairing code');
    expect(card).toContain('이 PC 연결');
  });
});

// ─── 3·6. 실제 loopback 창구 (§21-3·§21-6) ───────────────────────────────────

/**
 * agent 의 창구를 **진짜로 띄워서** 확인한다.
 *
 * origin 검사는 문자열 비교 한 줄이지만, 이 한 줄이 "아무 웹사이트나 이 PC 를 자기
 * 사용자에게 묶을 수 있는가" 를 가른다. 소스 문자열 단언만으로는 preflight 응답이
 * 실제로 막히는지 알 수 없어서, HTTP 로 직접 두드린다.
 */
describe('3·6. localhost 창구 — origin · nonce', () => {
  const PORT = 47821;
  const base = `http://127.0.0.1:${PORT}`;
  const ALLOWED = 'https://neture.co.kr';
  let child: ChildProcess | null = null;

  beforeAll(async () => {
    const serverUrl = pathToFileURL(join(agentSrcDir, 'local-server.mjs')).href;
    const script = `
      import { startLocalServer } from ${JSON.stringify(serverUrl)};
      await startLocalServer({
        agentVersion: '0.0.0-test',
        isConnected: () => false,
        onPair: async (grant) =>
          grant === 'good-grant'
            ? { ok: true, status: 'connected' }
            : { ok: false, code: 'INVALID_PAIRING_GRANT' },
        log: () => {},
      });
      console.log('READY');
    `;
    child = spawn(process.execPath, ['--input-type=module', '-e', script], { stdio: 'pipe' });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('local server 기동 실패')), 15000);
      child!.stdout?.on('data', (buf: Buffer) => {
        if (buf.toString().includes('READY')) {
          clearTimeout(timer);
          resolve();
        }
      });
      child!.on('error', reject);
    });
  }, 20000);

  afterAll(() => {
    child?.kill();
  });

  const health = async (origin = ALLOWED) =>
    fetch(`${base}/health`, { headers: { Origin: origin } });

  const pair = async (body: unknown, origin = ALLOWED) =>
    fetch(`${base}/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify(body),
    });

  it('3. 허용된 origin 은 health → pair 한 바퀴를 돈다', async () => {
    const h = await health();
    expect(h.status).toBe(200);
    expect(h.headers.get('access-control-allow-origin')).toBe(ALLOWED);
    // 쿠키를 받을 의사가 없다는 것을 응답으로도 확인한다.
    expect(h.headers.get('access-control-allow-credentials')).toBeNull();

    const info = await h.json();
    expect(info.ok).toBe(true);
    expect(typeof info.nonce).toBe('string');
    // 사용자 이름 · 경로 · IP 같은 것은 담기지 않는다 (V0 §21).
    expect(Object.keys(info).sort()).toEqual(['agentVersion', 'connected', 'nonce', 'ok']);

    const res = await pair({ grant: 'good-grant', nonce: info.nonce });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: 'connected' });
  });

  it('3. nonce 는 1회용이다', async () => {
    const { nonce } = await (await health()).json();
    expect((await pair({ grant: 'good-grant', nonce })).status).toBe(200);

    const replay = await pair({ grant: 'good-grant', nonce });
    expect(replay.status).toBe(403);
    expect((await replay.json()).code).toBe('BAD_NONCE');
  });

  it('3. nonce 없이는 pair 가 성립하지 않는다', async () => {
    const res = await pair({ grant: 'good-grant', nonce: 'made-up-nonce' });
    expect(res.status).toBe(403);
  });

  it('6. 허용되지 않은 origin 은 preflight 부터 거절된다', async () => {
    const preflight = await fetch(`${base}/pair`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    expect(preflight.status).toBe(403);
    expect(preflight.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('6. 허용되지 않은 origin 은 본 요청도 거절된다', async () => {
    const { nonce } = await (await health()).json();
    const res = await pair({ grant: 'good-grant', nonce }, 'https://evil.example');
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('ORIGIN_NOT_ALLOWED');
  });

  it('6. Origin 없는 요청(브라우저 밖)도 상대하지 않는다', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(403);
  });

  it('6. 허용된 origin 의 preflight 는 Private Network Access 를 승인한다', async () => {
    const preflight = await fetch(`${base}/pair`, {
      method: 'OPTIONS',
      headers: {
        Origin: ALLOWED,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Private-Network': 'true',
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-private-network')).toBe('true');
  });

  it('명령 실행 endpoint 는 브라우저에 열려 있지 않다 (§11)', async () => {
    for (const path of ['/run', '/command', '/exec', '/devices']) {
      const res = await fetch(`${base}${path}`, { headers: { Origin: ALLOWED } });
      expect(res.status).toBe(404);
    }
  });
});
