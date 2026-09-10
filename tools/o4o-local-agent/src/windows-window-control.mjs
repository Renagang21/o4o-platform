/**
 * Windows 창 조사 · 활성화 — **agent 안에서 유일하게 외부 프로세스를 부르는 파일**
 *
 * WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 §7·§16·§17·§18·§19·§25
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ 이 파일은 직전 WO 의 "부재에 의한 방어" 를 **의도적으로 한 칸 여는 지점**이다
 *
 *   지금까지 agent 저장소 어디에도 `child_process` 가 없었다. Windows 창을 열거하고
 *   foreground 로 보내는 일은 Win32 API 호출이라, 네이티브 모듈을 새로 설치하지 않는 한
 *   (=`package.json`·lockfile 변경 = 중지 조건) Node 만으로는 불가능하다.
 *   그래서 §7 이 후보로 명시한 **PowerShell helper** 를 쓴다.
 *
 *   대신 "임의 실행" 이 되지 않도록 다음을 전부 건다:
 *
 *   1. `execFile` 만 쓴다. `exec` · `spawn` · `shell: true` 를 쓰지 않으므로
 *      **셸이 개입하지 않는다** (인용·`&`·파이프 해석 자체가 없다).
 *   2. 실행 대상은 **저장소에 체크인된 `.ps1` 파일 3개**뿐이다(창 census · 창 활성화 ·
 *      등재 사이트 열기). 스크립트 문자열을 런타임에 조립하지 않는다 —
 *      `-Command` 를 쓰지 않고 `-File` 만 쓴다.
 *   3. argv 는 아래 상수 배열이 전부다. **호출자가 argv 에 값을 넣을 수 없다.**
 *   4. 유일한 입력인 창 핸들은 환경변수로 넘기고, 넘기기 전에 10진 정수인지 확인한다.
 *   5. appId · 프로그램 이름 · 창 제목은 **이 경계를 넘지 않는다.** 매칭은 전부 JS 안에서
 *      한다. PowerShell 은 조건 없는 창 목록만 돌려준다.
 *
 *   즉 여기서 실행 가능한 것은 "지금 창 목록을 다오" · "이 핸들을 앞으로 보내라" ·
 *   "이 등재 HTTPS 주소를 기본 handler 로 열어라" 세 가지가 전부이고,
 *   그 밖의 명령은 **표현할 방법이 없다**.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WO-O4O-BROWSER-CONTROL-V0 §14·§25·§27 — 세 번째 스크립트
 *
 *   사이트 열기도 같은 규칙으로 이 파일에만 둔다 (execFile 지점을 늘리지 않는다).
 *   유일한 입력인 URL 은 **agent 자신의 등재부 상수**이며 환경변수로 넘기고, 넘기기 전에
 *   `https://` 인지 확인한다. 브라우저 실행 파일을 지정하지 않는다 — Windows 기본 URL
 *   handler 가 사용자의 기본 브라우저를 고른다(§15). 그래서 이것은 "임의 process launch"
 *   가 아니라 "등재 URL open" 이라는 좁은 capability 다(§25·§26).
 */

import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CENSUS_SCRIPT = path.join(HERE, 'windows-window-census.ps1');
const ACTIVATE_SCRIPT = path.join(HERE, 'windows-window-activate.ps1');
const BROWSER_OPEN_SCRIPT = path.join(HERE, 'windows-browser-open.ps1');

/**
 * 브라우저로 인정할 process 이름 (§24 — Chrome · Edge 만).
 * 창 census 결과와 대조해 "브라우저가 떠 있는가" 를 판정하는 데만 쓴다.
 */
export const BROWSER_PROCESS_NAMES = Object.freeze({
  chrome: Object.freeze(['chrome']),
  edge: Object.freeze(['msedge']),
});

/** PowerShell 자체 옵션. profile · 대화형 · 원격 정책 영향에서 떼어 놓는다. */
const PS_FLAGS = Object.freeze([
  '-NoProfile',
  '-NonInteractive',
  '-NoLogo',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
]);

const PS_EXE = 'powershell.exe';
const EXEC_TIMEOUT_MS = 12000;
const MAX_OUTPUT_BYTES = 512 * 1024;

/**
 * 자식 프로세스에 넘기는 환경. **상속하지 않는다** — 토큰·경로·사용자 정보가 들어 있는
 * 부모 환경을 통째로 넘길 이유가 없다. SystemRoot 는 PowerShell 기동에 필요하다.
 */
function childEnv(extra) {
  return {
    SystemRoot: process.env.SystemRoot || 'C:\\Windows',
    windir: process.env.windir || 'C:\\Windows',
    ...extra,
  };
}

function runScript(scriptPath, env) {
  return new Promise((resolve, reject) => {
    execFile(
      PS_EXE,
      [...PS_FLAGS, scriptPath],
      {
        timeout: EXEC_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_BYTES,
        windowsHide: true,
        env,
      },
      (error, stdout) => {
        // 예외 메시지는 여기서 끝난다. 밖으로는 정규화된 코드만 나간다(§18).
        if (error) reject(new Error('POWERSHELL_FAILED'));
        else resolve(String(stdout || ''));
      },
    );
  });
}

