/**
 * PharmacyCategory Entity
 *
 * WO-SIGNAGE-PHASE3-DEV-PHARMACY
 *
 * OTC/건강기능식품 카테고리 관리
 * Schema: signage_pharmacy
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'pharmacy_categories', schema: 'signage_pharmacy' })
@Index(['organizationId'])
@Index(['code'], { unique: true })
@Index(['parentId'])
export class PharmacyCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * Category code
   * Examples: 'otc_cold', 'otc_allergy', 'supplement_vitamin', 'skincare_basic'
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'uuid', nullable: true })
  parentId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  iconUrl!: string | null;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
