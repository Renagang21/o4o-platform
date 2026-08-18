/**
 * PharmacyHubStoreProvisioningService — 약국 경영자 승인 시 매장 주체 생성
 *
 * WO-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1
 * 선행 IR: docs/investigations/IR-O4O-PHARMACY-HUB-STORE-MANAGEMENT-BASELINE-AND-GAP-V1.md §6-1
 *
 * 문제:
 *   Pharmacy-Hub 승인은 service_memberships(active) + users + role_assignments 만 만들고
 *   organizations / organization_members / platform_store_slugs 를 만들지 않았다.
 *   공통 매장 API 는 전부 resolveStoreAccess() → organization_members 로 organizationId 를
 *   얻으므로, 이 row 가 없는 Pharmacy-Hub 경영자는 매장 기능 전량이 실행 불가였다.
 *
 * SSOT (WO §원칙):
 *   매장 정보      = organizations
 *   매장 소유 관계 = organization_members
 *   서비스 가입    = service_memberships
 *   서비스 역할    = role_assignments
 *   공개 매장 slug = platform_store_slugs
 *   → Pharmacy-Hub 전용 조직/매장 테이블을 만들지 않는다.
 *
 * 조직 식별 전략 (재사용 우선):
 *   1) 사용자가 이미 소속된 조직(owner/admin/manager, left_at IS NULL) 이 정확히 1개면 그것을 쓴다.
 *      resolveStoreAccess() 가 바로 그 row 를 읽으므로 재사용이 곧 정합이다.
 *   2) 0개이고 businessInfo.businessNumber 가 있으면 동일 사업자번호 조직을 찾아 재사용한다.
 *   3) 그래도 없으면 신규 생성. code = `ph-pharm-{userId 앞 12 hex}` — GlycoPharm 선례
 *      (`gp-pharm-{userId 12 hex}`) 와 동일한 **사용자 스코프 결정적 코드**다.
 *      Pharmacy-Hub 가입 폼은 사업자번호를 받지 않으므로(약국명·연락처만) KPA 의
 *      `kpa-pharm-{businessNumber}` 규칙을 쓸 수 없다. 결정적 코드이므로 재실행해도
 *      ensureOrganization 의 ON CONFLICT (code) 가 동일 row 를 반환한다(멱등).
 *
 * 보류(HOLD) 정책 — 추측으로 매장을 만들지 않는다:
 *   - 소속 조직 후보가 2개 이상        → AMBIGUOUS_ORGANIZATION
 *   - 동일 사업자번호 조직이 2개 이상  → DUPLICATE_BUSINESS_NUMBER
 *   - 약국명이 없어 조직명을 못 정함   → MISSING_STORE_NAME
 *   보류는 실패가 아니라 "사람이 판단할 대상"이며, 승인 자체를 되돌리지 않는다.
 *
 * 실패 격리:
 *   본 서비스의 예외는 호출 측(승인 컨트롤러)에서 삼켜야 한다. 매장 주체 생성 실패가
 *   회원 승인을 롤백해서는 안 된다 (KPA member.controller.ts 선례와 동일 정책).
 */

import type { DataSource, QueryRunner } from 'typeorm';
import { StoreSlugService, generateSlugFromName } from '@o4o/platform-core/store-identity';
import { organizationOpsService } from '../../modules/organization/services/organization-ops.service.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import logger from '../../utils/logger.js';
// WO-O4O-STORE-OWNER-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1:
//   organization_members 매장 역할 집합은 공통 SSOT 재사용 (로컬 정의 제거)
import { STORE_MEMBER_ROLES } from '../../utils/store-organization.resolver.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;
/** 매장 주체를 갖는 유일한 Pharmacy-Hub 역할. supplier/operator 는 매장이 없다. */
const STORE_OWNER_ROLE = `${SERVICE_KEY}:store_owner`;
/** organizations.type — KPA/GlycoPharm 약국 조직과 동일 값 */
const ORG_TYPE = 'pharmacy';

