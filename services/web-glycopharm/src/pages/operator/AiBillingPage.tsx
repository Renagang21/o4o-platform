/**
 * AiBillingPage — WO-O4O-AI-BILLING-DATA-SYSTEM-V1
 * WO-O4O-TABLE-STANDARD-V2 — DataTable 표준 전환
 * WO-O4O-TABLE-STANDARD-V4-CLEANUP — ActionPolicy + confirm/alert 제거
 *
 * AI 정산 데이터 관리: 생성 / 확정 / 결제 완료 / 조정 / CSV 내보내기
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  FileText,
  Download,
  CheckCircle,
  CreditCard,
  RefreshCw,
  Plus,
  Edit3,
} from 'lucide-react';
import { DataTable, RowActionMenu } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import { toast } from '@o4o/error-handling';
import { api, API_BASE_URL } from '@/lib/apiClient';

interface BillingSummary {
  id: number;
  period: string;
  serviceKey: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  adjustmentAmount: number;
  finalCost: number;
  status: string;
  note: string | null;
  generatedAt: string;
  confirmedAt: string | null;
  paidAt: string | null;
}

const AI_ADMIN_BASE = `${API_BASE_URL}/api/ai/admin`;

// ─── Action Policy (V4-CLEANUP) ────────────────────────────

const billingActionPolicy = defineActionPolicy<BillingSummary>('glycopharm:ai-billing', {
  inlineMax: 2,
  rules: [
    {
      key: 'adjust',
      label: '조정',
      visible: (b) => b.status === 'draft',
    },
    {
      key: 'confirm-billing',
      label: '확정',
      variant: 'primary',
      visible: (b) => b.status === 'draft',
      confirm: {
        title: '정산 확정',
        message: '이 정산을 확정하시겠습니까? 확정 후 수정이 불가합니다.',
        variant: 'warning',
        confirmText: '확정',
      },
    },
    {
      key: 'paid',
      label: '결제 완료',
      variant: 'primary',
      visible: (b) => b.status === 'confirmed',
      confirm: {
        title: '결제 완료 처리',
        message: '결제 완료로 처리하시겠습니까?',
        confirmText: '완료',
      },
    },
    {
      key: 'export',
      label: 'CSV 내보내기',
    },
  ],
});

const BILLING_ACTION_ICONS: Record<string, ReactNode> = {
  adjust: <Edit3 className="w-4 h-4" />,
  'confirm-billing': <CheckCircle className="w-4 h-4" />,
  paid: <CreditCard className="w-4 h-4" />,
  export: <Download className="w-4 h-4" />,
};

export default function AiBillingPage() {
  const [billings, setBillings] = useState<BillingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateMonth, setGenerateMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [adjustModal, setAdjustModal] = useState<{ id: number; current: number } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');

  const fetchBillings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`${AI_ADMIN_BASE}/billing`);
      if (res.data?.success) setBillings(res.data.data);
    } catch (err) {
      console.error('[AiBilling] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBillings(); }, [fetchBillings]);

  const handleGenerate = async () => {
    if (!generateMonth) return;
    try {
      await api.post(`${AI_ADMIN_BASE}/billing/generate?month=${generateMonth}`);
      fetchBillings();
    } catch (err: any) {
      toast.error(err.response?.data?.error || '정산 생성에 실패했습니다.');
    }
  };

  const executeConfirm = async (id: number) => {
    try {
      await api.put(`${AI_ADMIN_BASE}/billing/${id}/confirm`);
      fetchBillings();
    } catch (err: any) {
      toast.error(err.response?.data?.error || '확정에 실패했습니다.');
    }
  };

  const executePaid = async (id: number) => {
    try {
      await api.put(`${AI_ADMIN_BASE}/billing/${id}/paid`);
      fetchBillings();
    } catch (err: any) {
      toast.error(err.response?.data?.error || '결제 완료 처리에 실패했습니다.');
    }
  };

  const handleExport = async (id: number) => {
    try {
      const res = await api.get(`${AI_ADMIN_BASE}/billing/${id}/export.csv`, { responseType: 'blob' });
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : `ai-billing-${id}.csv`;
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('CSV 내보내기에 실패했습니다.');
    }
  };

  const handleAdjustSubmit = async () => {
    if (!adjustModal) return;
    try {
      await api.put(`${AI_ADMIN_BASE}/billing/${adjustModal.id}/adjustment`, {
        amount: Number(adjustAmount),
        note: adjustNote || undefined,
      });
      setAdjustModal(null);
      setAdjustAmount('');
      setAdjustNote('');
      fetchBillings();
    } catch (err: any) {
      toast.error(err.response?.data?.error || '조정에 실패했습니다.');
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      confirmed: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
    };
    const labels: Record<string, string> = { draft: '초안', confirmed: '확정', paid: '결제완료' };
    return (
      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  // ─── Column Definitions ───

  const columns: Column<BillingSummary>[] = [
    {
      key: 'period',
      title: '기간',
      render: (_v, b) => <span className="font-medium text-gray-900">{b.period}</span>,
    },
    {
      key: 'serviceKey',
      title: '서비스',
      render: (_v, b) => (
        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
          b.serviceKey === 'care' ? 'bg-purple-100 text-purple-700' :
          b.serviceKey === 'store' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>{b.serviceKey}</span>
      ),
    },
    {
      key: 'totalRequests',
      title: '요청수',
      align: 'right',
      render: (_v, b) => b.totalRequests.toLocaleString(),
    },
    {
      key: 'totalTokens',
      title: '토큰',
      align: 'right',
      render: (_v, b) => <span className="text-gray-500">{formatTokens(b.totalTokens)}</span>,
    },
    {
      key: 'totalCost',
      title: '비용',
      align: 'right',
      render: (_v, b) => <span className="text-gray-500">${b.totalCost.toFixed(4)}</span>,
    },
    {
      key: 'adjustmentAmount',
      title: '조정',
      align: 'right',
      render: (_v, b) => {
        if (b.adjustmentAmount !== 0) {
          return (
            <span className={b.adjustmentAmount < 0 ? 'text-red-600' : 'text-green-600'}>
              {b.adjustmentAmount > 0 ? '+' : ''}${b.adjustmentAmount.toFixed(4)}
            </span>
          );
        }
        return <span className="text-gray-300">-</span>;
      },
    },
    {
      key: 'finalCost',
      title: '최종 비용',
      align: 'right',
      render: (_v, b) => <span className="font-medium text-gray-900">${b.finalCost.toFixed(4)}</span>,
    },
    {
      key: 'status',
      title: '상태',
      align: 'center',
      render: (_v, b) => statusBadge(b.status),
    },
    {
      key: '_actions',
      title: '액션',
      align: 'center',
      width: '80px',
      render: (_v, b) => (
        <RowActionMenu
          actions={buildRowActions(billingActionPolicy, b, {
            adjust: () => { setAdjustModal({ id: b.id, current: b.adjustmentAmount }); setAdjustAmount(String(b.adjustmentAmount)); },
            'confirm-billing': () => executeConfirm(b.id),
            paid: () => executePaid(b.id),
            export: () => handleExport(b.id),
          }, {
            icons: BILLING_ACTION_ICONS,
          })}
          inlineMax={billingActionPolicy.inlineMax}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 정산 관리</h1>
          <p className="text-sm text-gray-500 mt-1">월별 AI 사용량 기반 정산 데이터 생성 및 관리</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={generateMonth}
            onChange={(e) => setGenerateMonth(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            생성
          </button>
          <button
            onClick={fetchBillings}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Billing Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-800">정산 목록</h2>
        </div>
        <DataTable<BillingSummary>
          columns={columns}
          dataSource={billings}
          rowKey="id"
          loading={loading}
          emptyText="정산 데이터 없음"
        />
      </div>

      {/* Adjustment Modal */}
      {adjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-96 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">비용 조정</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">조정 금액 ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="음수: 할인, 양수: 추가"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사유 (선택)</label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="조정 사유 입력"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => { setAdjustModal(null); setAdjustAmount(''); setAdjustNote(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                취소
              </button>
              <button
                onClick={handleAdjustSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
