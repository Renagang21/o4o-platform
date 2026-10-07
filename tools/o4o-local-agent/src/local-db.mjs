/**
 * Local Work Agent — 로컬 데이터 런타임 (Local Data Runtime V1)
 *
 * WO-O4O-LOCAL-DATA-SQLITE-V0 (V0 · 접근 단일화 · 경로 자율 · 의존성 0)
 * WO-O4O-LOCAL-DATA-RUNTIME-AND-SCHEMA-EVOLUTION-V1 (V1 · bootstrap · 버전 · 무결성 · 백업 · import/export)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SQLite 접근을 한 곳으로 모은다 (V0 §27)
 *
 * 이 파일이 저장소 안에서 SQLite 를 여는 **유일한** 곳이다. 각 tool 이 DB 파일을
 * 제멋대로 열지 않는다 — 열기 · 마이그레이션 · 조회 · 트랜잭션 · 닫기가 전부 여기 있다.
 * 백업 파일의 목록·보존·복원(파일 시스템)은 `local-db-backup.mjs` 가 맡고, 이 모듈은
 * 스냅샷을 **DB 안에서**(`VACUUM INTO`) 만든다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 사용자가 하지 않는 것 (V1 §2)
 *
 *   SQLite 설치 · migration 실행 · schema version 관리 — 전부 agent 가 시작할 때 한다:
 *   DB 없음 → 만든다 · 있음 → 버전 확인 → 필요한 migration 만 순서대로(각각 트랜잭션,
 *   적용 전 백업) → 무결성 확인 → ready. 실패는 삼키지 않는다 — 코드로 남기고 데이터
 *   축을 닫는다(§17). 더 새로운 schema 는 내리지 않는다(§20).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 경로는 이 모듈이 스스로 정한다 (V0 §7·§19·§34)
 *
 * DB 파일은 `agentHome()/local.db` — credentials.json 옆이다. 이 모듈은 **서버가
 * 보낸 경로를 절대 받지 않는다.** import 함수도 파일 시스템을 뒤지지 않는다 — 이미
 * 파싱된 텍스트/행만 받는다. 따라서 `node:fs` 사용은 자기 홈 디렉터리 하나를
 * 만드는 것(mkdir)뿐이고, 임의 파일 접근 통로가 존재하지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 하지 않는 것 (V0 §31~§37 · V1 §5·§15·§40·§44)
 *
 * - cloud 업로드 · 원본 테이블 동기화 · 자동 복제: 없음. 이 파일에 http/fetch 가 없다.
 * - 임의 SQL 실행 tool: 없음. 서버·AI·사용자 입력이 SQL 문자열로 오는 통로가 없다 —
 *   migration 은 이 파일에 체크인된 코드뿐이다(§14·§15).
 * - credential/비밀번호/쿠키/토큰을 DB 정체성으로 쓰지 않는다 — local_db_id 는 무작위 UUID 다.
 * - 환자·처방·보험·주민번호 등 민감정보 스키마: 만들지 않는다(§44).
 * - 업무 테이블(상품·매출·공급자·주문 선호)을 미리 만들지 않는다(§42) — 실제 반복 업무가
 *   생길 때 migration 으로 additive 하게 키운다.
 */

import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ─── 오류 계약 (V1 §58) ─────────────────────────────────────────────────────

export const LOCAL_DB_ERROR = Object.freeze({
  NOT_READY: 'LOCAL_DB_NOT_READY',
  MIGRATION_FAILED: 'LOCAL_DB_MIGRATION_FAILED',
  SCHEMA_TOO_NEW: 'LOCAL_DB_SCHEMA_TOO_NEW',
  INTEGRITY_FAILED: 'LOCAL_DB_INTEGRITY_FAILED',
  BACKUP_FAILED: 'LOCAL_DB_BACKUP_FAILED',
  IMPORT_INVALID: 'LOCAL_DB_IMPORT_INVALID',
  REQUIRED_FIELD_MISSING: 'LOCAL_DB_REQUIRED_FIELD_MISSING',
  EXPORT_FAILED: 'LOCAL_DB_EXPORT_FAILED',
});

/** 코드가 붙은 오류. 메시지는 로컬 콘솔용이고 밖(cloud)으로는 코드만 나간다(§59). */
export class LocalDbError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.name = 'LocalDbError';
    this.code = code;
  }
}

// ─── 경로 (V0 §7 · V1 §7) ───────────────────────────────────────────────────

/**
 * DB 파일이 사는 곳. credentials.mjs 와 **같은** 규칙을 쓴다 — 다만 이 모듈은
 * 자기 경로만 계산하고 서버 입력을 받지 않는다. 두 모듈 다 자기 파일 하나만 다룬다.
 */
export function agentHome() {
  if (process.env.O4O_AGENT_HOME) return process.env.O4O_AGENT_HOME;
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(base, 'o4o-local-agent');
}

function dbPath() {
  return path.join(agentHome(), 'local.db');
}

// ─── Migration chain (V0 §4·§13 · V1 §11~§14·§19) ───────────────────────────

/**
 * forward-only 마이그레이션. 각 항목은 `version` · `name` · `up(db)`.
 *   - 앞으로만 간다(내려가지 않는다). version 은 1 부터 빈틈없이 이어진다(startup 이 검사한다).
 *   - 각 migration 은 하나의 트랜잭션이다 — SQLite 는 DDL 도 트랜잭션 안에서 롤백된다(실측).
 *   - `IF NOT EXISTS` 로 idempotent — 같은 migration 을 다시 돌려도 안전.
 *   - 사용자가 SQL 을 직접 돌릴 일이 없다 — agent 가 시작 때 스스로 적용한다.
 *
 * 업무 테이블(주문·재고·상품·고객)을 여기서 대량 생성하지 않는다(V1 §42). 002 는 업무
 * 테이블이 아니라 **import/export 의 저장 기반**(dataset 단위 행 저장)이다 — 어떤 업무
 * 데이터를 담을지는 실제 필요가 생길 때 dataset 이름과 mapping 으로 정한다(§43).
 */
