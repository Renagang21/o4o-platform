/**
 * Local Work Agent — one-click pairing 클라이언트
 *
 * WO-O4O-LOCAL-WORK-AGENT-ONECLICK-PAIRING-V1
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
 */

import { api, API_BASE_URL } from '../lib/apiClient';

/** agent 의 고정 창구. 발견 절차 없이 곧바로 찾아간다 (§4). */
export const LOCAL_AGENT_ORIGIN = 'http://127.0.0.1:47821';

/** health 응답 대기 시간. 같은 PC 이므로 오래 걸릴 이유가 없다. */
const PROBE_TIMEOUT_MS = 1500;

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

/**
 * 같은 PC 에 agent 가 떠 있는지 본다.
 *
 * 실패는 예외가 아니라 `null` 이다. "실행 중이 아님" 은 오류가 아니라 **정상적인 상태**이고
 * (§14), 화면은 그 상태를 안내 문구로 보여줘야 한다.
 */
export async function probeLocalAgent(): Promise<LocalAgentHealth | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${LOCAL_AGENT_ORIGIN}/health`, {
      method: 'GET',
      credentials: 'omit',
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body?.ok || typeof body.nonce !== 'string') return null;
    return {
      agentVersion: String(body.agentVersion ?? ''),
      connected: Boolean(body.connected),
      nonce: body.nonce,
    };
  } catch {
    // 미실행 · 포트 미개방 · 타임아웃 — 사용자에게는 전부 "실행되고 있지 않습니다" 다.
    return null;
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
    return { ok: true, status: body.status === 'already_connected' ? 'already_connected' : 'connected' };
  } catch {
    return { ok: false, code: 'AGENT_UNREACHABLE' };
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
    case 'AGENT_UNREACHABLE':
      return 'Local Work Agent 와 통신하지 못했습니다. 실행 중인지 확인해 주세요.';
    default:
      return '연결에 실패했습니다. 잠시 후 다시 시도해 주세요.';
  }
}
