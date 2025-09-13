import { Router } from 'express'
import { PagesController } from '../../controllers/pagesController'
import { authenticate as authenticateToken } from '../../middleware/auth.middleware'
import { AppDataSource } from '../../database/connection'
import { Page } from '../../entities/Page'
import { Request, Response } from 'express'

const router: Router = Router()
const pagesController = new PagesController()

// Helper function to build page hierarchy
const buildPageHierarchy = (pages: Page[]): any[] => {
  const pageMap = new Map()
  const roots: any[] = []

  // First pass: create map
  pages.forEach(page => {
    pageMap.set(page.id, { ...page, children: [] })
  })

  // Second pass: build hierarchy
  pages.forEach(page => {
    const pageNode = pageMap.get(page.id)
    if (page.parentId) {
      const parent = pageMap.get(page.parentId)
      if (parent) {
        parent.children.push(pageNode)
      }
    } else {
      roots.push(pageNode)
    }
  })

  return roots
}

// Public routes
router.get('/', async (req: Request, res: Response) => {
  try {
    const pageRepository = AppDataSource.getRepository(Page)
    const {
      page = 1,
      per_page = 10,
      search,
      status,
      parent,
      author,
      orderby = 'menuOrder',
      order = 'ASC',
      menu_order
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(per_page as string)
    const skip = (pageNum - 1) * limitNum

    const queryBuilder = pageRepository.createQueryBuilder('page')
      .leftJoinAndSelect('page.author', 'author')
      .leftJoinAndSelect('page.parent', 'parent')
      .leftJoinAndSelect('page.children', 'children')

    if (status) {
      queryBuilder.andWhere('page.status = :status', { status })
    }
    
    if (parent !== undefined) {
      if (parent === '0' || parent === null) {
        queryBuilder.andWhere('page.parentId IS NULL')
      } else {
        queryBuilder.andWhere('page.parentId = :parentId', { parentId: parent })
      }
    }
    
    if (author) {
      queryBuilder.andWhere('page.author_id = :authorId', { authorId: author })
    }
    
    if (search) {
      queryBuilder.andWhere('(page.title ILIKE :search OR page.excerpt ILIKE :search)', 
        { search: `%${search}%` })
    }
    
    if (menu_order !== undefined) {
      queryBuilder.andWhere('page.menuOrder = :menuOrder', { menuOrder: menu_order })
    }

    queryBuilder.orderBy(`page.${orderby as string}`, order as 'ASC' | 'DESC')
      .skip(skip)
      .take(limitNum)

    const [pages, total] = await queryBuilder.getManyAndCount()

    res.json({
      data: pages,
      pagination: {
        page: pageNum,
        per_page: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Error fetching pages:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch pages' } })
  }
})

router.get('/hierarchy', async (req: Request, res: Response) => {
  try {
    const pageRepository = AppDataSource.getRepository(Page)
    const pages = await pageRepository.find({
      where: { status: 'publish' },
      relations: ['author'],
      order: { menuOrder: 'ASC' }
    })

    const hierarchy = buildPageHierarchy(pages)
    res.json(hierarchy)
  } catch (error) {
    console.error('Error fetching page hierarchy:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch page hierarchy' } })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pageRepository = AppDataSource.getRepository(Page)
    const { id } = req.params
    
    const page = await pageRepository.findOne({
      where: { id },
      relations: ['author', 'parent', 'children', 'lastModifier']
    })

    if (!page) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Page not found' } })
    }

    // Increment view count
    await pageRepository.update(id, { views: page.views + 1 })

    res.json(page)
  } catch (error) {
    console.error('Error fetching page:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch page' } })
  }
})

router.get('/:id/preview', async (req: Request, res: Response) => {
  try {
    const pageRepository = AppDataSource.getRepository(Page)
    const { id } = req.params
    
    const page = await pageRepository.findOne({
      where: { id },
      relations: ['author', 'parent', 'children']
    })
    
    if (!page) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Page not found' } })
    }

    res.json({
      ...page,
      preview: true,
      previewUrl: `/preview/pages/${id}`
    })
  } catch (error) {
    console.error('Error previewing page:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to preview page' } })
  }
})

// Protected routes
router.use(authenticateToken)

