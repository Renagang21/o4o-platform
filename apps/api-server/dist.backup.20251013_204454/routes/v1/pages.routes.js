"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const connection_1 = require("../../database/connection");
const Page_1 = require("../../entities/Page");
const logger_1 = __importDefault(require("../../utils/logger"));
const editor_constants_1 = require("../../config/editor.constants");
const router = (0, express_1.Router)();
// Apply authentication to ALL v1 pages routes
router.use(auth_middleware_1.authenticate);
// Get single page by ID (authenticated)
router.get('/:id', async (req, res) => {
    try {
        const pageRepository = connection_1.AppDataSource.getRepository(Page_1.Page);
        const { id } = req.params;
        // For authenticated endpoints, allow access to all page statuses
        const page = await pageRepository.findOne({
            where: { id },
            relations: ['author', 'parent', 'children', 'lastModifier']
        });
        if (!page) {
            return res.status(404).json({
                error: 'Page not found',
                code: 'PAGE_NOT_FOUND',
                message: 'The requested page does not exist'
            });
        }
        res.json({
            success: true,
            data: page
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching page (v1):', {
            pageId: req.params.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch page'
        });
    }
});
// Get all pages (authenticated)
router.get('/', async (req, res) => {
    try {
        const pageRepository = connection_1.AppDataSource.getRepository(Page_1.Page);
        const { page = 1, per_page = editor_constants_1.PAGINATION_DEFAULTS.PAGES_PER_PAGE, search, status, parent, author, orderby = 'menuOrder', order = 'ASC' } = req.query;
        const pageNumber = parseInt(page);
        const perPage = Math.min(parseInt(per_page), editor_constants_1.PAGINATION_DEFAULTS.MAX_PER_PAGE);
        const offset = (pageNumber - 1) * perPage;
        const queryBuilder = pageRepository.createQueryBuilder('page')
            .leftJoinAndSelect('page.author', 'author')
            .leftJoinAndSelect('page.parent', 'parent');
        // Apply filters
        if (search) {
            queryBuilder.andWhere('(page.title ILIKE :search OR page.content ILIKE :search OR page.excerpt ILIKE :search)', { search: `%${search}%` });
        }
        if (status) {
            queryBuilder.andWhere('page.status = :status', { status });
        }
        if (parent) {
            if (parent === 'null') {
                queryBuilder.andWhere('page.parentId IS NULL');
            }
            else {
                queryBuilder.andWhere('page.parentId = :parent', { parent });
            }
        }
        if (author) {
            queryBuilder.andWhere('page.authorId = :author', { author });
        }
        // Apply ordering
        const orderField = editor_constants_1.SORT_FIELDS.PAGES.includes(orderby) ? orderby : 'menuOrder';
        const orderDirection = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        queryBuilder.orderBy(`page.${orderField}`, orderDirection);
        // Get total count and paginated results
        const [pages, total] = await queryBuilder
            .skip(offset)
            .take(perPage)
            .getManyAndCount();
        res.json({
            success: true,
            data: pages,
            pagination: {
                page: pageNumber,
                per_page: perPage,
                total,
                total_pages: Math.ceil(total / perPage)
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching pages (v1):', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch pages'
        });
    }
});
exports.default = router;
//# sourceMappingURL=pages.routes.js.map