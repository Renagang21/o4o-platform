/**
 * PhysicalStore Entity
 *
 * WO-O4O-CROSS-SERVICE-STORE-LINKING-V1
 *
 * Represents a physical store location identified by business_number.
 * Links to service-specific stores (cosmetics, glycopharm) via PhysicalStoreLink.
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
import type { PhysicalStoreLink } from './physical-store-link.entity.js';

@Entity({ name: 'physical_stores' })
export class PhysicalStore {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_number', type: 'varchar', length: 20, unique: true })
  @Index()
  businessNumber!: string;

  @Column({ name: 'store_name', type: 'varchar', length: 255 })
  storeName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany('PhysicalStoreLink', 'physicalStore')
  links?: PhysicalStoreLink[];
}
