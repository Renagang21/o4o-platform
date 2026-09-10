/**
 * WO-O4O-LOCAL-WORK-AGENT-V0 — Local Execution Runtime 계약 고정 (§43)
 *
 * 여기서 고정하려는 것은 "기능이 동작한다" 가 아니라 **경계가 무너지지 않는다** 이다.
 *
 *   - pairing 은 5분 · 1회용이고, 코드가 서버에 평문으로 남지 않는다 (§12)
 *   - agent 는 "나는 이 사용자의 PC다" 라고 주장하는 것만으로 신뢰받지 못한다 (§14)
 *   - 서버 allowlist 밖의 action 은 명령이 되지 못하고, PC 쪽에서도 다시 거부된다 (§28·§29)
 *   - 같은 결과를 두 번 제출하거나 만료된 명령을 되돌릴 수 없다 (§18)
 *   - 임의 shell · 임의 파일 접근은 "금지" 가 아니라 **표현할 수단 자체가 없다** (§22·§23)
 *   - 화이트리스트 밖 필드는 DB 에도 프롬프트에도 도달하지 못한다 (§21·§36)
 *
 * DB 는 4개 테이블만 흉내내는 in-memory stub 으로 대체한다. 실제 SQL 문자열을 그대로
 * 태우므로 조건부 UPDATE(=replay 방어)의 의미가 테스트에서도 살아 있다.
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  LOCAL_AGENT_ACTIONS,
  LOCAL_AGENT_ACTION_ALLOWLIST,
  LOCAL_AGENT_ERROR,
  SAFE_SYSTEM_INFO_FIELDS,
  isAllowedLocalAction,
  pickSafeSystemInfo,
} from '../services/local-agent/local-agent-protocol.js';
import {
  authenticateAgentSession,
  awaitCommandResult,
  claimPendingCommands,
  consumePairingAndRegisterDevice,
  createPairingCode,
  issueCommand,
  listUserDevices,
  openAgentSession,
  recordHeartbeat,
  resolveTargetDevice,
  submitCommandResult,
} from '../services/local-agent/local-agent-service.js';
import {
  AiCapability,
  AI_TOOL_NAMES,
  assertToolAllowed,
  deriveAiCapabilities,
  resolveAvailableTools,
  type VerifiedToolContext,
} from '../services/ai-tools/ai-tool-contract.js';
import {
  executeAiTool,
  looksLikeLocalScopedRequest,
  renderToolContext,
  selectToolForRequest,
} from '../services/ai-tools/ai-tool-router.js';

// ─── in-memory DB stub ───────────────────────────────────────────────────────

type Row = Record<string, any>;

/**
 * 4개 테이블만 흉내내는 최소 stub.
 *
 * 실제 SQL 을 파싱하지는 않는다 — 서비스가 내보내는 질의는 개수가 적고 고정되어 있으므로
 * 특징적인 조각으로 분기한다. 대신 **조건절의 의미는 그대로 구현한다**: `consumed_at IS NULL`,
 * `status IN ('pending','delivered')` 처럼 보안이 걸려 있는 조건은 여기서도 검사해야
 * replay·재사용 테스트가 진짜 검사가 된다.
 */
