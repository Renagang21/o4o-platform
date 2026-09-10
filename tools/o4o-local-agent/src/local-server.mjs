/**
 * Local Work Agent — loopback 승인 창구 (ONECLICK §4·§11·§12·§13)
 *
 * WO-O4O-LOCAL-WORK-AGENT-ONECLICK-PAIRING-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 서버가 존재하는 이유는 단 하나다
 *
 *   같은 PC 의 브라우저가 "이 PC 맞다" 는 사실을 agent 에게 알려 줄 방법이 필요하다.
 *   그 통로가 loopback 이다. 브라우저와 agent 가 같은 기계 위에 있다는 것 자체가
 *   증명이다 — 사용자가 코드를 옮겨 적어 증명할 필요가 없어진다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇을 열지 않는가 (§11)
 *
 *   endpoint 는 `GET /health` 와 `POST /pair` **둘뿐이다.** 명령 실행 · 파일 접근 ·
 *   상태 변경 endpoint 를 브라우저에 노출하지 않는다. 웹페이지가 이 서버로 할 수 있는
 *   일은 "살아 있나?" 와 "이 승인권을 받아라" 두 가지가 전부다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 어디까지 열리는가 (§4·§12·§13)
 *
 *   127.0.0.1 에만 bind 한다. `0.0.0.0` 이 아니므로 같은 공유기 안의 다른 PC 도
 *   접근할 수 없다. 방화벽 인바운드 규칙 · 포트 포워딩 · 공인 IP 어느 것도 필요 없고,
 *   필요해질 수도 없다 — 커널이 외부 패킷을 이 소켓에 전달하지 않는다.
 *
 *   그 위에 4겹을 더 둔다:
 *     1. Origin 허용목록 — wildcard 없음. 목록에 없는 출처는 preflight 부터 거절
 *     2. nonce — `GET /health` 로 받은 1회용 값이 있어야 `POST /pair` 가 성립
 *     3. JSON 강제 — 단순 요청(form post)으로는 도달할 수 없다 → preflight 필수
 *     4. Origin 없는 요청 거절 — 브라우저는 항상 보낸다
 *
 *   cookie 는 받지 않는다. `Access-Control-Allow-Credentials` 를 **일부러 주지 않아서**,
 *   브라우저가 이 요청에 O4O 쿠키를 실을 방법 자체를 없앤다 (§2).
 */

import http from 'node:http';
import { randomUUID } from 'node:crypto';

/** 고정 포트. 브라우저가 발견 없이 곧바로 찾아올 수 있어야 한다 (§4). */
export const LOCAL_AGENT_PORT = 47821;

/**
 * pairing 을 요청할 수 있는 출처 (§13).
 *
 * wildcard 를 쓰지 않는다. 임의의 웹사이트가 이 PC 를 자기 사용자에게 묶는 일을
 * 막는 것이 이 목록의 유일한 목적이다.
 */
const ALLOWED_ORIGINS = new Set([
  'https://neture.co.kr',
  'https://www.neture.co.kr',
  'https://pharmacyhub.co.kr',
  'https://www.pharmacyhub.co.kr',
  'https://kpa-society.co.kr',
  'https://www.kpa-society.co.kr',
  'https://k-cosmetics.site',
  'https://www.k-cosmetics.site',
]);

/** nonce 유효 시간. 버튼을 누르고 왕복하는 데 필요한 시간이면 충분하다. */
const NONCE_TTL_MS = 60 * 1000;
/** 요청 본문 상한. 여기로 오는 것은 짧은 토큰 하나뿐이다. */
const MAX_BODY_BYTES = 4096;

function isAllowedOrigin(origin) {
  return typeof origin === 'string' && ALLOWED_ORIGINS.has(origin);
}

/**
 * 1회용 nonce 보관소.
 *
 * 발급 즉시 유효하고, 한 번 쓰이면 사라지며, 시간이 지나면 스스로 만료한다.
 * 메모리에만 있다 — agent 를 재시작하면 전부 무효가 되는 편이 안전하다.
 */
function createNonceStore() {
  const issued = new Map();

  function issue() {
    const now = Date.now();
    for (const [value, expiresAt] of issued) {
      if (expiresAt < now) issued.delete(value);
    }
    const nonce = randomUUID();
    issued.set(nonce, now + NONCE_TTL_MS);
    return nonce;
  }

  function consume(nonce) {
    const expiresAt = issued.get(nonce);
    if (expiresAt === undefined) return false;
    issued.delete(nonce); // 1회용 — 성공이든 만료든 여기서 사라진다
    return expiresAt >= Date.now();
  }

  return { issue, consume };
}

