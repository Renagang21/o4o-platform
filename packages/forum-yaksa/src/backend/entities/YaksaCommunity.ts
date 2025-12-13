import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import type { User } from '@o4o/types';

export enum CommunityType {
  PERSONAL = 'personal',
  BRANCH = 'branch',
  DIVISION = 'division',
  GLOBAL = 'global'
}

@Entity('yaksa_forum_community')
@Index(['type', 'ownerUserId'])
@Index(['organizationId'])
export class YaksaCommunity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: CommunityType, default: CommunityType.PERSONAL })
  type!: CommunityType;

  @Column({ type: 'uuid', nullable: true })
  ownerUserId?: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @Column({ type: 'boolean', default: false })
  requireApproval!: boolean;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'ownerUserId' })
  owner?: User;

  @ManyToOne('Organization', { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: any; // Type will be resolved at runtime

  // Methods
  canUserManage(userId: string, userRole: string): boolean {
    if (['Super Administrator', 'Administrator'].includes(userRole)) return true;
    if (this.ownerUserId === userId) return true;
    return false;
  }

  canUserView(): boolean {
    // All authenticated users can view communities
    return true;
  }
}
