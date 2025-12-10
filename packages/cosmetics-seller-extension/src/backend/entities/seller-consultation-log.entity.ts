/**
 * SellerConsultationLog Entity
 *
 * 판매원 상담 로그
 * - Seller Workflow Session 연동
 * - 추천 제품 목록
 * - 구매 전환 결과
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ConsultationResultStatus = 'completed' | 'pending' | 'cancelled' | 'no_purchase';

export interface RecommendedProduct {
  productId: string;
  productName?: string;
  reason?: string;
  wasAccepted: boolean;
}

export interface PurchasedProduct {
  productId: string;
  productName?: string;
  quantity: number;
  price?: number;
}

@Entity('cosmetics_seller_consultation_logs')
@Index(['sellerId'])
@Index(['workflowSessionId'])
@Index(['resultStatus'])
@Index(['createdAt'])
export class SellerConsultationLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  sellerId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  workflowSessionId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerId?: string;

  @Column({ type: 'jsonb', default: [] })
  recommendedProducts!: RecommendedProduct[];

  @Column({ type: 'jsonb', default: [] })
  purchasedProducts!: PurchasedProduct[];

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  resultStatus!: ConsultationResultStatus;

  @Column({ type: 'int', nullable: true })
  consultationDurationMinutes?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  customerProfile?: {
    skinType?: string[];
    concerns?: string[];
    preferences?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
