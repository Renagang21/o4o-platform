import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 질문 대기 run 의 업무 이해 — `assistant_run_frames.understanding`
 *
 * WO-O4O-PERSONAL-ASSISTANT-TASK-UNDERSTANDING-AND-COMPLETION-V1
 * 정본: `docs/baseline/O4O-ASSISTANT-MEMORY-PLACEMENT-POLICY-V1.md` M5 (M10 예외) ·
 *       `docs/baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md` §23
 *
 * 왜 필요한가
 *   Assistant 는 실행 전에 요청에서 목표 · 완료조건 · 확정 경계(TaskUnderstanding)를 세우고, 실행 결과를 그 조건으로 판정한다.
 *   이해는 API 인스턴스 메모리에만 있었으므로, 질문에 답해 재개하는 요청이 다른 인스턴스에 닿으면 원래 조건을 잃었다.
 *   재개 구조(M5)와 같은 행 · 같은 수명에 이해를 함께 둔다 — run 이 질문 대기를 벗어나면 행째 지워지고,
 *   run · Task · 사용자가 지워지면 CASCADE 로 함께 사라진다. 별도 테이블 · 이력 없음.
 *
 * NULL = 이해 없이 멈춘 run(이 컬럼 이전 저장분 포함). 재개는 이 경우 사용자 확인으로 판정한다(조용한 결과 근거 완료 없음).
 * 담는 것: **글 없는 구조만** — {version:2, outcome(결과 형태), commitBoundary(확정 경계)}.
 *   목표 · 완료조건 · 질문 글은 요청 원문에서 파생돼 환자 · 고객명 · 처방 식별자 같은 업무 값을 담을 수 있으므로 저장하지 않는다
 *   (정책 §4 M13). 다른 인스턴스 재개는 이 구조로 사용자 확인 판정 + 확정 경계 유지만 한다. 화면 글 · 입력값 · 근거 원문 없음.
 */
export class AddAssistantRunFrameUnderstanding1791349365734 implements MigrationInterface {
  name = 'AddAssistantRunFrameUnderstanding1791349365734';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE assistant_run_frames ADD COLUMN understanding jsonb`);
    await q.query(`COMMENT ON COLUMN assistant_run_frames.understanding IS
      '질문으로 멈춘 run 의 업무 이해 구조(결과 형태 · 확정 경계만 · 목표 · 조건 글 없음). run 질문 대기 동안만 · run 종결 · 만료 시 행째 삭제. NULL = 이해 없음'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE assistant_run_frames DROP COLUMN understanding`);
  }
}
