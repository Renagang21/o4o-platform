import { Router, Request, Response } from 'express';
import { CosmeticsFilterService } from '../services/CosmeticsFilterService.js';
import { RoutineRecommendationService } from '../services/RoutineRecommendationService.js';
import { InfluencerRoutineService } from '../services/InfluencerRoutineService.js';

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

/**
 * Influencer Routine Endpoints
 */

/**
 * POST /api/v1/cosmetics/influencer-routines
 * Create a new influencer routine
 */
router.post('/influencer-routines', async (req: Request, res: Response) => {
  try {
    const { partnerId, title, description, skinType, concerns, timeOfUse, routine, tags, isPublished } = req.body;

    // Validation
    if (!partnerId || !title || !skinType || !concerns || !timeOfUse || !routine) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Required fields: partnerId, title, skinType, concerns, timeOfUse, routine',
        },
      });
    }

    // Additional validation
    if (!Array.isArray(skinType) || skinType.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'skinType must be a non-empty array',
        },
      });
    }

    if (!Array.isArray(concerns) || concerns.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'concerns must be a non-empty array',
        },
      });
    }

    if (!Array.isArray(routine) || routine.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'routine must have at least 2 steps',
        },
      });
    }

    // Validate routine steps structure
    for (let i = 0; i < routine.length; i++) {
      const step = routine[i];
      if (!step.productId || typeof step.step !== 'number') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Step ${i + 1} must have productId and step number`,
          },
        });
      }
    }

    const dataSource = (req as any).app.get('dataSource');
    const routineService = new InfluencerRoutineService(dataSource);

    const newRoutine = await routineService.createRoutine({
      partnerId,
      title,
      description,
      skinType,
      concerns,
      timeOfUse,
      routine,
      tags,
      isPublished,
    });

    res.status(201).json({
      success: true,
      data: newRoutine,
    });
  } catch (error) {
    console.error('Error creating influencer routine:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Failed to create routine',
        details: (error as Error).message,
      },
    });
  }
});

/**
 * GET /api/v1/cosmetics/influencer-routines
 * List influencer routines with filters
 */
router.get('/influencer-routines', async (req: Request, res: Response) => {
  try {
    const {
      skinType,
      concerns,
      timeOfUse,
      tags,
      partnerId,
      isPublished,
      search,
      page = 1,
      limit = 20,
      sortBy,
      sortOrder,
    } = req.query;

    const filters = {
      skinType: skinType ? (Array.isArray(skinType) ? (skinType as string[]) : [skinType as string]) : undefined,
      concerns: concerns ? (Array.isArray(concerns) ? (concerns as string[]) : [concerns as string]) : undefined,
      timeOfUse: timeOfUse as string,
      tags: tags ? (Array.isArray(tags) ? (tags as string[]) : [tags as string]) : undefined,
      partnerId: partnerId as string,
      isPublished: isPublished === 'false' ? false : true,
      search: search as string,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const dataSource = (req as any).app.get('dataSource');
    const routineService = new InfluencerRoutineService(dataSource);

    const routines = await routineService.listRoutines(filters);
    const totalCount = await routineService.getRoutineCount(filters);

    res.json({
      success: true,
      data: {
        routines,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / filters.limit),
        },
      },
    });
  } catch (error) {
    console.error('Error listing influencer routines:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: 'Failed to list routines',
        details: (error as Error).message,
      },
    });
  }
});

/**
 * GET /api/v1/cosmetics/influencer-routines/:id
 * Get single influencer routine
 */
router.get('/influencer-routines/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const dataSource = (req as any).app.get('dataSource');
    const routineService = new InfluencerRoutineService(dataSource);

    const routine = await routineService.getRoutine(id);

    res.json({
      success: true,
      data: routine,
    });
  } catch (error) {
    if ((error as Error).message === 'Routine not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ROUTINE_NOT_FOUND',
          message: 'Influencer routine not found',
        },
      });
    }

    console.error('Error fetching influencer routine:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch routine',
        details: (error as Error).message,
      },
    });
  }
});

/**
 * PUT /api/v1/cosmetics/influencer-routines/:id
 * Update influencer routine
 */
router.put('/influencer-routines/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, skinType, concerns, timeOfUse, routine, tags, isPublished } = req.body;

    // Validate provided fields
    if (skinType !== undefined && (!Array.isArray(skinType) || skinType.length === 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'skinType must be a non-empty array',
        },
      });
    }

    if (concerns !== undefined && (!Array.isArray(concerns) || concerns.length === 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'concerns must be a non-empty array',
        },
      });
    }

    if (routine !== undefined) {
      if (!Array.isArray(routine) || routine.length < 2) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'routine must have at least 2 steps',
          },
        });
      }

      // Validate routine steps structure
      for (let i = 0; i < routine.length; i++) {
        const step = routine[i];
        if (!step.productId || typeof step.step !== 'number') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Step ${i + 1} must have productId and step number`,
            },
          });
        }
      }
    }

    const dataSource = (req as any).app.get('dataSource');
    const routineService = new InfluencerRoutineService(dataSource);

    const updatedRoutine = await routineService.updateRoutine(id, {
      title,
      description,
      skinType,
      concerns,
      timeOfUse,
      routine,
      tags,
      isPublished,
    });

    res.json({
      success: true,
      data: updatedRoutine,
    });
  } catch (error) {
    if ((error as Error).message === 'Routine not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ROUTINE_NOT_FOUND',
          message: 'Influencer routine not found',
        },
      });
    }

    console.error('Error updating influencer routine:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update routine',
        details: (error as Error).message,
      },
    });
  }
});

/**
 * DELETE /api/v1/cosmetics/influencer-routines/:id
 * Delete influencer routine
 */
router.delete('/influencer-routines/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const dataSource = (req as any).app.get('dataSource');
    const routineService = new InfluencerRoutineService(dataSource);

    await routineService.deleteRoutine(id);

    res.json({
      success: true,
      message: 'Routine deleted successfully',
    });
  } catch (error) {
    if ((error as Error).message === 'Routine not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ROUTINE_NOT_FOUND',
          message: 'Influencer routine not found',
        },
      });
    }

    console.error('Error deleting influencer routine:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete routine',
        details: (error as Error).message,
      },
    });
  }
});

/**
 * POST /api/v1/cosmetics/influencer-routines/:id/recommend
 * Increment recommend count
 */
router.post('/influencer-routines/:id/recommend', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const dataSource = (req as any).app.get('dataSource');
    const routineService = new InfluencerRoutineService(dataSource);

    await routineService.incrementRecommendCount(id);

    res.json({
      success: true,
      message: 'Recommend count incremented',
    });
  } catch (error) {
    console.error('Error incrementing recommend count:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RECOMMEND_ERROR',
        message: 'Failed to increment recommend count',
        details: (error as Error).message,
      },
    });
  }
});

export default router;
