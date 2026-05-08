/**
 * EventOfferApprovalsPage — K-Cosmetics 이벤트 오퍼 승인
 *
 * WO-O4O-EVENT-OFFER-KCOS-OPERATOR-APPROVAL-V1
 *
 * Neture 공급자가 multi-service proposal로 K-Cos에 제안한 pending OPL을
 * K-Cos 운영자가 승인/반려한다.
 *
 * 라우팅: /operator/event-offers
 */

import { useEffect, useState, useCallback } from 'react';
import { Tag } from 'lucide-react';
import { BaseDetailDrawer } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { toast } from '@o4o/error-handling';
import {
  cosmeticsEventOfferAdminApi,
  type PendingListing,
  type EventOfferApiError,
} from '../../api/eventOfferAdmin';
import { GuideBlock } from '@o4o/shared-space-ui';
import { fetchGuidePageContent } from '../../api/guideContent';

const GUIDE_PAGE_KEY = 'event.offer.management';
const SERVICE_KEY = 'k-cosmetics';

function formatDate(iso: string): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

function formatPrice(value: number | null): string {
  if (value == null) return '-';
  return '₩' + value.toLocaleString('ko-KR');
}

export default function EventOfferApprovalsPage() {
  const [items, setItems] = useState<PendingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PendingListing | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [guideTitle, setGuideTitle] = useState<string | null>(null);
  const [guideDesc, setGuideDesc] = useState<string | null>(null);
  const [guideSteps, setGuideSteps] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGuidePageContent(SERVICE_KEY, GUIDE_PAGE_KEY)
      .then(sections => {
        if (cancelled) return;
        const raw = sections['guideblock-page-help'];
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.title) setGuideTitle(parsed.title);
          if (parsed.description) setGuideDesc(parsed.description);
          if (Array.isArray(parsed.steps)) setGuideSteps(parsed.steps);
        } catch { /* use fallback */ }
      })
      .catch(() => { /* use fallback */ });
    return () => { cancelled = true; };
  }, []);

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cosmeticsEventOfferAdminApi.listPendingEventOffers(1, 50);
      setItems(res.data.data ?? []);
    } catch (err: any) {
      const apiErr = err?.response?.data?.error as EventOfferApiError | undefined;
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setError('운영자 권한이 필요합니다.');
      } else {
        setError(apiErr?.message ?? '목록을 불러오지 못했습니다.');
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const handleApprove = async () => {
    if (!selectedItem || isProcessing) return;
    setIsProcessing(true);
    try {
      await cosmeticsEventOfferAdminApi.approveEventOffer(selectedItem.id);
      setItems(prev => prev.filter(p => p.id !== selectedItem.id));
      setSelectedItem(null);
      setRejectReason('');
      toast.success(`"${selectedItem.productName}" 이(가) 승인되었습니다.`);
    } catch (err: any) {
      const apiErr = err?.response?.data?.error as EventOfferApiError | undefined;
      toast.error(apiErr?.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem || isProcessing) return;
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      toast.error('반려 사유를 입력해 주세요.');
      return;
    }
    setIsProcessing(true);
    try {
      await cosmeticsEventOfferAdminApi.rejectEventOffer(selectedItem.id, trimmed);
      setItems(prev => prev.filter(p => p.id !== selectedItem.id));
      setSelectedItem(null);
      setRejectReason('');
      toast.success(`"${selectedItem.productName}" 이(가) 반려되었습니다.`);
    } catch (err: any) {
      const apiErr = err?.response?.data?.error as EventOfferApiError | undefined;
      toast.error(apiErr?.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const columns: ListColumnDef<PendingListing>[] = [
    {
      key: 'productName',
      header: '상품명',
      render: (_v, item) => (
        <span className="text-sm font-medium text-slate-800">{item.productName}</span>
      ),
    },
    {
      key: 'supplierName',
      header: '공급사 / 제안자',
      render: (_v, item) => (
        <div>
          <p className="text-sm text-slate-700">{item.supplierName}</p>
          {item.requestedByEmail && (
            <p className="text-xs text-slate-400 mt-0.5">{item.requestedByEmail}</p>
          )}
        </div>
      ),
    },
    {
      key: 'price',
      header: '가격',
      width: '120px',
      render: (_v, item) => (
        <span className="text-sm font-semibold text-slate-700">{formatPrice(item.price)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: '제안일',
      width: '160px',
      sortable: true,
      sortAccessor: (item) => new Date(item.createdAt).getTime(),
      render: (_v, item) => (
        <span className="text-xs text-slate-500">{formatDate(item.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag size={24} className="text-pink-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">이벤트 오퍼 승인</h1>
            <p className="text-slate-500 mt-1">
              공급자가 제안한 K-Cosmetics 이벤트를 검토하고 승인/반려합니다.
            </p>
          </div>
        </div>
        <button
          onClick={loadPending}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50"
        >
          새로고침
        </button>
      </div>

      {/* GuideBlock */}
      <GuideBlock
        variant="info"
        title={guideTitle ?? '이벤트 오퍼 승인 절차를 안내합니다.'}
        description={guideDesc ?? '공급자가 제안한 이벤트 오퍼를 검토하고 K-Cosmetics 노출 여부를 결정합니다.'}
        steps={guideSteps ?? [
          '대기 중인 이벤트 오퍼 목록을 확인합니다',
          '제품 정보·가격·기간 등 제안 내용을 검토합니다',
          '승인 시 즉시 K-Cosmetics에 노출됩니다',
          '반려 시 사유를 입력하면 공급자에게 전달됩니다',
        ]}
        compact
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <DataTable<PendingListing>
        columns={columns}
        data={items}
        rowKey="id"
        loading={loading}
        onRowClick={(item) => { setSelectedItem(item); setRejectReason(''); }}
        emptyMessage="승인 대기중인 이벤트가 없습니다"
        tableId="kcos-event-offer-approvals"
      />

      <BaseDetailDrawer
        open={!!selectedItem}
        onClose={() => { setSelectedItem(null); setRejectReason(''); }}
        title={selectedItem?.productName ?? ''}
        width={520}
        actions={[
          { label: '반려', onClick: handleReject, variant: 'danger' as const, loading: isProcessing, disabled: isProcessing },
          { label: '승인', onClick: handleApprove, variant: 'primary' as const, loading: isProcessing, disabled: isProcessing },
        ]}
      >
        {selectedItem && (
          <div className="space-y-4">
            {[
              { label: '공급사', value: selectedItem.supplierName },
              { label: '제안자', value: selectedItem.requestedByEmail || '-' },
              { label: '가격', value: formatPrice(selectedItem.price) },
              { label: '제안일', value: formatDate(selectedItem.createdAt) },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: '#64748b', minWidth: 70, flexShrink: 0 }}>{item.label}</span>
                <span style={{ color: '#1e293b' }}>{item.value}</span>
              </div>
            ))}

            <div className="pt-4 border-t border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                반려 사유 <span className="text-slate-400 font-normal">(반려 시 필수)</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="반려 사유를 입력해 주세요"
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}
