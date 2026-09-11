/**
 * AnnualReportMembershipSyncService — 제출된 신상신고 → 회원 canonical 원장 반영
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-MEMBERSHIP-SYNC-V1
 * WO-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1 (원장 대상 전환)
 *
 * 이 파일이 **쓰기 경계**다. 다음 4가지를 서버에서만 결정한다.
 *
 *   1) 무엇을 쓸 수 있는가 — Template 의 `syncToMembership` + `syncTarget` 을 읽되,
 *      **허용 대상 allowlist 를 통과한 것만** 쓴다. Template 이 바뀌어도 쓰기 범위는
 *      코드가 정한 4개 컬럼을 벗어나지 않는다.
 *   2) 누구의 원장에 쓰는가 — 언제나 `report.user_id` 다. 요청자(운영자)가 아니다.
 *   3) 언제 쓸 수 있는가 — `status='approved'` 이고 아직 반영되지 않은 신고서만.
 *   4) 무엇이 바뀌었는가 — 실제로 값이 달라진 항목만 update 하고 전/후를 기록한다.
 *
 * 원장(= 쓰기 대상)은 두 곳이다:
 *   - 면허번호 · 직역   → `kpa_pharmacist_profiles` (개인 고유 자격, canonical SSOT)
 *   - 근무처명 · 주소   → `branch_memberships` 의 그 분회 active 행 (분회별 속성)
 *
 * `kpa_members` 는 **read fallback 전용**이다 — profile/소속 행에 값이 없을 때 "이전 값(before)"
 * 을 보여주는 데만 쓰고, 어떤 경우에도 쓰지 않는다. 2026 양식이 가리키는 legacy 식별자
 * (`kpa_members.*`)는 아래 allowlist 에서 canonical 대상으로 alias 된다 — 양식 row 는 바꾸지 않는다.
 *
 * 하지 않는 것:
 *   - 제출 스냅샷(`values`)을 수정하지 않는다. 원장 값으로 신고서를 덮어쓰지 않는다(원칙 9·10).
 *   - profile 이 없을 때 만들지 않는다. profile 생성은 가입·승인·전입 경계(PharmacistProfilePromotionService)다.
 *   - 다른 사용자가 이미 가진 면허번호를 자동으로 덮어쓰지 않는다 → `SYNC_CONFLICT`.
 *   - association / member-only 필드를 원장에 반영하지 않는다 (원칙 3).
 *   - `personal.university` 는 sync 대상이 아니다 — 원장의 대학명은 "약대생 재학 대학명"이고
 *     신고서의 "출신 대학교"와 의미가 다르다.
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
import type {
  AnnualReportFieldDefinition,
  AnnualReportTemplate,
} from '../../routes/kpa-branch/entities/annual-report-template.entity.js';

type SyncLedgerTable = 'kpa_pharmacist_profiles' | 'branch_memberships';

interface SyncTargetSpec {
  table: SyncLedgerTable;
  column: string;
  /** 합성 원장(`MemberLedger`)에서 이 대상의 현재값을 읽는 키 */
  ledgerKey: 'license_number' | 'activity_type' | 'workplace_name' | 'workplace_address';
  maxLength: number;
}

const PROFILE_LICENSE: SyncTargetSpec = {
  table: 'kpa_pharmacist_profiles', column: 'license_number', ledgerKey: 'license_number', maxLength: 100,
};
const PROFILE_ACTIVITY: SyncTargetSpec = {
  table: 'kpa_pharmacist_profiles', column: 'activity_type', ledgerKey: 'activity_type', maxLength: 50,
};
const MEMBERSHIP_WORKPLACE_NAME: SyncTargetSpec = {
  table: 'branch_memberships', column: 'workplace_name', ledgerKey: 'workplace_name', maxLength: 200,
};
const MEMBERSHIP_WORKPLACE_ADDRESS: SyncTargetSpec = {
  table: 'branch_memberships', column: 'workplace_address', ledgerKey: 'workplace_address', maxLength: 300,
};

/**
 * 쓰기 허용 대상 — canonical 4개 컬럼뿐이다.
 * Template 의 syncTarget 이 이 목록에 없으면 **쓰지 않고 건너뛴다**.
 * `kpa_members.*` 식별자는 2026 양식이 이미 가리키는 legacy alias 다 — 같은 canonical 대상으로
 * 해석하되 `kpa_members` 에는 쓰지 않는다. 신규 양식은 canonical 식별자를 쓴다.
 * maxLength 는 실제 컬럼 정의와 같은 값이다 (varchar 초과를 DB 오류가 아니라 명시적 422 로 돌려주기 위해서다).
 */
