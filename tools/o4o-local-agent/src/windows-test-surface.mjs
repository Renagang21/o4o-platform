/**
 * Windows UIA Canonical Test Surface — 개발/검증용 대상 정의 (WO-O4O-WINDOWS-UIA-CANONICAL-TEST-SURFACE-V0)
 *
 * 무엇인가
 *   O4O 가 UIA 노출을 스스로 정하는 WinForms 계측 창(`windows-test-surface.ps1`)을 **개발 대상**으로 등재한다. 공통 자동화층
 *   (UIA V0 · Safety V1 · Takeover · Target Discovery)의 회귀는 외부 앱이 아니라 이 창에서 돈다. 제품 기능이 아니다.
 *
 * 격리(§4 · §59)
 *   - 서버 등재부(`windows-app-registry.ts`)에 없다 → 서버 · AI · production Work Agent 가 이 appId 를 고르거나 명령할 수 없다.
 *   - agent 등재부(`windows-app-registry.mjs`)의 production 목록에도 없다. `findWindowsApp` 은 **`O4O_DEV_TARGETS=1`** 인 프로세스에서만
 *     이 항목을 돌려준다 — `node src/index.mjs test-surface` 와 회귀 harness 가 자기 프로세스에 그 값을 둔다. 일반 `run` 은 두지 않는다.
 *   - `launchAllowed: false` — 등재 실행 경로(windows-app-launch.ps1)로는 시작할 수 없다(.exe/.lnk 만 받는다). 시작은
 *     `windows-window-control.mjs` 의 `launchTestSurface()`(저장소 상수 스크립트 한 개, argv 상수)뿐이다.
 *
 * process 이름이 `powershell` 이므로 `windowTitlePatterns` 로 이 창(과 모달)만 고른다 — 사용자의 다른 PowerShell 창은 대상이 아니다.
 */

export const TEST_SURFACE_TITLE = 'O4O UIA Test Surface';

export const TEST_SURFACE_TARGET = Object.freeze({
  appId: 'windows.o4o-test-surface',
  displayName: 'O4O UIA 시험 창',
  aliases: Object.freeze([]),
  processNames: Object.freeze(['powershell']),
  windowTitlePatterns: Object.freeze([TEST_SURFACE_TITLE.toLowerCase()]),
  launchAllowed: false,
  devOnly: true,
  // 실측(이 창은 우리가 정의): ENTER(입력창) = 전송(AcceptButton) · ESC = 모달 닫기. 위험 키 없음 — 외부 부작용이 없는 창이다.
  interactionProfile: Object.freeze({ submitKeys: Object.freeze(['ENTER']), newlineKeys: Object.freeze([]), cancelKeys: Object.freeze(['ESC']), riskyKeys: Object.freeze([]) }),
  // 노출: 창 · 입력창 · 버튼 · 목록(항목) · 체크박스 · 콤보 · 탭 · 모달. 미노출: CustomRows 의 행(직접 그림 — 컨테이너만 List 로 보인다).
  uiaVisibilityHints: Object.freeze({ exposed: Object.freeze(['window', 'text_input', 'button', 'list_items', 'checkbox', 'combo', 'tabs', 'modal']), hidden: Object.freeze(['custom_rows']) }),
});

/** 개발 대상은 이 프로세스가 명시적으로 켰을 때만 존재한다. */
export function devTargetsEnabled() {
  return process.env.O4O_DEV_TARGETS === '1';
}

export function findDevTarget(appId) {
  if (!devTargetsEnabled()) return undefined;
  return appId === TEST_SURFACE_TARGET.appId ? TEST_SURFACE_TARGET : undefined;
}
