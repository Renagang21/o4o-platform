/**
 * Reusable Blocks API Routes
 * WordPress-compatible REST API for reusable blocks management
 */

import { Router, Response } from 'express';
import { AppDataSource } from '../database/connection';
import { ReusableBlock } from '../entities/ReusableBlock';
import { User } from '../entities/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Like, ILike } from 'typeorm';

const router: Router = Router();
const reusableBlockRepository = AppDataSource.getRepository(ReusableBlock);
const userRepository = AppDataSource.getRepository(User);

/**
 * GET /api/reusable-blocks
 * List reusable blocks with filtering and pagination
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      per_page = 20,
      search = '',
      status = 'active',
      category = '',
      visibility = '',
      author = '',
      orderby = 'updated_at',
      order = 'DESC'
    } = req.query;

    const userId = req.user?.id;
    const take = Math.min(parseInt(per_page as string), 100);
    const skip = (parseInt(page as string) - 1) * take;

    // Build query conditions
    let where: any = {};
    
    // Filter by user access rights
    if (visibility === 'private') {
      where.author_id = userId;
      where.visibility = 'private';
    } else if (visibility === 'public') {
      where.visibility = 'public';
    } else if (visibility === 'organization') {
      where.visibility = 'organization';
      // TODO: Add organization-based filtering
    } else {
      // Default: show user's private blocks + public blocks
      where = [
        { authorId: userId },
        { visibility: 'public' },
        { visibility: 'organization' }
      ];
    }

    // Text search
    if (search) {
      const searchConditions = where.length ? where : [where];
      searchConditions.forEach((condition: any) => {
        condition.title = ILike(`%${search}%`);
      });
    }

    // Status filter
    if (status && status !== 'all') {
      const statusConditions = where.length ? where : [where];
      statusConditions.forEach((condition: any) => {
        condition.status = status;
      });
    }

    // Category filter
    if (category) {
      const categoryConditions = where.length ? where : [where];
      categoryConditions.forEach((condition: any) => {
        condition.category = category;
      });
    }

    // Author filter
    if (author) {
      const authorConditions = where.length ? where : [where];
      authorConditions.forEach((condition: any) => {
        condition.author_id = author;
      });
    }

    const [blocks, total] = await reusableBlockRepository.findAndCount({
      where,
      relations: ['author', 'lastModifier'],
      take,
      skip,
      order: { [orderby as string]: order }
    });

    // Set WordPress-compatible headers
    res.header('X-WP-Total', total.toString());
    res.header('X-WP-TotalPages', Math.ceil(total / take).toString());

    res.json(blocks.map(block => ({
      id: block.id,
      title: block.title,
      slug: block.slug,
      description: block.description,
      content: block.content,
      status: block.status,
      category: block.category,
      tags: block.tags,
      usageCount: block.usageCount,
      lastUsedAt: block.lastUsedAt,
      isGlobal: block.isGlobal,
      isEditable: block.isEditable,
      preview: block.preview,
      author: {
        id: block.author.id,
        name: block.author.name,
        email: block.author.email
      },
      lastModifiedBy: block.lastModifier ? {
        id: block.lastModifier.id,
        name: block.lastModifier.name
      } : null,
      visibility: block.visibility,
      metadata: block.metadata,
      createdAt: block.created_at,
      updatedAt: block.updated_at
    })));

  } catch (error: any) {
    // Error log removed
    res.status(500).json({ 
      error: 'Failed to fetch reusable blocks',
      message: error.message 
    });
  }
});

/**
 * GET /api/reusable-blocks/:id
 * Get a single reusable block
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const block = await reusableBlockRepository.findOne({
      where: { id },
      relations: ['author', 'lastModifier']
    });

    if (!block) {
      return res.status(404).json({ error: 'Reusable block not found' });
    }

    // Check access permissions
    if (block.visibility === 'private' && block.author_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Increment usage count when accessed
    block.incrementUsage();
    await reusableBlockRepository.save(block);

    res.json({
      id: block.id,
      title: block.title,
      slug: block.slug,
      description: block.description,
      content: block.content,
      status: block.status,
      category: block.category,
      tags: block.tags,
      usageCount: block.usageCount,
      lastUsedAt: block.lastUsedAt,
      isGlobal: block.isGlobal,
      isEditable: block.isEditable,
      preview: block.preview,
      author: {
        id: block.author.id,
        name: block.author.name,
        email: block.author.email
      },
      lastModifiedBy: block.lastModifier ? {
        id: block.lastModifier.id,
        name: block.lastModifier.name
      } : null,
      revisions: block.revisions,
      visibility: block.visibility,
      metadata: block.metadata,
      createdAt: block.created_at,
      updatedAt: block.updated_at
    });

  } catch (error: any) {
    // Error log removed
    res.status(500).json({ 
      error: 'Failed to fetch reusable block',
      message: error.message 
    });
  }
});

/**
 * POST /api/reusable-blocks
 * Create a new reusable block
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      title,
      description,
      content,
      category = '',
      tags = [],
      visibility = 'private',
      isGlobal = false,
      isEditable = true,
      metadata = {}
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ 
        error: 'Title and content are required' 
      });
    }

    // Generate unique slug
    let slug = ReusableBlock.generateSlug(title);
    let slugExists = await reusableBlockRepository.findOne({ where: { slug } });
    let counter = 1;
    
    while (slugExists) {
      slug = `${ReusableBlock.generateSlug(title)}-${counter}`;
      slugExists = await reusableBlockRepository.findOne({ where: { slug } });
      counter++;
    }

    const block = new ReusableBlock();
    block.title = title;
    block.slug = slug;
    block.description = description;
    block.content = content;
    block.category = category;
    block.tags = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim());
    block.visibility = visibility;
    block.isGlobal = isGlobal;
    block.isEditable = isEditable;
    block.metadata = metadata;
    block.author_id = userId!;
    block.lastModifiedBy = userId!;

    const savedBlock = await reusableBlockRepository.save(block);

    // Load relations for response
    const blockWithRelations = await reusableBlockRepository.findOne({
      where: { id: savedBlock.id },
      relations: ['author', 'lastModifier']
    });

    res.status(201).json({
      id: blockWithRelations!.id,
      title: blockWithRelations!.title,
      slug: blockWithRelations!.slug,
      description: blockWithRelations!.description,
      content: blockWithRelations!.content,
      status: blockWithRelations!.status,
      category: blockWithRelations!.category,
      tags: blockWithRelations!.tags,
      usageCount: blockWithRelations!.usageCount,
      visibility: blockWithRelations!.visibility,
      metadata: blockWithRelations!.metadata,
      author: {
        id: blockWithRelations!.author.id,
        name: blockWithRelations!.author.name
      },
      createdAt: blockWithRelations!.created_at,
      updatedAt: blockWithRelations!.updated_at
    });

  } catch (error: any) {
    // Error log removed
    res.status(500).json({ 
      error: 'Failed to create reusable block',
      message: error.message 
    });
  }
});

/**
 * PUT /api/reusable-blocks/:id
 * Update a reusable block
 */
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const block = await reusableBlockRepository.findOne({
      where: { id },
      relations: ['author']
    });

    if (!block) {
      return res.status(404).json({ error: 'Reusable block not found' });
    }

    // Check edit permissions
    if (!block.canEdit(userId!)) {
      return res.status(403).json({ error: 'Cannot edit this block' });
    }

    // Store revision before updating
    if (block.revisions) {
      const revision = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        author: userId!,
        changes: { ...req.body },
        blockData: block.content
      };
      
      const revisions = Array.isArray(block.revisions) ? block.revisions : [];
      revisions.push(revision);
      
      // Keep only last 10 revisions
      block.revisions = revisions.slice(-10);
    }

    // Update fields
    const {
      title,
      description,
      content,
      status,
      category,
      tags,
      visibility,
      isGlobal,
      isEditable,
      metadata
    } = req.body;

    if (title !== undefined) block.title = title;
    if (description !== undefined) block.description = description;
    if (content !== undefined) block.content = content;
    if (status !== undefined) block.status = status;
    if (category !== undefined) block.category = category;
    if (tags !== undefined) {
      block.tags = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim());
    }
    if (visibility !== undefined) block.visibility = visibility;
    if (isGlobal !== undefined) block.isGlobal = isGlobal;
    if (isEditable !== undefined) block.isEditable = isEditable;
    if (metadata !== undefined) block.metadata = metadata;
    
    block.lastModifiedBy = userId!;

    const savedBlock = await reusableBlockRepository.save(block);

    // Load relations for response
    const blockWithRelations = await reusableBlockRepository.findOne({
      where: { id: savedBlock.id },
      relations: ['author', 'lastModifier']
    });

    res.json({
      id: blockWithRelations!.id,
      title: blockWithRelations!.title,
      slug: blockWithRelations!.slug,
      description: blockWithRelations!.description,
      content: blockWithRelations!.content,
      status: blockWithRelations!.status,
      category: blockWithRelations!.category,
      tags: blockWithRelations!.tags,
      usageCount: blockWithRelations!.usageCount,
      lastUsedAt: blockWithRelations!.lastUsedAt,
      visibility: blockWithRelations!.visibility,
      metadata: blockWithRelations!.metadata,
      author: {
        id: blockWithRelations!.author.id,
        name: blockWithRelations!.author.name
      },
      lastModifiedBy: blockWithRelations!.lastModifier ? {
        id: blockWithRelations!.lastModifier.id,
        name: blockWithRelations!.lastModifier.name
      } : null,
      revisions: blockWithRelations!.revisions,
      createdAt: blockWithRelations!.created_at,
      updatedAt: blockWithRelations!.updated_at
    });

  } catch (error: any) {
    // Error log removed
    res.status(500).json({ 
      error: 'Failed to update reusable block',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/reusable-blocks/:id
 * Delete a reusable block
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const block = await reusableBlockRepository.findOne({
      where: { id }
    });

    if (!block) {
      return res.status(404).json({ error: 'Reusable block not found' });
    }

    // Check delete permissions (only author or admin can delete)
    if (block.author_id !== userId) {
      return res.status(403).json({ error: 'Cannot delete this block' });
    }

    await reusableBlockRepository.remove(block);

    res.json({ 
      message: 'Reusable block deleted successfully',
      id: id
    });

  } catch (error: any) {
    // Error log removed
    res.status(500).json({ 
      error: 'Failed to delete reusable block',
      message: error.message 
    });
  }
});

