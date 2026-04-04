/**
 * ForumCategoryRequestService
 *
 * WO-O4O-FORUM-REQUEST-UNIFICATION-PHASE1-V1
 * 포럼 카테고리 생성 요청 공통 서비스
 *
 * - forum_category_requests 테이블 사용 (serviceCode 격리)
 * - 신청자 CRUD: create, listMy, getDetail, update
 * - 운영자 심사: review (approve/reject/revision)
 * - 승인 시 ForumCategory 자동 생성 (트랜잭션)
 */

import { AppDataSource } from '../../database/connection.js';
import { ForumCategoryRequest } from '@o4o/forum-core/entities';
import { ForumCategory } from '@o4o/forum-core/entities';
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

export class ForumCategoryRequestService {
  private get requestRepo() {
    return AppDataSource.getRepository(ForumCategoryRequest);
  }

  private get categoryRepo() {
    return AppDataSource.getRepository(ForumCategory);
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

    const entity = this.requestRepo.create({
      serviceCode,
      organizationId: organizationId || undefined,
      name: name.trim(),
      description: description.trim(),
      reason: reason || undefined,
      forumType: forumType || 'open',
      iconEmoji: iconEmoji || undefined,
      iconUrl: iconUrl || undefined,
      tags: tags || undefined,
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

    // action === 'approve' — 트랜잭션: 승인 + ForumCategory 생성
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      row.status = 'approved' as any;
      row.reviewerId = reviewer.id;
      row.reviewerName = reviewer.name || reviewer.email || 'Operator';
      row.reviewComment = reviewComment || undefined;
      row.reviewedAt = new Date();

      // ForumCategory 생성
      const slug = generateSlug(row.name);
      const existingCategory = await queryRunner.manager.findOne(ForumCategory, { where: { slug } });

      let createdCategory = null;
      if (existingCategory) {
        row.createdCategoryId = existingCategory.id;
        row.createdCategorySlug = existingCategory.slug;
        logger.info(`[ForumCategoryRequest] Category already exists: ${slug}`);
      } else {
        const category = queryRunner.manager.create(ForumCategory, {
          name: row.name,
          description: row.description,
          slug,
          color: '#3B82F6',
          iconEmoji: row.iconEmoji || undefined,
          iconUrl: row.iconUrl || undefined,
          sortOrder: 100,
          isActive: true,
          requireApproval: false,
          accessLevel: 'all',
          forumType: row.forumType || 'open',
          createdBy: row.requesterId,
          organizationId: row.organizationId || undefined,
          isOrganizationExclusive: !!row.organizationId,
        });
        createdCategory = await queryRunner.manager.save(ForumCategory, category);

        // WO-KPA-A-FORUM-OWNER-MEMBERSHIP-AUTO-SYNC-V1
        await queryRunner.query(
          `INSERT INTO forum_category_members (forum_category_id, user_id, role, joined_at, created_at, updated_at)
           VALUES ($1, $2, 'owner', NOW(), NOW(), NOW())
           ON CONFLICT (forum_category_id, user_id) DO NOTHING`,
          [createdCategory.id, row.requesterId],
        );

        row.createdCategoryId = createdCategory.id;
        row.createdCategorySlug = createdCategory.slug;
        logger.info(`[ForumCategoryRequest] Created category: ${createdCategory.name} (${createdCategory.slug})`);
      }

      await queryRunner.manager.save(ForumCategoryRequest, row);
      await queryRunner.commitTransaction();

      return {
        data: {
          request: row,
          category: createdCategory ? {
            id: createdCategory.id,
            name: createdCategory.name,
            slug: createdCategory.slug,
          } : null,
        },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}

/** Singleton instance */
export const forumCategoryRequestService = new ForumCategoryRequestService();
