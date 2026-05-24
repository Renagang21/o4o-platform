/**
 * OperatorQrTemplate Entity — Operator HUB QR Template (운영자 발행 QR 청사진)
 *
 * WO-O4O-KPA-OPERATOR-HUB-QR-TEMPLATE-FOUNDATION-V1 Phase 1 Backend Foundation (2026-05-24)
 *
 * 운영자가 매장 HUB 에 게시할 QR 의 "청사진" entity. 실제 QR 발행 (slug + landing URL)
 * 은 매장 가져가기 시점에 기존 store_qr_codes 에서 일어남.
 *
 * 선행 IR (IR-O4O-KPA-OPERATOR-HUB-QR-BUSINESS-DEFINITION-V1) Option B 채택 근거:
 *   - 기존 store_qr_codes 의 4 개 제약 (organization_id NOT NULL+FK, slug global unique,
 *     service_key/author_role/status 부재) 이 운영자 HUB 흐름과 모두 충돌.
 *   - POP store_pops 신설과 동질 — entity 분리 시 store_qr_codes 9 endpoint 영향 0,
 *     /qr/public/:slug global URL 정합 보존, 마이그레이션 위험 최소화.
 *
 * 의도적 부재:
 *   - slug 컬럼 없음 (운영자 단계에서 slug 미발급 — 매장 가져가기 시 발급)
 *   - organization_id 없음 (운영자 원본은 매장 무귀속)
 *   - scan tracking 없음 (scan 은 매장 사본 store_qr_codes 단위에서만)
 *
 * Phase 2 후속:
 *   - Operator QR write API + queryQr 실 구현 + resolveQr 실 구현
 *   - operator-qr.controller.ts 신설
 *
 * Phase 3-B 후속 (변환):
 *   - POST /api/v1/kpa/stores/:slug/qr/staff/import { sourceId }
 *   - store_qr_codes INSERT (기존 구조 그대로) — landing_type / landing_target_id 변환
 *
 * Pattern: store-pop.entity.ts (Phase 1 schema 패턴 mirror).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type OperatorQrTemplateStatus = 'draft' | 'published' | 'archived';

/**
 * QR template 작성자 역할 — 본 entity 는 운영자 발행 전용.
 * 'supplier' / 'store' 는 본 entity 의 대상이 아니며 DB CHECK 로 차단.
 * Canonical: 매장 직접 QR 흐름은 기존 store_qr_codes (POST /pharmacy/qr) 가 유지.
 */
export type OperatorQrTemplateAuthorRole = 'operator';

/**
 * QR target 종류 — 1차 범위 2 종.
 *   - 'url'     : 외부 URL (target_url 사용)
 *   - 'content' : 내부 콘텐츠 ID (target_content_kind + target_content_ref 사용)
 *
 * 제외 (Phase 2 이후 또는 별도 IR):
 *   - 'product'    : 매장 컨텍스트 강결합 — 기존 store_qr_codes 매장 직접 흐름 유지
 *   - 'promotion'  : 매장 컨텍스트 강결합
 *   - 'tablet'     : 매장 태블릿 환경 설계 후 별도 IR
 *   - 'survey'     : survey entity 부재 — IR-O4O-SURVEY-STRUCTURE-DESIGN-V1 선행
 */
export type OperatorQrTemplateTargetType = 'url' | 'content';

/**
 * target_type='content' 시 콘텐츠 종류 — 1차 범위 3 종.
 *   - 'blog' : store_blog_posts 운영자 게시 블로그
 *   - 'cms'  : cms_contents 운영자 게시 CMS
 *   - 'pop'  : store_pops 운영자 게시 POP
 */
export type OperatorQrTemplateContentKind = 'blog' | 'cms' | 'pop';

@Entity({ name: 'operator_qr_templates' })
// HUB query 최적화 — service_key + author_role + status 복합 조건
@Index('IDX_operator_qr_templates_hub_query', ['serviceKey', 'authorRole', 'status'])
@Index(['serviceKey', 'publishedAt'])
export class OperatorQrTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'service_key', type: 'varchar', length: 50 })
  serviceKey!: string;

  /**
   * 작성자 역할 — 본 entity 는 운영자 발행만.
   * DB CHECK 제약: author_role IN ('operator') — 그 외 차단.
   */
  @Column({ name: 'author_role', type: 'varchar', length: 30, default: 'operator' })
  authorRole!: OperatorQrTemplateAuthorRole;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: OperatorQrTemplateStatus;

  /**
   * target 종류 — 1차 'url' | 'content'.
   * DB CHECK 제약 + target 별 NULL 조건 검증 (CHK_operator_qr_templates_target_consistency).
   */
  @Column({ name: 'target_type', type: 'varchar', length: 20 })
  targetType!: OperatorQrTemplateTargetType;

  /**
   * target_type='url' 시 외부 URL.
   * target_type='content' 시 NULL.
   */
  @Column({ name: 'target_url', type: 'text', nullable: true })
  targetUrl?: string;

  /**
   * target_type='content' 시 콘텐츠 종류 ('blog' | 'cms' | 'pop').
   * target_type='url' 시 NULL.
   */
  @Column({ name: 'target_content_kind', type: 'varchar', length: 20, nullable: true })
  targetContentKind?: OperatorQrTemplateContentKind;

  /**
   * target_type='content' 시 콘텐츠 식별자 (slug 또는 id — kind 별 의미 다름).
   * target_type='url' 시 NULL.
   */
  @Column({ name: 'target_content_ref', type: 'varchar', length: 500, nullable: true })
  targetContentRef?: string;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
