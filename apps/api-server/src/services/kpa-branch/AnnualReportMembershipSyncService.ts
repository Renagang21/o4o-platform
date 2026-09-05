/**
 * AnnualReportMembershipSyncService — 제출된 신상신고 → 회원 원장(`kpa_members`) 반영
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-MEMBERSHIP-SYNC-V1
 *
 * 이 파일이 **쓰기 경계**다. 신상신고는 kpa-branch 축이고 `kpa_members` 는 KPA 축이므로,
 * 여기가 두 도메인 사이의 유일한 write 지점이다. 다음 4가지를 서버에서만 결정한다.
 *
 *   1) 무엇을 쓸 수 있는가 — Template 의 `syncToMembership` + `syncTarget` 을 읽되,
 *      **허용 컬럼 allowlist 를 통과한 것만** 쓴다. Template 이 바뀌어도 쓰기 범위는
 *      코드가 정한 4개 컬럼을 벗어나지 않는다.
 *   2) 누구의 원장에 쓰는가 — 언제나 `report.user_id` 다. 요청자(운영자)가 아니다.
 *   3) 언제 쓸 수 있는가 — `status='submitted'` 이고 아직 반영되지 않은 신고서만.
 *   4) 무엇이 바뀌었는가 — 실제로 값이 달라진 항목만 update 하고 전/후를 기록한다.
 *
 * 하지 않는 것:
 *   - 제출 스냅샷(`values`)을 수정하지 않는다. 원장 값으로 신고서를 덮어쓰지 않는다(원칙 9·10).
 *   - `kpa_members` 행이 없을 때 만들지 않는다. 분회 신고서가 KPA 회원자격을 만들어내면 안 된다.
 *   - association / member-only 필드를 원장에 반영하지 않는다 (원칙 3).
 *   - `personal.university` 는 sync 대상이 아니다 — `kpa_members.university_name` 은
 *     "약대생 재학 대학명"이고 신고서의 "출신 대학교"와 의미가 다르다.
 */
import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { AnnualReport } from '../../routes/kpa-branch/entities/annual-report.entity.js';
import type {
  AnnualReportSyncChange,
  AnnualReportSyncRecord,
  AnnualReportSyncSkip,
} from '../../routes/kpa-branch/entities/annual-report.entity.js';
import { AnnualReportService } from './AnnualReportService.js';
import type { AnnualReportFieldDefinition } from '../../routes/kpa-branch/entities/annual-report-template.entity.js';

/**
 * 쓰기 허용 컬럼 — `kpa_members` 의 4개뿐이다.
 * Template 의 syncTarget 이 이 목록에 없으면 **쓰지 않고 건너뛴다**.
 * maxLength 는 실제 컬럼 정의와 같은 값이다 (varchar 초과를 DB 오류가 아니라
 * 명시적 422 로 돌려주기 위해서다).
 */
const SYNC_TARGET_ALLOWLIST: Record<string, { column: string; maxLength: number }> = {
  'kpa_members.license_number': { column: 'license_number', maxLength: 100 },
  'kpa_members.activity_type': { column: 'activity_type', maxLength: 50 },
  'kpa_members.pharmacy_name': { column: 'pharmacy_name', maxLength: 200 },
  'kpa_members.pharmacy_address': { column: 'pharmacy_address', maxLength: 300 },
};

export type SyncFailureCode =
  | 'REPORT_NOT_FOUND'
  | 'REPORT_NOT_SUBMITTED'
  | 'TEMPLATE_NOT_FOUND'
  | 'MEMBER_LEDGER_NOT_FOUND'
  | 'SYNC_VALUE_INVALID';

