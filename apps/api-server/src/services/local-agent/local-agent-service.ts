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
 *   pairing grant    — 단명(2분) · 1회용 · user 소유 · 서비스 무관 · 브라우저가 전달
 *   agent credential — 장기이지만 **agent 만** 보유. 서버는 SHA-256 해시만 저장한다
 *   session token    — 단명(2시간) · 해시 저장 · 명령 수신/결과 제출에만 사용
 *
 * user password · JWT refresh token · service credential · browser cookie 는
 * 이 경로 어디에도 등장하지 않는다. agent 는 사용자의 로그인 자격을 **본 적이 없다.**
 */

import { randomUUID, randomBytes, createHash, timingSafeEqual } from 'crypto';
import type { DataSource } from 'typeorm';
import {
  APP_TARGET_ACTIONS,
  SITE_TARGET_ACTIONS,
  COMPUTER_TARGET_ACTIONS,
  DOM_TARGET_ACTIONS,
  LOCAL_AGENT_ERROR,
  SUPPORTED_AGENT_PLATFORMS,
  isAllowedLocalAction,
  parseLocalAction,
  pickSafeResultData,
  validateLocalCommandArgs,
  type LocalCommand,
  type LocalCommandResult,
} from './local-agent-protocol.js';

// ─── 정책 상수 ────────────────────────────────────────────────────────────────

/**
 * pairing grant 유효 시간 (ONECLICK §7).
 *
 * V0 의 5분은 사람이 코드를 옮겨 적는 시간이었다. 이제 브라우저가 곧바로 전달하므로
 * 그 시간이 필요 없다 — 왕복은 1초 안에 끝난다. 2분은 agent 를 뒤늦게 실행하는
 * 경우까지 감안한 여유이고, 그 이상 열어 둘 이유가 없다.
 */
const GRANT_TTL_MS = 2 * 60 * 1000;
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

// ─── 1. Pairing — one-click grant (ONECLICK §6·§7·§10) ───────────────────────

/**
 * 버튼 한 번으로 끝내기 위한 단명 승인권.
 *
 * 로그인한 브라우저가 [이 PC 연결] 을 누를 때 발급된다. 사람이 이 값을 보거나 옮겨
 * 적지 않는다 — 브라우저가 그대로 localhost agent 에 전달한다(§6).
 *
 * grant 에 들어가는 것은 **난수 문자열 하나뿐**이다(§8). password · refresh token ·
 * session cookie · 외부 사이트 자격증명은 어느 것도 실리지 않는다. 서버는 그 난수의
 * **해시만** 보관하므로(§23 raw token 저장 금지), grant 로 역으로 사용자 정보를 꺼낼 수
 * 있는 경로는 "서버에게 물어보는 것" 뿐이다.
 */
