/**
 * Brand Entity
 *
 * 상품 브랜드 관리
 *
 * WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('brands')
@Index(['name'])
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  /** 제조사명 (브랜드 레벨) */
  @Column({ name: 'manufacturer_name', type: 'varchar', length: 255, nullable: true })
  manufacturerName: string | null;

  /** 원산지 (브랜드 레벨) */
  @Column({ name: 'country_of_origin', type: 'varchar', length: 100, nullable: true })
  countryOfOrigin: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
