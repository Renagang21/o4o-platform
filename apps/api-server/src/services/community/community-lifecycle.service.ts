import { communityMemberListFilter, communityMemberPagination, DEFAULT_MEMBER_LIST_QUERY, type CommunityMemberListQuery } from './community-member-list-query.js';
import { recordCommunityMembershipChange } from './community-membership-mutations.js';
import { hasCommunityServiceOperator, hasCommunityServiceAdmin } from './community-service-operator-access.js';
/**
 * Community Lifecycle — 개설 신청 · 승인 · 가입
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §3-2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * slug 는 두 번 검사한다
 *
 *   신청 시      이미 쓰는 주소면 즉시 알린다(신청 자체를 만들지 않는다)
 *   승인 직전    그 사이 선점됐을 수 있다 → 관리자가 **임의의 주소로 개설하지 않는다**.
 *                `slug_conflict` 로 돌려 **신청자에게 새 slug 를 요청**한다.
 *
 * 개설 승인이 주는 것(§3-3-2 · V8)
 *   community_memberships(role='operator', status='active')   ← 개체 운영자
 *   service_memberships('community', status='active')          ← 가입(진입 자격)
 * 주지 않는 것
 *   community:admin · community:operator                       ← 서비스 전체 역할
 *
 * 가입은 **승인형 하나**다. 오픈형·자동가입 분기를 만들지 않는다.
 */
import type { DataSource, EntityManager } from 'typeorm';
import {
  demoAccountService,
  DEMO_ACCOUNT_FORBIDDEN_CODE,
  DEMO_ACCOUNT_FORBIDDEN_MESSAGE,
} from '../auth/demo-account.service.js';
import { assertNetureMainMembershipActive, getNetureMainMembershipStatus, NETURE_MAIN_SERVICE_KEY } from '../../modules/neture/services/neture-main-membership.js';
import { independentCommunityKeyTaken } from './community-key-namespace.js';
import { Community } from '../../entities/Community.js';
import { CommunityMembership } from '../../entities/CommunityMembership.js';
import { CommunityCreationRequest } from '../../entities/CommunityCreationRequest.js';

/** 커뮤니티 진입 자격이 되는 서비스 키 — 역할이 아니라 **가입**이다. */
export const COMMUNITY_SERVICE_KEY = 'community';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

export type LifecycleErrorCode =
  | 'INVALID_SLUG'
  | 'SLUG_TAKEN'
  | 'REQUEST_NOT_FOUND'
  | 'REQUEST_NOT_PENDING'
  | 'NICKNAME_REQUIRED'
  | 'ALREADY_MEMBER'
  | 'MEMBERSHIP_NOT_FOUND'
  | 'MEMBERSHIP_NOT_PENDING'
  | 'SERVICE_MEMBERSHIP_SUSPENDED'
  | 'SERVICE_MEMBERSHIP_NOT_ACTIVE'
  | 'REQUEST_FORBIDDEN'
  | typeof DEMO_ACCOUNT_FORBIDDEN_CODE;

export class CommunityLifecycleError extends Error {
  constructor(
    readonly code: LifecycleErrorCode,
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'CommunityLifecycleError';
  }
}

export function normalizeSlug(raw: unknown): string {
  const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!SLUG_RE.test(slug)) {
    throw new CommunityLifecycleError(
      'INVALID_SLUG',
      '주소는 영문 소문자·숫자·하이픈 3~64자여야 합니다.',
    );
  }
  return slug;
}

/** 이미 쓰고 있거나 pending 신청이 잡고 있는 slug 인지. */
async function slugTaken(m: EntityManager, slug: string): Promise<boolean> {
  if (await independentCommunityKeyTaken(m, slug)) return true;
  const community = await m.getRepository(Community).findOne({ where: { slug } });
  if (community) return true;
  const pending = await m.getRepository(CommunityCreationRequest).findOne({
    where: { desiredSlug: slug, status: 'pending' },
  });
  return !!pending;
}

/**
 * 심사 대상 개설 신청을 **pending 상태로** 가져온다.
 *
 * 승인과 거절이 같은 조회·검증을 반복하고 있었다(없으면 404 · pending 아니면 409).
 * 한쪽만 고치면 "이미 처리된 신청을 다시 처리" 가 한 경로에서만 막힌다.
 */
