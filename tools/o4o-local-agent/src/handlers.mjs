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
 * 이 파일은 `node:os` 와 저장소 안의 모듈 네 개만 가져온다. `fs` 는 여전히 없다.
 * 즉 **임의 파일 접근은 여기서 가능하지 않다.**
 *
 * 외부 프로세스 실행은 `windows-window-control.mjs` **한 파일에만** 있고, 그 파일이
 * 실행할 수 있는 것은 저장소에 체크인된 `.ps1` 다섯 개뿐이다(그 파일 머리말 참조).
 * 이 handler 는 그 파일이 export 한 함수만 부를 수 있고, 임의 명령을 만들어 넘길 통로가 없다.
 *
 * WO-O4O-COMPUTER-USE-V0: 서버가 보낸 인자(좌표 · 텍스트 · 키)는 `computer-use-limits.mjs`
 * 로 **여기서 다시** 검사한다. 통과한 값만 PowerShell 경계를 넘는다(§26).
 */

import os from 'node:os';
import { findWindowsApp } from './windows-app-registry.mjs';
import { findBrowserSite } from './browser-site-registry.mjs';
import {
  activateWindowHandle,
  censusWindows,
  deliverComputerInput,
  detectRunningBrowser,
  inspectComputerWindow,
  matchBrowserWindows,
  matchWindows,
  openRegisteredSiteUrl,
} from './windows-window-control.mjs';
import {
  isUserActionTitle,
  validateClickArgs,
  validateKeyArgs,
  validateTextArgs,
} from './computer-use-limits.mjs';

export const AGENT_VERSION = '0.1.0';

