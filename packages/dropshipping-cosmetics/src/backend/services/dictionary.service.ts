/**
 * Dictionary Service
 *
 * Handles CRUD operations for cosmetics dictionary entities
 * (Skin Types, Concerns, Ingredients, Categories)
 */

import { DataSource, Repository, ObjectLiteral } from 'typeorm';
import {
  CosmeticsSkinType,
  CosmeticsConcern,
  CosmeticsIngredient,
  CosmeticsCategory,
} from '../entities/index.js';

// ====== DTOs ======

export interface CreateDictionaryItemDTO {
  name: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UpdateDictionaryItemDTO {
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface DictionaryListOptions {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  sort?: 'alphabetical' | 'newest' | 'displayOrder';
}

// ====== Service ======

export class DictionaryService {
  private skinTypeRepo: Repository<CosmeticsSkinType>;
  private concernRepo: Repository<CosmeticsConcern>;
  private ingredientRepo: Repository<CosmeticsIngredient>;
  private categoryRepo: Repository<CosmeticsCategory>;

  constructor(private dataSource: DataSource) {
    this.skinTypeRepo = dataSource.getRepository(CosmeticsSkinType);
    this.concernRepo = dataSource.getRepository(CosmeticsConcern);
    this.ingredientRepo = dataSource.getRepository(CosmeticsIngredient);
    this.categoryRepo = dataSource.getRepository(CosmeticsCategory);
  }

  // ====== Skin Types ======

  async listSkinTypes(options: DictionaryListOptions = {}) {
    return this.listItems(this.skinTypeRepo, 'skinType', options);
  }

  async getSkinTypeById(id: string): Promise<CosmeticsSkinType | null> {
    return await this.skinTypeRepo.findOne({ where: { id } });
  }

  async createSkinType(dto: CreateDictionaryItemDTO): Promise<CosmeticsSkinType> {
    return this.createItem(this.skinTypeRepo, dto);
  }

  async updateSkinType(id: string, dto: UpdateDictionaryItemDTO): Promise<CosmeticsSkinType | null> {
    return this.updateItem(this.skinTypeRepo, id, dto);
  }

  async deleteSkinType(id: string): Promise<boolean> {
    return this.deleteItem(this.skinTypeRepo, id);
  }

  // ====== Concerns ======

  async listConcerns(options: DictionaryListOptions = {}) {
    return this.listItems(this.concernRepo, 'concern', options);
  }

  async getConcernById(id: string): Promise<CosmeticsConcern | null> {
    return await this.concernRepo.findOne({ where: { id } });
  }

  async createConcern(dto: CreateDictionaryItemDTO): Promise<CosmeticsConcern> {
    return this.createItem(this.concernRepo, dto);
  }

  async updateConcern(id: string, dto: UpdateDictionaryItemDTO): Promise<CosmeticsConcern | null> {
    return this.updateItem(this.concernRepo, id, dto);
  }

  async deleteConcern(id: string): Promise<boolean> {
    return this.deleteItem(this.concernRepo, id);
  }

  // ====== Ingredients ======

  async listIngredients(options: DictionaryListOptions = {}) {
    return this.listItems(this.ingredientRepo, 'ingredient', options);
  }

  async getIngredientById(id: string): Promise<CosmeticsIngredient | null> {
    return await this.ingredientRepo.findOne({ where: { id } });
  }

  async createIngredient(dto: CreateDictionaryItemDTO): Promise<CosmeticsIngredient> {
    return this.createItem(this.ingredientRepo, dto);
  }

  async updateIngredient(id: string, dto: UpdateDictionaryItemDTO): Promise<CosmeticsIngredient | null> {
    return this.updateItem(this.ingredientRepo, id, dto);
  }

  async deleteIngredient(id: string): Promise<boolean> {
    return this.deleteItem(this.ingredientRepo, id);
  }

  // ====== Categories ======

  async listCategories(options: DictionaryListOptions = {}) {
    return this.listItems(this.categoryRepo, 'category', options);
  }

  async getCategoryById(id: string): Promise<CosmeticsCategory | null> {
    return await this.categoryRepo.findOne({ where: { id } });
  }

  async createCategory(dto: CreateDictionaryItemDTO): Promise<CosmeticsCategory> {
    return this.createItem(this.categoryRepo, dto);
  }

  async updateCategory(id: string, dto: UpdateDictionaryItemDTO): Promise<CosmeticsCategory | null> {
    return this.updateItem(this.categoryRepo, id, dto);
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.deleteItem(this.categoryRepo, id);
  }

  // ====== Generic Helper Methods ======

  private async listItems<T extends { id: string; name: string; metadata: any; createdAt: Date }>(
    repository: Repository<T>,
    alias: string,
    options: DictionaryListOptions = {}
  ): Promise<{
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = repository.createQueryBuilder(alias);

    // Apply search filter
    if (options.search) {
      queryBuilder.where(
        `LOWER(${alias}.name) LIKE LOWER(:search) OR LOWER(${alias}.description) LIKE LOWER(:search)`,
        { search: `%${options.search}%` }
      );
    }

    // Apply tags filter
    if (options.tags && options.tags.length > 0) {
      queryBuilder.andWhere(`${alias}.metadata->'tags' ?| ARRAY[:...tags]`, {
        tags: options.tags,
      });
    }

    // Apply sorting
    const sort = options.sort || 'alphabetical';
    switch (sort) {
      case 'newest':
        queryBuilder.orderBy(`${alias}.createdAt`, 'DESC');
        break;
      case 'displayOrder':
        queryBuilder.orderBy(`(${alias}.metadata->>'displayOrder')::int`, 'ASC', 'NULLS LAST');
        queryBuilder.addOrderBy(`${alias}.name`, 'ASC');
        break;
      case 'alphabetical':
      default:
        queryBuilder.orderBy(`${alias}.name`, 'ASC');
        break;
    }

    // Pagination
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  private async createItem<T extends ObjectLiteral>(
    repository: Repository<T>,
    dto: CreateDictionaryItemDTO
  ): Promise<T> {
    const item = repository.create({
      name: dto.name,
      description: dto.description,
      metadata: dto.metadata || {},
    } as any);

    const saved = await repository.save(item);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  private async updateItem<T extends { id: string; name: string; description?: string; metadata: any }>(
    repository: Repository<T>,
    id: string,
    dto: UpdateDictionaryItemDTO
  ): Promise<T | null> {
    const item = await repository.findOne({ where: { id } as any });

    if (!item) {
      return null;
    }

    // Update fields
    if (dto.name !== undefined) {
      item.name = dto.name;
    }
    if (dto.description !== undefined) {
      item.description = dto.description;
    }
    if (dto.metadata !== undefined) {
      item.metadata = { ...item.metadata, ...dto.metadata };
    }

    return await repository.save(item);
  }

  private async deleteItem<T extends ObjectLiteral>(repository: Repository<T>, id: string): Promise<boolean> {
    const result = await repository.delete({ id } as any);
    return (result.affected || 0) > 0;
  }

  // ====== Validation Helper ======

  /**
   * Validate that all provided IDs exist in their respective dictionaries
   */
  async validateMetadata(metadata: {
    skinTypes?: string[];
    concerns?: string[];
    ingredients?: string[];
    categories?: string[];
  }): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Validate skin types
    if (metadata.skinTypes && metadata.skinTypes.length > 0) {
      for (const name of metadata.skinTypes) {
        const exists = await this.skinTypeRepo.findOne({ where: { name } as any });
        if (!exists) {
          errors.push(`Skin type "${name}" does not exist in dictionary`);
        }
      }
    }

    // Validate concerns
    if (metadata.concerns && metadata.concerns.length > 0) {
      for (const name of metadata.concerns) {
        const exists = await this.concernRepo.findOne({ where: { name } as any });
        if (!exists) {
          errors.push(`Concern "${name}" does not exist in dictionary`);
        }
      }
    }

    // Validate ingredients
    if (metadata.ingredients && metadata.ingredients.length > 0) {
      for (const name of metadata.ingredients) {
        const exists = await this.ingredientRepo.findOne({ where: { name } as any });
        if (!exists) {
          errors.push(`Ingredient "${name}" does not exist in dictionary`);
        }
      }
    }

    // Validate categories
    if (metadata.categories && metadata.categories.length > 0) {
      for (const name of metadata.categories) {
        const exists = await this.categoryRepo.findOne({ where: { name } as any });
        if (!exists) {
          errors.push(`Category "${name}" does not exist in dictionary`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
