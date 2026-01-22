/**
 * CornerDisplay Entity
 *
 * Phase 2: 코너 디스플레이 정의
 *
 * 핵심 원칙:
 * - "이 코너에서 항상 동일하게 보여질 화면 정의"
 * - 제품을 직접 소유하지 않음 (Phase 1 Listing 필터를 통해 간접 참조)
 * - 태블릿은 이 코너의 "물리적 확장"으로 귀속됨
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { CornerListingQuery, CornerDisplayLayout } from '@o4o/types';

/**
 * 코너 디스플레이 타입
 * - grid: 그리드 레이아웃
 * - list: 리스트 레이아웃
 * - featured: 추천 상품 강조
 * - carousel: 캐러셀 형태
 */
export type CornerDisplayType = 'grid' | 'list' | 'featured' | 'carousel';

/**
 * 코너 디스플레이 상태
 */
export type CornerDisplayStatus = 'active' | 'inactive' | 'draft';

@Entity('corner_displays')
@Index(['sellerId', 'cornerKey'], { unique: true })
export class CornerDisplay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 이 코너가 속한 셀러 ID
   */
  @Column({ type: 'uuid' })
  @Index()
  sellerId!: string;

  /**
   * 코너 식별 키 (예: 'premium_zone', 'new_arrivals', 'seasonal')
   * - 매장 내에서 고유
   * - 물리적 위치 또는 논리적 구분을 나타냄
   */
  @Column({ type: 'varchar', length: 100 })
  cornerKey!: string;

  /**
   * 코너 표시 이름 (운영자/고객에게 보이는 이름)
   */
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /**
   * 코너 설명 (선택)
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * 디스플레이 타입
   */
  @Column({ type: 'varchar', length: 50, default: 'grid' })
  displayType!: CornerDisplayType;

  /**
   * 코너 상태
   */
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: CornerDisplayStatus;

  /**
   * Phase 1 Listings API 조회 쿼리 (Phase 2 추가)
   * - CornerListingQuery 타입 사용
   * - cornerKey와 동기화 (기본적으로 corner = cornerKey)
   *
   * @example { corner: 'premium_zone', visibility: 'visible', limit: 12 }
   */
  @Column({ type: 'jsonb', nullable: true })
  listingQuery?: CornerListingQuery;

  /**
   * 레이아웃 설정
   * - Phase 1의 CornerDisplayLayout과 호환
   */
  @Column({ type: 'jsonb', nullable: true })
  layoutConfig?: CornerDisplayLayout;

  /**
   * AI 컨텍스트 정보 (선택)
   * - AI 대화 시 이 코너의 맥락 제공
   */
  @Column({ type: 'jsonb', nullable: true })
  aiContext?: {
    keywords?: string[];
    targetAudience?: string;
    tone?: string;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
