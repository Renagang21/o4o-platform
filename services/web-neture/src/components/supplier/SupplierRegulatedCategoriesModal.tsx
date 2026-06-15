/**
 * SupplierRegulatedCategoriesModal — WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1
 *
 * 운영자/admin 공급자 품목군 검토 모달. operator/admin 공용 — api 객체를 주입받아 사용.
 * O4O 는 법적 허가를 인증하지 않으며, 내부 등록 가능 상태만 관리한다.
 */
import { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import {
  REGULATED_CATEGORY_LABELS,
  REGULATED_CATEGORY_STATUS_LABELS,
  type SupplierRegulatedCategory,
  type RegulatedCategory,
  type RegulatedCategoryStatus,
} from '../../lib/api';

const STATUS_BADGE: Record<string, string> = {
  not_requested: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  needs_update: 'bg-amber-100 text-amber-700',
  suspended: 'bg-gray-200 text-gray-600',
};

const REVIEW_OPTIONS: RegulatedCategoryStatus[] = ['approved', 'needs_update', 'rejected', 'suspended'];

export interface RegulatedCategoryReviewApi {
  listRegulatedCategories(id: string): Promise<SupplierRegulatedCategory[]>;
  reviewRegulatedCategory(
    id: string,
    category: RegulatedCategory,
    body: { status: RegulatedCategoryStatus; reviewNote?: string },
  ): Promise<{ success: boolean; error?: string }>;
  downloadRegulatedEvidence(id: string, category: RegulatedCategory): Promise<Blob | null>;
}

interface Props {
  supplierId: string;
  supplierName: string;
  api: RegulatedCategoryReviewApi;
  onClose: () => void;
}

export default function SupplierRegulatedCategoriesModal({ supplierId, supplierName, api, onClose }: Props) {
  const [rows, setRows] = useState<SupplierRegulatedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<RegulatedCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const data = await api.listRegulatedCategories(supplierId);
    setRows(data);
    setNotes(Object.fromEntries(data.map((r) => [r.category, r.reviewNote || ''])));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  const handleReview = async (category: RegulatedCategory, status: RegulatedCategoryStatus) => {
    setError(null);
    setBusy(category);
    const result = await api.reviewRegulatedCategory(supplierId, category, { status, reviewNote: notes[category] });
    if (!result.success) setError(result.error || '검토 상태 변경에 실패했습니다.');
    await load();
    setBusy(null);
  };

  const handleDownload = async (category: RegulatedCategory) => {
    const blob = await api.downloadRegulatedEvidence(supplierId, category);
    if (!blob) {
      setError('증빙 문서를 열 수 없습니다.');
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-800">공급 예정 품목군 검토</h3>
            <p className="text-xs text-slate-500 mt-0.5">{supplierName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-3">
          {loading ? (
            <div className="py-10 text-center text-slate-400 text-sm">불러오는 중...</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">신청한 품목군이 없습니다.</div>
          ) : (
            rows.map((row) => (
              <div key={row.category} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-800">
                    {REGULATED_CATEGORY_LABELS[row.category] || row.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] || 'bg-gray-100 text-gray-600'}`}>
                    {REGULATED_CATEGORY_STATUS_LABELS[row.status] || row.status}
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                  {row.registrationNumber && <div>허가/신고 번호: {row.registrationNumber}</div>}
                  <div className="flex items-center gap-2">
                    증빙:
                    {row.evidenceDocument ? (
                      <button
                        type="button"
                        onClick={() => handleDownload(row.category)}
                        className="inline-flex items-center gap-1 text-primary-700 hover:text-primary-800"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {row.evidenceDocument.fileName}
                      </button>
                    ) : (
                      <span className="text-slate-400">미제출</span>
                    )}
                  </div>
                </div>

                <textarea
                  value={notes[row.category] ?? ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [row.category]: e.target.value }))}
                  placeholder="검토 메모 (반려/보완 사유 등)"
                  rows={2}
                  className="mt-3 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />

                <div className="mt-2 flex flex-wrap gap-2">
                  {REVIEW_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy === row.category}
                      onClick={() => handleReview(row.category, status)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {busy === row.category && <Loader2 className="w-3 h-3 animate-spin" />}
                      {REGULATED_CATEGORY_STATUS_LABELS[status]}(으)로 설정
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
