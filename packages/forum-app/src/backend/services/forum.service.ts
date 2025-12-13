import { MoreThanOrEqual, DataSource } from 'typeorm';
import { ForumCategory } from '../entities/ForumCategory.js';
import { ForumPost, PostStatus, PostType } from '../entities/ForumPost.js';
import { ForumComment, CommentStatus } from '../entities/ForumComment.js';
import { ForumTag } from '../entities/ForumTag.js';
import { canCreatePost, canManagePost, canCreateCategory, canManageCategory, canCreateComment, canManageComment } from '../utils/forumPermissions.js';

// DataSource and CacheService are injected at runtime from api-server
// This avoids direct import of api-server modules
let AppDataSource: DataSource;
let cacheService: { get: (key: string) => Promise<any>; set: (key: string, value: any, options?: any, meta?: any) => Promise<void> };

/**
 * Initialize the forum service with required dependencies
 * Called by api-server during module loading
 */
export function initForumService(dataSource: DataSource, cache: any): void {
  AppDataSource = dataSource;
  cacheService = cache;
}

export interface ForumSearchOptions {
  query?: string;
  categoryId?: string;
  authorId?: string;
  organizationId?: string;
  tags?: string[];
  type?: PostType;
  status?: PostStatus;
  page?: number;
  limit?: number;
  sortBy?: 'latest' | 'popular' | 'trending' | 'oldest';
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface ForumStatistics {
  totalPosts: number;
  totalComments: number;
  totalUsers: number;
  todayPosts: number;
  todayComments: number;
  popularTags: Array<{ name: string; count: number }>;
  activeCategories: Array<{ name: string; postCount: number }>;
  topContributors: Array<{ userId: string; username: string; postCount: number; commentCount: number }>;
}

export class ForumService {
  private get categoryRepository() { return AppDataSource.getRepository(ForumCategory); }
  private get postRepository() { return AppDataSource.getRepository(ForumPost); }
  private get commentRepository() { return AppDataSource.getRepository(ForumComment); }
  private get tagRepository() { return AppDataSource.getRepository(ForumTag); }
  // User repository is accessed via raw query since User entity is in api-server

  // Category Methods
  async createCategory(data: Partial<ForumCategory>, creatorId: string): Promise<ForumCategory> {
    // Permission check: can user create category in this organization?
    const hasPermission = await canCreateCategory(
      AppDataSource,
      creatorId,
      data.organizationId
    );
    if (!hasPermission) {
      throw new Error(
        `Permission denied: cannot create category${data.organizationId ? ` in organization ${data.organizationId}` : ''}`
      );
    }

    const category = this.categoryRepository.create({
      ...data,
      createdBy: creatorId,
      slug: this.generateSlug(data.name || '')
    });

    const savedCategory = await this.categoryRepository.save(category);

    // 캐시 무효화
    await this.invalidateCategoryCache();

    return savedCategory;
  }

  async updateCategory(categoryId: string, data: Partial<ForumCategory>): Promise<ForumCategory | null> {
    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
    if (!category) return null;

    if (data.name && data.name !== category.name) {
      data.slug = this.generateSlug(data.name);
    }

    await this.categoryRepository.update(categoryId, data);
    const updatedCategory = await this.categoryRepository.findOne({ 
      where: { id: categoryId },
      relations: ['parent', 'children', 'creator']
    });

    // 캐시 무효화
    await this.invalidateCategoryCache();

    return updatedCategory;
  }

  async getCategories(
    includeInactive: boolean = false,
    organizationId?: string
  ): Promise<ForumCategory[]> {
    const cacheKey = `forum_categories_${includeInactive}_${organizationId || 'all'}`;
    const cached = await cacheService.get(cacheKey) as ForumCategory[] | null;

    if (cached) {
      return cached;
    }

    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .leftJoinAndSelect('category.children', 'children')
      .leftJoinAndSelect('category.creator', 'creator')
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('category.name', 'ASC');

    if (!includeInactive) {
      queryBuilder.where('category.isActive = :isActive', { isActive: true });
    }

    // Organization filter
    if (organizationId) {
      queryBuilder.andWhere(
        '(category.organizationId = :organizationId OR category.organizationId IS NULL)',
        { organizationId }
      );
    }

    const categories = await queryBuilder.getMany();

    // 캐시에 저장 (10분)
    await cacheService.set(cacheKey, categories, undefined, { ttl: 600 });

    return categories;
  }

  async getCategoryBySlug(slug: string): Promise<ForumCategory | null> {
    return await this.categoryRepository.findOne({
      where: { slug, isActive: true },
      relations: ['parent', 'children', 'creator', 'lastPost', 'lastPost.author']
    });
  }

