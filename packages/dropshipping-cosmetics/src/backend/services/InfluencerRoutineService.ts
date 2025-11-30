import { DataSource } from 'typeorm';

export interface InfluencerRoutineFilters {
  skinType?: string[];
  concerns?: string[];
  timeOfUse?: string;
  tags?: string[];
  partnerId?: string;
  isPublished?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RoutineStep {
  step: number;
  productId: string;
  category: string;
  description?: string;
}

export interface CreateRoutineData {
  partnerId: string;
  title: string;
  description?: string;
  skinType: string[];
  concerns: string[];
  timeOfUse: 'morning' | 'evening' | 'both';
  routine: RoutineStep[];
  tags?: string[];
  isPublished?: boolean;
}

export interface UpdateRoutineData {
  title?: string;
  description?: string;
  skinType?: string[];
  concerns?: string[];
  timeOfUse?: 'morning' | 'evening' | 'both';
  routine?: RoutineStep[];
  tags?: string[];
  isPublished?: boolean;
}

/**
 * Service for managing influencer-created routines
 */
export class InfluencerRoutineService {
  constructor(private dataSource: DataSource) {}

  /**
   * Create a new influencer routine
   */
  async createRoutine(data: CreateRoutineData): Promise<any> {
    const routineRepo = this.dataSource.getRepository('cosmetics_influencer_routine');

    const routine = await routineRepo.save({
      metadata: {
        partnerId: data.partnerId,
        title: data.title,
        description: data.description || '',
        skinType: data.skinType,
        concerns: data.concerns,
        timeOfUse: data.timeOfUse,
        routine: data.routine,
        tags: data.tags || [],
        isPublished: data.isPublished !== undefined ? data.isPublished : false,
        viewCount: 0,
        recommendCount: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return routine;
  }

  /**
   * Get a single routine by ID
   */
  async getRoutine(id: string): Promise<any> {
    const routineRepo = this.dataSource.getRepository('cosmetics_influencer_routine');

    const routine = await routineRepo.findOne({
      where: { id },
    });

    if (!routine) {
      throw new Error('Routine not found');
    }

    // Increment view count
    if (routine.metadata) {
      routine.metadata.viewCount = (routine.metadata.viewCount || 0) + 1;
      await routineRepo.save(routine);
    }

    return routine;
  }

  /**
   * List routines with filters
   */
  async listRoutines(filters: InfluencerRoutineFilters): Promise<any[]> {
    const routineRepo = this.dataSource.getRepository('cosmetics_influencer_routine');
    const queryBuilder = routineRepo.createQueryBuilder('routine');

    // Filter by published status (default: only published)
    if (filters.isPublished !== false) {
      queryBuilder.andWhere("routine.metadata->>'isPublished' = :isPublished", {
        isPublished: 'true',
      });
    }

    // Filter by partnerId
    if (filters.partnerId) {
      queryBuilder.andWhere("routine.metadata->>'partnerId' = :partnerId", {
        partnerId: filters.partnerId,
      });
    }

    // Filter by skin type
    if (filters.skinType && filters.skinType.length > 0) {
      queryBuilder.andWhere("routine.metadata->'skinType' ?| :skinTypes", {
        skinTypes: filters.skinType,
      });
    }

    // Filter by concerns
    if (filters.concerns && filters.concerns.length > 0) {
      queryBuilder.andWhere("routine.metadata->'concerns' ?| :concerns", {
        concerns: filters.concerns,
      });
    }

    // Filter by time of use
    if (filters.timeOfUse) {
      queryBuilder.andWhere("routine.metadata->>'timeOfUse' = :timeOfUse", {
        timeOfUse: filters.timeOfUse,
      });
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere("routine.metadata->'tags' ?| :tags", {
        tags: filters.tags,
      });
    }

    // Search by title or description
    if (filters.search) {
      queryBuilder.andWhere(
        "(routine.metadata->>'title' ILIKE :search OR routine.metadata->>'description' ILIKE :search)",
        { search: `%${filters.search}%` }
      );
    }

    // Sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    if (sortBy === 'viewCount' || sortBy === 'recommendCount') {
      queryBuilder.orderBy(`routine.metadata->>'${sortBy}'`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy(`routine.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const routines = await queryBuilder.getMany();
    return routines;
  }

  /**
   * Get routine count with filters
   */
  async getRoutineCount(filters: InfluencerRoutineFilters): Promise<number> {
    const routineRepo = this.dataSource.getRepository('cosmetics_influencer_routine');
    const queryBuilder = routineRepo.createQueryBuilder('routine');

    // Apply same filters as listRoutines
    if (filters.isPublished !== false) {
      queryBuilder.andWhere("routine.metadata->>'isPublished' = :isPublished", {
        isPublished: 'true',
      });
    }

    if (filters.partnerId) {
      queryBuilder.andWhere("routine.metadata->>'partnerId' = :partnerId", {
        partnerId: filters.partnerId,
      });
    }

    if (filters.skinType && filters.skinType.length > 0) {
      queryBuilder.andWhere("routine.metadata->'skinType' ?| :skinTypes", {
        skinTypes: filters.skinType,
      });
    }

    if (filters.concerns && filters.concerns.length > 0) {
      queryBuilder.andWhere("routine.metadata->'concerns' ?| :concerns", {
        concerns: filters.concerns,
      });
    }

    if (filters.timeOfUse) {
      queryBuilder.andWhere("routine.metadata->>'timeOfUse' = :timeOfUse", {
        timeOfUse: filters.timeOfUse,
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere("routine.metadata->'tags' ?| :tags", {
        tags: filters.tags,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        "(routine.metadata->>'title' ILIKE :search OR routine.metadata->>'description' ILIKE :search)",
        { search: `%${filters.search}%` }
      );
    }

    return queryBuilder.getCount();
  }

  /**
   * Update a routine
   */
  async updateRoutine(id: string, data: UpdateRoutineData): Promise<any> {
    const routineRepo = this.dataSource.getRepository('cosmetics_influencer_routine');

    const routine = await routineRepo.findOne({ where: { id } });
    if (!routine) {
      throw new Error('Routine not found');
    }

    // Update metadata
    routine.metadata = {
      ...routine.metadata,
      ...data,
    };
    routine.updatedAt = new Date();

    await routineRepo.save(routine);
    return routine;
  }

  /**
   * Delete a routine
   */
  async deleteRoutine(id: string): Promise<void> {
    const routineRepo = this.dataSource.getRepository('cosmetics_influencer_routine');

    const result = await routineRepo.delete(id);
    if (result.affected === 0) {
      throw new Error('Routine not found');
    }
  }

  /**
   * Increment recommend count
   */
  async incrementRecommendCount(id: string): Promise<void> {
    const routineRepo = this.dataSource.getRepository('cosmetics_influencer_routine');

    const routine = await routineRepo.findOne({ where: { id } });
    if (!routine) {
      throw new Error('Routine not found');
    }

    routine.metadata.recommendCount = (routine.metadata.recommendCount || 0) + 1;
    await routineRepo.save(routine);
  }
}
