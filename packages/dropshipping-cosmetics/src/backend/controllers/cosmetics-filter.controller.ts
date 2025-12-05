/**
 * Cosmetics Filter Controller
 *
 * Handles HTTP requests for cosmetics filter management
 */

import type { Request, Response } from 'express';
import { CosmeticsFilterService } from '../services/cosmetics-filter.service.js';
import type { CosmeticsFilters } from '../../types.js';

export class CosmeticsFilterController {
  private filterService: CosmeticsFilterService;

  constructor() {
    this.filterService = new CosmeticsFilterService();
  }

  /**
   * GET /api/v1/cosmetics/filters
   * Get all filter configurations
   */
  async getAllFilters(req: Request, res: Response): Promise<void> {
    try {
      const filters = await this.filterService.getAllFilters();

      res.json({
        success: true,
        data: filters,
      });
    } catch (error) {
      console.error('Error fetching filters:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch filter configurations',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/filters/:id
   * Get filter configuration by ID
   */
  async getFilterById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const filter = await this.filterService.getFilterById(id);

      if (!filter) {
        res.status(404).json({
          success: false,
          message: `Filter configuration '${id}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: filter,
      });
    } catch (error) {
      console.error('Error fetching filter:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch filter configuration',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/v1/cosmetics/filters/:id
   * Update filter configuration
   */
  async updateFilter(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updated = await this.filterService.updateFilter(id, updates);

      if (!updated) {
        res.status(404).json({
          success: false,
          message: `Filter configuration '${id}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: updated,
        message: 'Filter configuration updated successfully',
      });
    } catch (error) {
      console.error('Error updating filter:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update filter configuration',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/cosmetics/products/filter
   * Filter products by cosmetics metadata
   */
  async filterProducts(req: Request, res: Response): Promise<void> {
    try {
      const filters: CosmeticsFilters = req.body.filters || {};
      const products = req.body.products || [];

      const filtered = this.filterService.filterProducts(products, filters);

      res.json({
        success: true,
        data: filtered,
        total: filtered.length,
        filters: filters,
      });
    } catch (error) {
      console.error('Error filtering products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to filter products',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/filters/statistics
   * Get filter statistics
   */
  async getFilterStatistics(req: Request, res: Response): Promise<void> {
    try {
      const products = req.body.products || [];

      const stats = await this.filterService.getFilterStatistics(products);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching filter statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch filter statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default CosmeticsFilterController;
