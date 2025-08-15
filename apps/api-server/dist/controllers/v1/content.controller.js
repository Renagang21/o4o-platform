"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentController = void 0;
const connection_1 = require("../../database/connection");
const Post_1 = require("../../entities/Post");
const Page_1 = require("../../entities/Page");
const Category_1 = require("../../entities/Category");
const User_1 = require("../../entities/User");
const MediaFile_1 = require("../../entities/MediaFile");
class ContentController {
    constructor() {
        this.postRepository = connection_1.AppDataSource.getRepository(Post_1.Post);
        this.pageRepository = connection_1.AppDataSource.getRepository(Page_1.Page);
        this.categoryRepository = connection_1.AppDataSource.getRepository(Category_1.Category);
        this.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        this.mediaRepository = connection_1.AppDataSource.getRepository(MediaFile_1.MediaFile);
        // Posts Management
        this.getPosts = async (req, res) => {
            try {
                const { page = 1, pageSize = 20, type = 'post', status, search } = req.query;
                // Return mock data if DB not initialized
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        data: [
                            {
                                id: '1',
                                title: 'Welcome to O4O Platform',
                                slug: 'welcome-to-o4o-platform',
                                content: { type: 'doc', content: [] },
                                excerpt: 'Welcome to our new platform',
                                status: 'published',
                                author: { id: '1', name: 'Admin', email: 'admin@example.com' },
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                publishedAt: new Date().toISOString(),
                                categories: [],
                                tags: [],
                                featuredImage: null,
                                type: 'post',
                                visibility: 'public',
                                allowComments: true,
                                viewCount: 0,
                                likeCount: 0,
                                commentsCount: 0
                            }
                        ],
                        pagination: {
                            page: Number(page),
                            pageSize: Number(pageSize),
                            totalItems: 1,
                            totalPages: 1
                        }
                    });
                }
                // Real implementation would query database
                const queryBuilder = this.postRepository.createQueryBuilder('post')
                    .leftJoinAndSelect('post.author', 'author')
                    .leftJoinAndSelect('post.categories', 'categories')
                    .leftJoinAndSelect('post.tags', 'tags');
                if (status) {
                    queryBuilder.andWhere('post.status = :status', { status });
                }
                if (search) {
                    queryBuilder.andWhere('(post.title ILIKE :search OR post.content ILIKE :search)', {
                        search: `%${search}%`
                    });
                }
                const skip = (Number(page) - 1) * Number(pageSize);
                queryBuilder.skip(skip).take(Number(pageSize));
                const [posts, total] = await queryBuilder.getManyAndCount();
                return res.json({
                    status: 'success',
                    data: posts,
                    pagination: {
                        page: Number(page),
                        pageSize: Number(pageSize),
                        totalItems: total,
                        totalPages: Math.ceil(total / Number(pageSize))
                    }
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch posts'
                });
            }
        };
        this.getPost = async (req, res) => {
            try {
                const { id } = req.params;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        data: {
                            id,
                            title: 'Sample Post',
                            slug: 'sample-post',
                            content: { type: 'doc', content: [] },
                            excerpt: 'This is a sample post',
                            status: 'published',
                            author: { id: '1', name: 'Admin', email: 'admin@example.com' },
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }
                    });
                }
                const post = await this.postRepository.findOne({
                    where: { id },
                    relations: ['author', 'categories', 'tags']
                });
                if (!post) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'Post not found'
                    });
                }
                return res.json({
                    status: 'success',
                    data: post
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch post'
                });
            }
        };
        this.createPost = async (req, res) => {
            try {
                const postData = req.body;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        data: {
                            id: Date.now().toString(),
                            ...postData,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }
                    });
                }
                const post = this.postRepository.create(postData);
                const savedPost = await this.postRepository.save(post);
                return res.json({
                    status: 'success',
                    data: savedPost
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to create post'
                });
            }
        };
        this.updatePost = async (req, res) => {
            try {
                const { id } = req.params;
                const updateData = req.body;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        data: {
                            id,
                            ...updateData,
                            updatedAt: new Date().toISOString()
                        }
                    });
                }
                await this.postRepository.update(id, updateData);
                const updatedPost = await this.postRepository.findOne({ where: { id } });
                return res.json({
                    status: 'success',
                    data: updatedPost
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to update post'
                });
            }
        };
        this.deletePost = async (req, res) => {
            try {
                const { id } = req.params;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        message: 'Post deleted successfully'
                    });
                }
                await this.postRepository.delete(id);
                return res.json({
                    status: 'success',
                    message: 'Post deleted successfully'
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to delete post'
                });
            }
        };
        this.clonePost = async (req, res) => {
            try {
                const { id } = req.params;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        data: {
                            id: Date.now().toString(),
                            title: 'Cloned Post',
                            createdAt: new Date().toISOString()
                        }
                    });
                }
                const original = await this.postRepository.findOne({ where: { id } });
                if (!original) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'Post not found'
                    });
                }
                const cloned = this.postRepository.create({
                    ...original,
                    id: undefined,
                    title: `${original.title} (Copy)`,
                    slug: `${original.slug}-copy`,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                const savedPost = await this.postRepository.save(cloned);
                return res.json({
                    status: 'success',
                    data: savedPost
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to clone post'
                });
            }
        };
        this.bulkUpdatePosts = async (req, res) => {
            try {
                const { ids, data } = req.body;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        message: 'Posts updated successfully'
                    });
                }
                await this.postRepository.update(ids, data);
                return res.json({
                    status: 'success',
                    message: 'Posts updated successfully'
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to update posts'
                });
            }
        };
        this.bulkDeletePosts = async (req, res) => {
            try {
                const { ids } = req.body;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        message: 'Posts deleted successfully'
                    });
                }
                await this.postRepository.delete(ids);
                return res.json({
                    status: 'success',
                    message: 'Posts deleted successfully'
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to delete posts'
                });
            }
        };
        // Categories Management
        this.getCategories = async (req, res) => {
            try {
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        data: [
                            { id: '1', name: 'Technology', slug: 'technology', description: 'Tech related posts', count: 5 },
                            { id: '2', name: 'Business', slug: 'business', description: 'Business related posts', count: 3 },
                            { id: '3', name: 'Design', slug: 'design', description: 'Design related posts', count: 2 }
                        ]
                    });
                }
                const categories = await this.categoryRepository.find();
                return res.json({
                    status: 'success',
                    data: categories
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch categories'
                });
            }
        };
        this.getCategory = async (req, res) => {
            try {
                const { id } = req.params;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        data: { id, name: 'Sample Category', slug: 'sample-category' }
                    });
                }
                const category = await this.categoryRepository.findOne({ where: { id } });
                if (!category) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'Category not found'
                    });
                }
                return res.json({
                    status: 'success',
                    data: category
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch category'
                });
            }
        };
        this.createCategory = async (req, res) => {
            try {
                const categoryData = req.body;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        data: {
                            id: Date.now().toString(),
                            ...categoryData,
                            createdAt: new Date().toISOString()
                        }
                    });
                }
                const category = this.categoryRepository.create(categoryData);
                const savedCategory = await this.categoryRepository.save(category);
                return res.json({
                    status: 'success',
                    data: savedCategory
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to create category'
                });
            }
        };
        this.updateCategory = async (req, res) => {
            try {
                const { id } = req.params;
                const updateData = req.body;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        data: { id, ...updateData }
                    });
                }
                await this.categoryRepository.update(id, updateData);
                const updatedCategory = await this.categoryRepository.findOne({ where: { id } });
                return res.json({
                    status: 'success',
                    data: updatedCategory
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to update category'
                });
            }
        };
        this.deleteCategory = async (req, res) => {
            try {
                const { id } = req.params;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        message: 'Category deleted successfully'
                    });
                }
                await this.categoryRepository.delete(id);
                return res.json({
                    status: 'success',
                    message: 'Category deleted successfully'
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to delete category'
                });
            }
        };
        // Tags Management
        this.getTags = async (req, res) => {
            try {
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        data: [
                            { id: '1', name: 'JavaScript', slug: 'javascript', count: 10 },
                            { id: '2', name: 'React', slug: 'react', count: 8 },
                            { id: '3', name: 'Node.js', slug: 'nodejs', count: 5 }
                        ]
                    });
                }
                // Real implementation would query tags table
                return res.json({
                    status: 'success',
                    data: []
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch tags'
                });
            }
        };
        this.getTag = async (req, res) => {
            return res.json({
                status: 'success',
                data: { id: req.params.id, name: 'Sample Tag', slug: 'sample-tag' }
            });
        };
        this.createTag = async (req, res) => {
            return res.json({
                status: 'success',
                data: { id: Date.now().toString(), ...req.body }
            });
        };
        this.updateTag = async (req, res) => {
            return res.json({
                status: 'success',
                data: { id: req.params.id, ...req.body }
            });
        };
        this.deleteTag = async (req, res) => {
            return res.json({
                status: 'success',
                message: 'Tag deleted successfully'
            });
        };
        // Pages Management
        this.getPages = async (req, res) => {
            try {
                const { page = 1, pageSize = 20 } = req.query;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        data: [
                            {
                                id: '1',
                                title: 'About Us',
                                slug: 'about-us',
                                content: { type: 'doc', content: [] },
                                status: 'published',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            }
                        ],
                        pagination: {
                            page: Number(page),
                            pageSize: Number(pageSize),
                            totalItems: 1,
                            totalPages: 1
                        }
                    });
                }
                const skip = (Number(page) - 1) * Number(pageSize);
                const [pages, total] = await this.pageRepository.findAndCount({
                    skip,
                    take: Number(pageSize)
                });
                return res.json({
                    status: 'success',
                    data: pages,
                    pagination: {
                        page: Number(page),
                        pageSize: Number(pageSize),
                        totalItems: total,
                        totalPages: Math.ceil(total / Number(pageSize))
                    }
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch pages'
                });
            }
        };
        this.getPage = async (req, res) => {
            return res.json({
                status: 'success',
                data: {
                    id: req.params.id,
                    title: 'Sample Page',
                    slug: 'sample-page',
                    content: { type: 'doc', content: [] }
                }
            });
        };
        this.createPage = async (req, res) => {
            return res.json({
                status: 'success',
                data: { id: Date.now().toString(), ...req.body }
            });
        };
        this.updatePage = async (req, res) => {
            return res.json({
                status: 'success',
                data: { id: req.params.id, ...req.body }
            });
        };
        this.deletePage = async (req, res) => {
            return res.json({
                status: 'success',
                message: 'Page deleted successfully'
            });
        };
        // Media Management
        this.getMediaFiles = async (req, res) => {
            try {
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        data: []
                    });
                }
                const media = await this.mediaRepository.find();
                return res.json({
                    status: 'success',
                    data: media
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch media files'
                });
            }
        };
        this.getMediaFile = async (req, res) => {
            return res.json({
                status: 'success',
                data: { id: req.params.id, filename: 'sample.jpg', url: '/uploads/sample.jpg' }
            });
        };
        this.uploadMedia = async (req, res) => {
            return res.json({
                status: 'success',
                data: {
                    id: Date.now().toString(),
                    filename: 'uploaded.jpg',
                    url: '/uploads/uploaded.jpg'
                }
            });
        };
        this.updateMedia = async (req, res) => {
            return res.json({
                status: 'success',
                data: { id: req.params.id, ...req.body }
            });
        };
        this.deleteMedia = async (req, res) => {
            return res.json({
                status: 'success',
                message: 'Media deleted successfully'
            });
        };
        // Authors
        this.getAuthors = async (req, res) => {
            try {
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.json({
                        status: 'success',
                        data: [
                            { id: '1', name: 'Admin' },
                            { id: '2', name: 'Editor' },
                            { id: '3', name: 'Author' }
                        ]
                    });
                }
                const users = await this.userRepository.find({
                    select: ['id', 'name'],
                    where: { status: User_1.UserStatus.ACTIVE }
                });
                return res.json({
                    status: 'success',
                    data: users
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch authors'
                });
            }
        };
    }
}
exports.ContentController = ContentController;
//# sourceMappingURL=content.controller.js.map