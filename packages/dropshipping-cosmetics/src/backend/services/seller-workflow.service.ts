/**
 * Seller Workflow Service
 *
 * Handles seller workflow sessions for in-store consultations
 * Integrates with recommendation engine and routine services
 */

import { DataSource, Repository } from 'typeorm';
import {
  CosmeticsSellerWorkflowSession,
  CustomerProfile,
  RecommendedProduct,
  RecommendedRoutine,
} from '../entities/seller-workflow-session.entity.js';
import { RecommendationEngineService } from './recommendation-engine.service.js';

// ====== DTOs ======

export interface StartSessionDTO {
  sellerId: string;
  customerProfile: CustomerProfile;
  metadata?: {
    customerName?: string;
    notes?: string;
  };
}

export interface UpdateSessionDTO {
  customerProfile?: CustomerProfile;
  recommendedProducts?: RecommendedProduct[];
  recommendedRoutines?: RecommendedRoutine[];
  metadata?: Record<string, any>;
}

// ====== Service ======

export class SellerWorkflowService {
  private sessionRepo: Repository<CosmeticsSellerWorkflowSession>;
  private recommendationEngine: RecommendationEngineService;

  constructor(private dataSource: DataSource) {
    this.sessionRepo = dataSource.getRepository(CosmeticsSellerWorkflowSession);
    this.recommendationEngine = new RecommendationEngineService(dataSource);
  }

  /**
   * Start a new seller workflow session
   * Automatically generates product recommendations based on customer profile
   */
  async startSession(dto: StartSessionDTO): Promise<CosmeticsSellerWorkflowSession> {
    try {
      // Generate product recommendations using recommendation engine
      const recommendedProducts = await this.generateProductRecommendations(dto.customerProfile);

      // Generate routine recommendations (optional)
      const recommendedRoutines = await this.generateRoutineRecommendations(dto.customerProfile);

      // Create session
      const session = this.sessionRepo.create({
        sellerId: dto.sellerId,
        customerProfile: dto.customerProfile,
        recommendedProducts,
        recommendedRoutines,
        metadata: {
          ...dto.metadata,
          status: 'started',
        },
      });

      return await this.sessionRepo.save(session);
    } catch (error) {
      console.error('Error starting seller workflow session:', error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<CosmeticsSellerWorkflowSession | null> {
    return await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
  }

  /**
   * List sessions for a specific seller
   */
  async listSessionsBySeller(
    sellerId: string,
    options?: {
      status?: string;
      limit?: number;
    }
  ): Promise<CosmeticsSellerWorkflowSession[]> {
    const queryBuilder = this.sessionRepo.createQueryBuilder('session');

    queryBuilder.where('session.sellerId = :sellerId', { sellerId });

    // Filter by status if provided
    if (options?.status) {
      queryBuilder.andWhere("session.metadata->>'status' = :status", {
        status: options.status,
      });
    }

    // Order by most recent first
    queryBuilder.orderBy('session.createdAt', 'DESC');

    // Limit results
    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    return await queryBuilder.getMany();
  }

  /**
   * Update session
   */
  async updateSession(
    sessionId: string,
    dto: UpdateSessionDTO
  ): Promise<CosmeticsSellerWorkflowSession | null> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      return null;
    }

    // Update customer profile if provided
    if (dto.customerProfile) {
      session.customerProfile = { ...session.customerProfile, ...dto.customerProfile };

      // Regenerate recommendations if profile changed
      const newProducts = await this.generateProductRecommendations(session.customerProfile);
      const newRoutines = await this.generateRoutineRecommendations(session.customerProfile);

      session.recommendedProducts = newProducts;
      session.recommendedRoutines = newRoutines;
    }

    // Update recommended products if provided
    if (dto.recommendedProducts) {
      session.recommendedProducts = dto.recommendedProducts;
    }

    // Update recommended routines if provided
    if (dto.recommendedRoutines) {
      session.recommendedRoutines = dto.recommendedRoutines;
    }

    // Update metadata if provided
    if (dto.metadata) {
      session.metadata = { ...session.metadata, ...dto.metadata };
    }

    return await this.sessionRepo.save(session);
  }

  /**
   * Complete session (mark as completed)
   */
  async completeSession(
    sessionId: string,
    purchasedProducts?: string[]
  ): Promise<CosmeticsSellerWorkflowSession | null> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      return null;
    }

    session.metadata = {
      ...session.metadata,
      status: 'completed',
      purchasedProducts: purchasedProducts || [],
    };

    return await this.sessionRepo.save(session);
  }

  // ====== Helper Methods ======

  /**
   * Generate product recommendations based on customer profile
   */
  private async generateProductRecommendations(
    profile: CustomerProfile
  ): Promise<RecommendedProduct[]> {
    try {
      // Use recommendation engine
      const recommendations = await this.recommendationEngine.recommendProducts({
        skinTypes: profile.skinTypes,
        concerns: profile.concerns,
        preferences: profile.preferences,
        limit: 10,
      });

      // Convert to RecommendedProduct format
      return recommendations.map((rec) => ({
        productId: rec.productId,
        score: rec.score,
        reason: rec.reason,
      }));
    } catch (error) {
      console.error('Error generating product recommendations:', error);
      return [];
    }
  }

  /**
   * Generate routine recommendations based on customer profile
   */
  private async generateRoutineRecommendations(
    profile: CustomerProfile
  ): Promise<RecommendedRoutine[]> {
    try {
      // Query routines that match customer profile
      const query = `
        SELECT id, metadata
        FROM cosmetics_routines
        WHERE "isPublished" = true
      `;

      const routines = await this.dataSource.query(query);

      // Simple matching: routines that match concerns or skin types
      const matched = routines
        .filter((routine: any) => {
          const metadata = routine.metadata || {};
          const routineConcerns = metadata.concerns || [];
          const routineSkinTypes = metadata.skinTypes || [];

          const concernMatch = profile.concerns?.some((c) => routineConcerns.includes(c));
          const skinTypeMatch = profile.skinTypes?.some((s) => routineSkinTypes.includes(s));

          return concernMatch || skinTypeMatch;
        })
        .slice(0, 5)
        .map((routine: any) => ({
          routineId: routine.id,
          matchScore: 0.8, // simplified scoring
        }));

      return matched;
    } catch (error) {
      console.error('Error generating routine recommendations:', error);
      return [];
    }
  }

  /**
   * Get session statistics for a seller
   */
  async getSellerStats(sellerId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    averageProductsRecommended: number;
  }> {
    try {
      const sessions = await this.listSessionsBySeller(sellerId);

      const completedSessions = sessions.filter(
        (s) => s.metadata.status === 'completed'
      ).length;

      const totalProducts = sessions.reduce(
        (sum, s) => sum + s.recommendedProducts.length,
        0
      );

      const averageProductsRecommended =
        sessions.length > 0 ? totalProducts / sessions.length : 0;

      return {
        totalSessions: sessions.length,
        completedSessions,
        averageProductsRecommended: Math.round(averageProductsRecommended * 10) / 10,
      };
    } catch (error) {
      console.error('Error getting seller stats:', error);
      return {
        totalSessions: 0,
        completedSessions: 0,
        averageProductsRecommended: 0,
      };
    }
  }
}
