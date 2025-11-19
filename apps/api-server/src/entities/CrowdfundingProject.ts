import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import type { User } from './User.js';
import { CrowdfundingParticipation } from './CrowdfundingParticipation.js';

export type CrowdfundingProjectStatus = 'recruiting' | 'in_progress' | 'completed' | 'cancelled';

@Entity('crowdfunding_projects')
export class CrowdfundingProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  // 참여 관련
  @Column({ name: 'target_participant_count', type: 'int' })
  targetParticipantCount: number;

  @Column({ name: 'current_participant_count', type: 'int', default: 0 })
  currentParticipantCount: number;

  // 기간
  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  // 상태
  @Column({
    type: 'enum',
    enum: ['recruiting', 'in_progress', 'completed', 'cancelled'],
    default: 'recruiting'
  })
  status: CrowdfundingProjectStatus;

  // 생성자 (제품 개발사)
  @Column({ type: 'varchar', name: 'creator_id' })
  creatorId: string;

  @ManyToOne('User', { eager: true })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  // 포럼 연동 (단순 링크)
  @Column({ type: 'varchar', name: 'forum_link', length: 500, nullable: true })
  forumLink?: string;

  // Relations
  @OneToMany('CrowdfundingParticipation', 'project')
  participations!: CrowdfundingParticipation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 가상 필드들 (계산된 값)
  get participationRate(): number {
    if (this.targetParticipantCount === 0) return 0;
    return Math.round((this.currentParticipantCount / this.targetParticipantCount) * 100);
  }

  get remainingDays(): number {
    const endDate = new Date(this.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  get isActive(): boolean {
    const today = new Date();
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    return today >= start && today <= end && this.status === 'recruiting';
  }

  get isSuccessful(): boolean {
    return this.currentParticipantCount >= this.targetParticipantCount;
  }
}