/**
 * Influencer Routine Service (DB-based)
 *
 * Phase 9-C: Core v2 정렬
 * - DTO import 정리
 *
 * Manages influencer beauty routines using TypeORM
 */

import type { Repository, DataSource } from 'typeorm';
import { CosmeticsRoutine } from '../entities/cosmetics-routine.entity.js';
import type { CreateRoutineDto, UpdateRoutineDto, RoutineStepDto } from '../dto/index.js';
import type { RoutineStep } from '../../types.js';

export class InfluencerRoutineService {
  private repository: Repository<CosmeticsRoutine>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(CosmeticsRoutine);
  }

  /**
   * Create a new influencer routine
   */
  async createRoutine(data: CreateRoutineDto): Promise<CosmeticsRoutine> {
    const routine = this.repository.create({
      partnerId: data.partnerId,
      title: data.title,
      description: data.description || null,
      steps: data.routine,
      metadata: {
        skinType: data.skinType,
        concerns: data.concerns,
        timeOfUse: data.timeOfUse,
        tags: data.tags || [],
      },
      isPublished: false,
      viewCount: 0,
      recommendCount: 0,
    });

    return await this.repository.save(routine);
  }

  /**
   * Get routine by ID
   */
  async getRoutineById(id: string): Promise<CosmeticsRoutine | null> {
    return await this.repository.findOne({ where: { id } });
  }

  /**
   * Get routines by partner ID
   */
  async getRoutinesByPartnerId(partnerId: string): Promise<CosmeticsRoutine[]> {
    return await this.repository.find({
      where: { partnerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all published routines
   */
  async getPublishedRoutines(filters?: {
    skinType?: string[];
    concerns?: string[];
    timeOfUse?: 'morning' | 'evening' | 'both';
    tags?: string[];
  }): Promise<CosmeticsRoutine[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('routine')
      .where('routine.isPublished = :isPublished', { isPublished: true });

    if (filters) {
      // Filter by skin type
      if (filters.skinType && filters.skinType.length > 0) {
        queryBuilder.andWhere(
          'routine.metadata->>\'skinType\' ?| array[:...skinTypes]',
          { skinTypes: filters.skinType }
        );
      }

      // Filter by concerns
      if (filters.concerns && filters.concerns.length > 0) {
        queryBuilder.andWhere(
          'routine.metadata->>\'concerns\' ?| array[:...concerns]',
          { concerns: filters.concerns }
        );
      }

      // Filter by time of use
      if (filters.timeOfUse) {
        queryBuilder.andWhere(
          '(routine.metadata->>\'timeOfUse\' = :timeOfUse OR routine.metadata->>\'timeOfUse\' = \'both\')',
          { timeOfUse: filters.timeOfUse }
        );
      }

      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        queryBuilder.andWhere(
          'routine.metadata->>\'tags\' ?| array[:...tags]',
          { tags: filters.tags }
        );
      }
    }

    // Sort by popularity (view count + recommend count * 2)
    queryBuilder.orderBy(
      'routine.viewCount + routine.recommendCount * 2',
      'DESC'
    );

    return await queryBuilder.getMany();
  }

  /**
   * Update routine
   */
  async updateRoutine(
    id: string,
    updates: UpdateRoutineDto,
    userId: string,
    userRole: string
  ): Promise<CosmeticsRoutine | null> {
    const routine = await this.repository.findOne({ where: { id } });
    if (!routine) {
      return null;
    }

    // Check permissions
    // Partner can only update their own routines
    // Admin can update any routine
    if (userRole !== 'admin' && routine.partnerId !== userId) {
      throw new Error('Unauthorized: You can only update your own routines');
    }

    // Update metadata if provided
    if (updates.skinType || updates.concerns || updates.timeOfUse || updates.tags) {
      routine.metadata = {
        ...routine.metadata,
        ...(updates.skinType && { skinType: updates.skinType }),
        ...(updates.concerns && { concerns: updates.concerns }),
        ...(updates.timeOfUse && { timeOfUse: updates.timeOfUse }),
        ...(updates.tags && { tags: updates.tags }),
      };
    }

    // Update other fields
    if (updates.title) routine.title = updates.title;
    if (updates.description !== undefined) routine.description = updates.description || null;
    if (updates.routine) routine.steps = updates.routine;
    if (updates.isPublished !== undefined) routine.isPublished = updates.isPublished;

    return await this.repository.save(routine);
  }

  /**
   * Delete routine (soft delete - just unpublish)
   */
  async deleteRoutine(
    id: string,
    userId: string,
    userRole: string
  ): Promise<boolean> {
    const routine = await this.repository.findOne({ where: { id } });
    if (!routine) {
      return false;
    }

    // Check permissions
    if (userRole !== 'admin' && routine.partnerId !== userId) {
      throw new Error('Unauthorized: You can only delete your own routines');
    }

    // Soft delete: just unpublish
    routine.isPublished = false;
    await this.repository.save(routine);

    return true;
  }

  /**
   * Hard delete routine (only for admin)
   */
  async hardDeleteRoutine(
    id: string,
    userRole: string
  ): Promise<boolean> {
    if (userRole !== 'admin') {
      throw new Error('Unauthorized: Only admins can hard delete routines');
    }

    const result = await this.repository.delete({ id });
    return (result.affected || 0) > 0;
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'viewCount', 1);
  }

  /**
   * Increment recommend count
   */
  async incrementRecommendCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'recommendCount', 1);
  }

  /**
   * Validate routine steps
   */
  validateRoutineSteps(steps: RoutineStep[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!steps || steps.length === 0) {
      errors.push('Routine must have at least one step');
    }

    steps.forEach((step, index) => {
      if (!step.category) {
        errors.push(`Step ${index + 1}: Category is required`);
      }

      if (!step.product) {
        errors.push(`Step ${index + 1}: Product is required`);
      }

      if (typeof step.orderInRoutine !== 'number') {
        errors.push(`Step ${index + 1}: Order in routine must be a number`);
      }
    });

    // Check for duplicate order numbers
    const orders = steps.map((s) => s.orderInRoutine);
    const duplicates = orders.filter((item, index) => orders.indexOf(item) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate order numbers found: ${duplicates.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get routine statistics
   */
  async getRoutineStatistics(partnerId?: string): Promise<{
    total: number;
    published: number;
    unpublished: number;
    totalViews: number;
    totalRecommends: number;
  }> {
    const queryBuilder = this.repository.createQueryBuilder('routine');

    if (partnerId) {
      queryBuilder.where('routine.partnerId = :partnerId', { partnerId });
    }

    const routines = await queryBuilder.getMany();

    return {
      total: routines.length,
      published: routines.filter((r) => r.isPublished).length,
      unpublished: routines.filter((r) => !r.isPublished).length,
      totalViews: routines.reduce((sum, r) => sum + r.viewCount, 0),
      totalRecommends: routines.reduce((sum, r) => sum + r.recommendCount, 0),
    };
  }
}

export default InfluencerRoutineService;
