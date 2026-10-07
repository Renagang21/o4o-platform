import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Personal Assistant Task — `assistant_tasks` + `work_run_coordination.task_id`
 *
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-V1
 * 정본: `docs/baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md` §4 (Task 1급 객체) · §9 (소유) · §17 (Gate)
 * 설계: `docs/investigations/IR-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-CENSUS-AND-DESIGN-V1.md`
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Task 는 run 의 이름 변경이 아니다
 *
 *   Task = 사용자가 맡긴 업무 하나.  run = 한 노드에서의 한 실행 시도(`work_run_coordination`).
 *   Task 1 : N run · run 1 : N segment(같은 run 의 질문 → 답변 재개).
 *   기존 run 은 `task_id = NULL` 로 그대로 유효하다(additive · backfill 없음).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 요청자 ≠ 소유자
 *
 *   requested_by_user_id  누가 맡겼는가 (항상 인증 세션)
 *   ownership_scope       USER = 개인 업무 · ORGANIZATION = 매장 업무
 *   organization_id       ORGANIZATION 일 때만 — 서버가 membership 으로 확정한 조직
 *   service_key           서버가 membership 을 확인한 canonical serviceKey (확인 못 하면 NULL)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 구조만 저장한다
 *
 *   요청 원문 · 대화 · 답변 원문 · slot 값 · 화면 text · prompt · credential 을 담을 컬럼이 없다.
 *   원문을 Cloud 에 두는 것은 V2 §17 Legal / Data Processing Gate 대상이다.
 *   범용 JSON metadata 컬럼도 두지 않는다 — 무엇이든 넣을 수 있는 칸은 원문이 새는 통로가 된다.
 *
 * 보존: 정책 미정(PENDING_LEGAL_DATA_PROCESSING_GATE). 이 migration 은 TTL · purge 를 정하지 않는다.
 */
export class CreateAssistantTasks1791012819443 implements MigrationInterface {
  name = 'CreateAssistantTasks1791012819443';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE assistant_tasks (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        requested_by_user_id uuid NOT NULL,
        ownership_scope character varying(16) NOT NULL,
        organization_id uuid,
        service_key character varying(64),
        target_kind character varying(32),
        target_id character varying(64),
        task_type_key character varying(100),
        status character varying(32) NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        completed_at timestamp with time zone,
        CONSTRAINT pk_assistant_tasks PRIMARY KEY (id),
        CONSTRAINT fk_assistant_tasks_requester FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_assistant_tasks_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        CONSTRAINT chk_assistant_tasks_scope CHECK (
          (ownership_scope = 'USER' AND organization_id IS NULL)
          OR (ownership_scope = 'ORGANIZATION' AND organization_id IS NOT NULL)
        ),
        CONSTRAINT chk_assistant_tasks_status CHECK (
          status IN ('running', 'waiting_for_user', 'blocked', 'completed', 'handed_over', 'stopped')
        )
      )
    `);
    await q.query(
      `CREATE INDEX idx_assistant_tasks_requester ON assistant_tasks (requested_by_user_id, created_at DESC)`,
    );
    await q.query(
      `CREATE INDEX idx_assistant_tasks_organization ON assistant_tasks (organization_id) WHERE organization_id IS NOT NULL`,
    );

    await q.query(`ALTER TABLE work_run_coordination ADD COLUMN task_id uuid`);
    await q.query(`ALTER TABLE work_run_coordination
      ADD CONSTRAINT fk_wrc_task FOREIGN KEY (task_id) REFERENCES assistant_tasks(id) ON DELETE SET NULL`);
    await q.query(`CREATE INDEX idx_wrc_task_id ON work_run_coordination (task_id) WHERE task_id IS NOT NULL`);

    await q.query(`COMMENT ON TABLE assistant_tasks IS
      'Personal Assistant Task (V2 §4) — 구조 metadata 만. 요청 원문 · slot · 화면 text 저장 금지. 보존 정책 = PENDING_LEGAL_DATA_PROCESSING_GATE'`);
    await q.query(`COMMENT ON COLUMN assistant_tasks.ownership_scope IS
      'USER = 개인 업무 · ORGANIZATION = 매장 업무(organization_id 필수). 서버가 membership 으로 확정 — 클라이언트 값 불신'`);
    await q.query(`COMMENT ON COLUMN assistant_tasks.task_type_key IS
      'planner 가 제안한 provisional Task type(TASK_KEY_RE 형식 구조 키). 미리 정한 목록이 아니다(V2 §4-4)'`);
    await q.query(`COMMENT ON COLUMN work_run_coordination.task_id IS
      '이 run 이 속한 assistant_tasks.id (Task 1 : N run). Phase A 이전 run 은 NULL'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX idx_wrc_task_id`);
    await q.query(`ALTER TABLE work_run_coordination DROP CONSTRAINT fk_wrc_task`);
    await q.query(`ALTER TABLE work_run_coordination DROP COLUMN task_id`);
    await q.query(`DROP TABLE assistant_tasks`);
  }
}
