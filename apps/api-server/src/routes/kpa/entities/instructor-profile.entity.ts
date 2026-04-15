/**
 * Instructor Profile Entity
 * WO-O4O-INSTRUCTOR-APPLICATION-V1
 *
 * qualification_type='instructor' 승인 시 생성.
 * LMS는 이 테이블을 기준으로 강사를 식별한다.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('instructor_profiles')
export class InstructorProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FK → users.id (UNIQUE: 1 user = 1 profile) */
  @Column({ type: 'uuid', unique: true })
  @Index()
  user_id!: string;

  @Column({ type: 'varchar', length: 200 })
  display_name!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  organization!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  job_title!: string | null;

  /** 전문 분야 배열 (e.g. ["당뇨", "건기식", "마케팅"]) */
  @Column({ type: 'jsonb', default: '[]' })
  expertise!: string[];

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'text', nullable: true })
  experience!: string | null;

  /** 강의 주제 배열 */
  @Column({ type: 'jsonb', default: '[]' })
  lecture_topics!: string[];

  @Column({ type: 'text', nullable: true })
  lecture_plan_summary!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  portfolio_url!: string | null;

  /** 승인 후 활성화 (revoke 시 false) */
  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
