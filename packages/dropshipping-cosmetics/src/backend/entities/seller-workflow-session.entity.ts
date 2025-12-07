/**
 * CosmeticsSellerWorkflowSession Entity
 *
 * Represents a seller workflow session for in-store consultation
 * Stores customer profile, recommendations, and consultation results
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface CustomerProfile {
  skinTypes?: string[];
  concerns?: string[];
  ageGroup?: string;
  preferences?: string[];
  budget?: string;
  notes?: string;
}

export interface RecommendedProduct {
  productId: string;
  score?: number;
  reason?: string;
}

export interface RecommendedRoutine {
  routineId: string;
  matchScore?: number;
}

@Entity('cosmetics_seller_workflow_sessions')
export class CosmeticsSellerWorkflowSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  sellerId!: string;

  @Column({ type: 'jsonb', default: {} })
  customerProfile!: CustomerProfile;

  @Column({ type: 'jsonb', default: [] })
  recommendedProducts!: RecommendedProduct[];

  @Column({ type: 'jsonb', default: [] })
  recommendedRoutines!: RecommendedRoutine[];

  @Column({ type: 'jsonb', default: {} })
  metadata!: {
    customerName?: string;
    status?: 'started' | 'completed' | 'cancelled';
    totalValue?: number;
    purchasedProducts?: string[];
    notes?: string;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