function makeDb() {
  const pairings: Row[] = [];
  const devices: Row[] = [];
  const sessions: Row[] = [];
  const commands: Row[] = [];
  const sqlLog: string[] = [];

  const now = () => new Date().toISOString();

  const query = async (sql: string, params: any[] = []): Promise<any> => {
    sqlLog.push(sql);
    const s = sql.replace(/\s+/g, ' ').trim();

    // ── pairings
    if (s.startsWith('UPDATE local_agent_pairings SET consumed_at = now() WHERE user_id')) {
      pairings.filter((p) => p.user_id === params[0] && !p.consumed_at).forEach((p) => {
        p.consumed_at = now();
      });
      return [];
    }
    if (s.startsWith('INSERT INTO local_agent_pairings')) {
      pairings.push({
        id: params[0],
        user_id: params[1],
        code_hash: params[2],
        expires_at: params[3],
        consumed_at: null,
      });
      return [];
    }
    if (s.includes('FROM local_agent_pairings') && s.includes('WHERE code_hash')) {
      const p = pairings.find((x) => x.code_hash === params[0]);
      return p ? [p] : [];
    }
    if (s.startsWith('UPDATE local_agent_pairings SET consumed_at = now() WHERE id')) {
      const p = pairings.find((x) => x.id === params[0] && !x.consumed_at);
      if (!p) return [];
      p.consumed_at = now();
      return [{ id: p.id }];
    }

    // ── devices
    if (s.startsWith('INSERT INTO local_agent_devices')) {
      devices.push({
        id: params[0],
        user_id: params[1],
        device_name: params[2],
        platform: params[3],
        agent_version: params[4],
        credential_hash: params[5],
        status: 'active',
        last_seen_at: null,
      });
      return [];
    }
    if (s.includes('FROM local_agent_devices WHERE id')) {
      const d = devices.find((x) => x.id === params[0]);
      return d ? [d] : [];
    }
    if (s.startsWith('UPDATE local_agent_devices SET last_seen_at')) {
      const d = devices.find((x) => x.id === params[0]);
      if (d) d.last_seen_at = now();
      return [];
    }
    if (s.includes('FROM local_agent_devices') && s.includes('WHERE user_id')) {
      return devices
        .filter((x) => x.user_id === params[0] && x.status === 'active')
        .sort((a, b) => String(b.last_seen_at ?? '').localeCompare(String(a.last_seen_at ?? '')));
    }

    // ── sessions
    if (s.startsWith('INSERT INTO local_agent_sessions')) {
      sessions.push({
        id: params[0],
        device_id: params[1],
        token_hash: params[2],
        expires_at: params[3],
        ended_at: null,
      });
      return [];
    }
    if (s.includes('FROM local_agent_sessions s')) {
      const sess = sessions.find(
        (x) =>
          x.token_hash === params[0] &&
          !x.ended_at &&
          new Date(x.expires_at).getTime() > Date.now(),
      );
      if (!sess) return [];
      const d = devices.find((x) => x.id === sess.device_id && x.status === 'active');
      if (!d) return [];
      return [{ session_id: sess.id, device_id: d.id, user_id: d.user_id }];
    }

    // ── commands
    if (s.startsWith('INSERT INTO local_agent_commands')) {
      commands.push({
        command_id: params[0],
        device_id: params[1],
        user_id: params[2],
        tool_name: params[3],
        action: params[4],
        status: 'pending',
        issued_at: params[5],
        expires_at: params[6],
        error_code: null,
        result_data: null,
        completed_at: null,
      });
      return [];
    }
    if (s.startsWith('UPDATE local_agent_commands SET status = \'delivered\'')) {
      const picked = commands
        .filter(
          (c) =>
            c.device_id === params[0] &&
            c.status === 'pending' &&
            new Date(c.expires_at).getTime() > Date.now(),
        )
        .slice(0, params[1]);
      picked.forEach((c) => {
        c.status = 'delivered';
      });
      return picked.map((c) => ({
        command_id: c.command_id,
        action: c.action,
        issued_at: c.issued_at,
        expires_at: c.expires_at,
      }));
    }
    if (s.includes('FROM local_agent_commands') && s.includes('AND device_id')) {
      const c = commands.find((x) => x.command_id === params[0] && x.device_id === params[1]);
      return c ? [c] : [];
    }
    if (s.startsWith('SELECT status, error_code, result_data FROM local_agent_commands')) {
      const c = commands.find((x) => x.command_id === params[0]);
      // 사본을 돌려준다. 실제 Postgres 도 그러하며,
      // 호출자가 직후 result_data 를 NULL 로 지우는 것(§37)이
      // 방금 읽은 row 까지 비우면 테스트가 엉뚱한 것을 본다.
      return c ? [{ ...c }] : [];
    }
    if (s.startsWith('UPDATE local_agent_commands SET result_data = NULL')) {
      const c = commands.find((x) => x.command_id === params[0]);
      if (c) c.result_data = null;
      return [];
    }
    if (s.includes("SET status = 'expired'")) {
      const c = commands.find(
        (x) =>
          x.command_id === params[0] && (x.status === 'pending' || x.status === 'delivered'),
      );
      if (!c) return [];
      c.status = 'expired';
      c.error_code = params[1];
      c.completed_at = now();
      return [{ command_id: c.command_id }];
    }
    if (s.startsWith('UPDATE local_agent_commands SET status = $2')) {
      const c = commands.find(
        (x) =>
          x.command_id === params[0] && (x.status === 'pending' || x.status === 'delivered'),
      );
      if (!c) return [];
      c.status = params[1];
      c.error_code = params[2];
      c.result_data = params[3];
      c.completed_at = now();
      return [{ command_id: c.command_id }];
    }

    throw new Error(`stub 이 모르는 SQL: ${s.slice(0, 90)}`);
  };

  const dataSource: any = { query: jest.fn(query) };
  return { dataSource, pairings, devices, sessions, commands, sqlLog };
}

const REGISTER = {
  deviceName: '약국 PC',
  platform: 'windows',
  agentVersion: '0.1.0',
};

async function pairAndRegister(db: ReturnType<typeof makeDb>, userId = 'user-1') {
  const { code } = await createPairingCode(db.dataSource, userId);
  const outcome = await consumePairingAndRegisterDevice(db.dataSource, { code, ...REGISTER });
  if (outcome.ok === false) throw new Error(`등록 실패: ${outcome.reason}`);
  return { code, deviceId: outcome.deviceId, agentCredential: outcome.agentCredential };
}