export class AnnualReportSyncError extends Error {
  constructor(
    readonly code: SyncFailureCode,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export interface SyncResult {
  reportId: string;
  /** 이번 호출이 실제로 원장을 바꿨는가 (이미 반영된 신고서면 false) */
  applied: boolean;
  alreadySynced: boolean;
  record: AnnualReportSyncRecord;
}

export class AnnualReportMembershipSyncService {
  /** 문자열 비교용 정규화. null / undefined / '' 는 모두 "값 없음"으로 본다. */
  private static norm(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
  }

  /**
   * 제출본을 원장에 반영한다.
   *
   * `organizationId` 는 호출자(라우터의 resolveBranch + requireBranchScope)가 확정한
   * 분회다. 조회 조건에 반드시 포함해 **다른 분회의 신고서를 건드릴 수 없게** 한다
   * (CLAUDE.md §7 Guard Rule 1 — UUID 단독 조회 금지).
   */
  static async syncReport(params: {
    reportId: string;
    organizationId: string;
    /** 반영을 실행한 운영자. 원장 대상이 아니라 기록용이다. */
    actorUserId: string;
  }): Promise<SyncResult> {
    const { reportId, organizationId, actorUserId } = params;

    const repo = AppDataSource.getRepository(AnnualReport);
    const report = await repo.findOne({ where: { id: reportId, organization_id: organizationId } });

    if (!report) {
      throw new AnnualReportSyncError('REPORT_NOT_FOUND', '신고서를 찾을 수 없습니다.', 404);
    }
    if (report.status !== 'submitted') {
      throw new AnnualReportSyncError(
        'REPORT_NOT_SUBMITTED',
        '제출 완료된 신고서만 회원정보에 반영할 수 있습니다.',
        409,
      );
    }

    // 이미 반영된 신고서는 다시 쓰지 않는다 (원칙 6). 기존 기록을 덮어쓰지도 않는다.
    if (report.synced_to_membership && report.synced_changes) {
      return { reportId: report.id, applied: false, alreadySynced: true, record: report.synced_changes };
    }

    // 반영 기준은 **제출 당시 양식**이다. 현재 active 양식이 아니다 (스냅샷 원칙).
    const template = await AnnualReportService.getTemplateById(report.template_id);
    if (!template) {
      throw new AnnualReportSyncError('TEMPLATE_NOT_FOUND', '제출 당시 양식을 찾을 수 없습니다.', 404);
    }

    const syncFields = AnnualReportService.fields(template).filter(
      (f) => f.syncToMembership === true && typeof f.syncTarget === 'string' && f.syncTarget.length > 0,
    );

    const rows: Array<Record<string, unknown>> = await AppDataSource.query(
      `SELECT id, user_id, license_number, activity_type, pharmacy_name, pharmacy_address
         FROM kpa_members WHERE user_id = $1 LIMIT 1`,
      [report.user_id],
    );
    const member = rows[0];
    if (!member) {
      throw new AnnualReportSyncError(
        'MEMBER_LEDGER_NOT_FOUND',
        '이 회원의 약사회 회원정보가 없어 반영할 수 없습니다.',
        404,
      );
    }

    const changes: AnnualReportSyncChange[] = [];
    const skipped: AnnualReportSyncSkip[] = [];
    const invalid: Array<{ key: string; reason: string; message: string }> = [];

    for (const f of syncFields) {
      const target = f.syncTarget as string;
      const allowed = SYNC_TARGET_ALLOWLIST[target];

      // Template 이 허용되지 않은 대상을 가리키면 **쓰지 않는다**. 조용히 넘기되 기록은 남긴다.
      if (!allowed) {
        skipped.push({ key: f.key, target, reason: 'TARGET_NOT_ALLOWED' });
        continue;
      }

      const after = this.norm(report.values[f.key]);

      // 빈 값으로 원장을 지우지 않는다. sync 대상 4필드는 모두 required 라
      // 정상 제출본에서는 발생하지 않는다.
      if (after === null) {
        skipped.push({ key: f.key, target, reason: 'EMPTY_VALUE' });
        continue;
      }

      // 원장이 받을 수 없는 값이면 조용히 버리지 않고 전체를 실패시킨다 —
      // 제출된 값이 소리 없이 사라지는 편이 더 위험하다.
      if (after.length > allowed.maxLength) {
        invalid.push({
          key: f.key,
          reason: 'TOO_LONG',
          message: `${f.label}이(가) 회원정보 저장 한도(${allowed.maxLength}자)를 초과합니다.`,
        });
        continue;
      }
      if (this.violatesOptions(f, after)) {
        invalid.push({
          key: f.key,
          reason: 'NOT_IN_OPTIONS',
          message: `${f.label}의 값이 회원정보가 허용하는 선택지가 아닙니다.`,
        });
        continue;
      }

      const before = this.norm(member[allowed.column]);
      if (before === after) {
        skipped.push({ key: f.key, target, reason: 'UNCHANGED' });
        continue;
      }

      changes.push({ key: f.key, target, before, after });
    }

    if (invalid.length) {
      throw new AnnualReportSyncError(
        'SYNC_VALUE_INVALID',
        '회원정보에 반영할 수 없는 값이 있습니다.',
        422,
        { issues: invalid },
      );
    }

    const record: AnnualReportSyncRecord = {
      syncedAt: new Date().toISOString(),
      syncedBy: actorUserId,
      templateId: report.template_id,
      changes,
      skipped,
    };

    /**
     * 원장 update 와 신고서 플래그를 **하나의 트랜잭션**으로 묶는다.
     * 원장 쓰기가 실패하면 `synced_to_membership` 도 서지 않는다 (원칙 8 — 부분 반영 금지).
     */
    await AppDataSource.transaction(async (manager: EntityManager) => {
      if (changes.length) {
        const sets: string[] = [];
        const args: unknown[] = [];
        for (const c of changes) {
          const col = SYNC_TARGET_ALLOWLIST[c.target].column; // allowlist 통과분만 도달한다
          args.push(c.after);
          sets.push(`"${col}" = $${args.length}`);
        }
        args.push(report.user_id);
        // 대상은 언제나 신고서 주인이다. 요청자(운영자) id 를 쓰지 않는다.
        await manager.query(
          `UPDATE kpa_members SET ${sets.join(', ')}, updated_at = now() WHERE user_id = $${args.length}`,
          args,
        );
      }

      // values(제출 스냅샷)는 건드리지 않는다 — sync 컬럼만 쓴다.
      await manager.query(
        `UPDATE annual_reports
            SET synced_to_membership = true, synced_changes = $1::jsonb, updated_at = now()
          WHERE id = $2 AND organization_id = $3`,
        [JSON.stringify(record), report.id, organizationId],
      );
    });

    return { reportId: report.id, applied: true, alreadySynced: false, record };
  }

  /** Template 이 선택지를 정의한 필드는 그 선택지 안의 값만 원장에 넘긴다. */
  private static violatesOptions(f: AnnualReportFieldDefinition, value: string): boolean {
    if (!f.options?.length) return false;
    return !f.options.some((o) => String(o.value) === value);
  }
}
