/**
 * NeturePartnerDashboardItemContent Entity
 * 파트너 대시보드 아이템 ↔ 콘텐츠 연결
 *
 * WO-PARTNER-CONTENT-LINK-PHASE1-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export type ContentSource = 'cms' | 'supplier';

@Entity('neture_partner_dashboard_item_contents')
@Unique(['dashboardItemId', 'contentId', 'contentSource'])
@Index(['dashboardItemId'])
export class NeturePartnerDashboardItemContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'dashboard_item_id' })
  dashboardItemId!: string;

  @Column({ type: 'uuid', name: 'content_id' })
  contentId!: string;

  @Column({ type: 'varchar', length: 20, name: 'content_source', default: 'cms' })
  contentSource!: ContentSource;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