const SYNC_TARGET_ALLOWLIST: Record<string, SyncTargetSpec> = {
  'kpa_pharmacist_profiles.license_number': PROFILE_LICENSE,
  'kpa_pharmacist_profiles.activity_type': PROFILE_ACTIVITY,
  'branch_memberships.workplace_name': MEMBERSHIP_WORKPLACE_NAME,
  'branch_memberships.workplace_address': MEMBERSHIP_WORKPLACE_ADDRESS,
  // legacy alias (2026 양식) — 데이터 변경 없이 canonical 로 해석
  'kpa_members.license_number': PROFILE_LICENSE,
  'kpa_members.activity_type': PROFILE_ACTIVITY,
  'kpa_members.pharmacy_name': MEMBERSHIP_WORKPLACE_NAME,
  'kpa_members.pharmacy_address': MEMBERSHIP_WORKPLACE_ADDRESS,
};

/**
 * 검수·반영이 비교하는 합성 원장. profile 과 그 분회 active 소속 행을 합친 뷰이며,
 * 값이 비어 있으면 `kpa_members` 를 read fallback 으로 채운다 (source 로 출처를 남긴다).
 */
export interface MemberLedger {
  user_id: string;
  /** canonical profile 행. null 이면 면허·직역 대상은 쓸 수 없다 */
  profile_id: string | null;
  /** 그 분회의 active 소속 행. null 이면 근무처 대상은 쓸 수 없다 */
  membership_id: string | null;
  license_number: string | null;
  activity_type: string | null;
  workplace_name: string | null;
  workplace_address: string | null;
  source: {
    license: 'profile' | 'kpa_members' | null;
    workplace: 'branch_membership' | 'kpa_members' | null;
  };
}