/**
 * POST /api/reusable-blocks/:id/duplicate
 * Duplicate a reusable block
 */
router.post('/:id/duplicate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { title } = req.body;

    const originalBlock = await reusableBlockRepository.findOne({
      where: { id }
    });

    if (!originalBlock) {
      return res.status(404).json({ error: 'Reusable block not found' });
    }

    // Check access permissions
    if (originalBlock.visibility === 'private' && originalBlock.author_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate unique slug for duplicate
    const duplicateTitle = title || `${originalBlock.title} (Copy)`;
    let slug = ReusableBlock.generateSlug(duplicateTitle);
    let slugExists = await reusableBlockRepository.findOne({ where: { slug } });
    let counter = 1;
    
    while (slugExists) {
      slug = `${ReusableBlock.generateSlug(duplicateTitle)}-${counter}`;
      slugExists = await reusableBlockRepository.findOne({ where: { slug } });
      counter++;
    }

    const duplicateBlock = new ReusableBlock();
    duplicateBlock.title = duplicateTitle;
    duplicateBlock.slug = slug;
    duplicateBlock.description = originalBlock.description;
    duplicateBlock.content = originalBlock.content;
    duplicateBlock.category = originalBlock.category;
    duplicateBlock.tags = originalBlock.tags;
    duplicateBlock.visibility = 'private'; // Always create as private
    duplicateBlock.isGlobal = false;
    duplicateBlock.isEditable = true;
    duplicateBlock.metadata = { ...originalBlock.metadata };
    duplicateBlock.author_id = userId!;
    duplicateBlock.lastModifiedBy = userId!;

    const savedBlock = await reusableBlockRepository.save(duplicateBlock);

    // Load relations for response
    const blockWithRelations = await reusableBlockRepository.findOne({
      where: { id: savedBlock.id },
      relations: ['author']
    });

    res.status(201).json({
      id: blockWithRelations!.id,
      title: blockWithRelations!.title,
      slug: blockWithRelations!.slug,
      description: blockWithRelations!.description,
      content: blockWithRelations!.content,
      status: blockWithRelations!.status,
      category: blockWithRelations!.category,
      tags: blockWithRelations!.tags,
      visibility: blockWithRelations!.visibility,
      metadata: blockWithRelations!.metadata,
      author: {
        id: blockWithRelations!.author.id,
        name: blockWithRelations!.author.name
      },
      createdAt: blockWithRelations!.created_at,
      updatedAt: blockWithRelations!.updated_at
    });

  } catch (error: any) {
    // Error log removed
    res.status(500).json({ 
      error: 'Failed to duplicate reusable block',
      message: error.message 
    });
  }
});

/**
 * GET /api/reusable-blocks/categories
 * Get all block categories
 */
router.get('/categories', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const categories = await reusableBlockRepository
      .createQueryBuilder('block')
      .select('DISTINCT block.category', 'category')
      .where('block.category IS NOT NULL')
      .andWhere('block.category != :empty', { empty: '' })
      .getRawMany();

    const categoryList = categories
      .map(item => item.category)
      .filter(Boolean)
      .sort();

    res.json(categoryList);

  } catch (error: any) {
    // Error log removed
    res.status(500).json({ 
      error: 'Failed to fetch categories',
      message: error.message 
    });
  }
});

export default router;