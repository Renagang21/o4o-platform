import { Router } from 'express'
import { Request, Response } from 'express'
import { AppDataSource } from '../../database/connection'
import { Tag } from '../../entities/Tag'
import { authenticate as authenticateToken } from '../../middleware/auth.middleware'
import { Like, ILike } from 'typeorm'

const router: Router = Router()
const tagRepository = AppDataSource.getRepository(Tag)

// Get all tags
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      per_page = 100,
      search,
      orderby = 'name',
      order = 'ASC'
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(per_page as string)
    const skip = (pageNum - 1) * limitNum

    const queryBuilder = tagRepository.createQueryBuilder('tag')

    if (search) {
      queryBuilder.where(
        '(tag.name ILIKE :search OR tag.description ILIKE :search)',
        { search: `%${search}%` }
      )
    }


    queryBuilder.orderBy(`tag.${orderby as string}`, order as 'ASC' | 'DESC')
      .skip(skip)
      .take(limitNum)

    const [tags, total] = await queryBuilder.getManyAndCount()

    res.json({
      data: tags,
      pagination: {
        page: pageNum,
        per_page: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Error fetching tags:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tags' } })
  }
})

// Autocomplete endpoint for tags
router.get('/autocomplete', async (req: Request, res: Response) => {
  try {
    const { q } = req.query
    
    if (!q || typeof q !== 'string') {
      return res.json([])
    }

    const tags = await tagRepository.find({
      where: {
        name: ILike(`%${q}%`)
      },
      select: ['id', 'name', 'slug'],
      take: 10,
      order: {
        count: 'DESC'
      }
    })

    res.json(tags)
  } catch (error) {
    console.error('Error in tag autocomplete:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tag suggestions' } })
  }
})

// Get single tag
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const tag = await tagRepository.findOne({
      where: { id },
      relations: ['posts']
    })

    if (!tag) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Tag not found' } })
    }

    res.json(tag)
  } catch (error) {
    console.error('Error fetching tag:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tag' } })
  }
})

// Protected routes
router.use(authenticateToken)

// Create tag
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      slug,
      description,
      meta
    } = req.body

    // Check if slug is unique
    let finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-')
    
    const existingTag = await tagRepository.findOne({ where: { slug: finalSlug } })
    if (existingTag) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Tag already exists' } })
    }

    const tag = tagRepository.create({
      name,
      slug: finalSlug,
      description,
      meta,
      count: 0
    })

    const savedTag = await tagRepository.save(tag)
    res.status(201).json(savedTag)
  } catch (error) {
    console.error('Error creating tag:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create tag' } })
  }
})

// Update tag
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const {
      name,
      slug,
      description,
      meta
    } = req.body

    const tag = await tagRepository.findOne({ where: { id } })

    if (!tag) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Tag not found' } })
    }

    // Check slug uniqueness if changed
    if (slug && slug !== tag.slug) {
      const existingTag = await tagRepository.findOne({ where: { slug } })
      if (existingTag) {
        return res.status(409).json({ error: { code: 'CONFLICT', message: 'Slug already exists' } })
      }
    }

    // Update fields
    if (name !== undefined) tag.name = name
    if (slug !== undefined) tag.slug = slug
    if (description !== undefined) tag.description = description
    if (meta !== undefined) tag.meta = meta

    const updatedTag = await tagRepository.save(tag)
    res.json(updatedTag)
  } catch (error) {
    console.error('Error updating tag:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update tag' } })
  }
})

// Delete tag
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const tag = await tagRepository.findOne({
      where: { id },
      relations: ['posts']
    })

    if (!tag) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Tag not found' } })
    }

    // Check if tag is in use
    if (tag.posts && tag.posts.length > 0) {
      return res.status(400).json({ 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Cannot delete tag that is in use by posts' 
        }
      })
    }

    await tagRepository.remove(tag)
    res.json({ message: 'Tag deleted successfully' })
  } catch (error) {
    console.error('Error deleting tag:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete tag' } })
  }
})

// Merge tags
router.post('/merge', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sourceIds, targetId } = req.body

    if (!sourceIds || !Array.isArray(sourceIds) || !targetId) {
      return res.status(400).json({ 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid merge parameters' 
        }
      })
    }

    const targetTag = await tagRepository.findOne({
      where: { id: targetId },
      relations: ['posts']
    })

    if (!targetTag) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Target tag not found' } })
    }

    const sourceTags = await tagRepository.find({
      where: sourceIds.map(id => ({ id })),
      relations: ['posts']
    })

    // Merge posts from source tags to target tag
    for (const sourceTag of sourceTags) {
      if (sourceTag.posts) {
        for (const post of sourceTag.posts) {
          if (!targetTag.posts.find(p => p.id === post.id)) {
            targetTag.posts.push(post)
          }
        }
      }
      // Update usage count
      targetTag.count += sourceTag.count
    }

    await tagRepository.save(targetTag)

    // Delete source tags
    await tagRepository.remove(sourceTags)

    res.json({ 
      message: 'Tags merged successfully',
      targetTag
    })
  } catch (error) {
    console.error('Error merging tags:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to merge tags' } })
  }
})

export default router