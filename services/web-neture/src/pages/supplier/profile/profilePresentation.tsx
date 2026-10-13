import type { ContactVisibility } from '../../../lib/api';

export const SUPPLIER_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending: { label: '승인 대기 중', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  active: { label: '활성', cls: 'bg-green-100 text-green-700 border-green-200' },
  approved: { label: '승인됨', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  suspended: { label: '이용 정지', cls: 'bg-red-100 text-red-700 border-red-200' },
  rejected: { label: '거절됨', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const VISIBILITY_OPTIONS: { value: ContactVisibility; label: string; desc: string }[] = [
  { value: 'public', label: '전체 공개', desc: '모든 판매자에게 표시' },
  // 'partners' = 공급 승인(PRIVATE) 된 거래 매장 — Legacy Partner 와 무관한 물리 enum 값(라벨만 정정)
  { value: 'partners', label: '승인 거래처만', desc: '공급 승인된 매장(거래처)에게만 표시' },
  { value: 'private', label: '비공개', desc: '본인만 확인 가능' },
];

export function VisibilitySelector({
  value,
  onChange,
}: {
  value: ContactVisibility;
  onChange: (v: ContactVisibility) => void;
}) {
  return (
    <div className="flex gap-1.5 mt-2">
      {VISIBILITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          title={opt.desc}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            value === opt.value
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export const inputClass =
  'w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
export const disabledInputClass =
  'w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed';
export const fileInputClass =
  'block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200';
