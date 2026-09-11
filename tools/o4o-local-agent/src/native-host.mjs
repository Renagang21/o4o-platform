/**
 * Native Messaging Host — 확장 ↔ agent stdio 종단 (§23·§24·§28·§29·§30·§53)
 *
 * WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * §24 — 별도 상주 프로세스를 새로 만들지 않는다
 *
 * 이 host 는 Chrome 이 확장 연결마다 **짧게 띄우는** stdio 프로세스다. 폴링 agent
 * (`index.mjs`) 와 별개의 장기 프로세스를 새로 세우지 않는다. host 는 agent 의 자격증명
 * 파일 존재 여부만 읽어 "agent 연결됨" 을 판정한다(loadCredentials — 값은 읽지 않는다).
 * 즉 host = agent 상태의 얇은 대변자이지, 중복 실행 엔진이 아니다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇을 하지 않는가 (§29)
 *
 * stdin 으로 들어온 것을 절대 shell·exec·spawn 에 넘기지 않는다. 파일을 읽거나 쓰지 않는다
 * (자격증명 존재 확인 한 번 제외 — 값 미노출). 레지스트리를 쓰지 않는다. 임의 URL 을 열지
 * 않는다. 오직 계약된 4 type 만 dispatch 하고, 그중 V0 이 실제 응답하는 것은 hello·status 다.
 *
 * V0 방향 정리:
 *   - extension.hello / extension.status  = 확장→agent 질의. host 가 응답한다.
 *   - browser.get_context / workspace.set_mode = agent→확장 지시(future). V0 에서는 확장
 *     내부(service worker + chrome.windows)에서 브라우저-로컬로 처리한다. host 로 들어오면
 *     유효하지만 host 가 서비스하지 않으므로 serviced:false 로 정직하게 응답한다.
 */

import process from 'node:process';
import {
  BRIDGE_PROTOCOL_VERSION,
  NATIVE_BRIDGE_MESSAGE_TYPES,
  validateBridgeMessage,
} from './native-bridge-protocol.mjs';
import { loadCredentials } from './credentials.mjs';

/** host 의 버전. 확장 version 과 별개로 관리(§30 handshake 에 실린다). */
export const NATIVE_HOST_VERSION = '0.0.1';

/**
 * Native Messaging host 이름. 확장의 native-bridge-client.js `NATIVE_HOST_NAME`,
 * host 매니페스트 "name", Windows 레지스트리 키 이름이 **모두 이 값과 일치**해야 한다(§25).
 * 세 곳에 복제되어 있고 테스트가 교차 확인한다.
 */
export const NATIVE_HOST_NAME = 'com.neture.o4o_agent_bridge';

/**
 * 이 host 를 신뢰하는 확장 ID. **정확히 하나**만 둔다 — 와일드카드 없음(§25).
 * deterministic manifest key 로 고정된 O4O 확장 ID(scratchpad o4o-ext-identity.json).
 */
export const ALLOWED_EXTENSION_ID = 'lpjfjaabelhajonbiankhmfkbmonhcgc';

/** V0 에서 host 가 실제로 서비스하는 type. 나머지 둘은 브라우저-로컬(§위 방향 정리). */
export const HOST_SERVICED_TYPES = Object.freeze(['extension.hello', 'extension.status']);

/**
 * 순수 dispatcher. 검증된 message 를 받아 응답 봉투를 만든다. 부작용 주입:
 *   deps.hasAgentCredentials() → boolean (agent 연결 여부; 기본은 loadCredentials 존재)
 *
 * 응답도 같은 requestId·유효 봉투 모양을 유지한다(§28). 민감정보 없음(§30).
 *
 * @param {{version:number,requestId:string,type:string,payload:object}} message
 * @param {{hasAgentCredentials?:()=>boolean}} [deps]
 * @returns {{version:number,requestId:string,type:string,payload:object}}
 */
