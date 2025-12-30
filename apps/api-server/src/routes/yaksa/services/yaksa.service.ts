/**
 * Yaksa Service
 *
 * Phase A-1: Yaksa API Implementation
 * Business logic layer for Yaksa operations
 */

import { DataSource } from 'typeorm';
import { YaksaRepository } from '../repositories/yaksa.repository.js';
import { YaksaPost, YaksaPostStatus } from '../entities/yaksa-post.entity.js';
import { YaksaCategory, YaksaCategoryStatus } from '../entities/yaksa-category.entity.js';
import { YaksaPostLogAction } from '../entities/yaksa-post-log.entity.js';
import {
  ListCategoriesQueryDto,
  CreateCategoryRequestDto,
  UpdateCategoryRequestDto,
  UpdateCategoryStatusRequestDto,
  CategoryResponseDto,
  ListPostsQueryDto,
  CreatePostRequestDto,
  UpdatePostRequestDto,
  UpdatePostStatusRequestDto,
  PostResponseDto,
  PostListItemDto,
  ListLogsQueryDto,
  PostLogResponseDto,
  PaginatedResponseDto,
} from '../dto/index.js';

export class YaksaService {
  private repository: YaksaRepository;

  constructor(private dataSource: DataSource) {
    this.repository = new YaksaRepository(dataSource);
  }

  // ============================================================================
  // Category Methods
  // ============================================================================

  async listCategories(query: ListCategoriesQueryDto): Promise<{ data: CategoryResponseDto[] }> {
    const categories = await this.repository.findAllCategories(query);

    const data = await Promise.all(
      categories.map(async (cat) => {
        const post_count = await this.repository.getCategoryPostCount(cat.id);
        return this.mapCategoryToResponse(cat, post_count);
      })
    );

    return { data };
  }

  async getCategory(id: string): Promise<CategoryResponseDto | null> {
    const category = await this.repository.findCategoryById(id);
    if (!category) return null;

    const post_count = await this.repository.getCategoryPostCount(id);
    return this.mapCategoryToResponse(category, post_count);
  }

  async createCategory(
    dto: CreateCategoryRequestDto,
    userId?: string
  ): Promise<CategoryResponseDto> {
    // Check slug uniqueness
    const existing = await this.repository.findCategoryBySlug(dto.slug);
    if (existing) {
      throw new Error('SLUG_ALREADY_EXISTS');
    }

    const category = await this.repository.createCategory({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      sort_order: dto.sort_order || 0,
      status: 'active' as YaksaCategoryStatus,
      created_by_user_id: userId,
    });

    return this.mapCategoryToResponse(category, 0);
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryRequestDto
  ): Promise<CategoryResponseDto | null> {
    const category = await this.repository.findCategoryById(id);
    if (!category) return null;

    // Check slug uniqueness if changing
    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.repository.findCategoryBySlug(dto.slug);
      if (existing) {
        throw new Error('SLUG_ALREADY_EXISTS');
      }
    }

    const updated = await this.repository.updateCategory(id, {
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      sort_order: dto.sort_order,
    });

    if (!updated) return null;

