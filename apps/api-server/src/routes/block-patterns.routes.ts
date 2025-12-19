/**
 * Block Patterns API Routes
 * WordPress-compatible REST API for block patterns management
 */

import { Router, Response } from 'express';
import { AppDataSource } from '../database/connection.js';
import { BlockPattern } from '../entities/BlockPattern.js';
import { User } from '../entities/User.js';
import { authenticate } from '../middleware/auth.middleware.js';
import type { AuthRequest } from '../types/auth.js';
import { ILike } from 'typeorm';
import logger from '../utils/logger.js';
import { PAGINATION_DEFAULTS, BLOCK_DUPLICATE, BLOCK_PATTERN_CATEGORIES } from '../config/editor.constants.js';

const router: Router = Router();
const blockPatternRepository = AppDataSource.getRepository(BlockPattern);

/**
 * GET /api/block-patterns
 * List block patterns with filtering and pagination
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      per_page = PAGINATION_DEFAULTS.PATTERNS_PER_PAGE,
      search = '',
      category = '',
      source = '',
      featured = '',
      visibility = '',
      orderby = 'usageCount',
      order = 'DESC'
    } = req.query;

    const userId = req.user?.id;
    const take = Math.min(parseInt(per_page as string), PAGINATION_DEFAULTS.MAX_PER_PAGE);
    const skip = (parseInt(page as string) - 1) * take;

    // Build query conditions
    let where: any = {};
    
    // Filter by visibility and user access
    if (visibility) {
      where.visibility = visibility;
    } else {
      // Default: show public patterns + user's private patterns
      where = [
        { visibility: 'public', status: 'active' },
        { visibility: 'private', authorId: userId, status: 'active' },
        { visibility: 'pro', status: 'active' } // Show pro patterns (with UI indication)
      ];
    }

    // Text search
    if (search) {
      const searchConditions = Array.isArray(where) ? where : [where];
      searchConditions.forEach((condition: any) => {
        condition.title = ILike(`%${search}%`);
      });
    }

    // Category filter
    if (category && category !== 'all') {
      const categoryConditions = Array.isArray(where) ? where : [where];
      categoryConditions.forEach((condition: any) => {
        condition.category = category;
      });
    }

    // Source filter
    if (source) {
      const sourceConditions = Array.isArray(where) ? where : [where];
      sourceConditions.forEach((condition: any) => {
        condition.source = source;
      });
    }

    // Featured filter
    if (featured === 'true') {
      const featuredConditions = Array.isArray(where) ? where : [where];
      featuredConditions.forEach((condition: any) => {
        condition.featured = true;
      });
    }

    const [patterns, total] = await blockPatternRepository.findAndCount({
      where,
      relations: ['author'],
      take,
      skip,
      order: { [orderby as string]: order }
    });

    // Set WordPress-compatible headers
    res.header('X-WP-Total', total.toString());
    res.header('X-WP-TotalPages', Math.ceil(total / take).toString());

    res.json(patterns.map(pattern => ({
      id: pattern.id,
      title: pattern.title,
      slug: pattern.slug,
      description: pattern.description,
      content: pattern.content,
      category: pattern.category,
      subcategories: pattern.subcategories,
      tags: pattern.tags,
      preview: pattern.preview,
      source: pattern.source,
      featured: pattern.featured,
      usageCount: pattern.usageCount,
      lastUsedAt: pattern.lastUsedAt,
      visibility: pattern.visibility,
      isPremium: pattern.isPremium,
      metadata: pattern.metadata,
      author: {
        id: pattern.author.id,
        name: pattern.author.name
      },
      version: pattern.version,
      dependencies: pattern.dependencies,
      colorScheme: pattern.colorScheme,
      typography: pattern.typography,
      status: pattern.status,
      createdAt: pattern.createdAt,
      updatedAt: pattern.updatedAt
    })));

  } catch (error: any) {
    logger.error('Error fetching block patterns:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      error: 'Failed to fetch block patterns',
      message: error.message
    });
  }
});

/**
 * GET /api/block-patterns/categories
 * Get all pattern categories with counts
 */
router.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const categories = BLOCK_PATTERN_CATEGORIES;

    // Get counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await blockPatternRepository.count({
          where: { category: category.id as any, status: 'active' }
        });
        return { ...category, count };
      })
    );

    res.json(categoriesWithCounts);

  } catch (error: any) {
    logger.error('Error fetching pattern categories:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      error: 'Failed to fetch categories',
      message: error.message
    });
  }
});

