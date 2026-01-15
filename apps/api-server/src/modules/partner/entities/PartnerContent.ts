/**
 * PartnerContent Entity
 * 파트너가 생성하는 홍보 콘텐츠
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

export type PartnerContentType = 'text' | 'image' | 'link';

@Entity('partner_contents')
@Index(['partnerId', 'serviceId'])
@Index(['isActive'])
export class PartnerContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'partner_id' })
  partnerId!: string;

  @Column({ type: 'varchar', length: 50, name: 'service_id' })
  serviceId!: string; // 'glycopharm', 'k-cosmetics', 'glucoseview'

  @Column({
    type: 'varchar',
    length: 20,
    default: 'text',
  })
  type!: PartnerContentType;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  body?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url?: string;

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

  // Helper method for status
  getStatus(): 'active' | 'inactive' {
    return this.isActive ? 'active' : 'inactive';
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      body: this.body,
      url: this.url,
      isActive: this.isActive,
      status: this.getStatus(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
