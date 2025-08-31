import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index
} from 'typeorm';

@Entity('affiliate_analytics_cache')
@Index(['cacheKey'], { unique: true })
@Index(['expiresAt'])
export class AffiliateAnalyticsCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  cacheKey: string;

  @Column({ type: 'jsonb' })
  data: any;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type: 'clicks' | 'performance' | 'funnel' | 'revenue' | 'geo' | 'device' | 'custom';

  @Column({ type: 'varchar', length: 255, nullable: true })
  affiliateId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    period?: string;
    filters?: any;
    groupBy?: string;
    version?: number;
  };

  @CreateDateColumn()
  createdAt: Date;
}