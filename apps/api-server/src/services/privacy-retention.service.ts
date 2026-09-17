import type { DataSource } from 'typeorm';
import logger from '../utils/logger.js';

/**
 * PrivacyRetentionService — 개인정보 보유기간 집행 (dry-run / apply)
 *
 * WO-O4O-PRIVACY-DATA-RETENTION-ENFORCEMENT-V1
 *
 * 기간의 유일한 정본: docs/baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md
 *   - 이 파일의 `policyDays` 는 정본 §15 의 값을 옮긴 것이다. 정본을 바꾸지 않고 여기만 바꾸지 않는다.
 *   - env `PRIVACY_RETENTION_DAYS_<KEY>` 는 **정본보다 길게만** 허용한다(정본보다 짧거나 0/음수/비정수는 무시 + warn).
 *     → 접속기록(audit/action/kpa_operator_audit) 1년 이상 보존(안전성 확보조치 기준 §8)이 env 로 깨지지 않는다.
 *     → 2년 시스템 전환 시에는 정본 개정 + policyDays 상향으로 처리한다.
 *
 * 삭제 방식: `DELETE ... WHERE id IN (SELECT id ... LIMIT batch)` 반복. row 내용은 어떤 로그에도 남기지 않는다(건수·기준일만).
 * login_attempts 는 기존 CleanupLoginAttemptsJob(30일) 계약 그대로 — 이 서비스의 대상이 아니다.
 */

export type RetentionTargetKey =
  | 'contact_inquiries'
  | 'email_logs'
  | 'audit_logs'
  | 'action_logs'
  | 'kpa_operator_audit_logs'
  | 'ai_usage_logs';

export interface RetentionTarget {
  key: RetentionTargetKey;
  table: string;
  /** 정본 §15 보유기간(일). */
  policyDays: number;
  /** 사람이 읽는 anchor 규칙(보고용). */
  anchorRule: string;
  /** 삭제 기준 시각을 만드는 SQL 식(컬럼 참조만). */
  anchorSql: string;
  /** anchor 외에 추가로 만족해야 하는 조건(없으면 undefined). */
  eligibleExtraSql?: string;
  /** 보유기간 anchor 를 신뢰성 있게 판정할 수 없는 row 조건(보고만, 삭제 안 함). */
  unresolvedSql?: string;
  /** 아직 보유 목적이 진행 중이라 대상이 아닌 row 조건(보고만). */
  openSql?: string;
}

const CONTACT_TERMINAL_STATUSES = `('answered', 'closed', 'spam')`;

/** 정본 §15 → 코드. 순서 = 보고 순서. */
export const RETENTION_TARGETS: readonly RetentionTarget[] = [
  {
    key: 'contact_inquiries',
    table: 'contact_inquiries',
    policyDays: 365,
    anchorRule: `status IN ${CONTACT_TERMINAL_STATUSES} 인 row 의 handled_at(마지막 상태 변경 시각) + 1년 · received/in_review 는 미처리(open) · 종결 상태인데 handled_at NULL 은 UNRESOLVED_RETENTION_ANCHOR`,
    anchorSql: 'handled_at',
    eligibleExtraSql: `status IN ${CONTACT_TERMINAL_STATUSES} AND handled_at IS NOT NULL`,
    unresolvedSql: `status IN ${CONTACT_TERMINAL_STATUSES} AND handled_at IS NULL`,
    openSql: `status NOT IN ${CONTACT_TERMINAL_STATUSES}`,
  },
  {
    key: 'email_logs',
    table: 'email_logs',
    policyDays: 365,
    anchorRule: 'COALESCE("sentAt", "createdAt") + 1년',
    anchorSql: 'COALESCE("sentAt", "createdAt")',
  },
  {
    key: 'audit_logs',
    table: 'audit_logs',
    policyDays: 365,
    anchorRule: '"createdAt" + 1년 (개인정보처리시스템 접속기록 · 1년 미만 단축 불가)',
    anchorSql: '"createdAt"',
  },
  {
    key: 'action_logs',
    table: 'action_logs',
    policyDays: 365,
    anchorRule: 'created_at + 1년 (운영자 행위 기록 · 1년 미만 단축 불가)',
    anchorSql: 'created_at',
  },
  {
    key: 'kpa_operator_audit_logs',
    table: 'kpa_operator_audit_logs',
    policyDays: 365,
    anchorRule: 'created_at + 1년 (KPA 운영자 감사기록 · 1년 미만 단축 불가)',
    anchorSql: 'created_at',
  },
  {
    key: 'ai_usage_logs',
    table: 'ai_usage_logs',
    policyDays: 365,
    anchorRule: '"createdAt" + 1년 (토큰·모델 메타데이터만 · 본문 없음)',
    anchorSql: '"createdAt"',
  },
];

export interface RetentionTableReport {
  table: string;
  total_rows: number;
  retention_period: string;
  retention_days: number;
  anchor_rule: string;
  cutoff_date: string;
  eligible_for_deletion_count: number;
  oldest_eligible_date: string | null;
  newest_eligible_date: string | null;
  unresolved_count: number;
  open_count: number;
  /** apply 모드에서만 > 0. dry-run 은 항상 0. */
  deleted_count: number;
}

