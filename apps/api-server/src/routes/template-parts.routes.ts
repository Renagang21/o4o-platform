import { Router, Response, Request } from 'express'
import AppDataSource from '../database/connection.js'
import { TemplatePart } from '../entities/TemplatePart.js'
import { authenticate } from '../middleware/auth.middleware.js';
import type { AuthRequest } from '../types/auth.js'
import { In, Not } from 'typeorm'
import { z } from 'zod'
import logger from '../utils/logger.js'

const router: Router = Router()

// Validation schemas
const templatePartSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  area: z.enum(['header', 'footer', 'sidebar', 'general']),
  content: z.array(z.any()),
  settings: z.object({
    containerWidth: z.enum(['full', 'wide', 'narrow']).optional(),
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
    padding: z.object({
      top: z.string().optional(),
      bottom: z.string().optional(),
      left: z.string().optional(),
      right: z.string().optional()
    }).optional(),
    customCss: z.string().optional()
  }).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  priority: z.number().optional(),
  tags: z.array(z.string()).optional(),
  conditions: z.object({
    pages: z.array(z.string()).optional(),
    postTypes: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    userRoles: z.array(z.string()).optional(),
    subdomain: z.string().optional(),
    path_prefix: z.string().optional()
  }).optional()
})

// Get active template parts for a specific area (PUBLIC ACCESS - 라우트 순서 최우선)
router.get('/area/:area/active', async (req: Request, res: Response) => {
  try {
    // Check database connection first
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Database not available',
        code: 'DB_NOT_READY'
      })
    }

    const { area } = req.params
    const { context, subdomain, path } = req.query // Optional context for conditional rendering

    const templatePartRepository = AppDataSource.getRepository(TemplatePart)

    // Get all active template parts for the area
    // Sort by priority (lower is higher priority), then by updatedAt (recent first)
    let templateParts = await templatePartRepository.find({
      where: {
        area: area as any,
        isActive: true
      },
      order: {
        priority: 'ASC',
        updatedAt: 'DESC'
      }
    })

    // Extract subdomain and path prefix from query params
    const subdomainStr = subdomain ? String(subdomain) : null
    const pathStr = path ? String(path) : null
    let pathPrefix: string | null = null
    if (pathStr && pathStr !== '/') {
      const segments = pathStr.split('/').filter(Boolean)
      if (segments.length > 0) {
        pathPrefix = `/${segments[0]}/`
      }
    }

    // Filter by conditions if context is provided
    let contextData: any = {}
    if (context) {
      try {
        contextData = JSON.parse(String(context))
      } catch (parseError) {
        // Invalid context JSON, ignore
      }
    }

    templateParts = templateParts.filter(part => {
      // Parse conditions if it's a string
      let conditions = part.conditions
      if (typeof conditions === 'string') {
        try {
          conditions = JSON.parse(conditions)
        } catch (parseError) {
          logger.warn(`Template part ${part.id} has invalid JSON conditions:`, parseError)
          conditions = null
        }
      }

      if (!conditions) {
        // No conditions means show everywhere
        return true
      }

      try {
        // Check subdomain condition
        if (conditions.subdomain) {
          if (!subdomainStr || conditions.subdomain !== subdomainStr) {
            return false
          }
        }

        // Check path prefix condition
        if (conditions.path_prefix) {
          if (!pathPrefix || !pathPrefix.startsWith(conditions.path_prefix)) {
            return false
          }
        }

        // Check page conditions
        if (conditions.pages && contextData.pageId) {
          if (!conditions.pages.includes(contextData.pageId)) return false
        }

        // Check post type conditions
        if (conditions.postTypes && contextData.postType) {
          if (!conditions.postTypes.includes(contextData.postType)) return false
        }

        // Check category conditions
        if (conditions.categories && contextData.categories) {
          const hasCategory = conditions.categories.some(cat =>
            contextData.categories.includes(cat)
          )
          if (!hasCategory) return false
        }

        // Check user role conditions
        if (conditions.userRoles && contextData.userRole) {
          if (!conditions.userRoles.includes(contextData.userRole)) return false
        }

        return true
      } catch (conditionError) {
        logger.warn(`Error evaluating conditions for template part ${part.id}:`, conditionError)
        // If there's an error evaluating conditions, include the part by default
        return true
      }
    })
    
    // Sanitize content field for each template part before sending to client
    const sanitizedTemplateParts = templateParts.map(templatePart => {
      try {
        let sanitizedContent = templatePart.content
        
        // If content is a string, try to parse it as JSON
        if (typeof templatePart.content === 'string') {
          try {
            sanitizedContent = JSON.parse(templatePart.content)
          } catch (parseError) {
            // If parsing fails, set to empty array for client safety
            logger.warn(`Template part ${templatePart.id} has invalid JSON content:`, parseError)
            sanitizedContent = []
          }
        }
        
        // If content is null or undefined, set to empty array
        if (sanitizedContent == null) {
          sanitizedContent = []
        }
        
        // Ensure content is always an array
        if (!Array.isArray(sanitizedContent)) {
          logger.warn(`Template part ${templatePart.id} content is not an array, converting to empty array`)
          sanitizedContent = []
        }
        
        return {
          ...templatePart,
          content: sanitizedContent
        }
      } catch (error) {
        console.error(`Error sanitizing template part ${templatePart.id}:`, error)
        return {
          ...templatePart,
          content: []
        }
      }
    })
    
    res.json({
      success: true,
      data: sanitizedTemplateParts,
      count: sanitizedTemplateParts.length
    })
  } catch (error) {
    logger.error('Template Parts API Error:', {
      area: req.params.area,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: req.query
    })
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active template parts',
      code: 'TEMPLATE_PARTS_ERROR',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    })
  }
})

