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

/**
 * InstructorApplication Entity
 *
 * WO-LMS-INSTRUCTOR-ROLE-V1
 *
 * 강사 신청 엔티티. 사용자가 강사 역할을 신청하면 관리자가 승인/거절한다.
 */

@Entity('lms_instructor_applications')
@Index(['userId'])
@Index(['status'])
export class InstructorApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  // ESM 규칙: 문자열 기반 관계
  @ManyToOne('User')
  @JoinColumn({ name: 'userId' })
  user?: any;

  // pending | approved | rejected
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: string;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
