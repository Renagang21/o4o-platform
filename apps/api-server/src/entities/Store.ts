import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User.js';

export enum StoreStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  address?: {
    street: string;
    city: string;
    state: string;
    zipcode: string;
    country: string;
  };

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
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

  @Column()
  managerId!: string;

  @ManyToOne(() => User)
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
    return user.role === 'admin' || this.managerId === user.id;
  }
}