"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forumService = exports.ForumService = void 0;
const typeorm_1 = require("typeorm");
const connection_1 = require("../database/connection");
const ForumCategory_1 = require("../entities/ForumCategory");
const ForumPost_1 = require("../entities/ForumPost");
const ForumComment_1 = require("../entities/ForumComment");
const ForumTag_1 = require("../entities/ForumTag");
const User_1 = require("../entities/User");
const CacheService_1 = require("./CacheService");
class ForumService {
    constructor() {
        this.categoryRepository = connection_1.AppDataSource.getRepository(ForumCategory_1.ForumCategory);
        this.postRepository = connection_1.AppDataSource.getRepository(ForumPost_1.ForumPost);
        this.commentRepository = connection_1.AppDataSource.getRepository(ForumComment_1.ForumComment);
        this.tagRepository = connection_1.AppDataSource.getRepository(ForumTag_1.ForumTag);
        this.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
    }
    // Category Methods
    async createCategory(data, creatorId) {
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
    async updateCategory(categoryId, data) {
        const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
        if (!category)
            return null;
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
    async getCategories(includeInactive = false) {
        const cacheKey = `forum_categories_${includeInactive}`;
        const cached = await CacheService_1.cacheService.get(cacheKey);
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
        const categories = await queryBuilder.getMany();
        // 캐시에 저장 (10분)
        await CacheService_1.cacheService.set(cacheKey, categories, undefined, { ttl: 600 });
        return categories;
    }
    async getCategoryBySlug(slug) {
        return await this.categoryRepository.findOne({
            where: { slug, isActive: true },
            relations: ['parent', 'children', 'creator', 'lastPost', 'lastPost.author']
        });
    }
    // Post Methods
    async createPost(data, authorId) {
        const category = await this.categoryRepository.findOne({
            where: { id: data.categoryId }
        });
        if (!category) {
            throw new Error('Category not found');
        }
        const post = this.postRepository.create({
            ...data,
            authorId,
            slug: this.generateSlug(data.title || ''),
            status: category.requireApproval ? ForumPost_1.PostStatus.PENDING : ForumPost_1.PostStatus.PUBLISHED,
            publishedAt: category.requireApproval ? undefined : new Date()
        });
        // 태그 처리
        if (data.tags && data.tags.length > 0) {
            await this.processTags(data.tags);
        }
        const savedPost = await this.postRepository.save(post);
        // 카테고리 통계 업데이트
        if (savedPost.status === ForumPost_1.PostStatus.PUBLISHED) {
            await this.updateCategoryStats(category.id, 'increment_post');
        }
        // 캐시 무효화
        await this.invalidatePostCache(category.id);
        return savedPost;
    }
    async updatePost(postId, data, userId, userRole) {
        const post = await this.postRepository.findOne({
            where: { id: postId },
            relations: ['category', 'author']
        });
        if (!post)
            return null;
        if (!post.canUserEdit(userId, userRole)) {
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
    async getPost(postId, userId) {
        const post = await this.postRepository.findOne({
            where: { id: postId },
            relations: ['category', 'author', 'comments', 'comments.author', 'lastCommenter']
        });
        if (!post)
            return null;
        // 조회수 증가 (조회한 사용자가 작성자가 아닌 경우)
        if (userId && userId !== post.authorId) {
            setTimeout(async () => {
                await this.incrementPostViews(postId);
            }, 0);
        }
        return post;
    }
    async getPostBySlug(slug, userId) {
        const post = await this.postRepository.findOne({
            where: { slug, status: ForumPost_1.PostStatus.PUBLISHED },
            relations: ['category', 'author', 'comments', 'comments.author', 'lastCommenter']
        });
        if (!post)
            return null;
        // 조회수 증가
        if (userId && userId !== post.authorId) {
            setTimeout(async () => {
                await this.incrementPostViews(post.id);
            }, 0);
        }
        return post;
    }
    async searchPosts(options, userRole = 'customer') {
        var _a, _b;
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 50);
        const skip = (page - 1) * limit;
        let queryBuilder = this.postRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.category', 'category')
            .leftJoinAndSelect('post.author', 'author')
            .leftJoinAndSelect('post.lastCommenter', 'lastCommenter')
            .where('post.status = :status', { status: ForumPost_1.PostStatus.PUBLISHED });
        // 접근 권한 필터링
        queryBuilder.andWhere('category.isActive = :isActive', { isActive: true });
        // 카테고리 필터
        if (options.categoryId) {
            queryBuilder.andWhere('post.categoryId = :categoryId', { categoryId: options.categoryId });
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
            queryBuilder.andWhere('(post.title ILIKE :query OR post.content ILIKE :query OR post.excerpt ILIKE :query)', { query: `%${options.query}%` });
        }
        // 태그 필터
        if (options.tags && options.tags.length > 0) {
            queryBuilder.andWhere('post.tags && :tags', { tags: options.tags });
        }
        // 날짜 범위 필터
        if ((_a = options.dateRange) === null || _a === void 0 ? void 0 : _a.start) {
            queryBuilder.andWhere('post.createdAt >= :startDate', { startDate: options.dateRange.start });
        }
        if ((_b = options.dateRange) === null || _b === void 0 ? void 0 : _b.end) {
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
                    .addSelect('(post.viewCount * 0.1 + post.commentCount * 2 + post.likeCount * 1.5) / EXTRACT(epoch FROM (NOW() - post.createdAt)) * 86400', 'trending')
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
    async createComment(data, authorId) {
        var _a;
        const post = await this.postRepository.findOne({
            where: { id: data.postId },
            relations: ['category']
        });
        if (!post) {
            throw new Error('Post not found');
        }
        const comment = this.commentRepository.create({
            ...data,
            authorId,
            status: ((_a = post.category) === null || _a === void 0 ? void 0 : _a.requireApproval) ? ForumComment_1.CommentStatus.PENDING : ForumComment_1.CommentStatus.PUBLISHED
        });
        // 멘션 추출
        comment.extractMentions();
        const savedComment = await this.commentRepository.save(comment);
        // 게시글 통계 업데이트
        if (savedComment.status === ForumComment_1.CommentStatus.PUBLISHED) {
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
    async getComments(postId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [comments, totalCount] = await this.commentRepository.findAndCount({
            where: {
                postId,
                status: ForumComment_1.CommentStatus.PUBLISHED,
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
    async getForumStatistics() {
        const cacheKey = 'forum_statistics';
        const cached = await CacheService_1.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalPosts, totalComments, totalUsers, todayPosts, todayComments, popularTags, activeCategories, topContributors] = await Promise.all([
            this.postRepository.count({ where: { status: ForumPost_1.PostStatus.PUBLISHED } }),
            this.commentRepository.count({ where: { status: ForumComment_1.CommentStatus.PUBLISHED } }),
            this.userRepository.count(),
            this.postRepository.count({
                where: {
                    status: ForumPost_1.PostStatus.PUBLISHED,
                    createdAt: (0, typeorm_1.MoreThanOrEqual)(today)
                }
            }),
            this.commentRepository.count({
                where: {
                    status: ForumComment_1.CommentStatus.PUBLISHED,
                    createdAt: (0, typeorm_1.MoreThanOrEqual)(today)
                }
            }),
            this.getPopularTags(10),
            this.getActiveCategories(10),
            this.getTopContributors(10)
        ]);
        const statistics = {
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
        await CacheService_1.cacheService.set(cacheKey, statistics, undefined, { ttl: 300 });
        return statistics;
    }
    // Helper Methods
    generateSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9가-힣\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 200);
    }
    async processTags(tags) {
        for (const tagName of tags) {
            const slug = ForumTag_1.ForumTag.generateSlug(tagName);
            let tag = await this.tagRepository.findOne({ where: { slug } });
            if (!tag) {
                tag = this.tagRepository.create({
                    name: tagName,
                    slug,
                    usageCount: 1
                });
                await this.tagRepository.save(tag);
            }
            else {
                await this.tagRepository.update(tag.id, {
                    usageCount: tag.usageCount + 1
                });
            }
        }
    }
    async updateCategoryStats(categoryId, action) {
        const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
        if (!category)
            return;
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
    async updatePostStats(postId, action, userId) {
        const post = await this.postRepository.findOne({ where: { id: postId } });
        if (!post)
            return;
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
    async updateCommentStats(commentId, action) {
        const comment = await this.commentRepository.findOne({ where: { id: commentId } });
        if (!comment)
            return;
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
    async incrementPostViews(postId) {
        await this.postRepository.update(postId, {
            viewCount: () => 'viewCount + 1'
        });
    }
    async getPopularTags(limit) {
        const tags = await this.tagRepository.find({
            where: { isActive: true },
            order: { usageCount: 'DESC' },
            take: limit
        });
        return tags.map((tag) => ({
            name: tag.name,
            count: tag.usageCount
        }));
    }
    async getActiveCategories(limit) {
        const categories = await this.categoryRepository.find({
            where: { isActive: true },
            order: { postCount: 'DESC' },
            take: limit
        });
        return categories.map((cat) => ({
            name: cat.name,
            postCount: cat.postCount
        }));
    }
    async getTopContributors(limit) {
        // 복잡한 쿼리는 직접 SQL로 구현
        const result = await connection_1.AppDataSource.query(`
      SELECT 
        u.id as "userId",
        u.username,
        COALESCE(p.post_count, 0) as "postCount",
        COALESCE(c.comment_count, 0) as "commentCount"
      FROM "user" u
      LEFT JOIN (
        SELECT "authorId", COUNT(*) as post_count
        FROM forum_post 
        WHERE status = 'published'
        GROUP BY "authorId"
      ) p ON u.id = p."authorId"
      LEFT JOIN (
        SELECT "authorId", COUNT(*) as comment_count
        FROM forum_comment 
        WHERE status = 'published'
        GROUP BY "authorId"
      ) c ON u.id = c."authorId"
      WHERE u."isActive" = true
      ORDER BY (COALESCE(p.post_count, 0) * 2 + COALESCE(c.comment_count, 0)) DESC
      LIMIT $1
    `, [limit]);
        return result;
    }
    async invalidateCategoryCache() {
        // 카테고리 관련 캐시 무효화
        // 실제 구현에서는 패턴 매칭으로 관련 캐시들을 일괄 삭제
    }
    async invalidatePostCache(categoryId) {
        // 게시글 관련 캐시 무효화
        // 실제 구현에서는 패턴 매칭으로 관련 캐시들을 일괄 삭제
    }
}
exports.ForumService = ForumService;
exports.forumService = new ForumService();
//# sourceMappingURL=forumService.js.map