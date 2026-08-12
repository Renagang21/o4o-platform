/**
 * AnnualReportTemplate Entity
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1
 *
 * 연도별 약사 회원 신상신고 양식(Template).
 *
 * 설계 불변식 — 필드를 코드에 고정하지 않는다:
 *   대한약사회 양식은 매년 바뀐다. 따라서 **필드 정의는 전량 `schema` jsonb 안에만** 존재한다.
 *   이 파일은 필드 key 나 선택지(활동유형·미활동사유 등)를 TS union 으로 선언하지 않는다.
 *   코드가 아는 것은 `AnnualReportFieldType`(공용 렌더러 종류) 뿐이며,
 *   연도가 바뀌면 **새 row 를 넣을 뿐 코드는 변경되지 않는다.**
 *
 *   과거 services/web-kpa-society/src/types/pharmacist.ts 가
 *   ActivityType(11종)·InactiveReason(9종)·HospitalType(5종)을 TS union 으로 박아
 *   양식 변경이 곧 코드 변경이 되던 구조를 **재도입하지 않는다.**
 *
 * 제출 레코드(annual_reports)는 본 WO 범위 밖이다. 여기에는 양식만 있다.
 *
 * ESM 규칙 (CLAUDE.md §2): 관계를 두지 않으므로 entity import 자체가 없다.
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** 양식 상태. (service_key, year) 당 active 는 최대 1개 — 부분 UNIQUE 로 강제 */
export type AnnualReportTemplateStatus = 'draft' | 'active' | 'archived';

/**
 * 필드 소유권 — 누가 값을 쓰는가.
 *
 *   auto        회원정보에서 prefill. 회원이 수정 가능하며 syncToMembership 시 회원정보로 되돌아간다.
 *   member      회원이 직접 입력한다.
 *   association 약사회(분회) 관리값. **회원 입력 금지** — 제출 payload 에 와도 서버가 무시한다.
 *               연수교육 평점·회비구분·소속 지부/분회가 여기 속한다.
 */
export type AnnualReportFieldOwnership = 'auto' | 'member' | 'association';

/** 공용 렌더러 종류. 코드가 아는 유일한 고정 목록이다. */
export type AnnualReportFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'tel'
  | 'email'
  | 'radio'
  | 'checkbox'
  | 'select'
  | 'multiselect'
  | 'address'
  | 'license'
  | 'file'
  | 'signature'
  | 'consent'
  | 'readonly_display';

export interface AnnualReportTemplateStep {
  key: string;
  order: number;
  title: string;
}

export interface AnnualReportFieldOption {
  value: string | number | boolean;
  label: string;
  /** 선택지 묶음 라벨 (예: 미활동 사유의 "6개월 이상 조제업무 미종사") */
  group?: string;
}

/** ownership='auto' | 'association' 일 때 값의 출처 */
export interface AnnualReportFieldSource {
  entity: string;
  column: string;
  /** 파생 조회가 필요한 경우 (예: 분회 → 지부) */
  resolve?: string;
}

export interface AnnualReportFieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  message?: string;
}

export interface AnnualReportFieldDefinition {
  /** flat dot-key. 제출 시 annual_reports.values 의 키가 된다 */
  key: string;
  label: string;
  type: AnnualReportFieldType;
  /** 소속 STEP (steps[].key). STEP 재배치를 스키마 변경 없이 흡수한다 */
  step: string;
  group?: string;
  order: number;
  ownership: AnnualReportFieldOwnership;
  required: boolean;
  readonly: boolean;
  options?: AnnualReportFieldOption[];
  validation?: AnnualReportFieldValidation;
  /** 조건부 표시 — rules[].id 참조. 없으면 항상 표시 */
  visibleWhen?: { rule: string };
  source?: AnnualReportFieldSource;
  syncToMembership?: boolean;
  syncTarget?: string;
  hint?: string;
}

export type AnnualReportRuleKind = 'visible' | 'required' | 'notice';
export type AnnualReportRuleOp = 'eq' | 'neq' | 'in' | 'notIn' | 'truthy';

export interface AnnualReportRule {
  id: string;
  kind: AnnualReportRuleKind;
  description: string;
  when: {
    field: string;
    op: AnnualReportRuleOp;
    value?: unknown;
  } | null;
  /** 적용 대상 field.key 목록 */
  targets: string[];
  /** kind='visible' 에서 조건 불일치 시 숨김과 함께 필수 해제 여부 */
  releaseRequiredWhenHidden?: boolean;
}

export interface AnnualReportTemplateSchema {
  templateVersion: string;
  steps: AnnualReportTemplateStep[];
  fields: AnnualReportFieldDefinition[];
  rules: AnnualReportRule[];
}

@Entity('annual_report_templates')
export class AnnualReportTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 서비스 축. 분회별로 나뉘지 않는다 — 양식은 서비스 전체 공통이다 */
  @Column({ type: 'varchar', length: 50 })
  service_key: string;

  @Column({ type: 'int' })
  year: number;

  /** 연내 개정 차수. (service_key, year, version) UNIQUE */
  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: AnnualReportTemplateStatus;

  /** 신고 접수 기간. 대한약사회 공문 기준 (2026: 01-01 ~ 02-28) */
  @Column({ type: 'date', nullable: true })
  period_start: string | null;

  @Column({ type: 'date', nullable: true })
  period_end: string | null;

  /** steps / fields / rules. 양식의 단일 진실 */
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  schema: AnnualReportTemplateSchema;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
