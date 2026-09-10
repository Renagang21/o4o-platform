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
 * 이 파일은 `node:os` 와 저장소 안의 모듈 두 개만 가져온다. `fs` 는 여전히 없다.
 * 즉 **임의 파일 접근은 여기서 가능하지 않다.**
 *
 * 외부 프로세스 실행은 `windows-window-control.mjs` **한 파일에만** 있고, 그 파일이
 * 실행할 수 있는 것은 저장소에 체크인된 `.ps1` 두 개뿐이다(그 파일 머리말 참조).
 * 이 handler 는 그 두 함수만 부를 수 있고, 임의 명령을 만들어 넘길 통로가 없다.
 */

import os from 'node:os';
import { findWindowsApp } from './windows-app-registry.mjs';
import { activateWindowHandle, censusWindows, matchWindows } from './windows-window-control.mjs';

export const AGENT_VERSION = '0.1.0';

/** 서버 계약(local-agent-protocol.ts)의 action 이름과 반드시 일치해야 한다. */
export const ACTIONS = {
  GET_AGENT_STATUS: 'local.get_agent_status',
  GET_SYSTEM_INFO: 'local.get_system_info',
  FIND_APPLICATION: 'local.find_application',
  ACTIVATE_WINDOW: 'local.activate_window',
};

/**
 * app 대상 action 은 `base#appId` 형태로 온다 (서버 계약과 동일).
 * 여기서도 appId 는 **등재 목록에 있어야만** 통과한다 — 이중 allowlist 의 agent 쪽 절반(§24).
 */
const APP_ACTION_SEPARATOR = '#';

function parseAction(action) {
  const raw = String(action ?? '');
  const idx = raw.indexOf(APP_ACTION_SEPARATOR);
  if (idx < 0) return { base: raw, appId: undefined };
  return { base: raw.slice(0, idx), appId: raw.slice(idx + APP_ACTION_SEPARATOR.length) };
}

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

/**
 * `local.find_application` — 등재 앱이 지금 실행 중인가 (§12·§16).
 *
 * 되돌리는 것은 **찾았는지 / 창이 몇 개인지 / 표시 이름** 뿐이다.
 * PID · 창 핸들 · 창 제목 · 실행 파일 경로는 이 함수 밖으로 나가지 않는다(§20·§21).
 */
async function findApplication(app) {
  const windows = matchWindows(await censusWindows(), app);
  if (windows.length === 0) {
    return {
      status: 'failed',
      errorCode: 'WINDOWS_APP_NOT_RUNNING',
      data: { appId: app.appId, displayName: app.displayName, found: false, windowCount: 0 },
    };
  }
  return {
    status: 'success',
    data: {
      appId: app.appId,
      displayName: app.displayName,
      found: true,
      windowCount: windows.length,
      state: 'running',
    },
  };
}

/**
 * `local.activate_window` — 등재 앱의 창을 앞으로 가져온다 (§13·§16·§18·§19).
 *
 * 창이 0개면 실행 안내, 2개 이상이면 **임의로 고르지 않고** ambiguous 로 끝낸다.
 * 한 요청에서 foreground 전환은 **최대 1회**다 — 아래 호출이 그 한 번이다(§19).
 */
async function activateWindow(app) {
  const windows = matchWindows(await censusWindows(), app);
  if (windows.length === 0) {
    return {
      status: 'failed',
      errorCode: 'WINDOWS_APP_NOT_RUNNING',
      data: { appId: app.appId, displayName: app.displayName, found: false, windowCount: 0 },
    };
  }
  if (windows.length > 1) {
    return {
      status: 'failed',
      errorCode: 'WINDOWS_APP_WINDOW_AMBIGUOUS',
      data: {
        appId: app.appId,
        displayName: app.displayName,
        found: true,
        windowCount: windows.length,
      },
    };
  }

  const outcome = await activateWindowHandle(windows[0].hwnd);
  if (!outcome.activated) {
    return {
      status: 'failed',
      errorCode: 'WINDOW_ACTIVATION_FAILED',
      data: { appId: app.appId, displayName: app.displayName, found: true, windowCount: 1 },
    };
  }
  return {
    status: 'success',
    data: {
      appId: app.appId,
      displayName: app.displayName,
      found: true,
      windowCount: 1,
      activated: true,
      restored: outcome.restored === true,
      state: 'foreground',
    },
  };
}

const HANDLERS = {
  [ACTIONS.GET_AGENT_STATUS]: getAgentStatus,
  [ACTIONS.GET_SYSTEM_INFO]: getSystemInfo,
};

/** appId 를 받는 handler. 위 HANDLERS 와 분리해 둔다 — 인자 유무가 곧 계약이다. */
const APP_HANDLERS = {
  [ACTIONS.FIND_APPLICATION]: findApplication,
  [ACTIONS.ACTIVATE_WINDOW]: activateWindow,
};

/**
 * 명령 하나를 실행한다.
 *
 * 반환은 항상 `{ status, data?, errorCode? }` 다 — 예외를 밖으로 던지지 않는다.
 * handler 가 터졌다는 사실이 스택 트레이스와 함께 cloud 로 올라가면
 * 경로 · 사용자명 같은 것이 새어 나갈 수 있다. 코드만 보낸다.
 */
export async function runAction(action, context) {
  const { base, appId } = parseAction(action);

  const appHandler = APP_HANDLERS[base];
  if (appHandler) {
    // 등재되지 않은 appId 는 서버가 보냈더라도 여기서 끝난다 (§10·§24).
    const app = appId ? findWindowsApp(appId) : undefined;
    if (!app) return { status: 'denied', errorCode: 'WINDOWS_APP_NOT_REGISTERED' };
    // Windows 밖에서는 창 제어를 시도하지 않는다 (§9 V0 = Windows 전용).
    if (process.platform !== 'win32') {
      return { status: 'failed', errorCode: 'LOCAL_AGENT_EXECUTION_FAILED' };
    }
    try {
      return await appHandler(app);
    } catch {
      return { status: 'failed', errorCode: 'LOCAL_AGENT_EXECUTION_FAILED' };
    }
  }

  // 인자 없는 action 은 `base#...` 형태를 허용하지 않는다 — 정확히 일치해야 한다.
  const handler = appId === undefined ? HANDLERS[base] : undefined;
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
  return [...Object.keys(HANDLERS), ...Object.keys(APP_HANDLERS)];
}