    const post_count = await this.repository.getCategoryPostCount(id);
    return this.mapCategoryToResponse(updated, post_count);
  }

  async updateCategoryStatus(
    id: string,
    dto: UpdateCategoryStatusRequestDto
  ): Promise<CategoryResponseDto | null> {
    const category = await this.repository.findCategoryById(id);
    if (!category) return null;

    const updated = await this.repository.updateCategory(id, {
      status: dto.status,
    });

    if (!updated) return null;

    const post_count = await this.repository.getCategoryPostCount(id);
    return this.mapCategoryToResponse(updated, post_count);
  }

  private mapCategoryToResponse(
    category: YaksaCategory,
    post_count: number
  ): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      status: category.status,
      sort_order: category.sort_order,
      post_count,
      created_at: category.created_at.toISOString(),
      updated_at: category.updated_at.toISOString(),
    };
  }

  // ============================================================================
  // Post Methods
  // ============================================================================

  async listPosts(query: ListPostsQueryDto): Promise<PaginatedResponseDto<PostListItemDto>> {
    const result = await this.repository.findAllPosts(query);

    return {
      data: result.data.map((post) => this.mapPostToListItem(post)),
      meta: result.meta,
    };
  }

  async getPost(id: string, incrementView = false): Promise<PostResponseDto | null> {
    const post = await this.repository.findPostById(id);
    if (!post) return null;

    if (incrementView) {
      await this.repository.incrementViewCount(id);
      post.view_count += 1;
    }

    return this.mapPostToResponse(post);
  }

  async createPost(
    dto: CreatePostRequestDto,
    userId?: string,
    userName?: string
  ): Promise<PostResponseDto> {
    // Verify category exists
    const category = await this.repository.findCategoryById(dto.category_id);
    if (!category) {
      throw new Error('CATEGORY_NOT_FOUND');
    }

    const now = new Date();
    const postData: Partial<YaksaPost> = {
      category_id: dto.category_id,
      title: dto.title,
      content: dto.content,
      status: dto.status || ('draft' as YaksaPostStatus),
      is_pinned: dto.is_pinned || false,
      is_notice: dto.is_notice || false,
      created_by_user_id: userId,
      created_by_user_name: userName,
      updated_by_user_id: userId,
      updated_by_user_name: userName,
    };

    // Set published_at if status is published
    if (postData.status === 'published') {
      postData.published_at = now;
    }

    const post = await this.repository.createPost(postData);

    // Create log
    await this.repository.createLog({
      post_id: post.id,
      action: 'create' as YaksaPostLogAction,
      after_data: {
        title: post.title,
        status: post.status,
        category_id: post.category_id,
      },
      changed_by_user_id: userId,
      changed_by_user_name: userName,
    });

    // Reload with relations
    const reloaded = await this.repository.findPostById(post.id);
    return this.mapPostToResponse(reloaded!);
  }

  async updatePost(
    id: string,
    dto: UpdatePostRequestDto,
    userId?: string,
    userName?: string
  ): Promise<PostResponseDto | null> {
    const post = await this.repository.findPostById(id);
    if (!post) return null;

    // Verify category if changing
    if (dto.category_id && dto.category_id !== post.category_id) {
      const category = await this.repository.findCategoryById(dto.category_id);
      if (!category) {
        throw new Error('CATEGORY_NOT_FOUND');
      }
    }

    const beforeData = {
      title: post.title,
      content: post.content,
      category_id: post.category_id,
      is_pinned: post.is_pinned,
      is_notice: post.is_notice,
    };

    const updated = await this.repository.updatePost(id, {
      category_id: dto.category_id,
      title: dto.title,
      content: dto.content,
      is_pinned: dto.is_pinned,
      is_notice: dto.is_notice,
      updated_by_user_id: userId,
      updated_by_user_name: userName,
    });

    if (!updated) return null;

    // Create log
    await this.repository.createLog({
      post_id: id,
      action: 'update' as YaksaPostLogAction,
      before_data: beforeData,
      after_data: {
        title: updated.title,
        content: updated.content,
        category_id: updated.category_id,
        is_pinned: updated.is_pinned,
        is_notice: updated.is_notice,
      },
      changed_by_user_id: userId,
      changed_by_user_name: userName,
    });

    return this.mapPostToResponse(updated);
  }

  async updatePostStatus(
    id: string,
    dto: UpdatePostStatusRequestDto,
    userId?: string,
    userName?: string
  ): Promise<PostResponseDto | null> {
    const post = await this.repository.findPostById(id);
    if (!post) return null;

    const beforeStatus = post.status;
    const updateData: Partial<YaksaPost> = {
      status: dto.status,
      updated_by_user_id: userId,
      updated_by_user_name: userName,
    };

    // Set published_at when transitioning to published
    if (dto.status === 'published' && beforeStatus !== 'published') {
      updateData.published_at = new Date();
    }

    const updated = await this.repository.updatePost(id, updateData);
    if (!updated) return null;

    // Create log
    await this.repository.createLog({
      post_id: id,
      action: 'status_change' as YaksaPostLogAction,
      before_data: { status: beforeStatus },
      after_data: { status: dto.status },
      reason: dto.reason,
      changed_by_user_id: userId,
      changed_by_user_name: userName,
    });

    return this.mapPostToResponse(updated);
  }

  private mapPostToResponse(post: YaksaPost): PostResponseDto {
    return {
      id: post.id,
      category_id: post.category_id,
      category: post.category
        ? {
            id: post.category.id,
            name: post.category.name,
            slug: post.category.slug,
            description: post.category.description,
            status: post.category.status,
            sort_order: post.category.sort_order,
            created_at: post.category.created_at.toISOString(),
            updated_at: post.category.updated_at.toISOString(),
          }
        : undefined,
      title: post.title,
      content: post.content,
      status: post.status,
      is_pinned: post.is_pinned,
      is_notice: post.is_notice,
      view_count: post.view_count,
      created_by_user_id: post.created_by_user_id,
      created_by_user_name: post.created_by_user_name,
      created_at: post.created_at.toISOString(),
      updated_at: post.updated_at.toISOString(),
      published_at: post.published_at?.toISOString(),
    };
  }

  private mapPostToListItem(post: YaksaPost): PostListItemDto {
    return {
      id: post.id,
      category_id: post.category_id,
      category_name: post.category?.name,
      title: post.title,
      status: post.status,
      is_pinned: post.is_pinned,
      is_notice: post.is_notice,
      view_count: post.view_count,
      created_by_user_name: post.created_by_user_name,
      created_at: post.created_at.toISOString(),
      published_at: post.published_at?.toISOString(),
    };
  }

  // ============================================================================
  // Log Methods
  // ============================================================================

  async getPostLogs(query: ListLogsQueryDto): Promise<PaginatedResponseDto<PostLogResponseDto>> {
    const result = await this.repository.findPostLogs(query);

    return {
      data: result.data.map((log) => ({
        id: log.id,
        post_id: log.post_id,
        action: log.action,
        before_data: log.before_data,
        after_data: log.after_data,
        reason: log.reason,
        changed_by_user_name: log.changed_by_user_name,
        created_at: log.created_at.toISOString(),
      })),
      meta: result.meta,
    };
  }
}
