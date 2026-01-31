/**
 * NeturePartnerDashboardItem Entity
 * 파트너가 선택한 제품 (대시보드 적재)
 *
 * WO-PARTNER-DASHBOARD-PHASE1-V1
 * Phase 1: Product-based items only
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export type PartnerDashboardItemStatus = 'active' | 'inactive';

@Entity('neture_partner_dashboard_items')
@Unique(['partnerUserId', 'productId'])
@Index(['partnerUserId'])
export class NeturePartnerDashboardItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'partner_user_id' })
  partnerUserId!: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId!: string;

  @Column({ type: 'varchar', length: 50, name: 'service_id', default: 'glycopharm' })
  serviceId!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: PartnerDashboardItemStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