async function loadPendingRequest(m: EntityManager, requestId: string): Promise<CommunityCreationRequest> {
  const request = await m.getRepository(CommunityCreationRequest).findOne({ where: { id: requestId } });
  if (!request) {
    throw new CommunityLifecycleError('REQUEST_NOT_FOUND', '신청을 찾을 수 없습니다.', 404);
  }
  if (request.status !== 'pending') {
    throw new CommunityLifecycleError('REQUEST_NOT_PENDING', '이미 처리된 신청입니다.', 409);
  }
  return request;
}

/**
 * 심사 대상 가입 신청을 **그 커뮤니티의 pending 행으로** 가져온다.
 *
 * `communityId` 를 함께 보는 것이 요점이다 — 다른 커뮤니티의 `membershipId` 를 넘기는
 * 월권을 여기서 404 로 막는다. 승인·거절 두 경로가 같은 규칙을 쓴다.
 */
async function loadPendingMembership(
  m: EntityManager,
  communityId: string,
  membershipId: string,
): Promise<CommunityMembership> {
  const membership = await m.getRepository(CommunityMembership).findOne({ where: { id: membershipId } });
  if (!membership || membership.communityId !== communityId) {
    throw new CommunityLifecycleError('MEMBERSHIP_NOT_FOUND', '가입 신청을 찾을 수 없습니다.', 404);
  }
  if (membership.status !== 'pending') {
    throw new CommunityLifecycleError('MEMBERSHIP_NOT_PENDING', '이미 처리된 신청입니다.', 409);
  }
  return membership;
}

export class CommunityLifecycleService {
  constructor(private readonly dataSource: DataSource) {}

  /** 개설 신청 — 검사 1회차. */
  async requestCreation(input: {
    requesterUserId: string;
    desiredSlug: string;
    name: string;
    description?: string | null;
  }): Promise<CommunityCreationRequest> {
    const slug = normalizeSlug(input.desiredSlug);
    return this.dataSource.transaction(async (m) => {
      await assertNetureMainMembershipActive(m, input.requesterUserId);
      if (await slugTaken(m, slug)) {
        throw new CommunityLifecycleError('SLUG_TAKEN', `이미 사용 중인 주소입니다: ${slug}`, 409);
      }
      const repo = m.getRepository(CommunityCreationRequest);
      return repo.save(
        repo.create({
          requesterUserId: input.requesterUserId,
          desiredSlug: slug,
          name: input.name,
          description: input.description ?? null,
          status: 'pending',
        }),
      );
    });
  }

  /**
   * 개설 승인 — 검사 2회차.
   * 충돌 시 개설하지 않고 `slug_conflict` 로 신청을 돌려준다(임의 주소 개설 금지).
   */
  async approveCreation(input: {
    requestId: string;
    reviewerUserId: string;
  }): Promise<{ outcome: 'created'; community: Community } | { outcome: 'slug_conflict'; slug: string }> {
    return this.dataSource.transaction(async (m) => {
      const reqRepo = m.getRepository(CommunityCreationRequest);
      const request = await loadPendingRequest(m, input.requestId);
      await assertApplicantMainActive(m, request.requesterUserId);

      // Demo 계정에 개체 운영자 role 을 주지 않는다 — 신청 행 갱신을 포함한 어떤 write 보다 먼저
      // (WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1 · 판정 정본 demo_accounts.user_id).
      if (await demoAccountService.isDemoAccount(request.requesterUserId, m)) {
        throw new CommunityLifecycleError(DEMO_ACCOUNT_FORBIDDEN_CODE, DEMO_ACCOUNT_FORBIDDEN_MESSAGE, 403);
      }

      // 승인 직전 재검사 — pending 인 자기 자신은 제외하고 본다.
      const businessTaken = await independentCommunityKeyTaken(m, request.desiredSlug);
      const existing = await m.getRepository(Community).findOne({ where: { slug: request.desiredSlug } });
      if (existing || businessTaken) {
        request.status = 'slug_conflict';
        request.reviewedByUserId = input.reviewerUserId;
        request.reviewedAt = new Date();
        request.reason = `승인 직전 주소가 선점되었습니다(${request.desiredSlug}). 새 주소로 다시 신청해 주세요.`;
        await reqRepo.save(request);
        return { outcome: 'slug_conflict' as const, slug: request.desiredSlug };
      }

      // 최초 가입만 생성하고 기존 서비스 처분은 유지한다. 개체를 만들기 전에 잠근다.
      await ensureServiceMembership(m, request.requesterUserId);

      const community = await m.getRepository(Community).save(
        m.getRepository(Community).create({
          slug: request.desiredSlug,
          name: request.name,
          description: request.description,
          status: 'active',
          createdByUserId: request.requesterUserId,
          approvedByUserId: input.reviewerUserId,
          approvedAt: new Date(),
        }),
      );

      // 신청자가 **그 커뮤니티의** 첫 운영자가 된다 — 서비스 전체 역할은 주지 않는다.
      const initialAdmin = await m.getRepository(CommunityMembership).save(
        m.getRepository(CommunityMembership).create({
          communityId: community.id,
          userId: request.requesterUserId,
          role: 'admin',
          status: 'active',
          approvedByUserId: input.reviewerUserId,
          approvedAt: new Date(),
        }),
      );

      await recordCommunityMembershipChange(m, { communityId: community.id, membershipId: initialAdmin.id, actorUserId: input.reviewerUserId, action: 'create', beforeRole: null, afterRole: 'admin', beforeStatus: null, afterStatus: 'active' });

      request.status = 'approved';
      request.reviewedByUserId = input.reviewerUserId;
      request.reviewedAt = new Date();
      request.createdCommunityId = community.id;
      await reqRepo.save(request);

      return { outcome: 'created' as const, community };
    });
  }

