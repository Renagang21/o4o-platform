/**
 * CosmeticsTrendCard Entity
 *
 * WO-SIGNAGE-PHASE3-DEV-COSMETICS
 *
 * 트렌드/룩북 카드
 * Schema: signage_cosmetics
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Trend type
 */
export type CosmeticsTrendType =
  | 'color'
  | 'style'
  | 'technique'
  | 'ingredient';

@Entity({ name: 'cosmetics_trend_cards', schema: 'signage_cosmetics' })
@Index(['organizationId'])
@Index(['trendType'])
@Index(['season', 'year'])
export class CosmeticsTrendCard {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Trend type
   * Examples: 'color', 'style', 'technique', 'ingredient'
   */
  @Column({ type: 'varchar', length: 50 })
  trendType!: CosmeticsTrendType;

  /**
   * Color palette (hex codes)
   */
  @Column({ type: 'jsonb', default: [] })
  colorPalette!: string[];

  /**
   * Product references (Product IDs)
   */
  @Column({ type: 'jsonb', default: [] })
  productReferences!: string[];

  @Column({ type: 'varchar', length: 255 })
  thumbnailUrl!: string;

  @Column({ type: 'varchar', length: 50 })
  season!: string;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