  // Post Methods
  async createPost(data: Partial<ForumPost>, authorId: string): Promise<ForumPost> {
    const category = await this.categoryRepository.findOne({
      where: { id: data.categoryId }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // Permission check: can user create post in this organization?
    if (data.organizationId || category.organizationId) {
      const orgId = data.organizationId || category.organizationId;
      const hasPermission = await canCreatePost(AppDataSource, authorId, orgId);
      if (!hasPermission) {
        throw new Error(`Permission denied: cannot create post in organization ${orgId}`);
      }
    }

    const post = this.postRepository.create({
      ...data,
      authorId,
      slug: this.generateSlug(data.title || ''),
      status: category.requireApproval ? PostStatus.PENDING : PostStatus.PUBLISHED,
      publishedAt: category.requireApproval ? undefined : new Date()
    });

    // 태그 처리
    if (data.tags && data.tags.length > 0) {
      await this.processTags(data.tags);
    }

    const savedPost = await this.postRepository.save(post);

    // 카테고리 통계 업데이트
    if (savedPost.status === PostStatus.PUBLISHED) {
      await this.updateCategoryStats(category.id, 'increment_post');
    }

    // 캐시 무효화
    await this.invalidatePostCache(category.id);

    return savedPost;
  }

  async updatePost(postId: string, data: Partial<ForumPost>, userId: string, userRole: string): Promise<ForumPost | null> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['category', 'author']
    });

    if (!post) return null;

    // Permission check: can user manage this post?
    const hasPermission = await canManagePost(
      AppDataSource,
      userId,
      post.authorId,
      post.organizationId
    );
    if (!hasPermission) {
      throw new Error('Insufficient permissions to edit this post');
    }

    if (data.title && data.title !== post.title) {
      data.slug = this.generateSlug(data.title);
    }

    // 태그 처리
    if (data.tags) {
      await this.processTags(data.tags);
    }