export interface RetentionRunResult {
  mode: 'dry-run' | 'apply';
  ran_at: string;
  tables: RetentionTableReport[];
  total_eligible: number;
  total_unresolved: number;
  total_deleted: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** env 이름: PRIVACY_RETENTION_DAYS_CONTACT_INQUIRIES 등. */
export function retentionEnvName(key: RetentionTargetKey): string {
  return `PRIVACY_RETENTION_DAYS_${key.toUpperCase()}`;
}

/**
 * 실제 적용 일수. env 는 정본보다 길게만 허용.
 * 반환값은 항상 >= policyDays (무기한·단축 불가).
 */
export function resolveRetentionDays(target: RetentionTarget, env: NodeJS.ProcessEnv = process.env): number {
  const raw = env[retentionEnvName(target.key)];
  if (raw === undefined || raw === '') return target.policyDays;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < target.policyDays) {
    logger.warn(`[privacy-retention] ${retentionEnvName(target.key)}=${raw} 무시 — 정수이면서 정본(${target.policyDays}일) 이상이어야 한다`);
    return target.policyDays;
  }
  return n;
}

export function computeCutoff(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

function eligibleWhere(t: RetentionTarget): string {
  const extra = t.eligibleExtraSql ? ` AND ${t.eligibleExtraSql}` : '';
  return `${t.anchorSql} < $1::timestamptz${extra}`;
}

export class PrivacyRetentionService {
  constructor(
    private readonly ds: DataSource,
    private readonly opts: { batchSize?: number; env?: NodeJS.ProcessEnv } = {},
  ) {}

  private get batchSize(): number {
    return this.opts.batchSize ?? 500;
  }

  /** 삭제 없이 테이블별 대상 건수·기준일만 계산한다(SELECT 만). */
  async dryRun(now: Date = new Date()): Promise<RetentionRunResult> {
    return this.run('dry-run', now);
  }

  /** 실제 삭제. 호출자가 activation 을 보장한다(job 의 PRIVACY_RETENTION_MODE=apply). */
  async apply(now: Date = new Date()): Promise<RetentionRunResult> {
    return this.run('apply', now);
  }

  private async run(mode: 'dry-run' | 'apply', now: Date): Promise<RetentionRunResult> {
    const tables: RetentionTableReport[] = [];
    for (const t of RETENTION_TARGETS) {
      const report = await this.inspect(t, now);
      if (mode === 'apply' && report.eligible_for_deletion_count > 0) {
        report.deleted_count = await this.deleteEligible(t, new Date(report.cutoff_date));
      }
      tables.push(report);
    }
    return {
      mode,
      ran_at: now.toISOString(),
      tables,
      total_eligible: tables.reduce((s, r) => s + r.eligible_for_deletion_count, 0),
      total_unresolved: tables.reduce((s, r) => s + r.unresolved_count, 0),
      total_deleted: tables.reduce((s, r) => s + r.deleted_count, 0),
    };
  }

  private async inspect(t: RetentionTarget, now: Date): Promise<RetentionTableReport> {
    const days = resolveRetentionDays(t, this.opts.env);
    const cutoff = computeCutoff(now, days);
    const [agg] = await this.ds.query(
      `SELECT
         (SELECT COUNT(*)::int FROM ${t.table}) AS total_rows,
         COUNT(*)::int AS eligible,
         MIN(${t.anchorSql})::text AS oldest,
         MAX(${t.anchorSql})::text AS newest
       FROM ${t.table}
       WHERE ${eligibleWhere(t)}`,
      [cutoff.toISOString()],
    );
    const unresolved = t.unresolvedSql
      ? (await this.ds.query(`SELECT COUNT(*)::int AS n FROM ${t.table} WHERE ${t.unresolvedSql}`))[0].n
      : 0;
    const open = t.openSql
      ? (await this.ds.query(`SELECT COUNT(*)::int AS n FROM ${t.table} WHERE ${t.openSql}`))[0].n
      : 0;
    // DB 가 돌려준 문자열 그대로(드라이버의 로컬 TZ 해석을 거치지 않는다) — 보고용
    const iso = (v: unknown): string | null => (v ? String(v) : null);
    return {
      table: t.table,
      total_rows: Number(agg.total_rows),
      retention_period: days === t.policyDays ? `${days}일 (정본)` : `${days}일 (env 연장 · 정본 ${t.policyDays}일)`,
      retention_days: days,
      anchor_rule: t.anchorRule,
      cutoff_date: cutoff.toISOString(),
      eligible_for_deletion_count: Number(agg.eligible),
      oldest_eligible_date: iso(agg.oldest),
      newest_eligible_date: iso(agg.newest),
      unresolved_count: Number(unresolved),
      open_count: Number(open),
      deleted_count: 0,
    };
  }

  /** 배치 반복 삭제. 총 삭제 건수 반환. */
  private async deleteEligible(t: RetentionTarget, cutoff: Date): Promise<number> {
    let total = 0;
    for (;;) {
      const raw = await this.ds.query(
        `DELETE FROM ${t.table}
          WHERE id IN (SELECT id FROM ${t.table} WHERE ${eligibleWhere(t)} LIMIT $2)`,
        [cutoff.toISOString(), this.batchSize],
      );
      const n = affectedRows(raw);
      total += n;
      if (n < this.batchSize) break;
    }
    return total;
  }
}

/** TypeORM postgres driver 는 DELETE/UPDATE 의 query() 결과를 `[rows, rowCount]` 로 돌려준다. */
export function affectedRows(raw: unknown): number {
  if (Array.isArray(raw) && raw.length === 2 && typeof raw[1] === 'number') return raw[1];
  return 0;
}
