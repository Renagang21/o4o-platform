/**
 * Native Bridge Client — 확장 ↔ Native Host 연결 (§23·§24·§28·§30·§53)
 *
 * WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0
 *
 * 확장이 chrome.runtime.connectNative() 로 native host 에 붙는 유일한 지점이다.
 * host 는 stdio 로 length-prefixed JSON 을 주고받는다(Chrome 이 처리). 이 클라이언트는:
 *   - 보낼 봉투를 message-contract 로 검증한 뒤에만 보낸다(발신 측 방어).
 *   - 받은 봉투도 다시 검증한다(수신 측 방어). 둘 다 통과해야 handler 로 넘어간다.
 *   - requestId 로 요청↔응답을 맞춘다.
 *
 * 이 파일은 chrome.* 를 쓰므로 node:test 가 import 하지 않는다 — 순수 계약은
 * message-contract.js 에만 있고 여기서는 그것을 재사용한다.
 */

import {
  BRIDGE_PROTOCOL_VERSION,
  NATIVE_BRIDGE_ERROR,
  buildBridgeMessage,
  validateBridgeMessage,
  newRequestId,
} from './message-contract.js';

/**
 * Native Messaging host 이름. native host 매니페스트의 "name" 및 Windows 레지스트리
 * 키 이름과 **정확히 일치**해야 한다(§25). agent 쪽 native-host 매니페스트 템플릿과
 * 설치 스크립트가 같은 값을 쓴다.
 */
export const NATIVE_HOST_NAME = 'com.neture.o4o_agent_bridge';

const RESPONSE_TIMEOUT_MS = 10000;

export class NativeBridgeClient {
  constructor({ hostName = NATIVE_HOST_NAME } = {}) {
    this.hostName = hostName;
    this.port = null;
    this.connected = false;
    this.pending = new Map(); // requestId -> {resolve, timer}
  }

  /** host 에 연결한다. 실패하면 BRIDGE_NOT_AVAILABLE 로 정규화한다(§54). */
  connect() {
    if (this.connected) return { ok: true };
    try {
      this.port = chrome.runtime.connectNative(this.hostName);
    } catch {
      return { ok: false, errorCode: NATIVE_BRIDGE_ERROR.BRIDGE_NOT_AVAILABLE };
    }
    this.port.onMessage.addListener((raw) => this._onMessage(raw));
    this.port.onDisconnect.addListener(() => this._onDisconnect());
    this.connected = true;
    return { ok: true };
  }

  _onDisconnect() {
    this.connected = false;
    this.port = null;
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.resolve({ ok: false, errorCode: NATIVE_BRIDGE_ERROR.BRIDGE_NOT_AVAILABLE });
    }
    this.pending.clear();
  }

  _onMessage(raw) {
    const verdict = validateBridgeMessage(raw);
    if (verdict.ok === false) {
      // 봉투가 계약을 어기면 조용히 버린다 — 실행하지 않는다(§29).
      return;
    }
    const entry = this.pending.get(verdict.message.requestId);
    if (!entry) return; // 짝 없는 응답 — 무시
    clearTimeout(entry.timer);
    this.pending.delete(verdict.message.requestId);
    entry.resolve({ ok: true, message: verdict.message });
  }

  /**
   * 봉투 하나를 보내고 응답을 기다린다. type 은 allowlist 에 있어야 하고,
   * 그렇지 않으면 여기서 BAD_MESSAGE 로 막혀 host 까지 가지 않는다(§29).
   */
  request(type, payload) {
    const built = buildBridgeMessage(type, payload, newRequestId());
    if (built.ok === false) {
      return Promise.resolve({ ok: false, errorCode: built.errorCode });
    }
    const conn = this.connect();
    if (conn.ok === false) return Promise.resolve(conn);

    return new Promise((resolve) => {
      const { requestId } = built.message;
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        resolve({ ok: false, errorCode: NATIVE_BRIDGE_ERROR.BRIDGE_NOT_AVAILABLE });
      }, RESPONSE_TIMEOUT_MS);
      this.pending.set(requestId, { resolve, timer });
      try {
        this.port.postMessage(built.message);
      } catch {
        clearTimeout(timer);
        this.pending.delete(requestId);
        resolve({ ok: false, errorCode: NATIVE_BRIDGE_ERROR.BRIDGE_NOT_AVAILABLE });
      }
    });
  }

  /** handshake (§30). 민감정보 없이 버전만 교환한다. */
  hello({ extensionVersion, browserVersion }) {
    return this.request('extension.hello', {
      extensionVersion,
      browserVersion,
      bridgeProtocolVersion: BRIDGE_PROTOCOL_VERSION,
    });
  }

  disconnect() {
    if (this.port) {
      try {
        this.port.disconnect();
      } catch {
        // already gone
      }
    }
    this._onDisconnect();
  }
}
