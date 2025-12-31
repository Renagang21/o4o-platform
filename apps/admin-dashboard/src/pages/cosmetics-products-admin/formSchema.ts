/**
 * Product Form Schema
 *
 * OpenAPI → Form 매핑 스키마
 * Phase 11: Web Admin Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.
 */

export interface FormField {
  name: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'multiselect' | 'switch' | 'date' | 'uuid';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

export const productFormSchema: FormField[] = [
  {
    name: 'name',
    type: 'text',
    label: '상품명',
    required: true,
    placeholder: '상품명을 입력하세요',
    options: undefined,
    validation: {
        "minLength": 1,
        "maxLength": 200
    },
  },
  {
    name: 'brand_id',
    type: 'uuid',
    label: '브랜드',
    required: true,
    placeholder: '브랜드 ID',
    options: undefined,
    validation: undefined,
  },
  {
    name: 'line_id',
    type: 'uuid',
    label: '라인',
    required: false,
    placeholder: '라인 ID',
    options: undefined,
    validation: undefined,
  },
  {
    name: 'description',
    type: 'textarea',
    label: '상품 설명',
    required: false,
    placeholder: '상품 설명을 입력하세요',
    options: undefined,
    validation: {
        "maxLength": 5000
    },
  },
  {
    name: 'base_price',
    type: 'number',
    label: '기본가',
    required: true,
    placeholder: '0',
    options: undefined,
    validation: {
        "min": 0
    },
  },
  {
    name: 'sale_price',
    type: 'number',
    label: '할인가',
    required: false,
    placeholder: '0',
    options: undefined,
    validation: {
        "min": 0
    },
  }
];

export default productFormSchema;