export type ProvisionOutcome =
  | 'created'   // 조직을 새로 만들었다
  | 'reused'    // 기존 조직을 재사용했다
  | 'noop'      // 이미 완비돼 있어 바뀐 것이 없다
  | 'held'      // 사람 판단이 필요해 보류했다
  | 'skipped';  // 대상이 아니다 (store_owner 아님 / membership 미활성)

export type ProvisionHoldReason =
  | 'AMBIGUOUS_ORGANIZATION'
  | 'DUPLICATE_BUSINESS_NUMBER'
  | 'MISSING_STORE_NAME'
  | 'SLUG_UNRESOLVABLE'
  // WO-PHARMACY-HUB-STORE-PROVISIONING-ORGANIZATION-REUSE-GUARD-V1 (신규 3종)
  | 'ORGANIZATION_TYPE_NOT_COMPATIBLE'
  | 'ORGANIZATION_HAS_OTHER_SERVICE_ENROLLMENT'
  | 'ORGANIZATION_HAS_SERVICE_NEUTRAL_ASSETS';

/**
 * WO-PHARMACY-HUB-STORE-PROVISIONING-ORGANIZATION-REUSE-GUARD-V1
 *
 * Pharmacy-Hub 약국으로 **자동 재사용**할 수 있는 organizations.type allowlist.
 *
 * 프로덕션 실측(2026-08-09): type 은 pharmacy(11) · supplier(7) · store(2) ·
 * association(1) · division(1) 다섯 가지이고, **PH enrollment 를 가진 조직은 전부 `pharmacy`** 다
 * (신규 생성 경로도 `ORG_TYPE='pharmacy'` 로 만든다).
 * 약국을 나타내는 canonical type 이 둘 이상 충돌하지 않음을 확인했으므로 allowlist 는 1개다.
 * 추측으로 확대하지 않는다 — 새 type 을 넣으려면 실데이터 근거가 필요하다.
 */
const REUSABLE_ORG_TYPES = ['pharmacy'] as const;

/**
 * **실효적으로 service-neutral 한** 매장 자산 — 즉 조회 경로가 `organization_id` 만 보고
 * service 축으로 거르지 않아, 조직에 PH enrollment 만 추가해도 그대로 PH 화면에 유입되는 것들.
 *
 * ⚠️ "service_key 컬럼이 있다" 와 "실제로 service 로 거른다" 는 다르다. 컬럼 유무가 아니라
 *    **조회 경로**를 기준으로 확정했다 (2026-08-09 조사):
 *
 *   store_qr_codes                 organization_id 단독            (컬럼 자체가 org 뿐)
 *   store_local_products           organization_id 단독
 *   store_execution_assets         organization_id 단독
 *   store_playlists                organization_id 단독
 *   store_tablets                  organization_id 단독
 *   kpa_store_contents             organization_id 단독
 *   organization_product_listings  service_key 컬럼은 있으나 조회가 org 만 필터 → 실효 neutral
 *   store_tablet_screen_sets       service_key 컬럼은 있으나 조회가 org+origin 만 필터 → 실효 neutral
 *
 * 반대로 store_pops · store_blog_posts 는 조회가 (store_id, service_key) 복합으로 걸러
 * 다른 서비스 자산이 유입되지 않으므로 여기 넣지 않는다.
 */
/**
 * 재사용 안전성 판정 결과.
 *
 * api-server tsconfig 는 strictNullChecks 가 꺼져 있어 `{safe:true}|{safe:false,...}` 유니온이
 * `if (!r.safe)` 로 좁혀지지 않는다. 선택 필드를 가진 단일 형태로 두고 safe 로만 분기한다.
 */
interface ReuseSafetyResult {
  safe: boolean;
  hold?: ProvisionHoldReason;
  detail?: string;
}

