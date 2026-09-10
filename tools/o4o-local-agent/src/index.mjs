/**
 * O4O Local Work Agent — 진입점 (§8)
 *
 * WO-O4O-LOCAL-WORK-AGENT-V0
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 생명주기
 *
 *   pair  — 1회용 코드로 device 등록 → 자격증명 저장 → 종료
 *   run   — 세션 열기 → (heartbeat + 명령 수령 → 실행 → 결과 제출) 반복
 *
 * GUI 가 없다. 백그라운드 프로세스 하나면 V0 의 목적(연결·인증·명령·허용목록·왕복)에
 * 충분하고, 창을 띄우는 순간 "무엇을 보여줄 것인가" 라는 별개의 설계가 따라온다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 방향 (§16)
 *
 * 이 프로세스는 **서버에 접속할 뿐, 접속을 받지 않는다.** listen 하는 포트가 없다.
 * 공유기 설정 · 방화벽 인바운드 규칙 · 공인 IP 가 필요 없는 이유다.
 */

import { runAction, listAllowedActions, AGENT_VERSION, ACTIONS } from './handlers.mjs';
import { loadCredentials, saveCredentials, credentialsLocation } from './credentials.mjs';

const API_BASE = process.env.O4O_API_BASE || 'https://api.neture.co.kr';
/** 명령을 물어보러 가는 주기. 짧으면 반응이 빠르고, 길면 조용하다. */
const POLL_INTERVAL_MS = 5000;
/** 연결이 끊겼을 때의 재시도 간격 (§32). 지수 백오프로 늘어난다. */
const RECONNECT_MIN_MS = 3000;
const RECONNECT_MAX_MS = 60000;
/**
 * 재시도해도 나아지지 않는 거절 사유. 사람이 다시 pair 해야 한다.
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

// ─── pair ────────────────────────────────────────────────────────────────────

async function commandPair(code) {
  if (!code) {
    console.error('사용법: node src/index.mjs pair --code ABCDE-FGHIJ');
    process.exitCode = 1;
    return;
  }

  const { status, payload } = await apiPost('/api/local-agent/register', {
    code,
    // hostname 을 보내지 않는다. 표시 이름은 사람이 알아볼 수 있으면 충분하고,
    // 실제 PC 이름은 서버가 알 필요가 없다 (§10 · §21).
    deviceName: process.env.O4O_AGENT_DEVICE_NAME || '내 PC',
    platform: 'windows',
    agentVersion: AGENT_VERSION,
  });

  if (status !== 200 || !payload?.success) {
    console.error(`연결 실패 (${payload?.code ?? status}). 코드가 만료되었거나 이미 사용되었습니다.`);
    process.exitCode = 1;
    return;
  }

  const file = saveCredentials({
    deviceId: payload.data.deviceId,
    agentCredential: payload.data.agentCredential,
  });
  // 자격증명 값 자체는 출력하지 않는다 (§51 secret 출력 금지). 경로만 알려준다.
  log(`연결 완료. 자격증명 저장 위치: ${file}`);
  log('이제 `node src/index.mjs run` 으로 실행하세요.');
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
  const creds = loadCredentials();
  if (!creds) {
    console.error(`연결된 기기가 아닙니다. 먼저 pair 를 실행하세요. (${credentialsLocation()})`);
    process.exitCode = 1;
    return;
  }

  log(`시작. 허용된 action: ${listAllowedActions().join(', ')}`);
  log(`API: ${API_BASE}`);

  const context = { deviceName: process.env.O4O_AGENT_DEVICE_NAME || '내 PC' };
  let sessionToken = null;
  let backoff = RECONNECT_MIN_MS;
  let running = true;

  const stop = () => {
    if (!running) return;
    running = false;
    log('종료합니다.');
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  while (running) {
    if (!sessionToken) {
      const session = await openSession(creds);
      if (!session.ok) {
        // BAD_CREDENTIAL / DEVICE_REVOKED 는 기다려도 낫지 않는다 — 사람이 다시 연결해야 한다.
        if (FATAL_CONNECT_CODES.has(session.code)) {
          console.error(`이 기기의 연결이 해지되었습니다 (${session.code}). 다시 pair 하세요.`);
          process.exitCode = 1;
          return;
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

function parseArgs(argv) {
  const out = { command: argv[0] ?? 'run' };
  for (let i = 1; i < argv.length; i += 1) {
    if (argv[i] === '--code') out.code = argv[i + 1];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === 'pair') {
    await commandPair(args.code);
    return;
  }
  if (args.command === 'run') {
    await commandRun();
    return;
  }
  console.error('사용법: node src/index.mjs [pair --code <코드> | run]');
  process.exitCode = 1;
}

main().catch((error) => {
  // 예외 메시지는 로컬 콘솔에만 남는다. cloud 로 올라가지 않는다.
  console.error(`[o4o-agent] 예기치 못한 오류: ${error?.message ?? error}`);
  process.exitCode = 1;
});

export { ACTIONS };
