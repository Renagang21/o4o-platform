import { Router } from 'express';
import { AppDataSource } from '../database/connection.js';
import { Template } from '../entities/Template.js';
import { Page } from '../entities/Page.js';
import { Post } from '../entities/Post.js';
import { CustomPost, PostStatus } from '../entities/CustomPost.js';
import logger from '../utils/logger.js';
import { checkPostAccess, getAccessDeniedResponse } from '../utils/accessControl.js';

const router: Router = Router();

// Get permalink settings (public endpoint)
router.get('/permalink-settings', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        structure: '/%postname%/',
        categoryBase: 'category',
        tagBase: 'tag',
        removeStopWords: false,
        maxUrlLength: 75,
        autoFlushRules: true,
        enableSeoWarnings: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get permalink settings'
    });
  }
});

// ========== WordPress-Standard Unified Slug Resolution ==========
// Searches all content types by slug (Pages -> Posts -> Custom Posts)
// This follows WordPress query hierarchy for menu system compatibility
router.get('/content/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Database not initialized',
        code: 'DB_NOT_INITIALIZED'
      });
    }

    // 1. Try Pages first (highest priority in WordPress)
    const pageRepository = AppDataSource.getRepository(Page);
    const page = await pageRepository.findOne({
      where: { slug, status: 'publish' }
    });

    if (page) {
      // Check access control for page (page is stored in Post table with type='page')
      const postRepository = AppDataSource.getRepository(Post);
      const pagePost = await postRepository.findOne({
        where: { id: page.id, type: 'page' }
      });

      if (pagePost) {
        const user = (req as any).user;
        const accessCheck = checkPostAccess(pagePost, user);

        if (!accessCheck.allowed) {
          return res.status(403).json(getAccessDeniedResponse(accessCheck));
        }
      }

      // Get template if page has one
      let templateContent = null;
      if (page.template) {
        const templateRepository = AppDataSource.getRepository(Template);
        const template = await templateRepository.findOne({
          where: { slug: page.template }
        });
        if (template) {
          templateContent = template.content;
        }
      }

      return res.json({
        success: true,
        data: {
          contentType: 'page',
          id: page.id,
          title: page.title,
          slug: page.slug,
          content: page.content,
          blocks: templateContent || page.content || null,
          metadata: {
            excerpt: page.excerpt,
            featuredImage: page.customFields?.featuredImage || null,
            seo: {
              metaTitle: page.seo?.title || page.title,
              metaDescription: page.seo?.description || page.excerpt,
              metaKeywords: page.seo?.keywords?.join(', ') || ''
            },
            updatedAt: page.updatedAt
          }
        }
      });
    }

    // 2. Try Posts (second priority)
    const postRepository = AppDataSource.getRepository(Post);
    const post = await postRepository.findOne({
      where: { slug, status: 'publish' },
      relations: ['author', 'categories', 'tags']
    });

    if (post) {
      // Check access control for post
      const user = (req as any).user;
      const accessCheck = checkPostAccess(post, user);

      if (!accessCheck.allowed) {
        return res.status(403).json(getAccessDeniedResponse(accessCheck));
      }

      return res.json({
        success: true,
        data: {
          contentType: 'post',
          id: post.id,
          title: post.title,
          slug: post.slug,
          content: post.content || '',
          blocks: post.content || null,
          excerpt: post.excerpt || '',
          metadata: {
            excerpt: post.excerpt,
            featuredImage: post.featured_media || post.meta?.featuredImage || null,
            author: post.author ? {
              id: post.author.id,
              name: post.author.fullName || post.author.email,
              email: post.author.email
            } : null,
            categories: post.categories || [],
            tags: post.tags || [],
            seo: {
              metaTitle: post.seo?.title || post.title,
              metaDescription: post.seo?.description || post.excerpt,
              metaKeywords: post.seo?.keywords?.join(', ') || ''
            },
            publishedAt: post.published_at,
            updatedAt: post.updated_at
          }
        }
      });
    }

    // 3. Try Custom Posts (lowest priority)
    const customPostRepository = AppDataSource.getRepository(CustomPost);
    const customPost = await customPostRepository.findOne({
      where: { 
        slug,
        status: PostStatus.PUBLISHED
      },
      relations: ['postType']
    });

    if (customPost) {
      return res.json({
        success: true,
        data: {
          contentType: 'custom-post',
          postType: customPost.postType.slug,
          id: customPost.id,
          title: customPost.title,
          slug: customPost.slug,
          content: customPost.content || '',
          blocks: customPost.content || null,
          customFields: customPost.fields || {},
          metadata: {
            excerpt: customPost.meta?.seoDescription || '',
            featuredImage: customPost.meta?.thumbnail || null,
            seo: {
              metaTitle: customPost.meta?.seoTitle || customPost.title,
              metaDescription: customPost.meta?.seoDescription || '',
              metaKeywords: customPost.meta?.tags?.join(', ') || ''
            },
            updatedAt: customPost.updatedAt
          }
        }
      });
    }

    // 4. Not found
    return res.status(404).json({
      success: false,
      error: 'Content not found',
      message: `No published content found with slug: ${slug}`
    });

  } catch (error: any) {
    logger.error('Failed to fetch content by slug:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content'
    });
  }
});

