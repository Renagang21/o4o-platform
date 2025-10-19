"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PagesController = void 0;
const connection_1 = require("../database/connection");
const Page_1 = require("../entities/Page");
const User_1 = require("../entities/User");
const CustomField_1 = require("../entities/CustomField");
const uuid_1 = require("uuid");
const typeorm_1 = require("typeorm");
class PagesController {
    constructor() {
        this.pageRepository = connection_1.AppDataSource.getRepository(Page_1.Page);
        this.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        this.customFieldValueRepository = connection_1.AppDataSource.getRepository(CustomField_1.CustomFieldValue);
    }
    // GET /api/admin/pages
    async getPages(req, res) {
        try {
            const { page = 1, pageSize = 20, type = 'page', status, author, search, dateFrom, dateTo, parentId, orderBy = 'updated_at', order = 'desc' } = req.query;
            const queryBuilder = this.pageRepository
                .createQueryBuilder('page')
                .leftJoinAndSelect('page.author', 'author')
                .leftJoinAndSelect('page.parent', 'parent')
                .leftJoinAndSelect('page.children', 'children')
                .where('page.type = :type', { type });
            // Apply filters
            if (status) {
                queryBuilder.andWhere('page.status = :status', { status });
            }
            if (author) {
                queryBuilder.andWhere('page.author_id = :author', { author });
            }
            if (search) {
                queryBuilder.andWhere('(page.title ILIKE :search OR page.excerpt ILIKE :search)', { search: `%${search}%` });
            }
            if (dateFrom) {
                queryBuilder.andWhere('page.createdAt >= :dateFrom', { dateFrom });
            }
            if (dateTo) {
                queryBuilder.andWhere('page.createdAt <= :dateTo', { dateTo });
            }
            if (parentId) {
                queryBuilder.andWhere('page.parentId = :parentId', { parentId });
            }
            // Apply ordering
            const validOrderFields = ['title', 'createdAt', 'updatedAt', 'publishedAt', 'views'];
            const orderField = validOrderFields.includes(orderBy) ? orderBy : 'updatedAt';
            const orderDirection = order === 'asc' ? 'ASC' : 'DESC';
            queryBuilder.orderBy(`page.${orderField}`, orderDirection);
            // Apply pagination
            const skip = (Number(page) - 1) * Number(pageSize);
            queryBuilder.skip(skip).take(Number(pageSize));
            const [pages, totalItems] = await queryBuilder.getManyAndCount();
            // Get custom field values for each page
            const pagesWithCustomFields = await Promise.all(pages.map(async (pageItem) => {
                const customFieldValues = await this.customFieldValueRepository.find({
                    where: { entityId: pageItem.id, entityType: 'page' },
                    relations: ['field']
                });
                const customFields = {};
                customFieldValues.forEach((cfv) => {
                    customFields[cfv.field.name] = cfv.value;
                });
                return {
                    ...pageItem,
                    customFields
                };
            }));
            const totalPages = Math.ceil(totalItems / Number(pageSize));
            res.json({
                success: true,
                data: pagesWithCustomFields,
                pagination: {
                    currentPage: Number(page),
                    totalPages,
                    totalItems,
                    pageSize: Number(pageSize),
                    hasNext: Number(page) < totalPages,
                    hasPrev: Number(page) > 1
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Failed to fetch pages',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // GET /api/admin/pages/:id
    async getPage(req, res) {
        try {
            const { id } = req.params;
            const page = await this.pageRepository.findOne({
                where: { id },
                relations: ['author', 'parent', 'children', 'lastModifier']
            });
            if (!page) {
                return res.status(404).json({
                    success: false,
                    message: 'Page not found'
                });
            }
            // Get custom field values
            const customFieldValues = await this.customFieldValueRepository.find({
                where: { entityId: id, entityType: 'page' },
                relations: ['field']
            });
            const customFields = {};
            customFieldValues.forEach((cfv) => {
                customFields[cfv.field.name] = cfv.value;
            });
            res.json({
                success: true,
                data: {
                    ...page,
                    customFields
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Failed to fetch page',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // POST /api/admin/pages
    async createPage(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }
            const { title, slug, content, excerpt, status = 'draft', type = 'page', template, parentId, menuOrder = 0, showInMenu = true, isHomepage = false, seo, customFields, publishedAt, scheduledAt, password, passwordProtected = false, allowComments = true, commentStatus = 'open', layoutSettings } = req.body;
            // Generate unique slug if not provided
            let finalSlug = slug;
            if (!finalSlug) {
                finalSlug = title.toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .trim();
                // Ensure uniqueness
                let counter = 1;
                let testSlug = finalSlug;
                while (await this.pageRepository.findOne({ where: { slug: testSlug } })) {
                    testSlug = `${finalSlug}-${counter}`;
                    counter++;
                }
                finalSlug = testSlug;
            }
            const page = this.pageRepository.create({
                title,
                slug: finalSlug,
                content,
                excerpt,
                status,
                type,
                template,
                parentId,
                menuOrder,
                showInMenu,
                isHomepage,
                seo,
                publishedAt: status === 'publish' ? publishedAt || new Date() : publishedAt,
                scheduledAt,
                authorId: userId,
                lastModifiedBy: userId,
                password,
                passwordProtected,
                allowComments,
                commentStatus,
                layoutSettings,
                revisions: []
            });
            const savedPage = await this.pageRepository.save(page);
            // Save custom field values
            if (customFields) {
                await this.saveCustomFieldValues(savedPage.id, 'page', customFields);
            }
            // Fetch the complete page with relations
            const completePage = await this.pageRepository.findOne({
                where: { id: savedPage.id },
                relations: ['author', 'parent', 'children']
            });
            res.status(201).json({
                success: true,
                data: completePage,
                message: 'Page created successfully'
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Failed to create page',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // PUT /api/admin/pages/:id
    async updatePage(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const page = await this.pageRepository.findOne({ where: { id } });
            if (!page) {
                return res.status(404).json({
                    success: false,
                    message: 'Page not found'
                });
            }
            const { title, slug, content, excerpt, status, template, parentId, menuOrder, showInMenu, isHomepage, seo, customFields, publishedAt, scheduledAt, password, passwordProtected, allowComments, commentStatus, layoutSettings } = req.body;
            // Save current version to revisions before updating
            const currentRevision = {
                id: (0, uuid_1.v4)(),
                timestamp: new Date().toISOString(),
                author: userId,
                changes: { ...page }
            };
            const updatedRevisions = [...(page.revisions || []), currentRevision];
            // Update page
            await this.pageRepository.update(id, {
                title,
                slug,
                content,
                excerpt,
                status,
                template,
                parentId,
                menuOrder,
                showInMenu,
                isHomepage,
                seo,
                publishedAt: status === 'publish' && !page.publishedAt ? publishedAt || new Date() : publishedAt,
                scheduledAt,
                lastModifiedBy: userId,
                password,
                passwordProtected,
                allowComments,
                commentStatus,
                layoutSettings,
                revisions: updatedRevisions
            });
            // Update custom field values
            if (customFields) {
                await this.saveCustomFieldValues(id, 'page', customFields);
            }
            // Fetch updated page
            const updatedPage = await this.pageRepository.findOne({
                where: { id },
                relations: ['author', 'parent', 'children', 'lastModifier']
            });
            res.json({
                success: true,
                data: updatedPage,
                message: 'Page updated successfully'
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Failed to update page',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // DELETE /api/admin/pages/:id
    async deletePage(req, res) {
        try {
            const { id } = req.params;
            const page = await this.pageRepository.findOne({
                where: { id },
                relations: ['children']
            });
            if (!page) {
                return res.status(404).json({
                    success: false,
                    message: 'Page not found'
                });
            }
            // Check if page has children
            if (page.children && page.children.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete page with child pages. Please delete or move child pages first.',
                    childCount: page.children.length
                });
            }
            // Delete custom field values
            await this.customFieldValueRepository.delete({
                entityId: id,
                entityType: 'page'
            });
            await this.pageRepository.delete(id);
            res.json({
                success: true,
                message: 'Page deleted successfully'
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Failed to delete page',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // POST /api/admin/pages/:id/clone
    async clonePage(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const originalPage = await this.pageRepository.findOne({ where: { id } });
            if (!originalPage) {
                return res.status(404).json({
                    success: false,
                    message: 'Page not found'
                });
            }
            // Get custom field values
            const customFieldValues = await this.customFieldValueRepository.find({
                where: { entityId: id, entityType: 'page' },
                relations: ['field']
            });
            const customFields = {};
            customFieldValues.forEach((cfv) => {
                customFields[cfv.field.name] = cfv.value;
            });
            // Generate unique slug
            let cloneSlug = `${originalPage.slug}-copy`;
            let counter = 1;
            while (await this.pageRepository.findOne({ where: { slug: cloneSlug } })) {
                cloneSlug = `${originalPage.slug}-copy-${counter}`;
                counter++;
            }
            const pageData = { ...originalPage };
            delete pageData.id;
            delete pageData.createdAt;
            delete pageData.updatedAt;
            const clonedPage = this.pageRepository.create({
                ...pageData,
                title: `${originalPage.title} (Copy)`,
                slug: cloneSlug,
                status: 'draft',
                publishedAt: undefined,
                authorId: userId,
                lastModifiedBy: userId,
                views: 0,
                revisions: []
            });
            const savedClone = await this.pageRepository.save(clonedPage);
            const savedCloneId = Array.isArray(savedClone) ? savedClone[0].id : savedClone.id;
            // Save custom field values for clone
            if (customFields && Object.keys(customFields).length > 0) {
                await this.saveCustomFieldValues(savedCloneId, 'page', customFields);
            }
            const completeClone = await this.pageRepository.findOne({
                where: { id: savedCloneId },
                relations: ['author', 'parent', 'children']
            });
            res.status(201).json({
                success: true,
                data: completeClone,
                message: 'Page cloned successfully'
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Failed to clone page',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // POST /api/admin/pages/:id/autosave (draft)
    async savePageDraft(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const { content } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const page = await this.pageRepository.findOne({ where: { id } });
            if (!page) {
                return res.status(404).json({
                    success: false,
                    message: 'Page not found'
                });
            }
            // Save as draft autosave
            await this.pageRepository.update(id, {
                content,
                lastModifiedBy: userId
            });
            res.json({
                success: true,
                message: 'Draft saved successfully'
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Failed to save draft',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // PATCH /api/admin/pages/bulk
    async bulkUpdatePages(req, res) {
        var _a;
        try {
            const { ids, data } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Page IDs are required'
                });
            }
            const updateData = {
                ...data,
                lastModifiedBy: userId
            };
            await this.pageRepository.update(ids, updateData);
            res.json({
                success: true,
                message: `${ids.length} pages updated successfully`,
                updatedCount: ids.length
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Failed to bulk update pages',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // DELETE /api/admin/pages/bulk
    async bulkDeletePages(req, res) {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Page IDs are required'
                });
            }
            // Check for pages with children
            const pagesWithChildren = await this.pageRepository.find({
                where: { id: (0, typeorm_1.In)(ids) },
                relations: ['children']
            });
            const blockedPages = pagesWithChildren.filter((page) => page.children && page.children.length > 0);
            if (blockedPages.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Some pages have child pages and cannot be deleted',
                    blockedPages: blockedPages.map((p) => ({ id: p.id, title: p.title, childCount: p.children.length }))
                });
            }
            // Delete custom field values
            await this.customFieldValueRepository.delete({
                entityId: (0, typeorm_1.In)(ids),
                entityType: 'page'
            });
            const result = await this.pageRepository.delete(ids);
            res.json({
                success: true,
                message: `${result.affected || 0} pages deleted successfully`,
                deletedCount: result.affected || 0
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Failed to bulk delete pages',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // GET /api/admin/pages/:id/preview
    async getPagePreview(req, res) {
        try {
            const { id } = req.params;
            const page = await this.pageRepository.findOne({ where: { id } });
            if (!page) {
                return res.status(404).json({
                    success: false,
                    message: 'Page not found'
                });
            }
            // Generate preview URL (would be your frontend preview URL)
            const previewUrl = `${process.env.FRONTEND_URL}/preview/page/${id}?token=${Buffer.from(id).toString('base64')}`;
            res.json({
                success: true,
                data: {
                    url: previewUrl,
                    page: {
                        id: page.id,
                        title: page.title,
                        slug: page.slug,
                        status: page.status
                    }
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Failed to generate preview',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // GET /api/admin/pages/:id/revisions
    async getPageRevisions(req, res) {
        try {
            const { id } = req.params;
            const page = await this.pageRepository.findOne({ where: { id } });
            if (!page) {
                return res.status(404).json({
                    success: false,
                    message: 'Page not found'
                });
            }
            const revisions = page.revisions || [];
            // Get author details for each revision
            const revisionsWithAuthors = await Promise.all(revisions.map(async (revision) => {
                const author = await this.userRepository.findOne({ where: { id: revision.author } });
                return {
                    ...revision,
                    authorName: (author === null || author === void 0 ? void 0 : author.name) || 'Unknown User'
                };
            }));
            res.json({
                success: true,
                data: revisionsWithAuthors.reverse() // Most recent first
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Failed to fetch revisions',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // POST /api/admin/pages/:id/revisions/:revisionId/restore
    async restorePageRevision(req, res) {
        var _a;
        try {
            const { id, revisionId } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const page = await this.pageRepository.findOne({ where: { id } });
            if (!page) {
                return res.status(404).json({
                    success: false,
                    message: 'Page not found'
                });
            }
            const revisions = page.revisions || [];
            const revision = revisions.find((r) => r.id === revisionId);
            if (!revision) {
                return res.status(404).json({
                    success: false,
                    message: 'Revision not found'
                });
            }
            // Create current revision before restoring
            const currentRevision = {
                id: (0, uuid_1.v4)(),
                timestamp: new Date().toISOString(),
                author: userId,
                changes: { ...page }
            };
            const updatedRevisions = [...revisions, currentRevision];
            // Restore from revision
            const { changes } = revision;
            await this.pageRepository.update(id, {
                ...changes,
                lastModifiedBy: userId,
                revisions: updatedRevisions
            });
            const restoredPage = await this.pageRepository.findOne({
                where: { id },
                relations: ['author', 'parent', 'children', 'lastModifier']
            });
            res.json({
                success: true,
                data: restoredPage,
                message: 'Page restored from revision successfully'
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Failed to restore revision',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // GET /api/admin/pages/tree
    async getPageTree(req, res) {
        try {
            const pages = await this.pageRepository.find({
                where: { type: 'page' },
                relations: ['children'],
                order: { menuOrder: 'ASC', title: 'ASC' }
            });
            // Build hierarchical tree
            const buildTree = (parentId) => {
                return pages
                    .filter((page) => page.parentId === parentId)
                    .map((page) => ({
                    ...page,
                    children: buildTree(page.id)
                }));
            };
            const tree = buildTree(null);
            res.json({
                success: true,
                data: tree
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Failed to fetch page tree',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Helper method to save custom field values
    async saveCustomFieldValues(entityId, entityType, customFields) {
        // Delete existing values
        await this.customFieldValueRepository.delete({
            entityId,
            entityType
        });
        // Save new values
        const values = Object.entries(customFields).map(([fieldName, value]) => ({
            entityId,
            entityType,
            fieldId: fieldName, // In a real implementation, you'd resolve field name to field ID
            value
        }));
        if (values.length > 0) {
            await this.customFieldValueRepository.save(values);
        }
    }
}
exports.PagesController = PagesController;
//# sourceMappingURL=pagesController.js.map