/**
 * GET /api/block-patterns/:id
 * Get a single block pattern
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const pattern = await blockPatternRepository.findOne({
      where: { id },
      relations: ['author']
    });

    if (!pattern) {
      return res.status(404).json({ error: 'Block pattern not found' });
    }

    // Check access permissions
    if (pattern.visibility === 'private' && pattern.authorId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Increment usage count
    pattern.incrementUsage();
    await blockPatternRepository.save(pattern);

    res.json({
      id: pattern.id,
      title: pattern.title,
      slug: pattern.slug,
      description: pattern.description,
      content: pattern.content,
      category: pattern.category,
      subcategories: pattern.subcategories,
      tags: pattern.tags,
      preview: pattern.preview,
      source: pattern.source,
      featured: pattern.featured,
      usageCount: pattern.usageCount,
      lastUsedAt: pattern.lastUsedAt,
      visibility: pattern.visibility,
      isPremium: pattern.isPremium,
      metadata: pattern.metadata,
      author: {
        id: pattern.author.id,
        name: pattern.author.name,
        email: pattern.author.email
      },
      version: pattern.version,
      dependencies: pattern.dependencies,
      colorScheme: pattern.colorScheme,
      typography: pattern.typography,
      status: pattern.status,
      createdAt: pattern.createdAt,
      updatedAt: pattern.updatedAt
    });

  } catch (error: any) {
    logger.error('Error fetching block pattern:', {
      patternId: req.params.id,
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      error: 'Failed to fetch block pattern',
      message: error.message
    });
  }
});

/**
 * POST /api/block-patterns
 * Create a new block pattern
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      title,
      description,
      content,
      category = 'general',
      subcategories = [],
      tags = [],
      preview,
      visibility = 'private',
      metadata = {},
      dependencies = [],
      colorScheme = [],
      typography
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ 
        error: 'Title and content are required' 
      });
    }

    // Generate unique slug
    let slug = BlockPattern.generateSlug(title);
    let slugExists = await blockPatternRepository.findOne({ where: { slug } });
    let counter = 1;
    
    while (slugExists) {
      slug = `${BlockPattern.generateSlug(title)}-${counter}`;
      slugExists = await blockPatternRepository.findOne({ where: { slug } });
      counter++;
    }

    const pattern = new BlockPattern();
    pattern.title = title;
    pattern.slug = slug;
    pattern.description = description;
    pattern.content = content;
    pattern.category = category;
    pattern.subcategories = subcategories;
    pattern.tags = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim());
    pattern.preview = preview || { html: pattern.generatePreviewHtml() };
    pattern.source = 'user';
    pattern.visibility = visibility;
    pattern.metadata = metadata;
    pattern.authorId = userId!;
    pattern.dependencies = dependencies;
    pattern.colorScheme = colorScheme;
    pattern.typography = typography;

    const savedPattern = await blockPatternRepository.save(pattern);

    // Load relations for response
    const patternWithRelations = await blockPatternRepository.findOne({
      where: { id: savedPattern.id },
      relations: ['author']
    });

    res.status(201).json({
      id: patternWithRelations!.id,
      title: patternWithRelations!.title,
      slug: patternWithRelations!.slug,
      description: patternWithRelations!.description,
      content: patternWithRelations!.content,
      category: patternWithRelations!.category,
      subcategories: patternWithRelations!.subcategories,
      tags: patternWithRelations!.tags,
      preview: patternWithRelations!.preview,
      source: patternWithRelations!.source,
      visibility: patternWithRelations!.visibility,
      metadata: patternWithRelations!.metadata,
      author: {
        id: patternWithRelations!.author.id,
        name: patternWithRelations!.author.name
      },
      createdAt: patternWithRelations!.createdAt,
      updatedAt: patternWithRelations!.updatedAt
    });

  } catch (error: any) {
    logger.error('Error creating block pattern:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      title: req.body.title
    });
    res.status(500).json({
      error: 'Failed to create block pattern',
      message: error.message
    });
  }
});

/**
 * PUT /api/block-patterns/:id
 * Update a block pattern
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const pattern = await blockPatternRepository.findOne({
      where: { id },
      relations: ['author']
    });

    if (!pattern) {
      return res.status(404).json({ error: 'Block pattern not found' });
    }

    // Check edit permissions
    if (pattern.authorId !== userId && pattern.source !== 'user') {
      return res.status(403).json({ error: 'Cannot edit this pattern' });
    }

    // Update fields
    const {
      title,
      description,
      content,
      category,
      subcategories,
      tags,
      preview,
      visibility,
      metadata,
      dependencies,
      colorScheme,
      typography,
      status
    } = req.body;

    if (title !== undefined) pattern.title = title;
    if (description !== undefined) pattern.description = description;
    if (content !== undefined) pattern.content = content;
    if (category !== undefined) pattern.category = category;
    if (subcategories !== undefined) pattern.subcategories = subcategories;
    if (tags !== undefined) {
      pattern.tags = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim());
    }
    if (preview !== undefined) pattern.preview = preview;
    if (visibility !== undefined) pattern.visibility = visibility;
    if (metadata !== undefined) pattern.metadata = metadata;
    if (dependencies !== undefined) pattern.dependencies = dependencies;
    if (colorScheme !== undefined) pattern.colorScheme = colorScheme;
    if (typography !== undefined) pattern.typography = typography;
    if (status !== undefined) pattern.status = status;

    // Update version
    const [major, minor, patch] = pattern.version.split('.').map(Number);
    pattern.version = `${major}.${minor}.${patch + 1}`;

    const savedPattern = await blockPatternRepository.save(pattern);

    // Load relations for response
    const patternWithRelations = await blockPatternRepository.findOne({
      where: { id: savedPattern.id },
      relations: ['author']
    });

    res.json({
      id: patternWithRelations!.id,
      title: patternWithRelations!.title,
      slug: patternWithRelations!.slug,
      description: patternWithRelations!.description,
      content: patternWithRelations!.content,
      category: patternWithRelations!.category,
      subcategories: patternWithRelations!.subcategories,
      tags: patternWithRelations!.tags,
      preview: patternWithRelations!.preview,
      source: patternWithRelations!.source,
      visibility: patternWithRelations!.visibility,
      metadata: patternWithRelations!.metadata,
      author: {
        id: patternWithRelations!.author.id,
        name: patternWithRelations!.author.name
      },
      version: patternWithRelations!.version,
      status: patternWithRelations!.status,
      createdAt: patternWithRelations!.createdAt,
      updatedAt: patternWithRelations!.updatedAt
    });

  } catch (error: any) {
    logger.error('Error updating block pattern:', {
      patternId: req.params.id,
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      error: 'Failed to update block pattern',
      message: error.message
    });
  }
});

/**
 * DELETE /api/block-patterns/:id
 * Delete a block pattern
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const pattern = await blockPatternRepository.findOne({
      where: { id }
    });

    if (!pattern) {
      return res.status(404).json({ error: 'Block pattern not found' });
    }

    // Check delete permissions (only author or admin can delete)
    if (pattern.authorId !== userId) {
      return res.status(403).json({ error: 'Cannot delete this pattern' });
    }

    await blockPatternRepository.remove(pattern);

    res.json({ 
      message: 'Block pattern deleted successfully',
      id: id
    });

  } catch (error: any) {
    logger.error('Error deleting block pattern:', {
      patternId: req.params.id,
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      error: 'Failed to delete block pattern',
      message: error.message
    });
  }
});

/**
 * POST /api/block-patterns/:id/duplicate
 * Duplicate a block pattern
 */
