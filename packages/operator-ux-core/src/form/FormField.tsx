/**
 * FormField — Edit 모드 라벨+입력 한 줄 편집
 *
 * WO-O4O-FORM-PRIMITIVES-EXTRACTION-V1
 *
 * O4O Form Standard v1.0 §6.3 — edit 모드 전용.
 * 라벨 + children(input/select/textarea) + 선택적 에러 메시지.
 *
 * 입력 요소 자체의 스타일은 children이 책임. 본 컴포넌트는 라벨/required/에러 슬롯만 담당.
 */

import type { ReactNode } from 'react';

export interface FormFieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  error?: string | null;
  hint?: string;
  className?: string;
}

export function FormField({
  label,
  children,
  required = false,
  error,
  hint,
  className = '',
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
