/**
 * WO-O4O-LOCAL-WORK-AGENT-V0 — Local Execution Runtime 계약 고정 (§43)
 *
 * 여기서 고정하려는 것은 "기능이 동작한다" 가 아니라 **경계가 무너지지 않는다** 이다.
 *
 *   - pairing grant 는 단명 · 1회용이고, 서버에 평문으로 남지 않는다 (§12)
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
  APP_TARGET_ACTIONS,
  COMPUTER_TARGET_ACTIONS,
  DATA_TARGET_ACTIONS,
  DOM_TARGET_ACTIONS,
  SITE_TARGET_ACTIONS,
  composeAppAction,
  LOCAL_AGENT_ACTIONS,
  LOCAL_AGENT_ACTION_ALLOWLIST,
  LOCAL_AGENT_ERROR,
  SAFE_SYSTEM_INFO_FIELDS,
  isAllowedLocalAction,
  pickSafeSystemInfo,
} from '../services/local-agent/local-agent-protocol.js';
import { WINDOWS_APP_IDS } from '../services/local-agent/windows-app-registry.js';
import { BROWSER_SITE_IDS } from '../services/local-agent/browser-site-registry.js';
import {
  authenticateAgentSession,
  awaitCommandResult,
  claimPendingCommands,
  createPairingGrant,
  issueCommand,
  listUserDevices,
  openAgentSession,
  redeemPairingGrant,
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
  needsLocalDeviceResolution,
  renderToolContext,
  selectToolForRequest,
} from '../services/ai-tools/ai-tool-router.js';

import { makeDb, pairAndRegister, connected, REGISTER } from './helpers/local-agent-db-stub.js';

const localCtx = (over: Partial<VerifiedToolContext> = {}): VerifiedToolContext => ({
  userId: 'user-1',
  workspace: 'home',
  ...over,
});

// ─── 1. Pairing (§12 · ONECLICK §7) ──────────────────────────────────────────

describe('1~3. Pairing — 단명 · 1회용 · 사용자 소유', () => {
  it('1. 정상 pairing 으로 device 가 등록되고 기기 자격증명이 발급된다', async () => {
    const db = makeDb();
    const reg = await pairAndRegister(db);
    expect(reg.deviceId).toMatch(/^[0-9a-f-]{36}$/);
    expect(reg.agentCredential.length).toBeGreaterThan(20);
    expect(db.devices).toHaveLength(1);
    expect(db.devices[0].user_id).toBe('user-1');
  });

  it('pairing grant 와 credential 은 평문으로 저장되지 않는다 (해시만 남는다)', async () => {
    const db = makeDb();
    const reg = await pairAndRegister(db);
    const dump = JSON.stringify({ p: db.pairings, d: db.devices, s: db.sessions });
    expect(dump).not.toContain(reg.grant);
    expect(dump).not.toContain(reg.agentCredential);
    // 남아 있는 것은 64자 SHA-256 hex 뿐이다.
    expect(db.pairings[0].code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(db.devices[0].credential_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('2. 잘못된 grant 는 거부된다', async () => {
    const db = makeDb();
    await createPairingGrant(db.dataSource, 'user-1');
    const r = await redeemPairingGrant(db.dataSource, { grant: 'not-a-real-grant', ...REGISTER });
    expect(r).toEqual({ ok: false, reason: 'INVALID_PAIRING_GRANT' });
    expect(db.devices).toHaveLength(0);
  });

  it('2. 만료된 grant 는 거부된다', async () => {
    const db = makeDb();
    const { grant } = await createPairingGrant(db.dataSource, 'user-1');
    db.pairings[0].expires_at = new Date(Date.now() - 1000).toISOString();
    const r = await redeemPairingGrant(db.dataSource, { grant, ...REGISTER });
    expect(r).toEqual({ ok: false, reason: 'PAIRING_EXPIRED' });
    expect(db.devices).toHaveLength(0);
  });

  it('2. 같은 grant 를 두 번 쓸 수 없다 (1회용)', async () => {
    const db = makeDb();
    const { grant } = await createPairingGrant(db.dataSource, 'user-1');
    const first = await redeemPairingGrant(db.dataSource, { grant, ...REGISTER });
    const second = await redeemPairingGrant(db.dataSource, { grant, ...REGISTER });
    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, reason: 'INVALID_PAIRING_GRANT' });
    expect(db.devices).toHaveLength(1);
  });

  it('3. device 는 grant 를 발급한 사용자에게 귀속된다 (agent 가 사용자를 고를 수 없다)', async () => {
    const db = makeDb();
    const { grant } = await createPairingGrant(db.dataSource, 'owner-42');
    // agent 가 본문에 다른 userId 를 실어 보낼 방법 자체가 입력 타입에 없다.
    const r = await redeemPairingGrant(db.dataSource, { grant, ...REGISTER });
    expect(r.ok).toBe(true);
    expect(db.devices[0].user_id).toBe('owner-42');
  });

  it('Windows 외 플랫폼은 V0 에서 등록되지 않는다', async () => {
    const db = makeDb();
    const { grant } = await createPairingGrant(db.dataSource, 'user-1');
    const r = await redeemPairingGrant(db.dataSource, {
      grant,
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

  /**
   * production smoke 에서 발견한 결함의 회귀 테스트.
   *
   * `deviceId` 는 Postgres `uuid` 컬럼으로 들어간다. 형식이 아닌 문자열을 그대로
   * 넘기면 DB 가 예외를 던지고 그것이 라우트의 catch 를 지나 **500** 이 되었다.
   * 그러면 "그런 기기 없다"(401) 와 "서버가 고장났다"(500) 가 구분되지 않는다.
   * 형식 위반은 장애가 아니라 거절이다.
   */
  it('4. 형식이 uuid 가 아닌 deviceId 는 서버 오류가 아니라 거절이다', async () => {
    const db = makeDb();
    for (const bogus of ['', 'not-a-uuid', "' OR 1=1 --", '../../etc/passwd']) {
      const r = await openAgentSession(db.dataSource, bogus, 'anything');
      expect(r).toEqual({ ok: false, reason: 'DEVICE_NOT_FOUND' });
    }
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

  it('11. 형식이 uuid 가 아닌 commandId 도 서버 오류가 아니라 거절이다', async () => {
    const db = makeDb();
    const agent = await connected(db);
    for (const bogus of ['not-a-uuid', "' OR 1=1 --"]) {
      const r = await submitCommandResult(db.dataSource, agent.deviceId, {
        commandId: bogus,
        status: 'success',
        data: { osName: 'Windows 11' },
      });
      expect(r).toEqual({ ok: false, errorCode: LOCAL_AGENT_ERROR.REPLAY_REJECTED });
    }
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

  it('15. allowlist 는 전부 local.* 이고 열거된 항목이 전부다', () => {
    // WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 에서 창 축이 추가되면서 allowlist 는 더 이상
    // 2개가 아니다. 다만 **열거된 문자열의 집합**이라는 성질은 그대로다 — appId 는 인자가
    // 아니라 allowlist 항목 자체에 박혀 있으므로, 등재되지 않은 대상은 allowlist 밖의
    // 문자열이 되어 애초에 명령이 되지 못한다.
    // WO-O4O-BROWSER-CONTROL-V0: 사이트 축이 같은 방식(등재 siteId 를 action 문자열에 박음)으로
    // 추가됐다. URL 은 어떤 항목에도 없다 — allowlist 에 'http' 가 등장하지 않는다.
    // WO-O4O-COMPUTER-USE-V0: 화면 조작 축(등재 appId 당 4항목). 좌표·텍스트·키는 args 로 가지만
    // **대상**은 여전히 allowlist 항목에 박힌 등재 appId 뿐이다 — HWND · 임의 창은 표현 불가.
    expect([...LOCAL_AGENT_ACTION_ALLOWLIST].sort()).toEqual(
      [
        LOCAL_AGENT_ACTIONS.GET_AGENT_STATUS,
        LOCAL_AGENT_ACTIONS.GET_SYSTEM_INFO,
        // LOCAL-DATA-TOOL-BRIDGE-V1: 데이터 축 3개는 #appId 조합이 없다(대상이 로컬 DB 하나).
        ...DATA_TARGET_ACTIONS,
        ...APP_TARGET_ACTIONS.flatMap((base) =>
          WINDOWS_APP_IDS.map((appId) => composeAppAction(base, appId)),
        ),
        ...SITE_TARGET_ACTIONS.flatMap((base) =>
          BROWSER_SITE_IDS.map((siteId) => composeAppAction(base, siteId)),
        ),
        ...COMPUTER_TARGET_ACTIONS.flatMap((base) =>
          WINDOWS_APP_IDS.map((appId) => composeAppAction(base, appId)),
        ),
        // BROWSER-DOM-CONTROL-V0: DOM 축(등재 siteId 당 8항목). 탭 id · URL · selector 는 어느 항목에도 없다.
        ...DOM_TARGET_ACTIONS.flatMap((base) =>
          BROWSER_SITE_IDS.map((siteId) => composeAppAction(base, siteId)),
        ),
      ].sort(),
    );
    for (const action of LOCAL_AGENT_ACTION_ALLOWLIST) {
      expect(action).not.toMatch(/https?:/i);
    }
    for (const action of LOCAL_AGENT_ACTION_ALLOWLIST) {
      expect(action.startsWith('local.')).toBe(true);
    }
    expect(isAllowedLocalAction('local.exec_shell')).toBe(false);
    expect(isAllowedLocalAction('local.file_read')).toBe(false);
    // 등재 앱이 아닌 대상은 형태가 같아도 통과하지 못한다.
    expect(isAllowedLocalAction('local.activate_window#windows.cmd')).toBe(false);
    // 등재 사이트가 아닌 대상도, URL 을 직접 실은 형태도 통과하지 못한다(BROWSER-CONTROL-V0 §10·§11).
    expect(isAllowedLocalAction('local.browser.open_site#evil.example')).toBe(false);
    expect(isAllowedLocalAction('local.browser.open_site#https://neture.co.kr/')).toBe(false);
    expect(isAllowedLocalAction('local.browser.open_site')).toBe(false);
  });

  it('15. agent handler 는 프로세스 실행 수단을 직접 쓰지 않는다', () => {
    const handlers = readAgent('handlers.mjs');
    const code = handlers
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, ''))
      .join('\n');
    const imports = [...code.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    // 창 제어가 들어오면서 저장소 안 모듈 두 개가 늘었고, 브라우저 제어(BROWSER-CONTROL-V0)로
    // 등재부 하나가 더 늘었다. 화면 조작(COMPUTER-USE-V0)으로 인자 한도 모듈(순수 함수, import 0)이
    // 하나 더 늘었다. 로컬 데이터(LOCAL-DATA-SQLITE-V0)로 SQLite 접근 모듈이 하나 더
    // 늘었다 — 그 모듈이 node:sqlite·node:fs 를 캡슐화하므로 handler 자신은 여전히
    // node 표준 모듈로 os 만 가진다. 외부 프로세스 실행은 windows-window-control.mjs 한 곳뿐이다.
    expect(imports).toEqual([
      'node:os',
      './windows-app-registry.mjs',
      './browser-site-registry.mjs',
      './windows-window-control.mjs',
      './computer-use-limits.mjs',
      './local-db.mjs',
      // BROWSER-DOM-CONTROL-V0: DOM 인자·결과 한도 사본(순수). 확장 통로(bridge relay)는 index.mjs 가
      // context 로 넘기므로 handler 는 net 모듈을 import 하지 않는다.
      './browser-dom-limits.mjs',
    ]);
    expect(imports.filter((i) => i.startsWith('node:'))).toEqual(['node:os']);
    for (const forbidden of ['child_process', 'spawn(', 'exec(', 'execFile', 'vm', 'eval(']) {
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

// ─── Local Data Runtime V0 경계 (WO-O4O-LOCAL-DATA-SQLITE-V0 §36·§37·§31·§33·§34·§48) ──

describe('로컬 SQLite 런타임의 경계가 소스에 박혀 있다', () => {
  const agentSrcDir = join(__dirname, '..', '..', '..', '..', 'tools', 'o4o-local-agent', 'src');
  const readAgent = (f: string) => readFileSync(join(agentSrcDir, f), 'utf8');
  const stripComments = (src: string) =>
    src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, ''))
      .join('\n');

  it('§48-14. 임의 SQL 실행 tool 이 어디에도 없다', () => {
    for (const f of ['handlers.mjs', 'local-db.mjs', 'index.mjs']) {
      const code = stripComments(readAgent(f));
      expect(code).not.toContain('execute_sql');
      expect(code).not.toContain('local.sqlite');
    }
  });

  it('§48-15. local-db 는 임의 파일을 읽지 않는다 — 자기 홈 디렉터리만 만든다', () => {
    const code = stripComments(readAgent('local-db.mjs'));
    // fs 사용은 mkdir 하나뿐. 파일 읽기·디렉터리 스캔 API 가 없다(§19).
    expect(code).toContain('mkdirSync');
    for (const forbidden of ['readFileSync', 'readFile', 'readdir', 'readdirSync', 'glob']) {
      expect(code).not.toContain(forbidden);
    }
  });

  it('§48-15b. DB 경로는 모듈이 스스로 정한다 — DatabaseSync 는 자기 경로로만 한 번 열린다', () => {
    const code = stripComments(readAgent('local-db.mjs'));
    expect(code).toContain('O4O_AGENT_HOME');
    expect(code).toContain("'local.db'");
    expect(code).toContain('new DatabaseSync(dbPath())');
    // DatabaseSync 를 여는 곳은 dbPath() 한 곳뿐 — 서버가 준 경로로 여는 통로가 없다.
    expect((code.match(/new DatabaseSync\(/g) ?? []).length).toBe(1);
  });

  it('§48-16. cloud 동기화 수단이 없다 — local-db 에 네트워크 API 가 없다', () => {
    const code = stripComments(readAgent('local-db.mjs'));
    for (const forbidden of ['fetch(', 'http', 'XMLHttpRequest', 'node:net', 'WebSocket', 'upload']) {
      expect(code).not.toContain(forbidden);
    }
  });

  it('§48-17. credential 저장이 없다 — DB 정체성에 비밀번호·토큰·쿠키를 쓰지 않는다', () => {
    const code = stripComments(readAgent('local-db.mjs'));
    // local_db_id 는 무작위 UUID 다(§9).
    expect(code).toContain('randomUUID()');
    for (const forbidden of ['password', 'agentCredential', 'cookie', 'accessToken', 'refreshToken']) {
      expect(code).not.toContain(forbidden);
    }
    // local-db 는 credentials 모듈을 가져오지 않는다.
    expect(code).not.toContain('credentials');
  });

  it('§33. 민감정보(환자·처방·보험·주민번호) 스키마를 만들지 않는다', () => {
    const code = stripComments(readAgent('local-db.mjs'));
    for (const forbidden of ['patient', 'prescription', 'insurance', 'resident', 'rrn', 'ssn']) {
      expect(code).not.toContain(forbidden);
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
   * 회귀 고정 — 2026-09-10 프로덕션 실측 결함의 재발 방지.
   *
   * 라우트가 device 조회 여부를 **자기 규칙으로** 판단하면 라우터의 선택 규칙과
   * 어긋난다. 창 축 문장에는 로컬 지시어("내 PC")가 없어서 device 를 조회하지 않았고,
   * capability 가 비어 tool 이 하나도 고려되지 않았다(응답 `tool: null`).
   */
  it('창 축 문장은 로컬 지시어가 없어도 device 조회 대상이다', () => {
    for (const m of ['메모장이 실행되고 있는지 확인해 줘', 'is notepad running?']) {
      expect(looksLikeLocalScopedRequest(m)).toBe(false);
      expect(needsLocalDeviceResolution(m)).toBe(true);
    }
    // 로컬 지시어 쪽도 그대로 살아 있어야 한다.
    expect(needsLocalDeviceResolution('내 PC 사양 알려줘')).toBe(true);
    expect(needsLocalDeviceResolution('안녕하세요')).toBe(false);
  });

  /** 라우트가 그 판정을 다시 자기 손으로 하지 않는지 소스로 고정한다. */
  it('ai-proxy.routes 는 needsLocalDeviceResolution 만 쓴다', () => {
    const src = readFileSync(
      join(__dirname, '..', 'routes', 'ai-proxy.routes.ts'),
      'utf8',
    );
    expect(src).toContain('needsLocalDeviceResolution(message)');
    expect(src).not.toContain('looksLikeLocalScopedRequest(message)');
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
