/**
 * ProductCurationPage — 운영자 큐레이션 관리
 *
 * WO-NETURE-PRODUCT-CURATION-V1
 *
 * 승인된 Offer 중 operator가 노출 선택(큐레이션)하는 레이어.
 * featured / category / banner 위치별 큐레이션.
 * position + 기간(startAt/endAt) + 활성(isActive) 제어.
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { operatorCurationApi, type CurationItem } from '../../lib/api';

const PLACEMENT_OPTIONS = [
  { value: 'featured', label: '추천 (Featured)' },
  { value: 'category', label: '카테고리 (Category)' },
  { value: 'banner', label: '배너 (Banner)' },
];

const PLACEMENT_LABEL: Record<string, string> = {
  featured: '추천',
  category: '카테고리',
  banner: '배너',
};

const PLACEMENT_STYLE: Record<string, string> = {
  featured: 'bg-purple-50 text-purple-700',
  category: 'bg-blue-50 text-blue-700',
  banner: 'bg-amber-50 text-amber-700',
};

interface CreateForm {
  offerId: string;
  serviceKey: string;
  placement: string;
  categoryId: string;
  position: number;
  isActive: boolean;
  startAt: string;
  endAt: string;
}

const emptyForm: CreateForm = {
  offerId: '',
  serviceKey: 'neture',
  placement: 'featured',
  categoryId: '',
  position: 0,
  isActive: true,
  startAt: '',
  endAt: '',
};

export default function ProductCurationPage() {
  const [items, setItems] = useState<CurationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlacement, setFilterPlacement] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadCurations = useCallback(async () => {
    setLoading(true);
    const data = await operatorCurationApi.list({
      placement: filterPlacement || undefined,
    });
    setItems(data);
    setLoading(false);
  }, [filterPlacement]);

  useEffect(() => {
    loadCurations();
  }, [loadCurations]);

  const openCreate = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!form.offerId.trim()) {
      toast.error('Offer ID를 입력하세요');
      return;
    }
    if (!form.placement) {
      toast.error('위치를 선택하세요');
      return;
    }
    setSaving(true);
    try {
      const res = await operatorCurationApi.create({
        offerId: form.offerId.trim(),
        serviceKey: form.serviceKey,
        placement: form.placement,
        categoryId: form.categoryId || null,
        position: form.position,
        isActive: form.isActive,
        startAt: form.startAt || null,
        endAt: form.endAt || null,
      });
      if (!res.success) {
        const messages: Record<string, string> = {
          OFFER_NOT_FOUND: '해당 Offer를 찾을 수 없습니다',
          OFFER_NOT_APPROVED: '승인된 Offer만 큐레이션 등록이 가능합니다',
          DUPLICATE_CURATION: '이미 등록된 큐레이션입니다',
        };
        throw new Error(messages[res.error || ''] || res.message || res.error || '등록 실패');
      }
      toast.success('큐레이션이 등록되었습니다');
      setShowModal(false);
      loadCurations();
    } catch (err: any) {
      toast.error(err?.message || '등록 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: CurationItem) => {
    const res = await operatorCurationApi.update(item.id, { isActive: !item.isActive });
    if (res.success) {
      toast.success(item.isActive ? '비활성화되었습니다' : '활성화되었습니다');
      loadCurations();
    } else {
      toast.error('변경 실패');
    }
  };

  const handleDelete = async (item: CurationItem) => {
    if (!confirm(`"${item.productName}" 큐레이션을 삭제하시겠습니까?`)) return;
    const res = await operatorCurationApi.remove(item.id);
    if (res.success) {
      toast.success('삭제되었습니다');
      loadCurations();
    } else {
      toast.error('삭제 실패');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">큐레이션 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            승인된 상품의 노출 위치와 순서를 관리합니다.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          큐레이션 등록
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filterPlacement}
          onChange={(e) => setFilterPlacement(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">전체 위치</option>
          {PLACEMENT_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 w-20">#</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 w-28">위치</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">상품명</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 w-28">바코드</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 w-24">브랜드</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600 w-24">공급가</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 w-20">유통</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 w-20">활성</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 w-40">기간</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600 w-24">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                  등록된 큐레이션이 없습니다.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-500 font-mono">{item.position}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${PLACEMENT_STYLE[item.placement] || 'bg-slate-100 text-slate-600'}`}>
                    {PLACEMENT_LABEL[item.placement] || item.placement}
                  </span>
                  {item.categoryName && (
                    <span className="block text-xs text-slate-400 mt-0.5">{item.categoryName}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{item.productName || '-'}</td>
                <td className="px-4 py-3 text-xs font-mono text-slate-500">{item.barcode || '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.brandName || '-'}</td>
                <td className="px-4 py-3 text-sm text-right text-slate-700">
                  {item.priceGeneral != null ? `${Number(item.priceGeneral).toLocaleString()}원` : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    item.distributionType === 'PUBLIC' ? 'bg-green-50 text-green-700' :
                    item.distributionType === 'SERVICE' ? 'bg-blue-50 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {item.distributionType === 'PUBLIC' ? '공개' : item.distributionType === 'SERVICE' ? '서비스' : item.distributionType || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleActive(item)}
                    className={`p-1 rounded ${item.isActive ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                    title={item.isActive ? '활성 (클릭하여 비활성화)' : '비활성 (클릭하여 활성화)'}
                  >
                    {item.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {item.startAt || item.endAt ? (
                    <>
                      {item.startAt ? new Date(item.startAt).toLocaleDateString('ko-KR') : '시작 없음'}
                      {' ~ '}
                      {item.endAt ? new Date(item.endAt).toLocaleDateString('ko-KR') : '종료 없음'}
                    </>
                  ) : (
                    <span className="text-slate-300">상시</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">큐레이션 등록</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Offer ID */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Offer ID *</label>
                <input
                  type="text"
                  value={form.offerId}
                  onChange={(e) => setForm((f) => ({ ...f, offerId: e.target.value }))}
                  placeholder="승인된 Offer의 UUID"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-1">공급 현황 페이지에서 Offer ID를 확인할 수 있습니다</p>
              </div>

              {/* Service Key */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">서비스</label>
                <input
                  type="text"
                  value={form.serviceKey}
                  onChange={(e) => setForm((f) => ({ ...f, serviceKey: e.target.value }))}
                  placeholder="neture"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Placement */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">위치 *</label>
                <select
                  value={form.placement}
                  onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {PLACEMENT_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Category ID (category placement only) */}
              {form.placement === 'category' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">카테고리 ID</label>
                  <input
                    type="text"
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                    placeholder="카테고리 UUID (선택)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              )}

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">순서 (Position)</label>
                <input
                  type="number"
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: Number(e.target.value) || 0 }))}
                  min={0}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-400 mt-1">숫자가 작을수록 먼저 표시됩니다</p>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">시작일</label>
                  <input
                    type="date"
                    value={form.startAt}
                    onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">종료일</label>
                  <input
                    type="date"
                    value={form.endAt}
                    onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700">활성화 상태로 등록</span>
              </label>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