async function connected(db: ReturnType<typeof makeDb>, userId = 'user-1') {
  const reg = await pairAndRegister(db, userId);
  const session = await openAgentSession(db.dataSource, reg.deviceId, reg.agentCredential);
  if (session.ok === false) throw new Error('세션 실패');
  await recordHeartbeat(db.dataSource, reg.deviceId);
  return { ...reg, sessionToken: session.sessionToken };
}

const localCtx = (over: Partial<VerifiedToolContext> = {}): VerifiedToolContext => ({
  userId: 'user-1',
  workspace: 'home',
  ...over,
});

// ─── 1. Pairing (§12) ─────────────────────────────────────────────────────────

describe('1~3. Pairing — 단명 · 1회용 · 사용자 소유', () => {
  it('1. 정상 pairing 으로 device 가 등록되고 기기 자격증명이 발급된다', async () => {
    const db = makeDb();
    const reg = await pairAndRegister(db);
    expect(reg.deviceId).toMatch(/^[0-9a-f-]{36}$/);
    expect(reg.agentCredential.length).toBeGreaterThan(20);
    expect(db.devices).toHaveLength(1);
    expect(db.devices[0].user_id).toBe('user-1');
  });

  it('pairing code 와 credential 은 평문으로 저장되지 않는다 (해시만 남는다)', async () => {
    const db = makeDb();
    const reg = await pairAndRegister(db);
    const dump = JSON.stringify({ p: db.pairings, d: db.devices, s: db.sessions });
    expect(dump).not.toContain(reg.code);
    expect(dump).not.toContain(reg.agentCredential);
    // 남아 있는 것은 64자 SHA-256 hex 뿐이다.
    expect(db.pairings[0].code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(db.devices[0].credential_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('2. 잘못된 코드는 거부된다', async () => {
    const db = makeDb();
    await createPairingCode(db.dataSource, 'user-1');
    const r = await consumePairingAndRegisterDevice(db.dataSource, {
      code: 'AAAAA-BBBBB',
      ...REGISTER,
    });
    expect(r).toEqual({ ok: false, reason: 'INVALID_PAIRING_CODE' });
    expect(db.devices).toHaveLength(0);
  });

  it('2. 만료된 코드는 거부된다', async () => {
    const db = makeDb();
    const { code } = await createPairingCode(db.dataSource, 'user-1');
    db.pairings[0].expires_at = new Date(Date.now() - 1000).toISOString();
    const r = await consumePairingAndRegisterDevice(db.dataSource, { code, ...REGISTER });
    expect(r).toEqual({ ok: false, reason: 'PAIRING_EXPIRED' });
    expect(db.devices).toHaveLength(0);
  });

  it('2. 같은 코드를 두 번 쓸 수 없다 (1회용)', async () => {
    const db = makeDb();
    const { code } = await createPairingCode(db.dataSource, 'user-1');
    const first = await consumePairingAndRegisterDevice(db.dataSource, { code, ...REGISTER });
    const second = await consumePairingAndRegisterDevice(db.dataSource, { code, ...REGISTER });
    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, reason: 'INVALID_PAIRING_CODE' });
    expect(db.devices).toHaveLength(1);
  });

  it('3. device 는 코드를 발급한 사용자에게 귀속된다 (agent 가 사용자를 고를 수 없다)', async () => {
    const db = makeDb();
    const { code } = await createPairingCode(db.dataSource, 'owner-42');
    // agent 가 본문에 다른 userId 를 실어 보낼 방법 자체가 입력 타입에 없다.
    const r = await consumePairingAndRegisterDevice(db.dataSource, { code, ...REGISTER });
    expect(r.ok).toBe(true);
    expect(db.devices[0].user_id).toBe('owner-42');
  });

  it('Windows 외 플랫폼은 V0 에서 등록되지 않는다', async () => {
    const db = makeDb();
    const { code } = await createPairingCode(db.dataSource, 'user-1');
    const r = await consumePairingAndRegisterDevice(db.dataSource, {
      code,
      ...REGISTER,
      platform: 'linux',
    });
    expect(r).toEqual({ ok: false, reason: 'UNSUPPORTED_PLATFORM' });
  });
});

// ─── 4~6. 세션 · heartbeat · offline (§13·§14·§32) ────────────────────────────

describe('4~6. agent 인증 · heartbeat · offline 판정', () => {
  it('4. 올바른 credential 로만 세션이 열린다', async () => {
    const db = makeDb();
    const reg = await pairAndRegister(db);
    const bad = await openAgentSession(db.dataSource, reg.deviceId, 'not-the-credential');
    expect(bad).toEqual({ ok: false, reason: 'BAD_CREDENTIAL' });
    const good = await openAgentSession(db.dataSource, reg.deviceId, reg.agentCredential);
    expect(good.ok).toBe(true);
  });

  it('4. 존재하지 않는 deviceId 를 주장해도 세션이 열리지 않는다 (§14)', async () => {
    const db = makeDb();
    const r = await openAgentSession(db.dataSource, 'fabricated-device-id', 'anything');
    expect(r).toEqual({ ok: false, reason: 'DEVICE_NOT_FOUND' });
  });

  it('4. 세션 토큰이 신원의 유일한 출처다 — 위조 토큰은 아무 device 도 되지 못한다', async () => {
    const db = makeDb();
    const agent = await connected(db);
    expect(await authenticateAgentSession(db.dataSource, agent.sessionToken)).toMatchObject({
      deviceId: agent.deviceId,
      userId: 'user-1',
    });
    expect(await authenticateAgentSession(db.dataSource, 'forged')).toBeNull();
    expect(await authenticateAgentSession(db.dataSource, '')).toBeNull();
  });

  it('device 를 해지하면 살아 있던 세션도 함께 무력화된다', async () => {
    const db = makeDb();
    const agent = await connected(db);
    db.devices[0].status = 'revoked';
    expect(await authenticateAgentSession(db.dataSource, agent.sessionToken)).toBeNull();
  });

  it('만료된 세션 토큰은 통과하지 못한다', async () => {
    const db = makeDb();
    const agent = await connected(db);
    db.sessions[0].expires_at = new Date(Date.now() - 1000).toISOString();
    expect(await authenticateAgentSession(db.dataSource, agent.sessionToken)).toBeNull();
  });

  it('5. heartbeat 가 online 판정을 만든다', async () => {
    const db = makeDb();
    const agent = await connected(db);
    const r = await resolveTargetDevice(db.dataSource, 'user-1');
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.device.id).toBe(agent.deviceId);
  });

  it('6. heartbeat 가 끊기면 offline 으로 떨어진다 (연결 상태를 추측하지 않는다)', async () => {
    const db = makeDb();
    await connected(db);
    db.devices[0].last_seen_at = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const r = await resolveTargetDevice(db.dataSource, 'user-1');
    expect(r.status).toBe('offline');
  });

  it('6. 등록된 기기가 없으면 none 이다', async () => {
    const db = makeDb();
    expect(await resolveTargetDevice(db.dataSource, 'user-1')).toEqual({ status: 'none' });
  });

  it('다른 사용자의 기기는 보이지 않는다', async () => {
    const db = makeDb();
    await connected(db, 'user-1');
    expect(await listUserDevices(db.dataSource, 'user-2')).toEqual([]);
    expect(await resolveTargetDevice(db.dataSource, 'user-2')).toEqual({ status: 'none' });
  });
});

// ─── 7~8. capability · tool 자격 (§19·§26) ────────────────────────────────────

describe('7~8. local tool 자격', () => {
  it('7. 연결된 PC 가 있을 때만 system info tool 이 열린다', () => {
    const caps = deriveAiCapabilities(
      localCtx({ localAgentStatus: 'connected', localDeviceId: 'dev-1' }),
    );
    expect(caps).toContain(AiCapability.READ_ONLY_LOCAL_SYSTEM_INFO);
    const names = resolveAvailableTools(
      localCtx({ localAgentStatus: 'connected', localDeviceId: 'dev-1' }),
    ).map((t) => t.name);
    expect(names).toContain(AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO);
  });

  it('8. 미연결 · offline · ambiguous 에서는 capability 를 주지 않는다', () => {
    for (const status of ['offline', 'none', 'ambiguous'] as const) {
      const caps = deriveAiCapabilities(localCtx({ localAgentStatus: status }));
      expect(caps).not.toContain(AiCapability.READ_ONLY_LOCAL_SYSTEM_INFO);
      const auth = assertToolAllowed(
        AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO,
        localCtx({ localAgentStatus: status }),
      );
      expect(auth.allowed).toBe(false);
    }
  });

  it('connected 라고 해도 deviceId 가 없으면 열리지 않는다 (반쪽 상태 방지)', () => {
    const caps = deriveAiCapabilities(localCtx({ localAgentStatus: 'connected' }));
    expect(caps).not.toContain(AiCapability.READ_ONLY_LOCAL_SYSTEM_INFO);
  });

  it('17. 클라이언트가 보낸 localAgentStatus 는 신뢰 대상이 아니다 — 서버가 매 요청 파생한다', () => {
    // ai-proxy 는 요청 본문이 아니라 resolveTargetDevice 결과로만 toolCtx 를 채운다.
    const src = readFileSync(join(__dirname, '..', 'routes', 'ai-proxy.routes.ts'), 'utf8');
    expect(src).toContain('resolveTargetDevice(AppDataSource, userId)');
    // 본문에서 상태를 읽어오는 경로가 없다.
    expect(src).not.toMatch(/req\.body[^\n]*localAgentStatus/);
    expect(src).not.toMatch(/req\.body[^\n]*localDeviceId/);
  });
});

// ─── 9~12. 명령 왕복 · allowlist · replay · 만료 (§17·§18·§28) ────────────────

describe('9~12. 명령 왕복', () => {
  it('9. 허용된 action 은 발행 → 수령 → 실행 → 회수까지 한 바퀴 돈다', async () => {
    const db = makeDb();
    const agent = await connected(db);
    const issued = await issueCommand(db.dataSource, {
      userId: 'user-1',
      deviceId: agent.deviceId,
      action: LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO,
      toolName: AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO,
    });
    expect(issued.ok).toBe(true);
    if (issued.ok === false) return;

    const claimed = await claimPendingCommands(db.dataSource, agent.deviceId);
    expect(claimed).toHaveLength(1);
    expect(claimed[0].commandId).toBe(issued.command.commandId);
    // 명령에는 실행할 "내용" 이 없다 — action 이름과 빈 args 뿐이다.
    expect(claimed[0].args).toEqual({});

    const submitted = await submitCommandResult(db.dataSource, agent.deviceId, {
      commandId: issued.command.commandId,
      status: 'success',
      data: { osName: 'Windows 11', osVersion: '10.0.26200', architecture: 'x64' },
    });
    expect(submitted).toEqual({ ok: true });

    const result = await awaitCommandResult(db.dataSource, issued.command.commandId, 1000);
    expect(result.status).toBe('success');
    expect(result.data).toMatchObject({ osName: 'Windows 11' });
  });

  it('회수 직후 result_data 는 DB 에서 지워진다 (§37)', async () => {
    const db = makeDb();
    const agent = await connected(db);
    const issued = await issueCommand(db.dataSource, {
      userId: 'user-1',
      deviceId: agent.deviceId,
      action: LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO,
      toolName: AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO,
    });
    if (issued.ok === false) throw new Error('issue 실패');
    await claimPendingCommands(db.dataSource, agent.deviceId);
    await submitCommandResult(db.dataSource, agent.deviceId, {
      commandId: issued.command.commandId,
      status: 'success',
      data: { osName: 'Windows 11' },
    });
    await awaitCommandResult(db.dataSource, issued.command.commandId, 1000);
    expect(db.commands[0].result_data).toBeNull();
    // 남는 것은 감사에 필요한 최소 정보뿐이다.
    expect(db.commands[0].action).toBe(LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO);
  });

  it('10. allowlist 밖의 action 은 명령이 되지 못한다 (§28)', async () => {
    const db = makeDb();
    const agent = await connected(db);
    for (const action of [
      'local.exec_shell',
      'local.file_read',
      'local.file_write',
      'local.registry_read',
      'browser.navigate',
      'desktop.click',
      '',
    ]) {
      const r = await issueCommand(db.dataSource, {
        userId: 'user-1',
        deviceId: agent.deviceId,
        action,
        toolName: 'x',
      });
      expect(r).toEqual({ ok: false, errorCode: LOCAL_AGENT_ERROR.DENIED_UNKNOWN_ACTION });
    }
    // 하나도 큐에 들어가지 않았다.
    expect(db.commands).toHaveLength(0);
  });

  it('11. 같은 결과를 두 번 제출할 수 없다 (replay)', async () => {
    const db = makeDb();
    const agent = await connected(db);
    const issued = await issueCommand(db.dataSource, {
      userId: 'user-1',
      deviceId: agent.deviceId,
      action: LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO,
      toolName: AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO,
    });
    if (issued.ok === false) throw new Error('issue 실패');
    await claimPendingCommands(db.dataSource, agent.deviceId);

    const first = await submitCommandResult(db.dataSource, agent.deviceId, {
      commandId: issued.command.commandId,
      status: 'success',
      data: { osName: 'Windows 11' },
    });
    const second = await submitCommandResult(db.dataSource, agent.deviceId, {
      commandId: issued.command.commandId,
      status: 'success',
      data: { osName: '조작된 값' },
    });
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: false, errorCode: LOCAL_AGENT_ERROR.REPLAY_REJECTED });
  });

  it('11. 다른 기기의 commandId 로는 결과를 제출할 수 없다', async () => {
    const db = makeDb();
    const victim = await connected(db, 'user-1');
    const attacker = await connected(db, 'user-2');
    const issued = await issueCommand(db.dataSource, {
      userId: 'user-1',
      deviceId: victim.deviceId,
      action: LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO,
      toolName: AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO,
    });
    if (issued.ok === false) throw new Error('issue 실패');
    const r = await submitCommandResult(db.dataSource, attacker.deviceId, {
      commandId: issued.command.commandId,
      status: 'success',
      data: { osName: '남의 PC' },
    });
    expect(r).toEqual({ ok: false, errorCode: LOCAL_AGENT_ERROR.REPLAY_REJECTED });
  });

  it('12. 만료된 명령의 결과는 받아들이지 않는다', async () => {
    const db = makeDb();
    const agent = await connected(db);
    const issued = await issueCommand(db.dataSource, {
      userId: 'user-1',
      deviceId: agent.deviceId,
      action: LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO,
      toolName: AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO,
    });
    if (issued.ok === false) throw new Error('issue 실패');
    db.commands[0].expires_at = new Date(Date.now() - 1000).toISOString();

    const r = await submitCommandResult(db.dataSource, agent.deviceId, {
      commandId: issued.command.commandId,
      status: 'success',
      data: { osName: 'Windows 11' },
    });
    expect(r).toEqual({ ok: false, errorCode: LOCAL_AGENT_ERROR.EXPIRED });
    expect(db.commands[0].status).toBe('expired');
    expect(db.commands[0].result_data).toBeNull();
  });

  it('만료된 명령은 agent 에게 배달되지도 않는다', async () => {
    const db = makeDb();
    const agent = await connected(db);
    await issueCommand(db.dataSource, {
      userId: 'user-1',
      deviceId: agent.deviceId,
      action: LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO,
      toolName: AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO,
    });
    db.commands[0].expires_at = new Date(Date.now() - 1000).toISOString();
    expect(await claimPendingCommands(db.dataSource, agent.deviceId)).toEqual([]);
  });
});

