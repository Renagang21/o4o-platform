"use strict";
// Post Creation Controller
// UAGBFormsBlock & UAGBArchiveBlock과 연동하는 API 컨트롤러
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserAvailablePostTypes = exports.getUserStats = exports.deletePost = exports.updatePost = exports.getPostById = exports.createPostType = exports.getPostTypeSchema = exports.getArchiveData = exports.createPost = void 0;
const connection_1 = require("../database/connection");
const CustomPost_1 = require("../entities/CustomPost");
const CustomPostType_1 = require("../entities/CustomPostType");
// Repository 인스턴스들
let postRepository;
let postTypeRepository;
// Repository 초기화
const initRepositories = () => {
    if (!postRepository) {
        postRepository = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
    }
    if (!postTypeRepository) {
        postTypeRepository = connection_1.AppDataSource.getRepository(CustomPostType_1.CustomPostType);
    }
};
/**
 * 🆕 Post 생성 (UAGBFormsBlock Post Creation Mode에서 호출)
 */
const createPost = async (req, res) => {
    try {
        initRepositories();
        const { postTypeSlug, title, content, fields, status = 'draft', authorId, meta } = req.body;
        // Post Type 존재 확인
        const postType = await postTypeRepository.findOne({
            where: { slug: postTypeSlug, active: true }
        });
        if (!postType) {
            return res.status(404).json({
                error: 'Post type not found',
                code: 'POST_TYPE_NOT_FOUND'
            });
        }
        // 새 Post 생성
        const post = new CustomPost_1.CustomPost();
        post.title = title;
        post.postTypeSlug = postTypeSlug;
        post.content = content;
        post.fields = fields || {};
        post.status = status;
        post.authorId = authorId;
        post.meta = meta || {};
        post.slug = post.generateSlug();
        // 발행 상태인 경우 발행 시간 설정
        if (status === 'published') {
            post.publishedAt = new Date();
        }
        // 데이터베이스에 저장
        const savedPost = await postRepository.save(post);
        // Socket.IO로 실시간 알림 (main.ts의 io 인스턴스 필요)
        // TODO: Socket.IO 실시간 알림 구현
        res.status(201).json({
            success: true,
            data: {
                id: savedPost.id,
                title: savedPost.title,
                slug: savedPost.slug,
                status: savedPost.status,
                createdAt: savedPost.createdAt
            }
        });
    }
    catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            error: 'Failed to create post',
            code: 'CREATE_POST_ERROR'
        });
    }
};
exports.createPost = createPost;
/**
 * 🆕 Archive 데이터 조회 (UAGBArchiveBlock에서 호출)
 */
const getArchiveData = async (req, res) => {
    try {
        initRepositories();
        const { postTypeSlug, limit = 10, offset = 0, orderBy = 'createdAt', sortOrder = 'DESC', filters = {}, search } = req.body;
        // 쿼리 빌더 생성
        const queryBuilder = postRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.postType', 'postType')
            .where('post.postTypeSlug = :postTypeSlug', { postTypeSlug })
            .andWhere('post.status = :status', { status: CustomPost_1.PostStatus.PUBLISHED });
        // 검색 조건 추가
        if (search) {
            queryBuilder.andWhere('(post.title ILIKE :search OR post.content ILIKE :search)', { search: `%${search}%` });
        }
        // 필터 조건 추가
        if (filters.authorId) {
            queryBuilder.andWhere('post.authorId = :authorId', { authorId: filters.authorId });
        }
        if (filters.dateRange) {
            queryBuilder.andWhere('post.createdAt BETWEEN :startDate AND :endDate', {
                startDate: filters.dateRange.start,
                endDate: filters.dateRange.end
            });
        }
        // 정렬
        const orderDirection = sortOrder.toUpperCase();
        switch (orderBy) {
            case 'title':
                queryBuilder.orderBy('post.title', orderDirection);
                break;
            case 'views':
                queryBuilder.orderBy('post.viewCount', orderDirection);
                break;
            case 'publishedAt':
                queryBuilder.orderBy('post.publishedAt', orderDirection);
                break;
            default:
                queryBuilder.orderBy('post.createdAt', orderDirection);
        }
        // 페이지네이션
        queryBuilder.skip(offset).take(limit);
        // 실행
        const [posts, totalCount] = await queryBuilder.getManyAndCount();
        // 메타데이터 생성
        const metadata = {
            totalCount,
            currentPage: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(totalCount / limit),
            hasMore: (offset + limit) < totalCount
        };
        res.json({
            success: true,
            data: {
                items: posts.map((post) => {
                    var _a, _b, _c;
                    return ({
                        id: post.id,
                        title: post.title,
                        slug: post.slug,
                        excerpt: post.content ? post.content.substring(0, 200) + '...' : '',
                        content: post.content,
                        date: post.publishedAt || post.createdAt,
                        author: post.authorId, // TODO: User 엔티티와 조인 필요
                        categories: ((_a = post.meta) === null || _a === void 0 ? void 0 : _a.tags) || [],
                        tags: ((_b = post.meta) === null || _b === void 0 ? void 0 : _b.tags) || [],
                        featured_image: (_c = post.meta) === null || _c === void 0 ? void 0 : _c.thumbnail,
                        status: post.status,
                        view_count: post.viewCount,
                        comment_count: 0, // TODO: 댓글 시스템 구현 시 추가
                        fields: post.fields
                    });
                }),
                metadata
            }
        });
    }
    catch (error) {
        console.error('Get archive data error:', error);
        res.status(500).json({
            error: 'Failed to get archive data',
            code: 'GET_ARCHIVE_ERROR'
        });
    }
};
exports.getArchiveData = getArchiveData;
/**
 * 🆕 Post Type 스키마 조회
 */
