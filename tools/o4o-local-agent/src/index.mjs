/**
 * O4O Local Work Agent — 진입점
 *
 * WO-O4O-LOCAL-WORK-AGENT-V0 · WO-O4O-LOCAL-WORK-AGENT-ONECLICK-PAIRING-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 생명주기
 *
 *   run — loopback 창구를 열고, 연결되어 있으면 곧바로 폴링을 시작한다.
 *         아직 연결 전이면 브라우저의 [이 PC 연결] 을 기다린다.
 *
 * 하위 명령이 `run` 하나다. V0 에 있던 `pair --code` 는 사라졌다 — 사용자가 코드를
 * 옮겨 적는 단계가 없어졌으므로, 그 단계를 위한 명령도 존재할 이유가 없다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 방향
 *
 * 업무 통신은 여전히 **전부 agent → cloud 방향이다.** 명령을 받으러 가는 것도, 결과를
 * 돌려주는 것도 이쪽에서 건다. cloud 가 이 PC 에 접속하는 경로는 없다.
 *
 * 새로 생긴 listen 소켓은 업무 통신용이 아니라 **같은 PC 의 브라우저 전용**이며
 * 127.0.0.1 에만 묶인다(ONECLICK §4). 외부 네트워크에서는 이 포트가 보이지 않는다.
 */

import { runAction, listAllowedActions, AGENT_VERSION, ACTIONS } from './handlers.mjs';
import { loadCredentials, saveCredentials, credentialsLocation } from './credentials.mjs';
import { startLocalServer, LOCAL_AGENT_PORT } from './local-server.mjs';

const API_BASE = process.env.O4O_API_BASE || 'https://api.neture.co.kr';
/** 명령을 물어보러 가는 주기. 짧으면 반응이 빠르고, 길면 조용하다. */
const POLL_INTERVAL_MS = 5000;
/** 연결이 끊겼을 때의 재시도 간격 (§32). 지수 백오프로 늘어난다. */
const RECONNECT_MIN_MS = 3000;
const RECONNECT_MAX_MS = 60000;
/** 아직 연결 전일 때 브라우저를 기다리는 간격. */
const PAIRING_WAIT_MS = 1000;
/**
 * 재시도해도 나아지지 않는 거절 사유. 사람이 다시 [이 PC 연결] 을 눌러야 한다.
 * 나머지(네트워크 · 5xx)는 기다리면 회복될 수 있으므로 백오프로 재시도한다.
 */
const FATAL_CONNECT_CODES = new Set(['BAD_CREDENTIAL', 'DEVICE_REVOKED', 'DEVICE_NOT_FOUND']);

function log(message, extra) {
  const line = `[o4o-agent] ${new Date().toISOString()} ${message}`;
  if (extra === undefined) console.log(line);
  else console.log(line, extra);
}

/**
 * 네트워크 오류는 예외가 아니라 `status: 0` 으로 돌려준다.
 *
 * 노트북 뚜껑을 닫았다 열거나 Wi-Fi 가 잠깐 끊기는 것은 이 프로그램의 일상이다.
 * 그때마다 프로세스가 죽으면 사용자가 다시 켜야 하는데, 그건 §32 가 요구하는
 * "자동 재연결" 이 아니다. 호출자가 백오프로 재시도할 수 있게 값으로 되돌린다.
 */
