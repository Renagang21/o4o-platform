/**
 * Local Work Agent — one-click pairing 클라이언트
 *
 * WO-O4O-LOCAL-WORK-AGENT-ONECLICK-PAIRING-V1
 * WO-O4O-LOCAL-AGENT-LNA-UX-CLOSURE-V1 (원인 구분 · 안내 문구)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 다루는 두 상대
 *
 *   O4O API      — 이미 성립한 로그인 세션으로 **1회용 승인권**을 받아온다
 *   localhost    — 같은 PC 의 agent 에게 그 승인권을 건네준다
 *
 * 승인권 외에는 아무것도 건너가지 않는다. `credentials: 'omit'` 을 명시해서
 * 브라우저가 이 요청에 O4O 쿠키를 실을 여지 자체를 없앤다 (§2).
 * 승인권 값은 화면에 표시하지도, 저장하지도 않는다 — 함수 안에서만 살다 사라진다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 실패를 한 덩어리로 두지 않는가
 *
 * https 페이지에서 `http://127.0.0.1` 로 나가는 요청은 Chrome 의 Local Network
 * Access 권한 대상이다. 권한이 없으면 fetch 는 **연결을 시도조차 하지 않고**
 * `TypeError: Failed to fetch` 로 즉시 끝난다 — agent 가 꺼져 있을 때와 글자 그대로
 * 같은 예외다. 예외만 보고 "Agent 미실행" 이라고 단정하면 사용자는 이미 켜 둔
 * 프로그램을 계속 다시 켜게 된다.
 *
 * 구분의 근거는 `navigator.permissions.query({ name: 'local-network-access' })` 다.
 * 이것은 **권한 상태를 읽기만 한다** — 권한을 요청하지도, 우회하지도, 자동 승인하지도
 * 않는다 (§3 · §6). 허용은 오직 사용자가 브라우저 대화상자에서 한다.
 *
 * 이 신호로도 답이 나오지 않으면 (조회 API 부재 · timeout) 원인을 억지로 확정하지
 * 않고 중립 문구로 안내한다 (§8).
 */

import { api, API_BASE_URL } from '../lib/apiClient';

/** agent 의 고정 창구. 발견 절차 없이 곧바로 찾아간다 (§4). */
export const LOCAL_AGENT_ORIGIN = 'http://127.0.0.1:47821';

/**
 * health 응답 대기 시간.
 *
 * 같은 PC 이므로 오래 걸릴 이유가 없다. 다만 **첫 요청**은 소켓 준비 때문에 1.5 초를
 * 넘기는 경우가 실측됐다(1512ms abort). 그 abort 를 "미실행" 으로 읽으면 오답이므로
 * 여유를 둔다.
 */
const PROBE_TIMEOUT_MS = 3000;

export interface LocalAgentHealth {
  agentVersion: string;
  connected: boolean;
  nonce: string;
}

export interface LocalAgentDevice {
  deviceId: string;
  deviceName: string | null;
  platform: string;
  agentVersion: string;
  online: boolean;
  lastSeenAt: string | null;
}

/** 브라우저가 알려주는 이 PC 접근 권한 상태. `unknown` = 브라우저가 말해주지 않음. */
export type LocalNetworkPermission = 'granted' | 'prompt' | 'denied' | 'unknown';

/**
 * agent 에 닿지 못한 이유. 넷 중 하나로만 말한다.
 *
 *   AGENT_NOT_RUNNING   권한은 이미 허용됐는데 연결이 거부됐다 — 프로그램이 꺼져 있다
 *   PERMISSION_REQUIRED 브라우저가 아직 이 PC 접근을 허용하지 않았다
 *   CONNECTION_FAILED   agent 가 응답은 했지만 정상 응답이 아니다
 *   INDETERMINATE       브라우저가 원인을 충분히 노출하지 않았다 (§8)
 */
export type LocalAgentUnavailableReason =
  | 'AGENT_NOT_RUNNING'
  | 'PERMISSION_REQUIRED'
  | 'CONNECTION_FAILED'
  | 'INDETERMINATE';

/** fetch 가 어떤 모양으로 실패했는가. 원인 판정의 절반이다. */
export type LocalAgentFailureKind = 'network' | 'timeout' | 'bad_response';