router.post('/:id/duplicate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { title } = req.body;

    const originalPattern = await blockPatternRepository.findOne({
      where: { id }
    });

    if (!originalPattern) {
      return res.status(404).json({ error: 'Block pattern not found' });
    }

    // Check access permissions
    if (originalPattern.visibility === 'private' && originalPattern.authorId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate unique slug for duplicate
    const duplicateTitle = title || `${originalPattern.title} ${BLOCK_DUPLICATE.SUFFIX}`;
    let slug = BlockPattern.generateSlug(duplicateTitle);
    let slugExists = await blockPatternRepository.findOne({ where: { slug } });
    let counter = 1;
    
    while (slugExists) {
      slug = `${BlockPattern.generateSlug(duplicateTitle)}-${counter}`;
      slugExists = await blockPatternRepository.findOne({ where: { slug } });
      counter++;
    }

    const duplicatePattern = new BlockPattern();
    duplicatePattern.title = duplicateTitle;
    duplicatePattern.slug = slug;
    duplicatePattern.description = originalPattern.description;
    duplicatePattern.content = originalPattern.content;
    duplicatePattern.category = originalPattern.category;
    duplicatePattern.subcategories = originalPattern.subcategories;
    duplicatePattern.tags = originalPattern.tags;
    duplicatePattern.preview = originalPattern.preview;
    duplicatePattern.source = 'user';
    duplicatePattern.visibility = 'private'; // Always create as private
    duplicatePattern.metadata = { ...originalPattern.metadata };
    duplicatePattern.authorId = userId!;
    duplicatePattern.dependencies = originalPattern.dependencies;
    duplicatePattern.colorScheme = originalPattern.colorScheme;
    duplicatePattern.typography = originalPattern.typography;

    const savedPattern = await blockPatternRepository.save(duplicatePattern);

    // Load relations for response
    const patternWithRelations = await blockPatternRepository.findOne({
      where: { id: savedPattern.id },
      relations: ['author']
    });

    res.status(201).json({
      id: patternWithRelations!.id,
      title: patternWithRelations!.title,
      slug: patternWithRelations!.slug,
      description: patternWithRelations!.description,
      content: patternWithRelations!.content,
      category: patternWithRelations!.category,
      subcategories: patternWithRelations!.subcategories,
      tags: patternWithRelations!.tags,
      preview: patternWithRelations!.preview,
      source: patternWithRelations!.source,
      visibility: patternWithRelations!.visibility,
      metadata: patternWithRelations!.metadata,
      author: {
        id: patternWithRelations!.author.id,
        name: patternWithRelations!.author.name
      },
      createdAt: patternWithRelations!.createdAt,
      updatedAt: patternWithRelations!.updatedAt
    });

  } catch (error: any) {
    logger.error('Error duplicating block pattern:', {
      patternId: req.params.id,
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      error: 'Failed to duplicate block pattern',
      message: error.message
    });
  }
});

export default router;