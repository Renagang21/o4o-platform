import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Execution Node capability — `local_agent_devices.capabilities` · `capabilities_reported_at`
 *
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-D-EXECUTION-NODE-RUNTIME-STATE-COORDINATION-V1
 * 정본: `docs/baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md` §11-1 (노드는 capability 를 선언하고 Assistant 가 고른다)
 *
 * 왜 필요한가
 *   여러 노드가 online 일 때 "모호하다" 며 멈추던 선택(`resolveTargetDevice` → ambiguous)을
 *   Assistant 의 선택으로 바꾸려면, 서버가 노드마다 무엇을 할 수 있는지 알아야 한다.
 *   에이전트가 heartbeat 로 보고한 capability(브라우저 확장 연결 · Windows UIA · 로컬 데이터 · 소유 주체 원장 지원)를
 *   마지막 값 하나만 둔다 — 이력 테이블이 아니다.
 *
 * NULL = 보고하지 않는 이전 버전 에이전트. 그 노드는 "capability 를 모르는 노드" 로 다룬다(고르되 확인된 노드보다 뒤).
 * 값 · 원문 · 화면 · 경로를 담지 않는다 — boolean 몇 개뿐이다.
 */
export class AddLocalAgentDeviceCapabilities1791177033073 implements MigrationInterface {
  name = 'AddLocalAgentDeviceCapabilities1791177033073';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE local_agent_devices ADD COLUMN capabilities jsonb`);
    await q.query(`ALTER TABLE local_agent_devices ADD COLUMN capabilities_reported_at timestamp with time zone`);
    await q.query(`COMMENT ON COLUMN local_agent_devices.capabilities IS
      'heartbeat 로 보고된 노드 capability(마지막 값). NULL = 보고하지 않는 이전 에이전트. boolean 만 — 값 · 경로 · 화면 없음'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE local_agent_devices DROP COLUMN capabilities_reported_at`);
    await q.query(`ALTER TABLE local_agent_devices DROP COLUMN capabilities`);
  }
}
