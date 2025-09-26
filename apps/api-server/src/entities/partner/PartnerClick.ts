import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { PartnerUser } from './PartnerUser';

@Entity('partner_clicks')
@Index(['partnerUserId', 'createdAt'])
@Index(['sessionId'])
@Index(['ipAddress'])
export class PartnerClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  partnerUserId: string;

  @ManyToOne(() => PartnerUser, partnerUser => partnerUser.clicks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partnerUserId' })
  partnerUser: PartnerUser;

  @Column({ type: 'varchar', length: 100 })
  sessionId: string;

  @Column({ type: 'inet' })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'text', nullable: true })
  referrerUrl: string;

  @Column({ type: 'text' })
  landingUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  device: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  browser: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  os: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    source?: string;
    medium?: string;
    campaign?: string;
    keyword?: string;
    adId?: string;
    customParams?: any;
  };

  @Column({ type: 'boolean', default: false })
  isConverted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  convertedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}