export const MIGRATIONS = Object.freeze([
  {
    version: 1,
    name: 'core_v0',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS local_meta (
          key        TEXT PRIMARY KEY,
          value      TEXT,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_schema_migrations (
          version    INTEGER PRIMARY KEY,
          name       TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_settings (
          key        TEXT PRIMARY KEY,
          value      TEXT,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_mappings (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          source_type    TEXT NOT NULL,
          profile_name   TEXT NOT NULL,
          column_mapping TEXT NOT NULL,
          version        INTEGER NOT NULL DEFAULT 1,
          created_at     TEXT NOT NULL,
          updated_at     TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_imports (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          source_type     TEXT NOT NULL,
          profile_name    TEXT NOT NULL,
          row_count       INTEGER NOT NULL DEFAULT 0,
          dropped_columns TEXT,
          missing_fields  TEXT,
          created_at      TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_exports (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          target     TEXT NOT NULL,
          format     TEXT NOT NULL,
          row_count  INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_work_state (
          key        TEXT PRIMARY KEY,
          value      TEXT,
          updated_at TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 2,
    name: 'datasets_v1',
    up(db) {
      // import 로 들어온 행의 저장 기반(V1 §31~§39). dataset 하나 = 이름 · 필드 목록 · (선택) 키 필드.
      // 행은 매핑된 필드만 JSON 으로 담는다(§32 — 원본 열 전부를 저장하지 않는다).
      // key_field 가 있으면 같은 키의 재-import 는 덮어쓴다(§36 — dataset 별 키 전략).
      db.exec(`
        CREATE TABLE IF NOT EXISTS local_datasets (
          name       TEXT PRIMARY KEY,
          key_field  TEXT,
          fields     TEXT NOT NULL,
          row_count  INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_dataset_rows (
          dataset     TEXT NOT NULL REFERENCES local_datasets(name) ON DELETE CASCADE,
          row_key     TEXT NOT NULL,
          data        TEXT NOT NULL,
          imported_at TEXT NOT NULL,
          PRIMARY KEY (dataset, row_key)
        );
      `);
    },
  },
  {
    version: 3,
    name: 'work_runs_v1',
    up(db) {
      // WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1 (PHASE 1)
      // same-run resume 의 **정본 원장**. logical Work Run 하나 = 한 row.
      //   run_id        — runtime 이 발급한 logical run 식별자(cloud coordination 과 동일 값).
      //   status        — active | waiting_for_user | completed | taken_over | expired.
      //   target_id     — 등재 대상(browser_site/windows_app) 식별자. 없으면 NULL.
      //   goal_summary  — semantic 목표 요약(사용자가 입력한 업무 문장, 짧게). 이것은 사용자 PC 의
      //                   자기 데이터이므로 정본으로 담는다.
      //   note          — 재개용 semantic 메모(예: 마지막 질문 요지). 짧은 텍스트만.
      // 저장 금지(§검증 D · 조건 6): 이미지 · screenshot · raw DOM 전문 · credential/token ·
      //   개인정보/환자정보 · 화면 전체 텍스트 dump. 이 테이블에 그런 컬럼은 없다.
      db.exec(`
        CREATE TABLE IF NOT EXISTS local_work_runs (
          run_id       TEXT PRIMARY KEY,
          status       TEXT NOT NULL DEFAULT 'active',
          target_id    TEXT,
          goal_summary TEXT,
          note         TEXT,
          created_at   TEXT NOT NULL,
          updated_at   TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_local_work_runs_status
          ON local_work_runs (status);
      `);
    },
  },
  {
    version: 4,
    name: 'source_bindings_v1',
    up(db) {
      // WO-O4O-HOSPITAL-DRUG-LOCAL-AUTOMATION-PILOT-V1 (게이트 2 · Agent 로컬 바인딩)
      // 반복해서 쓰는 자료(원내 약품 목록 등)를 **로컬 파일에 묶어** 두고, 변경되면 다시 import 하기
      // 위한 최소 메타. 파일 선택·경로 기억·stat 비교·재-import 는 전부 이 PC 안(local-data-cli)에서만
      // 일어난다. 웹/cloud 는 이 테이블을 읽지 않는다 — localDbHealth 도 local.data.* 핸들러도
      // file_path 를 노출하지 않는다(게이트 2 경계).
      //   logical_source — 이 자료의 논리 이름(파일명이 아니라 업무상 식별자, §7 파일명≠식별기준).
      //   dataset        — import 결과가 담기는 local_datasets 이름.
      //   file_path      — 사용자가 CLI 로 직접 고른 로컬 경로. **로컬 전용** — 밖으로 나가지 않는다.
      //   file_format    — 현재 'csv' 만(XLSX 직접 파싱은 후속, WO 결정).
      //   column_mapping — { 원본열: field } JSON. key_field/required_fields 는 import 규칙 그대로.
      //   last_size/last_mtime_ms/last_imported_at/last_row_count — 변경감지(§7)용 최소 meta.
      // 저장 금지: 파일 내용·행 데이터(그건 local_datasets 로 감)·credential·개인정보.
      db.exec(`
        CREATE TABLE IF NOT EXISTS local_source_bindings (
          logical_source   TEXT PRIMARY KEY,
          dataset          TEXT NOT NULL,
          file_path        TEXT NOT NULL,
          file_format      TEXT NOT NULL DEFAULT 'csv',
          column_mapping   TEXT NOT NULL,
          key_field        TEXT,
          required_fields  TEXT,
          last_size        INTEGER,
          last_mtime_ms    INTEGER,
          last_imported_at TEXT,
          last_row_count   INTEGER NOT NULL DEFAULT 0,
          created_at       TEXT NOT NULL,
          updated_at       TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 5,
    name: 'workflow_candidates_v1',
    up(db) {
      // WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1 (PHASE 2 · IR §8·§9-2)
      // 성공 run 의 **semantic trajectory** 와 그것을 일반화한 **Workflow Candidate** 의 정본.
      //   local_work_run_steps       — run 하나의 성공 단계(순서 · 행동 종류 · semantic locator JSON). 원장.
      //   local_workflow_candidates  — (대상, 요청 템플릿) 하나 = Candidate 하나. steps_json 은 값 없는 semantic 단계.
      //     request_template — 요청 문장에서 입력값 자리만 {{n}} 으로 바꾼 것. 업무 값은 담기지 않는다.
      //     success_count/failure_count — 재생 결과. 반복 실패면 status='disabled'(재생 안 함).
      // 저장 금지(IR §11): 좌표 · elementRef · snapshot · DOM 전문 · 화면 캡처 · 입력값 · 인증정보 · 개인정보.
      // 개인 범위 전용 — 공유 workflow 로 자동 승격하지 않는다. cloud 는 이 테이블을 읽지 않는다(재생 대조는 이 PC 에서).
      db.exec(`
        CREATE TABLE IF NOT EXISTS local_work_run_steps (
          run_id       TEXT NOT NULL,
          step_index   INTEGER NOT NULL,
          action_kind  TEXT NOT NULL,
          step_json    TEXT NOT NULL,
          created_at   TEXT NOT NULL,
          PRIMARY KEY (run_id, step_index)
        );

        CREATE TABLE IF NOT EXISTS local_workflow_candidates (
          candidate_id     TEXT PRIMARY KEY,
          target_id        TEXT NOT NULL,
          request_template TEXT NOT NULL,
          steps_json       TEXT NOT NULL,
          source_run_id    TEXT,
          success_count    INTEGER NOT NULL DEFAULT 0,
          failure_count    INTEGER NOT NULL DEFAULT 0,
          status           TEXT NOT NULL DEFAULT 'active',
          created_at       TEXT NOT NULL,
          updated_at       TEXT NOT NULL,
          UNIQUE (target_id, request_template)
        );

        CREATE INDEX IF NOT EXISTS idx_local_workflow_candidates_target
          ON local_workflow_candidates (target_id, status);
      `);
    },
  },
  {
    version: 6,
    name: 'work_experience_v1',
    up(db) {
      // WO-O4O-AUTOMATION-LOCAL-EXPERIENCE-MINIMUM-STORAGE-V1 (Experience Model V1 Phase 1 · §15 최소 집합)
      // 성공·실패·사용자 대기 run 모두가 남기는 **구조화된 경험** — 쓰기 전용(recall·승격·공유 없음).
      //   local_work_runs (확장)          — task/target 식별 · 시작/종료 · segment 수 · Outcome(상태 + 근거 등급).
      //   local_work_run_segments         — 요청 1회 = segment 1개. 시간 분해 metric(근거 없으면 NULL).
      //   local_work_run_experience_steps — run 의 **모든** 단계(성공·실패·거절). stage · 수단 · semantic locator · 결과.
      //   local_work_run_failures         — 실패 이벤트. 원인 층(runtime/ui_change/...) · 회복 tier/결과.
      // local_work_run_steps(v5) 는 Candidate 저장이 run 단위로 지우고 다시 쓰는 성공 경로 원장이라 재사용하지 않는다.
      // 저장 금지(Experience Model §15·§9): 입력한 업무 내용 · 사용자 답변 원문 · 화면 글 · DOM · 캡처 · 프롬프트 ·
      //   모델 근거 · 결과 데이터 · 개인/환자 정보 · 인증정보. cloud 는 이 테이블을 읽지 않는다(ARCHITECTURE §5-1).
      const has = (table, col) => db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
      const addRunColumns = [
        ['task_key', 'TEXT'],
        ['task_provisional', 'INTEGER'],
        ['target_kind', 'TEXT'],
        ['started_at', 'TEXT'],
        ['ended_at', 'TEXT'],
        ['segment_count', 'INTEGER NOT NULL DEFAULT 0'],
        ['outcome_status', 'TEXT'],
        ['outcome_evidence', 'TEXT'],
      ];
      for (const [col, type] of addRunColumns) {
        if (!has('local_work_runs', col)) db.exec(`ALTER TABLE local_work_runs ADD COLUMN ${col} ${type}`);
      }
      db.exec(`
        CREATE TABLE IF NOT EXISTS local_work_run_segments (
          run_id           TEXT NOT NULL,
          segment_index    INTEGER NOT NULL,
          started_at       TEXT NOT NULL,
          ended_at         TEXT NOT NULL,
          end_state        TEXT NOT NULL,
          resumed          INTEGER NOT NULL DEFAULT 0,
          user_wait_ms     INTEGER,
          total_ms         INTEGER,
          ai_ms            INTEGER,
          ai_calls         INTEGER,
          command_wait_ms  INTEGER,
          execution_ms     INTEGER,
          settle_ms        INTEGER,
          action_count     INTEGER,
          step_count       INTEGER,
          retry_count      INTEGER,
          created_at       TEXT NOT NULL,
          PRIMARY KEY (run_id, segment_index),
          UNIQUE (run_id, started_at)
        );

        CREATE TABLE IF NOT EXISTS local_work_run_experience_steps (
          run_id            TEXT NOT NULL,
          seq               INTEGER NOT NULL,
          segment_index     INTEGER NOT NULL,
          stage             TEXT,
          stage_provisional INTEGER NOT NULL DEFAULT 1,
          action_kind       TEXT NOT NULL,
          method            TEXT,
          locator_json      TEXT,
          decided_by        TEXT,
          result_status     TEXT NOT NULL,
          result_evidence   TEXT,
          error_code        TEXT,
          duration_ms       INTEGER,
          created_at        TEXT NOT NULL,
          PRIMARY KEY (run_id, seq)
        );

        CREATE TABLE IF NOT EXISTS local_work_run_failures (
          run_id              TEXT NOT NULL,
          seq                 INTEGER NOT NULL,
          segment_index       INTEGER NOT NULL,
          step_seq            INTEGER,
          stage               TEXT,
          layer               TEXT,
          failure_class       TEXT,
          error_code          TEXT,
          method              TEXT,
          recovery_tier       TEXT,
          recovery_result     TEXT,
          ui_change_suspected INTEGER NOT NULL DEFAULT 0,
          created_at          TEXT NOT NULL,
          PRIMARY KEY (run_id, seq)
        );
      `);
    },
  },
  {
    version: 7,
    name: 'work_assistance_correction_v1',
    up(db) {
      // WO-O4O-AUTOMATION-USER-ASSISTANCE-AND-CORRECTION-V1 (Experience Model V1 Phase 2 · §7-1·§7-5·§7-6)
      // 추가만 한다 — v1~v6 테이블 · 행은 건드리지 않는다.
      //   local_work_run_context      — QUESTION 시점의 원래 업무 구조(task · stage · ask · 방법 · 재생 위치). 재개 때 같은 run 의 목적을 잇는다.
      //   local_work_run_assistance   — 사용자 도움 이벤트(막힌 stage · 물은 것 · 준 정보 종류 · 구조 · 해결 · 재사용성).
      //   local_work_run_corrections  — 교정(유형 · 이유 코드 · 틀린 방법 · 대안 · 검증 결과).
      //   local_experience_patterns   — 검증된 Preferred/Avoid(Task × Target × Stage 한정). 단일 교정이 전역 규칙이 되지 않는다.
      // 저장 금지: 사용자 답변 원문 · slot 값 · 화면 글 · 요청 원문. 방법 label 은 검증된(성공 단계 locator 와 맞은) 화면 이름뿐.
      db.exec(`
        CREATE TABLE IF NOT EXISTS local_work_run_context (
          run_id              TEXT PRIMARY KEY,
          target_id           TEXT NOT NULL,
          task_key            TEXT,
          stage_key           TEXT,
          ask_kind            TEXT,
          slot_kinds_json     TEXT,
          strategy_json       TEXT,
          replay_candidate_id TEXT,
          replay_step_index   INTEGER,
          updated_at          TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS local_work_run_assistance (
          run_id           TEXT NOT NULL,
          seq              INTEGER NOT NULL,
          task_key         TEXT,
          target_id        TEXT NOT NULL,
          stage_key        TEXT,
          kind             TEXT NOT NULL,
          ask_kind         TEXT NOT NULL,
          provided_kind    TEXT NOT NULL,
          structured_json  TEXT,
          resolution       TEXT NOT NULL,
          progressed_steps INTEGER NOT NULL DEFAULT 0,
          reusability      TEXT NOT NULL,
          created_at       TEXT NOT NULL,
          PRIMARY KEY (run_id, seq)
        );

        CREATE TABLE IF NOT EXISTS local_work_run_corrections (
          run_id              TEXT NOT NULL,
          seq                 INTEGER NOT NULL,
          assistance_seq      INTEGER NOT NULL,
          task_key            TEXT,
          target_id           TEXT NOT NULL,
          stage_key           TEXT,
          correction_type     TEXT NOT NULL,
          reason_code         TEXT,
          wrong_json          TEXT,
          alternative_json    TEXT,
          validation_result   TEXT NOT NULL,
          validation_evidence TEXT,
          reusability         TEXT NOT NULL,
          created_at          TEXT NOT NULL,
          PRIMARY KEY (run_id, seq)
        );

        CREATE TABLE IF NOT EXISTS local_experience_patterns (
          pattern_id     TEXT PRIMARY KEY,
          target_id      TEXT NOT NULL,
          task_key       TEXT NOT NULL,
          stage_key      TEXT NOT NULL,
          polarity       TEXT NOT NULL,
          pattern_json   TEXT NOT NULL,
          pattern_sig    TEXT NOT NULL,
          source_run_id  TEXT NOT NULL,
          verified_count INTEGER NOT NULL DEFAULT 0,
          failed_count   INTEGER NOT NULL DEFAULT 0,
          status         TEXT NOT NULL DEFAULT 'verified',
          created_at     TEXT NOT NULL,
          updated_at     TEXT NOT NULL,
          UNIQUE (target_id, task_key, stage_key, polarity, pattern_sig)
        );

        CREATE INDEX IF NOT EXISTS idx_local_experience_patterns_scope
          ON local_experience_patterns (target_id, task_key, status);
      `);
    },
  },
  {
    version: 8,
    name: 'node_ledger_owner_scope_v1',
    up(db) {
      // WO-O4O-PERSONAL-ASSISTANT-PHASE-D-EXECUTION-NODE-RUNTIME-STATE-COORDINATION-V1 (V2 §3-1 · §9-2)
      // 노드 원장의 기억 경계 = 소유 주체. 한 PC 에서 개인 업무와 여러 조직 업무를 해도 서로의 경험이 섞이지 않게
      // owner_key(서버가 준 불투명 키 — 원 사용자/조직 id 가 아니다)를 붙인다.
      //   local_experience_patterns · local_workflow_candidates — 유일키에 owner_key 를 넣기 위해 재생성한다(행 보존).
      //   local_work_runs · local_work_run_assistance           — owner_key 컬럼 추가.
      // 이전 행은 owner_key NULL 로 남는다 — 소유 주체를 알 수 없으므로 owner_key 를 지정한 조회에는 나오지 않는다(격리).
      const has = (table, col) => db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
      if (!has('local_work_runs', 'owner_key')) db.exec('ALTER TABLE local_work_runs ADD COLUMN owner_key TEXT');
      if (!has('local_work_run_assistance', 'owner_key')) db.exec('ALTER TABLE local_work_run_assistance ADD COLUMN owner_key TEXT');
      db.exec(`
        CREATE TABLE local_experience_patterns_v8 (
          pattern_id     TEXT PRIMARY KEY,
          owner_key      TEXT,
          target_id      TEXT NOT NULL,
          task_key       TEXT NOT NULL,
          stage_key      TEXT NOT NULL,
          polarity       TEXT NOT NULL,
          pattern_json   TEXT NOT NULL,
          pattern_sig    TEXT NOT NULL,
          source_run_id  TEXT NOT NULL,
          verified_count INTEGER NOT NULL DEFAULT 0,
          failed_count   INTEGER NOT NULL DEFAULT 0,
          status         TEXT NOT NULL DEFAULT 'verified',
          created_at     TEXT NOT NULL,
          updated_at     TEXT NOT NULL,
          UNIQUE (owner_key, target_id, task_key, stage_key, polarity, pattern_sig)
        );
        INSERT INTO local_experience_patterns_v8 (pattern_id, owner_key, target_id, task_key, stage_key, polarity, pattern_json, pattern_sig,
          source_run_id, verified_count, failed_count, status, created_at, updated_at)
          SELECT pattern_id, NULL, target_id, task_key, stage_key, polarity, pattern_json, pattern_sig,
            source_run_id, verified_count, failed_count, status, created_at, updated_at FROM local_experience_patterns;
        DROP TABLE local_experience_patterns;
        ALTER TABLE local_experience_patterns_v8 RENAME TO local_experience_patterns;
        CREATE INDEX IF NOT EXISTS idx_local_experience_patterns_scope
          ON local_experience_patterns (owner_key, target_id, task_key, status);

        CREATE TABLE local_workflow_candidates_v8 (
          candidate_id     TEXT PRIMARY KEY,
          owner_key        TEXT,
          target_id        TEXT NOT NULL,
          request_template TEXT NOT NULL,
          steps_json       TEXT NOT NULL,
          source_run_id    TEXT,
          success_count    INTEGER NOT NULL DEFAULT 0,
          failure_count    INTEGER NOT NULL DEFAULT 0,
          status           TEXT NOT NULL DEFAULT 'active',
          created_at       TEXT NOT NULL,
          updated_at       TEXT NOT NULL,
          UNIQUE (owner_key, target_id, request_template)
        );
        INSERT INTO local_workflow_candidates_v8 (candidate_id, owner_key, target_id, request_template, steps_json, source_run_id,
          success_count, failure_count, status, created_at, updated_at)
          SELECT candidate_id, NULL, target_id, request_template, steps_json, source_run_id,
            success_count, failure_count, status, created_at, updated_at FROM local_workflow_candidates;
        DROP TABLE local_workflow_candidates;
        ALTER TABLE local_workflow_candidates_v8 RENAME TO local_workflow_candidates;
        CREATE INDEX IF NOT EXISTS idx_local_workflow_candidates_target
          ON local_workflow_candidates (owner_key, target_id, status);
      `);
    },
  },
]);

/** DB 스키마 버전 = 체크인된 마지막 migration 의 version(§11). 따로 손으로 올리지 않는다. */
export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/**
 * migration 목록 자체의 정합성(§19) — 중복 id · 빈틈 · 1 부터 시작 · 이름 형식.
 * startup 마다 검사한다. 코드 실수를 사용자 PC 에서 migration 으로 굳히지 않기 위해서다.
 */
export function validateMigrationChain(migrations) {
  const list = Array.isArray(migrations) ? migrations : [];
  if (list.length === 0) return { ok: false, reason: 'empty' };
  for (let i = 0; i < list.length; i += 1) {
    const m = list[i];
    if (!m || !Number.isInteger(m.version) || typeof m.name !== 'string' || typeof m.up !== 'function') {
      return { ok: false, reason: 'malformed', version: m?.version };
    }
    if (!/^[a-z0-9_]{1,64}$/.test(m.name)) return { ok: false, reason: 'bad_name', version: m.version };
    if (m.version !== i + 1) {
      const dup = list.some((o, j) => j !== i && o?.version === m.version);
      return { ok: false, reason: dup ? 'duplicate' : 'gap', version: m.version };
    }
  }
  return { ok: true, latest: list[list.length - 1].version };
}

function nowIso() {
  return new Date().toISOString();
}

// ─── Bootstrap (V1 §8·§9·§16~§20·§28) ───────────────────────────────────────

let cachedDb = null;

/**
 * 마지막 bootstrap 결과. `ready:false` 면 데이터 축이 닫혀 있다 — repository 는
 * `LOCAL_DB_NOT_READY`(또는 원인 코드)를 던진다. 경로는 담지 않는다(§29·§30).
 */
let runtimeState = { ready: false, errorCode: LOCAL_DB_ERROR.NOT_READY, schemaVersion: 0, expectedSchemaVersion: SCHEMA_VERSION };

export function getLocalDbState() {
  return { ...runtimeState };
}

/** 적용된 migration 행. 아직 테이블이 없으면 빈 배열. */
function appliedMigrations(db) {
  const has = db
    .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='local_schema_migrations'")
    .get();
  if (!has) return [];
  return db.prepare('SELECT version, name, applied_at FROM local_schema_migrations ORDER BY version').all();
}

/**
 * 적용된 migration 이력 vs 코드의 chain 을 대조한다(§19·§20).
 *   too_new    — 코드가 모르는 더 높은 version 이 적용돼 있다 → 내리지 않고 멈춘다
 *   mismatch   — 같은 version 인데 이름이 다르다(다른 chain 의 DB) → 멈춘다
 *   gap        — 적용 이력에 빈틈이 있다(부분 적용 흔적) → 멈춘다
 *   ok         — pending = 적용되지 않은 코드 migration 목록
 */
export function compareMigrationHistory(applied, migrations) {
  const known = new Map(migrations.map((m) => [m.version, m]));
  const maxKnown = migrations[migrations.length - 1]?.version ?? 0;
  let expected = 1;
  for (const row of applied) {
    const v = Number(row.version);
    if (v > maxKnown) return { status: 'too_new', version: v };
    if (v !== expected) return { status: 'gap', version: v };
    if (known.get(v)?.name !== row.name) return { status: 'mismatch', version: v };
    expected += 1;
  }
  return { status: 'ok', applied: expected - 1, pending: migrations.filter((m) => m.version >= expected) };
}

/**
 * DB 를 세운다(§8·§16). 이미 세워져 있으면 그 결과를 돌려준다.
 *
 *   directory → 열기 → PRAGMA → quick_check → 이력 대조 → (pending 있으면 백업 → 적용) → meta → ready
 *
 * 실패는 예외로 새지 않고 `state.errorCode` 로 남는다(§17). 이때 DB 는 닫힌 채 두고
 * repository 호출은 그 코드로 거절된다. 자동 복구·자동 덮어쓰기는 하지 않는다(§27).
 *
 * `options.migrations` 는 **테스트 fixture 전용**(§50·§51) — 운영 경로는 항상 체크인된 MIGRATIONS 다.
 * `options.backup(db, reason)` 은 migration 직전에 호출되는 스냅샷 함수(local-db-backup 이 준다).
 */
export function bootstrapLocalDb(options = {}) {
  if (cachedDb && runtimeState.ready) return getLocalDbState();
  const migrations = options.migrations ?? MIGRATIONS;
  const log = typeof options.log === 'function' ? options.log : () => {};
  const startedAt = Date.now();
  const fail = (errorCode, extra = {}) => {
    runtimeState = { ready: false, errorCode, schemaVersion: extra.schemaVersion ?? 0, expectedSchemaVersion: migrations[migrations.length - 1]?.version ?? 0, ...extra };
    log(`local data: ${errorCode}`);
    return getLocalDbState();
  };

  const chain = validateMigrationChain(migrations);
  if (!chain.ok) return fail(LOCAL_DB_ERROR.MIGRATION_FAILED, { chainStatus: chain.reason });

  let db;
  try {
    fs.mkdirSync(agentHome(), { recursive: true });
    db = new DatabaseSync(dbPath());
    // 안전한 설정만(§10). WAL(동시 읽기 안전) · FK 강제 · 잠금 대기.
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA busy_timeout = 5000');
  } catch {
    try { db?.close(); } catch { /* ignore */ }
    return fail(LOCAL_DB_ERROR.NOT_READY);
  }

  // 무결성(§28) — startup 1회. 매 요청마다 돌리지 않는다.
  let integrity = 'ok';
  try {
    const row = db.prepare('PRAGMA quick_check').get();
    integrity = String(row?.quick_check ?? 'unknown') === 'ok' ? 'ok' : 'failed';
  } catch {
    integrity = 'failed';
  }
  if (integrity !== 'ok') {
    db.close();
    return fail(LOCAL_DB_ERROR.INTEGRITY_FAILED, { integrityStatus: 'failed' });
  }

  const applied = appliedMigrations(db);
  const cmp = compareMigrationHistory(applied, migrations);
  const currentVersion = applied.length ? Number(applied[applied.length - 1].version) : 0;
  if (cmp.status === 'too_new') {
    db.close();
    return fail(LOCAL_DB_ERROR.SCHEMA_TOO_NEW, { schemaVersion: currentVersion, integrityStatus: 'ok', chainStatus: 'too_new' });
  }
  if (cmp.status !== 'ok') {
    db.close();
    return fail(LOCAL_DB_ERROR.MIGRATION_FAILED, { schemaVersion: currentVersion, integrityStatus: 'ok', chainStatus: cmp.status });
  }

  let backupStatus = 'not_needed';
  if (cmp.pending.length > 0) {
    // migration 전 백업(§21·§23·§76). 백업이 안 되면 migration 을 하지 않는다 — 옛 schema 로도 읽기는 되니 멈추는 쪽이 안전.
    // 방금 만든 빈 DB(적용 이력 0)는 지킬 데이터가 없으므로 백업하지 않는다.
    if (applied.length === 0) {
      backupStatus = 'not_needed';
    } else if (typeof options.backup === 'function') {
      try {
        options.backup(db, 'pre-migration');
        backupStatus = 'created';
      } catch {
        db.close();
        return fail(LOCAL_DB_ERROR.BACKUP_FAILED, { schemaVersion: currentVersion, integrityStatus: 'ok', chainStatus: 'ok', pendingMigrations: cmp.pending.length });
      }
    } else {
      backupStatus = 'skipped';
    }
    for (const m of cmp.pending) {
      db.exec('BEGIN');
      try {
        m.up(db);
        db.prepare('INSERT INTO local_schema_migrations(version, name, applied_at) VALUES(?, ?, ?)').run(m.version, m.name, nowIso());
        db.exec('COMMIT');
        log(`local data: migration ${m.version}_${m.name} applied`);
      } catch {
        try { db.exec('ROLLBACK'); } catch { /* ignore */ }
        const appliedNow = appliedMigrations(db);
        db.close();
        return fail(LOCAL_DB_ERROR.MIGRATION_FAILED, {
          schemaVersion: appliedNow.length ? Number(appliedNow[appliedNow.length - 1].version) : 0,
          integrityStatus: 'ok', chainStatus: 'ok', failedMigration: m.version, backupStatus,
        });
      }
    }
  }

  seedMeta(db);
  cachedDb = db;
  runtimeState = {
    ready: true, errorCode: null,
    schemaVersion: migrations[migrations.length - 1].version, expectedSchemaVersion: migrations[migrations.length - 1].version,
    migrationsApplied: applied.length + cmp.pending.length, appliedNow: cmp.pending.map((m) => m.version),
    integrityStatus: 'ok', chainStatus: 'ok', backupStatus, durationMs: Date.now() - startedAt,
  };
  return getLocalDbState();
}

/**
 * DB 핸들 — bootstrap 이 성공했을 때만. 아직 세우지 않았으면 기본 chain 으로 세운다(테스트·V0 호환).
 * bootstrap 이 실패한 상태면 그 코드로 던진다(§17·§58) — "조용히 새 DB" 는 없다.
 */
export function openLocalDb() {
  if (cachedDb && runtimeState.ready) return cachedDb;
  if (!cachedDb) bootstrapLocalDb();
  if (!runtimeState.ready) throw new LocalDbError(runtimeState.errorCode ?? LOCAL_DB_ERROR.NOT_READY);
  return cachedDb;
}

/** local_meta 정체성 값 초기화 — 최초 1회만. 민감정보는 넣지 않는다. */
function seedMeta(db) {
  const set = (key, value) =>
    db
      .prepare(
        'INSERT INTO local_meta(key, value, updated_at) VALUES(?, ?, ?) ' +
          'ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at',
      )
      .run(key, value, nowIso());
  const existing = db.prepare('SELECT value FROM local_meta WHERE key=?').get('local_db_id');
  if (!existing) {
    set('local_db_id', randomUUID());
    set('created_at', nowIso());
  }
  const latest = db.prepare('SELECT MAX(version) AS v FROM local_schema_migrations').get();
  set('schema_version', String(Number(latest?.v ?? 0)));
  set('updated_at', nowIso());
}

/** 닫는다 — 재기동 검증 · 복원 전에. 다음 openLocalDb/bootstrap 이 다시 세운다. */
export function closeLocalDb() {
  if (cachedDb) {
    try { cachedDb.close(); } catch { /* ignore */ }
    cachedDb = null;
  }
  runtimeState = { ready: false, errorCode: LOCAL_DB_ERROR.NOT_READY, schemaVersion: runtimeState.schemaVersion ?? 0, expectedSchemaVersion: SCHEMA_VERSION };
}

/**
 * 트랜잭션으로 감싼다. fn 안에서 던지면 ROLLBACK, 정상 종료면 COMMIT. 반환값은 fn 의 반환값.
 */
export function withTransaction(fn) {
  const db = openLocalDb();
  db.exec('BEGIN');
  try {
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/**
 * 열린 DB 의 일관된 스냅샷을 `destinationPath` 에 만든다(§22). `VACUUM INTO` 는 WAL 상태에서도
 * 트랜잭션 일관성이 있는 사본을 쓴다(실측) — 파일을 단순 복사하는 것과 다르다.
 * 목적지 경로는 local-db-backup 이 자기 backups 디렉터리 안에서만 정한다.
 */
export function snapshotInto(db, destinationPath) {
  db.prepare('VACUUM INTO ?').run(String(destinationPath));
}

// ─── Repository — 고정 쿼리를 감싼 최소 메서드. 임의 SQL 통로 없음 ───────────

/** local_meta 읽기. key/value 만. */
export const LocalMetaRepository = {
  get(key) {
    const row = openLocalDb().prepare('SELECT value FROM local_meta WHERE key=?').get(String(key));
    return row ? row.value : null;
  },
  all() {
    return openLocalDb().prepare('SELECT key, value FROM local_meta ORDER BY key').all();
  },
};

/** local_settings 읽기/쓰기. 값은 문자열로만 저장한다. */
export const LocalSettingsRepository = {
  get(key) {
    const row = openLocalDb().prepare('SELECT value FROM local_settings WHERE key=?').get(String(key));
    return row ? row.value : null;
  },
  set(key, value) {
    const k = String(key);
    const v = value == null ? null : String(value);
    openLocalDb()
      .prepare(
        'INSERT INTO local_settings(key, value, updated_at) VALUES(?, ?, ?) ' +
          'ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at',
      )
      .run(k, v, nowIso());
    return { key: k, value: v };
  },
  all() {
    return openLocalDb().prepare('SELECT key, value FROM local_settings ORDER BY key').all();
  },
};

/** import 이력 기록 — 최소 필드. 원본 파일은 저장하지 않는다. */
export const LocalImportRepository = {
  record({ sourceType, profileName, rowCount, droppedColumns, missingFields }) {
    openLocalDb()
      .prepare(
        'INSERT INTO local_imports(source_type, profile_name, row_count, dropped_columns, missing_fields, created_at) ' +
          'VALUES(?, ?, ?, ?, ?, ?)',
      )
      .run(
        String(sourceType),
        String(profileName),
        Number(rowCount) || 0,
        droppedColumns ? JSON.stringify(droppedColumns) : null,
        missingFields ? JSON.stringify(missingFields) : null,
        nowIso(),
      );
  },
  recent(limit = 20) {
    return openLocalDb()
      .prepare(
        'SELECT id, source_type, profile_name, row_count, dropped_columns, missing_fields, created_at ' +
          'FROM local_imports ORDER BY id DESC LIMIT ?',
      )
      .all(Number(limit) || 20);
  },
};

/** import mapping 프로파일. 최소한 — 자동 추론을 과하게 만들지 않는다. */
export const LocalMappingRepository = {
  save({ sourceType, profileName, columnMapping }) {
    openLocalDb()
      .prepare(
        'INSERT INTO local_mappings(source_type, profile_name, column_mapping, version, created_at, updated_at) ' +
          'VALUES(?, ?, ?, 1, ?, ?)',
      )
      .run(String(sourceType), String(profileName), JSON.stringify(columnMapping ?? {}), nowIso(), nowIso());
  },
};

/** dataset 단위 행 저장(V1 §31~§39). 이름은 규칙 안의 식별자만 — 테이블 이름이 아니라 행의 라벨이다. */
export const DATASET_NAME_RE = /^[a-z][a-z0-9_]{0,63}$/;
export const FIELD_NAME_RE = /^[a-z][a-z0-9_]{0,63}$/;

export const LocalDatasetRepository = {
  get(name) {
    const row = openLocalDb().prepare('SELECT name, key_field, fields, row_count, created_at, updated_at FROM local_datasets WHERE name=?').get(String(name));
    return row ? { ...row, fields: JSON.parse(row.fields) } : null;
  },
  list() {
    return openLocalDb().prepare('SELECT name, key_field, fields, row_count, updated_at FROM local_datasets ORDER BY name').all()
      .map((r) => ({ ...r, fields: JSON.parse(r.fields) }));
  },
  rows(name, limit = 100000) {
    return openLocalDb()
      .prepare('SELECT row_key, data FROM local_dataset_rows WHERE dataset=? ORDER BY rowid LIMIT ?')
      .all(String(name), Number(limit) || 100000)
      .map((r) => ({ rowKey: r.row_key, ...JSON.parse(r.data) }));
  },
  /**
   * 필드 하나를 값으로 찾는다 — 좁은 파라미터 쿼리만(WO-O4O-HOSPITAL-DRUG-COMPOSITE-QUERY-ORCHESTRATION-V1 §5·§7).
   *
   * 임의 SQL 이 아니다: dataset·field 는 이름 규칙(소문자·숫자·_)을 통과해야 하고, 값은 파라미터로만
   * 바인딩한다(§35). JSON 경로는 검증된 field 로만 만든다. match='contains'(대소문자 무시 부분일치·
   * 기본) 또는 'exact'(완전일치). 되돌리는 것은 매칭된 행의 매핑 필드뿐 — 파일 경로·원본은 담지 않는다.
   */
  search({ dataset, field, value, match = 'contains', limit = 50 }) {
    const ds = String(dataset ?? '');
    const f = String(field ?? '');
    if (!DATASET_NAME_RE.test(ds)) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, `bad dataset: ${ds}`);
    if (!FIELD_NAME_RE.test(f)) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, `bad field: ${f}`);
    const v = String(value ?? '');
    const cap = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const jsonPath = `$.${f}`; // field 는 [a-z0-9_] 로만 이뤄져 경로 주입이 불가능하다
    const db = openLocalDb();
    const rows = match === 'exact'
      ? db
          .prepare('SELECT row_key, data FROM local_dataset_rows WHERE dataset=? AND json_extract(data, ?)=? ORDER BY rowid LIMIT ?')
          .all(ds, jsonPath, v, cap)
      : db
          .prepare('SELECT row_key, data FROM local_dataset_rows WHERE dataset=? AND instr(lower(json_extract(data, ?)), lower(?))>0 ORDER BY rowid LIMIT ?')
          .all(ds, jsonPath, v, cap);
    return rows.map((r) => ({ rowKey: r.row_key, ...JSON.parse(r.data) }));
  },
};

/** same-run resume 정본 원장(PHASE 1). 고정 쿼리만 — 임의 SQL 통로 없음. */
export const WORK_RUN_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const WORK_RUN_STATUSES = Object.freeze(['active', 'waiting_for_user', 'completed', 'taken_over', 'expired']);
/** semantic 요약 필드는 짧게만 담는다 — 화면 dump·raw 데이터 유입 방지(§검증 D). */
const WORK_RUN_TEXT_CAP = 500;

function clampWorkRunText(value) {
  if (value == null) return null;
  const s = String(value);
  return s.length > WORK_RUN_TEXT_CAP ? s.slice(0, WORK_RUN_TEXT_CAP) : s;
}

export const LocalWorkRunRepository = {
  /** logical run 생성/갱신(idempotent). 재개 요청이 같은 runId 로 다시 와도 안전하다. */
  upsert({ runId, status, targetId, goalSummary, note, ownerKey }) {
    const id = String(runId);
    const st = WORK_RUN_STATUSES.includes(status) ? status : 'active';
    const now = nowIso();
    openLocalDb()
      .prepare(
        'INSERT INTO local_work_runs(run_id, status, target_id, goal_summary, note, owner_key, created_at, updated_at) ' +
          'VALUES(?, ?, ?, ?, ?, ?, ?, ?) ' +
          'ON CONFLICT(run_id) DO UPDATE SET ' +
          'status=excluded.status, ' +
          'target_id=COALESCE(excluded.target_id, local_work_runs.target_id), ' +
          'goal_summary=COALESCE(excluded.goal_summary, local_work_runs.goal_summary), ' +
          'note=excluded.note, ' +
          'owner_key=COALESCE(excluded.owner_key, local_work_runs.owner_key), ' +
          'updated_at=excluded.updated_at',
      )
      .run(
        id,
        st,
        targetId == null ? null : String(targetId),
        clampWorkRunText(goalSummary),
        clampWorkRunText(note),
        ownerKey ?? null,
        now,
        now,
      );
    return { runId: id, status: st };
  },
  /** 상태만 전이한다(note 는 넘긴 경우에만 덮어쓴다). 종료 상태(completed/taken_over/expired)로도 사용. */
  setStatus(runId, status, note) {
    const st = WORK_RUN_STATUSES.includes(status) ? status : null;
    if (!st) return { ok: false };
    const hasNote = note !== undefined;
    openLocalDb()
      .prepare(
        hasNote
          ? 'UPDATE local_work_runs SET status=?, note=?, updated_at=? WHERE run_id=?'
          : 'UPDATE local_work_runs SET status=?, updated_at=? WHERE run_id=?',
      )
      .run(...(hasNote ? [st, clampWorkRunText(note), nowIso(), String(runId)] : [st, nowIso(), String(runId)]));
    return { ok: true, runId: String(runId), status: st };
  },
  /** agent 내부 진단용 조회. cloud 로 read-back 하지 않는다(§조건 4). */
  get(runId) {
    return openLocalDb()
      .prepare('SELECT run_id, status, target_id, goal_summary, note, created_at, updated_at FROM local_work_runs WHERE run_id=?')
      .get(String(runId)) || null;
  },
};

/**
 * Experience 원장(Experience Model V1 Phase 1 · §15 최소 집합). **쓰기 전용** — cloud 로 read-back 하지 않는다.
 * 요청(segment) 하나가 끝날 때마다 한 번 기록한다. 형상 검증은 handlers.mjs 가 먼저 한다.
 *   - run row 가 없으면 만든다(대상 준비 전 실패한 새 run). 있으면 status 는 건드리지 않는다(상태 전이는 upsert/set_status 몫).
 *   - segment_index · step seq · failure seq 는 이 run 의 기존 최대값 뒤로 잇는다 — 재개(QUESTION→resume)도 같은 run.
 *   - user_wait_ms = 직전 segment 가 사용자 대기로 끝났을 때 그 종료 ~ 이번 시작(대기 시간은 실행 시간과 분리).
 *   - 같은 (run, 시작 시각) segment 가 이미 있으면 중복 전송으로 보고 아무것도 쓰지 않는다.
 *   - Outcome 은 넘긴 경우에만 갱신(대기 segment 는 최종 결과가 아니다).
 */
export const LocalWorkRunExperienceRepository = {
  record({ runId, segment, target, outcome, metric, steps, failures }) {
    const db = openLocalDb();
    const id = String(runId);
    const now = nowIso();
    const nn = (v) => (v === undefined || v === null ? null : v);
    db.exec('BEGIN');
    try {
      const dup = db.prepare('SELECT segment_index FROM local_work_run_segments WHERE run_id=? AND started_at=?').get(id, segment.startedAt);
      if (dup) {
        db.exec('COMMIT');
        return { recorded: false, duplicate: true, segmentIndex: dup.segment_index };
      }
      db.prepare(
        'INSERT INTO local_work_runs(run_id, status, target_id, created_at, updated_at) VALUES(?, ?, ?, ?, ?) ' +
          'ON CONFLICT(run_id) DO NOTHING',
      ).run(id, segment.endState === 'completed' ? 'completed' : 'taken_over', nn(target?.targetId), now, now);
      const prev = db
        .prepare('SELECT segment_index, ended_at, end_state FROM local_work_run_segments WHERE run_id=? ORDER BY segment_index DESC LIMIT 1')
        .get(id);
      const segmentIndex = prev ? prev.segment_index + 1 : 1;
      let userWaitMs = null;
      if (prev && prev.end_state === 'waiting_for_user') {
        const gap = Date.parse(segment.startedAt) - Date.parse(prev.ended_at);
        if (Number.isFinite(gap) && gap >= 0) userWaitMs = gap;
      }
      const m = metric || {};
      db.prepare(
        'INSERT INTO local_work_run_segments(run_id, segment_index, started_at, ended_at, end_state, resumed, user_wait_ms, total_ms, ai_ms, ai_calls, ' +
          'command_wait_ms, execution_ms, settle_ms, action_count, step_count, retry_count, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(
        id, segmentIndex, segment.startedAt, segment.endedAt, segment.endState, segment.resumed ? 1 : 0, userWaitMs,
        nn(m.totalMs), nn(m.aiMs), nn(m.aiCalls), nn(m.commandWaitMs), nn(m.executionMs), nn(m.settleMs),
        nn(m.actionCount), nn(m.stepCount), nn(m.retryCount), now,
      );
      const stepBase = db.prepare('SELECT COALESCE(MAX(seq), 0) AS n FROM local_work_run_experience_steps WHERE run_id=?').get(id).n;
      const insStep = db.prepare(
        'INSERT INTO local_work_run_experience_steps(run_id, seq, segment_index, stage, stage_provisional, action_kind, method, locator_json, ' +
          'decided_by, result_status, result_evidence, error_code, duration_ms, created_at) VALUES(?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      );
      for (const s of steps || []) {
        insStep.run(
          id, stepBase + s.seq, segmentIndex, nn(s.stage), s.actionKind, nn(s.method), s.locator ? JSON.stringify(s.locator) : null,
          nn(s.actor), s.resultStatus, nn(s.resultEvidence), nn(s.errorCode), nn(s.durationMs), now,
        );
      }
      const failBase = db.prepare('SELECT COALESCE(MAX(seq), 0) AS n FROM local_work_run_failures WHERE run_id=?').get(id).n;
      const insFail = db.prepare(
        'INSERT INTO local_work_run_failures(run_id, seq, segment_index, step_seq, stage, layer, failure_class, error_code, method, ' +
          'recovery_tier, recovery_result, ui_change_suspected, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      );
      (failures || []).forEach((f, i) => {
        insFail.run(
          id, failBase + i + 1, segmentIndex, f.stepSeq == null ? null : stepBase + f.stepSeq, nn(f.stage), nn(f.layer), nn(f.failureClass),
          nn(f.errorCode), nn(f.method), nn(f.recoveryTier), nn(f.recoveryResult), f.uiChangeSuspected ? 1 : 0, now,
        );
      });
      const hasOutcome = !!outcome;
      db.prepare(
        'UPDATE local_work_runs SET ' +
          'target_id=COALESCE(target_id, ?), target_kind=COALESCE(?, target_kind), task_provisional=1, ' +
          'started_at=COALESCE(started_at, ?), ended_at=?, segment_count=segment_count+1, ' +
          (hasOutcome ? 'outcome_status=?, outcome_evidence=?, ' : '') +
          'updated_at=? WHERE run_id=?',
      ).run(
        ...[nn(target?.targetId), nn(target?.targetKind), segment.startedAt, segment.endedAt],
        ...(hasOutcome ? [outcome.status, nn(outcome.evidence)] : []),
        now, id,
      );
      db.exec('COMMIT');
      return { recorded: true, segmentIndex, stepCount: (steps || []).length, failureCount: (failures || []).length };
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  },
  /** agent 내부 진단·테스트용 조회. cloud 로 read-back 하지 않는다. */
  get(runId) {
    const db = openLocalDb();
    const id = String(runId);
    const run = db
      .prepare(
        'SELECT run_id, status, target_id, task_key, task_provisional, target_kind, started_at, ended_at, segment_count, outcome_status, outcome_evidence ' +
          'FROM local_work_runs WHERE run_id=?',
      )
      .get(id);
    if (!run) return null;
    return {
      run,
      segments: db.prepare('SELECT * FROM local_work_run_segments WHERE run_id=? ORDER BY segment_index').all(id),
      steps: db.prepare('SELECT * FROM local_work_run_experience_steps WHERE run_id=? ORDER BY seq').all(id),
      failures: db.prepare('SELECT * FROM local_work_run_failures WHERE run_id=? ORDER BY seq').all(id),
    };
  },
};

/**
 * Workflow Candidate 정본(PHASE 2 · IR §8·§9-2). 고정 쿼리만 — 임의 SQL 통로 없음.
 *
 * 템플릿 대조는 **여기(이 PC)** 에서 한다. cloud 에는 이번 요청의 값을 채운 재생 단계만 돌려준다 —
 * 과거 요청 템플릿 · 통계 · source run 은 밖으로 나가지 않는다. 단계 형상 검증은 handlers.mjs 가 먼저 한다.
 * 같은 규칙(값 자리 · 공백 정규화 · 상한)이 서버 workflow-candidate.ts 에 손으로 복제돼 있다.
 */
export const WORKFLOW_CANDIDATE_ID_RE = /^wc_[a-z0-9]{6,32}$/;
const WORKFLOW_VALUE_MAX = 200;
/** 반복 실패 차단 — 실패가 이만큼 쌓이고 성공보다 많으면 재생하지 않는다. */
const WORKFLOW_DISABLE_FAILURES = 3;

function workflowText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/** 템플릿 대조 — 맞으면 자리 번호 순 값 배열(1번 → [0]), 아니면 null. 서버 matchRequestTemplate 과 같은 규칙. */
export function matchWorkflowTemplate(template, request) {
  const req = workflowText(request);
  if (!req || typeof template !== 'string' || !template) return null;
  const parts = template.split(/(\{\{\d\}\})/);
  const order = [];
  const pattern = parts
    .map((p) => {
      const m = /^\{\{(\d)\}\}$/.exec(p);
      if (m) {
        order.push(Number(m[1]));
        return '(.+?)';
      }
      return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  const hit = new RegExp(`^${pattern}$`).exec(req);
  if (!hit) return null;
  const values = [];
  for (let i = 0; i < order.length; i += 1) {
    const slot = order[i];
    const v = hit[i + 1].trim();
    if (!v || v.length > WORKFLOW_VALUE_MAX) return null;
    if (values[slot - 1] !== undefined && values[slot - 1] !== v) return null;
    values[slot - 1] = v;
  }
  for (let i = 0; i < values.length; i += 1) if (values[i] === undefined) return null;
  return values;
}

export const LocalWorkflowCandidateRepository = {
  /**
   * 성공 run → run 단계 원장 + Candidate upsert((대상, 템플릿) 하나 = Candidate 하나). 같은 형태를 다시 성공하면
   * 단계를 최신 성공 경로로 갱신한다(AI 가 이어받아 고친 경로 = self-healing 반영). replayedCandidateId 가 있으면 그 성공을 센다.
   */
  save({ runId, targetId, template, steps, replayedCandidateId, ownerKey }) {
    const db = openLocalDb();
    const now = nowIso();
    const stepsJson = JSON.stringify(steps);
    const owner = ownerKey ?? null;
    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM local_work_run_steps WHERE run_id=?').run(String(runId));
      const ins = db.prepare('INSERT INTO local_work_run_steps(run_id, step_index, action_kind, step_json, created_at) VALUES(?, ?, ?, ?, ?)');
      steps.forEach((s, i) => ins.run(String(runId), i + 1, String(s.actionKind), JSON.stringify(s), now));
      // v8 — 같은 소유 주체의 Candidate 만 갱신한다(owner_key 없음 = 이전 묶음).
      const existing = db
        .prepare('SELECT candidate_id FROM local_workflow_candidates WHERE owner_key IS ? AND target_id=? AND request_template=?')
        .get(owner, String(targetId), String(template));
      const candidateId = existing ? existing.candidate_id : `wc_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
      if (existing) {
        // 다시 성공했다 — 최신 성공 경로로 갱신하고 다시 켠다(재생 실패로 꺼졌던 Candidate 도 새 성공으로 회복).
        db.prepare(
          "UPDATE local_workflow_candidates SET steps_json=?, source_run_id=?, status='active', updated_at=? WHERE candidate_id=?",
        ).run(stepsJson, String(runId), now, candidateId);
      } else {
        db.prepare(
          'INSERT INTO local_workflow_candidates(candidate_id, owner_key, target_id, request_template, steps_json, source_run_id, created_at, updated_at) ' +
            'VALUES(?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(candidateId, owner, String(targetId), String(template), stepsJson, String(runId), now, now);
      }
      if (replayedCandidateId) {
        db.prepare('UPDATE local_workflow_candidates SET success_count=success_count+1, updated_at=? WHERE candidate_id=?').run(now, String(replayedCandidateId));
      }
      db.exec('COMMIT');
      return { candidateId, candidateStatus: 'active' };
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  },

  /**
   * 이번 요청과 맞는 active Candidate 하나 → 값을 채운 재생 단계. 성공이 많은 것부터 본다.
   * 돌려주는 것은 candidateId + 단계(actionKind · locator · value · expect)뿐 — 템플릿 · 통계 · source run 은 담지 않는다.
   */
  match({ targetId, request, ownerKey }) {
    // v8 — 이 소유 주체의 Candidate 만 대조한다. 다른 소유 주체 · 소유 주체를 모르는 이전 행은 나오지 않는다.
    const rows = openLocalDb()
      .prepare(
        "SELECT candidate_id, request_template, steps_json FROM local_workflow_candidates WHERE owner_key IS ? AND target_id=? AND status='active' " +
          'ORDER BY success_count DESC, updated_at DESC LIMIT 50',
      )
      .all(ownerKey ?? null, String(targetId));
    for (const row of rows) {
      const values = matchWorkflowTemplate(row.request_template, request);
      if (!values) continue;
      let steps;
      try {
        steps = JSON.parse(row.steps_json);
      } catch {
        continue;
      }
      if (!Array.isArray(steps)) continue;
      const filled = [];
      let ok = true;
      for (const s of steps) {
        const out = { actionKind: s.actionKind, locator: s.locator, expect: s.expect };
        if (s.slot !== undefined) {
          const v = values[s.slot - 1];
          if (v === undefined) { ok = false; break; }
          out.value = v;
        } else if (s.option !== undefined) {
          out.value = s.option;
        }
        filled.push(out);
      }
      if (ok && filled.length > 0) return { matched: true, candidateId: row.candidate_id, steps: filled };
    }
    return { matched: false };
  },

  /** 재생 결과 반영. 실패가 쌓이고 성공보다 많으면 끈다(다음부터 AI 가 처음부터 푼다). */
  recordResult({ candidateId, outcome }) {
    const db = openLocalDb();
    const now = nowIso();
    const id = String(candidateId);
    if (outcome === 'replay_completed') {
      db.prepare('UPDATE local_workflow_candidates SET success_count=success_count+1, updated_at=? WHERE candidate_id=?').run(now, id);
    } else {
      db.prepare('UPDATE local_workflow_candidates SET failure_count=failure_count+1, updated_at=? WHERE candidate_id=?').run(now, id);
      db.prepare(
        "UPDATE local_workflow_candidates SET status='disabled', updated_at=? WHERE candidate_id=? AND failure_count>=? AND failure_count>success_count",
      ).run(now, id, WORKFLOW_DISABLE_FAILURES);
    }
    const row = db.prepare('SELECT status FROM local_workflow_candidates WHERE candidate_id=?').get(id);
    return { candidateId: id, candidateStatus: row ? row.status : null };
  },
};

/**
 * Run context(Experience Model V1 Phase 2 · WO-O4O-AUTOMATION-USER-ASSISTANCE-AND-CORRECTION-V1).
 * QUESTION 으로 멈출 때 원래 업무의 **구조**(task · stage · 무엇을 물었나 · 방법 · 재생 위치)를 남기고,
 * 같은 runId 로 재개될 때 그 구조를 돌려준다 — 짧은 답변이 새 업무 목표가 되지 않게 한다.
 * 원문 · 값은 저장하지 않는다. 재생 재개는 이 PC 에서 원래 요청(goal_summary)으로 Candidate 를 다시 대조하고,
 * 막혔던 자리만 이번 답(slotValue — 저장하지 않음)으로 채워 돌려준다.
 */
export const LocalWorkRunContextRepository = {
  save({ runId, targetId, taskKey, stageKey, ask, strategy, replay }) {
    const db = openLocalDb();
    const now = nowIso();
    db.prepare(
      'INSERT INTO local_work_run_context(run_id, target_id, task_key, stage_key, ask_kind, slot_kinds_json, strategy_json, replay_candidate_id, replay_step_index, updated_at) ' +
        'VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(run_id) DO UPDATE SET ' +
        'target_id=excluded.target_id, task_key=COALESCE(excluded.task_key, local_work_run_context.task_key), ' +
        'stage_key=excluded.stage_key, ask_kind=excluded.ask_kind, slot_kinds_json=excluded.slot_kinds_json, ' +
        'strategy_json=COALESCE(excluded.strategy_json, local_work_run_context.strategy_json), ' +
        'replay_candidate_id=excluded.replay_candidate_id, replay_step_index=excluded.replay_step_index, updated_at=excluded.updated_at',
    ).run(
      String(runId), String(targetId), taskKey ?? null, stageKey ?? null, ask ? ask.kind : null, ask ? JSON.stringify(ask.slots) : null,
      strategy ? JSON.stringify(strategy) : null, replay ? replay.candidateId : null, replay ? replay.stepIndex : null, now,
    );
    if (taskKey) db.prepare('UPDATE local_work_runs SET task_key=?, updated_at=? WHERE run_id=?').run(taskKey, now, String(runId));
    return { saved: true };
  },

  recall({ runId, targetId, slotValue }) {
    const db = openLocalDb();
    const row = db.prepare('SELECT * FROM local_work_run_context WHERE run_id=? AND target_id=?').get(String(runId), String(targetId));
    if (!row) return { found: false };
    const parse = (s) => {
      if (!s) return null;
      try { return JSON.parse(s); } catch { return null; }
    };
    const out = {
      found: true,
      taskKey: row.task_key ?? null,
      stageKey: row.stage_key ?? null,
      ask: row.ask_kind ? { kind: row.ask_kind, slots: parse(row.slot_kinds_json) ?? [] } : null,
      strategy: parse(row.strategy_json),
    };
    if (row.replay_candidate_id != null && typeof slotValue === 'string' && slotValue.trim()) {
      const steps = rederiveReplaySteps(db, row, String(runId), workflowText(slotValue));
      if (steps) {
        out.replayCandidateId = row.replay_candidate_id;
        out.replaySteps = steps;
      }
    }
    return out;
  },
};

/** 원래 요청(goal_summary)으로 Candidate 템플릿을 다시 대조 → 막힌 단계의 자리만 새 값으로 바꿔 채운다. 실패하면 null. */
function rederiveReplaySteps(db, ctx, runId, slotValue) {
  if (!slotValue || slotValue.length > WORKFLOW_VALUE_MAX) return null;
  const run = db.prepare('SELECT goal_summary FROM local_work_runs WHERE run_id=?').get(runId);
  const cand = db
    .prepare("SELECT request_template, steps_json FROM local_workflow_candidates WHERE candidate_id=? AND target_id=? AND status='active'")
    .get(String(ctx.replay_candidate_id), String(ctx.target_id));
  if (!run?.goal_summary || !cand) return null;
  const values = matchWorkflowTemplate(cand.request_template, run.goal_summary);
  if (!values) return null;
  let steps;
  try { steps = JSON.parse(cand.steps_json); } catch { return null; }
  if (!Array.isArray(steps)) return null;
  const blocked = steps[ctx.replay_step_index];
  if (!blocked || blocked.slot === undefined) return null;
  values[blocked.slot - 1] = slotValue;
  return fillWorkflowSteps(steps, values);
}

function fillWorkflowSteps(steps, values) {
  const filled = [];
  for (const s of steps) {
    const out = { actionKind: s.actionKind, locator: s.locator, expect: s.expect };
    if (s.slot !== undefined) {
      const v = values[s.slot - 1];
      if (v === undefined) return null;
      out.value = v;
    } else if (s.option !== undefined) {
      out.value = s.option;
    }
    filled.push(out);
  }
  return filled.length ? filled : null;
}

/** 방법 서명 — 서버 work-assistance.ts strategySignature 와 같은 규칙. */
function patternSignature(strategy) {
  return strategy.ops.map((o) => (o.label ? `${o.op}:${o.label}` : o.op)).join('>');
}
export const EXPERIENCE_PATTERN_ID_RE = /^lp_[a-z0-9]{6,32}$/;

/**
 * Assistance · Correction 원장 + 검증된 Preferred/Avoid(§7-5·§7-6). 형상 검증은 handlers.mjs 가 먼저 한다.
 * 패턴 규칙(D5 · §7-6):
 *   - 검증(verified) + reusable_knowledge + task · stage 가 있을 때만 만든다. 한 번의 교정은 이 Task × Target × Stage 밖으로 번지지 않는다.
 *   - 방법 교정(procedure_method) → 대안 = preferred, 틀린 방법 = avoid. 메뉴 위치 · 업무 순서 도움 → 경로 = preferred.
 *   - 같은 방법이 반대 극성으로 있으면 그쪽을 retired 로 내린다(새 검증이 이긴다).
 *   - 검증 실패(failed)한 대안이 기존 preferred 와 같으면 failed_count 만 올린다.
 */
export const LocalWorkRunAssistanceRepository = {
  record({ runId, targetId, taskKey, event, ownerKey }) {
    const db = openLocalDb();
    const id = String(runId);
    const now = nowIso();
    const owner = ownerKey ?? null;
    db.exec('BEGIN');
    try {
      db.prepare('INSERT INTO local_work_runs(run_id, status, target_id, owner_key, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?) ON CONFLICT(run_id) DO NOTHING')
        .run(id, 'active', String(targetId), owner, now, now);
      if (taskKey) db.prepare('UPDATE local_work_runs SET task_key=?, updated_at=? WHERE run_id=?').run(taskKey, now, id);
      const seq = db.prepare('SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM local_work_run_assistance WHERE run_id=?').get(id).n;
      db.prepare(
        'INSERT INTO local_work_run_assistance(run_id, seq, task_key, target_id, stage_key, kind, ask_kind, provided_kind, structured_json, resolution, ' +
          'progressed_steps, reusability, owner_key, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(
        id, seq, taskKey ?? null, String(targetId), event.stageKey ?? null, event.kind, event.askKind, event.providedKind,
        event.structured ? JSON.stringify(event.structured) : null, event.resolution, event.progressedSteps, event.reusability, owner, now,
      );
      const c = event.correction;
      if (c) {
        const cseq = db.prepare('SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM local_work_run_corrections WHERE run_id=?').get(id).n;
        db.prepare(
          'INSERT INTO local_work_run_corrections(run_id, seq, assistance_seq, task_key, target_id, stage_key, correction_type, reason_code, wrong_json, ' +
            'alternative_json, validation_result, validation_evidence, reusability, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(
          id, cseq, seq, taskKey ?? null, String(targetId), event.stageKey ?? null, c.type, c.reason ?? null,
          c.wrong ? JSON.stringify(c.wrong) : null, c.alternative ? JSON.stringify(c.alternative) : null,
          event.validation.result, event.validation.evidence ?? null, event.reusability, now,
        );
      }
      const patterns = derivePatterns(taskKey, event);
      let patternCount = 0;
      for (const p of patterns) {
        upsertPattern(db, { runId: id, ownerKey: owner, targetId: String(targetId), taskKey, stageKey: event.stageKey, ...p }, now);
        patternCount += 1;
      }
      if (event.validation.result === 'failed' && taskKey && event.stageKey) {
        const alt = c?.alternative ?? (event.structured && event.structured.strategy) ?? null;
        if (alt) {
          db.prepare(
            "UPDATE local_experience_patterns SET failed_count=failed_count+1, updated_at=? WHERE owner_key IS ? AND target_id=? AND task_key=? AND stage_key=? AND polarity='preferred' AND pattern_sig=?",
          ).run(now, owner, String(targetId), taskKey, event.stageKey, patternSignature(alt));
        }
      }
      db.exec('COMMIT');
      return { recorded: true, seq, patternCount };
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  },
  /** agent 내부 진단 · 테스트용. cloud 로 read-back 하지 않는다. */
  get(runId) {
    const db = openLocalDb();
    const id = String(runId);
    return {
      assistance: db.prepare('SELECT * FROM local_work_run_assistance WHERE run_id=? ORDER BY seq').all(id),
      corrections: db.prepare('SELECT * FROM local_work_run_corrections WHERE run_id=? ORDER BY seq').all(id),
      context: db.prepare('SELECT * FROM local_work_run_context WHERE run_id=?').get(id) || null,
    };
  },
};

function derivePatterns(taskKey, event) {
  if (!taskKey || !event.stageKey) return [];
  if (event.validation.result !== 'verified' || event.reusability !== 'reusable_knowledge') return [];
  const out = [];
  const c = event.correction;
  if (c) {
    if (c.type !== 'procedure_method') return [];
    if (c.alternative) out.push({ polarity: 'preferred', strategy: c.alternative });
    if (c.wrong) out.push({ polarity: 'avoid', strategy: c.wrong });
    return out;
  }
  if ((event.askKind === 'menu_location' || event.askKind === 'procedure_order') && event.structured && event.structured.strategy) {
    out.push({ polarity: 'preferred', strategy: event.structured.strategy });
  }
  return out;
}

function upsertPattern(db, { runId, ownerKey, targetId, taskKey, stageKey, polarity, strategy }, now) {
  const sig = patternSignature(strategy);
  const owner = ownerKey ?? null;
  const existing = db
    .prepare('SELECT pattern_id FROM local_experience_patterns WHERE owner_key IS ? AND target_id=? AND task_key=? AND stage_key=? AND polarity=? AND pattern_sig=?')
    .get(owner, targetId, taskKey, stageKey, polarity, sig);
  if (existing) {
    db.prepare("UPDATE local_experience_patterns SET verified_count=verified_count+1, status='verified', updated_at=? WHERE pattern_id=?").run(now, existing.pattern_id);
  } else {
    db.prepare(
      'INSERT INTO local_experience_patterns(pattern_id, owner_key, target_id, task_key, stage_key, polarity, pattern_json, pattern_sig, source_run_id, verified_count, ' +
        "status, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'verified', ?, ?)",
    ).run(`lp_${randomUUID().replace(/-/g, '').slice(0, 20)}`, owner, targetId, taskKey, stageKey, polarity, JSON.stringify(strategy), sig, runId, now, now);
  }
  // 반대 극성 은퇴도 같은 소유 주체 안에서만 — 다른 소유 주체의 방법을 내리지 않는다.
  const opposite = polarity === 'preferred' ? 'avoid' : 'preferred';
  db.prepare(
    "UPDATE local_experience_patterns SET status='retired', updated_at=? WHERE owner_key IS ? AND target_id=? AND task_key=? AND stage_key=? AND polarity=? AND pattern_sig=?",
  ).run(now, owner, targetId, taskKey, stageKey, opposite, sig);
}

/**
 * 최소 recall(D1 질의형 · ARCHITECTURE §5-1). 전체 read-back · dump 가 아니다.
 *   - taskKey 없음 → 이 대상에서 확인된 업무 키(최대 10). 검증된 패턴 · 성공한 run 의 키만.
 *   - taskKey 있음 → 그 Task × Target 의 **verified** 패턴(최대 8): stage · 극성 · 방법 · 검증 횟수. 출처 run · 시각은 내보내지 않는다.
 */
export const LocalExperiencePatternRepository = {
  recall({ targetId, taskKey, ownerKey }) {
    // v8 — 이 소유 주체의 기억만. 다른 소유 주체 · 소유 주체를 모르는 이전 행은 나오지 않는다.
    const db = openLocalDb();
    const tg = String(targetId);
    const owner = ownerKey ?? null;
    if (!taskKey) {
      const rows = db
        .prepare(
          "SELECT task_key, MAX(t) AS t FROM (SELECT task_key, updated_at AS t FROM local_experience_patterns WHERE owner_key IS ? AND target_id=? AND status='verified' " +
            "UNION ALL SELECT task_key, updated_at AS t FROM local_work_runs WHERE owner_key IS ? AND target_id=? AND task_key IS NOT NULL AND outcome_status IN ('SUCCESS','PARTIAL_SUCCESS')) " +
            'GROUP BY task_key ORDER BY t DESC LIMIT 10',
        )
        .all(owner, tg, owner, tg);
      return { taskKeys: rows.map((r) => r.task_key) };
    }
    const rows = db
      .prepare(
        "SELECT stage_key, polarity, pattern_json, verified_count FROM local_experience_patterns WHERE owner_key IS ? AND target_id=? AND task_key=? AND status='verified' " +
          'ORDER BY verified_count DESC, updated_at DESC LIMIT 8',
      )
      .all(owner, tg, String(taskKey));
    const patterns = [];
    for (const r of rows) {
      try {
        patterns.push({ stageKey: r.stage_key, polarity: r.polarity, strategy: JSON.parse(r.pattern_json), verifiedCount: r.verified_count });
      } catch {
        /* 깨진 행은 건너뛴다 */
      }
    }
    return { patterns };
  },
};

/**
 * 로컬 파일 바인딩 원장(게이트 2 · WO-O4O-HOSPITAL-DRUG-LOCAL-AUTOMATION-PILOT-V1).
 * 반복 자료를 로컬 파일에 묶어 두고 변경감지·재-import 를 하기 위한 최소 메타.
 *
 * **경계**: file_path 는 로컬 전용이다. 이 repository 를 호출하는 것은 `local-data-cli`(이 PC 의
 * CLI)뿐이며, cloud 명령(handlers.mjs)은 어떤 `local.data.*` action 으로도 이 테이블을 읽지 않는다.
 * localDbHealth 도 이 테이블을 요약에 담지 않는다. 즉 파일 경로는 밖으로 나가지 않는다.
 */
export const LocalSourceBindingRepository = {
  /** 바인딩 등록/갱신(idempotent). 같은 logical_source 로 다시 오면 경로·매핑을 덮어쓴다. */
  upsert({ logicalSource, dataset, filePath, fileFormat, columnMapping, keyField, requiredFields }) {
    const now = nowIso();
    openLocalDb()
      .prepare(
        'INSERT INTO local_source_bindings' +
          '(logical_source, dataset, file_path, file_format, column_mapping, key_field, required_fields, created_at, updated_at) ' +
          'VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
          'ON CONFLICT(logical_source) DO UPDATE SET ' +
          'dataset=excluded.dataset, file_path=excluded.file_path, file_format=excluded.file_format, ' +
          'column_mapping=excluded.column_mapping, key_field=excluded.key_field, ' +
          'required_fields=excluded.required_fields, updated_at=excluded.updated_at',
      )
      .run(
        String(logicalSource),
        String(dataset),
        String(filePath),
        fileFormat ? String(fileFormat) : 'csv',
        JSON.stringify(columnMapping ?? {}),
        keyField == null ? null : String(keyField),
        requiredFields && requiredFields.length ? JSON.stringify(requiredFields) : null,
        now,
        now,
      );
    return { logicalSource: String(logicalSource) };
  },
  /** import 뒤 stat 지표를 기록한다(변경감지 기준선). */
  recordImport(logicalSource, { size, mtimeMs, rowCount }) {
    openLocalDb()
      .prepare(
        'UPDATE local_source_bindings SET last_size=?, last_mtime_ms=?, last_imported_at=?, last_row_count=?, updated_at=? ' +
          'WHERE logical_source=?',
      )
      .run(
        size == null ? null : Number(size),
        mtimeMs == null ? null : Math.floor(Number(mtimeMs)),
        nowIso(),
        Number(rowCount) || 0,
        nowIso(),
        String(logicalSource),
      );
    return { ok: true };
  },
  /** 한 바인딩 조회 — CLI 의 stat 비교/재-import 에 쓴다(로컬 전용). */
  get(logicalSource) {
    const row = openLocalDb()
      .prepare(
        'SELECT logical_source, dataset, file_path, file_format, column_mapping, key_field, required_fields, ' +
          'last_size, last_mtime_ms, last_imported_at, last_row_count, created_at, updated_at ' +
          'FROM local_source_bindings WHERE logical_source=?',
      )
      .get(String(logicalSource));
    if (!row) return null;
    return {
      ...row,
      columnMapping: JSON.parse(row.column_mapping),
      requiredFields: row.required_fields ? JSON.parse(row.required_fields) : [],
    };
  },
  /** 전체 바인딩 목록(로컬 CLI 표시용). file_path 포함 — 이 결과는 cloud 로 나가지 않는다. */
  list() {
    return openLocalDb()
      .prepare(
        'SELECT logical_source, dataset, file_path, file_format, key_field, ' +
          'last_size, last_mtime_ms, last_imported_at, last_row_count, updated_at ' +
          'FROM local_source_bindings ORDER BY logical_source',
      )
      .all();
  },
};

// ─── CSV parse/map (순수 함수 · 파일 시스템 없음) ───────────────────────────

/**
 * CSV 텍스트를 행 배열로 파싱한다 — 순수 함수, 파일 시스템을 건드리지 않는다.
 * 첫 줄을 헤더로 본다. 따옴표(`"..."`), 따옴표 안 콤마·개행·이스케이프(`""`)를 지원한다.
 * 헤더와 칸 수가 다른 행은 `malformedRows` 로 센다(빈 칸 채움·잘라내기로 억지 정렬하지 않는다 §35).
 * 반환: `{ header, rows, malformedRows }`.
 */
export function parseCsv(text) {
  const src = String(text ?? '').replace(/^﻿/, ''); // BOM 제거
  const records = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      record.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      record.push(field);
      records.push(record);
      field = '';
      record = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  const nonEmpty = records.filter((r) => !(r.length === 1 && r[0] === ''));
  if (nonEmpty.length === 0) return { header: [], rows: [], malformedRows: 0 };
  const header = nonEmpty[0].map((h) => h.trim());
  let malformedRows = 0;
  const rows = [];
  for (const cells of nonEmpty.slice(1)) {
    if (cells.length !== header.length) {
      malformedRows += 1;
      continue;
    }
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = cells[idx] ?? '';
    });
    rows.push(obj);
  }
  return { header, rows, malformedRows };
}

/**
 * 파싱된 행을 니드 기반으로 정리한다(§32·§35) — 순수 함수, DB 를 건드리지 않는다.
 *
 * `columnMapping`: `{ 원본컬럼: 대상필드 }`. 매핑에 없는 원본 컬럼은 **버린다**.
 * `requiredFields` 중 매핑 결과에서 값이 비어 있는 것은 `missingFields` 로 모은다 — 억지로 채우지 않는다.
 */
export function mapImportRows(rows, columnMapping, requiredFields = []) {
  const mapping = columnMapping ?? {};
  const sourceCols = rows.length > 0 ? Object.keys(rows[0]) : [];
  const droppedColumns = sourceCols.filter((c) => !(c in mapping));
  const mapped = rows.map((row) => {
    const out = {};
    for (const [src, dest] of Object.entries(mapping)) {
      out[dest] = row[src] ?? '';
    }
    return out;
  });
  const missingSet = new Set();
  for (const field of requiredFields) {
    const mappedToField = Object.values(mapping).includes(field);
    if (!mappedToField) {
      missingSet.add(field);
      continue;
    }
    const anyEmpty = mapped.some((r) => r[field] == null || String(r[field]).trim() === '');
    if (mapped.length === 0 || anyEmpty) missingSet.add(field);
  }
  return { mapped, droppedColumns, missingFields: [...missingSet] };
}

// ─── Import (V1 §31~§36) ────────────────────────────────────────────────────

export const IMPORT_MAX_ROWS = 200_000;
export const IMPORT_MAX_TEXT_LENGTH = 64 * 1024 * 1024;

/** import 요청의 형상 검사 — dataset · mapping · key/required 필드 이름 규칙. 실패는 IMPORT_INVALID. */
function validateImportRequest({ csvText, dataset, columnMapping, requiredFields, keyField }) {
  if (typeof csvText !== 'string') throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'csvText must be text');
  if (csvText.length > IMPORT_MAX_TEXT_LENGTH) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'csv too large');
  if (typeof dataset !== 'string' || !DATASET_NAME_RE.test(dataset)) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'bad dataset name');
  if (!columnMapping || typeof columnMapping !== 'object' || Array.isArray(columnMapping) || Object.keys(columnMapping).length === 0) {
    throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'columnMapping required');
  }
  for (const [src, dest] of Object.entries(columnMapping)) {
    if (typeof src !== 'string' || src.trim() === '' || typeof dest !== 'string' || !FIELD_NAME_RE.test(dest)) {
      throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'bad mapping entry');
    }
  }
  const fields = [...new Set(Object.values(columnMapping))];
  const required = Array.isArray(requiredFields) ? requiredFields : [];
  for (const f of required) if (typeof f !== 'string' || !FIELD_NAME_RE.test(f)) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'bad required field');
  if (keyField != null && (typeof keyField !== 'string' || !fields.includes(keyField))) {
    throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'keyField must be a mapped field');
  }
  return { fields, required };
}

/**
 * import 미리보기(§34) — DB 를 쓰지 않는다. 행 수 · 인식된 열 · 쓸 필드 · 버릴 열 · 부족 필수 필드 ·
 * 형식 불량 행 수를 돌려준다. 같은 검사를 apply 도 지나므로 preview 가 ok 면 apply 도 같은 판정이다.
 */
export function previewImport(request) {
  const { fields, required } = validateImportRequest(request);
  const { header, rows, malformedRows } = parseCsv(request.csvText);
  if (header.length === 0) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'empty csv');
  if (rows.length > IMPORT_MAX_ROWS) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'too many rows');
  const unknownSource = Object.keys(request.columnMapping).filter((c) => !header.includes(c));
  const { mapped, droppedColumns, missingFields } = mapImportRows(rows, request.columnMapping, required);
  const keyField = request.keyField ?? null;
  let duplicateKeys = 0;
  let emptyKeys = 0;
  if (keyField) {
    const seen = new Set();
    for (const r of mapped) {
      const k = String(r[keyField] ?? '').trim();
      if (k === '') { emptyKeys += 1; continue; }
      if (seen.has(k)) duplicateKeys += 1;
      seen.add(k);
    }
  }
  const existing = LocalDatasetRepository.get(request.dataset);
  return {
    dataset: request.dataset,
    rowCount: mapped.length,
    recognizedColumns: header,
    usedFields: fields,
    droppedColumns,
    unknownSourceColumns: unknownSource,
    missingFields: [...new Set([...missingFields, ...(unknownSource.length ? required.filter((f) => unknownSource.some((c) => request.columnMapping[c] === f)) : [])])],
    malformedRows,
    keyField,
    duplicateKeys,
    emptyKeys,
    existingRows: existing ? Number(existing.row_count) : 0,
    ok: missingFields.length === 0 && unknownSource.length === 0 && emptyKeys === 0 && mapped.length > 0,
  };
}

/**
 * import 적용(§31·§36) — preview 와 같은 검사 뒤 하나의 트랜잭션으로 저장한다.
 * 필수 필드가 비면 `REQUIRED_FIELD_MISSING` 으로 거절하고 아무것도 쓰지 않는다(§35).
 * keyField 가 있으면 같은 키는 덮어쓴다(upsert), 없으면 이번 import 순번이 키다(중복 방지 없음 — §36).
 * mode: 'merge'(기본) | 'replace'(dataset 의 기존 행을 지우고 넣는다).
 */
export function applyImport(request) {
  const preview = previewImport(request);
  if (preview.missingFields.length > 0 || preview.unknownSourceColumns.length > 0) {
    throw new LocalDbError(LOCAL_DB_ERROR.REQUIRED_FIELD_MISSING, `missing: ${preview.missingFields.join(',')}`);
  }
  if (preview.emptyKeys > 0) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'empty key values');
  if (preview.rowCount === 0) throw new LocalDbError(LOCAL_DB_ERROR.IMPORT_INVALID, 'no rows');
  const { rows } = parseCsv(request.csvText);
  const { mapped } = mapImportRows(rows, request.columnMapping, []);
  const mode = request.mode === 'replace' ? 'replace' : 'merge';
  const keyField = preview.keyField;
  const ts = nowIso();
  const importId = ts.replace(/[-:.TZ]/g, '').slice(0, 17);

  const result = withTransaction((db) => {
    const existing = db.prepare('SELECT name, key_field, fields FROM local_datasets WHERE name=?').get(request.dataset);
    if (!existing) {
      db.prepare('INSERT INTO local_datasets(name, key_field, fields, row_count, created_at, updated_at) VALUES(?, ?, ?, 0, ?, ?)')
        .run(request.dataset, keyField, JSON.stringify(preview.usedFields), ts, ts);
    } else {
      const merged = [...new Set([...JSON.parse(existing.fields), ...preview.usedFields])];
      db.prepare('UPDATE local_datasets SET key_field=?, fields=?, updated_at=? WHERE name=?')
        .run(keyField ?? existing.key_field ?? null, JSON.stringify(merged), ts, request.dataset);
    }
    if (mode === 'replace') db.prepare('DELETE FROM local_dataset_rows WHERE dataset=?').run(request.dataset);
    const upsert = db.prepare(
      'INSERT INTO local_dataset_rows(dataset, row_key, data, imported_at) VALUES(?, ?, ?, ?) ' +
        'ON CONFLICT(dataset, row_key) DO UPDATE SET data=excluded.data, imported_at=excluded.imported_at',
    );
    let inserted = 0;
    let updated = 0;
    mapped.forEach((r, i) => {
      const key = keyField ? String(r[keyField]).trim() : `${importId}_${String(i + 1).padStart(7, '0')}`;
      const exists = keyField ? db.prepare('SELECT 1 AS ok FROM local_dataset_rows WHERE dataset=? AND row_key=?').get(request.dataset, key) : null;
      upsert.run(request.dataset, key, JSON.stringify(r), ts);
      if (exists) updated += 1; else inserted += 1;
    });
    const count = db.prepare('SELECT COUNT(*) AS n FROM local_dataset_rows WHERE dataset=?').get(request.dataset);
    db.prepare('UPDATE local_datasets SET row_count=?, updated_at=? WHERE name=?').run(Number(count?.n ?? 0), ts, request.dataset);
    db.prepare(
      'INSERT INTO local_imports(source_type, profile_name, row_count, dropped_columns, missing_fields, created_at) VALUES(?, ?, ?, ?, ?, ?)',
    ).run('csv', request.dataset, mapped.length, JSON.stringify(preview.droppedColumns), null, ts);
    return { inserted, updated, totalRows: Number(count?.n ?? 0) };
  });
  return { dataset: request.dataset, mode, rowCount: mapped.length, ...result, droppedColumns: preview.droppedColumns, malformedRows: preview.malformedRows };
}

/**
 * V0 호환 — 파싱·매핑·이력만(행 저장 없음). V1 의 저장은 `applyImport` 가 한다.
 * 파일 경로를 받지 않는다 — 파일 선택·읽기는 이 모듈 밖(사용자 선택 기반)에서 한다.
 */
export function importCsv({ csvText, sourceType, profileName, columnMapping, requiredFields = [] }) {
  const { header, rows } = parseCsv(csvText);
  const { mapped, droppedColumns, missingFields } = mapImportRows(rows, columnMapping, requiredFields);
  LocalImportRepository.record({ sourceType, profileName, rowCount: mapped.length, droppedColumns, missingFields });
  return { header, importedRows: mapped, rowCount: mapped.length, droppedColumns, missingFields };
}

// ─── Export (V1 §37~§39) ────────────────────────────────────────────────────

/**
 * 행 배열을 CSV 문자열로 만든다 — 순수 함수. `columns` 를 주면 그 순서/집합으로, 없으면 첫 행의 키로.
 * 콤마·따옴표·개행이 든 값은 따옴표로 감싸고 `"` 는 `""` 로. 줄바꿈은 CRLF(Excel 호환).
 */
export function toCsv(rows, columns) {
  const list = Array.isArray(rows) ? rows : [];
  const cols = columns ?? (list.length > 0 ? Object.keys(list[0]) : []);
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [cols.map(esc).join(',')];
  for (const row of list) lines.push(cols.map((c) => esc(row[c])).join(','));
  return lines.join('\r\n');
}

/** export 이력 기록 — 크기 지표만. 내보낸 내용은 저장하지 않는다. */
export function recordExport({ target, format, rowCount }) {
  openLocalDb()
    .prepare('INSERT INTO local_exports(target, format, row_count, created_at) VALUES(?, ?, ?, ?)')
    .run(String(target), String(format), Number(rowCount) || 0, nowIso());
}

/**
 * dataset 하나를 CSV 로 내보낸다(§37·§39). 전체 DB dump 가 아니다 — 이름을 댄 dataset 의 저장 필드만.
 * `columns` 로 부분 집합을 고를 수 있다(dataset 필드 밖 열은 거절). 빈 dataset 은 헤더만 나간다.
 */
export function exportDataset({ dataset, columns }) {
  if (typeof dataset !== 'string' || !DATASET_NAME_RE.test(dataset)) throw new LocalDbError(LOCAL_DB_ERROR.EXPORT_FAILED, 'bad dataset name');
  const meta = LocalDatasetRepository.get(dataset);
  if (!meta) throw new LocalDbError(LOCAL_DB_ERROR.EXPORT_FAILED, 'unknown dataset');
  let cols = meta.fields;
  if (columns != null) {
    if (!Array.isArray(columns) || columns.length === 0 || columns.some((c) => !meta.fields.includes(c))) {
      throw new LocalDbError(LOCAL_DB_ERROR.EXPORT_FAILED, 'columns outside dataset');
    }
    cols = columns;
  }
  const rows = LocalDatasetRepository.rows(dataset);
  const csv = toCsv(rows, cols);
  recordExport({ target: dataset, format: 'csv', rowCount: rows.length });
  return { dataset, format: 'csv', rowCount: rows.length, columns: cols, csv };
}

// ─── Health (V0 §38 · V1 §29) ───────────────────────────────────────────────

/**
 * 로컬 DB 상태 — 시작 때/요청 때 확인용.
 *
 * **경로를 절대 담지 않는다** — dbPath() 는 사용자명을 포함하므로 밖으로 나가면 샌다.
 * 돌려주는 것은 불리언·숫자·짧은 상태 문자열뿐이다. 열기/마이그레이션이 실패했으면 예외 대신
 * 정규화된 코드를 담아 돌려준다. `backup` 요약은 local-db-backup 이 `options.backupSummary()` 로 준다.
 */
export function localDbHealth(options = {}) {
  const state = cachedDb && runtimeState.ready ? runtimeState : bootstrapLocalDb();
  const backup = typeof options.backupSummary === 'function' ? safeBackupSummary(options.backupSummary) : undefined;
  if (!state.ready) {
    return {
      ok: false, available: false, ready: false, errorCode: state.errorCode,
      schemaVersion: Number(state.schemaVersion ?? 0), expectedSchemaVersion: SCHEMA_VERSION,
      migrationStatus: state.errorCode === LOCAL_DB_ERROR.SCHEMA_TOO_NEW ? 'too_new' : 'failed',
      integrityStatus: state.integrityStatus ?? 'unknown',
      ...(backup ? { backupCount: backup.count, lastBackupAt: backup.lastAt } : {}),
    };
  }
  try {
    const db = cachedDb;
    const schemaVersion = Number(LocalMetaRepository.get('schema_version') ?? 0);
    const migRow = db.prepare('SELECT MAX(version) AS v, COUNT(*) AS n FROM local_schema_migrations').get();
    const tableRow = db
      .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name LIKE 'local\\_%' ESCAPE '\\'")
      .get();
    const latest = Number(migRow?.v ?? 0);
    const migrationOk = latest === SCHEMA_VERSION;
    return {
      ok: true,
      available: true,
      ready: true,
      schemaVersion,
      expectedSchemaVersion: SCHEMA_VERSION,
      latestMigration: latest,
      pendingMigrations: Math.max(0, SCHEMA_VERSION - latest),
      migrationsApplied: Number(migRow?.n ?? 0),
      migrationOk,
      migrationStatus: migrationOk ? 'current' : 'behind',
      integrityStatus: state.integrityStatus ?? 'ok',
      tableCount: Number(tableRow?.n ?? 0),
      ...(backup ? { backupCount: backup.count, lastBackupAt: backup.lastAt } : {}),
    };
  } catch (err) {
    return { ok: false, available: false, ready: false, errorCode: err?.code ?? LOCAL_DB_ERROR.NOT_READY };
  }
}

function safeBackupSummary(fn) {
  try {
    const s = fn();
    return { count: Number(s?.count ?? 0), lastAt: typeof s?.lastAt === 'string' ? s.lastAt : null };
  } catch {
    return { count: 0, lastAt: null };
  }
}
