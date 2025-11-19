import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import type { User } from './User.js';
import { CrowdfundingProject } from './CrowdfundingProject.js';

export type ParticipationStatus = 'joined' | 'cancelled';

@Entity('crowdfunding_participations')
@Unique(['projectId', 'vendorId']) // 한 프로젝트에 한 번만 참여 가능
export class CrowdfundingParticipation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'project_id' })
  projectId: string;

  @ManyToOne('CrowdfundingProject', 'participations', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: CrowdfundingProject;

  @Column({ type: 'varchar', name: 'vendor_id' })
  vendorId: string;

  @ManyToOne('User', { eager: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor: User;

  @Column({
    type: 'enum',
    enum: ['joined', 'cancelled'],
    default: 'joined'
  })
  status: ParticipationStatus;

  @Column({ name: 'joined_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}