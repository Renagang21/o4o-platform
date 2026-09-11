/**
 * Bridge Relay — 폴링 agent ↔ Native Messaging host 사이의 로컬 통로
 *
 * WO-O4O-BROWSER-DOM-CONTROL-V0 §35·§36·§37
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 필요한가
 *
 *   Native host 는 Chrome 이 확장 연결마다 띄우는 **단명 stdio 프로세스**다(BRIDGE-V0 §24). cloud
 *   에서 명령을 받아 오는 것은 **폴링 agent**(index.mjs) 다. 둘은 다른 프로세스라 agent 가 확장에
 *   DOM 명령을 넘기려면 host 가 agent 에 붙어 있어야 한다. 이 relay 가 그 접점이다:
 *
 *     agent(relay 서버) ⇐ named pipe ⇒ native host ⇐ stdio ⇒ 확장 ⇐ runtime message ⇒ content script
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 어디까지 열리는가
 *
 *   - Windows named pipe(`\\.\pipe\o4o-local-agent-bridge-<random>`) / 그 밖은 agent home 의 unix socket.
 *     네트워크 포트가 아니다. 같은 PC 의 프로세스만 닿는다.
 *   - 그 위에 **per-run 토큰**을 둔다. agent 가 시작할 때 무작위 토큰을 만들어 agent home 의
 *     `bridge-session.json` 에 쓰고, host 는 그 파일을 읽어 첫 프레임(`host.hello`)에 싣는다.
 *     토큰이 다르면 연결을 끊는다. 토큰은 PC 밖으로 나가지 않으며 agent 재시작마다 바뀐다.
 *   - host 하나만 "현재 확장 연결" 로 인정한다. 둘째 host 가 붙으면 앞 연결을 교체한다(Chrome 이
 *     확장 재시작 시 host 를 다시 띄우므로 이것이 자연스러운 동작이다).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇을 나르는가
 *
 *   `dispatch(type, payload)` 는 **bridge 봉투(type = browser.dom.* 등 allowlist)** 하나를 host 로
 *   보내고 같은 requestId 의 응답을 기다린다. 봉투 검증은 native-bridge-protocol 의 것을 쓴다 —
 *   allowlist 밖 type 은 relay 에서 이미 막힌다. shell · 파일 · URL 을 나르는 프레임 종류는 없다.
 */

import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { BRIDGE_PROTOCOL_VERSION, validateBridgeMessage } from './native-bridge-protocol.mjs';

/** agent home — credentials.mjs 와 같은 규칙. */
export function agentHome() {
  if (process.env.O4O_AGENT_HOME) return process.env.O4O_AGENT_HOME;
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(base, 'o4o-local-agent');
}

export function bridgeSessionPath() {
  return path.join(agentHome(), 'bridge-session.json');
}

/** host 가 읽는 세션 파일. 없거나 깨졌으면 null. */
export function loadBridgeSession() {
  try {
    const raw = fs.readFileSync(bridgeSessionPath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.pipe !== 'string' || typeof parsed.token !== 'string') return null;
    return { pipe: parsed.pipe, token: parsed.token };
  } catch {
    return null;
  }
}

function makePipePath() {
  const suffix = randomBytes(6).toString('hex');
  if (process.platform === 'win32') return `\\\\.\\pipe\\o4o-local-agent-bridge-${suffix}`;
  return path.join(agentHome(), `bridge-${suffix}.sock`);
}

/** 응답 대기 상한. 확장이 탭에 물어보고 돌아오는 데 충분하고, cloud 명령 TTL(20 s) 안이다. */
export const BRIDGE_DISPATCH_TIMEOUT_MS = 12000;

// ─── NDJSON framing ─────────────────────────────────────────────────────────

/** 한 줄 = JSON 하나. 파이프 양쪽이 같은 규칙. */
export function encodeLine(value) {
  return JSON.stringify(value) + '\n';
}

/** 버퍼에서 완성된 줄만 떼어낸다. 순수 함수. */
export function drainLines(buffer) {
  const messages = [];
  let rest = buffer;
  let idx;
  while ((idx = rest.indexOf('\n')) >= 0) {
    const line = rest.slice(0, idx);
    rest = rest.slice(idx + 1);
    if (!line.trim()) continue;
    try {
      messages.push(JSON.parse(line));
    } catch {
      messages.push(null);
    }
  }
  return { messages, rest };
}

// ─── relay server (agent 쪽) ────────────────────────────────────────────────

/**
 * relay 를 띄운다. 반환:
 *   dispatch(type, payload, timeoutMs?) → Promise<{ ok, message?, errorCode? }>
 *   isExtensionConnected() → boolean      (host 가 붙어 있고 확장 hello 를 알렸는가)
 *   close()
 */
