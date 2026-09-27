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
  | 'ALREADY_MEMBER'
  | 'MEMBERSHIP_NOT_FOUND'
  | 'MEMBERSHIP_NOT_PENDING'
  | 'REQUEST_FORBIDDEN';

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
  const community = await m.getRepository(Community).findOne({ where: { slug } });
  if (community) return true;
  const pending = await m.getRepository(CommunityCreationRequest).findOne({
    where: { desiredSlug: slug, status: 'pending' },
  });
  return !!pending;
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
      const request = await reqRepo.findOne({ where: { id: input.requestId } });
      if (!request) {
        throw new CommunityLifecycleError('REQUEST_NOT_FOUND', '신청을 찾을 수 없습니다.', 404);
      }
      if (request.status !== 'pending') {
        throw new CommunityLifecycleError('REQUEST_NOT_PENDING', '이미 처리된 신청입니다.', 409);
      }

      // 승인 직전 재검사 — pending 인 자기 자신은 제외하고 본다.
      const existing = await m.getRepository(Community).findOne({ where: { slug: request.desiredSlug } });
      if (existing) {
        request.status = 'slug_conflict';
        request.reviewedByUserId = input.reviewerUserId;
        request.reviewedAt = new Date();
        request.reason = `승인 직전 주소가 선점되었습니다(${request.desiredSlug}). 새 주소로 다시 신청해 주세요.`;
        await reqRepo.save(request);
        return { outcome: 'slug_conflict' as const, slug: request.desiredSlug };
      }

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
      await m.getRepository(CommunityMembership).save(
        m.getRepository(CommunityMembership).create({
          communityId: community.id,
          userId: request.requesterUserId,
          role: 'operator',
          status: 'active',
          approvedByUserId: input.reviewerUserId,
          approvedAt: new Date(),
        }),
      );

      // 진입 자격(가입). 없으면 자기 커뮤니티 관리 화면에서 막힌다(V8).
      await ensureServiceMembership(m, request.requesterUserId);

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
      const repo = m.getRepository(CommunityMembership);
      const existing = await repo.findOne({
        where: { communityId: input.communityId, userId: input.userId },
      });
      if (existing && (existing.status === 'active' || existing.status === 'pending')) {
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
      const membership = await repo.findOne({ where: { id: input.membershipId } });
      // 다른 커뮤니티의 membershipId 를 넘겨도 여기서 걸린다.
      if (!membership || membership.communityId !== input.communityId) {
        throw new CommunityLifecycleError('MEMBERSHIP_NOT_FOUND', '가입 신청을 찾을 수 없습니다.', 404);
      }
      if (membership.status !== 'pending') {
        throw new CommunityLifecycleError('MEMBERSHIP_NOT_PENDING', '이미 처리된 신청입니다.', 409);
      }
      membership.status = 'active';
      membership.approvedByUserId = input.reviewerUserId;
      membership.approvedAt = new Date();
      const saved = await repo.save(membership);

      await ensureServiceMembership(m, membership.userId);
      return saved;
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
      const request = await repo.findOne({ where: { id: input.requestId } });
      if (!request) {
        throw new CommunityLifecycleError('REQUEST_NOT_FOUND', '신청을 찾을 수 없습니다.', 404);
      }
      if (request.status !== 'pending') {
        throw new CommunityLifecycleError('REQUEST_NOT_PENDING', '이미 처리된 신청입니다.', 409);
      }
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

  /** 가입 거절 — 승인과 같은 개체 운영자가 한다. */
  async rejectJoin(input: {
    communityId: string;
    membershipId: string;
    reviewerUserId: string;
    reason?: string | null;
  }): Promise<CommunityMembership> {
    return this.dataSource.transaction(async (m) => {
      const repo = m.getRepository(CommunityMembership);
      const membership = await repo.findOne({ where: { id: input.membershipId } });
      if (!membership || membership.communityId !== input.communityId) {
        throw new CommunityLifecycleError('MEMBERSHIP_NOT_FOUND', '가입 신청을 찾을 수 없습니다.', 404);
      }
      if (membership.status !== 'pending') {
        throw new CommunityLifecycleError('MEMBERSHIP_NOT_PENDING', '이미 처리된 신청입니다.', 409);
      }
      membership.status = 'rejected';
      membership.approvedByUserId = input.reviewerUserId;
      // 거절은 service_memberships 를 만들지 않는다.
      return repo.save(membership);
    });
  }
}

/**
 * `service_memberships('community')` 를 active 로 만든다(없으면 생성).
 *
 * **이것은 가입이지 운영 권한이 아니다.** 새 `community` 서비스 키에 가입 검사가 붙으므로,
 * 이 행이 없으면 개체 운영자여도 화면 진입에서 막힌다(V8). 역할은 여전히 개체 단위다.
 */
async function ensureServiceMembership(m: EntityManager, userId: string): Promise<void> {
  await m.query(
    `INSERT INTO service_memberships (user_id, service_key, status, created_at, updated_at)
     VALUES ($1, $2, 'active', NOW(), NOW())
     ON CONFLICT (user_id, service_key)
     DO UPDATE SET status = 'active', updated_at = NOW()`,
    [userId, COMMUNITY_SERVICE_KEY],
  );
}