// ─── 13. 응답 없는 PC (§30·§41) ──────────────────────────────────────────────

describe('13. PC 가 응답하지 않으면 정상적으로 timeout 된다', () => {
  it('timeout 은 예외가 아니라 expired 결과로 정규화된다', async () => {
    const db = makeDb();
    const agent = await connected(db);
    const issued = await issueCommand(db.dataSource, {
      userId: 'user-1',
      deviceId: agent.deviceId,
      action: LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO,
      toolName: AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO,
    });
    if (issued.ok === false) throw new Error('issue 실패');

    const r = await awaitCommandResult(db.dataSource, issued.command.commandId, 300);
    expect(r).toMatchObject({ status: 'expired', errorCode: LOCAL_AGENT_ERROR.TIMEOUT });
    // 뒤늦게 도착한 결과가 쓰이지 못하도록 명령이 못박힌다.
    expect(db.commands[0].status).toBe('expired');
    const late = await submitCommandResult(db.dataSource, agent.deviceId, {
      commandId: issued.command.commandId,
      status: 'success',
      data: { osName: '늦게 온 값' },
    });
    expect(late.ok).toBe(false);
  });
});

// ─── 14. 다중 기기 (§33) ─────────────────────────────────────────────────────

describe('14. 연결된 PC 가 여러 대면 임의로 고르지 않는다', () => {
  it('online 기기가 2대면 ambiguous 이고 capability 가 열리지 않는다', async () => {
    const db = makeDb();
    await connected(db, 'user-1');
    await connected(db, 'user-1');
    const r = await resolveTargetDevice(db.dataSource, 'user-1');
    expect(r.status).toBe('ambiguous');
    if (r.status === 'ambiguous') expect(r.count).toBe(2);

    const caps = deriveAiCapabilities(localCtx({ localAgentStatus: 'ambiguous' }));
    expect(caps).not.toContain(AiCapability.READ_ONLY_LOCAL_SYSTEM_INFO);
  });

  it('한 대만 online 이면 그 기기로 확정된다', async () => {
    const db = makeDb();
    const first = await connected(db, 'user-1');
    await connected(db, 'user-1');
    db.devices[1].last_seen_at = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const r = await resolveTargetDevice(db.dataSource, 'user-1');
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.device.id).toBe(first.deviceId);
  });
});