export function handleBridgeMessage(message, deps = {}) {
  const hasAgentCredentials =
    typeof deps.hasAgentCredentials === 'function'
      ? deps.hasAgentCredentials
      : () => loadCredentials() !== null;

  const reply = (payload) => ({
    version: BRIDGE_PROTOCOL_VERSION,
    requestId: message.requestId,
    type: message.type,
    payload,
  });

  switch (message.type) {
    case 'extension.hello':
      // §30: 버전 정보만. 자격증명·토큰·경로 등 민감정보 없음.
      return reply({
        agentVersion: NATIVE_HOST_VERSION,
        bridgeProtocolVersion: BRIDGE_PROTOCOL_VERSION,
        agentConnected: hasAgentCredentials(),
      });
    case 'extension.status':
      return reply({
        agentConnected: hasAgentCredentials(),
        bridgeProtocolVersion: BRIDGE_PROTOCOL_VERSION,
      });
    case 'browser.get_context':
    case 'workspace.set_mode':
      // 유효한 type 이나 V0 host 가 서비스하지 않는다(브라우저-로컬). 정직하게 알린다.
      return reply({ serviced: false, reason: 'BROWSER_LOCAL' });
    default:
      // validateBridgeMessage 를 통과했다면 여기 오지 않는다. 방어적 fallback.
      return reply({ serviced: false });
  }
}

// ── stdio framing (Chrome Native Messaging) ─────────────────────────────────
// 프레임 = 4바이트 little-endian 길이 + UTF-8 JSON. Chrome 이 이 형식을 강제한다.

/** 하나의 JSON 값을 프레임으로 인코딩한다. */
export function encodeFrame(value) {
  const json = Buffer.from(JSON.stringify(value), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  return Buffer.concat([header, json]);
}

/**
 * 버퍼에서 가능한 만큼 프레임을 떼어 낸다. 순수 함수: 남은 버퍼와 파싱된 메시지 배열 반환.
 * @returns {{messages:Array<unknown>, rest:Buffer}}
 */
export function drainFrames(buffer) {
  const messages = [];
  let offset = 0;
  while (buffer.length - offset >= 4) {
    const len = buffer.readUInt32LE(offset);
    if (buffer.length - offset - 4 < len) break; // 프레임 미완성
    const body = buffer.subarray(offset + 4, offset + 4 + len);
    offset += 4 + len;
    try {
      messages.push(JSON.parse(body.toString('utf8')));
    } catch {
      messages.push(null); // 잘못된 JSON — validate 단계에서 BAD_MESSAGE 로 걸린다
    }
  }
  return { messages, rest: buffer.subarray(offset) };
}

/** 실제 stdio 루프. 직접 실행될 때만 돈다(테스트 import 시에는 돌지 않는다). */
function runStdioLoop() {
  let acc = Buffer.alloc(0);
  process.stdin.on('data', (chunk) => {
    acc = Buffer.concat([acc, chunk]);
    const { messages, rest } = drainFrames(acc);
    acc = rest;
    for (const raw of messages) {
      const verdict = validateBridgeMessage(raw);
      if (verdict.ok === false) {
        // 계약 위반은 실행하지 않는다. requestId 를 알 수 있으면 오류 봉투로, 아니면 조용히 폐기.
        if (raw && typeof raw === 'object' && typeof raw.requestId === 'string' && raw.requestId.length <= 128) {
          const errType =
            typeof raw.type === 'string' && NATIVE_BRIDGE_MESSAGE_TYPES.includes(raw.type)
              ? raw.type
              : 'extension.status';
          process.stdout.write(
            encodeFrame({
              version: BRIDGE_PROTOCOL_VERSION,
              requestId: raw.requestId,
              type: errType,
              payload: { ok: false, errorCode: verdict.errorCode },
            }),
          );
        }
        continue;
      }
      const response = handleBridgeMessage(verdict.message);
      process.stdout.write(encodeFrame(response));
    }
  });
  process.stdin.on('end', () => process.exit(0));
}

// import.meta.url 이 실행 진입점과 같을 때만 루프를 돈다.
const isDirectRun = process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isDirectRun || process.argv[1]?.endsWith('native-host.mjs')) {
  runStdioLoop();
}