const SERVICE_NEUTRAL_ASSET_TABLES: ReadonlyArray<{ table: string; column: string; label: string }> = [
  { table: 'store_qr_codes', column: 'organization_id', label: 'QR' },
  { table: 'store_local_products', column: 'organization_id', label: '매장 자체 상품' },
  { table: 'store_execution_assets', column: 'organization_id', label: '자료함' },
  { table: 'store_playlists', column: 'organization_id', label: '사이니지 재생목록' },
  { table: 'store_tablets', column: 'organization_id', label: '태블릿' },
  { table: 'kpa_store_contents', column: 'organization_id', label: '매장 콘텐츠' },
  { table: 'organization_product_listings', column: 'organization_id', label: '경영활용 제품' },
  { table: 'store_tablet_screen_sets', column: 'organization_id', label: '화면 세트' },
];

export interface ProvisionResult {
  userId: string;
  outcome: ProvisionOutcome;
  organizationId: string | null;
  organizationCode: string | null;
  slug: string | null;
  holdReason?: ProvisionHoldReason;
  /** 사람이 읽는 설명 — 보류·skip 사유 */
  detail?: string;
  /** 이번 실행이 실제로 만든 것 (멱등 재실행 시 전부 false) */
  created: {
    organization: boolean;
    member: boolean;
    enrollment: boolean;
    role: boolean;
    slug: boolean;
  };
}

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  businessInfo: Record<string, any> | null;
}

function emptyCreated(): ProvisionResult['created'] {
  return { organization: false, member: false, enrollment: false, role: false, slug: false };
}

/** userId(UUID) → 하이픈 제거 후 앞 12 hex. GlycoPharm `gp-pharm-` 규칙과 동일 형태. */
function orgCodeForUser(userId: string): string {
  return `ph-pharm-${userId.replace(/-/g, '').substring(0, 12)}`;
}

function digitsOnly(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '');
}

/**
 * slug base 정규화.
 *
 * WO-O4O-STORE-SLUG-CANONICAL-CONTRACT-HARDENING-V1 §4:
 *   과거에는 공통 `generateSlugFromName` 이 `\w` 를 보존해 밑줄(_)을 통과시켰고,
 *   `validateSlug` 가 그 결과를 거부해 base 도 `-1`…`-100` 접미사도 전부 INVALID_CHARACTERS
 *   가 되어 `generateUniqueSlug` 가 100회 시도 후 throw 했다. 그래서 여기서 별도 정규화를
 *   중복 구현했었다. **정규화 규칙은 이제 공통 유틸이 소유한다**(중복 규칙 제거).
 *
 *   이 함수에 남는 책임은 PharmacyHub 고유의 fallback 뿐이다 —
 *   정규화 결과가 최소 길이(3) 미만이면 조직 code(`ph-pharm-…`, 항상 유효)를 쓴다.
 */
function slugBase(name: string, fallback: string): string {
  const normalized = generateSlugFromName(name);
  return normalized.length >= 3 ? normalized : fallback;
}

export class PharmacyHubStoreProvisioningService {
  /**
   * 모든 DB 접근은 주입받은 dataSource 로만 한다 (AppDataSource 전역 참조 금지).
   * 덕분에 backfill 스크립트가 **필요 entity 만 등록한 경량 DataSource** 로 같은 로직을
   * 재사용할 수 있다 — 로직 이중화 없이 실행 경로만 분리된다.
   */
  constructor(private readonly dataSource: DataSource) {}

