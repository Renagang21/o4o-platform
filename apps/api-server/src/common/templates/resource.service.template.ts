/**
 * TEMPLATE: Resource Service
 *
 * Copy this file and replace:
 * - RESOURCE_NAME (e.g., Product, User, Order)
 * - RESOURCE_LOWER (e.g., product, user, order)
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { RESOURCE_NAME } from '../entities/RESOURCE_NAME.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../../common/middleware/error-handler.middleware.js';

class RESOURCE_NAMEService extends BaseService<RESOURCE_NAME> {
  constructor() {
    super(AppDataSource.getRepository(RESOURCE_NAME));
  }

  /**
   * Find RESOURCE_NAME by custom field
   * Example: findByEmail, findBySlug, etc.
   */
  async findByCustomField(value: string): Promise<RESOURCE_NAME | null> {
    return this.repository.findOne({
      where: { customField: value },
    });
  }

  /**
   * Create RESOURCE_NAME with validation
   */
  async createWithValidation(
    data: Partial<RESOURCE_NAME>
  ): Promise<RESOURCE_NAME> {
    // Example: Check for duplicates
    // const existing = await this.findByCustomField(data.customField);
    // if (existing) {
    //   throw new ConflictError('RESOURCE_NAME already exists');
    // }

    // Example: Business logic
    // const processed = {
    //   ...data,
    //   status: 'active',
    //   createdAt: new Date(),
    // };

    return this.create(data);
  }

  /**
   * Update RESOURCE_NAME with validation
   */
  async updateWithValidation(
    id: string,
    data: Partial<RESOURCE_NAME>
  ): Promise<RESOURCE_NAME> {
    const RESOURCE_LOWER = await this.findById(id);

    if (!RESOURCE_LOWER) {
      throw new NotFoundError('RESOURCE_NAME');
    }

    // Example: Business validation
    // if (data.status === 'deleted' && RESOURCE_LOWER.hasActiveOrders) {
    //   throw new BadRequestError('Cannot delete RESOURCE_NAME with active orders');
    // }

    const updated = await this.update(id, data);

    if (!updated) {
      throw new NotFoundError('RESOURCE_NAME');
    }

    return updated;
  }

  /**
   * Soft delete RESOURCE_NAME
   */
  async softDelete(id: string): Promise<boolean> {
    const RESOURCE_LOWER = await this.findById(id);

    if (!RESOURCE_LOWER) {
      throw new NotFoundError('RESOURCE_NAME');
    }

    // Example: Business rule validation
    // if (RESOURCE_LOWER.status === 'processing') {
    //   throw new BadRequestError('Cannot delete RESOURCE_NAME while processing');
    // }

    // Update instead of hard delete
    await this.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
    } as any);

    return true;
  }

  /**
   * Custom query example
   */
  async findWithRelations(id: string): Promise<RESOURCE_NAME | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['relatedEntity1', 'relatedEntity2'],
    });
  }

  /**
   * Search with filters
   */
  async search(
    query: string,
    filters: any,
    page: number = 1,
    limit: number = 20
  ) {
    const queryBuilder = this.repository.createQueryBuilder('RESOURCE_LOWER');

    // Add search conditions
    if (query) {
      queryBuilder.where(
        'RESOURCE_LOWER.name LIKE :query OR RESOURCE_LOWER.description LIKE :query',
        { query: `%${query}%` }
      );
    }

    // Add filters
    if (filters.status) {
      queryBuilder.andWhere('RESOURCE_LOWER.status = :status', {
        status: filters.status,
      });
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

// Export singleton instance
export const RESOURCE_LOWERService = new RESOURCE_NAMEService();
