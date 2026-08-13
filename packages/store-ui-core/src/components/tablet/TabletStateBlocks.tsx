/**
 * TabletStateBlocks — loading / 태블릿 없음 / error 블록
 * WO-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1
 *
 * 조회 실패(error)를 "태블릿이 없습니다"(empty) 로 위장하지 않는다 — 두 블록은 독립이다.
 */

import { AlertTriangle, Loader2, Tablet } from 'lucide-react';

export function TabletLoadingBlock({
  spinnerClass = 'text-teal-600',
  message,
  size = 'lg',
}: {
  spinnerClass?: string;
  message: string;
  size?: 'lg' | 'sm';
}) {
  const big = size === 'lg';
  return (
    <div className={`flex items-center justify-center ${big ? 'py-16' : 'py-12'}`}>
      <Loader2 className={`${big ? 'w-8 h-8' : 'w-6 h-6'} ${spinnerClass} animate-spin`} />
      <span className="ml-3 text-slate-400">{message}</span>
    </div>
  );
}

export function TabletEmptyBlock({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
      <Tablet className="w-16 h-16 text-slate-200 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500">{hint}</p>
    </div>
  );
}

export function TabletErrorBlock({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}

export function TabletToastBlock({
  toast,
}: {
  toast: { type: 'success' | 'error'; message: string };
}) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium"
      style={{
        backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
        borderColor: toast.type === 'success' ? '#86efac' : '#fecaca',
        color: toast.type === 'success' ? '#166534' : '#991b1b',
      }}
    >
      {toast.message}
    </div>
  );
}

export function TabletChangesBadge({ small }: { small?: boolean }) {
  return (
    <span
      className={`text-xs text-amber-600 font-medium bg-amber-50 px-2 ${small ? 'py-0.5' : 'py-1'} rounded`}
    >
      변경사항 있음
    </span>
  );
}
