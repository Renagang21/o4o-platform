"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = require("../database/connection");
const Template_1 = require("../entities/Template");
const Page_1 = require("../entities/Page");
const CustomPost_1 = require("../entities/CustomPost");
const Product_1 = require("../entities/Product");
const MockDataService_1 = require("../services/MockDataService");
const router = (0, express_1.Router)();
const USE_MOCK = process.env.USE_MOCK === 'true' || !connection_1.AppDataSource.isInitialized;
// Get homepage template
router.get('/templates/homepage', async (req, res) => {
    try {
        let homepageTemplate;
        if (USE_MOCK) {
            // Use mock data
            homepageTemplate = MockDataService_1.MockDataService.getTemplate('homepage');
        }
        else {
            // Use database
            const templateRepository = connection_1.AppDataSource.getRepository(Template_1.Template);
            homepageTemplate = await templateRepository.findOne({
                where: {
                    type: 'page',
                    name: 'homepage',
                    active: true
                }
            });
        }
        if (!homepageTemplate) {
            return res.status(404).json({
                success: false,
                error: 'Homepage template not found'
            });
        }
        res.json({
            success: true,
            data: {
                id: homepageTemplate.id,
                name: homepageTemplate.name,
                blocks: homepageTemplate.content || [],
                metadata: {
                    version: homepageTemplate.version,
                    layoutType: homepageTemplate.layoutType,
                    updatedAt: homepageTemplate.updatedAt
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching homepage template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch homepage template'
        });
    }
});
// Get page by slug
router.get('/pages/:slug', async (req, res) => {
    var _a, _b, _c, _d, _e;
    try {
        const { slug } = req.params;
        const pageRepository = connection_1.AppDataSource.getRepository(Page_1.Page);
        const page = await pageRepository.findOne({
            where: {
                slug,
                status: 'published'
            }
        });
        if (!page) {
            return res.status(404).json({
                success: false,
                error: 'Page not found'
            });
        }
        // Get template if page has one
        let templateContent = null;
        if (page.template) {
            const templateRepository = connection_1.AppDataSource.getRepository(Template_1.Template);
            const template = await templateRepository.findOne({
                where: { slug: page.template }
            });
            if (template) {
                templateContent = template.content;
            }
        }
        res.json({
            success: true,
            data: {
                id: page.id,
                title: page.title,
                slug: page.slug,
                content: page.content,
                blocks: templateContent || page.content || null,
                metadata: {
                    excerpt: page.excerpt,
                    featuredImage: ((_a = page.customFields) === null || _a === void 0 ? void 0 : _a.featuredImage) || null,
                    seo: {
                        metaTitle: ((_b = page.seo) === null || _b === void 0 ? void 0 : _b.title) || page.title,
                        metaDescription: ((_c = page.seo) === null || _c === void 0 ? void 0 : _c.description) || page.excerpt,
                        metaKeywords: ((_e = (_d = page.seo) === null || _d === void 0 ? void 0 : _d.keywords) === null || _e === void 0 ? void 0 : _e.join(', ')) || ''
                    },
                    updatedAt: page.updatedAt
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching page:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch page'
        });
    }
});
// Get template by type
router.get('/templates/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const templateRepository = connection_1.AppDataSource.getRepository(Template_1.Template);
        const template = await templateRepository.findOne({
            where: {
                type: type,
                active: true,
                featured: true
            }
        });
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }
        res.json({
            success: true,
            data: {
                id: template.id,
                name: template.name,
                type: template.type,
                blocks: template.content,
                metadata: {
                    version: template.version,
                    layoutType: template.layoutType,
                    updatedAt: template.updatedAt
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch template'
        });
    }
});
// Get custom post by type and slug
router.get('/posts/:type/:slug', async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { type, slug } = req.params;
        const customPostRepository = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
        const post = await customPostRepository.findOne({
            where: {
                slug,
                status: CustomPost_1.PostStatus.PUBLISHED
            },
            relations: ['postType']
        });
        if (!post || post.postType.slug !== type) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }
        res.json({
            success: true,
            data: {
                id: post.id,
                title: post.title,
                slug: post.slug,
                content: post.content || '',
                customFields: post.fields || {},
                metadata: {
                    excerpt: ((_a = post.meta) === null || _a === void 0 ? void 0 : _a.seoDescription) || '',
                    featuredImage: ((_b = post.meta) === null || _b === void 0 ? void 0 : _b.thumbnail) || null,
                    seo: {
                        metaTitle: ((_c = post.meta) === null || _c === void 0 ? void 0 : _c.seoTitle) || post.title,
                        metaDescription: ((_d = post.meta) === null || _d === void 0 ? void 0 : _d.seoDescription) || '',
                        metaKeywords: ((_f = (_e = post.meta) === null || _e === void 0 ? void 0 : _e.tags) === null || _f === void 0 ? void 0 : _f.join(', ')) || ''
                    },
                    updatedAt: post.updatedAt
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch post'
        });
    }
});
// ========== PRODUCT PUBLIC ENDPOINTS ==========
// Get products list (public)
router.get('/products', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
        const queryBuilder = productRepository.createQueryBuilder('product')
            .where('product.status = :status', { status: 'active' });
        // Apply filters
        if (req.query.category) {
            queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId: req.query.category });
        }
        if (req.query.featured === 'true') {
            queryBuilder.andWhere('product.featured = :featured', { featured: true });
        }
        if (req.query.search) {
            queryBuilder.andWhere('(product.name ILIKE :search OR product.description ILIKE :search)', { search: `%${req.query.search}%` });
        }
        if (req.query.minPrice) {
            queryBuilder.andWhere('product.retailPrice >= :minPrice', { minPrice: parseFloat(req.query.minPrice) });
        }
        if (req.query.maxPrice) {
            queryBuilder.andWhere('product.retailPrice <= :maxPrice', { maxPrice: parseFloat(req.query.maxPrice) });
        }
        // Apply sorting
        const orderBy = req.query.orderby || 'createdAt';
        const order = (req.query.order || 'desc').toUpperCase();
        queryBuilder.orderBy(`product.${orderBy}`, order);
        // Get paginated results
        const [products, total] = await queryBuilder
            .skip(offset)
            .take(limit)
            .getManyAndCount();
        // Transform products to match frontend expectations
        const transformedProducts = products.map((product) => {
            var _a;
            return ({
                id: product.id,
                name: product.name,
                slug: product.slug,
                description: product.description,
                shortDescription: product.shortDescription,
                sku: product.sku,
                price: product.retailPrice,
                compareAtPrice: product.wholesalePrice,
                stockQuantity: product.stockQuantity,
                stockStatus: product.isInStock() ? 'in_stock' : 'out_of_stock',
                type: product.type,
                status: product.status,
                featured: product.featured,
                images: ((_a = product.images) === null || _a === void 0 ? void 0 : _a.map((url, index) => ({
                    id: `${product.id}-img-${index}`,
                    url,
                    alt: product.name
                }))) || [],
                categoryId: product.categoryId,
                tags: product.tags || [],
                metaTitle: product.metaTitle,
                metaDescription: product.metaDescription,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
            });
        });
        res.json({
            data: transformedProducts,
            pagination: {
                current: page,
                total: Math.ceil(total / limit),
                count: limit,
                totalItems: total
            }
        });
    }
    catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch products'
        });
    }
});
// Get single product (public)
router.get('/products/:idOrSlug', async (req, res) => {
    var _a;
    try {
        const { idOrSlug } = req.params;
        const productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
        // Try to find by ID first, then by slug
        let product = await productRepository.findOne({
            where: [
                { id: idOrSlug, status: Product_1.ProductStatus.ACTIVE },
                { slug: idOrSlug, status: Product_1.ProductStatus.ACTIVE }
            ]
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }
        // Transform product to match frontend expectations
        const transformedProduct = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            shortDescription: product.shortDescription,
            sku: product.sku,
            price: product.retailPrice,
            compareAtPrice: product.wholesalePrice,
            costPrice: product.cost,
            stockQuantity: product.stockQuantity,
            stockStatus: product.isInStock() ? 'in_stock' : 'out_of_stock',
            trackInventory: product.manageStock,
            weight: product.weight,
            dimensions: product.dimensions,
            type: product.type,
            status: product.status,
            visibility: 'visible', // Default since entity doesn't have this field
            featured: product.featured,
            images: ((_a = product.images) === null || _a === void 0 ? void 0 : _a.map((url, index) => ({
                id: `${product.id}-img-${index}`,
                url,
                alt: product.name
            }))) || [],
            categoryId: product.categoryId,
            tags: product.tags || [],
            metaTitle: product.metaTitle,
            metaDescription: product.metaDescription,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
        };
        res.json({
            success: true,
            data: transformedProduct
        });
    }
    catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch product'
        });
    }
});
// Get posts list (public) - Add this endpoint for main site
router.get('/posts', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status || 'published';
        const orderBy = req.query.orderBy || 'createdAt';
        const order = req.query.order || 'DESC';
        const offset = (page - 1) * limit;
        // For now, return mock data until we have proper posts entity
        const mockPosts = [
            {
                id: '1',
                title: 'Neture 플랫폼 출시',
                slug: 'neture-platform-launch',
                excerpt: 'O4O 비즈니스를 위한 통합 플랫폼이 출시되었습니다.',
                content: '<p>Neture 플랫폼이 공식 출시되었습니다...</p>',
                status: 'published',
                author: {
                    id: '1',
                    name: 'Admin',
                    avatar: null
                },
                featuredImage: null,
                categories: ['공지사항'],
                tags: ['플랫폼', '출시'],
                publishedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        res.json({
            data: mockPosts,
            pagination: {
                current: page,
                total: 1,
                count: limit,
                totalItems: 1
            }
        });
    }
    catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch posts'
        });
    }
});
// Get featured products (public)
router.get('/featured-products', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;
        const productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
        const products = await productRepository.find({
            where: {
                featured: true,
                status: Product_1.ProductStatus.ACTIVE
            },
            order: {
                createdAt: 'DESC'
            },
            take: limit
        });
        // Transform products to match frontend expectations
        const transformedProducts = products.map((product) => {
            var _a;
            return ({
                id: product.id,
                name: product.name,
                slug: product.slug,
                description: product.description,
                shortDescription: product.shortDescription,
                sku: product.sku,
                price: product.retailPrice,
                compareAtPrice: product.wholesalePrice,
                stockQuantity: product.stockQuantity,
                stockStatus: product.isInStock() ? 'in_stock' : 'out_of_stock',
                type: product.type,
                status: product.status,
                featured: product.featured,
                images: ((_a = product.images) === null || _a === void 0 ? void 0 : _a.map((url, index) => ({
                    id: `${product.id}-img-${index}`,
                    url,
                    alt: product.name
                }))) || [],
                categoryId: product.categoryId,
                tags: product.tags || [],
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
            });
        });
        res.json({
            success: true,
            data: transformedProducts
        });
    }
    catch (error) {
        console.error('Error fetching featured products:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch featured products'
        });
    }
});
exports.default = router;
//# sourceMappingURL=public.js.map