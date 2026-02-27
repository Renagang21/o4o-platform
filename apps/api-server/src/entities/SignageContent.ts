import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { User } from './User.js';

export enum ContentType {
  YOUTUBE = 'youtube',
  VIMEO = 'vimeo'
}

export enum ContentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  INACTIVE = 'inactive'
}

@Entity('signage_contents')
export class SignageContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ContentType
  })
  type!: ContentType;

  @Column({ type: 'varchar' })
  url!: string;

  @Column({ type: 'varchar', nullable: true })
  videoId?: string; // YouTube/Vimeo video ID extracted from URL

  @Column({ type: 'varchar', nullable: true })
  thumbnailUrl?: string;

  @Column({ type: 'int', nullable: true })
  duration?: number; // Duration in seconds

  @Column({
    type: 'enum',
    enum: ContentStatus,
    default: ContentStatus.PENDING
  })
  status!: ContentStatus;

  @Column({ type: 'json', nullable: true })
  tags?: string[];

  @Column({ type: 'boolean', default: false })
  isPublic!: boolean; // Whether visible to all stores

  @Column({ type: 'varchar' })
  createdBy!: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'createdBy' })
  creator!: User;

  @Column({ type: 'varchar', nullable: true })
  approvedBy?: string;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'approvedBy' })
  approver?: User;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  rejectedReason?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Business logic methods
  canBeApprovedBy(user: User): boolean {
    return user.roles?.includes('admin') ?? false;
  }

  isApproved(): boolean {
    return this.status === ContentStatus.APPROVED;
  }

  isAvailableForStores(): boolean {
    return this.status === ContentStatus.APPROVED && this.isPublic;
  }
}