    await this.postRepository.update(postId, data);
    const updatedPost = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['category', 'author', 'comments']
    });

    // 캐시 무효화
    await this.invalidatePostCache(post.categoryId);

    return updatedPost;
  }

  async getPost(postId: string, userId?: string): Promise<ForumPost | null> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['category', 'author', 'comments', 'comments.author', 'lastCommenter']
    });

    if (!post) return null;

    // 조회수 증가 (조회한 사용자가 작성자가 아닌 경우)
    if (userId && userId !== post.authorId) {
      setTimeout(async () => {
        await this.incrementPostViews(postId);
      }, 0);
    }

    return post;
  }

  async getPostBySlug(slug: string, userId?: string): Promise<ForumPost | null> {
    const post = await this.postRepository.findOne({
      where: { slug, status: PostStatus.PUBLISHED },
      relations: ['category', 'author', 'comments', 'comments.author', 'lastCommenter']
    });

    if (!post) return null;

    // 조회수 증가
    if (userId && userId !== post.authorId) {
      setTimeout(async () => {
        await this.incrementPostViews(post.id);
      }, 0);
    }

    return post;
  }

  async searchPosts(options: ForumSearchOptions, userRole: string = 'customer'): Promise<{
    posts: ForumPost[];
    totalCount: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 50);
    const skip = (page - 1) * limit;

    let queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.lastCommenter', 'lastCommenter')
      .where('post.status = :status', { status: PostStatus.PUBLISHED });

    // 접근 권한 필터링
    queryBuilder.andWhere('category.isActive = :isActive', { isActive: true });
    
    // 카테고리 필터
    if (options.categoryId) {
      queryBuilder.andWhere('post.categoryId = :categoryId', { categoryId: options.categoryId });
    }

    // 조직 필터
    if (options.organizationId) {
      queryBuilder.andWhere('post.organizationId = :organizationId', { organizationId: options.organizationId });
    }

    // 작성자 필터
    if (options.authorId) {
      queryBuilder.andWhere('post.authorId = :authorId', { authorId: options.authorId });
    }

    // 타입 필터
    if (options.type) {
      queryBuilder.andWhere('post.type = :type', { type: options.type });
    }

    // 검색어 필터
    if (options.query) {
      queryBuilder.andWhere(
        '(post.title ILIKE :query OR post.content ILIKE :query OR post.excerpt ILIKE :query)',
        { query: `%${options.query}%` }
      );
    }

    // 태그 필터
    if (options.tags && options.tags.length > 0) {
      queryBuilder.andWhere('post.tags && :tags', { tags: options.tags });
    }

    // 날짜 범위 필터
    if (options.dateRange?.start) {
      queryBuilder.andWhere('post.createdAt >= :startDate', { startDate: options.dateRange.start });
    }
    if (options.dateRange?.end) {
      queryBuilder.andWhere('post.createdAt <= :endDate', { endDate: options.dateRange.end });
    }

    // 정렬
    switch (options.sortBy) {
      case 'popular':
        queryBuilder
          .addSelect('(post.viewCount * 0.1 + post.commentCount * 2 + post.likeCount * 1.5)', 'popularity')
          .orderBy('popularity', 'DESC')
          .addOrderBy('post.createdAt', 'DESC');
        break;
      case 'trending':
        queryBuilder
          .addSelect(
            '(post.viewCount * 0.1 + post.commentCount * 2 + post.likeCount * 1.5) / EXTRACT(epoch FROM (NOW() - post.createdAt)) * 86400',
            'trending'
          )
          .where('post.createdAt >= :weekAgo', { weekAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
          .orderBy('trending', 'DESC');
        break;
      case 'oldest':
        queryBuilder.orderBy('post.createdAt', 'ASC');
        break;
      case 'latest':
      default:
        queryBuilder
          .orderBy('post.isPinned', 'DESC')
          .addOrderBy('post.createdAt', 'DESC');
        break;
    }

    // 페이지네이션
    queryBuilder.skip(skip).take(limit);

    const [posts, totalCount] = await queryBuilder.getManyAndCount();

    return {
      posts,
      totalCount,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  // Comment Methods
  async createComment(data: Partial<ForumComment>, authorId: string): Promise<ForumComment> {
    const post = await this.postRepository.findOne({
      where: { id: data.postId }
    });

    if (!post) {
      throw new Error('Post not found');
    }

    // Permission check: can user create comment in this organization?
    const hasPermission = await canCreateComment(
      AppDataSource,
      authorId,
      post.organizationId
    );
    if (!hasPermission) {
      throw new Error(
        `Permission denied: cannot create comment${post.organizationId ? ` in organization ${post.organizationId}` : ''}`
      );
    }

    // Await the lazy-loaded category to check requireApproval
    const category = post.category ? await post.category : null;
    const requireApproval = category?.requireApproval ?? false;

    const comment = this.commentRepository.create({
      ...data,
      authorId,
      status: requireApproval ? CommentStatus.PENDING : CommentStatus.PUBLISHED
    });

    // 멘션 추출
    comment.extractMentions();

    const savedComment = await this.commentRepository.save(comment);

    // 게시글 통계 업데이트
    if (savedComment.status === CommentStatus.PUBLISHED) {
      await this.updatePostStats(post.id, 'increment_comment', authorId);
      if (post.category) {
        await this.updateCategoryStats(post.categoryId, 'increment_comment');
      }
    }

    // 부모 댓글 통계 업데이트
    if (savedComment.parentId) {
      await this.updateCommentStats(savedComment.parentId, 'increment_reply');
    }

    return savedComment;
  }

  async getComments(postId: string, page: number = 1, limit: number = 20): Promise<{
    comments: ForumComment[];
    totalCount: number;
    pagination: { page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [comments, totalCount] = await this.commentRepository.findAndCount({
      where: { 
        postId, 
        status: CommentStatus.PUBLISHED,
        parentId: undefined // 최상위 댓글만 (null 대신 undefined 사용)
      },
      relations: ['author', 'replies', 'replies.author'],
      order: { createdAt: 'ASC' },
      skip,
      take: limit
    });

    return {
      comments,
      totalCount,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  // Statistics and Analytics
  async getForumStatistics(): Promise<ForumStatistics> {
    const cacheKey = 'forum_statistics';
    const cached = await cacheService.get(cacheKey) as ForumStatistics | null;
    
    if (cached) {
      return cached;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalPosts,
      totalComments,
      totalUsers,
      todayPosts,
      todayComments,
      popularTags,
      activeCategories,
      topContributors
    ] = await Promise.all([
      this.postRepository.count({ where: { status: PostStatus.PUBLISHED } }),
      this.commentRepository.count({ where: { status: CommentStatus.PUBLISHED } }),
      AppDataSource.query('SELECT COUNT(*) as count FROM "user"').then((r: any[]) => parseInt(r[0]?.count || '0', 10)),
      this.postRepository.count({ 
        where: { 
          status: PostStatus.PUBLISHED,
          createdAt: MoreThanOrEqual(today)
        } 
      }),
      this.commentRepository.count({ 
        where: { 
          status: CommentStatus.PUBLISHED,
          createdAt: MoreThanOrEqual(today)
        } 
      }),
      this.getPopularTags(10),
      this.getActiveCategories(10),
      this.getTopContributors(10)
    ]);

    const statistics: ForumStatistics = {
      totalPosts,
      totalComments,
      totalUsers,
      todayPosts,
      todayComments,
      popularTags,
      activeCategories,
      topContributors
    };

    // 캐시에 저장 (5분)
    await cacheService.set(cacheKey, statistics, undefined, { ttl: 300 });

    return statistics;
  }

  // Helper Methods
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);
  }

  private async processTags(tags: string[]): Promise<void> {
    for (const tagName of tags) {
      const slug = ForumTag.generateSlug(tagName);
      
      let tag = await this.tagRepository.findOne({ where: { slug } });
      
      if (!tag) {
        tag = this.tagRepository.create({
          name: tagName,
          slug,
          usageCount: 1
        });
        await this.tagRepository.save(tag);
      } else {
        await this.tagRepository.update(tag.id, {
          usageCount: tag.usageCount + 1
        });
      }
    }
  }

  private async updateCategoryStats(categoryId: string, action: 'increment_post' | 'increment_comment' | 'decrement_post' | 'decrement_comment'): Promise<void> {
    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
    if (!category) return;

    switch (action) {
      case 'increment_post':
        category.incrementPostCount();
        break;
      case 'increment_comment':
        category.incrementCommentCount();
        break;
      case 'decrement_post':
        category.decrementPostCount();
        break;
      case 'decrement_comment':
        category.decrementCommentCount();
        break;
    }

    await this.categoryRepository.save(category);
  }

  private async updatePostStats(postId: string, action: 'increment_comment' | 'decrement_comment', userId?: string): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) return;

    switch (action) {
      case 'increment_comment':
        if (userId) {
          post.incrementCommentCount(userId);
        }
        break;
      case 'decrement_comment':
        post.decrementCommentCount();
        break;
    }

    await this.postRepository.save(post);
  }

  private async updateCommentStats(commentId: string, action: 'increment_reply' | 'decrement_reply'): Promise<void> {
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });
    if (!comment) return;

    switch (action) {
      case 'increment_reply':
        comment.incrementReplyCount();
        break;
      case 'decrement_reply':
        comment.decrementReplyCount();
        break;
    }

    await this.commentRepository.save(comment);
  }

  private async incrementPostViews(postId: string): Promise<void> {
    await this.postRepository.update(postId, {
      viewCount: () => 'viewCount + 1'
    });
  }

  private async getPopularTags(limit: number): Promise<Array<{ name: string; count: number }>> {
    const tags = await this.tagRepository.find({
      where: { isActive: true },
      order: { usageCount: 'DESC' },
      take: limit
    });

    return tags.map((tag: any) => ({
      name: tag.name,
      count: tag.usageCount
    }));
  }

  private async getActiveCategories(limit: number): Promise<Array<{ name: string; postCount: number }>> {
    const categories = await this.categoryRepository.find({
      where: { isActive: true },
      order: { postCount: 'DESC' },
      take: limit
    });

    return categories.map((cat: any) => ({
      name: cat.name,
      postCount: cat.postCount
    }));
  }

  private async getTopContributors(limit: number): Promise<Array<{ userId: string; username: string; postCount: number; commentCount: number }>> {
    // 복잡한 쿼리는 직접 SQL로 구현
    const result = await AppDataSource.query(`
      SELECT 
        u.id as "userId",
        u.username,
        COALESCE(p.post_count, 0) as "postCount",
        COALESCE(c.comment_count, 0) as "commentCount"
      FROM "user" u
      LEFT JOIN (
        SELECT "author_id", COUNT(*) as post_count
        FROM forum_post 
        WHERE status = 'publish'
        GROUP BY "author_id"
      ) p ON u.id = p."author_id"
      LEFT JOIN (
        SELECT "author_id", COUNT(*) as comment_count
        FROM forum_comment 
        WHERE status = 'publish'
        GROUP BY "author_id"
      ) c ON u.id = c."author_id"
      WHERE u."isActive" = true
      ORDER BY (COALESCE(p.post_count, 0) * 2 + COALESCE(c.comment_count, 0)) DESC
      LIMIT $1
    `, [limit]);

    return result;
  }

  private async invalidateCategoryCache(): Promise<void> {
    // 카테고리 관련 캐시 무효화
    // 실제 구현에서는 패턴 매칭으로 관련 캐시들을 일괄 삭제
  }

  private async invalidatePostCache(categoryId: string): Promise<void> {
    // 게시글 관련 캐시 무효화
    // 실제 구현에서는 패턴 매칭으로 관련 캐시들을 일괄 삭제
  }
}

export const forumService = new ForumService();