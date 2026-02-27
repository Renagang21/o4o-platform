import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { User } from './User.js';

export enum StoreStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  address?: {
    street: string;
    city: string;
    state: string;
    zipcode: string;
    country: string;
  };

  @Column({ type: 'varchar', nullable: true })
  phone?: string;

  @Column({ type: 'varchar', nullable: true })
  businessHours?: string; // JSON string or simple text

  @Column({
    type: 'enum',
    enum: StoreStatus,
    default: StoreStatus.ACTIVE
  })
  status!: StoreStatus;

  @Column({ type: 'json', nullable: true })
  displaySettings?: {
    resolution: string;
    orientation: 'landscape' | 'portrait';
    defaultTemplate: string;
  };

  @Column({ type: 'varchar' })
  managerId!: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'managerId' })
  manager!: User;

  // Note: OneToMany relationships removed to prevent circular dependency
  // Use StorePlaylistRepository.find({ where: { storeId: store.id } }) to get playlists
  // Use SignageScheduleRepository.find({ where: { storeId: store.id } }) to get schedules

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Business logic methods
  isActive(): boolean {
    return this.status === StoreStatus.ACTIVE;
  }

  canBeAccessedBy(user: User): boolean {
    return (user.roles?.includes('admin') ?? false) || this.managerId === user.id;
  }
}