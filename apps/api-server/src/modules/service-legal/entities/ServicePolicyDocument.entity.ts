/**
 * ServicePolicyDocument Entity
 *
 * WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1
 *
 * 서비스(serviceKey)별 약관/개인정보처리방침/환불정책 등 정책 문서를 저장한다.
 *
 * 설계 결정 (CmsContent 재사용 검토 결과 — 신규 additive 테이블 채택):
 *   - 선행 IR 은 정책 문서를 frozen core `@o4o/cms-core` 의 `CmsContent` 로 표현하는 것을
 *     우선 검토하도록 했다. 그러나
 *       (a) CmsContent.type(ContentType) 에 terms/privacy/refund 등 정책 유형이 없어
 *           추가 시 cms-core(FROZEN, CLAUDE.md §3 / F10) 구조 변경 — 별도 core WO 필요,
 *       (b) 본 WO 가 요구하는 version / effective_date / change_reason 을 CmsContent 가
 *           1급 필드로 보유하지 않음(metadata jsonb 우회만 가능).
 *     → frozen core 를 건드리지 않는 신규 additive 테이블이 최소·안전한 선택.
 *   - 본 테이블은 KPA-only `kpa_legal_documents` 의 검증된 형태를 4개 서비스 공통으로
 *     일반화(serviceKey + version + effective_date + change_reason 추가)한 것이다.
 *     kpa_legal_documents 는 본 WO 에서 변경하지 않는다(KPA 자체 경로 유지).
 *
 * 게시 모델: serviceKey + document_type 별 최신 published 1건이 현재 적용 문서.
 * public API 는 published 만 반환(draft 미노출).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('service_policy_documents')
@Index(['service_key', 'document_type', 'status'])
@Index(['service_key', 'document_type', 'published_at'])
export class ServicePolicyDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** neture | glycopharm | kpa-society | k-cosmetics */
  @Column({ type: 'varchar', length: 50 })
  service_key!: string;

  /**
   * 정책 문서 유형:
   * terms | privacy | refund | commerce | seller | partner | community | marketing | location | custom
   * (자유 문자열 — 컨트롤러에서 화이트리스트 검증)
   */
  @Column({ type: 'varchar', length: 50 })
  document_type!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  /** 같은 페이지 내 anchor / route slug (선택) */
  @Column({ type: 'varchar', length: 150, nullable: true })
  slug!: string | null;

  /** 문서 본문 (markdown/plain). 실값 seed 금지 — 기본 빈 문자열 가능. */
  @Column({ type: 'text', default: '' })
  content!: string;

  /** 문서 버전 (수정 게시마다 증가시킬 수 있는 정수) */
  @Column({ type: 'int', default: 1 })
  version!: number;

  /** draft | published */
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: string;

  /** 효력 발생일 (선택) */
  @Column({ type: 'timestamp', nullable: true })
  effective_date!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  published_at!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  published_by!: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_by!: string | null;

  @Column({ type: 'uuid', nullable: true })
  updated_by!: string | null;

  /** 변경 사유 (audit/거버넌스용) */
  @Column({ type: 'text', nullable: true })
  change_reason!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
