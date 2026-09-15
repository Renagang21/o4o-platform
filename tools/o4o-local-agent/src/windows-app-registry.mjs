/**
 * Windows App Registry — agent 쪽 사본
 *
 * WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 §10·§24
 * WO-O4O-WORK-TARGET-DISCOVERY-AND-ACTIVATION-V0 §7·§21~§27·§45 (aliases · launch metadata)
 *
 * 서버(`apps/api-server/src/services/local-agent/windows-app-registry.ts`)와 **같은 앱 목록**이다.
 * 일부러 복제한다 — 이중 allowlist 의 agent 쪽 절반이기 때문이다. 서버가 (버그로든
 * 변조로든) 등재되지 않은 appId 를 보내도 agent 가 여기서 다시 거절한다.
 *
 * 두 목록이 어긋나면 서버 테스트가 실패한다(양쪽 파일을 함께 읽어 비교한다).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * launch metadata 는 **agent 쪽에만** 있다(§45)
 *
 *   실행 파일 경로 · 바로가기 경로는 사용자 PC 의 사실이지 서버가 알 일이 아니다. 서버·AI 는
 *   appId 만 말한다. agent 는 `launch.path` 가 **이 파일의 상수**일 때만, `launchAllowed` 가
 *   true 일 때만 실행한다(§22·§26·§27). AI 가 준 경로 · 인자 · 명령줄이 실행되는 통로는 없다.
 *   실행 자체는 `windows-window-control.mjs`(execFile 단일 지점) → `windows-app-launch.ps1`.
 *
 * 개발 대상(UIA-CANONICAL-TEST-SURFACE-V0)
 *   O4O 계측 창 `windows.o4o-test-surface` 는 이 목록(production · 서버와 동일)에 **없다**. `windows-test-surface.mjs` 가 따로 정의하고,
 *   `O4O_DEV_TARGETS=1` 인 프로세스에서만 `findWindowsApp` 이 돌려준다. 서버 등재부에 없으므로 production 경로가 고를 수 없다.
 */
import { findDevTarget } from './windows-test-surface.mjs';

export const WINDOWS_APP_REGISTRY = Object.freeze([
  Object.freeze({
    appId: 'windows.notepad',
    displayName: '메모장',
    aliases: Object.freeze(['메모장', 'notepad']),
    processNames: Object.freeze(['notepad']),
    // Windows 10/11 공통 경로. 인자 없이 실행한다(§27). 존재하지 않으면 launch 는 실패로 끝나고 사용자에게 넘긴다(§30).
    launch: Object.freeze({ kind: 'executable', path: 'C:\\Windows\\System32\\notepad.exe' }),
    launchAllowed: true,
    // WINDOWS-AUTOMATION-SAFETY-V1 §18: 편집기 — ENTER 는 줄바꿈(제출 아님), ESC 는 취소(대화상자 닫기).
    interactionProfile: Object.freeze({ submitKeys: Object.freeze([]), newlineKeys: Object.freeze(['ENTER']), cancelKeys: Object.freeze(['ESC']), riskyKeys: Object.freeze([]) }),
    uiaVisibilityHints: Object.freeze({ exposed: Object.freeze(['window', 'input', 'menu']), hidden: Object.freeze([]) }),
  }),
  // WINDOWS-UI-AUTOMATION-V0 — 첫 실제 Windows 앱(약국 프로그램 준비 전 대체). UIA 공통층 검증용이지 카카오톡 전용 어댑터가 아니다.
  //   트레이 상주 앱: 실행 중이어도 보이는 창이 없으면 census 에 안 잡힌다 → 등재 실행 파일을 다시 실행하면(단일 인스턴스) 창이 앞으로 온다(실측).
  Object.freeze({
    appId: 'windows.kakaotalk',
    displayName: '카카오톡',
    aliases: Object.freeze(['카카오톡', '카톡', 'kakaotalk', 'kakao talk']),
    processNames: Object.freeze(['KakaoTalk']),
    launch: Object.freeze({ kind: 'executable', path: 'C:\\Program Files\\Kakao\\KakaoTalk\\KakaoTalk.exe' }),
    launchAllowed: true,
    // WINDOWS-AUTOMATION-SAFETY-V1 §18·§19·§22 — 실측(2026-09-13): ENTER=전송 · CTRL+ENTER=줄바꿈 · ESC=대화창 닫힘.
    // UIA 노출: 창 · 검색창(Ctrl+F 뒤) · 입력창(RichEdit). 미노출: 목록 행 · 메시지 목록 · 전송 버튼.
    interactionProfile: Object.freeze({ submitKeys: Object.freeze(['ENTER']), newlineKeys: Object.freeze(['CTRL+ENTER']), cancelKeys: Object.freeze(['ESC']), riskyKeys: Object.freeze(['ESC']) }),
    uiaVisibilityHints: Object.freeze({ exposed: Object.freeze(['window', 'search', 'input']), hidden: Object.freeze(['list_rows', 'message_list', 'send_button']) }),
  }),
  Object.freeze({
    appId: 'windows.calculator',
    displayName: '계산기',
    aliases: Object.freeze(['계산기', 'calculator']),
    processNames: Object.freeze(['CalculatorApp', 'Calculator', 'win32calc']),
    // Store 앱 — 실행 파일 경로가 고정이 아니다. V0 는 실행하지 않는다(§50 launchAllowed=false 예시).
    launchAllowed: false,
  }),
  // WO-O4O-AUTOMATION-RECOVERY-REAL-SMOKE-CLOSURE-V1 — 첫 실제 약국 업무 프로그램 등재(최소).
  //   실측(2026-09-15): Get-Process ProcessName = 'Doctors.메인'(확장자 .exe 제거·내부 점/한글 유지), 창 제목 '닥터스'.
  //   실행 대행 안 함 — launchAllowed:false 이고 launch 경로도 두지 않는다. Doctors 는 사용자가 직접 띄운다.
  //   interactionProfile·uiaVisibilityHints 는 실측 전이라 넣지 않는다(없으면 제출성 키 ENTER/CTRL+ENTER 를 자동 실행하지 않는다 — 보수적 기본).
  Object.freeze({
    appId: 'windows.doctors',
    displayName: 'Doctors',
    aliases: Object.freeze(['닥터스', 'doctors']),
    processNames: Object.freeze(['Doctors.메인']),
    launchAllowed: false,
  }),
]);

export function findWindowsApp(appId) {
  return WINDOWS_APP_REGISTRY.find((a) => a.appId === appId) ?? findDevTarget(appId);
}

export function listWindowsAppIds() {
  return WINDOWS_APP_REGISTRY.map((a) => a.appId);
}
