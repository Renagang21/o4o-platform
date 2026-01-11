/**
 * Tourism Destination Entity
 *
 * Phase 5-C: Tourism 서비스 최초 구현
 *
 * 관광지/테마 정보를 관리하는 엔티티
 * - 주문 기능 없음 (E-commerce Core 위임)
 * - 콘텐츠 중심 설계
 *
 * @see CLAUDE.md §7 - E-commerce Core 절대 규칙
 * @see docs/_platform/E-COMMERCE-ORDER-CONTRACT.md
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

/**
 * 관광지 상태
 */
export enum DestinationStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * 관광지 유형
 */
export enum DestinationType {
  CITY = 'city',
  REGION = 'region',
  ATTRACTION = 'attraction',
  THEME = 'theme',
}

@Entity('tourism_destinations')
export class TourismDestination {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 관광지 이름
   */
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /**
   * 관광지 이름 (영문)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  nameEn?: string;

  /**
   * 슬러그 (URL용)
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 200 })
  slug!: string;

  /**
   * 관광지 유형
   */
  @Index()
  @Column({
    type: 'enum',
    enum: DestinationType,
    default: DestinationType.CITY,
  })
  type!: DestinationType;

  /**
   * 상태
   */
  @Index()
  @Column({
    type: 'enum',
    enum: DestinationStatus,
    default: DestinationStatus.DRAFT,
  })
  status!: DestinationStatus;

  /**
   * 간략 설명
   */
  @Column({ type: 'text', nullable: true })
  summary?: string;

  /**
   * 상세 설명
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * 대표 이미지 URL
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl?: string;

  /**
   * 갤러리 이미지 URLs
   */
  @Column({ type: 'jsonb', nullable: true })
  galleryImages?: string[];

  /**
   * 국가 코드
   */
  @Index()
  @Column({ type: 'varchar', length: 2, default: 'KR' })
  countryCode!: string;

  /**
   * 지역 코드
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  regionCode?: string;

  /**
   * 정렬 순서
   */
  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  /**
   * 추가 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany('TourismPackage', 'destination')
  packages?: unknown[];
}
