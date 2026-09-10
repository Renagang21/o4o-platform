/**
 * Local Work Agent — 서버측 SSOT (§14)
 *
 * WO-O4O-LOCAL-WORK-AGENT-V0
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일의 한 줄 요약
 *
 *   **agent 가 자기에 대해 주장하는 것은 아무것도 믿지 않는다.**
 *
 * agent 는 "나는 이 사용자의 PC 다" 라고 말할 수 없다. 말할 수 있는 것은 "이 세션 토큰을
 * 가지고 있다" 뿐이고, 그 토큰이 어느 device 에 속하고 그 device 가 어느 user 에 속하는지는
 * **전부 DB 가 정한다**. deviceId·userId 는 요청 본문에서 읽지 않는다 — 세션에서 파생한다.
 *
 * 직전 WO(AI Tool Routing V0)에서 client 가 보낸 serviceKey 를 서버가 재확정한 것과
 * 같은 규칙이다. 신뢰 경계는 항상 서버 안쪽에 있다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 자격증명 (§13)
 *
 *   pairing code     — 단명(5분) · 1회용 · user 소유 · 서비스 무관
 *   agent credential — 장기이지만 **agent 만** 보유. 서버는 SHA-256 해시만 저장한다
 *   session token    — 단명(2시간) · 해시 저장 · 명령 수신/결과 제출에만 사용
 *
 * user password · JWT refresh token · service credential · browser cookie 는
 * 이 경로 어디에도 등장하지 않는다. agent 는 사용자의 로그인 자격을 **본 적이 없다.**
 */

import { randomUUID, randomBytes, createHash, timingSafeEqual } from 'crypto';
import type { DataSource } from 'typeorm';
import {
  LOCAL_AGENT_ERROR,
  SUPPORTED_AGENT_PLATFORMS,
  isAllowedLocalAction,
  pickSafeSystemInfo,
  type LocalAgentAction,
  type LocalCommand,
  type LocalCommandResult,
} from './local-agent-protocol.js';

// ─── 정책 상수 ────────────────────────────────────────────────────────────────

/** pairing code 유효 시간. 짧을수록 좋다 — 사람이 한 번 옮겨 적을 시간이면 충분하다. */
const PAIRING_TTL_MS = 5 * 60 * 1000;
/** session token 유효 시간. 만료되면 agent 가 credential 로 조용히 갱신한다. */
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
/** 이 시간 안에 heartbeat 가 없으면 offline 로 본다 (§31). */
const ONLINE_WINDOW_MS = 90 * 1000;
/** 명령 유효 시간 (§18 expiresAt). agent 가 늦게 집어가도 실행하지 않는다. */
const COMMAND_TTL_MS = 20 * 1000;
/** 서버가 결과를 기다리는 시간 (§30). 넘으면 LOCAL_AGENT_TIMEOUT. */
export const COMMAND_WAIT_TIMEOUT_MS = 12 * 1000;
/** 결과를 기다릴 때의 DB polling 간격. */
const RESULT_POLL_INTERVAL_MS = 250;

// ─── 비밀값 처리 ──────────────────────────────────────────────────────────────

/**
 * 비밀값은 **해시만** 저장한다. 평문은 발급 응답에 한 번 실려 나간 뒤 서버에 남지 않는다.
 * DB 가 유출되어도 pairing code / credential / session token 을 복원할 수 없다.
 */
