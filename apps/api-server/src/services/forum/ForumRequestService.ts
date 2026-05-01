/**
 * ForumRequestService
 *
 * WO-O4O-FORUM-REQUEST-UNIFICATION-PHASE1-V1
 * WO-O4O-FORUM-NAMING-CLEANUP-V1: ForumCategoryRequestService → ForumRequestService
 *
 * 포럼 생성 신청 공통 서비스
 *
 * - forum_category_requests 테이블 사용 (serviceCode 격리)
 * - 신청자 CRUD: create, listMy, getDetail, update
 * - 운영자 심사: review (approve/reject/revision)
 * - 승인 시 즉시 포럼 생성 + status → 'completed' (WO-O4O-FORUM-REQUEST-FLOW-SIMPLIFY-V1)
 */

import { AppDataSource } from '../../database/connection.js';
import { ForumCategoryRequest } from '@o4o/forum-core/entities';
// ForumCategory removed — WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1
import logger from '../../utils/logger.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Generate URL-safe slug from name */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200);
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
}

export interface RequestUser {
  id: string;
  name?: string;
  email?: string;
  roles?: string[];
}

export interface CreateRequestInput {
  serviceCode: string;
  organizationId?: string;
  name: string;
  description: string;
  reason?: string;
  forumType?: string;
  iconEmoji?: string;
  iconUrl?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ListRequestsFilter {
  serviceCode: string;
  organizationId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ReviewInput {
  action: 'approve' | 'reject' | 'revision';
  reviewComment?: string;
}

type ServiceResult<T = any> = { data: T } | { error: { status: number; code: string; message: string } };

export class ForumRequestService {
  private get requestRepo() {
    return AppDataSource.getRepository(ForumCategoryRequest);
  }

  /** 신청 생성 */
  async create(user: RequestUser, input: CreateRequestInput): Promise<ServiceResult> {
    const { serviceCode, organizationId, name, description, reason, forumType, iconEmoji, iconUrl, tags, metadata } = input;

    if (!name || name.trim().length < 2 || name.trim().length > 100) {
      return { error: { status: 400, code: 'INVALID_NAME', message: 'name은 2~100자 필수' } };
    }
    if (!description || description.trim().length < 10) {
      return { error: { status: 400, code: 'INVALID_DESC', message: 'description은 10자 이상 필수' } };
    }
    if (!tags || tags.length === 0) {
      return { error: { status: 400, code: 'TAGS_REQUIRED', message: '태그를 1개 이상 선택해주세요' } };
    }
    if (tags.length > 5) {
      return { error: { status: 400, code: 'TAGS_TOO_MANY', message: '태그는 최대 5개까지 선택할 수 있습니다' } };
    }

    // Sanitize tags: trim, # 제거, 빈값 제거, 30자 제한, 중복 제거
    const sanitizedTags = [...new Set(
      tags.map((t: string) => String(t).trim().replace(/^#/, ''))
        .filter(Boolean)
        .filter((t: string) => t.length <= 30)
    )];
    if (sanitizedTags.length === 0) {
      return { error: { status: 400, code: 'TAGS_REQUIRED', message: '유효한 태그를 1개 이상 입력해주세요' } };
    }

    const entity = this.requestRepo.create({
      serviceCode,
      organizationId: organizationId || undefined,
      name: name.trim(),
      description: description.trim(),
      reason: reason || undefined,
      forumType: forumType || 'open',
      iconEmoji: iconEmoji || undefined,
      iconUrl: iconUrl || undefined,
      tags: sanitizedTags,
      metadata: metadata || undefined,
      status: 'pending' as any,
      requesterId: user.id,
      requesterName: user.name || user.email || 'Unknown',
      requesterEmail: user.email || undefined,
    });

    const saved = await this.requestRepo.save(entity);
    return { data: saved };
  }

  /** 내 신청 목록 */
  async listMy(userId: string, serviceCode: string, organizationId?: string): Promise<ServiceResult> {
    const where: any = { requesterId: userId, serviceCode };
    if (organizationId) where.organizationId = organizationId;

    const rows = await this.requestRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return { data: rows };
  }

  /** 신청 상세 (소유자 검증은 컨트롤러에서) */
  async getDetail(requestId: string, serviceCode: string): Promise<ServiceResult> {
    if (!UUID_RE.test(requestId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid ID' } };
    }

    const row = await this.requestRepo.findOne({
      where: { id: requestId, serviceCode },
    });
    if (!row) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Request not found' } };
    }
    return { data: row };
  }

  /** 신청 수정 (pending/revision_requested 상태만) */
  async update(requestId: string, userId: string, serviceCode: string, input: Partial<CreateRequestInput>): Promise<ServiceResult> {
    if (!UUID_RE.test(requestId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid ID' } };
    }

    const row = await this.requestRepo.findOne({
      where: { id: requestId, serviceCode },
    });
    if (!row) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Request not found' } };
    }
    if (row.requesterId !== userId) {
      return { error: { status: 403, code: 'FORBIDDEN', message: '본인의 신청만 수정 가능합니다' } };
    }
    if (row.status !== 'pending' && row.status !== 'revision_requested') {
      return { error: { status: 400, code: 'INVALID_STATUS', message: `현재 상태(${row.status})에서는 수정할 수 없습니다` } };
    }

    // Apply partial updates
    if (input.name) row.name = input.name.trim();
    if (input.description) row.description = input.description.trim();
    if (input.reason !== undefined) row.reason = input.reason || undefined;
    if (input.forumType) row.forumType = input.forumType;
    if (input.iconEmoji !== undefined) row.iconEmoji = input.iconEmoji || undefined;
    if (input.iconUrl !== undefined) row.iconUrl = input.iconUrl || undefined;
    if (input.tags !== undefined) row.tags = input.tags || undefined;
    if (input.metadata !== undefined) row.metadata = input.metadata || undefined;

    // revision_requested 상태에서 수정하면 pending으로 복귀
    if (row.status === 'revision_requested') {
      row.status = 'pending' as any;
    }

    const saved = await this.requestRepo.save(row);
    return { data: saved };
  }

  /** 서비스별 전체 목록 (운영자용) */
  async listByService(filters: ListRequestsFilter): Promise<ServiceResult> {
    const { serviceCode, organizationId, status } = filters;
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);

    const qb = this.requestRepo.createQueryBuilder('r')
      .where('r.serviceCode = :serviceCode', { serviceCode });

    if (status && status !== 'all') {
      qb.andWhere('r.status = :status', { status });
    }
    if (organizationId) {
      qb.andWhere('r.organizationId = :organizationId', { organizationId });
    }

    qb.orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: {
        data: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** 대기 중인 신청 수 */
  async getPendingCount(serviceCode: string): Promise<ServiceResult> {
    const count = await this.requestRepo.count({
      where: { serviceCode, status: 'pending' as any },
    });
    return { data: { count } };
  }

  /** 운영자 심사 (approve / reject / revision) */
  async review(
    requestId: string,
    serviceCode: string,
    reviewer: RequestUser,
    input: ReviewInput,
  ): Promise<ServiceResult> {
    if (!UUID_RE.test(requestId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid ID' } };
    }

    const row = await this.requestRepo.findOne({
      where: { id: requestId, serviceCode },
    });
    if (!row) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Request not found' } };
    }

    // 심사 가능 상태: pending, revision_requested
    if (row.status !== 'pending' && row.status !== 'revision_requested') {
      return { error: { status: 400, code: 'INVALID_STATUS', message: `현재 상태(${row.status})에서는 심사할 수 없습니다` } };
    }

    const { action, reviewComment } = input;

    if (action === 'revision') {
      // 보완 요청
      row.status = 'revision_requested' as any;
      row.reviewerId = reviewer.id;
      row.reviewerName = reviewer.name || reviewer.email || 'Operator';
      row.reviewComment = reviewComment || '보완이 필요합니다';
      row.reviewedAt = new Date();

      const saved = await this.requestRepo.save(row);
      return { data: saved };
    }

    if (action === 'reject') {
      row.status = 'rejected' as any;
      row.reviewerId = reviewer.id;
      row.reviewerName = reviewer.name || reviewer.email || 'Operator';
      row.reviewComment = reviewComment || undefined;
      row.reviewedAt = new Date();

      const saved = await this.requestRepo.save(row);
      return { data: saved };
    }

    // action === 'approve' — 승인 즉시 포럼 생성 (WO-O4O-FORUM-REQUEST-FLOW-SIMPLIFY-V1)
    row.reviewerId = reviewer.id;
    row.reviewerName = reviewer.name || reviewer.email || 'Operator';
    row.reviewComment = reviewComment || undefined;
    row.reviewedAt = new Date();
    row.errorMessage = undefined;

    try {
      if (!row.slug) {
        row.slug = generateSlug(row.name);
      }

      // WO-KPA-A-FORUM-OWNER-MEMBERSHIP-AUTO-SYNC-V1
      await AppDataSource.query(
        `INSERT INTO forum_category_members (forum_category_id, user_id, role, joined_at, created_at, updated_at)
         VALUES ($1, $2, 'owner', NOW(), NOW(), NOW())
         ON CONFLICT (forum_category_id, user_id) DO NOTHING`,
        [row.id, row.requesterId],
      );

      row.status = 'completed' as any;
      const saved = await this.requestRepo.save(row);

      logger.info(`[ForumRequest] Approved & created: ${row.name} (id: ${row.id}, slug: ${row.slug})`);

      return {
        data: {
          ...saved,
          forum: { id: saved.id, name: saved.name, slug: saved.slug },
        },
      };
    } catch (err: any) {
      row.status = 'failed' as any;
      row.errorMessage = err?.message || '포럼 생성 중 오류가 발생했습니다';
      try {
        await this.requestRepo.save(row);
      } catch (saveErr) {
        logger.error('[ForumRequest] Failed to persist failed status:', saveErr);
      }
      logger.error('[ForumRequest] Approve + create failed:', err);
      return {
        error: {
          status: 500,
          code: 'FORUM_CREATE_FAILED',
          message: err?.message || '포럼 생성에 실패했습니다',
        },
      };
    }
  }

  /**
   * 포럼 재생성 (failed → completed/failed)
   *
   * WO-O4O-FORUM-REQUEST-FLOW-SIMPLIFY-V1: approve 시 자동 생성으로 전환.
   * 이 메서드는 생성 실패(failed) 상태에서 재시도 전용.
   */
  async createForumFromRequest(
    requestId: string,
    serviceCode: string,
  ): Promise<ServiceResult> {
    if (!UUID_RE.test(requestId)) {
      return { error: { status: 400, code: 'INVALID_ID', message: 'Invalid ID' } };
    }

    const row = await this.requestRepo.findOne({
      where: { id: requestId, serviceCode },
    });
    if (!row) {
      return { error: { status: 404, code: 'NOT_FOUND', message: 'Request not found' } };
    }

    // WO-O4O-FORUM-REQUEST-FLOW-SIMPLIFY-V1: failed 상태에서만 재시도 가능
    if ((row.status as string) !== 'failed') {
      return {
        error: {
          status: 400,
          code: 'INVALID_STATUS',
          message: `현재 상태(${row.status})에서는 재생성할 수 없습니다. failed 상태에서만 가능합니다`,
        },
      };
    }

    // WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1
    // forum_category 테이블 제거 — forum_category_requests 자체가 forum SSOT.
    // ForumCategory 생성 불필요; slug 확정 후 status → 'completed'

    // CREATING 상태로 전이
    row.status = 'creating' as any;
    row.errorMessage = undefined;
    await this.requestRepo.save(row);

    try {
      // Ensure slug is set on the request entity
      if (!row.slug) {
        row.slug = generateSlug(row.name);
      }

      // WO-KPA-A-FORUM-OWNER-MEMBERSHIP-AUTO-SYNC-V1
      // Register requester as owner in forum_category_members
      // (forum_category_requests.id is used as forum_category_id — FK constraint removed after table drop)
      await AppDataSource.query(
        `INSERT INTO forum_category_members (forum_category_id, user_id, role, joined_at, created_at, updated_at)
         VALUES ($1, $2, 'owner', NOW(), NOW(), NOW())
         ON CONFLICT (forum_category_id, user_id) DO NOTHING`,
        [row.id, row.requesterId],
      );

      row.status = 'completed' as any;
      await this.requestRepo.save(row);

      logger.info(`[ForumRequest] Forum completed: ${row.name} (id: ${row.id}, slug: ${row.slug})`);

      return {
        data: {
          request: row,
          forum: {
            id: row.id,
            name: row.name,
            slug: row.slug,
          },
        },
      };
    } catch (err: any) {
      // FAILED 상태로 전이 + 오류 메시지 기록
      try {
        row.status = 'failed' as any;
        row.errorMessage = err?.message || '포럼 생성 중 알 수 없는 오류가 발생했습니다';
        await this.requestRepo.save(row);
      } catch (saveErr) {
        logger.error('[ForumRequest] Failed to persist failed status:', saveErr);
      }

      logger.error('[ForumRequest] Forum creation failed:', err);
      return {
        error: {
          status: 500,
          code: 'FORUM_CREATE_FAILED',
          message: err?.message || '포럼 생성에 실패했습니다',
        },
      };
    }
  }
}

/** Singleton instance */
export const forumRequestService = new ForumRequestService();
