import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique
} from 'typeorm';
import { YaksaCommunity } from './YaksaCommunity.js';
import type { User } from '@o4o/types';

export enum CommunityMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member'
}

@Entity('yaksa_forum_community_member')
@Unique(['communityId', 'userId'])
@Index(['communityId', 'role'])
export class YaksaCommunityMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  communityId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: CommunityMemberRole, default: CommunityMemberRole.MEMBER })
  role!: CommunityMemberRole;

  @CreateDateColumn()
  joinedAt!: Date;

  // Relations
  @ManyToOne('YaksaCommunity', { lazy: true })
  @JoinColumn({ name: 'communityId' })
  community?: Promise<YaksaCommunity>;

  @ManyToOne('User')
  @JoinColumn({ name: 'userId' })
  user?: User;

  // Methods
  canManageCommunity(): boolean {
    return this.role === CommunityMemberRole.OWNER || this.role === CommunityMemberRole.ADMIN;
  }

  canPost(): boolean {
    // All members can post
    return true;
  }
}