// ─── 15~16. 임의 shell · 임의 파일 접근이 불가능하다 (§22·§23·§25) ────────────

describe('15~16. 원격 제어 수단이 존재하지 않는다', () => {
  const agentSrcDir = join(__dirname, '..', '..', '..', '..', 'tools', 'o4o-local-agent', 'src');
  const readAgent = (f: string) => readFileSync(join(agentSrcDir, f), 'utf8');

  it('15. 프로토콜에 명령 문자열을 담을 필드가 없다', () => {
    const src = readFileSync(
      join(__dirname, '..', 'services', 'local-agent', 'local-agent-protocol.ts'),
      'utf8',
    );
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, ''))
      .join('\n');
    // args 는 값을 가질 수 없는 타입으로 못박혀 있다.
    expect(code).toContain('args: Record<string, never>');
    for (const forbidden of ['command:', 'script:', 'shell', 'cmd:', 'path:', 'url:']) {
      expect(code).not.toContain(forbidden);
    }
  });

  it('15. allowlist 는 2개뿐이고 전부 local.* read-only 다', () => {
    expect([...LOCAL_AGENT_ACTION_ALLOWLIST].sort()).toEqual(
      [LOCAL_AGENT_ACTIONS.GET_AGENT_STATUS, LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO].sort(),
    );
    expect(isAllowedLocalAction('local.exec_shell')).toBe(false);
    expect(isAllowedLocalAction('local.file_read')).toBe(false);
  });

  it('15. agent handler 는 프로세스 실행 수단을 import 하지 않는다', () => {
    const handlers = readAgent('handlers.mjs');
    const code = handlers
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, ''))
      .join('\n');
    const imports = [...code.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    // 실행 가능한 것은 os 조회뿐이다.
    expect(imports).toEqual(['node:os']);
    for (const forbidden of ['child_process', 'spawn', 'exec', 'execFile', 'vm', 'eval(']) {
      expect(code).not.toContain(forbidden);
    }
  });

  it('16. agent 저장소 전체에 임의 파일 접근 도구가 없다', () => {
    // fs 는 자기 자격증명 파일 한 곳에서만 쓰인다.
    expect(readAgent('handlers.mjs')).not.toContain("'node:fs'");
    expect(readAgent('index.mjs')).not.toContain("'node:fs'");
    const creds = readAgent('credentials.mjs');
    expect(creds).toContain("'node:fs'");
    // 그 파일이 다루는 경로는 credentials.json 하나뿐이다.
    expect(creds).toContain("'credentials.json'");
    // handler 쪽에는 credentials 모듈이 전달되지 않는다.
    expect(readAgent('handlers.mjs')).not.toContain('credentials');
  });

  it('16. 서버 executor 도 파일 · 프로세스 계열 API 를 쓰지 않는다', () => {
    const src = readFileSync(
      join(__dirname, '..', 'services', 'local-agent', 'local-agent-service.ts'),
      'utf8',
    );
    for (const forbidden of ['child_process', 'node:fs', "from 'fs'", 'execSync']) {
      expect(src).not.toContain(forbidden);
    }
  });
});

