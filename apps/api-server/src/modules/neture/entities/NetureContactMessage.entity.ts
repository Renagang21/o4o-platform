/**
 * NetureContactMessage Entity
 *
 * WO-O4O-NETURE-CONTACT-PAGE-V1
 *
 * Neture service contact form submissions.
 * Types: supplier | partner | service | other
 * Status: new → in_progress → resolved
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ContactType = 'supplier' | 'partner' | 'service' | 'other';
export type ContactMessageStatus = 'new' | 'in_progress' | 'resolved';

@Entity('neture_contact_messages')
@Index(['contactType', 'status'])
@Index(['status', 'createdAt'])
@Index(['email'])
export class NetureContactMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, default: 'other' })
  contactType!: ContactType;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 500 })
  subject!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 20, default: 'new' })
  status!: ContactMessageStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'text', nullable: true })
  adminNotes!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;
}