function parseJson(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * 지금 화면에 있는 top-level 창 목록.
 *
 * 반환 형상: `{ hwnd, pid, processName, title, minimized }[]`
 * **이 값은 agent 밖으로 나가지 않는다.** 서버로 가는 것은 개수와 상태뿐이다(§20·§21).
 */
export async function censusWindows() {
  const raw = await runScript(CENSUS_SCRIPT, childEnv({}));
  const parsed = parseJson(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((w) => w && typeof w === 'object')
    .map((w) => ({
      hwnd: Number(w.hwnd),
      pid: Number(w.pid),
      processName: String(w.processName || ''),
      title: String(w.title || ''),
      minimized: w.minimized === true,
    }))
    .filter((w) => Number.isFinite(w.hwnd) && w.hwnd > 0);
}

/**
 * 등재된 앱 정의에 맞는 창만 고른다 (§17).
 *
 * 기준: 등재 process 이름과 일치 · 제목 있음 (visible · top-level 은 census 단계에서
 * 이미 걸러졌다). `windowTitlePatterns` 가 있으면 그것까지 만족해야 한다.
 */
export function matchWindows(windows, app) {
  const names = (app.processNames || []).map((n) => String(n).toLowerCase());
  const patterns = (app.windowTitlePatterns || []).map((p) => String(p).toLowerCase());
  return windows.filter((w) => {
    if (!w.title) return false;
    if (!names.includes(w.processName.toLowerCase())) return false;
    if (patterns.length === 0) return true;
    const title = w.title.toLowerCase();
    return patterns.some((p) => title.includes(p));
  });
}

/**
 * 창 하나를 foreground 로 보낸다 (§13·§18).
 *
 * 핸들은 **agent 자신의 census 에서 나온 값**이고, 넘기기 전에 형식을 다시 확인한다.
 * 반환: `{ activated, restored }`.
 */
export async function activateWindowHandle(hwnd) {
  const handle = Number(hwnd);
  if (!Number.isInteger(handle) || handle <= 0) {
    return { activated: false, restored: false };
  }
  const raw = await runScript(
    ACTIVATE_SCRIPT,
    childEnv({ O4O_WINDOW_HANDLE: String(handle) }),
  );
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== 'object') return { activated: false, restored: false };
  return { activated: parsed.activated === true, restored: parsed.restored === true };
}

// ─── Browser Control V0 (WO-O4O-BROWSER-CONTROL-V0) ─────────────────────────

/**
 * 지금 떠 있는 브라우저 종류 (§13·§24).
 *
 * census 결과에서 등재된 브라우저 process 이름만 본다. 창 제목·URL 은 보지 않는다 —
 * V0 는 탭을 열거하지 않으므로 "사이트가 열려 있는가" 는 판정하지 않는다(§13 추측 금지).
 * 반환: `{ running: boolean, browserType: 'chrome'|'edge'|null }`.
 */
export function detectRunningBrowser(windows, preferred = null) {
  const names = new Set(windows.map((w) => String(w.processName || '').toLowerCase()));
  const isUp = (type) => (BROWSER_PROCESS_NAMES[type] || []).some((p) => names.has(p));
  // URL handler 가 확정돼 있으면 그 브라우저만 답한다 — 다른 브라우저가 떠 있어도 "실행 중" 이 아니다.
  if (preferred && BROWSER_PROCESS_NAMES[preferred]) {
    return { running: isUp(preferred), browserType: preferred };
  }
  for (const type of Object.keys(BROWSER_PROCESS_NAMES)) {
    if (isUp(type)) return { running: true, browserType: type };
  }
  return { running: false, browserType: null };
}

/**
 * Windows https UrlAssociation 의 ProgId → 등재 브라우저 종류. 모르는 값은 null.
 * (`ChromeHTML` · `MSEdgeHTM` 만 안다. Firefox 등은 등재 밖이라 null — 열리긴 하지만 창을 고르지 않는다.)
 */
export function browserTypeFromProgId(progId) {
  const id = String(progId ?? '');
  if (/^ChromeHTML/.test(id)) return 'chrome';
  if (/^MSEdgeHTM/.test(id)) return 'edge';
  return null;
}

/**
 * 등재 브라우저 process 의 제목 있는 창만 고른다(foreground 대상 후보).
 * `browserType` 을 주면 그 브라우저의 창만 — URL 을 받은 브라우저가 아닌 창을 앞으로 보내지 않는다.
 */
export function matchBrowserWindows(windows, browserType = null) {
  const procs = browserType && BROWSER_PROCESS_NAMES[browserType]
    ? BROWSER_PROCESS_NAMES[browserType]
    : Object.values(BROWSER_PROCESS_NAMES).flat();
  return windows.filter((w) => w.title && procs.includes(String(w.processName || '').toLowerCase()));
}

/**
 * 등재된 HTTPS 주소를 **Windows 기본 URL handler** 로 연다 (§14·§15·§25).
 *
 * `url` 은 호출자가 **등재부에서 꺼낸 상수**여야 한다 — 이 함수는 그것을 다시 확인한다.
 * 실행 파일을 지정하지 않으므로 어떤 브라우저가 뜨는지는 OS 사용자 설정이 정하고,
 * 그 브라우저의 기존 프로필·세션이 그대로 쓰인다(§16).
 * 반환: `{ opened: boolean, browserType: 'chrome'|'edge'|null }` — browserType 은 OS 가 고른
 * https handler 를 등재 브라우저로 옮긴 것이다(모르면 null).
 */
export async function openRegisteredSiteUrl(url) {
  const value = String(url ?? '').trim();
  // 이중 방어 — 등재부가 이미 https 만 담지만, 여기서도 확인한다. 공백·따옴표·제어문자 거절.
  if (!/^https:\/\/[A-Za-z0-9][A-Za-z0-9\-.]*(:\d{1,5})?(\/[^\s"'<>]*)?$/.test(value)) {
    return { opened: false };
  }
  const raw = await runScript(BROWSER_OPEN_SCRIPT, childEnv({ O4O_SITE_URL: value }));
  const parsed = parseJson(raw);
  if (!parsed || parsed.opened !== true) return { opened: false, browserType: null };
  return { opened: true, browserType: browserTypeFromProgId(parsed.progId) };
}