  /**
   * 승인된 Pharmacy-Hub 약국 경영자의 매장 주체를 보장한다 (멱등).
   *
   * @param userId          대상 사용자
   * @param approvedByUserId role_assignments.assigned_by 에 기록할 처리자 (없으면 null)
   * @param dryRun          true 면 어떤 write 도 하지 않고 예상 결과만 계산한다
   */
  async provisionStoreSubject(
    userId: string,
    approvedByUserId: string | null,
    dryRun = false,
  ): Promise<ProvisionResult> {
    const base: ProvisionResult = {
      userId,
      outcome: 'skipped',
      organizationId: null,
      organizationCode: null,
      slug: null,
      created: emptyCreated(),
    };

    // ── 0. 대상 자격 확인 — active store_owner membership 만 매장을 갖는다 ──
    const [membership] = await this.dataSource.query(
      `SELECT role, status FROM service_memberships
       WHERE user_id = $1 AND service_key = $2
       LIMIT 1`,
      [userId, SERVICE_KEY],
    );

    if (!membership) {
      return { ...base, detail: 'Pharmacy-Hub membership 이 없습니다.' };
    }
    if (membership.status !== 'active') {
      return { ...base, detail: `membership status='${membership.status}' — active 아님.` };
    }
    if (membership.role !== STORE_OWNER_ROLE) {
      return { ...base, detail: `role='${membership.role}' — 매장 주체 대상 아님.` };
    }

    const [user] = (await this.dataSource.query(
      `SELECT id, name, email, "businessInfo" FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    )) as UserRow[];

    if (!user) {
      return { ...base, detail: '사용자 레코드를 찾을 수 없습니다.' };
    }

    const biz = (user.businessInfo && typeof user.businessInfo === 'object') ? user.businessInfo : {};
    const storeName =
      (typeof biz.businessName === 'string' && biz.businessName.trim()) ||
      (typeof biz.companyName === 'string' && biz.companyName.trim()) ||
      '';
    const businessNumber = digitsOnly(biz.businessNumber);

    // ── 1. 조직 결정: 재사용 우선 ──
    const resolved = await this.resolveOrganization(userId, businessNumber, storeName);
    if (resolved.hold) {
      return {
        ...base,
        outcome: 'held',
        holdReason: resolved.hold,
        detail: resolved.detail,
        organizationId: resolved.organizationId ?? null,
      };
    }

    // ── 2. dry-run: write 없이 예상 결과만 계산한다 ──
    if (dryRun) {
      const slugPreview = resolved.organizationId
        ? await this.findSlug(resolved.organizationId)
        : null;
      return {
        ...base,
        outcome: resolved.organizationId ? (slugPreview ? 'noop' : 'reused') : 'created',
        organizationId: resolved.organizationId,
        organizationCode: resolved.organizationCode ?? (resolved.organizationId ? null : orgCodeForUser(userId)),
        slug: slugPreview,
        detail: resolved.organizationId
          ? `기존 조직 재사용 예정 (${resolved.reason})`
          : `신규 조직 생성 예정 (code=${orgCodeForUser(userId)}, name=${storeName})`,
      };
    }

    if (!resolved.organizationId && !storeName) {
      return {
        ...base,
        outcome: 'held',
        holdReason: 'MISSING_STORE_NAME',
        detail: '약국명(businessInfo.businessName)이 비어 있어 조직명을 정할 수 없습니다.',
      };
    }

    // organizationOpsService 는 queryRunner 미지정 시 전역 AppDataSource 로 떨어진다.
    // 주입 dataSource 스코프를 유지하기 위해 항상 queryRunner 를 명시 전달한다.
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      return await this.writeStoreSubject(runner, {
        userId,
        approvedByUserId,
        storeName,
        businessNumber,
        base,
        resolvedOrganizationId: resolved.organizationId,
        resolvedOrganizationCode: resolved.organizationCode,
      });
    } finally {
      await runner.release();
    }
  }

  /**
   * 실제 write. 각 단계는 개별 멱등이며 전체를 하나의 트랜잭션으로 묶지 않는다 —
   * 조직·소유 관계가 확정된 뒤 slug 만 실패하는 경우, 앞 단계를 롤백하는 것보다
   * 남겨두고 보류로 보고하는 편이 복구가 쉽다 (slug 는 재실행으로 채워진다).
   */
  private async writeStoreSubject(
    runner: QueryRunner,
    ctx: {
      userId: string;
      approvedByUserId: string | null;
      storeName: string;
      businessNumber: string;
      base: ProvisionResult;
      resolvedOrganizationId: string | null;
      resolvedOrganizationCode: string | null;
    },
  ): Promise<ProvisionResult> {
    const { userId, approvedByUserId, storeName, businessNumber, base } = ctx;
    const created = emptyCreated();
    let organizationId = ctx.resolvedOrganizationId;
    let organizationCode = ctx.resolvedOrganizationCode;

    // ── 조직 + owner + service enrollment (멱등) ──
    if (organizationId) {
      // 재사용: 소유 관계와 서비스 참여만 보강한다. 기존 member role 은 덮어쓰지 않는다
      // (ON CONFLICT (organization_id, user_id) DO NOTHING → admin/manager 강등·승격 없음).
      const memberBefore = await this.hasStoreMembership(userId, organizationId);
      await organizationOpsService.addMember(
        { organizationId, userId, role: 'owner', isPrimary: false },
        runner,
      );
      created.member = !memberBefore;

      const enrollBefore = await this.hasEnrollment(organizationId);
      await organizationOpsService.enrollService(
        { organizationId, serviceCode: SERVICE_KEY },
        runner,
      );
      created.enrollment = !enrollBefore;
    } else {
      organizationCode = orgCodeForUser(userId);
      const orgResult = await organizationOpsService.ensureOrganizationWithOwnerAndService(
        {
          name: storeName,
          code: organizationCode,
          type: ORG_TYPE,
          createdByUserId: userId,
          metadata: businessNumber ? { businessNumber } : undefined,
        },
        userId,
        SERVICE_KEY,
        runner,
      );
      organizationId = orgResult.id;
      created.organization = orgResult.created;
      created.member = orgResult.created;
      created.enrollment = orgResult.created;

      // 사업자번호가 있으면 조직 SSOT 에 동기화 (빈 값만 채움 — 기존 값 보존).
      if (businessNumber) {
        await runner.query(
          `UPDATE organizations
           SET business_number = COALESCE(NULLIF(business_number, ''), $1)
           WHERE id = $2`,
          [businessNumber, organizationId],
        );
      }
    }

    // ── role_assignments 정합 (멱등) ──
    //   승인 경로는 MembershipApprovalService 가 이미 부여하지만, backfill 대상은
    //   누락됐을 수 있으므로 여기서 한 번 더 보장한다.
    if (!(await this.hasActiveRole(userId))) {
      await this.activateStoreOwnerRole(runner, userId, approvedByUserId);
      created.role = true;
    }

    // ── platform_store_slugs (멱등) ──
    let slug = await this.findSlug(organizationId);
    if (!slug) {
      try {
        const slugService = new StoreSlugService(this.dataSource);
        const fallbackBase = organizationCode || orgCodeForUser(userId);
        const generated = await slugService.generateUniqueSlug(
          slugBase(storeName || fallbackBase, fallbackBase),
        );
        const record = await slugService.reserveSlug({
          storeId: organizationId,
          serviceKey: SERVICE_KEY,
          slug: generated,
        });
        slug = record.slug;
        created.slug = true;
      } catch (slugError) {
        // slug 는 공개 매장/QR/태블릿 진입에만 필요하다 — 조직·소유 관계는 이미 확정됐으므로
        // 여기서 전체를 실패시키지 않고 보류 사유로 보고한다.
        logger.error('[PharmacyHubStoreProvisioning] slug reservation failed', {
          userId,
          organizationId,
          error: slugError instanceof Error ? slugError.message : String(slugError),
        });
        return {
          ...base,
          outcome: 'held',
          holdReason: 'SLUG_UNRESOLVABLE',
          organizationId,
          organizationCode,
          created,
          detail: slugError instanceof Error ? slugError.message : String(slugError),
        };
      }
    }

    const changed =
      created.organization || created.member || created.enrollment || created.role || created.slug;

    const result: ProvisionResult = {
      userId,
      outcome: changed ? (created.organization ? 'created' : 'reused') : 'noop',
      organizationId,
      organizationCode,
      slug,
      created,
    };

    logger.info('[PharmacyHubStoreProvisioning] done', {
      userId,
      outcome: result.outcome,
      organizationId,
      slug,
      created,
    });

    return result;
  }

  /**
   * role_assignments 활성화 (멱등).
   *
   * 제약이 `unique_active_role_per_user UNIQUE (user_id, role, is_active)` 이므로
   * 단순 upsert 는 비활성 row `(u, r, false)` 와 충돌하지 않아 중복 INSERT 를 만든다.
   * MembershipApprovalService.activateRoleAssignment 와 **동일한 3단계 순서**를 따른다:
   *   활성 row 확인 → 비활성 row 재활성화 → 없을 때만 INSERT.
   */
  private async activateStoreOwnerRole(
    runner: QueryRunner,
    userId: string,
    assignedBy: string | null,
  ): Promise<void> {
    const active = await runner.query(
      `UPDATE role_assignments SET updated_at = NOW()
       WHERE user_id = $1 AND role = $2 AND is_active = true
       RETURNING id`,
      [userId, STORE_OWNER_ROLE],
    );
    if (Array.isArray(active) && active.length > 0) return;

    const reactivated = await runner.query(
      `UPDATE role_assignments SET is_active = true, updated_at = NOW()
       WHERE id = (
         SELECT id FROM role_assignments
         WHERE user_id = $1 AND role = $2 AND is_active = false
         ORDER BY updated_at DESC LIMIT 1
       )
       RETURNING id`,
      [userId, STORE_OWNER_ROLE],
    );
    if (Array.isArray(reactivated) && reactivated.length > 0) return;

    await runner.query(
      `INSERT INTO role_assignments (user_id, role, assigned_by, is_active, valid_from, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW(), NOW())
       ON CONFLICT (user_id, role) WHERE is_active
       DO UPDATE SET updated_at = NOW(), is_active = true`,
      [userId, STORE_OWNER_ROLE, assignedBy],
    );
  }

  // ─── 내부 헬퍼 ────────────────────────────────────────────────────────

  /**
   * 조직 결정. 재사용 우선, 모호하면 보류.
   */
  private async resolveOrganization(
    userId: string,
    businessNumber: string,
    _storeName: string,
  ): Promise<{
    organizationId: string | null;
    organizationCode: string | null;
    reason: string;
    hold?: ProvisionHoldReason;
    detail?: string;
  }> {
    // 1) 사용자가 이미 소속된 매장 조직
    const memberOrgs = await this.dataSource.query(
      `SELECT o.id, o.code, o.name
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1
         AND om.role = ANY($2::text[])
         AND om.left_at IS NULL
       ORDER BY o.id`,
      [userId, STORE_MEMBER_ROLES],
    );

    if (memberOrgs.length > 1) {
      return {
        organizationId: null,
        organizationCode: null,
        reason: 'ambiguous',
        hold: 'AMBIGUOUS_ORGANIZATION',
        detail:
          `소속 매장 조직이 ${memberOrgs.length}개입니다 ` +
          `(${memberOrgs.map((o: any) => o.code || o.id).join(', ')}). ` +
          `매장 조직은 자동 선택하지 않습니다(임의 선택 금지).`,
      };
    }
    if (memberOrgs.length === 1) {
      // WO-...-ORGANIZATION-REUSE-GUARD-V1: 후보가 1개여도 "그 조직이 무엇인지" 확인한다.
      const safety = await this.validateOrganizationReuseSafety(memberOrgs[0].id);
      if (!safety.safe) {
        return {
          organizationId: null,
          organizationCode: null,
          reason: 'unsafe reuse (organization_members)',
          hold: safety.hold,
          detail: safety.detail,
        };
      }
      return {
        organizationId: memberOrgs[0].id,
        organizationCode: memberOrgs[0].code ?? null,
        reason: 'existing organization_members',
      };
    }

    // 2) 동일 사업자번호 조직 (있을 때만)
    if (businessNumber) {
      const bnOrgs = await this.dataSource.query(
        `SELECT id, code, name FROM organizations
         WHERE regexp_replace(COALESCE(business_number, ''), '\\D', '', 'g') = $1
           AND "isActive" = true
         ORDER BY id`,
        [businessNumber],
      );
      if (bnOrgs.length > 1) {
        return {
          organizationId: null,
          organizationCode: null,
          reason: 'duplicate business number',
          hold: 'DUPLICATE_BUSINESS_NUMBER',
          detail:
            `사업자번호 ${businessNumber} 로 조직이 ${bnOrgs.length}개 존재합니다 ` +
            `(${bnOrgs.map((o: any) => o.code || o.id).join(', ')}).`,
        };
      }
      if (bnOrgs.length === 1) {
        // 같은 가드를 통과해야 한다 — 사업자번호가 맞는다는 사실만으로 약국이라고 볼 수 없다.
        // (실제로 사업자번호가 일치하는 K-Cosmetics 뷰티샵이 존재한다 — IR §4-3)
        const safety = await this.validateOrganizationReuseSafety(bnOrgs[0].id);
        if (!safety.safe) {
          return {
            organizationId: null,
            organizationCode: null,
            reason: 'unsafe reuse (business_number)',
            hold: safety.hold,
            detail: safety.detail,
          };
        }
        return {
          organizationId: bnOrgs[0].id,
          organizationCode: bnOrgs[0].code ?? null,
          reason: 'existing business_number match',
        };
      }
    }

    // 3) 신규 생성 대상
    return { organizationId: null, organizationCode: null, reason: 'new organization' };
  }

  /**
   * WO-PHARMACY-HUB-STORE-PROVISIONING-ORGANIZATION-REUSE-GUARD-V1
   *
   * **기존 조직을 Pharmacy-Hub 약국으로 재사용해도 안전한가**를 판정한다.
   * 두 재사용 경로(organization_members 단일 후보 · businessNumber 단일 매칭)가
   * 이 함수 하나를 공유한다 — 검사 로직을 복제하지 않는다.
   *
   * 왜 필요한가 (IR-PHARMACY-HUB-STORE-PROVISIONING-REPLAY-SAFETY-V1 D-1·D-2):
   *   기존 구현은 후보가 정확히 1개면 **그 조직이 무엇인지 보지 않고** 재사용했다.
   *   - D-1: 사업자번호만 맞으면 K-Cosmetics 뷰티샵(type='store')도 약국으로 재사용될 수 있었다.
   *   - D-2: 그 조직이 이미 다른 서비스의 매장 자산을 갖고 있으면, PH enrollment 추가만으로
   *          그 자산이 Pharmacy-Hub 화면에 그대로 나타난다(경계가 organization_id 단독이라).
   *          실제로 KPA 약국 조직 1개가 QR 50건·자료함 7건·경영활용 제품 20건을 갖고 있었다.
   *
   * 판정은 **보수적**이다 — 애매하면 재사용하지 않고 held 로 사람 판단에 넘긴다.
   * 자산을 옮기거나 지우지 않고, 다른 서비스의 enrollment 도 건드리지 않는다(읽기만 한다).
   */
  private async validateOrganizationReuseSafety(
    organizationId: string,
  ): Promise<ReuseSafetyResult> {
    // ── 0. 이미 우리 매장이면 가드 대상이 아니다 (멱등 재실행) ──
    //   이 가드는 **남의 조직을 PH 약국으로 입양하는 것**을 막기 위한 것이지,
    //   이미 PH 매장으로 쓰고 있는 조직을 다시 확인하는 것을 막기 위한 것이 아니다.
    //   PH active enrollment 가 이미 있으면 그 조직은 정의상 이 서비스의 매장이고,
    //   그때 쌓인 QR·자료함·태블릿은 **PH 자산**이지 타 서비스 유입이 아니다.
    //   (이 분기가 없으면 backfill --mode=apply 재실행이 noop 이 아니라 held 가 되어
    //    멱등 계약이 깨진다 — 실제 운영 모집단 실측에서 발견했다.)
    const [phEnrollment] = await this.dataSource.query(
      `SELECT 1 FROM organization_service_enrollments
        WHERE organization_id = $1 AND service_code = $2 AND status = 'active' LIMIT 1`,
      [organizationId, SERVICE_KEY],
    );
    if (phEnrollment) return { safe: true };

    // ── 1. 조직 type — 약국이 아니면 재사용하지 않는다 ──
    const [org] = await this.dataSource.query(
      `SELECT id, code, name, type FROM organizations WHERE id = $1 LIMIT 1`,
      [organizationId],
    );
    if (!org) {
      return {
        safe: false,
        hold: 'ORGANIZATION_TYPE_NOT_COMPATIBLE',
        detail: `조직 ${organizationId} 을 찾을 수 없습니다.`,
      };
    }
    if (!(REUSABLE_ORG_TYPES as readonly string[]).includes(String(org.type))) {
      return {
        safe: false,
        hold: 'ORGANIZATION_TYPE_NOT_COMPATIBLE',
        detail:
          `${org.code || org.id}(${org.name}) 의 type 이 '${org.type}' 입니다. ` +
          `Pharmacy-Hub 약국으로 자동 재사용할 수 있는 type 은 ${REUSABLE_ORG_TYPES.join(', ')} 뿐입니다.`,
      };
    }

    // ── 2. 다른 서비스의 active enrollment — 조직 공유는 사람이 판단할 대상이다 ──
    const otherEnrollments = await this.dataSource.query(
      `SELECT service_code FROM organization_service_enrollments
        WHERE organization_id = $1 AND service_code <> $2 AND status = 'active'
        ORDER BY service_code`,
      [organizationId, SERVICE_KEY],
    );
    if (otherEnrollments.length > 0) {
      return {
        safe: false,
        hold: 'ORGANIZATION_HAS_OTHER_SERVICE_ENROLLMENT',
        detail:
          `${org.code || org.id}(${org.name}) 은 이미 다른 서비스에 참여 중입니다 ` +
          `(${otherEnrollments.map((e: any) => e.service_code).join(', ')}). ` +
          `조직을 공유하면 매장 자산 경계가 섞이므로 자동 재사용하지 않습니다.`,
      };
    }

    // ── 3. 이미 가진 service-neutral 매장 자산 ──
    //   경계가 organization_id 단독이라, enrollment 만 추가해도 그대로 PH 화면에 유입된다.
    //   한 번의 쿼리로 어떤 자산이 몇 건인지 함께 파악한다(사람이 판단할 근거를 남긴다).
    const counts = await this.dataSource.query(
      SERVICE_NEUTRAL_ASSET_TABLES.map(
        (a) => `SELECT '${a.label}' AS label, count(*)::int AS n FROM ${a.table} WHERE ${a.column} = $1`,
      ).join(' UNION ALL '),
      [organizationId],
    );
    const owned = counts.filter((r: any) => Number(r.n) > 0);
    if (owned.length > 0) {
      return {
        safe: false,
        hold: 'ORGANIZATION_HAS_SERVICE_NEUTRAL_ASSETS',
        detail:
          `${org.code || org.id}(${org.name}) 은 이미 매장 자산을 갖고 있습니다 ` +
          `(${owned.map((r: any) => `${r.label} ${r.n}건`).join(', ')}). ` +
          `이 자산들은 organization_id 만으로 경계가 정해져 Pharmacy-Hub 에 그대로 노출되므로 ` +
          `자동 재사용하지 않습니다.`,
      };
    }

    return { safe: true };
  }

  private async hasStoreMembership(userId: string, organizationId: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT 1 FROM organization_members
       WHERE user_id = $1 AND organization_id = $2 AND left_at IS NULL
       LIMIT 1`,
      [userId, organizationId],
    );
    return rows.length > 0;
  }

  private async hasEnrollment(organizationId: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT 1 FROM organization_service_enrollments
       WHERE organization_id = $1 AND service_code = $2
       LIMIT 1`,
      [organizationId, SERVICE_KEY],
    );
    return rows.length > 0;
  }

  private async hasActiveRole(userId: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT 1 FROM role_assignments
       WHERE user_id = $1 AND role = $2 AND is_active = true
       LIMIT 1`,
      [userId, STORE_OWNER_ROLE],
    );
    return rows.length > 0;
  }

  private async findSlug(organizationId: string): Promise<string | null> {
    const rows = await this.dataSource.query(
      `SELECT slug FROM platform_store_slugs
       WHERE store_id = $1 AND service_key = $2
       LIMIT 1`,
      [organizationId, SERVICE_KEY],
    );
    return rows.length > 0 ? rows[0].slug : null;
  }
}
