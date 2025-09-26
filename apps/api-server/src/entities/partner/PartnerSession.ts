import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { PartnerUser } from './PartnerUser';

@Entity('partner_sessions')
@Index(['sessionId'], { unique: true })
@Index(['partnerUserId', 'startedAt'])
@Index(['converted'])
@Index(['source'])
export class PartnerSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  sessionId: string;

  @Column({ type: 'uuid', nullable: true })
  partnerUserId: string;

  @ManyToOne(() => PartnerUser)
  @JoinColumn({ name: 'partnerUserId' })
  partnerUser: PartnerUser;

  @Column({ type: 'varchar', length: 50, nullable: true })
  referralCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  medium: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  campaign: string;

  @Column({ type: 'text', nullable: true })
  landingUrl: string;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  deviceInfo: {
    type?: string;
    browser?: string;
    os?: string;
    screenResolution?: string;
    language?: string;
    timezone?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  geoInfo: {
    country?: string;
    countryCode?: string;
    region?: string;
    city?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  pageViews: Array<{
    url: string;
    title?: string;
    timestamp: Date;
    duration?: number;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  events: Array<{
    type: string;
    data: any;
    timestamp: Date;
  }>;

  @CreateDateColumn()
  startedAt: Date;

  @UpdateDateColumn()
  lastActivity: Date;

  @Column({ type: 'int', default: 0 })
  duration: number; // in seconds

  @Column({ type: 'int', default: 0 })
  pageCount: number;

  @Column({ type: 'int', default: 0 })
  eventCount: number;

  @Column({ type: 'boolean', default: false })
  converted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  convertedAt: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  conversionValue: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  conversionOrderId: string;

  @Column({ type: 'float', nullable: true })
  engagementScore: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
}