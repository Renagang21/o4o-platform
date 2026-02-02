/**
 * PlatformService - 플랫폼 서비스 카탈로그
 *
 * 중앙 관리되는 서비스 목록.
 * admin.neture.co.kr에서 노출/추천/승인 정책 설정.
 *
 * WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

export type PlatformServiceType = 'community' | 'tool' | 'extension';
export type PlatformServiceStatus = 'active' | 'hidden';

@Entity('platform_services')
@Index(['status'])
@Index(['isFeatured', 'featuredOrder'])
export class PlatformService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'short_description', type: 'varchar', length: 500, nullable: true })
  shortDescription: string;

  @Column({ name: 'entry_url', type: 'varchar', length: 500, nullable: true })
  entryUrl: string;

  @Column({
    name: 'service_type',
    type: 'enum',
    enum: ['community', 'tool', 'extension'],
    default: 'tool',
  })
  serviceType: PlatformServiceType;

  @Column({ name: 'approval_required', type: 'boolean', default: false })
  approvalRequired: boolean;

  @Column({ name: 'visibility_policy', type: 'jsonb', default: '{}' })
  visibilityPolicy: Record<string, unknown>;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ name: 'featured_order', type: 'int', default: 0 })
  featuredOrder: number;

  @Column({
    type: 'enum',
    enum: ['active', 'hidden'],
    default: 'active',
  })
  status: PlatformServiceStatus;

  @Column({ name: 'icon_emoji', type: 'varchar', length: 10, nullable: true })
  iconEmoji: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ESM mandatory: string-based relation
  @OneToMany('UserServiceEnrollment', 'service')
  enrollments: unknown[];
}