// Get all template parts with filtering
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      area,
      isActive = 'true',
      isDefault,
      search,
      page = '1',
      limit = '20',
      orderBy = 'priority',
      order = 'ASC'
    } = req.query

    const templatePartRepository = AppDataSource.getRepository(TemplatePart)
    
    let query = templatePartRepository.createQueryBuilder('templatePart')
      .leftJoinAndSelect('templatePart.author', 'author')
    
    // Filter by area
    if (area) {
      query = query.andWhere('templatePart.area = :area', { area })
    }
    
    // Filter by active status
    if (isActive !== 'all') {
      query = query.andWhere('templatePart.isActive = :isActive', { 
        isActive: isActive === 'true' 
      })
    }
    
    // Filter by default status
    if (isDefault !== undefined) {
      query = query.andWhere('templatePart.isDefault = :isDefault', { 
        isDefault: isDefault === 'true' 
      })
    }
    
    // Search by name or description
    if (search) {
      query = query.andWhere(
        '(templatePart.name ILIKE :search OR templatePart.description ILIKE :search)',
        { search: `%${search}%` }
      )
    }
    
    // Add ordering
    const validOrderBy = ['priority', 'name', 'created_at', 'updated_at']
    const orderByField = validOrderBy.includes(String(orderBy)) ? String(orderBy) : 'priority'
    const orderDirection = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
    query = query.orderBy(`templatePart.${orderByField}`, orderDirection)
    
    // Pagination
    const take = Math.min(parseInt(String(limit)), 100)
    const skip = (parseInt(String(page)) - 1) * take
    
    const [templateParts, total] = await query
      .take(take)
      .skip(skip)
      .getManyAndCount()
    
    // WordPress-compatible headers
    res.header('X-WP-Total', total.toString())
    res.header('X-WP-TotalPages', Math.ceil(total / take).toString())
    
    res.json(templateParts)
  } catch (error) {
    console.error('Error fetching template parts:', error)
    res.status(500).json({ error: 'Failed to fetch template parts' })
  }
})

// Get template part by ID or slug
router.get('/:identifier', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { identifier } = req.params
    const templatePartRepository = AppDataSource.getRepository(TemplatePart)
    
    // Check if identifier is UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
    
    const templatePart = await templatePartRepository.findOne({
      where: isUuid ? { id: identifier } : { slug: identifier },
      relations: ['author']
    })
    
    if (!templatePart) {
      return res.status(404).json({ error: 'Template part not found' })
    }
    
    res.json(templatePart)
  } catch (error) {
    console.error('Error fetching template part:', error)
    res.status(500).json({ error: 'Failed to fetch template part' })
  }
})


