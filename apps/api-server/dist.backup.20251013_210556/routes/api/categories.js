"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = require("../../database/connection");
const Category_1 = require("../../entities/Category");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const logger_1 = __importDefault(require("../../utils/logger"));
const router = (0, express_1.Router)();
const categoryRepository = connection_1.AppDataSource.getTreeRepository(Category_1.Category);
// Get all categories
router.get('/', async (req, res) => {
    try {
        const { page = 1, per_page = 100, search, parent, orderby = 'name', order = 'ASC' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(per_page);
        const skip = (pageNum - 1) * limitNum;
        const queryBuilder = categoryRepository.createQueryBuilder('category');
        if (search) {
            queryBuilder.andWhere('(category.name ILIKE :search OR category.description ILIKE :search)', { search: `%${search}%` });
        }
        if (parent !== undefined) {
            if (parent === '0' || parent === null) {
                queryBuilder.andWhere('category.parentId IS NULL');
            }
            else {
                queryBuilder.andWhere('category.parentId = :parentId', { parentId: parent });
            }
        }
        queryBuilder.orderBy(`category.${orderby}`, order)
            .skip(skip)
            .take(limitNum);
        const [categories, total] = await queryBuilder.getManyAndCount();
        res.json({
            data: categories,
            pagination: {
                page: pageNum,
                per_page: limitNum,
                total,
                total_pages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching categories:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch categories' } });
    }
});
// Get category tree structure
router.get('/tree', async (req, res) => {
    try {
        const trees = await categoryRepository.findTrees();
        res.json(trees);
    }
    catch (error) {
        logger_1.default.error('Error fetching category tree:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch category tree' } });
    }
});
// Get single category
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const category = await categoryRepository.findOne({
            where: { id },
            relations: ['parent', 'children']
        });
        if (!category) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
        }
        // Get descendants
        const descendants = await categoryRepository.findDescendants(category);
        res.json({
            ...category,
            descendants
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching category:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch category' } });
    }
});
// Protected routes
router.use(auth_middleware_1.authenticate);
// Create category
router.post('/', async (req, res) => {
    try {
        const { name, slug, description, parent, image, meta } = req.body;
        // Check if slug is unique
        if (slug) {
            const existingCategory = await categoryRepository.findOne({ where: { slug } });
            if (existingCategory) {
                return res.status(409).json({ error: { code: 'CONFLICT', message: 'Slug already exists' } });
            }
        }
        const category = categoryRepository.create({
            name,
            slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description,
            image,
            isActive: true
        });
        // Set parent if provided
        if (parent) {
            const parentCategory = await categoryRepository.findOne({ where: { id: parent } });
            if (parentCategory) {
                category.parent = parentCategory;
            }
        }
        const savedCategory = await categoryRepository.save(category);
        res.status(201).json(savedCategory);
    }
    catch (error) {
        logger_1.default.error('Error creating category:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create category' } });
    }
});
// Update category
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, description, parent, image, meta, isActive } = req.body;
        const category = await categoryRepository.findOne({ where: { id } });
        if (!category) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
        }
        // Check slug uniqueness if changed
        if (slug && slug !== category.slug) {
            const existingCategory = await categoryRepository.findOne({ where: { slug } });
            if (existingCategory) {
                return res.status(409).json({ error: { code: 'CONFLICT', message: 'Slug already exists' } });
            }
        }
        // Update fields
        if (name !== undefined)
            category.name = name;
        if (slug !== undefined)
            category.slug = slug;
        if (description !== undefined)
            category.description = description;
        if (image !== undefined)
            category.image = image;
        // meta field removed from Category entity
        if (isActive !== undefined)
            category.isActive = isActive;
        // Update parent
        if (parent !== undefined) {
            if (parent === null) {
                category.parent = undefined;
            }
            else {
                const parentCategory = await categoryRepository.findOne({ where: { id: parent } });
                if (parentCategory) {
                    // Check for circular reference
                    if (parentCategory.id === category.id) {
                        return res.status(400).json({
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Category cannot be its own parent'
                            }
                        });
                    }
                    category.parent = parentCategory;
                }
            }
        }
        const updatedCategory = await categoryRepository.save(category);
        res.json(updatedCategory);
    }
    catch (error) {
        logger_1.default.error('Error updating category:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update category' } });
    }
});
// Delete category
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const category = await categoryRepository.findOne({
            where: { id },
            relations: ['children']
        });
        if (!category) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
        }
        // Check if category has children
        if (category.children && category.children.length > 0) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Cannot delete category with children'
                }
            });
        }
        await categoryRepository.remove(category);
        res.json({ message: 'Category deleted successfully' });
    }
    catch (error) {
        logger_1.default.error('Error deleting category:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete category' } });
    }
});
exports.default = router;
//# sourceMappingURL=categories.js.map