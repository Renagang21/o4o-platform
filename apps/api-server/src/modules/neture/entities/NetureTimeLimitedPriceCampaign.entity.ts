/**
 * NetureTimeLimitedPriceCampaign Entity
 *
 * WO-NETURE-TIME-LIMITED-PRICE-CAMPAIGN-V1
 * 기간 한정 가격 캠페인 — product.priceGeneral 위에 올라가는 선택적 가격 오버라이드 레이어.
 * 캠페인이 존재하면 적용, 없으면 무시 (기존 가격 흐름 불변).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import type { NetureCampaignTarget } from './NetureCampaignTarget.entity.js';

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('neture_time_limited_price_campaigns')
@Index(['supplierId'])
@Index(['status'])
@Index(['startAt', 'endAt'])
export class NetureTimeLimitedPriceCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany('NetureCampaignTarget', 'campaign')
  targets: NetureCampaignTarget[];
}