export async function createPairingGrant(
  dataSource: DataSource,
  userId: string,
): Promise<{ grant: string; expiresAt: string }> {
  const grant = newSecret();
  const expiresAt = new Date(Date.now() + GRANT_TTL_MS);

  // 같은 사용자의 기존 미사용 grant 는 무효화한다. 살아 있는 grant 는 항상 최대 1개 —
  // 버튼을 연달아 눌러도 직전 것은 그 자리에서 죽는다.
  await dataSource.query(
    `UPDATE local_agent_pairings SET consumed_at = now()
      WHERE user_id = $1 AND consumed_at IS NULL`,
    [userId],
  );
  await dataSource.query(
    `INSERT INTO local_agent_pairings (id, user_id, code_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), userId, hashSecret(grant), expiresAt.toISOString()],
  );

  return { grant, expiresAt: expiresAt.toISOString() };
}

export interface RedeemGrantInput {
  grant: string;
  deviceName?: string;
  platform: string;
  agentVersion: string;
  /**
   * 이미 연결된 적이 있는 agent 는 자신의 신원을 함께 제시한다 (§15·§16).
   *
   * 이것은 "나는 이 device 다" 라는 **주장**이 아니라 credential 증명이다. 증명에
   * 실패하면 주장을 무시하고 새 device 로 취급한다 (§14 — 클라이언트 주장 불신뢰).
   */
  claimedDeviceId?: string;
  claimedCredential?: string;
}

export type RedeemGrantOutcome =
  | { ok: true; status: 'connected'; deviceId: string; agentCredential: string }
  | { ok: true; status: 'already_connected'; deviceId: string }
  | {
      ok: false;
      reason:
        | 'INVALID_PAIRING_GRANT'
        | 'PAIRING_EXPIRED'
        | 'UNSUPPORTED_PLATFORM'
        | 'DEVICE_ALREADY_PAIRED';
    };

/**
 * agent 가 grant 를 제시하고 연결된다.
 *
 * deviceId 는 **서버가 만드는 random UUID** 다(§9). agent 가 보낸 값이 아니고,
 * MAC · 디스크 시리얼 같은 hardware fingerprint 에서 파생하지도 않는다.
 *
 * 순서가 중요하다. **이미 남의 PC 로 잡힌 경우 grant 를 소모하지 않는다**(§16) —
 * 사용자가 어쩔 수 없는 상황에서 승인권까지 태우면, 다음 시도를 위해 버튼을 한 번 더
 * 누르게 만드는 것뿐이다. 거절 이유는 재시도로 바뀌지 않는다.
 */
export async function redeemPairingGrant(
  dataSource: DataSource,
  input: RedeemGrantInput,
): Promise<RedeemGrantOutcome> {
  if (!SUPPORTED_AGENT_PLATFORMS.includes(input.platform)) {
    return { ok: false, reason: 'UNSUPPORTED_PLATFORM' };
  }

  const grantHash = hashSecret(String(input.grant ?? ''));
  const rows = await dataSource.query(
    `SELECT id, user_id, expires_at, consumed_at
       FROM local_agent_pairings
      WHERE code_hash = $1
      LIMIT 1`,
    [grantHash],
  );
  const pairing = rows?.[0];
  if (!pairing) return { ok: false, reason: 'INVALID_PAIRING_GRANT' };
  // 이미 쓴 grant 는 "만료" 가 아니라 "무효" 다 — replay 와 정상 만료를 구분해 알려주지 않는다.
  if (pairing.consumed_at) return { ok: false, reason: 'INVALID_PAIRING_GRANT' };
  if (new Date(pairing.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'PAIRING_EXPIRED' };
  }

  // ─ 이미 연결된 PC 인가? (§15·§16) ──────────────────────────────────────────
  const existing = await resolveClaimedDevice(dataSource, input);
  if (existing) {
    if (existing.userId !== pairing.user_id) {
      // 임의로 재귀속시키지 않는다(§16). 소유권 이전은 별도 flow 다.
      return { ok: false, reason: 'DEVICE_ALREADY_PAIRED' };
    }
    // 같은 사용자의 이미 연결된 PC — 성공으로 닫는다. duplicate device 를 만들지 않는다.
    if (!(await claimGrant(dataSource, pairing.id))) {
      return { ok: false, reason: 'INVALID_PAIRING_GRANT' };
    }
    return { ok: true, status: 'already_connected', deviceId: existing.id };
  }

  if (!(await claimGrant(dataSource, pairing.id))) {
    return { ok: false, reason: 'INVALID_PAIRING_GRANT' };
  }

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

  return { ok: true, status: 'connected', deviceId, agentCredential };
}

/**
 * `RETURNING` 이 붙은 UPDATE 의 결과를 row 배열로 되돌린다.
 *
 * TypeORM 의 `query()` 는 이 경우 row 배열이 아니라 **`[rows, affectedCount]`** 를 준다.
 * 그대로 배열로 취급하면 0건일 때도 `length === 2` 가 되어 "갱신된 row 가 있다" 로 읽히고,
 * `rows[0]` 은 row 가 아니라 빈 배열이 된다. 조건부 UPDATE 의 반환 row 수로
 * replay·중복 실행을 막는 코드에서는 그 오독이 곧 **잠금이 풀리는 것**과 같다.
 */
function returnedRows(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return Array.isArray(raw[0])
    ? (raw[0] as Array<Record<string, unknown>>)
    : (raw as Array<Record<string, unknown>>);
}

/**
 * 1회용 보장: `consumed_at IS NULL` 조건부 UPDATE.
 * 동시에 두 번 도착해도 row 를 돌려받는 쪽은 하나뿐이다 (§21-5 replay).
 */
async function claimGrant(dataSource: DataSource, pairingId: string): Promise<boolean> {
  const claimed = returnedRows(
    await dataSource.query(
      `UPDATE local_agent_pairings SET consumed_at = now()
        WHERE id = $1 AND consumed_at IS NULL
        RETURNING id`,
      [pairingId],
    ),
  );
  return claimed.length > 0;
}

/**
 * agent 가 제시한 기존 신원을 **검증**해서 해소한다.
 *
 * credential 이 맞지 않으면 null 을 돌려 새 device 로 보낸다. 그래야 "남의 deviceId 를
 * 적어 보내 DEVICE_ALREADY_PAIRED 를 유발해 존재 여부를 캐는" 길이 막힌다.
 */
async function resolveClaimedDevice(
  dataSource: DataSource,
  input: RedeemGrantInput,
): Promise<{ id: string; userId: string } | null> {
  const deviceId = String(input.claimedDeviceId ?? '');
  const credential = String(input.claimedCredential ?? '');
  if (!deviceId || !credential || !isUuid(deviceId)) return null;

  const rows = await dataSource.query(
    `SELECT id, user_id, status, credential_hash FROM local_agent_devices WHERE id = $1 LIMIT 1`,
    [deviceId],
  );
  const device = rows?.[0];
  if (!device) return null;
  if (device.status !== 'active') return null;
  if (!hashEquals(device.credential_hash, hashSecret(credential))) return null;
  return { id: device.id, userId: device.user_id };
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
 *
 * COMPUTER-USE-V0: `args` 는 `validateLocalCommandArgs` 를 통과한 **정규화 사본**만 실린다.
 * 인자는 `result_data` 컬럼에 잠깐 실려 간다(§44 migration 0). agent 가 claim 하는 UPDATE 가
 * 같은 문장에서 NULL 로 지우므로, 타이핑할 텍스트가 DB 에 머무는 시간은 "발행 → claim"
 * (poll 간격, TTL 20초 상한) 뿐이다. 실패해도 TTL 이 지나면 만료 처리에서 row 는 그대로지만
 * `awaitCommandResult` 가 만료 시 result_data 를 NULL 로 지운다.
 */
export async function issueCommand(
  dataSource: DataSource,
  params: {
    userId: string;
    deviceId: string;
    action: string;
    toolName: string;
    args?: unknown;
  },
): Promise<{ ok: true; command: LocalCommand } | { ok: false; errorCode: string }> {
  if (!isAllowedLocalAction(params.action)) {
    return { ok: false, errorCode: LOCAL_AGENT_ERROR.DENIED_UNKNOWN_ACTION };
  }
  const base = parseLocalAction(params.action).base;
  const validated = validateLocalCommandArgs(base, params.args);
  if (validated.ok === false) {
    // DOM 축은 자기 코드로(BROWSER-DOM-CONTROL-V0 §29), 나머지는 기존 코드 그대로.
    return {
      ok: false,
      errorCode: DOM_TARGET_ACTIONS.includes(base)
        ? LOCAL_AGENT_ERROR.DOM_ACTION_NOT_ALLOWED
        : LOCAL_AGENT_ERROR.COMPUTER_UNSUPPORTED_ACTION,
    };
  }
  const args = validated.args;
  const hasArgs = Object.keys(args).length > 0;
  const commandId = randomUUID();
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + COMMAND_TTL_MS);

  await dataSource.query(
    `INSERT INTO local_agent_commands
       (command_id, device_id, user_id, tool_name, action, status, issued_at, expires_at, result_data)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8)`,
    [
      commandId,
      params.deviceId,
      params.userId,
      params.toolName,
      params.action,
      issuedAt.toISOString(),
      expiresAt.toISOString(),
      hasArgs ? JSON.stringify(args) : null,
    ],
  );

  return {
    ok: true,
    command: {
      commandId,
      action: params.action,
      args,
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
  // COMPUTER-USE-V0: 발행 시 result_data 에 실린 args 를 **집어가는 같은 문장에서 지운다**.
  // RETURNING 은 FROM 목록의 p.args(갱신 전 값)를 돌려주므로 agent 는 인자를 받고 DB 에는 남지 않는다.
  const rows = returnedRows(
    await dataSource.query(
      `UPDATE local_agent_commands c
        SET status = 'delivered', delivered_at = now(), result_data = NULL
       FROM (
        SELECT command_id, result_data AS args FROM local_agent_commands
         WHERE device_id = $1 AND status = 'pending' AND expires_at > now()
         ORDER BY issued_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED
      ) p
      WHERE c.command_id = p.command_id
      RETURNING c.command_id, c.action, c.issued_at, c.expires_at, p.args`,
      [deviceId, limit],
    ),
  );
  return rows.map((r: Record<string, unknown>) => {
    const action = String(r.action);
    const raw = typeof r.args === 'string' ? safeJsonParse(r.args) : r.args;
    // DB 에서 나온 값도 다시 검증한다. 통과 못 하면 빈 인자로 — agent 가 형상 밖 인자를 거절한다.
    const validated = validateLocalCommandArgs(parseLocalAction(action).base, raw ?? undefined);
    return {
      commandId: String(r.command_id),
      action,
      args: validated.ok ? validated.args : {},
      issuedAt: new Date(r.issued_at as string).toISOString(),
      expiresAt: new Date(r.expires_at as string).toISOString(),
    };
  });
}

export type SubmitResultOutcome = { ok: true } | { ok: false; errorCode: string };

/**
 * agent 가 결과를 되돌린다. 여기서 replay 를 막는다(§18).
 *
 * status IN ('pending','delivered') 조건부 UPDATE 이므로 **이미 종결된 commandId 로
 * 다시 들어오면 갱신되는 row 가 없고** REPLAY_REJECTED 로 끝난다. 종결 상태가 곧 잠금이다.
 *
 * data 는 **action 별 출력 화이트리스트**(pickSafeResultData)로 걸러 저장한다 — agent 가 뭘 실어 보내든
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
    `SELECT command_id, status, expires_at, action FROM local_agent_commands
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
  // 실패 결과는 원칙적으로 아무것도 남기지 않는다 (스택 · 경로가 실릴 자리를 만들지 않는다).
  // 예외는 창 대상 action 의 실패뿐이다 — "창이 3개라 확정할 수 없다"(§16) 는 개수 자체가
  // 사용자에게 전해야 하는 답이고, 그 화이트리스트에는 개수·상태 말고 실릴 수 있는 것이 없다.
  const action = String(cmd.action ?? '');
  // BROWSER-CONTROL-V0: 사이트 대상 action 도 같은 규칙 — 실패 시 siteId·displayName·opened 만
  // 남는다(pickSafeBrowserInfo 화이트리스트). URL·프로필·탭 정보는 애초에 통과하지 못한다.
  const failureBase = parseLocalAction(action).base;
  // COMPUTER-USE-V0: 화면 조작 action 도 동일 — 실패 시 found·foreground·windowCount 같은
  // 상태 플래그만 남는다(pickSafeComputerInfo). 이미지·창 제목·좌표는 화이트리스트에 없다.
  // BROWSER-DOM-CONTROL-V0: DOM action 도 동일 — 실패 시 riskLevel · userActionRequired 같은 판정
  // 플래그만 남는다(pickSafeDomInfo). HTML · 폼 값 · URL query 는 화이트리스트에 없다.
  const keepFailureData =
    status === 'failed' &&
    (APP_TARGET_ACTIONS.includes(failureBase) ||
      SITE_TARGET_ACTIONS.includes(failureBase) ||
      COMPUTER_TARGET_ACTIONS.includes(failureBase) ||
      DOM_TARGET_ACTIONS.includes(failureBase));
  const safeData =
    status === 'success' || keepFailureData ? pickSafeResultData(action, result.data) : null;

  const updated = returnedRows(
    await dataSource.query(
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
    ),
  );
  if (updated.length === 0) {
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
      // COMPUTER-USE-V0: claim 되지 못한 명령의 args(result_data)도 여기서 함께 지운다.
      await dataSource.query(
        `UPDATE local_agent_commands
            SET status = 'expired', completed_at = now(), error_code = $2, result_data = NULL
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
