/**
 * PhysicalStoreLink Entity
 *
 * WO-O4O-CROSS-SERVICE-STORE-LINKING-V1
 *
 * Maps a PhysicalStore to a service-specific store.
 * UNIQUE(serviceType, serviceStoreId) — one service store belongs to one physical store.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import type { PhysicalStore } from './physical-store.entity.js';

@Entity({ name: 'physical_store_links' })
@Unique(['serviceType', 'serviceStoreId'])
export class PhysicalStoreLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'physical_store_id', type: 'uuid' })
  @Index()
  physicalStoreId!: string;

  @Column({ name: 'service_type', type: 'varchar', length: 20 })
  serviceType!: string;

  @Column({ name: 'service_store_id', type: 'uuid' })
  serviceStoreId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne('PhysicalStore', 'links')
  @JoinColumn({ name: 'physical_store_id' })
  physicalStore?: PhysicalStore;
}