// ─── 17. 위조 · 18. 정보 최소화 (§21·§36) ────────────────────────────────────

describe('18. 화이트리스트 밖 필드는 어디에도 도달하지 않는다', () => {
  it('pickSafeSystemInfo 는 5개 필드만 통과시킨다', () => {
    const out = pickSafeSystemInfo({
      osName: 'Windows 11',
      username: 'hong',
      homeDir: 'C:\\Users\\hong',
      ipAddress: '192.168.0.5',
      macAddress: 'AA:BB:CC:DD:EE:FF',
      env: { SECRET: 'x' },
      processList: ['pm2000.exe'],
      installedSoftware: ['PharmIT3000'],
    });
    expect(Object.keys(out)).toEqual(['osName']);
    expect(SAFE_SYSTEM_INFO_FIELDS).toEqual([
      'osName',
      'osVersion',
      'architecture',
      'agentVersion',
      'deviceName',
    ]);
  });

  it('변조된 agent 가 추가 필드를 밀어 넣어도 DB 에 저장되지 않는다', async () => {
    const db = makeDb();
    const agent = await connected(db);
    const issued = await issueCommand(db.dataSource, {
      userId: 'user-1',
      deviceId: agent.deviceId,
      action: LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO,
      toolName: AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO,
    });
    if (issued.ok === false) throw new Error('issue 실패');
    await claimPendingCommands(db.dataSource, agent.deviceId);
    await submitCommandResult(db.dataSource, agent.deviceId, {
      commandId: issued.command.commandId,
      status: 'success',
      data: {
        osName: 'Windows 11',
        patientName: '홍길동',
        prescription: '처방전 내용',
        password: 'hunter2',
      },
    });
    const stored = String(db.commands[0].result_data ?? '');
    expect(stored).toContain('Windows 11');
    expect(stored).not.toContain('홍길동');
    expect(stored).not.toContain('처방전');
    expect(stored).not.toContain('hunter2');
  });

  it('실패 결과에는 result_data 를 아예 남기지 않는다', async () => {
    const db = makeDb();
    const agent = await connected(db);
    const issued = await issueCommand(db.dataSource, {
      userId: 'user-1',
      deviceId: agent.deviceId,
      action: LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO,
      toolName: AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO,
    });
    if (issued.ok === false) throw new Error('issue 실패');
    await submitCommandResult(db.dataSource, agent.deviceId, {
      commandId: issued.command.commandId,
      status: 'failed',
      data: { stack: 'C:\\Users\\hong\\... 스택 트레이스' },
      errorCode: LOCAL_AGENT_ERROR.EXECUTION_FAILED,
    });
    expect(db.commands[0].result_data).toBeNull();
  });
});