export type ProbeOutcome =
  | { ok: true; health: LocalAgentHealth }
  | { ok: false; reason: LocalAgentUnavailableReason; permission: LocalNetworkPermission };

/**
 * 이 PC 접근 권한 상태를 **읽는다**. 요청하지 않는다.
 *
 * Permissions API 에 이 이름이 없는 브라우저(Firefox · Safari · 구형 Chrome)에서는
 * throw 하거나 이상한 값을 준다. 그때는 `unknown` 이고, 원인 판정은 중립으로 간다.
 */
export async function queryLocalNetworkPermission(): Promise<LocalNetworkPermission> {
  try {
    const permissions = (navigator as Navigator & { permissions?: Permissions }).permissions;
    if (!permissions || typeof permissions.query !== 'function') return 'unknown';
    const status = await permissions.query({
      name: 'local-network-access',
    } as unknown as PermissionDescriptor);
    const state = status?.state as string | undefined;
    return state === 'granted' || state === 'prompt' || state === 'denied' ? state : 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * 실패 모양 + 권한 상태 → 원인.
 *
 * 순수 함수다. 판정 규칙을 여기 한 곳에만 두고, 화면도 테스트도 이것만 본다.
 *
 * 판정하지 **않는** 경우를 분명히 해 둔다 (§8):
 *   - 권한 상태를 모르면 (`unknown`) 무엇도 확정하지 않는다
 *   - 권한이 허용됐는데 timeout 이면 "꺼져 있다" 고 말하지 않는다 — 느린 것일 수 있다
 */
export function classifyLocalAgentFailure(
  kind: LocalAgentFailureKind,
  permission: LocalNetworkPermission,
): LocalAgentUnavailableReason {
  // 응답이 왔다는 건 권한도 통과했고 포트도 열려 있다는 뜻이다. 남은 문제는 agent 쪽이다.
  if (kind === 'bad_response') return 'CONNECTION_FAILED';

  // 아직 허용 전이다. 대기 중인 권한 대화상자 때문에 timeout 이 나는 경우도 여기다.
  if (permission === 'prompt' || permission === 'denied') return 'PERMISSION_REQUIRED';

  if (permission === 'granted') {
    return kind === 'network' ? 'AGENT_NOT_RUNNING' : 'INDETERMINATE';
  }

  return 'INDETERMINATE';
}

/**
 * 같은 PC 에 agent 가 떠 있는지 본다.
 *
 * 실패는 예외가 아니라 이유가 붙은 결과다. "실행 중이 아님" 은 오류가 아니라
 * **정상적인 상태**이고 (§14), 화면은 그 상태를 안내 문구로 보여줘야 한다.
 */
export async function probeLocalAgent(): Promise<ProbeOutcome> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, PROBE_TIMEOUT_MS);

  const fail = async (kind: LocalAgentFailureKind): Promise<ProbeOutcome> => {
    const permission = await queryLocalNetworkPermission();
    return { ok: false, reason: classifyLocalAgentFailure(kind, permission), permission };
  };

  try {
    const res = await fetch(`${LOCAL_AGENT_ORIGIN}/health`, {
      method: 'GET',
      credentials: 'omit',
      signal: controller.signal,
    });
    if (!res.ok) return await fail('bad_response');
    const body = await res.json().catch(() => null);
    if (!body?.ok || typeof body.nonce !== 'string') return await fail('bad_response');
    return {
      ok: true,
      health: {
        agentVersion: String(body.agentVersion ?? ''),
        connected: Boolean(body.connected),
        nonce: body.nonce,
      },
    };
  } catch {
    return await fail(timedOut ? 'timeout' : 'network');
  } finally {
    window.clearTimeout(timer);
  }
}

/** 서버가 알고 있는 "연결된 PC" 목록. agent 가 꺼져 있어도 조회된다. */
export async function fetchLocalAgentDevices(): Promise<LocalAgentDevice[]> {
  const { data } = await api.get(`${API_BASE_URL}/api/local-agent/devices`);
  return data?.data ?? [];
}

export type ConnectOutcome =
  | { ok: true; status: 'connected' | 'already_connected' }
  | { ok: false; code: string };

