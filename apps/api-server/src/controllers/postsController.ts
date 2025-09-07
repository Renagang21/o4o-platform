import { Request, Response } from 'express'
import { AppDataSource } from '../database/connection'
import { Post } from '../entities/Post'
import { Category } from '../entities/Category'
import { PostTag } from '../entities/PostTag'
import { User } from '../entities/User'
import { In, Like, Not, FindManyOptions, FindOptionsWhere } from 'typeorm'

const postRepository = AppDataSource.getRepository(Post)
const categoryRepository = AppDataSource.getRepository(Category)
const tagRepository = AppDataSource.getRepository(PostTag)
const userRepository = AppDataSource.getRepository(User)

// Get all posts with filtering and pagination
export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      per_page = 10,
      search,
      status,
      excludeStatus,
      category,
      tag,
      author,
      orderby = 'createdAt',
      order = 'DESC',
      format,
      type = 'post'
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(per_page as string)
    const skip = (pageNum - 1) * limitNum

    // Build where conditions
    const where: FindOptionsWhere<Post> = { type: type as string }
    
    // Handle status filtering - excludeStatus takes precedence over status
    if (excludeStatus) {
      where.status = Not(excludeStatus as string)
    } else if (status) {
      where.status = status as string
    }
    if (format) where.format = format as string
    if (author) where.authorId = author as string
    if (search) {
      where.title = Like(`%${search}%`)
    }

    // Build query options
    const options: FindManyOptions<Post> = {
      where,
      relations: ['author', 'categories', 'tags'],
      skip,
      take: limitNum,
      order: { [orderby as string]: order as 'ASC' | 'DESC' }
    }

    const [posts, total] = await postRepository.findAndCount(options)

    // Apply category and tag filters if needed
    let filteredPosts = posts
    if (category) {
      filteredPosts = posts.filter(post => 
        post.categories?.some(cat => cat.id === category || cat.slug === category)
      )
    }
    if (tag) {
      filteredPosts = posts.filter(post =>
        post.tags?.some(t => t.id === tag || t.slug === tag)
      )
    }

    res.json({
      data: filteredPosts,
      meta: {
        page: pageNum,
        perPage: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch posts' } })
  }
}

// Get single post
export const getPost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    // Check if database is connected
    if (!AppDataSource.isInitialized) {
      console.error('Database not initialized')
      return res.status(503).json({ 
        error: { code: 'DB_NOT_READY', message: 'Database connection not available' } 
      })
    }
    
    const post = await postRepository.findOne({
      where: { id },
      relations: ['author', 'categories', 'tags']
    })

    if (!post) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } })
    }

    // Increment view count safely
    if (typeof post.views === 'number') {
      await postRepository.update(id, { views: post.views + 1 })
    }

    res.json({ data: post })
  } catch (error) {
    console.error('Error fetching post:', error)
    res.status(500).json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to fetch post',
        details: error.message 
      } 
    })
  }
}

// Create new post
export const createPost = async (req: Request, res: Response) => {
  try {
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
      format = 'standard',
      categories = [],
      tags = [],
      featured = false,
      sticky = false,
      featuredImage,
      template,
      seo,
      customFields,
      postMeta,
      allowComments = true,
      password,
      scheduledAt
    } = req.body

    // Validate that at least title or content is provided
    if (!title && !content) {
      return res.status(400).json({ 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: '제목이나 내용 중 하나는 입력해야 합니다' 
        } 
      })
    }

    // Validate title is not just whitespace
    if (title && typeof title === 'string' && !title.trim()) {
      return res.status(400).json({ 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: '제목에 공백만 입력할 수 없습니다' 
        } 
      })
    }

    // Check if slug is unique
    if (slug) {
      const existingPost = await postRepository.findOne({ where: { slug } })
      if (existingPost) {
        return res.status(409).json({ error: { code: 'CONFLICT', message: 'Slug already exists' } })
      }
    }

    // Create new post
    const post = postRepository.create({
      title,
      content,
      excerpt,
      slug: slug || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : ''),
      status,
      format,
      type: 'post',
      authorId: userId,
      featured,
      sticky,
      featuredImage,
      template,
      seo,
      customFields,
      postMeta,
      allowComments,
      password,
      passwordProtected: !!password,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      publishedAt: status === 'publish' || status === 'published' ? new Date() : undefined
    })

    // Handle categories
    if (categories.length > 0) {
      const categoryEntities = await categoryRepository.findBy({
        id: In(categories)
      })
      post.categories = categoryEntities
    }

    // Handle tags
    if (tags.length > 0) {
      const tagEntities = await tagRepository.findBy({
        id: In(tags)
      })
      post.tags = tagEntities
    }

    const savedPost = await postRepository.save(post)

    res.status(201).json({ data: savedPost })
  } catch (error) {
    console.error('Error creating post:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create post' } })
  }
}

