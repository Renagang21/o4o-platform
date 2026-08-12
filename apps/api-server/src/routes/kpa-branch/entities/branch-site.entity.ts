/**
 * BranchSite Entity
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §5
 *
 * 분회 홈페이지 설정. 1차 범위는 **고정 템플릿**이며 페이지 빌더가 아니다.
 * 블록/레이아웃 스키마를 만들지 않는다 — 로고·이름·소개·연락처·게시 여부만 둔다.
 * 공지·자료실 글은 별도 콘텐츠 축에서 연결한다.
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type BranchSiteTemplate = 'classic';

export interface BranchSiteContact {
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
  fax?: string;
}

@Entity('branch_sites')
export class BranchSite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** kpa_organizations.id — 분회당 1개 (UQ_branch_sites_organization) */
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  tagline: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string | null;

  @Column({ type: 'text', nullable: true })
  intro: string | null;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  contact: BranchSiteContact;

  @Column({ type: 'varchar', length: 30, default: 'classic' })
  template: BranchSiteTemplate;

  @Column({ type: 'boolean', default: false })
  is_published: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
