/**
 * Tourism Package Entity
 *
 * Phase 5-C: Tourism 서비스 최초 구현
 *
 * 관광 패키지 정보를 관리하는 엔티티
 * - 주문 기능 없음 (E-commerce Core 위임)
 * - Dropshipping 상품 참조 (소유하지 않음)
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
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { TourismDestination } from './tourism-destination.entity.js';

/**
 * 패키지 상태
 */
export enum PackageStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SOLD_OUT = 'sold_out',
  INACTIVE = 'inactive',
}

/**
 * 패키지 유형
 */
export enum PackageType {
  DAY_TOUR = 'day_tour',
  MULTI_DAY = 'multi_day',
  EXPERIENCE = 'experience',
  SHOPPING = 'shopping',
}

@Entity('tourism_packages')
export class TourismPackage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 패키지 이름
   */
  @Column({ type: 'varchar', length: 300 })
  name!: string;

  /**
   * 패키지 이름 (영문)
   */
  @Column({ type: 'varchar', length: 300, nullable: true })
  nameEn?: string;

  /**
   * 슬러그 (URL용)
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 300 })
  slug!: string;

  /**
   * 연결된 관광지 ID
   */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  destinationId?: string;

  /**
   * 패키지 유형
   */
  @Index()
  @Column({
    type: 'enum',
    enum: PackageType,
    default: PackageType.DAY_TOUR,
  })
  type!: PackageType;

  /**
   * 상태
   */
  @Index()
  @Column({
    type: 'enum',
    enum: PackageStatus,
    default: PackageStatus.DRAFT,
  })
  status!: PackageStatus;

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
   * 포함 사항
   */
  @Column({ type: 'jsonb', nullable: true })
  inclusions?: string[];

  /**
   * 불포함 사항
   */
  @Column({ type: 'jsonb', nullable: true })
  exclusions?: string[];

  /**
   * 일정 (다일 투어용)
   */
  @Column({ type: 'jsonb', nullable: true })
  itinerary?: {
    day: number;
    title: string;
    description: string;
    activities?: string[];
  }[];

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
   * 소요 시간 (시간 단위)
   */
  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  durationHours?: number;

  /**
   * 소요 일수 (다일 투어용)
   */
  @Column({ type: 'int', nullable: true })
  durationDays?: number;

  /**
   * 최소 인원
   */
  @Column({ type: 'int', default: 1 })
  minParticipants!: number;

  /**
   * 최대 인원
   */
  @Column({ type: 'int', nullable: true })
  maxParticipants?: number;

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

  // Relations (String-based for ESM compatibility - CLAUDE.md §4.1)
  @ManyToOne('TourismDestination', 'packages')
  @JoinColumn({ name: 'destinationId' })
  destination?: TourismDestination;

  @OneToMany('TourismPackageItem', 'package')
  items?: unknown[];
}
