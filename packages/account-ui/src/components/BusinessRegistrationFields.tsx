/**
 * BusinessRegistrationFields
 *
 * WO-O4O-BUSINESS-REGISTRATION-COMMON-UI-COMPONENT-V1 (P3)
 *
 * O4O 4 service (KPA / GlycoPharm / K-Cosmetics / Neture) 가입 폼에서
 * 반복 구현된 사업자등록증 4 canonical 필드 입력 UI 를 공통화한 컴포넌트.
 *
 * 4 필드:
 *   - businessType         (업태)
 *   - businessItem         (종목)
 *   - businessEntityType   (사업자 유형 — @o4o/types BusinessEntityType enum)
 *   - businessStartDate    (개업일 — YYYY-MM-DD ISO date)
 *
 * 정책 (CLAUDE.md / WO):
 *   - 계좌 정보는 포함하지 않는다 (PG 사 관리, 오프라인 절차).
 *   - 세금계산서 / 사업자등록번호 / 상호 / 대표자 / 주소 / 전화 등은 본 컴포넌트
 *     범위 외 (서비스별 폼 구조에 그대로 둔다).
 *   - 모든 필드 optional (서비스별 required 정책은 부모 폼에서 결정).
 *   - 스타일을 강제하지 않는다 — inputClassName / labelClassName override 지원.
 *
 * 라벨 SSOT: @o4o/types BUSINESS_ENTITY_TYPE_LABELS.
 */

import type { ChangeEvent, ReactElement } from 'react';
import {
  type BusinessEntityType,
  BUSINESS_ENTITY_TYPE_LABELS,
} from '@o4o/types';

export interface BusinessRegistrationFieldsValue {
  businessType?: string;
  businessItem?: string;
  businessEntityType?: BusinessEntityType | string;
  businessStartDate?: string;
}

export type BusinessRegistrationFieldKey = keyof BusinessRegistrationFieldsValue;

export interface BusinessRegistrationFieldsProps {
  value: BusinessRegistrationFieldsValue;
  /** Patch 방식 onChange — 부모 setState 에서 spread 로 흡수. */
  onChange: (patch: Partial<BusinessRegistrationFieldsValue>) => void;
  disabled?: boolean;
  /** true 면 렌더된 필드 모두 html required + label 에 * 표시. */
  required?: boolean;
  /** outer container className override. */
  className?: string;
  /** input/select/date 공통 className override (서비스별 focus ring 색상 등). */
  inputClassName?: string;
  /** label className override. */
  labelClassName?: string;
  /** "선택" placeholder 라벨 (사업자 유형 select). */
  entityTypePlaceholder?: string;
  /**
   * 렌더할 필드 화이트리스트. 미지정 시 4 필드 전체 (default).
   * 기존 폼이 businessType 등을 별도로 가진 경우 부분 렌더용.
   * 예: ['businessItem', 'businessEntityType', 'businessStartDate']
   */
  includeFields?: BusinessRegistrationFieldKey[];
}

const DEFAULT_INPUT_CLASS =
  'w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';
const DEFAULT_LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1';
const DEFAULT_CONTAINER_CLASS = 'space-y-3';

const ENTITY_TYPE_OPTIONS = (
  Object.entries(BUSINESS_ENTITY_TYPE_LABELS) as Array<[BusinessEntityType, string]>
).map(([value, label]) => ({ value, label }));

const ALL_FIELDS: BusinessRegistrationFieldKey[] = [
  'businessType',
  'businessItem',
  'businessEntityType',
  'businessStartDate',
];

export function BusinessRegistrationFields({
  value,
  onChange,
  disabled = false,
  required = false,
  className,
  inputClassName,
  labelClassName,
  entityTypePlaceholder = '선택 (선택사항)',
  includeFields,
}: BusinessRegistrationFieldsProps) {
  const inputCls = inputClassName ?? DEFAULT_INPUT_CLASS;
  const labelCls = labelClassName ?? DEFAULT_LABEL_CLASS;
  const containerCls = className ?? DEFAULT_CONTAINER_CLASS;

  const visible = new Set<BusinessRegistrationFieldKey>(
    includeFields && includeFields.length > 0 ? includeFields : ALL_FIELDS,
  );

  const handle = (key: BusinessRegistrationFieldKey) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange({ [key]: e.target.value });
    };

  const requiredMark = required ? <span className="text-red-500"> *</span> : null;

  const fieldNodes: Record<BusinessRegistrationFieldKey, ReactElement> = {
    businessType: (
      <div key="businessType">
        <label className={labelCls}>업태{requiredMark}</label>
        <input
          type="text"
          name="businessType"
          value={value.businessType ?? ''}
          onChange={handle('businessType')}
          disabled={disabled}
          required={required}
          placeholder="예: 도매 및 소매"
          maxLength={100}
          className={inputCls}
        />
      </div>
    ),
    businessItem: (
      <div key="businessItem">
        <label className={labelCls}>종목{requiredMark}</label>
        <input
          type="text"
          name="businessItem"
          value={value.businessItem ?? ''}
          onChange={handle('businessItem')}
          disabled={disabled}
          required={required}
          placeholder="예: 의약품 소매업"
          maxLength={100}
          className={inputCls}
        />
      </div>
    ),
    businessEntityType: (
      <div key="businessEntityType">
        <label className={labelCls}>사업자 유형{requiredMark}</label>
        <select
          name="businessEntityType"
          value={value.businessEntityType ?? ''}
          onChange={handle('businessEntityType')}
          disabled={disabled}
          required={required}
          className={inputCls}
        >
          <option value="">{entityTypePlaceholder}</option>
          {ENTITY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    ),
    businessStartDate: (
      <div key="businessStartDate">
        <label className={labelCls}>개업일{requiredMark}</label>
        <input
          type="date"
          name="businessStartDate"
          value={value.businessStartDate ?? ''}
          onChange={handle('businessStartDate')}
          disabled={disabled}
          required={required}
          className={inputCls}
        />
      </div>
    ),
  };

  const visibleOrdered = ALL_FIELDS.filter((k) => visible.has(k));
  const pairs: BusinessRegistrationFieldKey[][] = [];
  for (let i = 0; i < visibleOrdered.length; i += 2) {
    pairs.push(visibleOrdered.slice(i, i + 2));
  }

  return (
    <div className={containerCls}>
      {pairs.map((pair, idx) => (
        <div key={idx} className="grid grid-cols-2 gap-3">
          {pair.map((k) => fieldNodes[k])}
        </div>
      ))}
    </div>
  );
}
