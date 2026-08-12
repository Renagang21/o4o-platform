/**
 * BranchDomain Entity
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §5
 *
 * 분회 자체 도메인 연결. **분회별 배포나 별도 백엔드를 만들지 않는다.**
 * 단일 web-kpa-branch 배포가 Host 헤더로 분회를 해석하기 위한 매핑 테이블이다.
 *
 * hostname 은 항상 소문자로 저장한다 (CHK_branch_domains_hostname_lower).
 * 분회당 is_primary=true 는 1개 (UQ_branch_domains_primary).
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type BranchDomainStatus = 'pending' | 'verifying' | 'active' | 'failed' | 'disabled';

@Entity('branch_domains')
export class BranchDomain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 253 })
  hostname: string;

  @Column({ type: 'boolean', default: false })
  is_primary: boolean;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: BranchDomainStatus;

  /** DNS TXT 검증 토큰 (_o4o-branch-verify) */
  @Column({ type: 'varchar', length: 64 })
  verification_token: string;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
