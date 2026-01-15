/**
 * PartnerTarget Entity
 * 파트너에게 할당된 홍보 대상 (Read Only - 시스템/운영자가 설정)
 *
 * WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export type PartnerTargetType = 'store' | 'region';

@Entity('partner_targets')
@Index(['partnerId', 'serviceId'])
export class PartnerTarget {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'partner_id' })
  partnerId!: string;

  @Column({ type: 'varchar', length: 50, name: 'service_id' })
  serviceId!: string; // 'glycopharm', 'k-cosmetics', 'glucoseview'

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 20, default: 'store' })
  type!: PartnerTargetType;

  @Column({ type: 'varchar', length: 500, name: 'service_area' })
  serviceArea!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Relations (using string reference per CLAUDE.md ESM rules)
  @ManyToOne('User', { nullable: false })
  @JoinColumn({ name: 'partner_id' })
  partner?: any;

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      serviceArea: this.serviceArea,
      address: this.address,
      description: this.description,
    };
  }
}