  /** 가입 신청 — 승인형 하나. 자동 승인하지 않는다. */
  async requestJoin(input: { communityId: string; userId: string }): Promise<CommunityMembership> {
    return this.dataSource.transaction(async (m) => {
      await assertNetureMainMembershipActive(m, input.userId);
      const [profile] = await m.query(`SELECT nickname FROM users WHERE id = $1`, [input.userId]);
      if (!profile?.nickname?.trim()) throw new CommunityLifecycleError('NICKNAME_REQUIRED', '내 프로필에서 커뮤니티 닉네임을 등록해 주세요.', 400);
      const repo = m.getRepository(CommunityMembership);
      const existing = await repo.findOne({
        where: { communityId: input.communityId, userId: input.userId },
      });
      if (existing && ['active', 'pending', 'suspended'].includes(existing.status)) {
        throw new CommunityLifecycleError('ALREADY_MEMBER', '이미 가입했거나 승인 대기 중입니다.', 409);
      }
      if (existing) {
        existing.status = 'pending';
        existing.role = 'member';
        return repo.save(existing);
      }
      return repo.save(
        repo.create({
          communityId: input.communityId,
          userId: input.userId,
          role: 'member',
          status: 'pending',
        }),
      );
    });
  }

  /** 가입 승인 — 그 커뮤니티 운영자가 한다(라우트에서 requireCommunityScope('operator')). */
  async approveJoin(input: {
    communityId: string;
    membershipId: string;
    reviewerUserId: string;
  }): Promise<CommunityMembership> {
    return this.dataSource.transaction(async (m) => {
      const repo = m.getRepository(CommunityMembership);
      const membership = await loadPendingMembership(m, input.communityId, input.membershipId);
      // 기존 서비스 처분을 개별 승인으로 해제하지 않는다. 실패하면 신청은 pending 으로 남는다.
      await assertApplicantMainActive(m, membership.userId);
      await ensureServiceMembership(m, membership.userId);
      await recordCommunityMembershipChange(m, { communityId: input.communityId, membershipId: membership.id, actorUserId: input.reviewerUserId, action: 'approve', beforeRole: membership.role, afterRole: membership.role, beforeStatus: membership.status, afterStatus: 'active' });
      membership.status = 'active';
      membership.approvedByUserId = input.reviewerUserId;
      membership.approvedAt = new Date();
      return repo.save(membership);
    });
  }

  /** 개설 거절 — 사유를 남긴다. 승인과 같은 주체(`community:admin`)가 한다. */
  async rejectCreation(input: {
    requestId: string;
    reviewerUserId: string;
    reason: string;
  }): Promise<CommunityCreationRequest> {
    return this.dataSource.transaction(async (m) => {
      const repo = m.getRepository(CommunityCreationRequest);
      const request = await loadPendingRequest(m, input.requestId);
      request.status = 'rejected';
      request.reviewedByUserId = input.reviewerUserId;
      request.reviewedAt = new Date();
      request.reason = input.reason;
      return repo.save(request);
    });
  }

