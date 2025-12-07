/**
 * Dictionary Controller
 *
 * Handles HTTP requests for cosmetics dictionary management
 * (Skin Types, Concerns, Ingredients, Categories)
 */

import { Request, Response } from 'express';
import {
  DictionaryService,
  CreateDictionaryItemDTO,
  UpdateDictionaryItemDTO,
  DictionaryListOptions,
} from '../services/dictionary.service.js';

export class DictionaryController {
  constructor(private dictionaryService: DictionaryService) {}

  // ====== Skin Types ======

  /**
   * GET /api/v1/cosmetics/dictionary/skin-types
   */
  async listSkinTypes(req: Request, res: Response): Promise<void> {
    try {
      const options = this.parseListOptions(req);
      const result = await this.dictionaryService.listSkinTypes(options);

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to list skin types', error);
    }
  }

  /**
   * GET /api/v1/cosmetics/dictionary/skin-types/:id
   */
  async getSkinTypeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item = await this.dictionaryService.getSkinTypeById(id);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Skin type not found',
        });
        return;
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to fetch skin type', error);
    }
  }

  /**
   * POST /api/v1/cosmetics/dictionary/skin-types
   */
  async createSkinType(req: Request, res: Response): Promise<void> {
    try {
      const dto = this.parseCreateDTO(req);

      if (!dto.name || dto.name.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Name is required',
        });
        return;
      }

      const item = await this.dictionaryService.createSkinType(dto);

      res.status(201).json({
        success: true,
        data: item,
        message: 'Skin type created successfully',
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to create skin type', error);
    }
  }

  /**
   * PUT /api/v1/cosmetics/dictionary/skin-types/:id
   */
  async updateSkinType(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto = this.parseUpdateDTO(req);

      const item = await this.dictionaryService.updateSkinType(id, dto);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Skin type not found',
        });
        return;
      }

      res.json({
        success: true,
        data: item,
        message: 'Skin type updated successfully',
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to update skin type', error);
    }
  }

  /**
   * DELETE /api/v1/cosmetics/dictionary/skin-types/:id
   */
  async deleteSkinType(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.dictionaryService.deleteSkinType(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Skin type not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Skin type deleted successfully',
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to delete skin type', error);
    }
  }

  // ====== Concerns ======

  /**
   * GET /api/v1/cosmetics/dictionary/concerns
   */
  async listConcerns(req: Request, res: Response): Promise<void> {
    try {
      const options = this.parseListOptions(req);
      const result = await this.dictionaryService.listConcerns(options);

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to list concerns', error);
    }
  }

  /**
   * GET /api/v1/cosmetics/dictionary/concerns/:id
   */
  async getConcernById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item = await this.dictionaryService.getConcernById(id);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Concern not found',
        });
        return;
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to fetch concern', error);
    }
  }

  /**
   * POST /api/v1/cosmetics/dictionary/concerns
   */
  async createConcern(req: Request, res: Response): Promise<void> {
    try {
      const dto = this.parseCreateDTO(req);

      if (!dto.name || dto.name.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Name is required',
        });
        return;
      }

      const item = await this.dictionaryService.createConcern(dto);

      res.status(201).json({
        success: true,
        data: item,
        message: 'Concern created successfully',
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to create concern', error);
    }
  }

  /**
   * PUT /api/v1/cosmetics/dictionary/concerns/:id
   */
  async updateConcern(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto = this.parseUpdateDTO(req);

      const item = await this.dictionaryService.updateConcern(id, dto);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Concern not found',
        });
        return;
      }

      res.json({
        success: true,
        data: item,
        message: 'Concern updated successfully',
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to update concern', error);
    }
  }

  /**
   * DELETE /api/v1/cosmetics/dictionary/concerns/:id
   */
  async deleteConcern(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.dictionaryService.deleteConcern(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Concern not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Concern deleted successfully',
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to delete concern', error);
    }
  }

  // ====== Ingredients ======

  /**
   * GET /api/v1/cosmetics/dictionary/ingredients
   */
  async listIngredients(req: Request, res: Response): Promise<void> {
    try {
      const options = this.parseListOptions(req);
      const result = await this.dictionaryService.listIngredients(options);

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to list ingredients', error);
    }
  }

  /**
   * GET /api/v1/cosmetics/dictionary/ingredients/:id
   */
  async getIngredientById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item = await this.dictionaryService.getIngredientById(id);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Ingredient not found',
        });
        return;
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to fetch ingredient', error);
    }
  }

  /**
   * POST /api/v1/cosmetics/dictionary/ingredients
   */
  async createIngredient(req: Request, res: Response): Promise<void> {
    try {
      const dto = this.parseCreateDTO(req);

      if (!dto.name || dto.name.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Name is required',
        });
        return;
      }

      const item = await this.dictionaryService.createIngredient(dto);

      res.status(201).json({
        success: true,
        data: item,
        message: 'Ingredient created successfully',
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to create ingredient', error);
    }
  }

  /**
   * PUT /api/v1/cosmetics/dictionary/ingredients/:id
   */
  async updateIngredient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto = this.parseUpdateDTO(req);

      const item = await this.dictionaryService.updateIngredient(id, dto);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Ingredient not found',
        });
        return;
      }

      res.json({
        success: true,
        data: item,
        message: 'Ingredient updated successfully',
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to update ingredient', error);
    }
  }

  /**
   * DELETE /api/v1/cosmetics/dictionary/ingredients/:id
   */
  async deleteIngredient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.dictionaryService.deleteIngredient(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Ingredient not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Ingredient deleted successfully',
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to delete ingredient', error);
    }
  }

  // ====== Categories ======

  /**
   * GET /api/v1/cosmetics/dictionary/categories
   */
  async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const options = this.parseListOptions(req);
      const result = await this.dictionaryService.listCategories(options);

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to list categories', error);
    }
  }

  /**
   * GET /api/v1/cosmetics/dictionary/categories/:id
   */
  async getCategoryById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item = await this.dictionaryService.getCategoryById(id);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Category not found',
        });
        return;
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to fetch category', error);
    }
  }

  /**
   * POST /api/v1/cosmetics/dictionary/categories
   */
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const dto = this.parseCreateDTO(req);

      if (!dto.name || dto.name.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Name is required',
        });
        return;
      }

      const item = await this.dictionaryService.createCategory(dto);

      res.status(201).json({
        success: true,
        data: item,
        message: 'Category created successfully',
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to create category', error);
    }
  }

  /**
   * PUT /api/v1/cosmetics/dictionary/categories/:id
   */
  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto = this.parseUpdateDTO(req);

      const item = await this.dictionaryService.updateCategory(id, dto);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Category not found',
        });
        return;
      }

      res.json({
        success: true,
        data: item,
        message: 'Category updated successfully',
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to update category', error);
    }
  }

  /**
   * DELETE /api/v1/cosmetics/dictionary/categories/:id
   */
  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.dictionaryService.deleteCategory(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Category not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error: any) {
      this.handleError(res, 'Failed to delete category', error);
    }
  }

  // ====== Helper Methods ======

  private parseListOptions(req: Request): DictionaryListOptions {
    return {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      search: req.query.search as string,
      tags: req.query.tags
        ? (req.query.tags as string).split(',').map(t => t.trim())
        : undefined,
      sort: (req.query.sort as 'alphabetical' | 'newest' | 'displayOrder') || 'alphabetical',
    };
  }

  private parseCreateDTO(req: Request): CreateDictionaryItemDTO {
    return {
      name: req.body.name,
      description: req.body.description,
      metadata: req.body.metadata,
    };
  }

  private parseUpdateDTO(req: Request): UpdateDictionaryItemDTO {
    return {
      name: req.body.name,
      description: req.body.description,
      metadata: req.body.metadata,
    };
  }

  private handleError(res: Response, message: string, error: any): void {
    console.error(message, error);
    res.status(500).json({
      success: false,
      message,
      error: error.message,
    });
  }
}
