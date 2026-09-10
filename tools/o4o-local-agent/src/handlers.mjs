/**
 * Local Work Agent — action handler (§21·§28)
 *
 * WO-O4O-LOCAL-WORK-AGENT-V0
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 agent 쪽 allowlist 다 (§29 이중 방어의 나머지 절반)
 *
 * 서버도 allowlist 를 갖고 있지만, 그것만 믿지 않는다. 서버가 (버그로든 침해로든)
 * `local.exec_shell` 을 보내도 여기 `HANDLERS` 에 없으면 실행되지 않고
 * `DENIED_UNKNOWN_ACTION` 이 되돌아간다. **PC 쪽이 마지막 방어선이다.**
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * import 목록을 보라
 *
 * 이 파일은 `node:os` 하나만 가져온다. `child_process` 도 `fs` 도 없다.
 * 즉 shell 실행 · 파일 접근이 "금지" 되어 있는 게 아니라 **가능하지 않다.**
 * 정책은 우회할 수 있지만 없는 코드는 우회할 수 없다.
 */

import os from 'node:os';

export const AGENT_VERSION = '0.1.0';

/** 서버 계약(local-agent-protocol.ts)의 action 이름과 반드시 일치해야 한다. */
export const ACTIONS = {
  GET_AGENT_STATUS: 'local.get_agent_status',
  GET_SYSTEM_INFO: 'local.get_system_info',
};

/**
 * Windows 빌드 번호를 사람이 읽는 버전으로 바꾼다.
 *
 * `os.release()` 는 "10.0.26200" 같은 값을 준다. Windows 11 은 커널상 여전히 10.0 이고
 * 빌드 22000 이상이 11 이다. 정확히 모르겠으면 **추측하지 말고** 원문을 그대로 둔다.
 */
function describeWindows(release) {
  const build = Number.parseInt(String(release).split('.')[2] ?? '', 10);
  if (!Number.isFinite(build)) return `Windows (${release})`;
  if (build >= 22000) return 'Windows 11';
  if (build >= 10240) return 'Windows 10';
  return `Windows (${release})`;
}

function osName() {
  if (process.platform === 'win32') return describeWindows(os.release());
  // V0 는 Windows 만 지원한다(§9). 그 외는 플랫폼 이름만 돌려주고 상세를 만들지 않는다.
  return process.platform;
}

/**
 * `local.get_system_info` — 되돌려 보내는 필드가 여기 있는 것이 전부다 (§21).
 *
 * **의도적으로 빠진 것들**: `os.userInfo()` (username · 홈 경로),
 * `os.networkInterfaces()` (IP · MAC), `os.hostname()`, `process.env`,
 * 설치 소프트웨어 목록, 프로세스 목록. 부르지 않으므로 실수로 실릴 수 없다.
 *
 * `deviceName` 은 PC 의 실제 hostname 이 아니라 **사용자가 연결할 때 붙인 표시 이름**이며,
 * 서버가 이미 알고 있는 값이다. 여기서 새로 알아내는 정보가 아니다.
 */
function getSystemInfo(context) {
  return {
    osName: osName(),
    osVersion: os.release(),
    architecture: os.arch(),
    agentVersion: AGENT_VERSION,
    deviceName: context.deviceName ?? '',
  };
}

/** `local.get_agent_status` — agent 가 살아서 응답한다는 사실 자체가 답이다. */
function getAgentStatus(context) {
  return {
    agentVersion: AGENT_VERSION,
    deviceName: context.deviceName ?? '',
  };
}

const HANDLERS = {
  [ACTIONS.GET_AGENT_STATUS]: getAgentStatus,
  [ACTIONS.GET_SYSTEM_INFO]: getSystemInfo,
};

/**
 * 명령 하나를 실행한다.
 *
 * 반환은 항상 `{ status, data?, errorCode? }` 다 — 예외를 밖으로 던지지 않는다.
 * handler 가 터졌다는 사실이 스택 트레이스와 함께 cloud 로 올라가면
 * 경로 · 사용자명 같은 것이 새어 나갈 수 있다. 코드만 보낸다.
 */
export function runAction(action, context) {
  const handler = HANDLERS[action];
  if (!handler) {
    // 서버가 뭘 보냈든 이름이 낯설면 여기서 끝난다. 이것이 §28 의 요구사항이다.
    return { status: 'denied', errorCode: 'DENIED_UNKNOWN_ACTION' };
  }
  try {
    return { status: 'success', data: handler(context) };
  } catch {
    return { status: 'failed', errorCode: 'LOCAL_AGENT_EXECUTION_FAILED' };
  }
}

/** 테스트·감사용. 이 목록 밖의 action 은 존재하지 않는다. */
export function listAllowedActions() {
  return Object.keys(HANDLERS);
}
