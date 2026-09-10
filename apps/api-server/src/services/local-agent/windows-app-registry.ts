/**
 * Windows App Registry — 코드 등재부 (순수)
 *
 * WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0 §8·§9·§10·§11·§30·§31
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 정하는 것
 *
 *   appId  = AI·서버가 주고받는 **유일한 canonical 식별자**
 *   앱 정의 = 그 appId 가 Windows 위에서 무엇으로 보이는가 (process 이름 · 창 제목)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ AI 는 process 이름도 경로도 창 핸들도 만들어낼 수 없다 (§9)
 *
 *   AI 가 넘길 수 있는 값은 `appId` 하나이고, 그 값은 **이 목록에 있어야만** 한다.
 *   목록에 없으면 `WINDOWS_APP_NOT_REGISTERED` 로 끝난다. 즉 "어떤 프로그램을
 *   찾을 수 있는가" 는 모델이 아니라 **이 파일이** 정한다.
 *
 *   processName · executable 이름은 여기(코드)에만 있고, AI 응답에도 서버 로그에도
 *   나가지 않는다(§21·§39).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ DB 등재부를 만들지 않는다 (§31·§38)
 *
 *   앱 목록은 코드 상수다. 테이블도 migration 도 관리 화면도 없다. 등재 행위 자체가
 *   코드 리뷰를 거치는 편이 안전하고, V0 가 검증하려는 것은 등재부 UI 가 아니다.
 */

export interface WindowsAppDefinition {
  /** canonical 식별자. AI·서버·agent 가 이 값만 주고받는다. */
  appId: string;
  /** 사용자에게 읽어줘도 안전한 이름. AI 응답에 나가는 유일한 표시 문자열이다. */
  displayName: string;
  /**
   * 이 앱으로 인정할 process 이름(확장자 없음, 대소문자 무시).
   * **agent 밖으로 나가지 않는다.**
   */
  processNames: string[];
  /**
   * 선택. 같은 process 가 여러 역할의 창을 띄울 때 대상 창을 좁힌다.
   * 여기에 걸린 값도 agent 밖으로 나가지 않는다(창 제목은 §39 미기록 대상).
   */
  windowTitlePatterns?: string[];
}

/**
 * V0 등재 목록 — **테스트 앱 2개뿐**(§11).
 *
 * 실제 약국 프로그램을 지금 넣지 않는다. 이 구조가 특정 프로그램에 의존하지 않는지를
 * 먼저 증명하는 것이 V0 의 목적이고(§30), 등재는 다음 단계에서 이 배열에 항목을
 * 추가하는 것으로 끝나야 한다.
 */
export const WINDOWS_APP_REGISTRY: readonly WindowsAppDefinition[] = Object.freeze([
  Object.freeze({
    appId: 'windows.notepad',
    displayName: '메모장',
    processNames: ['notepad'],
  }) as WindowsAppDefinition,
  Object.freeze({
    appId: 'windows.calculator',
    displayName: '계산기',
    processNames: ['CalculatorApp', 'Calculator', 'win32calc'],
  }) as WindowsAppDefinition,
]);

/** 등재된 appId 목록. allowlist 조립과 테스트에서 쓴다. */
export const WINDOWS_APP_IDS: readonly string[] = Object.freeze(
  WINDOWS_APP_REGISTRY.map((a) => a.appId),
);

export function findWindowsApp(appId: string): WindowsAppDefinition | undefined {
  return WINDOWS_APP_REGISTRY.find((a) => a.appId === appId);
}

export function isRegisteredWindowsApp(appId: unknown): boolean {
  return typeof appId === 'string' && WINDOWS_APP_IDS.includes(appId);
}

/**
 * 사용자·AI 에게 보여줄 이름. 등재되지 않은 값이 들어와도 **원문을 되돌리지 않는다** —
 * 모델이 만들어낸 문자열이 그대로 화면에 찍히는 경로를 만들지 않기 위해서다.
 */
export function windowsAppDisplayName(appId: string): string {
  return findWindowsApp(appId)?.displayName ?? '해당 프로그램';
}
