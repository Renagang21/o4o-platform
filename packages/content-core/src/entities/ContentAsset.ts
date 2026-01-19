/**
 * Content Core - ContentAsset Entity
 *
 * Content Core의 핵심 엔티티.
 * 모든 콘텐츠 자산의 메타데이터를 정의한다.
 *
 * ⚠️ Skeleton 단계:
 * - 이 엔티티는 아직 사용되지 않는다
 * - 마이그레이션이 생성되지 않았다
 * - 기존 시스템과 연결되지 않았다
 *
 * @see docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import type {
  ContentType,
  ContentStatus,
  ContentVisibility,
  ContentOwnerType,
} from '../types/ContentTypes.js';

@Entity('content_assets')
export class ContentAsset {
  /**
   * 고유 식별자 (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 콘텐츠 유형
   * @see ContentType
   */
  @Column({
    type: 'varchar',
    length: 20,
  })
  type!: ContentType;

  /**
   * 콘텐츠 제목
   */
  @Column({
    type: 'varchar',
    length: 255,
  })
  title!: string;

  /**
   * 콘텐츠 설명
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  /**
   * 콘텐츠 상태
   * @see ContentStatus
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  status!: ContentStatus;

  /**
   * 공개 범위
   * @see ContentVisibility
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'restricted',
  })
  visibility!: ContentVisibility;

  /**
   * 소유자 유형
   * @see ContentOwnerType
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'platform',
  })
  ownerType!: ContentOwnerType;

  /**
   * 생성 일시
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 수정 일시
   */
  @UpdateDateColumn()
  updatedAt!: Date;
}
