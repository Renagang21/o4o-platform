/**
 * Workspace Mode — 화면 모드 상태 계산 (§12·§13·§14·§15·§43·§57)
 *
 * WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0
 *
 * 두 모드뿐이다(§15):
 *   - 'split'  = 함께 보기        (§12·§41 — O4O 작업 화면과 대상 site 를 나란히)
 *   - 'focus'  = 작업 화면 크게 보기 (§12·§42 — 대상 site 를 크게)
 *
 * 핵심 불변식(§14): **workspaceMode ≠ workState.** 화면 배치를 바꿔도 진행 중인 작업
 * 상태(어느 tab·세션·작업 단계)는 보존된다. 이 모듈은 화면 모드 전이만 계산하고,
 * 전이 결과에 항상 넘겨받은 workState 를 **그대로** 실어 돌려준다(§43).
 *
 * 순수 함수만 둔다. chrome.windows.* 부작용은 service-worker 가 이 결과를 보고 실행한다.
 * dual-monitor 는 V0 필수 아님(§16) — 여기서 3번째 모드를 만들지 않되, 확장 여지는 남긴다.
 */

import { WORKSPACE_MODES, isSupportedWorkspaceMode, NATIVE_BRIDGE_ERROR } from './message-contract.js';

export { WORKSPACE_MODES, isSupportedWorkspaceMode };

/** V0 기본 모드. 별도 저장 설정 없이 split 로 시작한다(§57 — 영속 선호 불요). */
export const DEFAULT_WORKSPACE_MODE = 'split';

/**
 * 모드 전이를 계산한다. 부작용 없음.
 *
 * @param {object} current  현재 상태 {mode, workState}
 * @param {string} nextMode 요청 모드('split'|'focus')
 * @returns {{ok:true, state:{mode:string, workState:object}, changed:boolean}
 *          | {ok:false, errorCode:string}}
 */
export function transitionWorkspaceMode(current, nextMode) {
  if (!isSupportedWorkspaceMode(nextMode)) {
    return { ok: false, errorCode: NATIVE_BRIDGE_ERROR.WORKSPACE_MODE_UNSUPPORTED };
  }
  const prevMode = current && isSupportedWorkspaceMode(current.mode) ? current.mode : DEFAULT_WORKSPACE_MODE;
  // §14·§43: workState 는 손대지 않고 그대로 보존해 전이 결과에 싣는다.
  const workState = current && current.workState !== undefined ? current.workState : null;
  return {
    ok: true,
    changed: prevMode !== nextMode,
    state: { mode: nextMode, workState },
  };
}

/** 초기 상태 생성. workState 는 호출부가 넘기며, 없으면 null. */
export function initialWorkspaceState(workState = null) {
  return { mode: DEFAULT_WORKSPACE_MODE, workState };
}