const getPostTypeSchema = async (req, res) => {
    try {
        initRepositories();
        const { slug } = req.params;
        const postType = await postTypeRepository.findOne({
            where: { slug, active: true }
        });
        if (!postType) {
            return res.status(404).json({
                error: 'Post type not found',
                code: 'POST_TYPE_NOT_FOUND'
            });
        }
        res.json({
            success: true,
            data: {
                slug: postType.slug,
                name: postType.name,
                singularName: postType.singularName,
                description: postType.description,
                fieldGroups: postType.fieldGroups,
                settings: postType.settings
            }
        });
    }
    catch (error) {
        console.error('Get post type schema error:', error);
        res.status(500).json({
            error: 'Failed to get post type schema',
            code: 'GET_SCHEMA_ERROR'
        });
    }
};
exports.getPostTypeSchema = getPostTypeSchema;
/**
 * 🆕 Post Type 생성 (UAGBFormsBlock에서 Post Creation Mode 활성화 시)
 */
const createPostType = async (req, res) => {
    try {
        initRepositories();
        const { slug, name, singularName, description, fieldGroups, settings, createdBy } = req.body;
        // 중복 확인
        const existingPostType = await postTypeRepository.findOne({
            where: { slug }
        });
        if (existingPostType) {
            return res.status(409).json({
                error: 'Post type already exists',
                code: 'POST_TYPE_EXISTS'
            });
        }
        // 새 Post Type 생성
        const postType = new CustomPostType_1.CustomPostType();
        postType.slug = slug;
        postType.name = name;
        postType.singularName = singularName;
        postType.description = description;
        postType.fieldGroups = fieldGroups || [];
        postType.settings = settings || {
            public: true,
            hasArchive: true,
            supports: ['title', 'content']
        };
        postType.createdBy = createdBy;
        const savedPostType = await postTypeRepository.save(postType);
        res.status(201).json({
            success: true,
            data: {
                slug: savedPostType.slug,
                name: savedPostType.name,
                createdAt: savedPostType.createdAt
            }
        });
    }
    catch (error) {
        console.error('Create post type error:', error);
        res.status(500).json({
            error: 'Failed to create post type',
            code: 'CREATE_POST_TYPE_ERROR'
        });
    }
};
exports.createPostType = createPostType;
/**
 * 🆕 개별 Post 조회
 */
const getPostById = async (req, res) => {
    try {
        initRepositories();
        const { id } = req.params;
        const post = await postRepository.findOne({
            where: { id },
            relations: ['postType']
        });
        if (!post) {
            return res.status(404).json({
                error: 'Post not found',
                code: 'POST_NOT_FOUND'
            });
        }
        // 조회수 증가
        await postRepository.increment({ id }, 'viewCount', 1);
        res.json({
            success: true,
            data: {
                id: post.id,
                title: post.title,
                slug: post.slug,
                content: post.content,
                fields: post.fields,
                status: post.status,
                meta: post.meta,
                authorId: post.authorId,
                viewCount: post.viewCount + 1,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt,
                publishedAt: post.publishedAt,
                postType: {
                    slug: post.postType.slug,
                    name: post.postType.name,
                    fieldGroups: post.postType.fieldGroups
                }
            }
        });
    }
    catch (error) {
        console.error('Get post by ID error:', error);
        res.status(500).json({
            error: 'Failed to get post',
            code: 'GET_POST_ERROR'
        });
    }
};
exports.getPostById = getPostById;
/**
 * 🆕 Post 업데이트
 */
