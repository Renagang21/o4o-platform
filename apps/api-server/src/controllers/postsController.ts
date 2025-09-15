import { Request, Response } from 'express'
import { AppDataSource } from '../database/connection'
import { Post } from '../entities/Post'
import { Category } from '../entities/Category'
import { Tag } from '../entities/Tag'
import { User } from '../entities/User'
import { PostAutosave } from '../entities/PostAutosave'
import { In, Like, Not, FindManyOptions, FindOptionsWhere } from 'typeorm'
import crypto from 'crypto'

const postRepository = AppDataSource.getRepository(Post)
const categoryRepository = AppDataSource.getRepository(Category)
const tagRepository = AppDataSource.getRepository(Tag)
const userRepository = AppDataSource.getRepository(User)
const autosaveRepository = AppDataSource.getRepository(PostAutosave)

// Store recent request hashes to prevent duplicate processing
const recentRequests = new Map<string, { timestamp: number; result?: any }>()

// Clean up old request hashes every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of recentRequests.entries()) {
    if (now - value.timestamp > 5 * 60 * 1000) { // 5 minutes
      recentRequests.delete(key)
    }
  }
}, 5 * 60 * 1000)

// Generate request hash for deduplication
const generateRequestHash = (userId: string, body: any): string => {
  // Remove _requestId and other temporary fields
  const cleanBody = { ...body }
  delete cleanBody._requestId
  delete cleanBody.requestId
  
  const data = JSON.stringify({ userId, ...cleanBody })
  return crypto.createHash('sha256').update(data).digest('hex')
}

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
      orderby = 'created_at',
      order = 'DESC',
      type = 'post'
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(per_page as string)
    const skip = (pageNum - 1) * limitNum

    // Build where conditions
    const where: FindOptionsWhere<Post> = { type: type as string }
    
    // Handle status filtering - excludeStatus takes precedence over status
    if (excludeStatus) {
      where.status = Not(excludeStatus as any)
    } else if (status) {
      where.status = status as any
    }
    if (author) where.author_id = author as string
    if (search) {
      where.title = Like(`%${search}%`)
    }

    // Build query options
    const options: FindManyOptions<Post> = {
      where,
      relations: ['author', 'categories', 'tags'],
      skip,
      take: limitNum,
      order: { [orderby === 'created_at' ? 'created_at' : orderby as string]: order as 'ASC' | 'DESC' }
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
    

    // Increment view count safely (using meta field)
    const currentViews = post.meta?.views || 0;
    const updatedMeta = { 
      ...post.meta, 
      views: Number(currentViews) + 1 
    };
    await postRepository.update(id, { 
      meta: updatedMeta as any
    });

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

    // Check for duplicate request
    const requestHash = generateRequestHash(userId, req.body)
    const existingRequest = recentRequests.get(requestHash)
    
    if (existingRequest) {
      // If request was made within last 2 seconds, return the cached result
      if (Date.now() - existingRequest.timestamp < 2000) {
        // Duplicate request detected, returning cached result
        if (existingRequest.result) {
          return res.status(201).json(existingRequest.result)
        }
        // Request is still being processed
        return res.status(409).json({ 
          error: { 
            code: 'DUPLICATE_REQUEST', 
            message: 'A similar request is already being processed' 
          } 
        })
      }
    }
    
    // Mark request as being processed
    recentRequests.set(requestHash, { timestamp: Date.now() })

    const {
      title,
      content,
      excerpt,
      slug,
      status = 'draft',
      categories = [],
      tags = [],
      featured_media,
      template,
      comment_status = 'open',
      ping_status = 'open',
      sticky = false,
      meta
    } = req.body
    
    // Debug log
    // console.log('[DEBUG] Create post request received:', { 
    //   title, 
    //   slug, 
    //   contentLength: content?.length,
    //   status 
    // })

    // Debug log
    // console.log('[DEBUG] Create post request received:', {
    //   title,
    //   slug,
    //   contentLength: content?.length,
    //   status
    // })

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

    // Validate and generate slug
    let finalSlug = slug;
    
    // Check if provided slug is valid (only lowercase letters, numbers, and hyphens)
    if (finalSlug && !/^[a-z0-9-]+$/.test(finalSlug)) {
      return res.status(400).json({ 
        error: { 
          code: 'INVALID_SLUG',
          message: 'Slug can only contain lowercase letters, numbers, and hyphens (a-z, 0-9, -)',
          field: 'slug'
        } 
      })
    }
    
    // If no slug provided, check if we can generate one
    if (!finalSlug) {
      if (title) {
        // Try to generate from title
        finalSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        
        // If result is empty (e.g., Korean title), require manual input
        if (!finalSlug || finalSlug === '') {
          return res.status(400).json({ 
            error: { 
              code: 'SLUG_REQUIRED',
              message: 'Please provide a URL slug. The title contains characters that cannot be converted to a valid URL.',
              field: 'slug'
            } 
          })
        }
      } else {
        // No title and no slug - use timestamp
        finalSlug = `post-${Date.now()}`;
      }
    }

    // Create new post
    const post = postRepository.create({
      title,
      content,
      excerpt,
      slug: finalSlug,
      status,
      type: 'post',
      author_id: userId,
      template,
      featured_media,
      comment_status,
      ping_status,
      sticky,
      meta,
      published_at: status === 'publish' || status === 'publish' ? new Date() : undefined
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
    
    // Debug log
    // console.log('[DEBUG] Post saved:', { 
    //   id: savedPost.id, 
    //   title: savedPost.title, 
    //   slug: savedPost.slug 
    // })

    // Debug log
    // console.log('[DEBUG] Post saved:', {
    //   id: savedPost.id,
    //   title: savedPost.title,
    //   slug: savedPost.slug
    // })

    // Cache the result
    const result = { data: savedPost }
    const cachedRequest = recentRequests.get(requestHash)
    if (cachedRequest) {
      cachedRequest.result = result
    }

    res.status(201).json(result)
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
      categories,
      tags,
      template,
      featured_media,
      comment_status,
      ping_status,
      sticky,
      meta
    } = req.body

    // Debug log
    // console.log('[DEBUG] Update post request received:', {
    //   id,
    //   title,
    //   slug,
    //   status
    // })

    // Validate that if updating title, it's not just whitespace
    if (title !== undefined && title && typeof title === 'string' && !title.trim()) {
      return res.status(400).json({ 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: '제목에 공백만 입력할 수 없습니다' 
        } 
      })
    }

    // Validate slug if provided
    if (slug) {
      // Check if slug is valid (only lowercase letters, numbers, and hyphens)
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ 
          error: { 
            code: 'INVALID_SLUG',
            message: 'Slug can only contain lowercase letters, numbers, and hyphens (a-z, 0-9, -)',
            field: 'slug'
          } 
        })
      }
      
      // Check slug uniqueness only if it's different from current
      if (slug && slug !== post.slug) {
        const existingPost = await postRepository.findOne({ 
          where: { 
            slug
          } 
        })
        
        // Check if the found post exists and is different from current post
        if (existingPost && existingPost.id !== id) {
          return res.status(409).json({ 
            error: { 
              code: 'SLUG_CONFLICT', 
              message: `The slug "${slug}" is already in use by another post. Please choose a different slug.`,
              field: 'slug',
              suggestedSlug: `${slug}-${Date.now().toString().slice(-4)}`
            } 
          })
        }
      }
    }

    // Update post fields
    if (title !== undefined) post.title = title
    if (content !== undefined) post.content = content
    if (excerpt !== undefined) post.excerpt = excerpt
    if (slug !== undefined) post.slug = slug
    if (status !== undefined) {
      post.status = status
      if ((status === 'publish' || status === 'publish') && !post.published_at) {
        post.published_at = new Date()
      }
    }
    if (template !== undefined) post.template = template
    if (featured_media !== undefined) post.featured_media = featured_media
    if (comment_status !== undefined) post.comment_status = comment_status
    if (ping_status !== undefined) post.ping_status = ping_status
    if (sticky !== undefined) post.sticky = sticky
    if (meta !== undefined) post.meta = meta

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

    // Debug log
    // console.log('[DEBUG] Post updated:', {
    //   id: updatedPost.id,
    //   title: updatedPost.title,
    //   slug: updatedPost.slug
    // })

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

    // Create autosave entry
    const autosave = autosaveRepository.create({
      post_id: id,
      title,
      content,
      excerpt
    })

    const savedAutosave = await autosaveRepository.save(autosave)

    // Clean up old autosaves (keep only last 10)
    const allAutosaves = await autosaveRepository.find({
      where: { post_id: id },
      order: { saved_at: 'DESC' }
    })

    if (allAutosaves.length > 10) {
      const toDelete = allAutosaves.slice(10)
      await autosaveRepository.remove(toDelete)
    }

    res.json({ 
      data: { 
        id: savedAutosave.id,
        post_id: id,
        saved_at: savedAutosave.saved_at,
        message: 'Auto-save successful'
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
      select: ['id', 'meta']
    })
    
    if (!post) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } })
    }

    res.json(post.meta?.revisions || [])
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
            if (post.status === 'publish') {
              failed.push({
                id,
                code: 'ALREADY_PUBLISHED',
                message: 'Post is already published'
              })
            } else {
              post.status = 'publish'
              post.published_at = post.published_at || new Date()
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

// Get post counts by status
export const getPostCounts = async (req: Request, res: Response) => {
  try {
    // Get the authenticated user if available
    const userId = (req as any).user?.id
    
    // Get all posts
    const allPosts = await postRepository.find({
      where: { type: 'post' },
      select: ['id', 'status', 'author_id']
    })
    
    // Calculate counts
    const counts = {
      all: allPosts.filter(p => p.status !== 'trash').length,
      mine: userId ? allPosts.filter(p => p.author_id === userId && p.status !== 'trash').length : 0,
      published: allPosts.filter(p => p.status === 'publish').length,
      draft: allPosts.filter(p => p.status === 'draft').length,
      private: allPosts.filter(p => p.status === 'private').length,
      trash: allPosts.filter(p => p.status === 'trash').length
    }
    
    res.json(counts)
  } catch (error) {
    console.error('Error fetching post counts:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch post counts' } })
  }
}
