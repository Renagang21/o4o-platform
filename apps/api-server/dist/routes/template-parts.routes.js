"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_source_1 = __importDefault(require("../database/data-source"));
const TemplatePart_1 = require("../entities/TemplatePart");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Validation schemas
const templatePartSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    slug: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().optional(),
    area: zod_1.z.enum(['header', 'footer', 'sidebar', 'general']),
    content: zod_1.z.array(zod_1.z.any()),
    settings: zod_1.z.object({
        containerWidth: zod_1.z.enum(['full', 'wide', 'narrow']).optional(),
        backgroundColor: zod_1.z.string().optional(),
        textColor: zod_1.z.string().optional(),
        padding: zod_1.z.object({
            top: zod_1.z.string().optional(),
            bottom: zod_1.z.string().optional(),
            left: zod_1.z.string().optional(),
            right: zod_1.z.string().optional()
        }).optional(),
        customCss: zod_1.z.string().optional()
    }).optional(),
    isActive: zod_1.z.boolean().optional(),
    isDefault: zod_1.z.boolean().optional(),
    priority: zod_1.z.number().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    conditions: zod_1.z.object({
        pages: zod_1.z.array(zod_1.z.string()).optional(),
        postTypes: zod_1.z.array(zod_1.z.string()).optional(),
        categories: zod_1.z.array(zod_1.z.string()).optional(),
        userRoles: zod_1.z.array(zod_1.z.string()).optional()
    }).optional()
});
// Get all template parts with filtering
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { area, isActive = 'true', isDefault, search, page = '1', limit = '20', orderBy = 'priority', order = 'ASC' } = req.query;
        const templatePartRepository = data_source_1.default.getRepository(TemplatePart_1.TemplatePart);
        let query = templatePartRepository.createQueryBuilder('templatePart')
            .leftJoinAndSelect('templatePart.author', 'author');
        // Filter by area
        if (area) {
            query = query.andWhere('templatePart.area = :area', { area });
        }
        // Filter by active status
        if (isActive !== 'all') {
            query = query.andWhere('templatePart.isActive = :isActive', {
                isActive: isActive === 'true'
            });
        }
        // Filter by default status
        if (isDefault !== undefined) {
            query = query.andWhere('templatePart.isDefault = :isDefault', {
                isDefault: isDefault === 'true'
            });
        }
        // Search by name or description
        if (search) {
            query = query.andWhere('(templatePart.name ILIKE :search OR templatePart.description ILIKE :search)', { search: `%${search}%` });
        }
        // Add ordering
        const validOrderBy = ['priority', 'name', 'createdAt', 'updatedAt'];
        const orderByField = validOrderBy.includes(String(orderBy)) ? String(orderBy) : 'priority';
        const orderDirection = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        query = query.orderBy(`templatePart.${orderByField}`, orderDirection);
        // Pagination
        const take = Math.min(parseInt(String(limit)), 100);
        const skip = (parseInt(String(page)) - 1) * take;
        const [templateParts, total] = await query
            .take(take)
            .skip(skip)
            .getManyAndCount();
        // WordPress-compatible headers
        res.header('X-WP-Total', total.toString());
        res.header('X-WP-TotalPages', Math.ceil(total / take).toString());
        res.json(templateParts);
    }
    catch (error) {
        console.error('Error fetching template parts:', error);
        res.status(500).json({ error: 'Failed to fetch template parts' });
    }
});
// Get template part by ID or slug
router.get('/:identifier', auth_1.authenticateToken, async (req, res) => {
    try {
        const { identifier } = req.params;
        const templatePartRepository = data_source_1.default.getRepository(TemplatePart_1.TemplatePart);
        // Check if identifier is UUID or slug
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        const templatePart = await templatePartRepository.findOne({
            where: isUuid ? { id: identifier } : { slug: identifier },
            relations: ['author']
        });
        if (!templatePart) {
            return res.status(404).json({ error: 'Template part not found' });
        }
        res.json(templatePart);
    }
    catch (error) {
        console.error('Error fetching template part:', error);
        res.status(500).json({ error: 'Failed to fetch template part' });
    }
});
// Get active template parts for a specific area
router.get('/area/:area/active', async (req, res) => {
    try {
        const { area } = req.params;
        const { context } = req.query; // Optional context for conditional rendering
        const templatePartRepository = data_source_1.default.getRepository(TemplatePart_1.TemplatePart);
        // Get all active template parts for the area
        let templateParts = await templatePartRepository.find({
            where: {
                area: area,
                isActive: true
            },
            order: {
                priority: 'ASC'
            }
        });
        // Filter by conditions if context is provided
        if (context) {
            const contextData = JSON.parse(String(context));
            templateParts = templateParts.filter(part => {
                if (!part.conditions)
                    return true;
                // Check page conditions
                if (part.conditions.pages && contextData.pageId) {
                    if (!part.conditions.pages.includes(contextData.pageId))
                        return false;
                }
                // Check post type conditions
                if (part.conditions.postTypes && contextData.postType) {
                    if (!part.conditions.postTypes.includes(contextData.postType))
                        return false;
                }
                // Check category conditions
                if (part.conditions.categories && contextData.categories) {
                    const hasCategory = part.conditions.categories.some(cat => contextData.categories.includes(cat));
                    if (!hasCategory)
                        return false;
                }
                // Check user role conditions
                if (part.conditions.userRoles && contextData.userRole) {
                    if (!part.conditions.userRoles.includes(contextData.userRole))
                        return false;
                }
                return true;
            });
        }
        res.json(templateParts);
    }
    catch (error) {
        console.error('Error fetching active template parts:', error);
        res.status(500).json({ error: 'Failed to fetch active template parts' });
    }
});
// Create new template part
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const validatedData = templatePartSchema.parse(req.body);
        const templatePartRepository = data_source_1.default.getRepository(TemplatePart_1.TemplatePart);
        // Generate slug if not provided
        if (!validatedData.slug) {
            validatedData.slug = validatedData.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
        }
        // Check if slug already exists
        const existing = await templatePartRepository.findOne({
            where: { slug: validatedData.slug }
        });
        if (existing) {
            return res.status(400).json({ error: 'Slug already exists' });
        }
        // If setting as default, unset other defaults in same area
        if (validatedData.isDefault) {
            await templatePartRepository.update({ area: validatedData.area, isDefault: true }, { isDefault: false });
        }
        const templatePart = templatePartRepository.create({
            ...validatedData,
            authorId: req.user.id
        });
        await templatePartRepository.save(templatePart);
        res.status(201).json(templatePart);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        console.error('Error creating template part:', error);
        res.status(500).json({ error: 'Failed to create template part' });
    }
});
// Update template part
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const validatedData = templatePartSchema.partial().parse(req.body);
        const templatePartRepository = data_source_1.default.getRepository(TemplatePart_1.TemplatePart);
        const templatePart = await templatePartRepository.findOne({
            where: { id }
        });
        if (!templatePart) {
            return res.status(404).json({ error: 'Template part not found' });
        }
        // Check slug uniqueness if changing
        if (validatedData.slug && validatedData.slug !== templatePart.slug) {
            const existing = await templatePartRepository.findOne({
                where: { slug: validatedData.slug }
            });
            if (existing) {
                return res.status(400).json({ error: 'Slug already exists' });
            }
        }
        // If setting as default, unset other defaults in same area
        if (validatedData.isDefault && !templatePart.isDefault) {
            await templatePartRepository.update({
                area: validatedData.area || templatePart.area,
                isDefault: true
            }, { isDefault: false });
        }
        await templatePartRepository.update(id, validatedData);
        const updated = await templatePartRepository.findOne({
            where: { id },
            relations: ['author']
        });
        res.json(updated);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        console.error('Error updating template part:', error);
        res.status(500).json({ error: 'Failed to update template part' });
    }
});
// Delete template part
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const templatePartRepository = data_source_1.default.getRepository(TemplatePart_1.TemplatePart);
        const templatePart = await templatePartRepository.findOne({
            where: { id }
        });
        if (!templatePart) {
            return res.status(404).json({ error: 'Template part not found' });
        }
        // Don't allow deleting default template parts
        if (templatePart.isDefault) {
            return res.status(400).json({ error: 'Cannot delete default template part' });
        }
        await templatePartRepository.remove(templatePart);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting template part:', error);
        res.status(500).json({ error: 'Failed to delete template part' });
    }
});
// Duplicate template part
router.post('/:id/duplicate', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const templatePartRepository = data_source_1.default.getRepository(TemplatePart_1.TemplatePart);
        const original = await templatePartRepository.findOne({
            where: { id }
        });
        if (!original) {
            return res.status(404).json({ error: 'Template part not found' });
        }
        // Create new template part with copied data
        const duplicateName = name || `${original.name} (Copy)`;
        const duplicateSlug = duplicateName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        // Ensure unique slug
        let finalSlug = duplicateSlug;
        let counter = 1;
        while (await templatePartRepository.findOne({ where: { slug: finalSlug } })) {
            finalSlug = `${duplicateSlug}-${counter}`;
            counter++;
        }
        const duplicate = templatePartRepository.create({
            name: duplicateName,
            slug: finalSlug,
            description: original.description,
            area: original.area,
            content: original.content,
            settings: original.settings,
            isActive: false, // Start as inactive
            isDefault: false, // Never duplicate as default
            priority: original.priority,
            tags: original.tags,
            conditions: original.conditions,
            authorId: req.user.id
        });
        await templatePartRepository.save(duplicate);
        res.status(201).json(duplicate);
    }
    catch (error) {
        console.error('Error duplicating template part:', error);
        res.status(500).json({ error: 'Failed to duplicate template part' });
    }
});
exports.default = router;
//# sourceMappingURL=template-parts.routes.js.map