// Update post
export const updatePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = (req as any).user?.id
    
    if (!userId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } })
    }

    const post = await postRepository.findOne({
      where: { id },
      relations: ['categories', 'tags']
    })

    if (!post) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } })
    }

    const {
      title,
      content,
      excerpt,
      slug,
      status,
      format,
      categories,
      tags,
      featured,
      sticky,
      featuredImage,
      template,
      seo,
      customFields,
      postMeta,
      allowComments,
      password,
      scheduledAt
    } = req.body

    // Validate that if updating title, it's not just whitespace
    if (title !== undefined && title && typeof title === 'string' && !title.trim()) {
      return res.status(400).json({ 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: '제목에 공백만 입력할 수 없습니다' 
        } 
      })
    }

    // Check slug uniqueness if changed
    if (slug && slug !== post.slug) {
      const existingPost = await postRepository.findOne({ where: { slug } })
      if (existingPost) {
        return res.status(409).json({ error: { code: 'CONFLICT', message: 'Slug already exists' } })
      }
    }

    // Update post fields
    if (title !== undefined) post.title = title
    if (content !== undefined) post.content = content
    if (excerpt !== undefined) post.excerpt = excerpt
    if (slug !== undefined) post.slug = slug
    if (status !== undefined) {
      post.status = status
      if ((status === 'publish' || status === 'published') && !post.publishedAt) {
        post.publishedAt = new Date()
      }
    }
    if (format !== undefined) post.format = format
    if (featured !== undefined) post.featured = featured
    if (sticky !== undefined) post.sticky = sticky
    if (featuredImage !== undefined) post.featuredImage = featuredImage
    if (template !== undefined) post.template = template
    if (seo !== undefined) post.seo = seo
    if (customFields !== undefined) post.customFields = customFields
    if (postMeta !== undefined) post.postMeta = postMeta
    if (allowComments !== undefined) post.allowComments = allowComments
    if (password !== undefined) {
      post.password = password
      post.passwordProtected = !!password
    }
    if (scheduledAt !== undefined) post.scheduledAt = scheduledAt ? new Date(scheduledAt) : null

    post.lastModifiedBy = userId

    // Update categories
    if (categories !== undefined) {
      const categoryEntities = categories.length > 0
        ? await categoryRepository.findBy({ id: In(categories) })
        : []
      post.categories = categoryEntities
    }

    // Update tags
    if (tags !== undefined) {
      const tagEntities = tags.length > 0
        ? await tagRepository.findBy({ id: In(tags) })
        : []
      post.tags = tagEntities
    }

    const updatedPost = await postRepository.save(post)

    res.json({ data: updatedPost })
  } catch (error) {
    console.error('Error updating post:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update post' } })
  }
}

// Delete post
export const deletePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const force = req.query.force === 'true'
    
    const post = await postRepository.findOne({ where: { id } })
    
    if (!post) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } })
    }

    if (force) {
      // Hard delete - permanently remove from database
      await postRepository.remove(post)
      res.json({ data: { message: 'Post permanently deleted' } })
    } else {
      // Soft delete by changing status to trash
      post.status = 'trash'
      await postRepository.save(post)
      res.json({ data: { message: 'Post moved to trash' } })
    }
  } catch (error) {
    console.error('Error deleting post:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete post' } })
  }
}

