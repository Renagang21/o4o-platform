/**
 * 지속 UIA 클라이언트 — agent 실행층 (WO-O4O-WINDOWS-UIA-ELEMENT-IDENTITY-AND-PERSISTENT-CLIENT-V1)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇인가
 *
 *   windows-uia-host.ps1(오래 사는 한 프로세스)의 수명·프로토콜을 감싸는 얇은 계층이다. 호스트는 네이티브 UIA 공급자로
 *   건 element 핸들을 캐시해 두므로, 이 클라이언트를 통하면 여러 observe/action 스텝에 걸쳐 **같은 요소를 안정적으로**
 *   재사용할 수 있다(요청당 프로세스인 windows-uia.ps1 의 set_value/invoke 불안정성을 피한다 —
 *   [[ref-windows-winforms-uia-native-vs-msaa-provider]]).
 *
 *   책임: (1) 호스트 프로세스 싱글턴 수명(지연 시작 · 유휴 종료 · 크래시 시 다음 호출에서 재시작),
 *        (2) stdin/stdout JSON 한 줄 프로토콜의 요청/응답 상관(id),
 *        (3) 요청별 타임아웃 → UIA_CLIENT_TIMEOUT · 시작 실패 → UIA_CLIENT_UNAVAILABLE,
 *        (4) generation(호스트 기동 토큰) 추적 + 클라이언트측 불일치 단락(재시작 후 옛 snapshot ref 거부).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 경계
 *
 *   - 실행(child_process)은 windows-window-control.mjs 의 단일 지점(`startUiaHost`)만 안다. 이 파일은 그 스트림만 다룬다.
 *   - 호스트에 보내는 것은 op(ping|inspect|act|shutdown) 와 정형 인자(pid·rid·hwnd·kind·text·identity)뿐 — 임의 UIA 질의·raw
 *     PowerShell 은 표현할 수 없다. text/키/좌표 규칙은 호출자(windows-uia.mjs)가 이미 적용한다.
 *   - RuntimeId·창 핸들 원문은 호스트↔이 프로세스 사이에만 오간다. 서버·로그로는 나가지 않는다(windows-uia.mjs 가 e_n 만 낸다).
 */

import { startUiaHost } from './windows-window-control.mjs';

const REQUEST_TIMEOUT_MS = 20_000;
// 유휴 시 호스트를 접어 자원·누적 stdout 버퍼를 정리한다. 이 종료는 곧 재시작(새 generation)이라, 이후 옛 snapshot 의 act 는
// GENERATION_MISMATCH 로 거부된다 — inspect→act 는 한 세션에서 이 시간 안에 일어난다.
const IDLE_SHUTDOWN_MS = 120_000;
const MAX_BUFFER_BYTES = 512 * 1024;

/** 살아 있는 호스트 하나(또는 null). 재시작할 때마다 새 객체 · 새 generation. */
let host = null;

function teardown(h, errorCode) {
  if (!h) return;
  h.alive = false;
  if (h.idleTimer) { clearTimeout(h.idleTimer); h.idleTimer = null; }
  for (const [, p] of h.pending) { clearTimeout(p.timer); p.resolve({ ok: false, errorCode: errorCode || 'UIA_CLIENT_UNAVAILABLE' }); }
  h.pending.clear();
  if (host === h) host = null;
}

function killHost(h, errorCode) {
  if (!h) return;
  try { h.child.kill(); } catch { /* 이미 끝남 */ }
  teardown(h, errorCode);
}

function onData(h, chunk) {
  h.buf += chunk;
  if (h.buf.length > MAX_BUFFER_BYTES) { killHost(h, 'UIA_CLIENT_UNAVAILABLE'); return; }
  let nl;
  while ((nl = h.buf.indexOf('\n')) >= 0) {
    const line = h.buf.slice(0, nl).trim();
    h.buf = h.buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (typeof msg.generation === 'string' && msg.generation) h.generation = msg.generation;
    const p = h.pending.get(msg.id);
    if (p) { clearTimeout(p.timer); h.pending.delete(msg.id); p.resolve(msg); }
  }
}

function resetIdle(h) {
  if (h.idleTimer) clearTimeout(h.idleTimer);
  h.idleTimer = setTimeout(() => { if (h.pending.size === 0) killHost(h, 'UIA_CLIENT_UNAVAILABLE'); else resetIdle(h); }, IDLE_SHUTDOWN_MS);
  if (typeof h.idleTimer.unref === 'function') h.idleTimer.unref();
}

