/**
 * KPA Legal Document Entity
 *
 * WO-KPA-A-OPERATOR-DASHBOARD-ENHANCEMENT-V3: Phase 3
 *
 * 이용약관, 개인정보처리방침 등 법률/정책 문서 관리.
 * document_type별 최신 published 문서가 현재 적용 문서.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('kpa_legal_documents')
@Index(['document_type', 'status'])
export class KpaLegalDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  document_type!: string; // terms, privacy, policy

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: string; // draft, published

  @Column({ type: 'uuid', nullable: true })
  published_by!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  published_at!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  created_by!: string | null;

  @Column({ type: 'uuid', nullable: true })
  updated_by!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
