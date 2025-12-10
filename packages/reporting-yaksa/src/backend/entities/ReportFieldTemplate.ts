import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ReportFieldTemplate Entity
 *
 * 신상신고 양식 템플릿 - 연도별로 다른 양식을 정의할 수 있음
 *
 * @example
 * ```typescript
 * {
 *   year: 2025,
 *   fields: [
 *     { key: "licenseNumber", label: "면허번호", type: "text", required: true },
 *     { key: "workplaceType", label: "근무형태", type: "select", options: ["개국약사", "근무약사", "휴업"] },
 *     { key: "pharmacyName", label: "약국명", type: "text" },
 *     { key: "pharmacyAddress", label: "약국주소", type: "address" },
 *     { key: "categoryChange", label: "회원분류 변경", type: "select", options: [...] }
 *   ],
 *   active: true
 * }
 * ```
 */
@Entity('yaksa_report_field_templates')
@Index(['year'], { unique: true })
@Index(['active'])
export class ReportFieldTemplate {
  /**
   * 템플릿 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 적용 연도
   */
  @Column({ type: 'int' })
  year!: number;

  /**
   * 템플릿 이름 (예: "2025년 신상신고서")
   */
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /**
   * 템플릿 설명
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * 신고서 입력 필드 정의 (JSON)
   *
   * @example
   * ```typescript
   * [
   *   {
   *     key: "licenseNumber",
   *     label: "면허번호",
   *     type: "text",
   *     required: true,
   *     readonly: true,  // 자동 채워짐
   *     source: "member.licenseNumber"
   *   },
   *   {
   *     key: "workplaceType",
   *     label: "근무형태",
   *     type: "select",
   *     required: true,
   *     options: [
   *       { value: "pharmacy_owner", label: "개국약사" },
   *       { value: "pharmacy_employee", label: "근무약사" },
   *       { value: "hospital", label: "병원약사" },
   *       { value: "industry", label: "제약회사" },
   *       { value: "retired", label: "휴업" },
   *       { value: "other", label: "기타" }
   *     ]
   *   },
   *   {
   *     key: "organizationChange",
   *     label: "소속 변경",
   *     type: "organization",
   *     required: false,
   *     syncToMembership: true  // 승인 시 Membership-Yaksa에 반영
   *   }
   * ]
   * ```
   */
  @Column({ type: 'jsonb' })
  fields!: ReportFieldDefinition[];

  /**
   * 활성 여부 (해당 연도에 사용 중인 템플릿)
   */
  @Column({ type: 'boolean', default: true })
  active!: boolean;

  /**
   * 제출 마감일 (선택적)
   */
  @Column({ type: 'date', nullable: true })
  deadline?: string;

  /**
   * 생성일시
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 수정일시
   */
  @UpdateDateColumn()
  updatedAt!: Date;
}

/**
 * 필드 정의 타입
 */
export interface ReportFieldDefinition {
  /** 필드 키 (영문) */
  key: string;
  /** 필드 라벨 (한글) */
  label: string;
  /** 필드 타입 */
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'address' | 'license' | 'organization' | 'textarea' | 'phone' | 'email';
  /** 필수 여부 */
  required?: boolean;
  /** 읽기 전용 (자동 채워짐) */
  readonly?: boolean;
  /** 자동 채움 소스 (예: "member.licenseNumber") */
  source?: string;
  /** select/multiselect 옵션 */
  options?: Array<{ value: string; label: string }>;
  /** 기본값 */
  defaultValue?: any;
  /** 유효성 검사 규칙 */
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  /** 승인 시 Membership-Yaksa 자동 반영 */
  syncToMembership?: boolean;
  /** 반영 대상 필드 (예: "categoryId", "organizationId") */
  syncTarget?: string;
  /** 필드 힌트/설명 */
  hint?: string;
  /** 필드 그룹 (UI 그룹핑용) */
  group?: string;
  /** 표시 순서 */
  order?: number;
}