export type SyncFailureCode =
  | 'REPORT_NOT_FOUND'
  | 'REPORT_NOT_APPROVED'
  | 'TEMPLATE_NOT_FOUND'
  | 'MEMBER_LEDGER_NOT_FOUND'
  | 'SYNC_TARGET_UNAVAILABLE'
  | 'SYNC_VALUE_INVALID'
  | 'SYNC_CONFLICT';

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
    if (report.status !== 'approved') {
      throw new AnnualReportSyncError(
        'REPORT_NOT_APPROVED',
        '승인된 신고서만 회원정보에 반영할 수 있습니다.',
        409,
        { status: report.status },
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

    const member = await this.loadMemberLedger(report.user_id, organizationId);
    if (!member) {
      throw new AnnualReportSyncError('MEMBER_LEDGER_NOT_FOUND', this.unavailableReason(null) as string, 404);
    }

    const { changes, skipped, invalid } = this.diffAgainstLedger(template, report.values, member);

    if (invalid.length) {
      throw new AnnualReportSyncError(
        'SYNC_VALUE_INVALID',
        '회원정보에 반영할 수 없는 값이 있습니다.',
        422,
        { issues: invalid },
      );
    }

    // 변경 항목이 가리키는 원장 행이 없으면 부분 반영하지 않고 전체를 거절한다 (원칙 8)
    const missing = changes.filter((c) => {
      const spec = SYNC_TARGET_ALLOWLIST[c.target];
      return (spec.table === 'kpa_pharmacist_profiles' && !member.profile_id)
        || (spec.table === 'branch_memberships' && !member.membership_id);
    });
    if (missing.length) {
      throw new AnnualReportSyncError(
        'SYNC_TARGET_UNAVAILABLE',
        this.unavailableReason(member) ?? '반영할 원장 행이 없습니다.',
        409,
        { keys: missing.map((m) => m.key) },
      );
    }

    const record: AnnualReportSyncRecord = {
      syncedAt: new Date().toISOString(),
      syncedBy: actorUserId,
      templateId: report.template_id,
      changes,
      skipped,
    };

    try {
      await this.applyInTransaction(report.id, member, organizationId, changes, record);
    } catch (err) {
      /**
       * 면허번호 충돌은 서버 결함이 아니라 운영상의 충돌이다 — 이미 다른 회원의 profile 이
       * 같은 면허번호를 갖고 있는 경우다. 자동으로 덮어쓰지 않고 409 로 원인을 드러낸다.
       * 트랜잭션이 롤백됐으므로 원장도 신고서 플래그도 그대로다.
       */
      if (err instanceof AnnualReportSyncError) throw err;
      if ((err as { code?: string })?.code === '23505') {
        throw new AnnualReportSyncError(
          'SYNC_CONFLICT',
          '이미 다른 회원이 사용 중인 값이 있어 회원정보에 반영할 수 없습니다.',
          409,
          { constraint: (err as { constraint?: string }).constraint ?? null },
        );
      }
      throw err;
    }

    return { reportId: report.id, applied: true, alreadySynced: false, record };
  }

  /**
   * 원장 update 와 신고서 플래그를 **하나의 트랜잭션**으로 묶는다.
   * 원장 쓰기가 실패하면 `synced_to_membership` 도 서지 않는다 (원칙 8 — 부분 반영 금지).
   */
  private static async applyInTransaction(
    reportId: string,
    member: MemberLedger,
    organizationId: string,
    changes: AnnualReportSyncChange[],
    record: AnnualReportSyncRecord,
  ): Promise<void> {
    await AppDataSource.transaction(async (manager: EntityManager) => {
      const byTable: Record<SyncLedgerTable, Array<{ column: string; after: unknown }>> = {
        kpa_pharmacist_profiles: [],
        branch_memberships: [],
      };
      for (const c of changes) {
        const spec = SYNC_TARGET_ALLOWLIST[c.target]; // allowlist 통과분만 도달한다
        byTable[spec.table].push({ column: spec.column, after: c.after });
      }

      const profileSets = byTable.kpa_pharmacist_profiles;
      if (profileSets.length && member.profile_id) {
        const license = profileSets.find((p) => p.column === 'license_number');
        if (license) {
          // 다른 사용자의 canonical 면허번호를 자동으로 가져오지 않는다 (테이블에 unique 제약이 없어 여기서 판정)
          const taken: Array<{ user_id: string }> = await manager.query(
            `SELECT user_id FROM kpa_pharmacist_profiles
              WHERE license_number = $1 AND user_id <> $2 LIMIT 1`,
            [license.after, member.user_id],
          );
          if (taken.length) {
            throw new AnnualReportSyncError(
              'SYNC_CONFLICT',
              '이미 다른 회원이 사용 중인 면허번호라 회원정보에 반영할 수 없습니다.',
              409,
              { constraint: 'kpa_pharmacist_profiles.license_number' },
            );
          }
        }
        const sets: string[] = [];
        const args: unknown[] = [];
        for (const p of profileSets) {
          args.push(p.after);
          sets.push(`"${p.column}" = $${args.length}`);
        }
        args.push(member.profile_id, member.user_id);
        // 대상은 언제나 신고서 주인의 profile 이다. 요청자(운영자) id 를 쓰지 않는다.
        await manager.query(
          `UPDATE kpa_pharmacist_profiles SET ${sets.join(', ')}, updated_at = now()
            WHERE id = $${args.length - 1} AND user_id = $${args.length}`,
          args,
        );
      }

      const membershipSets = byTable.branch_memberships;
      if (membershipSets.length && member.membership_id) {
        const sets: string[] = [];
        const args: unknown[] = [];
        for (const p of membershipSets) {
          args.push(p.after);
          sets.push(`"${p.column}" = $${args.length}`);
        }
        args.push(member.membership_id, member.user_id, organizationId);
        // 그 분회의 active 소속 행에만 쓴다 — 다른 분회 행을 건드리지 않는다
        await manager.query(
          `UPDATE branch_memberships SET ${sets.join(', ')}, updated_at = now()
            WHERE id = $${args.length - 2} AND user_id = $${args.length - 1}
              AND organization_id = $${args.length} AND status = 'active'`,
          args,
        );
      }

      // values(제출 스냅샷)는 건드리지 않는다 — sync 컬럼만 쓴다.
      await manager.query(
        `UPDATE annual_reports
            SET synced_to_membership = true, synced_changes = $1::jsonb, updated_at = now()
          WHERE id = $2 AND organization_id = $3`,
        [JSON.stringify(record), reportId, organizationId],
      );
    });
  }

  /**
   * 합성 원장을 읽는다. allowlist 가 가리키는 컬럼만 SELECT 한다 —
   * 검수 화면이 회원 원장 전체를 끌어오지 않게 하기 위해서다.
   *
   * profile 도 그 분회 active 소속도 없으면 null (비교·반영할 canonical 원장이 없다).
   * `kpa_members` 만 있는 회원도 null 이다 — fallback 은 값을 채울 뿐 원장을 대신하지 않는다.
   * 축별로: profile 값이 비어 있으면 `kpa_members` 의 면허·직역을, 소속 행 값이 비어 있으면
   * `kpa_members` 의 약국명·주소를 "이전 값"으로 쓴다 (첫 sync 때 실제 변경만 드러나게).
   */
  static async loadMemberLedger(userId: string, organizationId: string): Promise<MemberLedger | null> {
    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT u.id AS user_id,
              p.id  AS profile_id, p.license_number AS p_license, p.activity_type AS p_activity,
              bm.id AS membership_id, bm.workplace_name AS bm_name, bm.workplace_address AS bm_address,
              km.license_number AS km_license, km.activity_type AS km_activity,
              km.pharmacy_name AS km_name, km.pharmacy_address AS km_address
         FROM users u
         LEFT JOIN kpa_pharmacist_profiles p ON p.user_id = u.id
         LEFT JOIN branch_memberships bm
                ON bm.user_id = u.id AND bm.organization_id = $2 AND bm.status = 'active'
         LEFT JOIN kpa_members km ON km.user_id = u.id
        WHERE u.id = $1
        LIMIT 1`,
      [userId, organizationId],
    );
    const r = rows[0];
    if (!r) return null;
    if (!r.profile_id && !r.membership_id) return null;

    const profileHasValue = r.p_license != null || r.p_activity != null;
    const membershipHasValue = r.bm_name != null || r.bm_address != null;
    const kmHasLicense = r.km_license != null || r.km_activity != null;
    const kmHasWorkplace = r.km_name != null || r.km_address != null;

    const licenseFromProfile = !!r.profile_id && (profileHasValue || !kmHasLicense);
    const workplaceFromMembership = !!r.membership_id && (membershipHasValue || !kmHasWorkplace);

    return {
      user_id: r.user_id,
      profile_id: r.profile_id ?? null,
      membership_id: r.membership_id ?? null,
      license_number: licenseFromProfile ? (r.p_license ?? null) : (r.km_license ?? null),
      activity_type: licenseFromProfile ? (r.p_activity ?? null) : (r.km_activity ?? null),
      workplace_name: workplaceFromMembership ? (r.bm_name ?? null) : (r.km_name ?? null),
      workplace_address: workplaceFromMembership ? (r.bm_address ?? null) : (r.km_address ?? null),
      source: {
        license: licenseFromProfile ? 'profile' : (kmHasLicense ? 'kpa_members' : null),
        workplace: workplaceFromMembership ? 'branch_membership' : (kmHasWorkplace ? 'kpa_members' : null),
      },
    };
  }

  /**
   * 비교·반영이 불가능한 이유 문구. 화면(검수·콘솔)과 sync 오류가 같은 문장을 쓴다.
   * null 이면 반영 가능하다.
   */
  static unavailableReason(member: MemberLedger | null): string | null {
    if (!member) return '약사 프로필과 분회 소속이 없어 회원정보와 비교할 수 없습니다.';
    if (!member.profile_id) return '약사 프로필이 없어 면허번호·직역을 반영할 수 없습니다.';
    if (!member.membership_id) return '이 분회의 소속 정보가 없어 근무처를 반영할 수 없습니다.';
    return null;
  }

  /**
   * 제출값과 현재 원장을 비교한다. **읽기 전용**이며 아무것도 쓰지 않는다.
   *
   * 검수 화면(W4)과 실제 반영(W3)이 **같은 판정**을 쓰게 하려고 분리했다.
   * 화면이 따로 계산하면 "화면엔 2건 변경인데 반영은 1건" 같은 어긋남이 생긴다.
   */
  static diffAgainstLedger(
    template: AnnualReportTemplate,
    values: Record<string, unknown>,
    member: MemberLedger,
  ): {
    changes: AnnualReportSyncChange[];
    skipped: AnnualReportSyncSkip[];
    invalid: Array<{ key: string; reason: string; message: string }>;
  } {
    const syncFields = AnnualReportService.fields(template).filter(
      (f) => f.syncToMembership === true && typeof f.syncTarget === 'string' && f.syncTarget.length > 0,
    );

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

      const after = this.norm(values[f.key]);

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

      const before = this.norm(member[allowed.ledgerKey]);
      if (before === after) {
        skipped.push({ key: f.key, target, reason: 'UNCHANGED' });
        continue;
      }

      changes.push({ key: f.key, target, before, after });
    }

    return { changes, skipped, invalid };
  }

  /** Template 이 선택지를 정의한 필드는 그 선택지 안의 값만 원장에 넘긴다. */
  private static violatesOptions(f: AnnualReportFieldDefinition, value: string): boolean {
    if (!f.options?.length) return false;
    return !f.options.some((o) => String(o.value) === value);
  }

  /**
   * 선택지 필드의 raw code 를 양식 label 로 바꾼다 (검수 화면 표시용).
   * 선택지가 없는 필드나 목록에 없는 값은 그대로 돌려준다 — 값을 숨기지 않는다.
   */
  static labelFor(f: AnnualReportFieldDefinition | undefined, value: unknown): string | null {
    const v = this.norm(value);
    if (v === null) return null;
    const hit = f?.options?.find((o) => String(o.value) === v);
    return hit ? String(hit.label) : v;
  }
}
