/**
 * CosmeticsRoutine Entity
 *
 * Stores influencer beauty routines
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('cosmetics_routines')
@Index(['partnerId'])
@Index(['isPublished'])
export class CosmeticsRoutine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  partnerId!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb', default: [] })
  steps!: any[];

  @Column({ type: 'jsonb', default: {} })
  metadata!: {
    skinType?: string[];
    concerns?: string[];
    timeOfUse?: 'morning' | 'evening' | 'both';
    tags?: string[];
  };

  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  @Column({ type: 'int', default: 0 })
  viewCount!: number;

  @Column({ type: 'int', default: 0 })
  recommendCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

export default CosmeticsRoutine;
