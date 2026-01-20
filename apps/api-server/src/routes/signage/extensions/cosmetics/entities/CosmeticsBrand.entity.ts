/**
 * CosmeticsBrand Entity
 *
 * WO-SIGNAGE-PHASE3-DEV-COSMETICS
 *
 * 화장품 브랜드 관리
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

@Entity({ name: 'cosmetics_brands', schema: 'signage_cosmetics' })
@Index(['organizationId'])
@Index(['code'], { unique: true })
export class CosmeticsBrand {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * Brand code (unique identifier)
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logoUrl!: string | null;

  /**
   * Brand color scheme
   */
  @Column({ type: 'jsonb', default: {} })
  colorScheme!: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };

  /**
   * Brand category
   * Examples: 'skincare', 'makeup', 'haircare', 'fragrance', 'bodycare'
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  category!: string | null;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
