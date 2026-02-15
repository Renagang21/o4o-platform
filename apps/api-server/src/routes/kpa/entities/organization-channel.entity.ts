/**
 * OrganizationChannel Entity
 * 약국(organization)이 소유하는 판매 채널
 *
 * WO-PHARMACY-HUB-OWNERSHIP-RESTRUCTURE-PHASE1-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

import type { KpaOrganization } from './kpa-organization.entity.js';
import type { OrganizationProductChannel } from './organization-product-channel.entity.js';

export type OrganizationChannelType = 'B2C' | 'KIOSK' | 'TABLET' | 'SIGNAGE';
export type OrganizationChannelStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'TERMINATED';

@Entity('organization_channels')
@Index('IDX_org_channel_org_id', ['organization_id'])
export class OrganizationChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'enum', enum: ['B2C', 'KIOSK', 'TABLET', 'SIGNAGE'] })
  channel_type: OrganizationChannelType;

  @Column({ type: 'enum', enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'EXPIRED', 'TERMINATED'], default: 'PENDING' })
  status: OrganizationChannelStatus;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations (string-based per CLAUDE.md Section 4)
  @ManyToOne('KpaOrganization')
  @JoinColumn({ name: 'organization_id' })
  organization?: KpaOrganization;

  @OneToMany('OrganizationProductChannel', 'channel')
  productChannels?: OrganizationProductChannel[];
}
