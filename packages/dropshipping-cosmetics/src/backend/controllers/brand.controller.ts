/**
 * Brand Controller
 *
 * Handles HTTP requests for brand management
 */

import { Request, Response } from 'express';
import { BrandService, CreateBrandDTO, UpdateBrandDTO, BrandListOptions } from '../services/brand.service.js';

export class BrandController {
  constructor(private brandService: BrandService) {}

  /**
   * POST /api/v1/cosmetics/brands
   * Create a new brand
   */
  async createBrand(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateBrandDTO = {
        name: req.body.name,
        logoUrl: req.body.logoUrl,
        description: req.body.description,
        metadata: req.body.metadata,
      };

      // Validate required fields
      if (!dto.name || dto.name.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Brand name is required',
        });
        return;
      }

      // Check if brand already exists
      const existing = await this.brandService.getBrandByName(dto.name);
      if (existing) {
        res.status(409).json({
          success: false,
          message: 'Brand with this name already exists',
        });
        return;
      }

      const brand = await this.brandService.createBrand(dto);

      res.status(201).json({
        success: true,
        data: brand,
        message: 'Brand created successfully',
      });
    } catch (error: any) {
      console.error('Error creating brand:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create brand',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/brands/:id
   * Get brand by ID
   */
  async getBrandById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const brand = await this.brandService.getBrandById(id);

      if (!brand) {
        res.status(404).json({
          success: false,
          message: 'Brand not found',
        });
        return;
      }

      res.json({
        success: true,
        data: brand,
      });
    } catch (error: any) {
      console.error('Error fetching brand:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch brand',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/brands
   * List brands with filtering and pagination
   */
  async listBrands(req: Request, res: Response): Promise<void> {
    try {
      const options: BrandListOptions = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        search: req.query.search as string,
        country: req.query.country as string,
        tags: req.query.tags
          ? (req.query.tags as string).split(',').map(t => t.trim())
          : undefined,
      };

      const result = await this.brandService.listBrands(options);

      res.json({
        success: true,
        data: result.brands,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      console.error('Error listing brands:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list brands',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/brands/all
   * Get all brands (no pagination, for dropdown/select)
   */
  async getAllBrands(req: Request, res: Response): Promise<void> {
    try {
      const brands = await this.brandService.getAllBrands();

      res.json({
        success: true,
        data: brands,
      });
    } catch (error: any) {
      console.error('Error fetching all brands:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch brands',
        error: error.message,
      });
    }
  }

  /**
   * PUT /api/v1/cosmetics/brands/:id
   * Update brand
   */
  async updateBrand(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateBrandDTO = {
        name: req.body.name,
        logoUrl: req.body.logoUrl,
        description: req.body.description,
        metadata: req.body.metadata,
      };

      // If name is being changed, check for conflicts
      if (dto.name) {
        const existing = await this.brandService.getBrandByName(dto.name);
        if (existing && existing.id !== id) {
          res.status(409).json({
            success: false,
            message: 'Brand with this name already exists',
          });
          return;
        }
      }

      const brand = await this.brandService.updateBrand(id, dto);

      if (!brand) {
        res.status(404).json({
          success: false,
          message: 'Brand not found',
        });
        return;
      }

      res.json({
        success: true,
        data: brand,
        message: 'Brand updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating brand:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update brand',
        error: error.message,
      });
    }
  }

  /**
   * DELETE /api/v1/cosmetics/brands/:id
   * Delete brand
   */
  async deleteBrand(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await this.brandService.deleteBrand(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Brand not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Brand deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting brand:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete brand',
        error: error.message,
      });
    }
  }
}