function hashSecret(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * uuid 컬럼에 넣기 전의 형식 검사.
 *
 * `local_agent_devices.id` · `local_agent_commands.command_id` 는 Postgres `uuid` 다.
 * 형식이 아닌 문자열을 그대로 넘기면 드라이버가 아니라 **DB** 가 거절하며, 그 예외는
 * 라우트의 catch 로 올라가 500 이 된다. 즉 "존재하지 않는 기기" 와 "서버 장애" 가
 * 같은 응답이 되어 버린다.
 *
 * 형식 위반은 장애가 아니라 **거절**이다. 조회 전에 걸러 정상 거절 경로로 보낸다.
 */
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function newSecret(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * pairing code 는 사람이 화면에서 옮겨 적는다. 혼동되는 글자(0/O, 1/I)를 뺀 사전으로
 * 10자리를 만든다 — 대략 50 bit. 5분 · 1회용이므로 무차별 대입이 성립하지 않는다.
 */
const PAIRING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newPairingCode(): string {
  const buf = randomBytes(10);
  let out = '';
  for (let i = 0; i < 10; i += 1) out += PAIRING_ALPHABET[buf[i] % PAIRING_ALPHABET.length];
  return `${out.slice(0, 5)}-${out.slice(5)}`;
}

/** 해시 비교는 상수 시간으로. 길이가 다르면 즉시 false (timingSafeEqual 이 던진다). */
function hashEquals(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface DeviceRow {
  id: string;
  userId: string;
  deviceName: string | null;
  platform: string;
  agentVersion: string;
  status: string;
  lastSeenAt: string | null;
}

export interface AgentSessionContext {
  deviceId: string;
  userId: string;
  sessionId: string;
}

export type DeviceResolution =
  | { status: 'ok'; device: DeviceRow }
  | { status: 'none' }
  | { status: 'offline'; device: DeviceRow }
  | { status: 'ambiguous'; count: number };

// ─── 1. Pairing (§11·§12) ─────────────────────────────────────────────────────

/**
 * 로그인한 사용자가 "이 PC 를 연결" 을 누르면 발급된다.
 *
 * 사용자가 장기 API key 를 복사·붙여넣기 하는 구조를 피하기 위한 우회로다(§12).
 * 사용자가 옮기는 것은 **5분짜리 1회용 코드**이고, 실제 장기 자격증명은 agent 가
 * 그 코드를 소모하면서 서버로부터 직접 받는다 — 사람 눈에 띄지 않는다.
 */
export async function createPairingCode(
  dataSource: DataSource,
  userId: string,
): Promise<{ code: string; expiresAt: string }> {
  const code = newPairingCode();
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MS);

  // 같은 사용자의 기존 미사용 코드는 무효화한다. 살아 있는 코드는 항상 최대 1개.
  await dataSource.query(
    `UPDATE local_agent_pairings SET consumed_at = now()
      WHERE user_id = $1 AND consumed_at IS NULL`,
    [userId],
  );
  await dataSource.query(
    `INSERT INTO local_agent_pairings (id, user_id, code_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), userId, hashSecret(code), expiresAt.toISOString()],
  );

  return { code, expiresAt: expiresAt.toISOString() };
}

export interface RegisterDeviceInput {
  code: string;
  deviceName?: string;
  platform: string;
  agentVersion: string;
}

export type RegisterDeviceOutcome =
  | { ok: true; deviceId: string; agentCredential: string }
  | { ok: false; reason: 'INVALID_PAIRING_CODE' | 'PAIRING_EXPIRED' | 'UNSUPPORTED_PLATFORM' };

/**
 * agent 가 pairing code 를 제시하고 device 로 등록된다.
 *
 * deviceId 는 **서버가 만든 random UUID** 다(§10). agent 가 보낸 값이 아니고,
 * MAC · 디스크 시리얼 · CPU id 같은 hardware fingerprint 에서 파생하지도 않는다.
 * 같은 PC 에 agent 를 재설치하면 새 device 가 되는 편이, 하드웨어를 식별해 두는 것보다 낫다.
 */
export async function consumePairingAndRegisterDevice(
  dataSource: DataSource,
  input: RegisterDeviceInput,
): Promise<RegisterDeviceOutcome> {
  if (!SUPPORTED_AGENT_PLATFORMS.includes(input.platform)) {
    return { ok: false, reason: 'UNSUPPORTED_PLATFORM' };
  }

  const codeHash = hashSecret(String(input.code ?? ''));
  const rows = await dataSource.query(
    `SELECT id, user_id, expires_at, consumed_at
       FROM local_agent_pairings
      WHERE code_hash = $1
      LIMIT 1`,
    [codeHash],
  );
  const pairing = rows?.[0];
  if (!pairing) return { ok: false, reason: 'INVALID_PAIRING_CODE' };
  // 이미 쓴 코드는 "만료" 가 아니라 "무효" 다 — 재사용 시도와 정상 만료를 구분해서 알려주지 않는다.
  if (pairing.consumed_at) return { ok: false, reason: 'INVALID_PAIRING_CODE' };
  if (new Date(pairing.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'PAIRING_EXPIRED' };
  }

  // 1회용 보장: consumed_at IS NULL 조건부 UPDATE. 동시 요청 중 하나만 row 를 돌려받는다.
  const claimed = await dataSource.query(
    `UPDATE local_agent_pairings SET consumed_at = now()
      WHERE id = $1 AND consumed_at IS NULL
      RETURNING id`,
    [pairing.id],
  );
  if (!claimed || claimed.length === 0) return { ok: false, reason: 'INVALID_PAIRING_CODE' };

  const deviceId = randomUUID();
  const agentCredential = newSecret();
  await dataSource.query(
    `INSERT INTO local_agent_devices
       (id, user_id, device_name, platform, agent_version, credential_hash, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
    [
      deviceId,
      pairing.user_id,
      input.deviceName ? String(input.deviceName).slice(0, 80) : null,
      input.platform,
      String(input.agentVersion ?? '').slice(0, 40),
      hashSecret(agentCredential),
    ],
  );

  return { ok: true, deviceId, agentCredential };
}

// ─── 2. Session (§13·§14) ─────────────────────────────────────────────────────

export type OpenSessionOutcome =
  | { ok: true; sessionToken: string; expiresAt: string; userId: string }
  | { ok: false; reason: 'DEVICE_NOT_FOUND' | 'DEVICE_REVOKED' | 'BAD_CREDENTIAL' };

/** agent 가 credential 로 단명 세션을 연다. credential 자체는 명령 경로에 쓰이지 않는다. */
export async function openAgentSession(
  dataSource: DataSource,
  deviceId: string,
  agentCredential: string,
): Promise<OpenSessionOutcome> {
  // 형식이 틀린 deviceId 는 조회할 것도 없이 "그런 기기 없음" 이다.
  if (!isUuid(deviceId)) return { ok: false, reason: 'DEVICE_NOT_FOUND' };
  const rows = await dataSource.query(
    `SELECT id, user_id, status, credential_hash FROM local_agent_devices WHERE id = $1 LIMIT 1`,
    [deviceId],
  );
  const device = rows?.[0];
  if (!device) return { ok: false, reason: 'DEVICE_NOT_FOUND' };
  if (device.status !== 'active') return { ok: false, reason: 'DEVICE_REVOKED' };
  if (!hashEquals(device.credential_hash, hashSecret(String(agentCredential ?? '')))) {
    return { ok: false, reason: 'BAD_CREDENTIAL' };
  }

  const sessionToken = newSecret();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await dataSource.query(
    `INSERT INTO local_agent_sessions (id, device_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), deviceId, hashSecret(sessionToken), expiresAt.toISOString()],
  );
  await dataSource.query(`UPDATE local_agent_devices SET last_seen_at = now() WHERE id = $1`, [
    deviceId,
  ]);

  return { ok: true, sessionToken, expiresAt: expiresAt.toISOString(), userId: device.user_id };
}

/**
 * 세션 토큰 → (deviceId, userId). **모든 agent 요청의 유일한 신원 출처다.**
 *
 * 요청 본문의 deviceId/userId 는 읽지 않는다. device 가 revoke 되면 살아 있던 세션도
 * 같은 조인에서 함께 탈락한다 — 세션을 따로 정리하지 않아도 즉시 무력화된다.
 */
export async function authenticateAgentSession(
  dataSource: DataSource,
  sessionToken: string,
): Promise<AgentSessionContext | null> {
  if (!sessionToken) return null;
  const rows = await dataSource.query(
    `SELECT s.id AS session_id, s.device_id, d.user_id
       FROM local_agent_sessions s
       JOIN local_agent_devices d ON d.id = s.device_id
      WHERE s.token_hash = $1
        AND s.ended_at IS NULL
        AND s.expires_at > now()
        AND d.status = 'active'
      LIMIT 1`,
    [hashSecret(sessionToken)],
  );
  const row = rows?.[0];
  if (!row) return null;
  return { sessionId: row.session_id, deviceId: row.device_id, userId: row.user_id };
}

/** heartbeat (§32). lastSeenAt 갱신이 전부다 — 별도 연결 상태 테이블을 두지 않는다. */
export async function recordHeartbeat(dataSource: DataSource, deviceId: string): Promise<void> {
  await dataSource.query(`UPDATE local_agent_devices SET last_seen_at = now() WHERE id = $1`, [
    deviceId,
  ]);
}

// ─── 3. Device 선택 (§33·§34) ─────────────────────────────────────────────────

function mapDevice(row: Record<string, unknown>): DeviceRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    deviceName: (row.device_name as string) ?? null,
    platform: String(row.platform),
    agentVersion: String(row.agent_version),
    status: String(row.status),
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at as string).toISOString() : null,
  };
}

function isOnline(device: DeviceRow): boolean {
  if (!device.lastSeenAt) return false;
  return Date.now() - new Date(device.lastSeenAt).getTime() <= ONLINE_WINDOW_MS;
}

/**
 * 이 사용자의 명령을 어느 device 로 보낼지 정한다.
 *
 * **device 가 2대 이상이면 임의로 고르지 않는다**(§33). "아마 이걸 쓰겠지" 로 남의 PC 에
 * 명령을 보내는 것보다, 모호하다고 말하고 멈추는 편이 옳다. V0 는 online device 가
 * 정확히 1대일 때만 자동 사용한다(§34).
 */
export async function resolveTargetDevice(
  dataSource: DataSource,
  userId: string,
): Promise<DeviceResolution> {
  const rows = await dataSource.query(
    `SELECT id, user_id, device_name, platform, agent_version, status, last_seen_at
       FROM local_agent_devices
      WHERE user_id = $1 AND status = 'active'
      ORDER BY last_seen_at DESC NULLS LAST`,
    [userId],
  );
  const devices: DeviceRow[] = (rows ?? []).map(mapDevice);
  if (devices.length === 0) return { status: 'none' };

  const online = devices.filter(isOnline);
  if (online.length > 1) return { status: 'ambiguous', count: online.length };
  if (online.length === 1) return { status: 'ok', device: online[0] };
  // 등록은 되어 있으나 아무도 살아 있지 않다. 2대 이상이어도 결론은 같다 — offline.
  return { status: 'offline', device: devices[0] };
}

/** 사용자에게 보여줄 목록 (§39 GET /devices, §40 "이 PC 연결됨"). */
export async function listUserDevices(
  dataSource: DataSource,
  userId: string,
): Promise<Array<DeviceRow & { online: boolean }>> {
  const rows = await dataSource.query(
    `SELECT id, user_id, device_name, platform, agent_version, status, last_seen_at
       FROM local_agent_devices
      WHERE user_id = $1 AND status = 'active'
      ORDER BY last_seen_at DESC NULLS LAST`,
    [userId],
  );
  return (rows ?? []).map((r: Record<string, unknown>) => {
    const d = mapDevice(r);
    return { ...d, online: isOnline(d) };
  });
}

// ─── 4. Command 왕복 (§17·§18·§30) ────────────────────────────────────────────

/**
 * 명령을 큐에 넣는다. action 은 여기서 다시 allowlist 검사를 받는다 —
 * 호출자가 이미 검사했더라도 한 번 더 한다(§29 이중 allowlist 의 서버측 절반).
 */
export async function issueCommand(
  dataSource: DataSource,
  params: { userId: string; deviceId: string; action: string; toolName: string },
): Promise<{ ok: true; command: LocalCommand } | { ok: false; errorCode: string }> {
  if (!isAllowedLocalAction(params.action)) {
    return { ok: false, errorCode: LOCAL_AGENT_ERROR.DENIED_UNKNOWN_ACTION };
  }
  const commandId = randomUUID();
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + COMMAND_TTL_MS);

  await dataSource.query(
    `INSERT INTO local_agent_commands
       (command_id, device_id, user_id, tool_name, action, status, issued_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)`,
    [
      commandId,
      params.deviceId,
      params.userId,
      params.toolName,
      params.action,
      issuedAt.toISOString(),
      expiresAt.toISOString(),
    ],
  );

  return {
    ok: true,
    command: {
      commandId,
      action: params.action as LocalAgentAction,
      args: {},
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
  };
}

/**
 * agent 가 자기 앞으로 온 명령을 집어간다 (outbound long-poll 의 수신 절반).
 *
 * device_id = $1 조건이 격리의 전부다. deviceId 는 세션에서 나오므로 다른 사용자의
 * 명령을 집어갈 방법이 없다. status='pending' 조건부 UPDATE 라서 두 번 집히지도 않는다.
 */
export async function claimPendingCommands(
  dataSource: DataSource,
  deviceId: string,
  limit = 5,
): Promise<LocalCommand[]> {
  const rows = await dataSource.query(
    `UPDATE local_agent_commands
        SET status = 'delivered', delivered_at = now()
      WHERE command_id IN (
        SELECT command_id FROM local_agent_commands
         WHERE device_id = $1 AND status = 'pending' AND expires_at > now()
         ORDER BY issued_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED
      )
      RETURNING command_id, action, issued_at, expires_at`,
    [deviceId, limit],
  );
  return (rows ?? []).map((r: Record<string, unknown>) => ({
    commandId: String(r.command_id),
    action: String(r.action) as LocalAgentAction,
    args: {} as Record<string, never>,
    issuedAt: new Date(r.issued_at as string).toISOString(),
    expiresAt: new Date(r.expires_at as string).toISOString(),
  }));
}

export type SubmitResultOutcome = { ok: true } | { ok: false; errorCode: string };

/**
 * agent 가 결과를 되돌린다. 여기서 replay 를 막는다(§18).
 *
 * status IN ('pending','delivered') 조건부 UPDATE 이므로 **이미 종결된 commandId 로
 * 다시 들어오면 갱신되는 row 가 없고** REPLAY_REJECTED 로 끝난다. 종결 상태가 곧 잠금이다.
 *
 * data 는 pickSafeSystemInfo 로 걸러 저장한다 — agent 가 뭘 실어 보내든
 * 화이트리스트 밖 필드는 **DB 에도, 프롬프트에도 도달하지 않는다**(§21·§36).
 */
export async function submitCommandResult(
  dataSource: DataSource,
  deviceId: string,
  result: LocalCommandResult,
): Promise<SubmitResultOutcome> {
  const commandId = String(result?.commandId ?? '');
  if (!commandId) return { ok: false, errorCode: LOCAL_AGENT_ERROR.EXECUTION_FAILED };
  // 형식이 틀린 commandId 도 같은 이유로 조회 전에 거절한다 (§32).
  if (!isUuid(commandId)) return { ok: false, errorCode: LOCAL_AGENT_ERROR.REPLAY_REJECTED };

  const rows = await dataSource.query(
    `SELECT command_id, status, expires_at FROM local_agent_commands
      WHERE command_id = $1 AND device_id = $2 LIMIT 1`,
    [commandId, deviceId],
  );
  const cmd = rows?.[0];
  // 남의 device 의 commandId 를 들고 와도 여기서 끝난다 (조회 자체가 device 로 제한된다).
  if (!cmd) return { ok: false, errorCode: LOCAL_AGENT_ERROR.REPLAY_REJECTED };
  if (cmd.status !== 'pending' && cmd.status !== 'delivered') {
    return { ok: false, errorCode: LOCAL_AGENT_ERROR.REPLAY_REJECTED };
  }
  if (new Date(cmd.expires_at).getTime() < Date.now()) {
    await dataSource.query(
      `UPDATE local_agent_commands SET status = 'expired', completed_at = now(), error_code = $2
        WHERE command_id = $1 AND status IN ('pending','delivered')`,
      [commandId, LOCAL_AGENT_ERROR.EXPIRED],
    );
    return { ok: false, errorCode: LOCAL_AGENT_ERROR.EXPIRED };
  }

  const status = ['success', 'denied', 'failed', 'expired'].includes(result.status)
    ? result.status
    : 'failed';
  const safeData = status === 'success' ? pickSafeSystemInfo(result.data) : null;

  const updated = await dataSource.query(
    `UPDATE local_agent_commands
        SET status = $2, completed_at = now(), error_code = $3, result_data = $4
      WHERE command_id = $1 AND status IN ('pending','delivered')
      RETURNING command_id`,
    [
      commandId,
      status,
      result.errorCode ? String(result.errorCode).slice(0, 60) : null,
      safeData ? JSON.stringify(safeData) : null,
    ],
  );
  if (!updated || updated.length === 0) {
    return { ok: false, errorCode: LOCAL_AGENT_ERROR.REPLAY_REJECTED };
  }
  await recordHeartbeat(dataSource, deviceId);
  return { ok: true };
}

/**
 * 서버가 결과를 기다린다 (§30).
 *
 * 결과를 읽는 즉시 result_data 를 **NULL 로 지운다**(§37). 왕복에 필요한 순간에만
 * 존재하고, 감사 기록에는 commandId · action · status · 시각만 남는다.
 */
export async function awaitCommandResult(
  dataSource: DataSource,
  commandId: string,
  timeoutMs: number = COMMAND_WAIT_TIMEOUT_MS,
): Promise<LocalCommandResult> {
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const rows = await dataSource.query(
      `SELECT status, error_code, result_data FROM local_agent_commands
        WHERE command_id = $1 LIMIT 1`,
      [commandId],
    );
    const row = rows?.[0];
    if (row && row.status !== 'pending' && row.status !== 'delivered') {
      await dataSource.query(
        `UPDATE local_agent_commands SET result_data = NULL WHERE command_id = $1`,
        [commandId],
      );
      const data =
        typeof row.result_data === 'string' ? safeJsonParse(row.result_data) : row.result_data;
      return {
        commandId,
        status: row.status,
        data: data ?? undefined,
        errorCode: row.error_code ?? undefined,
      };
    }

    if (Date.now() >= deadline) {
      // 시간이 다 됐다. 명령을 만료로 못박아 **뒤늦게 도착한 결과가 쓰이지 못하게** 한다.
      await dataSource.query(
        `UPDATE local_agent_commands
            SET status = 'expired', completed_at = now(), error_code = $2
          WHERE command_id = $1 AND status IN ('pending','delivered')`,
        [commandId, LOCAL_AGENT_ERROR.TIMEOUT],
      );
      return { commandId, status: 'expired', errorCode: LOCAL_AGENT_ERROR.TIMEOUT };
    }

    await sleep(RESULT_POLL_INTERVAL_MS);
  }
}

function safeJsonParse(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