  /** 승인 대기 목록 — 심사 화면. */
  async listPendingCreationRequests(): Promise<CommunityCreationRequest[]> {
    return this.dataSource.getRepository(CommunityCreationRequest).find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 내 신청 이력.
   *
   * 신청자가 `slug_conflict` 로 돌아온 신청을 **스스로 확인**할 수 있어야 한다 —
   * 그러지 않으면 재신청하라는 안내가 어디에도 도달하지 않는다.
   */
  async listMyCreationRequests(requesterUserId: string): Promise<CommunityCreationRequest[]> {
    return this.dataSource.getRepository(CommunityCreationRequest).find({
      where: { requesterUserId },
      order: { createdAt: 'DESC' },
    });
  }

  /** 그 커뮤니티의 가입 신청·회원 목록 — 운영자 화면. */
  async listMemberships(input: {
    communityId: string;
    status?: CommunityMembership['status'];
  }): Promise<CommunityMembership[]> {
    return this.dataSource.getRepository(CommunityMembership).find({
      where: {
        communityId: input.communityId,
        ...(input.status ? { status: input.status } : {}),
      },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 가입 심사 화면용 목록 — 그 커뮤니티 행만, 신청자 이름 · **가린 이메일** · 서비스 가입 상태와 함께.
   *
   * 심사자는 서비스 전체 관리자가 아니라 **개체 운영자**(같은 커뮤니티의 회원)다. 신청자를 알아볼 만큼만
   * 보여 주고 이메일 원문은 주지 않는다. 기존 서비스 가입이 비활성이면 승인은 409 로 막힌다.
   */
  async listMembershipsForReview(input: {
    communityId: string;
    status?: CommunityMembership['status'];
    query?: CommunityMemberListQuery;
  }): Promise<{ pagination: ReturnType<typeof communityMemberPagination>; memberships: Array<{
      id: string;
      userId: string;
      role: string;
      status: string;
      createdAt: Date;
      name: string | null;
      emailMasked: string | null;
      serviceMembershipStatus: string | null;
    }> }> {
    const params: unknown[] = [input.communityId, COMMUNITY_SERVICE_KEY];
    const query = input.query ?? { ...DEFAULT_MEMBER_LIST_QUERY, status: input.status };
    const filter = communityMemberListFilter(params, query);
    const from = `FROM community_memberships cm
         LEFT JOIN users u ON u.id = cm.user_id
         LEFT JOIN service_memberships sm ON sm.user_id = cm.user_id AND sm.service_key = $2
        WHERE cm.community_id = $1${filter}`;
    const counts = await this.dataSource.query(`SELECT COUNT(*)::int AS total ${from}`, params);
    const pagination = communityMemberPagination(Number(counts[0]?.total ?? 0), query);
    const pageParams = query.paginate === false ? params : [...params, pagination.pageSize, (pagination.page - 1) * pagination.pageSize];
    const pageClause = query.paginate === false ? '' : `LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`;
    const rows: any[] = await this.dataSource.query(
      `SELECT cm.id, cm.user_id, cm.role, cm.status, cm.created_at,
              u.name AS user_name, u.email AS user_email, sm.status AS service_status
         ${from}
        ORDER BY cm.created_at ASC, cm.id ASC
        ${pageClause}`,
      pageParams,
    );
    return { pagination, memberships: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      role: r.role,
      status: r.status,
      createdAt: r.created_at,
      name: r.user_name ?? null,
      emailMasked: maskEmail(r.user_email),
      serviceMembershipStatus: r.service_status ?? null,
    })) };
  }

  /**
   * 내가 운영하는 커뮤니티 — 가입 심사 화면의 진입 목록.
   *
   * 중앙 서비스 운영자는 활성 독립 커뮤니티 전체를 조회한다. 기존 개체 운영자는 다음 조건이다: 커뮤니티 active ·
   * 내 가입 active · role='operator' · 내 커뮤니티 서비스 가입 active. 서비스 가입이 active 가
   * 아니면 빈 목록이다(심사 경로가 어차피 403 이므로 화면에 들이지 않는다).
   */
  async listOperatedCommunities(userId: string): Promise<
    Array<{ id: string; slug: string; name: string; pendingCount: number; canRestrictMembers: boolean }>
  > {
    if (await getNetureMainMembershipStatus(this.dataSource, userId) !== 'active') return [];
    const canRestrictMembers = await hasCommunityServiceAdmin(this.dataSource, userId);
    if (await hasCommunityServiceOperator(this.dataSource, userId)) {
      const rows: any[] = await this.dataSource.query(
        `SELECT c.id, c.slug, c.name,
           (SELECT COUNT(*)::int FROM community_memberships p
             WHERE p.community_id = c.id AND p.status = 'pending') AS pending_count
         FROM communities c WHERE c.status = 'active' ORDER BY c.name ASC`,
      );
      return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, pendingCount: Number(r.pending_count ?? 0), canRestrictMembers }));
    }
    const rows: any[] = await this.dataSource.query(
      `SELECT c.id, c.slug, c.name, cm.role,
              (SELECT COUNT(*)::int FROM community_memberships p
                WHERE p.community_id = c.id AND p.status = 'pending') AS pending_count
         FROM community_memberships cm
         JOIN communities c ON c.id = cm.community_id
         JOIN service_memberships sm ON sm.user_id = cm.user_id AND sm.service_key = $2 AND sm.status = 'active'
        WHERE cm.user_id = $1 AND cm.status = 'active' AND cm.role IN ('admin', 'operator') AND c.status = 'active'
        ORDER BY c.name ASC`,
      [userId, COMMUNITY_SERVICE_KEY],
    );
    return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, pendingCount: Number(r.pending_count ?? 0), canRestrictMembers: r.role === 'admin' }));
  }

  /** 가입 거절 — 승인과 같은 개체 운영자가 한다. */
  async rejectJoin(input: {
    communityId: string;
    membershipId: string;
    reviewerUserId: string;
    reason?: string | null;
  }): Promise<CommunityMembership> {
    return this.dataSource.transaction(async (m) => {
      const repo = m.getRepository(CommunityMembership);
      const membership = await loadPendingMembership(m, input.communityId, input.membershipId);
      await recordCommunityMembershipChange(m, { communityId: input.communityId, membershipId: membership.id, actorUserId: input.reviewerUserId, action: 'reject', beforeRole: membership.role, afterRole: membership.role, beforeStatus: membership.status, afterStatus: 'rejected', reason: input.reason?.slice(0, 1000) });
      membership.approvedAt = new Date();
      membership.status = 'rejected';
      membership.approvedByUserId = input.reviewerUserId;
      // 거절은 service_memberships 를 만들지 않는다.
      return repo.save(membership);
    });
  }
}

