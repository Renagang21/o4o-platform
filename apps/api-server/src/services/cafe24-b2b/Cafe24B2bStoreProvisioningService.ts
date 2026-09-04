/**
 * Cafe24B2bStoreProvisioningService — Cafe24 거래처 회원 1명 = O4O 내부 매장 1개
 *
 * WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1 §5 · §6 · §7
 * 선행 IR: docs/investigations/CHECK-O4O-CAFE24-B2B-STORE-MEMBER-INTEGRATION-AND-OWNERSHIP-AUDIT-V1.md
 *
 * SSOT 는 PharmacyHubStoreProvisioningService 와 동일한 기존 축을 그대로 쓴다 (§5 — 패턴 재사용).
 * Cafe24 전용 조직/매장 테이블을 만들지 않는다.
 *
 *   매장 정보      = organizations
 *   매장 소유 관계 = organization_members
 *   서비스 가입    = service_memberships
 *   서비스 역할    = role_assignments
 *   서비스 참여    = organization_service_enrollments
 *   공개 매장 slug = platform_store_slugs
 *   매장 기능      = store_capabilities
 *   Cafe24 연결    = cafe24_member_links   ← 이번 WO 가 추가하는 유일한 테이블
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PharmacyHub 와 다른 점 하나: 조직 "재사용 후보 탐색"을 하지 않는다.
 *
 *   PharmacyHub 는 사람이 이미 O4O 에 가입해 다른 서비스 조직을 가진 상태에서 승인되므로
 *   기존 조직 재사용/모호성(AMBIGUOUS_ORGANIZATION) 판정이 필요하다. 여기서는
 *   **O4O 별도 가입 자체가 없다**(§2). 회원은 Cafe24 쪽에만 존재하고 O4O 내부 user 는 이
 *   서비스가 만든 합성 계정이므로, `member_hash` 하나가 user·organization 을 결정론적으로
 *   지목한다. 후보가 둘일 수 없어 모호성이 성립하지 않는다.
 *   재사용 축은 `cafe24_member_links` 의 UNIQUE(mall_id, shop_no, member_hash) 가 담당한다.
 *
 * 멱등성 계약 (§5 · §12-10):
 *   같은 (mall, shop, user_identifier) 로 몇 번을 재로그인해도
 *   user 중복 0 / organization 중복 0 / membership 중복 0 / role 중복 0 / link 중복 0.
 *   다른 mall · 다른 shop_no · 다른 client_id 는 member_hash 가 갈라져 절대 충돌하지 않는다.
 *
 * partial provisioning 방지 (§5):
 *   user → organization → membership → role → link → capability 를 **하나의 트랜잭션**으로
 *   묶는다. 중간 실패 시 전부 롤백되어 "user 는 있는데 매장이 없는" 상태가 남지 않는다.
 *   slug 만 트랜잭션 밖에서 보강한다 — 실패해도 매장 identity 는 이미 확정이고 다음
 *   로그인이 채운다 (PharmacyHub 와 동일 정책).
 */

import type { DataSource, QueryRunner } from 'typeorm';
import { StoreSlugService, generateSlugFromName } from '@o4o/platform-core/store-identity';
import { organizationOpsService } from '../../modules/organization/services/organization-ops.service.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import {
  cafe24MemberOrganizationCode,
  deriveCafe24ClientNamespace,
  deriveCafe24MemberHash,
  maskMemberHash,
  synthesizeCafe24MemberEmail,
} from '../../modules/cafe24/cafe24-member-identity.js';
import logger from '../../utils/logger.js';

const SERVICE_KEY = SERVICE_KEYS.CAFE24_B2B;
/** role_assignments 는 서비스 접두사 포함, service_memberships.role 은 bare key (기존 관례) */
const STORE_OWNER_ROLE = `${SERVICE_KEY}:store_owner`;
const MEMBERSHIP_ROLE = 'store_owner';
/** organizations.type — 프로덕션 실측값 중 일반 매장을 뜻하는 기존 값 (약국이 아니다) */
const ORG_TYPE = 'store';

