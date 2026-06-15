import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * NetureSupplierRegulatedCategory
 *
 * WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1
 *
 * 공급자가 O4O 에 공급하려는 품목군(규제 카테고리)과 그 증빙 PDF · 검토 상태를 관리한다.
 *
 * 원칙:
 *  - O4O 는 법적 허가 여부를 인증하지 않는다. 본 엔티티는 **O4O 내부 등록 가능 상태**만 표현한다.
 *  - 공급자 법적 유형(도매상/제조사/수입사 등) enum 을 만들지 않는다.
 *  - 증빙 PDF 는 kyc_documents(private GCS) 를 재사용한다 (evidenceDocumentId).
 *  - 본 WO 에서는 제품 등록 gate 와 연결하지 않는다 (상태 관리·검토까지만).
 *
 * 한 공급자 × 한 품목군 = 1 row (UNIQUE supplierId+category).
 */

export const REGULATED_CATEGORIES = [
  'general',                 // 일반 상품
  'pharmaceutical',          // 의약품
  'quasi_drug',              // 의약외품
  'medical_device',          // 의료기기
  'health_functional_food',  // 건강기능식품
  'food',                    // 식품
  'cosmetics',               // 화장품
  'other_regulated',         // 기타 법정 관리 품목
] as const;
export type RegulatedCategory = typeof REGULATED_CATEGORIES[number];

export const REGULATED_CATEGORY_STATUSES = [
  'not_requested',  // 미신청
  'submitted',      // 서류 제출
  'approved',       // 등록 가능
  'rejected',       // 반려
  'needs_update',   // 보완 필요
  'suspended',      // 사용 제한
] as const;
export type RegulatedCategoryStatus = typeof REGULATED_CATEGORY_STATUSES[number];

@Entity('neture_supplier_regulated_categories')
@Unique('UQ_supplier_regulated_category', ['supplierId', 'category'])
@Index(['supplierId'])
export class NetureSupplierRegulatedCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @Column({ name: 'category', type: 'varchar', length: 50 })
  category: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'not_requested' })
  status: string;

  @Column({ name: 'evidence_document_id', type: 'uuid', nullable: true })
  evidenceDocumentId: string | null;

  @Column({ name: 'registration_number', type: 'varchar', length: 100, nullable: true })
  registrationNumber: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
