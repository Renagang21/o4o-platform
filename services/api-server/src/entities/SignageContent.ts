import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

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

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ContentType
  })
  type!: ContentType;

  @Column()
  url!: string;

  @Column({ nullable: true })
  videoId?: string; // YouTube/Vimeo video ID extracted from URL

  @Column({ nullable: true })
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

  @Column({ default: false })
  isPublic!: boolean; // Whether visible to all stores

  @Column()
  createdBy!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator!: User;

  @Column({ nullable: true })
  approvedBy?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedBy' })
  approver?: User;

  @Column({ nullable: true })
  approvedAt?: Date;

  @Column({ nullable: true })
  rejectedReason?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Business logic methods
  canBeApprovedBy(user: User): boolean {
    return user.role === 'admin';
  }

  isApproved(): boolean {
    return this.status === ContentStatus.APPROVED;
  }

  isAvailableForStores(): boolean {
    return this.status === ContentStatus.APPROVED && this.isPublic;
  }
}