// ─── 19. tool 실행 경로 (§26·§41) ─────────────────────────────────────────────

describe('19. AI tool 경로 — 미연결 상태를 추측하지 않는다', () => {
  it('상태 tool 은 PC 를 깨우지 않고 DB 만으로 답한다', async () => {
    const db = makeDb();
    await connected(db);
    const r = await executeAiTool(
      db.dataSource,
      AI_TOOL_NAMES.GET_LOCAL_AGENT_STATUS,
      {},
      localCtx(),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.connected).toBe(true);
    // 명령을 만들지 않았다.
    expect(db.commands).toHaveLength(0);
  });

  it('상태 tool 은 deviceId 를 노출하지 않는다', async () => {
    const db = makeDb();
    const agent = await connected(db);
    const r = await executeAiTool(
      db.dataSource,
      AI_TOOL_NAMES.GET_LOCAL_AGENT_STATUS,
      {},
      localCtx(),
    );
    expect(JSON.stringify(r)).not.toContain(agent.deviceId);
  });

  it('미연결이면 "확인할 수 없다" 는 문장이 프롬프트에 들어간다 (추측 금지)', async () => {
    const db = makeDb();
    const r = await executeAiTool(
      db.dataSource,
      AI_TOOL_NAMES.GET_LOCAL_AGENT_STATUS,
      {},
      localCtx(),
    );
    const block = renderToolContext(r);
    expect(block).toContain('연결되어 있지 않습니다');
    expect(block).toContain('추측');
  });

  it('연결이 여러 대면 임의로 고르지 말라고 명시한다', async () => {
    const db = makeDb();
    await connected(db, 'user-1');
    await connected(db, 'user-1');
    const r = await executeAiTool(
      db.dataSource,
      AI_TOOL_NAMES.GET_LOCAL_AGENT_STATUS,
      {},
      localCtx(),
    );
    const block = renderToolContext(r);
    expect(block).toContain('임의로');
  });

  it('자격 없이 system info tool 을 부르면 명령이 발행되지 않는다', async () => {
    const db = makeDb();
    await connected(db);
    const r = await executeAiTool(
      db.dataSource,
      AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO,
      {},
      localCtx({ localAgentStatus: 'offline' }),
    );
    expect(r.ok).toBe(false);
    expect(db.commands).toHaveLength(0);
  });
});

