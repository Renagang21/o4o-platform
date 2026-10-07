/**
 * Execution Node 상태 보고 (Phase D · V2 §11-1)
 *
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-D-EXECUTION-NODE-RUNTIME-STATE-COORDINATION-V1
 *
 * heartbeat 마다 서버에 "이 노드가 지금 무엇을 할 수 있는가" 를 boolean 몇 개로 알린다.
 * 서버는 이것으로 여러 노드 중 하나를 고른다 — 사용자에게 PC 를 고르게 하지 않는다.
 * 값 · 경로 · 화면 · 사용자 정보는 싣지 않는다.
 *
 *   browser            Chrome 확장이 지금 이 에이전트에 붙어 있다
 *   windowsUia         Windows UIA 실행이 가능한 플랫폼이다
 *   localData          로컬 데이터 저장소가 준비됐고 데이터셋이 하나 이상 있다
 *   ownerScopedLedger  노드 원장을 소유 주체별로 나눠 쓴다(local.db v8 이상이 준비됨)
 *   taskUnit           브라우저 작업 단위 실행(`local.browser.dom.run_unit`)을 지금 받을 수 있다 — agent 0.3.0+ · 확장 연결
 *                      (Phase E · WO-O4O-PERSONAL-ASSISTANT-PHASE-E-TASK-UNIT-DISPATCH-V1). 없으면 서버는 단발 명령으로 보낸다.
 */

export const OWNER_SCOPED_LEDGER_MIN_SCHEMA = 8;

export function buildHeartbeatReport({ agentVersion, extensionConnected, platform, dbState, hasLocalData }) {
  const dbReady = !!dbState && dbState.ready === true;
  return {
    agentVersion: String(agentVersion),
    capabilities: {
      browser: extensionConnected === true,
      windowsUia: platform === 'win32',
      localData: dbReady && hasLocalData === true,
      ownerScopedLedger: dbReady && Number(dbState.schemaVersion) >= OWNER_SCOPED_LEDGER_MIN_SCHEMA,
      taskUnit: extensionConnected === true,
    },
  };
}
