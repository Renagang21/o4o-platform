/**
 * Local Work Agent — 자격증명 저장 (§13)
 *
 * WO-O4O-LOCAL-WORK-AGENT-V0
 *
 * 이 파일이 저장소 전체에서 `fs` 를 쓰는 **유일한** 곳이고, 다루는 경로도 하나뿐이다:
 * agent 자신의 `credentials.json`. handler 쪽에는 이 모듈이 전달되지 않으므로
 * 서버가 무엇을 요청하든 임의 경로를 읽어 올려보낼 방법이 없다.
 *
 * 저장하는 것: `deviceId` 와 이 PC 전용 `agentCredential`.
 * 저장하지 않는 것: 사용자 비밀번호 · JWT · refresh token · 브라우저 쿠키 —
 * agent 는 애초에 그것들을 받은 적이 없다.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function agentHome() {
  if (process.env.O4O_AGENT_HOME) return process.env.O4O_AGENT_HOME;
  const base =
    process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(base, 'o4o-local-agent');
}

function credentialsPath() {
  return path.join(agentHome(), 'credentials.json');
}

export function loadCredentials() {
  try {
    const raw = fs.readFileSync(credentialsPath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed?.deviceId || !parsed?.agentCredential) return null;
    return parsed;
  } catch {
    // 없거나 깨졌으면 "연결 안 됨" 이다. 여기서 예외를 올려 프로세스를 죽일 이유가 없다.
    return null;
  }
}

export function saveCredentials(creds) {
  const dir = agentHome();
  fs.mkdirSync(dir, { recursive: true });
  const file = credentialsPath();
  // 0o600 — 이 사용자만 읽을 수 있게. Windows 에서는 ACL 이 우선하지만,
  // 명시해 두는 편이 의도를 남긴다.
  fs.writeFileSync(file, JSON.stringify(creds, null, 2), { encoding: 'utf8', mode: 0o600 });
  return file;
}

export function credentialsLocation() {
  return credentialsPath();
}