/** 이메일을 알아볼 만큼만 남긴다 — `ab***@example.com`. */
export function maskEmail(email: unknown): string | null {
  if (typeof email !== 'string' || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

/** Approval holds main-account locks until the entity writes commit.
 * Lock users first: the service_memberships FK also makes insertion of a missing
 * main row wait. Existing main suspension/withdrawal updates wait on the second
 * lock; changes committed before either lock are read by the eligibility check.
 */
async function assertApplicantMainActive(m: EntityManager, userId: string): Promise<void> {
  await m.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
  await m.query(
    'SELECT user_id FROM service_memberships WHERE user_id = $1 AND service_key = $2 FOR UPDATE',
    [userId, NETURE_MAIN_SERVICE_KEY],
  );
  await assertNetureMainMembershipActive(m, userId, 'applicant');
}

/**
 * 최초 서비스 가입만 생성한다. 기존 pending/반려/정지/탈퇴 상태의 변경은
 * 서비스 회원 관리에서 수행하며 개별 커뮤니티 승인으로 복구하지 않는다.
 * 충돌 시 UPDATE 하지 않고 현재 행을 잠가 확인하므로 동시 정지를 덮어쓰지 않는다.
 * 호출자는 같은 트랜잭션에서 이 확인 후 개설/가입 승인을 저장한다.
 */
async function ensureServiceMembership(m: EntityManager, userId: string): Promise<void> {
  await m.query(
    `INSERT INTO service_memberships (user_id, service_key, status, created_at, updated_at)
     VALUES ($1, $2, 'active', NOW(), NOW())
     ON CONFLICT (user_id, service_key) DO NOTHING`,
    [userId, COMMUNITY_SERVICE_KEY],
  );
  const rows: Array<{ status: string }> = await m.query(
    `SELECT status FROM service_memberships
      WHERE user_id = $1 AND service_key = $2 FOR UPDATE`,
    [userId, COMMUNITY_SERVICE_KEY],
  );
  const status = rows?.[0]?.status;
  if (status === 'active') return;
  throw new CommunityLifecycleError(
    status === 'suspended' ? 'SERVICE_MEMBERSHIP_SUSPENDED' : 'SERVICE_MEMBERSHIP_NOT_ACTIVE',
    '신청자의 커뮤니티 서비스 가입이 활성 상태가 아닙니다. 서비스 회원 관리에서 처리한 뒤 승인해 주세요.',
    409,
  );
}