/**
 * Pilot 이 부여하는 sponsored capability (§7).
 *
 * 새 요금/권한 체계를 만들지 않는다. 기존 `store_capabilities.source` 에 `'cafe24-b2b'` 를 써서
 * "이 매장 기능은 Cafe24 B2B 사업자가 후원한다"만 표현하고, enabled 로 active/inactive 를 나타낸다.
 * 4개 키는 매장 판매지원 첫 화면(§8)이 안내하는 축과 1:1 이다.
 */
const SPONSORED_CAPABILITIES = ['QR_MARKETING', 'TABLET', 'SIGNAGE', 'LIBRARY'] as const;
const CAPABILITY_SOURCE = 'cafe24-b2b';

export interface Cafe24B2bProvisionInput {
  clientId: string;
  mallId: string;
  shopNo: number;
  /** Cafe24 원문 식별자. **저장·로그·응답 어디에도 나가지 않는다** (§4 · §10) */
  userIdentifier: string;
  /** 표시용 매장명. Cafe24 회원정보를 읽지 않으므로(§3) 몰 기준 기본값을 쓴다 */
  storeNameHint?: string | null;
}

export interface Cafe24B2bProvisionResult {
  linkId: string;
  userId: string;
  organizationId: string;
  organizationCode: string;
  storeName: string;
  slug: string | null;
  /** 이번 로그인이 실제로 만든 것. 재로그인이면 전부 false/0 (§12-10 판정 근거) */
  created: {
    user: boolean;
    organization: boolean;
    membership: boolean;
    role: boolean;
    link: boolean;
    capabilities: number;
    slug: boolean;
  };
}

type CreatedFlags = Cafe24B2bProvisionResult['created'];

function emptyCreated(): CreatedFlags {
  return {
    user: false,
    organization: false,
    membership: false,
    role: false,
    link: false,
    capabilities: 0,
    slug: false,
  };
}

export class Cafe24B2bStoreProvisioningService {
  /** 모든 DB 접근은 주입받은 dataSource 로만 한다 (전역 AppDataSource 참조 금지). */
  constructor(private readonly dataSource: DataSource) {}

