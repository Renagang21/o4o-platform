import { Router, Request, Response } from 'express';
import { CosmeticsFilterService } from '../services/CosmeticsFilterService.js';
import { RoutineRecommendationService } from '../services/RoutineRecommendationService.js';

const router = Router();

/**
 * GET /api/v1/cosmetics/products
 * Get filtered cosmetics products
 */
router.get('/products', async (req: Request, res: Response) => {
  try {
    const {
      skinType,
      concerns,
      certifications,
      category,
      timeOfUse,
      search,
      page = 1,
      limit = 20,
      sortBy,
      sortOrder
    } = req.query;

    // Parse array parameters
    const filters = {
      skinType: skinType ? (Array.isArray(skinType) ? skinType as string[] : [skinType as string]) : undefined,
      concerns: concerns ? (Array.isArray(concerns) ? concerns as string[] : [concerns as string]) : undefined,
      certifications: certifications ? (Array.isArray(certifications) ? certifications as string[] : [certifications as string]) : undefined,
      category: category as string,
      timeOfUse: timeOfUse as string,
      search: search as string,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    // Get data source from app context
    const dataSource = (req as any).app.get('dataSource');
    const filterService = new CosmeticsFilterService(dataSource);

    const products = await filterService.filterProducts(filters);
    const totalCount = await filterService.getProductCount(filters);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / filters.limit)
        }
      }
    });
  } catch (error) {
    console.error('Error filtering cosmetics products:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FILTER_ERROR',
        message: 'Failed to filter products',
        details: (error as Error).message
      }
    });
  }
});

/**
 * GET /api/v1/cosmetics/products/:id
 * Get single cosmetics product with full metadata
 */
router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dataSource = (req as any).app.get('dataSource');

    const product = await dataSource
      .getRepository('Product')
      .createQueryBuilder('product')
      .where('product.id = :id', { id })
      .andWhere("product.metadata->>'productType' = :productType", { productType: 'cosmetics' })
      .getOne();

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Cosmetics product not found'
        }
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching cosmetics product:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch product',
        details: (error as Error).message
      }
    });
  }
});

/**
 * POST /api/v1/cosmetics/routine
 * Get routine recommendation
 */
router.post('/routine', async (req: Request, res: Response) => {
  try {
    const { skinType, concerns, timeOfUse } = req.body;

    // Validation
    if (!skinType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'skinType is required'
        }
      });
    }

    if (!timeOfUse) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'timeOfUse is required (morning, evening, or weekly)'
        }
      });
    }

    const dataSource = (req as any).app.get('dataSource');
    const routineService = new RoutineRecommendationService(dataSource);

    const recommendation = await routineService.recommendRoutine({
      skinType,
      concerns,
      timeOfUse
    });

    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    console.error('Error generating routine recommendation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RECOMMENDATION_ERROR',
        message: 'Failed to generate routine recommendation',
        details: (error as Error).message
      }
    });
  }
});

/**
 * GET /api/v1/cosmetics/filters
 * Get available filter options
 */
router.get('/filters', async (req: Request, res: Response) => {
  try {
    const dataSource = (req as any).app.get('dataSource');
    const filterService = new CosmeticsFilterService(dataSource);

    const filterOptions = await filterService.getFilterOptions();

    res.json({
      success: true,
      data: filterOptions
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FILTER_OPTIONS_ERROR',
        message: 'Failed to fetch filter options',
        details: (error as Error).message
      }
    });
  }
});

export default router;
