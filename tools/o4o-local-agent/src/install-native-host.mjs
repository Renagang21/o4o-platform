/**
 * Native Messaging Host 등록 (Windows, 관리자 권한 불요) — §25·§26·§51·§66
 *
 * WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * §66 STOP 조사 결과 (착수 전 확인 완료): **관리자 권한 없이 가능하다.**
 *
 * Chrome 은 native host 매니페스트를 두 곳에서 찾는다:
 *   - HKCU\SOFTWARE\Google\Chrome\NativeMessagingHosts\<name>   ← per-user, 관리자 불요
 *   - HKLM\...                                                   ← 전 사용자, 관리자 필요
 * 이 스크립트는 **HKCU 만** 쓴다. `reg add HKCU\...` 는 표준 사용자 권한으로 성공한다.
 * 따라서 §66 의 "Native Messaging host 등록에 관리자 권한이 필요하면 STOP" 조건에
 * 걸리지 않는다. (매니페스트·launcher 도 사용자 소유 %LOCALAPPDATA% 아래에만 쓴다.)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇을 하지 않는가
 *
 * - HKLM 을 건드리지 않는다(관리자 필요·전 사용자 영향).
 * - Chrome 정책(policy)·확장 강제설치를 만지지 않는다(§4).
 * - agent 코드·자격증명을 수정하지 않는다.
 * - `--dry-run` 이면 레지스트리·파일을 쓰지 않고 계획만 출력한다.
 *
 * 사용:
 *   node src/install-native-host.mjs            # 설치(HKCU 등록)
 *   node src/install-native-host.mjs --dry-run  # 계획만 출력
 *   node src/install-native-host.mjs --uninstall
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NATIVE_HOST_NAME, ALLOWED_EXTENSION_ID } from './native-host.mjs';

const REGISTRY_KEY = `HKCU\\SOFTWARE\\Google\\Chrome\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`;

function agentHome() {
  if (process.env.O4O_AGENT_HOME) return process.env.O4O_AGENT_HOME;
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(base, 'o4o-local-agent');
}

/** 이 파일과 같은 디렉터리의 native-host.mjs 절대 경로. */
function hostScriptPath() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, 'native-host.mjs');
}

/** 매니페스트 객체(§25). allowed_origins = 확장 ID 하나, 와일드카드 없음. */
export function buildHostManifest(launcherPath) {
  return {
    name: NATIVE_HOST_NAME,
    description: 'O4O Local Work Agent — Chrome Native Messaging bridge',
    path: launcherPath,
    type: 'stdio',
    allowed_origins: [`chrome-extension://${ALLOWED_EXTENSION_ID}/`],
  };
}

/**
 * launcher .bat 내용. Chrome 은 매니페스트 path 를 직접 실행하므로, node 로 .mjs 를
 * 돌리려면 .bat 가 필요하다. %* 로 Chrome 이 붙이는 origin 인자를 그대로 전달한다.
 */
function launcherBatContents(nodeExe, scriptPath) {
  return `@echo off\r\n"${nodeExe}" "${scriptPath}" %*\r\n`;
}

function plan() {
  const home = agentHome();
  const script = hostScriptPath();
  const launcher = path.join(home, 'o4o-native-host.bat');
  const manifestPath = path.join(home, `${NATIVE_HOST_NAME}.json`);
  const manifest = buildHostManifest(launcher);
  return { home, script, launcher, manifestPath, manifest, nodeExe: process.execPath };
}

function install({ dryRun }) {
  const p = plan();
  console.log('[install-native-host] 계획:');
  console.log('  registry key :', REGISTRY_KEY);
  console.log('  manifest     :', p.manifestPath);
  console.log('  launcher     :', p.launcher);
  console.log('  host script  :', p.script);
  console.log('  allowed_origins:', JSON.stringify(p.manifest.allowed_origins));
  if (dryRun) {
    console.log('[install-native-host] --dry-run: 아무 것도 쓰지 않음.');
    return;
  }
  fs.mkdirSync(p.home, { recursive: true });
  fs.writeFileSync(p.launcher, launcherBatContents(p.nodeExe, p.script), 'utf8');
  fs.writeFileSync(p.manifestPath, JSON.stringify(p.manifest, null, 2), 'utf8');
  // HKCU 기본값 = 매니페스트 절대 경로. /f 로 덮어쓰기(재설치 안전).
  execFileSync('reg', ['add', REGISTRY_KEY, '/ve', '/t', 'REG_SZ', '/d', p.manifestPath, '/f'], {
    stdio: 'inherit',
  });
  console.log('[install-native-host] 완료 (HKCU, 관리자 권한 불요).');
}

function uninstall({ dryRun }) {
  console.log('[install-native-host] 제거 계획: delete', REGISTRY_KEY);
  if (dryRun) {
    console.log('[install-native-host] --dry-run: 아무 것도 지우지 않음.');
    return;
  }
  try {
    execFileSync('reg', ['delete', REGISTRY_KEY, '/f'], { stdio: 'inherit' });
  } catch {
    console.log('[install-native-host] 레지스트리 키 없음(이미 제거됨).');
  }
  console.log('[install-native-host] 제거 완료. (매니페스트·launcher 파일은 남겨 둠 — 필요 시 수동 삭제)');
}

/** 직접 실행일 때만 CLI 로 동작한다. 테스트가 import 해도 레지스트리·파일을 건드리지 않는다. */
function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return entry.endsWith('install-native-host.mjs');
}

if (isDirectRun()) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  if (args.includes('--uninstall')) {
    uninstall({ dryRun });
  } else {
    install({ dryRun });
  }
}