function sendJson(res, status, payload, origin) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * loopback 서버를 띄운다.
 *
 * @param {object} options
 * @param {string} options.agentVersion
 * @param {() => boolean} options.isConnected  현재 연결 여부 (paired 상태)
 * @param {(grant: string) => Promise<{ ok: boolean, status?: string, code?: string }>} options.onPair
 * @param {(message: string, extra?: unknown) => void} options.log
 */
export function startLocalServer({ agentVersion, isConnected, onPair, log }) {
  const nonces = createNonceStore();

  const server = http.createServer((req, res) => {
    const origin = req.headers.origin;
    const url = (req.url ?? '/').split('?')[0];

    // ── CORS preflight ───────────────────────────────────────────────────────
    if (req.method === 'OPTIONS') {
      if (!isAllowedOrigin(origin)) {
        // 허용목록에 없는 출처는 여기서 끝난다. 브라우저가 본 요청을 보내지 않는다.
        res.writeHead(403).end();
        return;
      }
      const headers = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
      };
      // Chrome 의 Private Network Access — HTTPS 페이지가 loopback 을 부를 때 요구한다.
      if (req.headers['access-control-request-private-network'] === 'true') {
        headers['Access-Control-Allow-Private-Network'] = 'true';
      }
      res.writeHead(204, headers).end();
      return;
    }

    // Origin 이 없는 요청은 브라우저가 보낸 것이 아니다. 이 서버는 브라우저만 상대한다.
    if (!isAllowedOrigin(origin)) {
      sendJson(res, 403, { ok: false, code: 'ORIGIN_NOT_ALLOWED' });
      return;
    }

    if (req.method === 'GET' && url === '/health') {
      sendJson(
        res,
        200,
        {
          ok: true,
          agentVersion,
          // 사용자 이름 · 경로 · IP · 설치 프로그램 목록 등은 담지 않는다 (V0 §21).
          connected: isConnected(),
          nonce: nonces.issue(),
        },
        origin,
      );
      return;
    }

    if (req.method === 'POST' && url === '/pair') {
      handlePair(req, res, origin);
      return;
    }

    sendJson(res, 404, { ok: false, code: 'NOT_FOUND' }, origin);
  });

  async function handlePair(req, res, origin) {
    // JSON 이 아니면 받지 않는다. 단순 요청(form post)으로 도달하는 길을 없앤다.
    const contentType = String(req.headers['content-type'] ?? '');
    if (!contentType.startsWith('application/json')) {
      sendJson(res, 415, { ok: false, code: 'UNSUPPORTED_MEDIA_TYPE' }, origin);
      return;
    }

    const body = await readJsonBody(req);
    if (!body || typeof body.grant !== 'string' || typeof body.nonce !== 'string') {
      sendJson(res, 400, { ok: false, code: 'BAD_REQUEST' }, origin);
      return;
    }
    if (!nonces.consume(body.nonce)) {
      sendJson(res, 403, { ok: false, code: 'BAD_NONCE' }, origin);
      return;
    }

    try {
      const outcome = await onPair(body.grant);
      // grant 값 자체는 어디에도 기록하지 않는다 (§28).
      if (!outcome.ok) {
        sendJson(res, 400, { ok: false, code: outcome.code ?? 'PAIR_FAILED' }, origin);
        return;
      }
      sendJson(res, 200, { ok: true, status: outcome.status }, origin);
    } catch (error) {
      log(`pairing 처리 중 오류: ${error?.message ?? error}`);
      sendJson(res, 500, { ok: false, code: 'AGENT_ERROR' }, origin);
    }
  }

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    // 두 번째 인자가 핵심이다. 이 값을 '0.0.0.0' 으로 바꾸면 LAN 에 열린다 — 바꾸지 않는다.
    server.listen(LOCAL_AGENT_PORT, '127.0.0.1', () => {
      log(`연결 대기 창구 http://127.0.0.1:${LOCAL_AGENT_PORT} (loopback 전용)`);
      resolve(server);
    });
  });
}

export { ALLOWED_ORIGINS };