router.post('/', async (req: Request, res: Response) => {
  try {
    const pageRepository = AppDataSource.getRepository(Page)
    const userId = (req as any).user?.id
    
    if (!userId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } })
    }

    const {
      title,
      content,
      excerpt,
      slug,
      status = 'draft',
      parentId,
      menuOrder = 0,
      template,
      seo,
      customFields,
      allowComments = true,
      password,
      scheduledAt,
      showInMenu = true,
      isHomepage = false
    } = req.body

    // Check if slug is unique
    if (slug) {
      const existingPage = await pageRepository.findOne({ where: { slug } })
      if (existingPage) {
        return res.status(409).json({ error: { code: 'CONFLICT', message: 'Slug already exists' } })
      }
    }

    const page = pageRepository.create({
      title,
      content,
      excerpt,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      status,
      type: 'page',
      parentId,
      menuOrder,
      template,
      seo,
      customFields,
      allowComments,
      password,
      passwordProtected: !!password,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      publishedAt: status === 'publish' ? new Date() : undefined,
      authorId: userId,
      showInMenu,
      isHomepage
    })

    // If setting as homepage, unset other homepages
    if (isHomepage) {
      await pageRepository.update({ isHomepage: true }, { isHomepage: false })
    }

    const savedPage = await pageRepository.save(page)
    res.status(201).json(savedPage)
  } catch (error) {
    console.error('Error creating page:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create page' } })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pageRepository = AppDataSource.getRepository(Page)
    const { id } = req.params
    const userId = (req as any).user?.id
    
    if (!userId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } })
    }

    const page = await pageRepository.findOne({ where: { id } })
    
    if (!page) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Page not found' } })
    }

    const {
      title,
      content,
      excerpt,
      slug,
      status,
      parentId,
      menuOrder,
      template,
      seo,
      customFields,
      allowComments,
      password,
      scheduledAt,
      showInMenu,
      isHomepage
    } = req.body

    // Check slug uniqueness if changed
    if (slug && slug !== page.slug) {
      const existingPage = await pageRepository.findOne({ where: { slug } })
      if (existingPage) {
        return res.status(409).json({ error: { code: 'CONFLICT', message: 'Slug already exists' } })
      }
    }

    // Update fields
    if (title !== undefined) page.title = title
    if (content !== undefined) page.content = content
    if (excerpt !== undefined) page.excerpt = excerpt
    if (slug !== undefined) page.slug = slug
    if (status !== undefined) {
      page.status = status
      if (status === 'publish' && !page.published_at) {
        page.published_at = new Date()
      }
    }
    if (parentId !== undefined) page.parentId = parentId
    if (menuOrder !== undefined) page.menuOrder = menuOrder
    if (template !== undefined) page.template = template
    if (seo !== undefined) page.seo = seo
    if (customFields !== undefined) page.customFields = customFields
    if (allowComments !== undefined) page.allowComments = allowComments
    if (password !== undefined) {
      page.password = password
      page.passwordProtected = !!password
    }
    if (scheduledAt !== undefined) page.scheduledAt = scheduledAt ? new Date(scheduledAt) : null
    if (showInMenu !== undefined) page.showInMenu = showInMenu
    
    // Handle homepage setting
    if (isHomepage !== undefined) {
      page.isHomepage = isHomepage
      if (isHomepage) {
        await pageRepository.update({ isHomepage: true, id: Not(id) }, { isHomepage: false })
      }
    }

    page.lastModifiedBy = userId

    const updatedPage = await pageRepository.save(page)
    res.json(updatedPage)
  } catch (error) {
    console.error('Error updating page:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update page' } })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pageRepository = AppDataSource.getRepository(Page)
    const { id } = req.params
    
    const page = await pageRepository.findOne({ where: { id } })
    
    if (!page) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Page not found' } })
    }

    // Soft delete by changing status to trash
    page.status = 'trash'
    await pageRepository.save(page)

    res.json({ message: 'Page moved to trash' })
  } catch (error) {
    console.error('Error deleting page:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete page' } })
  }
})

router.post('/:id/autosave', async (req: Request, res: Response) => {
  try {
    const pageRepository = AppDataSource.getRepository(Page)
    const { id } = req.params
    const { content, title, excerpt } = req.body
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } })
    }

    const page = await pageRepository.findOne({ where: { id } })
    
    if (!page) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Page not found' } })
    }

    // Store current version as revision
    const revisions = page.revisions || []
    revisions.push({
      id: `rev_${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: userId,
      changes: {
        title: page.title,
        content: page.content,
        excerpt: page.excerpt
      }
    })

    // Limit revisions to last 10
    if (revisions.length > 10) {
      revisions.shift()
    }

    // Update page with auto-saved content
    page.revisions = revisions
    if (content !== undefined) page.content = content
    if (title !== undefined) page.title = title
    if (excerpt !== undefined) page.excerpt = excerpt
    page.lastModifiedBy = userId

    await pageRepository.save(page)

    res.json({ message: 'Auto-save successful', revisionId: revisions[revisions.length - 1].id })
  } catch (error) {
    console.error('Error auto-saving page:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to auto-save page' } })
  }
})

router.get('/:id/revisions', async (req: Request, res: Response) => {
  try {
    const pageRepository = AppDataSource.getRepository(Page)
    const { id } = req.params
    
    const page = await pageRepository.findOne({ 
      where: { id },
      select: ['id', 'revisions']
    })
    
    if (!page) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Page not found' } })
    }

    res.json(page.revisions || [])
  } catch (error) {
    console.error('Error fetching revisions:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch revisions' } })
  }
})

router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const pageRepository = AppDataSource.getRepository(Page)
    const { action, ids } = req.body
    
    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid bulk operation parameters' 
        }
      })
    }

    const pages = await pageRepository.findBy({ id: In(ids) })
    
    if (pages.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No pages found' } })
    }

    switch (action) {
      case 'trash':
        await pageRepository.update({ id: In(ids) }, { status: 'trash' })
        break
      case 'restore':
        await pageRepository.update({ id: In(ids) }, { status: 'draft' })
        break
      case 'delete':
        await pageRepository.delete({ id: In(ids) })
        break
      case 'publish':
        await pageRepository.update(
          { id: In(ids) }, 
          { status: 'publish', publishedAt: new Date() }
        )
        break
      case 'draft':
        await pageRepository.update({ id: In(ids) }, { status: 'draft' })
        break
      default:
        return res.status(400).json({ 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid action' 
          }
        })
    }

    res.json({ 
      message: `Bulk ${action} completed`,
      affected: pages.length 
    })
  } catch (error) {
    console.error('Error in bulk operation:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to perform bulk operation' } })
  }
})

// Import Not operator
import { Not, In } from 'typeorm'

export default router