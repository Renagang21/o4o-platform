"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = require("../../database/connection");
const Tag_1 = require("../../entities/Tag");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const typeorm_1 = require("typeorm");
const logger_1 = __importDefault(require("../../utils/logger"));
const router = (0, express_1.Router)();
const tagRepository = connection_1.AppDataSource.getRepository(Tag_1.Tag);
// Get all tags
router.get('/', async (req, res) => {
    try {
        const { page = 1, per_page = 100, search, orderby = 'name', order = 'ASC' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(per_page);
        const skip = (pageNum - 1) * limitNum;
        const queryBuilder = tagRepository.createQueryBuilder('tag');
        if (search) {
            queryBuilder.where('(tag.name ILIKE :search OR tag.description ILIKE :search)', { search: `%${search}%` });
        }
        queryBuilder.orderBy(`tag.${orderby}`, order)
            .skip(skip)
            .take(limitNum);
        const [tags, total] = await queryBuilder.getManyAndCount();
        res.json({
            data: tags,
            pagination: {
                page: pageNum,
                per_page: limitNum,
                total,
                total_pages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching tags:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tags' } });
    }
});
// Autocomplete endpoint for tags
router.get('/autocomplete', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            return res.json([]);
        }
        const tags = await tagRepository.find({
            where: {
                name: (0, typeorm_1.ILike)(`%${q}%`)
            },
            select: ['id', 'name', 'slug'],
            take: 10,
            order: {
                count: 'DESC'
            }
        });
        res.json(tags);
    }
    catch (error) {
        logger_1.default.error('Error in tag autocomplete:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tag suggestions' } });
    }
});
// Get single tag
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tag = await tagRepository.findOne({
            where: { id },
            relations: ['posts']
        });
        if (!tag) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Tag not found' } });
        }
        res.json(tag);
    }
    catch (error) {
        logger_1.default.error('Error fetching tag:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tag' } });
    }
});
// Protected routes
router.use(auth_middleware_1.authenticate);
// Create tag
router.post('/', async (req, res) => {
    try {
        const { name, slug, description, meta } = req.body;
        // Check if slug is unique
        let finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-');
        const existingTag = await tagRepository.findOne({ where: { slug: finalSlug } });
        if (existingTag) {
            return res.status(409).json({ error: { code: 'CONFLICT', message: 'Tag already exists' } });
        }
        const tag = tagRepository.create({
            name,
            slug: finalSlug,
            description,
            meta,
            count: 0
        });
        const savedTag = await tagRepository.save(tag);
        res.status(201).json(savedTag);
    }
    catch (error) {
        logger_1.default.error('Error creating tag:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create tag' } });
    }
});
// Update tag
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, description, meta } = req.body;
        const tag = await tagRepository.findOne({ where: { id } });
        if (!tag) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Tag not found' } });
        }
        // Check slug uniqueness if changed
        if (slug && slug !== tag.slug) {
            const existingTag = await tagRepository.findOne({ where: { slug } });
            if (existingTag) {
                return res.status(409).json({ error: { code: 'CONFLICT', message: 'Slug already exists' } });
            }
        }
        // Update fields
        if (name !== undefined)
            tag.name = name;
        if (slug !== undefined)
            tag.slug = slug;
        if (description !== undefined)
            tag.description = description;
        if (meta !== undefined)
            tag.meta = meta;
        const updatedTag = await tagRepository.save(tag);
        res.json(updatedTag);
    }
    catch (error) {
        logger_1.default.error('Error updating tag:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update tag' } });
    }
});
// Delete tag
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tag = await tagRepository.findOne({
            where: { id },
            relations: ['posts']
        });
        if (!tag) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Tag not found' } });
        }
        // Check if tag is in use
        if (tag.posts && tag.posts.length > 0) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Cannot delete tag that is in use by posts'
                }
            });
        }
        await tagRepository.remove(tag);
        res.json({ message: 'Tag deleted successfully' });
    }
    catch (error) {
        logger_1.default.error('Error deleting tag:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete tag' } });
    }
});
// Merge tags
router.post('/merge', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { sourceIds, targetId } = req.body;
        if (!sourceIds || !Array.isArray(sourceIds) || !targetId) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid merge parameters'
                }
            });
        }
        const targetTag = await tagRepository.findOne({
            where: { id: targetId },
            relations: ['posts']
        });
        if (!targetTag) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Target tag not found' } });
        }
        const sourceTags = await tagRepository.find({
            where: sourceIds.map(id => ({ id })),
            relations: ['posts']
        });
        // Merge posts from source tags to target tag
        for (const sourceTag of sourceTags) {
            if (sourceTag.posts) {
                for (const post of sourceTag.posts) {
                    if (!targetTag.posts.find(p => p.id === post.id)) {
                        targetTag.posts.push(post);
                    }
                }
            }
            // Update usage count
            targetTag.count += sourceTag.count;
        }
        await tagRepository.save(targetTag);
        // Delete source tags
        await tagRepository.remove(sourceTags);
        res.json({
            message: 'Tags merged successfully',
            targetTag
        });
    }
    catch (error) {
        logger_1.default.error('Error merging tags:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to merge tags' } });
    }
});
exports.default = router;
//# sourceMappingURL=tags.js.map