  async provision(input: Cafe24B2bProvisionInput): Promise<Cafe24B2bProvisionResult> {
    const memberHash = deriveCafe24MemberHash({
      clientId: input.clientId,
      mallId: input.mallId,
      shopNo: input.shopNo,
      userIdentifier: input.userIdentifier,
    });
    const clientNamespace = deriveCafe24ClientNamespace(input.clientId);
    const email = synthesizeCafe24MemberEmail(memberHash);
    const orgCode = cafe24MemberOrganizationCode(memberHash);
    // 매장명에도 원문 식별자를 쓰지 않는다 — hash 앞자리만 쓴다 (§10).
    const storeName =
      (input.storeNameHint || '').trim() || `${input.mallId} 거래처 매장 ${memberHash.slice(0, 6)}`;

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    let core: Omit<Cafe24B2bProvisionResult, 'slug' | 'storeName'>;
    try {
      core = await this.provisionCore(runner, {
        mallId: input.mallId,
        shopNo: input.shopNo,
        memberHash,
        clientNamespace,
        email,
        orgCode,
        storeName,
      });
      await runner.commitTransaction();
    } catch (e) {
      await runner.rollbackTransaction();
      logger.error('[cafe24-b2b] provisioning failed — rolled back', {
        mallId: input.mallId,
        shopNo: input.shopNo,
        member: maskMemberHash(memberHash),
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    } finally {
      await runner.release();
    }

    const slugResult = await this.ensureSlug(core.organizationId, orgCode, storeName);

    const result: Cafe24B2bProvisionResult = {
      ...core,
      storeName,
      slug: slugResult.slug,
      created: { ...core.created, slug: slugResult.created },
    };

    logger.info('[cafe24-b2b] provisioned', {
      mallId: input.mallId,
      shopNo: input.shopNo,
      member: maskMemberHash(memberHash),
      organizationId: result.organizationId,
      created: result.created,
    });

    return result;
  }

  private async provisionCore(
    runner: QueryRunner,
    ctx: {
      mallId: string;
      shopNo: number;
      memberHash: string;
      clientNamespace: string;
      email: string;
      orgCode: string;
      storeName: string;
    },
  ): Promise<Omit<Cafe24B2bProvisionResult, 'slug' | 'storeName'>> {
    const created = emptyCreated();

    // ── 1. 기존 연결 조회 — 재로그인의 정상 경로 ──
    const linkRows = await runner.query(
      `SELECT id, user_id, organization_id FROM cafe24_member_links
       WHERE mall_id = $1 AND shop_no = $2 AND member_hash = $3
       LIMIT 1`,
      [ctx.mallId, ctx.shopNo, ctx.memberHash],
    );
    const existingLink = Array.isArray(linkRows) && linkRows.length > 0 ? linkRows[0] : null;

    // ── 2. 내부 user 확보 (멱등) ──
    //   합성 email 이 결정적이므로 ON CONFLICT (email) 이 곧 재사용이다.
    //   password 는 빈 문자열 — 해시가 아니므로 어떤 비밀번호로도 로그인할 수 없다.
    //   비밀번호 credential 을 만들지 않는다는 §10 요구를 코드가 아니라 데이터로 보장한다.
    //   기존 row 를 만나도 어떤 컬럼도 덮어쓰지 않는다.
    //   users.service_key 는 deprecated 컬럼이라 쓰지 않는다 (SSOT = service_memberships).
    let userId: string | null = existingLink?.user_id ?? null;
    if (!userId) {
      const insertedRows = await runner.query(
        `INSERT INTO users (email, password, name, status, "isActive", "isEmailVerified", provider, provider_id)
         VALUES ($1, '', $2, 'active', true, false, 'cafe24-b2b', $3)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [ctx.email, ctx.storeName, ctx.memberHash],
      );
      if (Array.isArray(insertedRows) && insertedRows.length > 0) {
        userId = insertedRows[0].id;
        created.user = true;
      } else {
        const found = await runner.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [ctx.email]);
        if (!Array.isArray(found) || found.length === 0) throw new Error('CAFE24_B2B_USER_RESOLVE_FAILED');
        userId = found[0].id;
      }
    }

    // ── 3. 조직 + owner + service enrollment (멱등) ──
    //   code 가 member_hash 파생 결정값이라 ON CONFLICT (code) 가 항상 같은 row 를 돌려준다.
    const orgResult = await organizationOpsService.ensureOrganizationWithOwnerAndService(
      {
        name: ctx.storeName,
        code: ctx.orgCode,
        type: ORG_TYPE,
        createdByUserId: userId as string,
        metadata: { source: SERVICE_KEY, mallId: ctx.mallId, shopNo: ctx.shopNo },
      },
      userId as string,
      SERVICE_KEY,
      runner,
    );
    const organizationId = orgResult.id;
    created.organization = orgResult.created;

    // ── 4. service_memberships (멱등 · UNIQUE(user_id, service_key)) ──
    //   Cafe24 회원 자격 자체가 승인 근거이므로 pending 을 거치지 않고 바로 active 다.
    //   O4O 운영자 승인 큐에 올리지 않는다 (§2 — O4O 별도 가입 없음).
    const membershipRows = await runner.query(
      `INSERT INTO service_memberships (user_id, service_key, status, role, approved_at, created_at, updated_at)
       VALUES ($1, $2, 'active', $3, NOW(), NOW(), NOW())
       ON CONFLICT (user_id, service_key) DO NOTHING
       RETURNING id`,
      [userId, SERVICE_KEY, MEMBERSHIP_ROLE],
    );
    created.membership = Array.isArray(membershipRows) && membershipRows.length > 0;

    // ── 5. role_assignments (멱등) ──
    created.role = await this.ensureStoreOwnerRole(runner, userId as string);

    // ── 6. cafe24_member_links (멱등) ──
    let linkId: string;
    if (existingLink) {
      linkId = existingLink.id;
      await runner.query(
        `UPDATE cafe24_member_links
         SET organization_id = COALESCE(organization_id, $2),
             status = 'ACTIVE',
             last_login_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [linkId, organizationId],
      );
    } else {
      const rows = await runner.query(
        `INSERT INTO cafe24_member_links
           (mall_id, shop_no, member_hash, client_namespace, user_id, organization_id, status, last_login_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', NOW())
         ON CONFLICT (mall_id, shop_no, member_hash) DO UPDATE
           SET organization_id = COALESCE(cafe24_member_links.organization_id, EXCLUDED.organization_id),
               status = 'ACTIVE',
               last_login_at = NOW(),
               updated_at = NOW()
         RETURNING id, (xmax = 0) AS inserted`,
        [ctx.mallId, ctx.shopNo, ctx.memberHash, ctx.clientNamespace, userId, organizationId],
      );
      if (!Array.isArray(rows) || rows.length === 0) throw new Error('CAFE24_B2B_LINK_UPSERT_FAILED');
      linkId = rows[0].id;
      created.link = rows[0].inserted === true || rows[0].inserted === 't';
    }

    // ── 7. sponsored capability (§7) ──
    for (const key of SPONSORED_CAPABILITIES) {
      const rows = await runner.query(
        `INSERT INTO store_capabilities (organization_id, capability_key, enabled, source)
         VALUES ($1, $2, true, $3)
         ON CONFLICT (organization_id, capability_key) DO NOTHING
         RETURNING id`,
        [organizationId, key, CAPABILITY_SOURCE],
      );
      if (Array.isArray(rows) && rows.length > 0) created.capabilities += 1;
    }

    return {
      linkId,
      userId: userId as string,
      organizationId,
      organizationCode: ctx.orgCode,
      created,
    };
  }

  /**
   * role_assignments 활성화 (멱등).
   *
   * 제약이 `unique_active_role_per_user UNIQUE (user_id, role, is_active)` 이므로 단순 upsert 는
   * 비활성 row `(u, r, false)` 와 충돌하지 않아 중복 INSERT 를 만든다.
   * PharmacyHub / MembershipApprovalService 와 **동일한 3단계 순서**를 따른다:
   *   활성 row 확인 → 비활성 row 재활성화 → 없을 때만 INSERT.
   *
   * @returns 이번 호출이 role 을 새로 활성화했으면 true
   */
  private async ensureStoreOwnerRole(runner: QueryRunner, userId: string): Promise<boolean> {
    const active = await runner.query(
      `SELECT id FROM role_assignments WHERE user_id = $1 AND role = $2 AND is_active = true LIMIT 1`,
      [userId, STORE_OWNER_ROLE],
    );
    if (Array.isArray(active) && active.length > 0) return false;

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
    if (Array.isArray(reactivated) && reactivated.length > 0) return true;

    await runner.query(
      `INSERT INTO role_assignments (user_id, role, assigned_by, is_active, valid_from, created_at, updated_at)
       VALUES ($1, $2, NULL, true, NOW(), NOW(), NOW())
       ON CONFLICT (user_id, role) WHERE is_active
       DO UPDATE SET updated_at = NOW(), is_active = true`,
      [userId, STORE_OWNER_ROLE],
    );
    return true;
  }

  /**
   * platform_store_slugs (멱등).
   *
   * slug 는 공개 매장/QR 진입에만 필요하다. 실패해도 매장 identity 는 이미 확정됐으므로
   * 전체를 실패시키지 않고 null 로 보고한다 — 다음 로그인이 다시 시도한다.
   */
  private async ensureSlug(
    organizationId: string,
    orgCode: string,
    storeName: string,
  ): Promise<{ slug: string | null; created: boolean }> {
    const existing = await this.dataSource.query(
      `SELECT slug FROM platform_store_slugs
       WHERE store_id = $1 AND service_key = $2 AND is_active = true
       LIMIT 1`,
      [organizationId, SERVICE_KEY],
    );
    if (Array.isArray(existing) && existing.length > 0 && existing[0].slug) {
      return { slug: existing[0].slug, created: false };
    }

    try {
      const slugService = new StoreSlugService(this.dataSource);
      // 매장명이 한글/기호뿐이면 정규화 결과가 비거나 너무 짧아 generateUniqueSlug 가
      // 충돌 재시도만 반복한다. 그때는 결정적 조직 코드를 base 로 쓴다 (PharmacyHub 선례).
      const normalized = generateSlugFromName(storeName);
      const base = normalized && normalized.length >= 3 ? normalized : orgCode;
      const generated = await slugService.generateUniqueSlug(base);
      const record = await slugService.reserveSlug({
        storeId: organizationId,
        serviceKey: SERVICE_KEY,
        slug: generated,
      });
      return { slug: record.slug, created: true };
    } catch (slugError) {
      logger.error('[cafe24-b2b] slug reservation failed', {
        organizationId,
        error: slugError instanceof Error ? slugError.message : String(slugError),
      });
      return { slug: null, created: false };
    }
  }
}