async function apiPost(pathname, body, sessionToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  let res;
  try {
    res = await fetch(`${API_BASE}${pathname}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    return { status: 0, payload: null };
  }
  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  return { status: res.status, payload };
}

// ─── one-click pairing ───────────────────────────────────────────────────────

/**
 * 브라우저가 건네준 승인권을 서버에 제출한다 (ONECLICK §6-4).
 *
 * 이미 연결된 PC 라면 이미 가지고 있는 credential 을 **증명으로** 함께 보낸다.
 * 서버가 그것을 대조해 같은 사용자임을 확인하면 `already_connected` 로 조용히 끝난다 —
 * 같은 PC 가 device 목록에 두 번 쌓이지 않는다 (§15).
 */
async function submitPairingGrant(grant, state) {
  const { status, payload } = await apiPost('/api/local-agent/pair', {
    grant,
    // hostname 을 보내지 않는다. 표시 이름은 사람이 알아볼 수 있으면 충분하고,
    // 실제 PC 이름은 서버가 알 필요가 없다 (V0 §10 · §21).
    deviceName: process.env.O4O_AGENT_DEVICE_NAME || '내 PC',
    platform: 'windows',
    agentVersion: AGENT_VERSION,
    deviceId: state.creds?.deviceId,
    agentCredential: state.creds?.agentCredential,
  });

  if (status !== 200 || !payload?.success) {
    return { ok: false, code: payload?.code ?? String(status) };
  }

  const data = payload.data ?? {};
  if (data.status === 'already_connected') {
    log('이미 이 계정에 연결된 PC 입니다.');
    return { ok: true, status: data.status };
  }

  state.creds = { deviceId: data.deviceId, agentCredential: data.agentCredential };
  // 자격증명 값 자체는 출력하지 않는다 (§28 secret 출력 금지). 경로만 알려준다.
  const file = saveCredentials(state.creds);
  log(`이 PC 가 연결되었습니다. 자격증명 저장 위치: ${file}`);
  return { ok: true, status: data.status ?? 'connected' };
}

// ─── run ─────────────────────────────────────────────────────────────────────

async function openSession(creds) {
  const { status, payload } = await apiPost('/api/local-agent/connect', {
    deviceId: creds.deviceId,
    agentCredential: creds.agentCredential,
  });
  if (status !== 200 || !payload?.success) {
    return { ok: false, code: payload?.code ?? String(status) };
  }
  return { ok: true, sessionToken: payload.data.sessionToken };
}

/**
 * 명령 하나를 처리한다.
 *
 * 만료 확인을 **실행 전에** 한다(§18). 서버도 만료를 검사하지만, 늦게 도착한 명령을
 * 굳이 실행한 뒤에 버리는 것보다 아예 실행하지 않는 편이 낫다.
 */
async function handleCommand(command, context, sessionToken) {
  if (new Date(command.expiresAt).getTime() < Date.now()) {
    log(`만료된 명령 무시: ${command.action}`);
    await apiPost(
      '/api/local-agent/result',
      { commandId: command.commandId, status: 'expired', errorCode: 'LOCAL_COMMAND_EXPIRED' },
      sessionToken,
    );
    return;
  }

  const outcome = runAction(command.action, context);
  if (outcome.status === 'denied') {
    // 서버가 모르는 action 을 보냈다. 실행하지 않았다는 사실을 분명히 되돌린다.
    log(`허용되지 않은 action 거부: ${command.action}`);
  }

  await apiPost(
    '/api/local-agent/result',
    {
      commandId: command.commandId,
      status: outcome.status,
      data: outcome.data,
      errorCode: outcome.errorCode,
    },
    sessionToken,
  );
}

async function commandRun() {
  const state = { creds: loadCredentials() };

  log(`시작. 허용된 action: ${listAllowedActions().join(', ')}`);
  log(`API: ${API_BASE}`);
  log(`자격증명 위치: ${credentialsLocation()}`);

  await startLocalServer({
    agentVersion: AGENT_VERSION,
    isConnected: () => Boolean(state.creds),
    onPair: (grant) => submitPairingGrant(grant, state),
    log,
  });

  if (!state.creds) {
    log('아직 연결되지 않았습니다. O4O 웹에서 [이 PC 연결] 을 눌러 주세요.');
  }

  const context = { deviceName: process.env.O4O_AGENT_DEVICE_NAME || '내 PC' };
  let sessionToken = null;
  let backoff = RECONNECT_MIN_MS;
  let running = true;

  const stop = () => {
    if (!running) return;
    running = false;
    log('종료합니다.');
    // 창구도 함께 닫는다. listen 소켓이 남으면 프로세스가 끝나지 않는다.
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  while (running) {
    if (!state.creds) {
      // 브라우저의 [이 PC 연결] 을 기다린다. 여기서는 서버에 아무것도 묻지 않는다 —
      // 연결되지 않은 PC 가 cloud 를 두드릴 이유가 없다.
      await sleep(PAIRING_WAIT_MS);
      continue;
    }

    if (!sessionToken) {
      const session = await openSession(state.creds);
      if (!session.ok) {
        // BAD_CREDENTIAL / DEVICE_REVOKED 는 기다려도 낫지 않는다 — 다시 연결해야 한다.
        if (FATAL_CONNECT_CODES.has(session.code)) {
          log(`이 기기의 연결이 해지되었습니다 (${session.code}). 다시 [이 PC 연결] 을 눌러 주세요.`);
          state.creds = null;
          continue;
        }
        log(`연결 실패(${session.code}). ${Math.round(backoff / 1000)}초 후 재시도합니다.`);
        await sleep(backoff);
        backoff = Math.min(backoff * 2, RECONNECT_MAX_MS);
        continue;
      }
      sessionToken = session.sessionToken;
      backoff = RECONNECT_MIN_MS;
      log('연결되었습니다.');
    }

    const { status, payload } = await apiPost('/api/local-agent/heartbeat', {}, sessionToken);

    if (status === 401) {
      // 세션 만료 또는 해지. credential 로 조용히 다시 연다 — 사용자 개입 없이.
      log('세션이 만료되어 재연결합니다.');
      sessionToken = null;
      continue;
    }
    if (status !== 200 || !payload?.success) {
      log(`통신 실패(${status}). ${Math.round(backoff / 1000)}초 후 재시도합니다.`);
      await sleep(backoff);
      backoff = Math.min(backoff * 2, RECONNECT_MAX_MS);
      continue;
    }

    backoff = RECONNECT_MIN_MS;
    const commands = payload.data?.commands ?? [];
    for (const command of commands) {
      await handleCommand(command, context, sessionToken);
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2] ?? 'run';
  if (command === 'run') {
    await commandRun();
    return;
  }
  console.error('사용법: node src/index.mjs run');
  process.exitCode = 1;
}

main().catch((error) => {
  // 예외 메시지는 로컬 콘솔에만 남는다. cloud 로 올라가지 않는다.
  console.error(`[o4o-agent] 예기치 못한 오류: ${error?.message ?? error}`);
  process.exitCode = 1;
});

export { ACTIONS, LOCAL_AGENT_PORT };