function ensureHost() {
  if (host && host.alive) return host;
  let child;
  try { child = startUiaHost(); } catch { return null; }
  if (!child || typeof child.pid !== 'number' || !child.stdin || !child.stdout) return null;
  const h = { child, generation: null, pending: new Map(), buf: '', nextId: 0, idleTimer: null, alive: true };
  try { child.stdout.setEncoding('utf8'); } catch { /* noop */ }
  child.stdout.on('data', (d) => onData(h, d));
  child.on('exit', () => teardown(h, 'UIA_CLIENT_UNAVAILABLE'));
  child.on('error', () => teardown(h, 'UIA_CLIENT_UNAVAILABLE'));
  if (child.stdin) child.stdin.on('error', () => teardown(h, 'UIA_CLIENT_UNAVAILABLE'));
  host = h;
  resetIdle(h);
  return h;
}

function request(obj, timeoutMs = REQUEST_TIMEOUT_MS) {
  const h = ensureHost();
  if (!h) return Promise.resolve({ ok: false, errorCode: 'UIA_CLIENT_UNAVAILABLE' });
  const id = ++h.nextId;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (h.pending.has(id)) { h.pending.delete(id); resolve({ ok: false, errorCode: 'UIA_CLIENT_TIMEOUT' }); killHost(h, 'UIA_CLIENT_TIMEOUT'); }
    }, timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();
    h.pending.set(id, { resolve, timer });
    try {
      h.child.stdin.write(JSON.stringify({ id, ...obj }) + '\n');
    } catch {
      clearTimeout(timer); h.pending.delete(id); resolve({ ok: false, errorCode: 'UIA_CLIENT_UNAVAILABLE' }); killHost(h, 'UIA_CLIENT_UNAVAILABLE'); return;
    }
    resetIdle(h);
  });
}

/** 지금 살아 있는 호스트의 generation(없으면 null). windows-uia.mjs 가 inspect 응답의 generation 을 그대로 쓰므로 보통은 불필요 — 테스트/진단용. */
export function currentGeneration() {
  return host && host.alive ? host.generation : null;
}

/**
 * 대상 pid 의 top-level 창을 네이티브 recipe 로 걸어 UI 트리를 읽고, 살아 있는 element 핸들을 호스트에 캐시한다.
 * 반환(성공): `{ ok:true, generation, windows, elements, elementCount, truncated }`.
 * 반환(실패): `{ ok:false, errorCode }`(클라이언트) 또는 `{ ok:false, reason }`(호스트).
 */
export function hostInspect(pid, processNames) {
  return request({ op: 'inspect', pid, processNames });
}

/**
 * 캐시된 요소에 동작을 실행한다. `req = { generation, kind:'set_value'|'invoke', rid, hwnd, text?, identity }`.
 * generation 이 지금 호스트의 것과 다르면(재시작·유휴 종료로 옛 ref) 왕복 없이 UIA_GENERATION_MISMATCH 로 단락한다.
 */
export function hostAct(req) {
  const h = host;
  if (!h || !h.alive || h.generation === null) {
    // snapshot 을 뜬 호스트가 이미 사라졌다 = 옛 ref. (동작은 반드시 선행 inspect 가 캐시한 핸들을 요구한다.)
    return Promise.resolve({ ok: false, errorCode: 'UIA_GENERATION_MISMATCH' });
  }
  if (req && req.generation && req.generation !== h.generation) {
    return Promise.resolve({ ok: false, errorCode: 'UIA_GENERATION_MISMATCH' });
  }
  return request({ op: 'act', ...req });
}

/** 호스트를 명시적으로 접는다(테스트·정리·재시작 유도). 다음 inspect 가 새 generation 으로 다시 띄운다. */
export async function shutdownUiaHost() {
  const h = host;
  if (!h || !h.alive) { host = null; return; }
  // 우아한 종료를 한 번 시도하고(응답을 기다리되 짧게), 곧 강제 종료로 확실히 정리한다.
  const done = request({ op: 'shutdown' }, 2000).catch(() => {});
  await Promise.race([done, new Promise((r) => setTimeout(r, 2000))]);
  killHost(h, 'UIA_CLIENT_UNAVAILABLE');
}