// Auto-save post
export const autoSavePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { content, title, excerpt } = req.body
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } })
    }

    const post = await postRepository.findOne({ where: { id } })
    
    if (!post) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } })
    }

    // Store current version as revision
    const revisions = post.revisions || []
    revisions.push({
      id: `rev_${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: userId,
      changes: {
        title: post.title,
        content: post.content,
        excerpt: post.excerpt
      }
    })

    // Limit revisions to last 10
    if (revisions.length > 10) {
      revisions.shift()
    }

    // Update post with auto-saved content
    post.revisions = revisions
    if (content !== undefined) post.content = content
    if (title !== undefined) post.title = title
    if (excerpt !== undefined) post.excerpt = excerpt
    post.lastModifiedBy = userId

    await postRepository.save(post)

    res.json({ 
      data: { 
        message: 'Auto-save successful', 
        revisionId: revisions[revisions.length - 1].id,
        updatedAt: new Date().toISOString()
      } 
    })
  } catch (error) {
    console.error('Error auto-saving post:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to auto-save post' } })
  }
}

// Get post revisions
export const getPostRevisions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const post = await postRepository.findOne({ 
      where: { id },
      select: ['id', 'revisions']
    })
    
    if (!post) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } })
    }

    res.json(post.revisions || [])
  } catch (error) {
    console.error('Error fetching revisions:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch revisions' } })
  }
}

// Preview post
export const previewPost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const post = await postRepository.findOne({
      where: { id },
      relations: ['author', 'categories', 'tags']
    })
    
    if (!post) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } })
    }

    // Return post with preview flag
    res.json({
      data: {
        ...post,
        preview: true,
        previewUrl: `/preview/posts/${id}`
      }
    })
  } catch (error) {
    console.error('Error previewing post:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to preview post' } })
  }
}

// Bulk operations with partial failure handling
export const bulkOperatePosts = async (req: Request, res: Response) => {
  try {
    const { action, ids } = req.body
    
    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid bulk operation parameters' 
        }
      })
    }

    // Validate action
    const validActions = ['trash', 'restore', 'delete', 'publish', 'draft']
    if (!validActions.includes(action)) {
      return res.status(400).json({ 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid action' 
        }
      })
    }

    const succeeded: string[] = []
    const failed: Array<{ id: string; code: string; message: string }> = []

    // Process each ID individually to handle partial failures
    for (const id of ids) {
      try {
        const post = await postRepository.findOne({ where: { id } })
        
        if (!post) {
          failed.push({
            id,
            code: 'NOT_FOUND',
            message: 'Post not found'
          })
          continue
        }

        // Apply action based on current state
        switch (action) {
          case 'trash':
            if (post.status === 'trash') {
              failed.push({
                id,
                code: 'ALREADY_TRASHED',
                message: 'Post is already in trash'
              })
            } else {
              post.status = 'trash'
              await postRepository.save(post)
              succeeded.push(id)
            }
            break
            
          case 'restore':
            if (post.status !== 'trash') {
              failed.push({
                id,
                code: 'NOT_IN_TRASH',
                message: 'Post is not in trash'
              })
            } else {
              post.status = 'draft'
              await postRepository.save(post)
              succeeded.push(id)
            }
            break
            
          case 'delete':
            await postRepository.remove(post)
            succeeded.push(id)
            break
            
          case 'publish':
            if (post.status === 'published') {
              failed.push({
                id,
                code: 'ALREADY_PUBLISHED',
                message: 'Post is already published'
              })
            } else {
              post.status = 'published'
              post.publishedAt = post.publishedAt || new Date()
              await postRepository.save(post)
              succeeded.push(id)
            }
            break
            
          case 'draft':
            if (post.status === 'draft') {
              failed.push({
                id,
                code: 'ALREADY_DRAFT',
                message: 'Post is already a draft'
              })
            } else {
              post.status = 'draft'
              await postRepository.save(post)
              succeeded.push(id)
            }
            break
        }
      } catch (error) {
        failed.push({
          id,
          code: 'OPERATION_FAILED',
          message: error.message || 'Failed to process post'
        })
      }
    }

    // Return 200 with partial results
    res.json({
      data: {
        action,
        succeeded,
        failed,
        total: ids.length,
        successCount: succeeded.length,
        failureCount: failed.length
      }
    })
  } catch (error) {
    console.error('Error in bulk operation:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to perform bulk operation' } })
  }
}
