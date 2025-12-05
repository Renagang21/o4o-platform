/**
 * Influencer Routine Service
 *
 * Manages influencer beauty routines
 */

import type {
  InfluencerRoutine,
  CreateRoutineDto,
  UpdateRoutineDto,
  RoutineStep,
} from '../../types.js';

export class InfluencerRoutineService {
  private routines: Map<string, InfluencerRoutine> = new Map();

  /**
   * Create a new influencer routine
   */
  async createRoutine(data: CreateRoutineDto): Promise<InfluencerRoutine> {
    const id = this.generateId();
    const now = new Date();

    const routine: InfluencerRoutine = {
      id,
      ...data,
      isPublished: false,
      viewCount: 0,
      recommendCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.routines.set(id, routine);
    return routine;
  }

  /**
   * Get routine by ID
   */
  async getRoutineById(id: string): Promise<InfluencerRoutine | null> {
    return this.routines.get(id) || null;
  }

  /**
   * Get routines by partner ID
   */
  async getRoutinesByPartnerId(partnerId: string): Promise<InfluencerRoutine[]> {
    return Array.from(this.routines.values()).filter(
      (routine) => routine.partnerId === partnerId
    );
  }

  /**
   * Get all published routines
   */
  async getPublishedRoutines(filters?: {
    skinType?: string[];
    concerns?: string[];
    timeOfUse?: 'morning' | 'evening' | 'both';
    tags?: string[];
  }): Promise<InfluencerRoutine[]> {
    let routines = Array.from(this.routines.values()).filter(
      (routine) => routine.isPublished
    );

    if (filters) {
      // Filter by skin type
      if (filters.skinType && filters.skinType.length > 0) {
        routines = routines.filter((routine) =>
          filters.skinType!.some((type) => routine.skinType.includes(type))
        );
      }

      // Filter by concerns
      if (filters.concerns && filters.concerns.length > 0) {
        routines = routines.filter((routine) =>
          filters.concerns!.some((concern) => routine.concerns.includes(concern))
        );
      }

      // Filter by time of use
      if (filters.timeOfUse) {
        routines = routines.filter(
          (routine) =>
            routine.timeOfUse === filters.timeOfUse ||
            routine.timeOfUse === 'both'
        );
      }

      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        routines = routines.filter((routine) =>
          filters.tags!.some((tag) => routine.tags?.includes(tag))
        );
      }
    }

    // Sort by view count and recommend count
    routines.sort((a, b) => {
      const scoreA = a.viewCount + a.recommendCount * 2;
      const scoreB = b.viewCount + b.recommendCount * 2;
      return scoreB - scoreA;
    });

    return routines;
  }

  /**
   * Update routine
   */
  async updateRoutine(
    id: string,
    updates: UpdateRoutineDto,
    userId: string,
    userRole: string
  ): Promise<InfluencerRoutine | null> {
    const routine = this.routines.get(id);
    if (!routine) {
      return null;
    }

    // Check permissions
    // Partner can only update their own routines
    // Admin can update any routine
    if (userRole !== 'admin' && routine.partnerId !== userId) {
      throw new Error('Unauthorized: You can only update your own routines');
    }

    const updated: InfluencerRoutine = {
      ...routine,
      ...updates,
      updatedAt: new Date(),
    };

    this.routines.set(id, updated);
    return updated;
  }

  /**
   * Delete routine (soft delete - just unpublish)
   */
  async deleteRoutine(
    id: string,
    userId: string,
    userRole: string
  ): Promise<boolean> {
    const routine = this.routines.get(id);
    if (!routine) {
      return false;
    }

    // Check permissions
    if (userRole !== 'admin' && routine.partnerId !== userId) {
      throw new Error('Unauthorized: You can only delete your own routines');
    }

    // Soft delete: just unpublish
    routine.isPublished = false;
    routine.updatedAt = new Date();
    this.routines.set(id, routine);

    return true;
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: string): Promise<void> {
    const routine = this.routines.get(id);
    if (routine) {
      routine.viewCount += 1;
      this.routines.set(id, routine);
    }
  }

  /**
   * Increment recommend count
   */
  async incrementRecommendCount(id: string): Promise<void> {
    const routine = this.routines.get(id);
    if (routine) {
      routine.recommendCount += 1;
      this.routines.set(id, routine);
    }
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
   * Generate unique ID
   */
  private generateId(): string {
    return `routine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default InfluencerRoutineService;