const updatePost = async (req, res) => {
    try {
        initRepositories();
        const { id } = req.params;
        const { title, content, fields, status, meta } = req.body;
        const post = await postRepository.findOne({ where: { id } });
        if (!post) {
            return res.status(404).json({
                error: 'Post not found',
                code: 'POST_NOT_FOUND'
            });
        }
        // 업데이트
        if (title)
            post.title = title;
        if (content !== undefined)
            post.content = content;
        if (fields)
            post.fields = { ...post.fields, ...fields };
        if (status)
            post.status = status;
        if (meta)
            post.meta = { ...post.meta, ...meta };
        // 발행 상태 변경 시 발행 시간 업데이트
        if (status === 'published' && !post.publishedAt) {
            post.publishedAt = new Date();
        }
        const updatedPost = await postRepository.save(post);
        res.json({
            success: true,
            data: {
                id: updatedPost.id,
                title: updatedPost.title,
                status: updatedPost.status,
                updatedAt: updatedPost.updatedAt
            }
        });
    }
    catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({
            error: 'Failed to update post',
            code: 'UPDATE_POST_ERROR'
        });
    }
};
exports.updatePost = updatePost;
/**
 * 🆕 Post 삭제
 */
const deletePost = async (req, res) => {
    try {
        initRepositories();
        const { id } = req.params;
        const post = await postRepository.findOne({ where: { id } });
        if (!post) {
            return res.status(404).json({
                error: 'Post not found',
                code: 'POST_NOT_FOUND'
            });
        }
        await postRepository.remove(post);
        res.json({
            success: true,
            message: 'Post deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            error: 'Failed to delete post',
            code: 'DELETE_POST_ERROR'
        });
    }
};
exports.deletePost = deletePost;
/**
 * 🆕 사용자 통계 조회 (UAGBUserDashboardBlock용)
 */
const getUserStats = async (req, res) => {
    try {
        initRepositories();
        const { userId } = req.params;
        // 사용자별 포스트 통계
        const totalPosts = await postRepository
            .createQueryBuilder('post')
            .where('post.authorId = :userId', { userId })
            .getCount();
        const publishedPosts = await postRepository
            .createQueryBuilder('post')
            .where('post.authorId = :userId', { userId })
            .andWhere('post.status = :status', { status: 'published' })
            .getCount();
        const draftPosts = await postRepository
            .createQueryBuilder('post')
            .where('post.authorId = :userId', { userId })
            .andWhere('post.status = :status', { status: 'draft' })
            .getCount();
        // 총 조회수 계산
        const viewsResult = await postRepository
            .createQueryBuilder('post')
            .select('SUM(post.viewCount)', 'totalViews')
            .where('post.authorId = :userId', { userId })
            .getRawOne();
        const totalViews = parseInt((viewsResult === null || viewsResult === void 0 ? void 0 : viewsResult.totalViews) || '0');
        // 상위 포스트 조회
        const topPosts = await postRepository
            .createQueryBuilder('post')
            .where('post.authorId = :userId', { userId })
            .andWhere('post.status = :status', { status: 'published' })
            .orderBy('post.viewCount', 'DESC')
            .limit(5)
            .getMany();
        // Mock 월별 조회수 데이터 (실제로는 별도 통계 테이블 필요)
        const monthlyViews = Array.from({ length: 12 }, () => Math.floor(Math.random() * 300));
        const stats = {
            totalPosts,
            publishedPosts,
            draftPosts,
            totalViews,
            totalComments: 0, // TODO: 댓글 시스템 구현 시 추가
            totalShares: 0, // TODO: 공유 추적 시스템 구현 시 추가
            monthlyViews,
            topPosts: topPosts.map((post) => ({
                id: post.id,
                title: post.title,
                views: post.viewCount,
                date: post.createdAt.toISOString().split('T')[0]
            }))
        };
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            error: 'Failed to get user statistics',
            code: 'GET_USER_STATS_ERROR'
        });
    }
};
exports.getUserStats = getUserStats;
/**
 * 🆕 사용 가능한 Post Type 목록 조회
 */
const getUserAvailablePostTypes = async (req, res) => {
    try {
        initRepositories();
        const postTypes = await postTypeRepository.find({
            where: { active: true },
            select: ['slug', 'name', 'singularName', 'description', 'settings']
        });
        res.json({
            success: true,
            data: {
                postTypes: postTypes.map((pt) => ({
                    slug: pt.slug,
                    name: pt.name,
                    singularName: pt.singularName,
                    description: pt.description,
                    supports: pt.settings.supports || []
                }))
            }
        });
    }
    catch (error) {
        console.error('Get available post types error:', error);
        res.status(500).json({
            error: 'Failed to get available post types',
            code: 'GET_POST_TYPES_ERROR'
        });
    }
};
exports.getUserAvailablePostTypes = getUserAvailablePostTypes;
//# sourceMappingURL=post-creation.js.map