/** 서버 계약(local-agent-protocol.ts)의 action 이름과 반드시 일치해야 한다. */
export const ACTIONS = {
  GET_AGENT_STATUS: 'local.get_agent_status',
  GET_SYSTEM_INFO: 'local.get_system_info',
  FIND_APPLICATION: 'local.find_application',
  ACTIVATE_WINDOW: 'local.activate_window',
  // WO-O4O-BROWSER-CONTROL-V0 §13·§14
  BROWSER_GET_SITE_STATUS: 'local.browser.get_site_status',
  BROWSER_OPEN_SITE: 'local.browser.open_site',
  // WO-O4O-COMPUTER-USE-V0 §14~§20·§24
  COMPUTER_INSPECT: 'local.computer.inspect',
  COMPUTER_CLICK: 'local.computer.click',
  COMPUTER_TYPE_TEXT: 'local.computer.type_text',
  COMPUTER_KEY: 'local.computer.key',
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

// ─── Browser Control V0 (WO-O4O-BROWSER-CONTROL-V0) ─────────────────────────

/**
 * `local.browser.get_site_status` — 브라우저가 떠 있는가 (§13).
 *
 * 되돌리는 것은 **브라우저 실행 여부와 종류**뿐이다. V0 는 탭을 열거하지 않으므로
 * "사이트가 열려 있는가" 는 판정하지 않고, 추측해서 true 를 만들지 않는다.
 * 창 제목 · URL · 탭 목록 · 프로필 경로는 이 함수 밖으로 나가지 않는다(§46).
 */
async function getSiteStatus(site) {
  const browser = detectRunningBrowser(await censusWindows());
  return {
    status: 'success',
    data: {
      siteId: site.siteId,
      displayName: site.displayName,
      browserRunning: browser.running,
      browserType: browser.browserType,
      // 탭 열거를 하지 않으므로 알 수 없다. null 이지 false 가 아니다.
      siteKnownOpen: null,
    },
  };
}

/**
 * `local.browser.open_site` — 등재 사이트를 기본 브라우저로 연다 (§14·§21·§23·§25).
 *
 *   siteId → (agent 등재부) → 고정 HTTPS URL → Windows 기본 URL handler
 *
 * 브라우저가 이미 떠 있으면 그 세션에 새 탭으로 열린다(§23 허용). "떠 있었는가 · 어떤
 * 브라우저인가" 는 **URL 을 실제로 받은 브라우저**(OS https handler) 기준이다 — Chrome 과
 * Edge 가 같이 떠 있어도 Edge 가 handler 면 Edge 를 답한다. 열린 뒤 그 브라우저 창이
 * 정확히 1개면 foreground 로 보낸다(기존 창 활성화 재사용, §21). 2개 이상이면 임의로
 * 고르지 않는다 — OS handler 가 이미 새 탭 쪽을 앞으로 보냈을 가능성이 높다.
 *
 * 하지 않는 것: 로그인 · credential 입력 · cookie 접근 · URL 조립 · 브라우저 플래그.
 */
async function openSite(site) {
  const beforeWindows = await censusWindows();
  const outcome = await openRegisteredSiteUrl(site.url);
  if (!outcome.opened) {
    return {
      status: 'failed',
      errorCode: 'BROWSER_OPEN_FAILED',
      data: { siteId: site.siteId, displayName: site.displayName, opened: false },
    };
  }
  // handler 를 모르면(등재 밖 브라우저) 떠 있는 등재 브라우저 아무거나 기준으로 답한다.
  const handler = outcome.browserType;
  const before = detectRunningBrowser(beforeWindows, handler);

  // 새로 실행됐다면 창이 뜰 시간을 준다. 이미 떠 있었다면 새 탭이라 바로 있다.
  if (!before.running) await new Promise((r) => setTimeout(r, 1500));

  const windows = await censusWindows();
  const after = detectRunningBrowser(windows, handler);
  const browserWindows = matchBrowserWindows(windows, handler);

  let activated = false;
  if (browserWindows.length === 1) {
    const act = await activateWindowHandle(browserWindows[0].hwnd);
    activated = act.activated === true;
  }

  return {
    status: 'success',
    data: {
      siteId: site.siteId,
      displayName: site.displayName,
      opened: true,
      browserRunning: after.running,
      browserType: after.browserType,
      browserWasRunning: before.running,
      activated,
    },
  };
}

// ─── Computer Use V0 (WO-O4O-COMPUTER-USE-V0) ───────────────────────────────
//
// 대상은 언제나 **등재 앱의 창 하나**다(§7·§8·§9). 이 섹션의 모든 handler 는
//   census → 등재 앱 매칭 → 정확히 1개인지 → (상호작용이면) 사용자 처리 창인지 → 스크립트
// 순서를 밟고, 창 핸들 · 제목 · PID 는 이 파일 밖으로 나가지 않는다(§43).
//
// 서버가 보낸 인자는 `computer-use-limits.mjs` 로 **다시** 검사한다(§26). 규칙 밖이면
// 스크립트를 부르지 않고 UNSUPPORTED 로 끝낸다.

const COMPUTER_ERR = Object.freeze({
  TARGET_NOT_FOUND: 'COMPUTER_USE_TARGET_NOT_FOUND',
  TARGET_LOST: 'COMPUTER_USE_TARGET_LOST',
  OUT_OF_BOUNDS: 'COMPUTER_USE_OUT_OF_BOUNDS',
  INPUT_FAILED: 'COMPUTER_USE_INPUT_FAILED',
  USER_ACTION_REQUIRED: 'COMPUTER_USE_USER_ACTION_REQUIRED',
  UNSUPPORTED_ACTION: 'COMPUTER_USE_UNSUPPORTED_ACTION',
});

function computerBase(app, extra) {
  return { targetId: app.appId, displayName: app.displayName, ...extra };
}

/**
 * 대상 창 하나를 고른다. 0개 → TARGET_NOT_FOUND, 2개 이상 → AMBIGUOUS(임의로 고르지 않는다, §32).
 * 반환: `{ window }` 또는 `{ failure }`.
 */
async function resolveComputerTarget(app) {
  const windows = matchWindows(await censusWindows(), app);
  if (windows.length === 0) {
    return {
      failure: {
        status: 'failed',
        errorCode: COMPUTER_ERR.TARGET_NOT_FOUND,
        data: computerBase(app, { found: false, windowCount: 0 }),
      },
    };
  }
  if (windows.length > 1) {
    return {
      failure: {
        status: 'failed',
        errorCode: 'WINDOWS_APP_WINDOW_AMBIGUOUS',
        data: computerBase(app, { found: true, windowCount: windows.length }),
      },
    };
  }
  return { window: windows[0] };
}

/**
 * `local.computer.inspect` — 대상 창의 foreground 여부 · client 크기 · 스냅샷 크기 (§10·§14).
 *
 * 이미지는 존재하지 않는다: 스크립트가 메모리에서 한 번 캡처하고 크기만 남긴 채 버린다(§12).
 * 되돌리는 것은 숫자 · 불리언 · `capturedAt` 뿐이다.
 */
async function computerInspect(app) {
  const target = await resolveComputerTarget(app);
  if (target.failure) return target.failure;
  const info = await inspectComputerWindow(target.window.hwnd);
  if (!info.ok) {
    return {
      status: 'failed',
      errorCode: COMPUTER_ERR.TARGET_NOT_FOUND,
      data: computerBase(app, { found: false, windowCount: 0 }),
    };
  }
  return {
    status: 'success',
    data: computerBase(app, {
      found: true,
      windowCount: 1,
      foreground: info.foreground,
      clientWidth: info.clientWidth,
      clientHeight: info.clientHeight,
      snapshotAvailable: info.captured,
      snapshotWidth: info.snapshotWidth,
      snapshotHeight: info.snapshotHeight,
      userActionRequired: isUserActionTitle(target.window.title),
      capturedAt: new Date().toISOString(),
    }),
  };
}

/**
 * 스크립트가 "실행하지 않았다" 고 한 이유를 서버 코드로 옮긴다 (§9·§41·§42·§45).
 *
 *   TARGET_LOST + 다른 프로세스가 앞에 있음 → TARGET_LOST
 *   TARGET_LOST + 같은 프로세스의 다른 창(대화상자·팝업) → USER_ACTION_REQUIRED
 */
function classifyNotExecuted(outcome) {
  if (outcome.reason === 'OUT_OF_BOUNDS') return COMPUTER_ERR.OUT_OF_BOUNDS;
  if (outcome.reason === 'TARGET_NOT_VISIBLE') return COMPUTER_ERR.TARGET_NOT_FOUND;
  if (outcome.reason === 'TARGET_LOST') {
    const samePid = outcome.targetPid > 0 && outcome.foregroundPid === outcome.targetPid;
    return samePid ? COMPUTER_ERR.USER_ACTION_REQUIRED : COMPUTER_ERR.TARGET_LOST;
  }
  return COMPUTER_ERR.INPUT_FAILED;
}

/**
 * 상호작용 공통 경로 — 클릭 · 텍스트 · 허용키 모두 여기를 지난다.
 * 한 번의 호출 = 한 번의 입력이다(§30 "inspect → max 1 interaction").
 */
async function computerInteract(app, kind, args, successFields) {
  const target = await resolveComputerTarget(app);
  if (target.failure) return target.failure;
  // §13·§34·§41 — 로그인 · 파일 대화상자 성격의 창에는 어떤 입력도 넣지 않는다.
  if (isUserActionTitle(target.window.title)) {
    return {
      status: 'failed',
      errorCode: COMPUTER_ERR.USER_ACTION_REQUIRED,
      data: computerBase(app, { found: true, windowCount: 1, userActionRequired: true }),
    };
  }
  const outcome = await deliverComputerInput(target.window.hwnd, kind, args);
  if (!outcome.ok) {
    return {
      status: 'failed',
      errorCode: COMPUTER_ERR.INPUT_FAILED,
      data: computerBase(app, { found: true, windowCount: 1 }),
    };
  }
  if (!outcome.executed) {
    const errorCode = classifyNotExecuted(outcome);
    return {
      status: 'failed',
      errorCode,
      data: computerBase(app, {
        found: true,
        windowCount: 1,
        foreground: false,
        clientWidth: outcome.clientWidth,
        clientHeight: outcome.clientHeight,
        userActionRequired: errorCode === COMPUTER_ERR.USER_ACTION_REQUIRED,
      }),
    };
  }
  return {
    status: 'success',
    data: computerBase(app, {
      found: true,
      windowCount: 1,
      foreground: true,
      clientWidth: outcome.clientWidth,
      clientHeight: outcome.clientHeight,
      verified: outcome.verified,
      ...successFields,
    }),
  };
}

/** `local.computer.click` — 단일 왼쪽 클릭, 정규화 좌표 (§15·§16·§22). */
function computerClick(app, args) {
  return computerInteract(app, 'click', args, { clicked: true });
}

/** `local.computer.type_text` — 텍스트 1건 (§17·§18·§27). 줄바꿈 없음 — ENTER 는 key 로. */
function computerTypeText(app, args) {
  return computerInteract(app, 'text', args, { typed: true, typedLength: args.text.length });
}

/** `local.computer.key` — ENTER · TAB · ESC 중 하나 1회 (§19·§20). */
function computerKey(app, args) {
  return computerInteract(app, 'key', args, { keyPressed: true, key: args.key });
}

/**
 * 인자 검사 — action 별 규칙. 통과한 **정규화된 인자만** handler 로 간다.
 * 이 표에 없는 computer action 은 존재하지 않는다.
 */
const COMPUTER_HANDLERS = {
  [ACTIONS.COMPUTER_INSPECT]: { validate: () => ({ ok: true, args: undefined }), run: computerInspect },
  [ACTIONS.COMPUTER_CLICK]: { validate: validateClickArgs, run: computerClick },
  [ACTIONS.COMPUTER_TYPE_TEXT]: { validate: validateTextArgs, run: computerTypeText },
  [ACTIONS.COMPUTER_KEY]: { validate: validateKeyArgs, run: computerKey },
};

/** siteId 를 받는 handler. APP_HANDLERS 와 같은 규칙 — 인자 유무가 곧 계약이다. */
const SITE_HANDLERS = {
  [ACTIONS.BROWSER_GET_SITE_STATUS]: getSiteStatus,
  [ACTIONS.BROWSER_OPEN_SITE]: openSite,
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
export async function runAction(action, context, args) {
  const { base, appId } = parseAction(action);

  // Computer Use V0: `base#appId` + 인자. 등재 밖 appId · 규칙 밖 인자는 스크립트를 부르지 않는다(§25·§26).
  const computerHandler = COMPUTER_HANDLERS[base];
  if (computerHandler) {
    const app = appId ? findWindowsApp(appId) : undefined;
    if (!app) return { status: 'denied', errorCode: 'WINDOWS_APP_NOT_REGISTERED' };
    const checked = computerHandler.validate(args);
    if (!checked.ok) {
      return {
        status: 'denied',
        errorCode: 'COMPUTER_USE_UNSUPPORTED_ACTION',
        data: { targetId: app.appId, displayName: app.displayName },
      };
    }
    if (process.platform !== 'win32') {
      return { status: 'failed', errorCode: 'COMPUTER_USE_INPUT_FAILED' };
    }
    try {
      return await computerHandler.run(app, checked.args);
    } catch {
      return { status: 'failed', errorCode: 'COMPUTER_USE_INPUT_FAILED' };
    }
  }

  // Browser Control V0: `base#siteId`. 등재되지 않은 siteId 는 서버가 보냈더라도 여기서 끝난다(§44).
  const siteHandler = SITE_HANDLERS[base];
  if (siteHandler) {
    const site = appId ? findBrowserSite(appId) : undefined;
    if (!site) return { status: 'denied', errorCode: 'BROWSER_SITE_NOT_REGISTERED' };
    if (process.platform !== 'win32') {
      return { status: 'failed', errorCode: 'BROWSER_NOT_AVAILABLE' };
    }
    try {
      return await siteHandler(site);
    } catch {
      return { status: 'failed', errorCode: 'BROWSER_OPEN_FAILED' };
    }
  }

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
  return [
    ...Object.keys(HANDLERS),
    ...Object.keys(APP_HANDLERS),
    ...Object.keys(SITE_HANDLERS),
    ...Object.keys(COMPUTER_HANDLERS),
  ];
}
