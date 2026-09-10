/**
 * Windows App Registry — agent 쪽 사본
 *
 * WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 §10·§24
 *
 * 서버(`apps/api-server/src/services/local-agent/windows-app-registry.ts`)와 **같은 목록**이다.
 * 일부러 복제한다 — 이중 allowlist 의 agent 쪽 절반이기 때문이다. 서버가 (버그로든
 * 변조로든) 등재되지 않은 appId 를 보내도 agent 가 여기서 다시 거절한다.
 *
 * 두 목록이 어긋나면 서버 테스트가 실패한다(양쪽 파일을 함께 읽어 비교한다).
 */

export const WINDOWS_APP_REGISTRY = Object.freeze([
  Object.freeze({
    appId: 'windows.notepad',
    displayName: '메모장',
    processNames: Object.freeze(['notepad']),
  }),
  Object.freeze({
    appId: 'windows.calculator',
    displayName: '계산기',
    processNames: Object.freeze(['CalculatorApp', 'Calculator', 'win32calc']),
  }),
]);

export function findWindowsApp(appId) {
  return WINDOWS_APP_REGISTRY.find((a) => a.appId === appId);
}

export function listWindowsAppIds() {
  return WINDOWS_APP_REGISTRY.map((a) => a.appId);
}