// Get homepage template
router.get('/templates/homepage', async (req, res) => {
  try {
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Database not initialized',
        code: 'DB_NOT_INITIALIZED'
      });
    }

    const templateRepository = AppDataSource.getRepository(Template);
    const homepageTemplate = await templateRepository.findOne({
      where: { 
        type: 'page',
        name: 'homepage',
        active: true
      }
    });

    if (!homepageTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Homepage template not found',
        code: 'TEMPLATE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        id: homepageTemplate.id,
        name: homepageTemplate.name,
        blocks: homepageTemplate.content || [],
        metadata: {
          version: homepageTemplate.version,
          layoutType: homepageTemplate.layoutType,
          updatedAt: homepageTemplate.updatedAt
        }
      }
    });
  } catch (error: any) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to fetch homepage template'
    });
  }
});

// Get page by UUID or slug
router.get('/pages/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const pageRepository = AppDataSource.getRepository(Page);
    
    // Check if parameter is UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    
    // Find page by ID or slug
    const page = await pageRepository.findOne({
      where: isUUID 
        ? { id: idOrSlug, status: 'publish' }
        : { slug: idOrSlug, status: 'publish' }
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'Page not found or not published'
      });
    }

    // Check access control for page (page is stored in Post table with type='page')
    const postRepository = AppDataSource.getRepository(Post);
    const pagePost = await postRepository.findOne({
      where: { id: page.id, type: 'page' }
    });

    if (pagePost) {
      const user = (req as any).user;
      const accessCheck = checkPostAccess(pagePost, user);

      if (!accessCheck.allowed) {
        return res.status(403).json(getAccessDeniedResponse(accessCheck));
      }
    }

    // Get template if page has one
    let templateContent = null;
    if (page.template) {
      const templateRepository = AppDataSource.getRepository(Template);
      const template = await templateRepository.findOne({
        where: { slug: page.template }
      });
      if (template) {
        templateContent = template.content;
      }
    }

    res.json({
      success: true,
      data: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        content: page.content,
        blocks: templateContent || page.content || null,
        metadata: {
          excerpt: page.excerpt,
          featuredImage: page.customFields?.featuredImage || null,
          seo: {
            metaTitle: page.seo?.title || page.title,
            metaDescription: page.seo?.description || page.excerpt,
            metaKeywords: page.seo?.keywords?.join(', ') || ''
          },
          updatedAt: page.updatedAt
        }
      }
    });
  } catch (error: any) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to fetch page'
    });
  }
});

