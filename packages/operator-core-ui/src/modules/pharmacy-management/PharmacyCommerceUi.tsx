/**
 * Neture 약국 commerce 화면 공용 소품 — 상태 배지 · 상태 필터 · 처리 버튼 · 메시지
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1
 */
import type { ReactNode } from 'react';
import { STATUS_CLASS, STATUS_LABEL } from './api';

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {label ?? STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function StatusFilter({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value || 'all'}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-3 py-1 text-sm ${
            value === o.value ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const DANGER_ACTIONS = new Set(['reject', 'suspend', 'terminate', 'end', 'cancel', 'archive']);

export function ActionButton({
  label,
  action,
  disabled,
  onClick,
}: {
  label: string;
  action: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const danger = DANGER_ACTIONS.has(action);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
        danger ? 'border border-red-200 bg-white text-red-600 hover:bg-red-50' : 'bg-primary-600 text-white hover:bg-primary-700'
      }`}
    >
      {label}
    </button>
  );
}

/** 반려 · 정지 · 종료 · 취소처럼 사유가 의미 있는 동작은 사유를 받는다. null = 사용자가 취소. */
export function askReason(actionLabel: string): string | null {
  const v = window.prompt(`${actionLabel} 사유를 입력하시기 바랍니다 (선택)`, '');
  return v === null ? null : v.trim();
}

export function Message({ message }: { message: { type: 'success' | 'error'; text: string } | null }) {
  if (!message) return null;
  return (
    <div
      className={`rounded-md border px-4 py-2 text-sm ${
        message.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'
      }`}
    >
      {message.text}
    </div>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/**
 * 표의 빈 상태 행.
 * - 기본(tone 없음): 불러오는 중 · 0건 같은 안내.
 * - tone="error": 조회 실패. '목록 없음'과 구분되게 붉은 글자 · role="alert" 로 보이고,
 *   onRetry 를 주면 [다시 시도] 버튼을 함께 그린다.
 * 기존 호출(colSpan · text 만)은 그대로 동작한다.
 */
export function EmptyRow({
  colSpan,
  text,
  tone,
  onRetry,
  retryLabel = '다시 시도',
}: {
  colSpan: number;
  text: string;
  tone?: 'error';
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const isError = tone === 'error';
  return (
    <tr>
      <td
        colSpan={colSpan}
        role={isError ? 'alert' : undefined}
        className={`px-4 py-10 text-center text-sm ${isError ? 'text-red-700' : 'text-gray-400'}`}
      >
        {text}
        {onRetry && (
          <>
            {' '}
            <button type="button" onClick={onRetry} className="font-medium underline">
              {retryLabel}
            </button>
          </>
        )}
      </td>
    </tr>
  );
}

export const TH = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500';
export const TD = 'px-3 py-2 text-sm text-gray-700 align-top';
export const INPUT = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none';