export async function startBridgeRelay({ log = () => {} } = {}) {
  const pipe = makePipePath();
  const token = randomUUID();
  const pending = new Map(); // requestId -> { resolve, timer }
  let current = null; // { socket, extensionConnected }

  const server = net.createServer((socket) => {
    let acc = '';
    let authed = false;
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      acc += chunk;
      const { messages, rest } = drainLines(acc);
      acc = rest;
      for (const frame of messages) {
        if (!frame || typeof frame !== 'object') continue;
        if (!authed) {
          // 첫 프레임은 반드시 host.hello + 올바른 토큰. 아니면 즉시 끊는다.
          if (frame.kind !== 'host.hello' || frame.token !== token) {
            socket.destroy();
            return;
          }
          authed = true;
          if (current && current.socket !== socket) {
            try {
              current.socket.destroy();
            } catch {
              // ignore
            }
          }
          current = { socket, extensionConnected: frame.extensionConnected === true };
          socket.write(encodeLine({ kind: 'host.welcome' }));
          log('native host 가 relay 에 연결되었습니다.');
          continue;
        }
        if (frame.kind === 'extension.state') {
          if (current && current.socket === socket) current.extensionConnected = frame.connected === true;
          continue;
        }
        if (frame.kind === 'bridge.response' && typeof frame.requestId === 'string') {
          const entry = pending.get(frame.requestId);
          if (!entry) continue;
          pending.delete(frame.requestId);
          clearTimeout(entry.timer);
          const verdict = validateBridgeMessage(frame.message);
          entry.resolve(verdict.ok ? { ok: true, message: verdict.message } : { ok: false, errorCode: verdict.errorCode });
        }
      }
    });
    socket.on('close', () => {
      if (current && current.socket === socket) {
        current = null;
        log('native host 연결이 끊겼습니다.');
      }
    });
    socket.on('error', () => {
      // 상대가 끊은 것 — close 가 뒤따른다.
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(pipe, () => resolve());
  });

  fs.mkdirSync(agentHome(), { recursive: true });
  fs.writeFileSync(bridgeSessionPath(), JSON.stringify({ pipe, token, createdAt: new Date().toISOString() }), {
    encoding: 'utf8',
    mode: 0o600,
  });

  function isExtensionConnected() {
    return !!current && current.extensionConnected;
  }

  function dispatch(type, payload, timeoutMs = BRIDGE_DISPATCH_TIMEOUT_MS) {
    const requestId = randomUUID();
    const envelope = { version: BRIDGE_PROTOCOL_VERSION, requestId, type, payload: payload ?? {} };
    const verdict = validateBridgeMessage(envelope);
    if (!verdict.ok) return Promise.resolve({ ok: false, errorCode: verdict.errorCode });
    if (!current) return Promise.resolve({ ok: false, errorCode: 'O4O_EXTENSION_NOT_CONNECTED' });
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        resolve({ ok: false, errorCode: 'NATIVE_BRIDGE_NOT_AVAILABLE' });
      }, timeoutMs);
      pending.set(requestId, { resolve, timer });
      try {
        current.socket.write(encodeLine({ kind: 'bridge.request', requestId, message: verdict.message }));
      } catch {
        pending.delete(requestId);
        clearTimeout(timer);
        resolve({ ok: false, errorCode: 'NATIVE_BRIDGE_NOT_AVAILABLE' });
      }
    });
  }

  function close() {
    for (const [, entry] of pending) {
      clearTimeout(entry.timer);
      entry.resolve({ ok: false, errorCode: 'NATIVE_BRIDGE_NOT_AVAILABLE' });
    }
    pending.clear();
    try {
      if (current) current.socket.destroy();
    } catch {
      // ignore
    }
    server.close();
    // 세션 파일은 **이 relay 가 쓴 것일 때만** 지운다 — 같은 PC 의 다른 agent 프로세스(예: 검증용 relay 와
    // 폴링 agent 가 함께 떠 있는 경우)가 쓴 파일을 지우면 그쪽 DOM 축이 조용히 끊긴다.
    try {
      const current = loadBridgeSession();
      if (current && current.token === token) fs.unlinkSync(bridgeSessionPath());
    } catch {
      // 이미 없음
    }
  }

  return { dispatch, isExtensionConnected, close, pipe };
}

// ─── relay client (native host 쪽) ──────────────────────────────────────────

/**
 * host 가 relay 에 붙는다. 세션 파일이 없거나(agent 미실행) 연결 실패면 `connected:false` 로 끝난다 —
 * 그래도 host 는 hello/status 를 계속 서비스한다.
 *
 * @param {{ onRequest: (message) => void, onClose?: () => void, extensionConnected?: boolean }} handlers
 */
export function connectBridgeRelay(handlers) {
  const session = loadBridgeSession();
  if (!session) return { connected: false, respond: () => false, setExtensionState: () => {}, end: () => {} };

  let acc = '';
  let alive = false;
  const socket = net.createConnection(session.pipe);
  socket.setEncoding('utf8');
  socket.on('connect', () => {
    alive = true;
    socket.write(encodeLine({ kind: 'host.hello', token: session.token, extensionConnected: handlers.extensionConnected === true }));
  });
  socket.on('data', (chunk) => {
    acc += chunk;
    const { messages, rest } = drainLines(acc);
    acc = rest;
    for (const frame of messages) {
      if (!frame || typeof frame !== 'object') continue;
      if (frame.kind === 'bridge.request' && typeof frame.requestId === 'string') {
        const verdict = validateBridgeMessage(frame.message);
        if (!verdict.ok) continue; // allowlist 밖은 확장으로 가지 않는다
        handlers.onRequest(verdict.message);
      }
    }
  });
  socket.on('close', () => {
    alive = false;
    if (handlers.onClose) handlers.onClose();
  });
  socket.on('error', () => {
    alive = false;
  });

  return {
    get connected() {
      return alive;
    },
    respond(message) {
      if (!alive) return false;
      try {
        socket.write(encodeLine({ kind: 'bridge.response', requestId: message.requestId, message }));
        return true;
      } catch {
        return false;
      }
    },
    setExtensionState(connected) {
      if (!alive) return;
      try {
        socket.write(encodeLine({ kind: 'extension.state', connected: connected === true }));
      } catch {
        // ignore
      }
    },
    end() {
      try {
        socket.end();
      } catch {
        // ignore
      }
    },
  };
}
