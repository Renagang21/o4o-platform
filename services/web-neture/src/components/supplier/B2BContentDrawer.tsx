/**
 * B2BContentDrawer
 *
 * WO-NETURE-B2B-CONTENT-MANAGEMENT-V1
 *
 * B2B 콘텐츠 편집 Drawer.
 * - 현재 B2C 콘텐츠 참조 (읽기전용)
 * - B2B 콘텐츠 편집 (textarea)
 * - "B2C에서 복사" 버튼
 */

import { useState, useEffect } from 'react';
import { supplierApi, type SupplierProduct } from '../../lib/api/supplier';

interface B2BContentDrawerProps {
  product: SupplierProduct | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

export default function B2BContentDrawer({ product, open, onClose, onSaved }: B2BContentDrawerProps) {
  const [businessShort, setBusinessShort] = useState('');
  const [businessDetail, setBusinessDetail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product && open) {
      setBusinessShort(stripHtml(product.businessShortDescription));
      setBusinessDetail(stripHtml(product.businessDetailDescription));
      setError(null);
    }
  }, [product, open]);

  if (!open || !product) return null;

  const consumerShort = stripHtml(product.consumerShortDescription);
  const consumerDetail = stripHtml(product.consumerDetailDescription);
  const hasB2B = !!(product.businessShortDescription || product.businessDetailDescription);

  const handleCopyFromConsumer = () => {
    if (consumerShort && !businessShort) setBusinessShort(consumerShort);
    if (consumerDetail && !businessDetail) setBusinessDetail(consumerDetail);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await supplierApi.updateBusinessContent(product.id, {
        businessShortDescription: businessShort.trim() || null,
        businessDetailDescription: businessDetail.trim() || null,
      });
      if (!result.success) {
        setError(result.error || '저장에 실패했습니다.');
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-gray-900">B2B 콘텐츠 편집</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="flex-1 px-6 py-4 space-y-6">
          {/* Product info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900">{product.name || product.masterName}</p>
            <p className="text-xs text-gray-500 mt-1">바코드: {product.barcode || '-'}</p>
            <div className="mt-2">
              {hasB2B ? (
                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">B2B 설정됨</span>
              ) : (
                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded">B2C 사용 중</span>
              )}
            </div>
          </div>

          {/* Current B2C content (read-only) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">현재 B2C 콘텐츠 (참조)</h4>
              <button
                type="button"
                onClick={handleCopyFromConsumer}
                disabled={!consumerShort && !consumerDetail}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                B2C에서 복사
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500">짧은 설명</label>
                <p className="text-sm text-gray-600 bg-gray-50 rounded p-2 min-h-[2rem]">
                  {consumerShort || <span className="text-gray-400 italic">없음</span>}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">상세 설명</label>
                <p className="text-sm text-gray-600 bg-gray-50 rounded p-2 min-h-[2rem] line-clamp-4">
                  {consumerDetail || <span className="text-gray-400 italic">없음</span>}
                </p>
              </div>
            </div>
          </div>

          {/* B2B content (editable) */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">B2B 콘텐츠</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">짧은 설명 (B2B)</label>
                <textarea
                  value={businessShort}
                  onChange={(e) => setBusinessShort(e.target.value)}
                  rows={3}
                  placeholder="도매/파트너용 짧은 상품 설명"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">상세 설명 (B2B)</label>
                <textarea
                  value={businessDetail}
                  onChange={(e) => setBusinessDetail(e.target.value)}
                  rows={5}
                  placeholder="도매/파트너용 상세 상품 설명"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
