/**
 * KpaOrganization Entity
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §2
 *
 * `kpa_organizations` 는 2026-02 seed 이후 entity 없이 migration 으로만 존재했다
 * (runtime 소비 코드 0건 — IR §4). 분회 Registry 로 사용하기 위해 read 용 entity 를
 * 처음 정의한다. **테이블 구조는 바꾸지 않는다** — slug 컬럼 1개만 additive 로 추가됐다
 * (20270303000000-AddKpaOrganizationSlug).
 *
 * type 축 (실측):
 *   association 1 (대한약사회) / branch 18 (시도지부) / group 209 (분회)
 *   → **분회 = type 'group'**. 이름과 달리 'branch' 는 지부다.
 *
 * parent_id 는 표시용이다. 권한 계산에 사용하지 않는다 (WO 기준 원칙).
 * 모든 분회는 서비스 안에서 동급 tenant 다.
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** kpa_organizations.type 실측 분포 */
export type KpaOrganizationType = 'association' | 'branch' | 'group';

/** 분회 tenant 로 취급하는 type */
export const BRANCH_ORG_TYPE: KpaOrganizationType = 'group';

@Entity('kpa_organizations')
export class KpaOrganization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type: KpaOrganizationType;

  /**
   * URL tenant key. nullable — 기존 행 보호를 위해 additive 로 추가됐고
   * 부분 UNIQUE(WHERE slug IS NOT NULL) 로만 유일성을 강제한다.
   */
  @Column({ type: 'varchar', length: 80, nullable: true })
  slug: string | null;

  /** 표시용 상위 조직(지부). 권한 계산 금지. */
  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
