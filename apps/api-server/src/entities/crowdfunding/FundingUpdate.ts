import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { FundingProject } from './FundingProject';

@Entity('funding_updates')
@Index(['projectId', 'createdAt'])
export class FundingUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => FundingProject, project => project.updates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: FundingProject;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'varchar', length: 255 })
  author: string;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}