/**
 * GlucoseView Chapter Entity (분회)
 *
 * 약사회 분회 정보
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { GlucoseViewBranch } from './glucoseview-branch.entity.js';

@Entity({ name: 'glucoseview_chapters', schema: 'public' })
@Index(['branch_id', 'name'], { unique: true })
export class GlucoseViewChapter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 소속 지부 ID
   */
  @Column({ type: 'uuid' })
  @Index()
  branch_id!: string;

  /**
   * 분회명 (예: 강남분회, 서초분회)
   */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * 분회 코드 (정렬/식별용)
   */
  @Column({ type: 'varchar', length: 20, unique: true })
  code!: string;

  /**
   * 정렬 순서
   */
  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  /**
   * 활성화 여부
   */
  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @ManyToOne(() => GlucoseViewBranch, (branch) => branch.chapters)
  @JoinColumn({ name: 'branch_id' })
  branch!: GlucoseViewBranch;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