// Get template by type
router.get('/templates/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const templateRepository = AppDataSource.getRepository(Template);
    
    const template = await templateRepository.findOne({
      where: { 
        type: type as 'page' | 'post' | 'product' | 'archive' | 'single',
        active: true,
        featured: true
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: template.id,
        name: template.name,
        type: template.type,
        blocks: template.content,
        metadata: {
          version: template.version,
          layoutType: template.layoutType,
          updatedAt: template.updatedAt
        }
      }
    });
  } catch (error: any) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template'
    });
  }
});

// Get regular post by slug or ID
router.get('/posts/post/:slugOrId', async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const postRepository = AppDataSource.getRepository(Post);

    // Check if parameter is UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

    const post = await postRepository.findOne({
      where: isUUID
        ? { id: slugOrId, status: 'publish' }
        : { slug: slugOrId, status: 'publish' },
      relations: ['author', 'categories', 'tags']
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found or not published'
      });
    }

    // Check access control for post
    const user = (req as any).user;
    const accessCheck = checkPostAccess(post, user);

    if (!accessCheck.allowed) {
      return res.status(403).json(getAccessDeniedResponse(accessCheck));
    }

    res.json({
      success: true,
      data: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content || '',
        excerpt: post.excerpt || '',
        metadata: {
          excerpt: post.excerpt,
          featuredImage: post.featured_media || post.meta?.featuredImage || null,
          author: post.author ? {
            id: post.author.id,
            name: post.author.fullName || post.author.email,
            email: post.author.email
          } : null,
          categories: post.categories || [],
          tags: post.tags || [],
          seo: {
            metaTitle: post.seo?.title || post.title,
            metaDescription: post.seo?.description || post.excerpt,
            metaKeywords: post.seo?.keywords?.join(', ') || ''
          },
          publishedAt: post.published_at,
          updatedAt: post.updated_at
        }
      }
    });
  } catch (error: any) {
    logger.error('Failed to fetch post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch post'
    });
  }
});

// Get custom post by type and slug
router.get('/posts/:type/:slug', async (req, res) => {
  try {
    const { type, slug } = req.params;
    const customPostRepository = AppDataSource.getRepository(CustomPost);
    
    const post = await customPostRepository.findOne({
      where: { 
        slug,
        status: PostStatus.PUBLISHED
      },
      relations: ['postType']
    });

    if (!post || post.postType.slug !== type) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content || '',
        customFields: post.fields || {},
        metadata: {
          excerpt: post.meta?.seoDescription || '',
          featuredImage: post.meta?.thumbnail || null,
          seo: {
            metaTitle: post.meta?.seoTitle || post.title,
            metaDescription: post.meta?.seoDescription || '',
            metaKeywords: post.meta?.tags?.join(', ') || ''
          },
          updatedAt: post.updatedAt
        }
      }
    });
  } catch (error: any) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to fetch post'
    });
  }
});

// ========== PRODUCT PUBLIC ENDPOINTS ==========


// Get featured products (public)

// Get CPT types (public) - for admin dashboard
router.get('/cpt/types', async (req, res) => {
  try {
    // Import CPT service
    const { cptService } = await import('../modules/cpt-acf/services/cpt.service.js');

    const result = await cptService.getAllCPTs(true);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error: any) {
    logger.error('Public CPT types error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch CPT types',
      message: error.message
    });
  }
});

// Get template parts (public) - for admin dashboard
router.get('/template-parts', async (req, res) => {
  try {
    const { AppDataSource } = await import('../database/connection.js');
    const { TemplatePart } = await import('../entities/TemplatePart.js');

    const repository = AppDataSource.getRepository(TemplatePart);
    const queryBuilder = repository.createQueryBuilder('templatePart');

    // Filter by area if provided
    const { area } = req.query;
    if (area && area !== 'all') {
      queryBuilder.where('templatePart.area = :area', { area });
    }

    queryBuilder.orderBy('templatePart.createdAt', 'DESC');

    const [templateParts, count] = await queryBuilder.getManyAndCount();

    res.json({
      success: true,
      data: templateParts,
      count
    });
  } catch (error: any) {
    logger.error('Public template parts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template parts',
      message: error.message
    });
  }
});

export default router;