/**
 * [이 PC 연결] 한 번에 일어나는 전부 (§6).
 *
 * 1. agent 가 살아 있는지 확인하고 1회용 nonce 를 받는다
 * 2. 로그인 세션으로 서버에서 승인권을 발급받는다
 * 3. 승인권을 agent 에게 건넨다 — agent 가 서버에 제출해 자기 자격증명을 받아온다
 *
 * 사용자가 입력하는 것은 **아무것도 없다.**
 */
export async function connectThisPc(health: LocalAgentHealth): Promise<ConnectOutcome> {
  let grant: string;
  try {
    const { data } = await api.post(`${API_BASE_URL}/api/local-agent/pairing-grants`, {});
    grant = data?.data?.grant;
    if (!grant) return { ok: false, code: 'GRANT_ISSUE_FAILED' };
  } catch {
    return { ok: false, code: 'GRANT_ISSUE_FAILED' };
  }

  try {
    const res = await fetch(`${LOCAL_AGENT_ORIGIN}/pair`, {
      method: 'POST',
      // application/json 이라 단순 요청이 아니다 — preflight 를 강제해 origin 검사를 통과시킨다.
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ grant, nonce: health.nonce }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok) {
      return { ok: false, code: String(body?.code ?? res.status) };
    }
    return {
      ok: true,
      status: body.status === 'already_connected' ? 'already_connected' : 'connected',
    };
  } catch {
    // health 는 통과했는데 pair 에서 막혔다. 그 사이 agent 가 꺼졌을 수도, 권한이
    // 아직 없을 수도 있다 — 여기서도 같은 근거로 구분한다.
    const permission = await queryLocalNetworkPermission();
    return { ok: false, code: classifyLocalAgentFailure('network', permission) };
  }
}

/**
 * 원인별 안내 문구 (§5).
 *
 * 사용자가 **다음에 할 일**을 문장 안에 담는다. 원인 코드는 노출하지 않는다.
 */
export function describeLocalAgentUnavailable(reason: LocalAgentUnavailableReason): string {
  switch (reason) {
    case 'AGENT_NOT_RUNNING':
      return 'Local Work Agent가 실행되고 있지 않습니다. Agent를 실행한 뒤 다시 연결해 주세요.';
    case 'PERMISSION_REQUIRED':
      return '브라우저에서 이 PC 연결 권한을 허용해 주세요. 권한을 허용한 뒤 다시 연결을 눌러 주세요.';
    case 'CONNECTION_FAILED':
      return '이 PC의 Local Work Agent에 연결할 수 없습니다. Agent 실행 상태를 확인한 뒤 다시 시도해 주세요.';
    case 'INDETERMINATE':
    default:
      // 브라우저가 원인을 알려주지 않았다. 둘 다 짚어 주고 확정하지 않는다 (§8).
      return 'Agent가 실행 중이 아니거나 브라우저 연결 권한이 필요합니다. Agent 실행 상태와 브라우저 연결 권한을 확인한 뒤 다시 연결해 주세요.';
  }
}

/** 사용자에게 보일 문구. 실패 코드를 그대로 노출하지 않는다. */
export function describeConnectFailure(code: string): string {
  switch (code) {
    case 'DEVICE_ALREADY_PAIRED':
      return '이 PC 는 다른 O4O 계정에 이미 연결되어 있습니다. 해당 계정에서 연결을 해제한 뒤 다시 시도해 주세요.';
    case 'PAIRING_EXPIRED':
    case 'INVALID_PAIRING_GRANT':
      return '연결 승인 시간이 지났습니다. 다시 한 번 눌러 주세요.';
    case 'UNSUPPORTED_PLATFORM':
      return '지원하지 않는 운영체제입니다.';
    case 'GRANT_ISSUE_FAILED':
      return '연결 승인을 받지 못했습니다. 잠시 후 다시 시도해 주세요.';
    case 'AGENT_NOT_RUNNING':
    case 'PERMISSION_REQUIRED':
    case 'CONNECTION_FAILED':
    case 'INDETERMINATE':
      return describeLocalAgentUnavailable(code as LocalAgentUnavailableReason);
    default:
      return '연결에 실패했습니다. 잠시 후 다시 시도해 주세요.';
  }
}
