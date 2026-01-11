/**
 * GlucoseView Branch Entity (지부)
 *
 * 약사회 지부 정보
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { GlucoseViewChapter } from './glucoseview-chapter.entity.js';

@Entity({ name: 'glucoseview_branches', schema: 'public' })
export class GlucoseViewBranch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 지부명 (예: 서울지부, 경기지부)
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  /**
   * 지부 코드 (정렬/식별용)
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

  @OneToMany('GlucoseViewChapter', 'branch')
  chapters!: GlucoseViewChapter[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
