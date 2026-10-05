import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Assistant Memory Cloud Continuity — `assistant_procedural_patterns` + `assistant_run_frames`
 *
 * WO-O4O-PERSONAL-ASSISTANT-MEMORY-CLOUD-CONTINUITY-V1
 * 정본: `docs/baseline/O4O-ASSISTANT-MEMORY-PLACEMENT-POLICY-V1.md` §4 (M3 · M4 · M5) · §5 · §9
 *       `docs/baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md` §9 (Ownership-first) · §8-1-a (Provider 독립)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * assistant_procedural_patterns — 소유 주체의 검증된 방법(Preferred / Avoid)
 *
 *   소유: USER = 요청자 본인(user_id) · ORGANIZATION = 그 조직(organization_id). 둘 중 하나만 — CHECK 로 고정.
 *         조직 기억은 조직 것이라 기여한 직원을 남기지 않는다(직원이 떠나도 조직에 남는다 · 정책 §2-7).
 *   키:   대상(target_id · 공개 사이트만 — 사설 대상은 노드, 정책 §2-6) × Task type × stage × 극성 × 방법 지문.
 *   방법: strategy = op 순서 + 검증된 메뉴 label(공개 사이트의 화면 요소 이름)뿐. 값 · 원문 · 화면 글 칼럼 없음.
 *   보존: last_used_at 기준 1년 미사용이면 Assistant 가 근거로 쓰지 않는다(신뢰 해제 · 정책 D2). 소유 주체 삭제 시 CASCADE.
 *
 * assistant_run_frames — 진행 중 run 의 재개 구조(M5)
 *
 *   다른 노드에서 같은 run 을 이어가기 위한 task · stage · 물을 slot 종류 · label 없는 op 순서만.
 *   run 이 질문으로 멈춘 동안만 존재한다 — run 종결 시 삭제, coordination 행이 지워지면 CASCADE.
 *
 * Provider · 모델 고유 칼럼(prompt · conversation · thread id)이 없다. 범용 metadata 칼럼도 없다.
 */
export class CreateAssistantProceduralMemory1791100000000 implements MigrationInterface {
  name = 'CreateAssistantProceduralMemory1791100000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE assistant_procedural_patterns (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        ownership_scope character varying(16) NOT NULL,
        user_id uuid,
        organization_id uuid,
        target_id character varying(64) NOT NULL,
        task_type_key character varying(100) NOT NULL,
        stage_key character varying(32) NOT NULL,
        polarity character varying(16) NOT NULL,
        pattern_sig character(64) NOT NULL,
        strategy jsonb NOT NULL,
        verified_count integer NOT NULL DEFAULT 1,
        failed_count integer NOT NULL DEFAULT 0,
        status character varying(16) NOT NULL DEFAULT 'verified',
        last_used_at timestamp with time zone NOT NULL DEFAULT now(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT pk_assistant_procedural_patterns PRIMARY KEY (id),
        CONSTRAINT fk_app_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_app_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        CONSTRAINT chk_app_owner CHECK (
          (ownership_scope = 'USER' AND user_id IS NOT NULL AND organization_id IS NULL)
          OR (ownership_scope = 'ORGANIZATION' AND organization_id IS NOT NULL AND user_id IS NULL)
        ),
        CONSTRAINT chk_app_polarity CHECK (polarity IN ('preferred', 'avoid')),
        CONSTRAINT chk_app_status CHECK (status IN ('verified', 'retired')),
        CONSTRAINT chk_app_strategy CHECK (jsonb_typeof(strategy) = 'object')
      )
    `);
    await q.query(`CREATE UNIQUE INDEX uq_app_user_pattern
      ON assistant_procedural_patterns (user_id, target_id, task_type_key, stage_key, polarity, pattern_sig)
      WHERE ownership_scope = 'USER'`);
    await q.query(`CREATE UNIQUE INDEX uq_app_org_pattern
      ON assistant_procedural_patterns (organization_id, target_id, task_type_key, stage_key, polarity, pattern_sig)
      WHERE ownership_scope = 'ORGANIZATION'`);

    await q.query(`
      CREATE TABLE assistant_run_frames (
        run_id character varying(64) NOT NULL,
        user_id uuid NOT NULL,
        task_id uuid,
        target_id character varying(64) NOT NULL,
        task_type_key character varying(100),
        stage_key character varying(32),
        ask jsonb,
        strategy jsonb,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT pk_assistant_run_frames PRIMARY KEY (run_id),
        CONSTRAINT fk_arf_run FOREIGN KEY (run_id) REFERENCES work_run_coordination(run_id) ON DELETE CASCADE,
        CONSTRAINT fk_arf_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_arf_task FOREIGN KEY (task_id) REFERENCES assistant_tasks(id) ON DELETE CASCADE
      )
    `);
    await q.query(`CREATE INDEX idx_arf_user ON assistant_run_frames (user_id)`);

    await q.query(`COMMENT ON TABLE assistant_procedural_patterns IS
      'Assistant Memory M3 · M4 — 소유 주체의 검증된 방법(공개 사이트 대상). op · 검증 label 만. 원문 · 값 · Provider 칼럼 없음. 1년 미사용 시 신뢰 해제'`);
    await q.query(`COMMENT ON TABLE assistant_run_frames IS
      'Assistant Memory M5 — 질문으로 멈춘 run 의 재개 구조(task · stage · slot 종류 · label 없는 op). run 종결 시 삭제'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE assistant_run_frames`);
    await q.query(`DROP TABLE assistant_procedural_patterns`);
  }
}