// ─── 20. 의도 인식 · 회귀 (§27) ──────────────────────────────────────────────

describe('20. 로컬 의도 인식 — 번들 후에도 살아 있어야 한다', () => {
  it('한글 · 영어 로컬 지시어를 인식한다', () => {
    for (const m of ['내 PC 사양 알려줘', '내PC 상태', '이 컴퓨터 운영체제', 'my pc spec', 'this PC os']) {
      expect(looksLikeLocalScopedRequest(m)).toBe(true);
    }
    for (const m of ['안녕하세요', '약국 POP 원칙', 'store hours']) {
      expect(looksLikeLocalScopedRequest(m)).toBe(false);
    }
  });

  /**
   * 회귀 고정 — 2026-09-09 프로덕션 실측 결함의 재발 방지.
   * 한글을 정규식 리터럴로 두면 번들(charset=ascii) 후 매칭이 실패한다.
   */
  it('한글 키워드가 정규식이 아닌 ASCII 이스케이프 문자열로 유지된다', () => {
    const src = readFileSync(
      join(__dirname, '..', 'services', 'ai-tools', 'ai-tool-router.ts'),
      'utf8',
    );
    for (const decl of ['LOCAL_INTENT_KEYWORDS_KO', 'SYSTEM_INFO_KEYWORDS_KO']) {
      const start = src.indexOf(`${decl}: readonly string[] = [`);
      expect(start).toBeGreaterThan(-1);
      const block = src.slice(start, src.indexOf('];', start) + 2);
      const codeOnly = block
        .split('\n')
        .map((l) => l.split('//')[0])
        .join('\n');
      expect(codeOnly).not.toMatch(/[가-힣]/);
      expect(codeOnly).toMatch(/\\u[0-9A-F]{4}/);
    }
  });

  it('로컬 지시어가 없으면 local tool 을 고르지 않는다 (Home AI 회귀 0)', () => {
    const ctx = localCtx({ localAgentStatus: 'connected', localDeviceId: 'dev-1' });
    expect(selectToolForRequest('약국 POP 원칙 3가지', ctx)).toBeNull();
    expect(selectToolForRequest('안녕하세요', ctx)).toBeNull();
  });

  it('연결되어 있으면 사양 질문에 system info tool 을, 아니면 상태 tool 을 고른다', () => {
    const connectedCtx = localCtx({ localAgentStatus: 'connected', localDeviceId: 'dev-1' });
    expect(selectToolForRequest('내 PC 운영체제 알려줘', connectedCtx)).toBe(
      AI_TOOL_NAMES.GET_LOCAL_SYSTEM_INFO,
    );
    // 자격이 없으면 대신 상태 tool 로 내려간다 — 없는 정보를 지어내지 않게.
    expect(selectToolForRequest('내 PC 운영체제 알려줘', localCtx({ localAgentStatus: 'none' }))).toBe(
      AI_TOOL_NAMES.GET_LOCAL_AGENT_STATUS,
    );
  });

  it('한 요청에 tool 은 최대 1개다 (agent loop 없음)', () => {
    const selected = selectToolForRequest(
      '내 PC 사양이랑 내 매장 기능 다 알려줘',
      localCtx({ localAgentStatus: 'connected', localDeviceId: 'dev-1' }),
    );
    expect(typeof selected === 'string' || selected === null).toBe(true);
  });
});