// Create new template part
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = templatePartSchema.parse(req.body)
    const templatePartRepository = AppDataSource.getRepository(TemplatePart)
    
    // Generate slug if not provided
    if (!validatedData.slug) {
      validatedData.slug = validatedData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    }
    
    // Check if slug already exists
    const existing = await templatePartRepository.findOne({
      where: { slug: validatedData.slug }
    })
    
    if (existing) {
      return res.status(400).json({ error: 'Slug already exists' })
    }
    
    // If setting as default, unset other defaults in same area
    if (validatedData.isDefault) {
      await templatePartRepository.update(
        { area: validatedData.area, isDefault: true },
        { isDefault: false }
      )
    }
    
    const templatePart = templatePartRepository.create({
      ...validatedData,
      authorId: req.user!.id
    })
    
    await templatePartRepository.save(templatePart)
    
    res.status(201).json(templatePart)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues })
    }
    console.error('Error creating template part:', error)
    res.status(500).json({ error: 'Failed to create template part' })
  }
})

// Update template part
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // Log incoming request for debugging
    logger.info('[Template Parts] PUT request received:', {
      id,
      bodyKeys: Object.keys(req.body),
      bodyPreview: JSON.stringify(req.body).substring(0, 500)
    })

    const validatedData = templatePartSchema.partial().parse(req.body)
    const templatePartRepository = AppDataSource.getRepository(TemplatePart)
    
    const templatePart = await templatePartRepository.findOne({
      where: { id }
    })
    
    if (!templatePart) {
      return res.status(404).json({ error: 'Template part not found' })
    }
    
    // Check slug uniqueness if changing
    if (validatedData.slug && validatedData.slug !== templatePart.slug) {
      const existing = await templatePartRepository.findOne({
        where: {
          slug: validatedData.slug,
          id: Not(id)  // Exclude current record from uniqueness check
        }
      })

      if (existing) {
        return res.status(400).json({ error: 'Slug already exists' })
      }
    }
    
    // If setting as default, unset other defaults in same area
    if (validatedData.isDefault && !templatePart.isDefault) {
      await templatePartRepository.update(
        { 
          area: validatedData.area || templatePart.area, 
          isDefault: true 
        },
        { isDefault: false }
      )
    }
    
    await templatePartRepository.update(id, validatedData)
    
    const updated = await templatePartRepository.findOne({
      where: { id },
      relations: ['author']
    })
    
    res.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('[Template Parts] Validation error:', error.issues)
      return res.status(400).json({
        error: 'Validation error',
        message: 'Request body validation failed',
        details: error.issues,
        code: 'VALIDATION_ERROR'
      })
    }
    logger.error('[Template Parts] Error updating template part:', error)
    res.status(500).json({
      error: 'Failed to update template part',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'UPDATE_ERROR'
    })
  }
})

// Delete template part
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const templatePartRepository = AppDataSource.getRepository(TemplatePart)
    
    const templatePart = await templatePartRepository.findOne({
      where: { id }
    })
    
    if (!templatePart) {
      return res.status(404).json({ error: 'Template part not found' })
    }
    
    // Don't allow deleting default template parts
    if (templatePart.isDefault) {
      return res.status(400).json({ error: 'Cannot delete default template part' })
    }
    
    await templatePartRepository.remove(templatePart)
    
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting template part:', error)
    res.status(500).json({ error: 'Failed to delete template part' })
  }
})

// Duplicate template part
router.post('/:id/duplicate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name } = req.body
    
    const templatePartRepository = AppDataSource.getRepository(TemplatePart)
    
    const original = await templatePartRepository.findOne({
      where: { id }
    })
    
    if (!original) {
      return res.status(404).json({ error: 'Template part not found' })
    }
    
    // Create new template part with copied data
    const duplicateName = name || `${original.name} (Copy)`
    const duplicateSlug = duplicateName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    
    // Ensure unique slug
    let finalSlug = duplicateSlug
    let counter = 1
    while (await templatePartRepository.findOne({ where: { slug: finalSlug } })) {
      finalSlug = `${duplicateSlug}-${counter}`
      counter++
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
      authorId: req.user!.id
    })
    
    await templatePartRepository.save(duplicate)
    
    res.status(201).json(duplicate)
  } catch (error) {
    console.error('Error duplicating template part:', error)
    res.status(500).json({ error: 'Failed to duplicate template part' })
  }
})

export default router