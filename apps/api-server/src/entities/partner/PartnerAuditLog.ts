import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index
} from 'typeorm';

@Entity('partner_audit_logs')
@Index(['entityType', 'entityId'])
@Index(['userId'])
@Index(['createdAt'])
export class PartnerAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  entityType: 'commission' | 'payout' | 'partner_user' | 'conversion';

  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  userEmail: string;

  @Column({ type: 'varchar', length: 20 })
  userRole: 'admin' | 'partner' | 'system';

  @Column({ type: 'jsonb', nullable: true })
  previousData: any;

  @Column({ type: 'jsonb', nullable: true })
  newData: any;

  @Column({ type: 'jsonb', nullable: true })
  changes: any;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}