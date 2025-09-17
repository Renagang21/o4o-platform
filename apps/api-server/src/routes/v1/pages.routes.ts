import { Router, Request, Response } from 'express';
import { authenticate as authenticateToken } from '../../middleware/auth.middleware';
import { AppDataSource } from '../../database/connection';
import { Page } from '../../entities/Page';
import logger from '../../utils/logger';

const router: Router = Router();

// Apply authentication to ALL v1 pages routes
router.use(authenticateToken);

// Get single page by ID (authenticated)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pageRepository = AppDataSource.getRepository(Page);
    const { id } = req.params;
    
    // For authenticated endpoints, allow access to all page statuses
    const page = await pageRepository.findOne({
      where: { id },
      relations: ['author', 'parent', 'children', 'lastModifier']
    });

    if (!page) {
      return res.status(404).json({ 
        error: 'Page not found',
        code: 'PAGE_NOT_FOUND',
        message: 'The requested page does not exist'
      });
    }

    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    logger.error('Error fetching page (v1):', {
      pageId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch page'
    });
  }
});

// Get all pages (authenticated)
router.get('/', async (req: Request, res: Response) => {
  try {
    const pageRepository = AppDataSource.getRepository(Page);
    const {
      page = 1,
      per_page = 10,
      search,
      status,
      parent,
      author,
      orderby = 'menuOrder',
      order = 'ASC'
    } = req.query;

    const pageNumber = parseInt(page as string);
    const perPage = Math.min(parseInt(per_page as string), 100); // Limit to 100
    const offset = (pageNumber - 1) * perPage;

    const queryBuilder = pageRepository.createQueryBuilder('page')
      .leftJoinAndSelect('page.author', 'author')
      .leftJoinAndSelect('page.parent', 'parent');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(page.title ILIKE :search OR page.content ILIKE :search OR page.excerpt ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (status) {
      queryBuilder.andWhere('page.status = :status', { status });
    }

    if (parent) {
      if (parent === 'null') {
        queryBuilder.andWhere('page.parentId IS NULL');
      } else {
        queryBuilder.andWhere('page.parentId = :parent', { parent });
      }
    }

    if (author) {
      queryBuilder.andWhere('page.authorId = :author', { author });
    }

    // Apply ordering
    const validOrderFields = ['createdAt', 'updatedAt', 'title', 'menuOrder', 'publishedAt'];
    const orderField = validOrderFields.includes(orderby as string) ? orderby as string : 'menuOrder';
    const orderDirection = (order as string).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    queryBuilder.orderBy(`page.${orderField}`, orderDirection);

    // Get total count and paginated results
    const [pages, total] = await queryBuilder
      .skip(offset)
      .take(perPage)
      .getManyAndCount();

    res.json({
      success: true,
      data: pages,
      pagination: {
        page: pageNumber,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage)
      }
    });
  } catch (error) {
    logger.error('Error fetching pages (v1):', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch pages'
    });
  }
});

export default router;