/**
 * Yaksa Repository
 *
 * Phase A-1: Yaksa API Implementation
 * Data access layer for Yaksa entities
 */

import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { YaksaCategory, YaksaCategoryStatus } from '../entities/yaksa-category.entity.js';
import { YaksaPost, YaksaPostStatus } from '../entities/yaksa-post.entity.js';
import { YaksaPostLog, YaksaPostLogAction } from '../entities/yaksa-post-log.entity.js';
import {
  ListPostsQueryDto,
  ListCategoriesQueryDto,
  ListLogsQueryDto,
  PaginationMeta,
} from '../dto/index.js';

export class YaksaRepository {
  private categoryRepo: Repository<YaksaCategory>;
  private postRepo: Repository<YaksaPost>;
  private logRepo: Repository<YaksaPostLog>;

  constructor(private dataSource: DataSource) {
    this.categoryRepo = dataSource.getRepository(YaksaCategory);
    this.postRepo = dataSource.getRepository(YaksaPost);
    this.logRepo = dataSource.getRepository(YaksaPostLog);
  }

  // ============================================================================
  // Category Methods
  // ============================================================================

  async findAllCategories(query: ListCategoriesQueryDto): Promise<YaksaCategory[]> {
    const qb = this.categoryRepo.createQueryBuilder('category');

    if (query.status) {
      qb.andWhere('category.status = :status', { status: query.status });
    }

    qb.orderBy('category.sort_order', 'ASC');
    qb.addOrderBy('category.name', 'ASC');

    return qb.getMany();
  }

  async findCategoryById(id: string): Promise<YaksaCategory | null> {
    return this.categoryRepo.findOne({ where: { id } });
  }

  async findCategoryBySlug(slug: string): Promise<YaksaCategory | null> {
    return this.categoryRepo.findOne({ where: { slug } });
  }

  async createCategory(data: Partial<YaksaCategory>): Promise<YaksaCategory> {
    const category = this.categoryRepo.create(data);
    return this.categoryRepo.save(category);
  }

  async updateCategory(id: string, data: Partial<YaksaCategory>): Promise<YaksaCategory | null> {
    await this.categoryRepo.update(id, data);
    return this.findCategoryById(id);
  }

  async getCategoryPostCount(categoryId: string): Promise<number> {
    return this.postRepo.count({
      where: { category_id: categoryId, status: 'published' as YaksaPostStatus },
    });
  }

  // ============================================================================
  // Post Methods
  // ============================================================================

  async findAllPosts(
    query: ListPostsQueryDto
  ): Promise<{ data: YaksaPost[]; meta: PaginationMeta }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.category', 'category');

    // Filters
    if (query.category_id) {
      qb.andWhere('post.category_id = :category_id', { category_id: query.category_id });
    }

    if (query.status) {
      qb.andWhere('post.status = :status', { status: query.status });
    }

    if (query.is_pinned !== undefined) {
      qb.andWhere('post.is_pinned = :is_pinned', { is_pinned: query.is_pinned });
    }

    if (query.is_notice !== undefined) {
      qb.andWhere('post.is_notice = :is_notice', { is_notice: query.is_notice });
    }

    // Sorting
    const sortField = query.sort || 'created_at';
    const sortOrder = (query.order || 'desc').toUpperCase() as 'ASC' | 'DESC';

    // Pinned posts first
    qb.orderBy('post.is_pinned', 'DESC');
    qb.addOrderBy(`post.${sortField}`, sortOrder);

    // Pagination
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPostById(id: string): Promise<YaksaPost | null> {
    return this.postRepo.findOne({
      where: { id },
      relations: ['category'],
    });
  }

  async createPost(data: Partial<YaksaPost>): Promise<YaksaPost> {
    const post = this.postRepo.create(data);
    return this.postRepo.save(post);
  }

  async updatePost(id: string, data: Partial<YaksaPost>): Promise<YaksaPost | null> {
    await this.postRepo.update(id, data);
    return this.findPostById(id);
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.postRepo.increment({ id }, 'view_count', 1);
  }

  // ============================================================================
  // Log Methods
  // ============================================================================

  async createLog(data: Partial<YaksaPostLog>): Promise<YaksaPostLog> {
    const log = this.logRepo.create(data);
    return this.logRepo.save(log);
  }

  async findPostLogs(
    query: ListLogsQueryDto
  ): Promise<{ data: YaksaPostLog[]; meta: PaginationMeta }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.logRepo.createQueryBuilder('log');

    if (query.post_id) {
      qb.andWhere('log.post_id = :post_id', { post_id: query.post_id });
    }

    qb.orderBy('log.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
