/**
 * PartnerEvent Entity
 * 파트너가 설정하는 이벤트 조건
 *
 * WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('partner_events')
@Index(['partnerId', 'serviceId'])
@Index(['isActive'])
export class PartnerEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'partner_id' })
  partnerId!: string;

  @Column({ type: 'varchar', length: 50, name: 'service_id' })
  serviceId!: string; // 'glycopharm', 'k-cosmetics', 'glucoseview'

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate!: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate!: Date;

  @Column({ type: 'varchar', length: 100 })
  region!: string;

  @Column({ type: 'varchar', length: 100, name: 'target_scope' })
  targetScope!: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations (using string reference per CLAUDE.md ESM rules)
  @ManyToOne('User', { nullable: false })
  @JoinColumn({ name: 'partner_id' })
  partner?: any;

  // Helper method for status based on dates and isActive
  getStatus(): 'active' | 'scheduled' | 'ended' {
    if (!this.isActive) return 'ended';

    const now = new Date();
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    if (now < start) return 'scheduled';
    if (now > end) return 'ended';
    return 'active';
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      period: {
        start: this.startDate,
        end: this.endDate,
      },
      region: this.region,
      targetScope: this.targetScope,
      isActive: this.isActive,
      status: this.getStatus(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
