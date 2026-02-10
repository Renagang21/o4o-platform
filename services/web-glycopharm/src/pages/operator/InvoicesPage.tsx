/**
 * InvoicesPage
 *
 * WO-O4O-INVOICE-FINALIZATION-PHASE3D-CP1
 * WO-O4O-INVOICE-DISPATCH-PHASE3E-CP1
 *
 * 인보이스 관리 페이지.
 * - 목록 (DRAFT / CONFIRMED / ARCHIVED)
 * - DRAFT 생성 (Billing Preview → 스냅샷)
 * - DRAFT → CONFIRMED 전환 (확인 모달)
 * - 상세 보기 (스냅샷 근거 포함)
 * - CSV 내보내기
 * - Phase 3-E: 이메일 발송 / 수령 확인 / 발송 이력
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Download,
  ChevronDown,
  Plus,
  CheckCircle2,
  FileText,
  Eye,
  X,
  AlertTriangle,
  Send,
  Inbox,
  Clock,
  Mail,
} from 'lucide-react';
import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'ARCHIVED';
type BillingUnit = 'consultation_action' | 'approved_request';
type DispatchStatus = 'NONE' | 'SENT' | 'RECEIVED';
type StatusFilter = 'all' | InvoiceStatus;

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  DRAFT: { label: '초안', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  CONFIRMED: { label: '확정', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  ARCHIVED: { label: '보관', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
};

const DISPATCH_CONFIG: Record<DispatchStatus, { label: string; color: string; bg: string }> = {
  NONE: { label: '미발송', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
  SENT: { label: '발송', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  RECEIVED: { label: '수령', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
};

const UNIT_LABELS: Record<BillingUnit, string> = {
  consultation_action: 'Action',
  approved_request: 'Approved Request',
};

interface InvoiceLine {
  date: string;
  sourceId: string | null;
  requestId: string;
  actionType: string;
  unitPrice: number;
}

interface DispatchLogEntry {
  action: string;
  at: string;
  by: string;
  channel?: string;
  to?: string;
  note?: string;
}

interface Invoice {
  id: string;
  serviceKey: string;
  supplierId: string | null;
  pharmacyId: string | null;
  pharmacyName?: string;
  periodFrom: string;
  periodTo: string;
  unit: BillingUnit;
  unitPrice: number;
  count: number;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  snapshotAt: string;
  createdBy: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  lineSnapshot: InvoiceLine[] | null;
  metadata: Record<string, any> | null;
  dispatchStatus: DispatchStatus;
  dispatchedAt: string | null;
  dispatchedTo: string | null;
  receivedAt: string | null;
  dispatchLog: DispatchLogEntry[];
  createdAt: string;
  updatedAt: string;
}

interface PharmacyOption {
  id: string;
  name: string;
}

function fmt(n: number): string {
  return n.toLocaleString();
}

function krw(n: number): string {
  return `\u20A9${n.toLocaleString()}`;
}

function fmtDate(d: string): string {
  return d?.slice(0, 10) || '';
}

function fmtDateTime(d: string): string {
  if (!d) return '';
  return d.replace('T', ' ').slice(0, 19);
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pharmacies, setPharmacies] = useState<PharmacyOption[]>([]);
  const [createForm, setCreateForm] = useState({
    periodFrom: getDefaultFrom(),
    periodTo: getDefaultTo(),
    pharmacyId: '',
    supplierId: '',
    unit: 'consultation_action' as BillingUnit,
    unitPrice: 5000,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Confirm modal
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Detail modal
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);

  // Send modal (Phase 3-E)
  const [sendInvoiceId, setSendInvoiceId] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Dispatch log modal (Phase 3-E)
  const [dispatchLogInvoice, setDispatchLogInvoice] = useState<{ invoiceId: string; log: DispatchLogEntry[]; dispatchStatus: string } | null>(null);

  function getDefaultFrom(): string {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  }

  function getDefaultTo(): string {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

  // Fetch pharmacy list
  useEffect(() => {
    (async () => {
      try {
        const accessToken = getAccessToken();
        const res = await fetch(`${API_BASE_URL}/api/v1/glycopharm/reports/pharmacies`, {
          headers: { ...(accessToken && { Authorization: `Bearer ${accessToken}` }) },
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success) setPharmacies(json.data || []);
      } catch { /* silent */ }
    })();
  }, []);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = getAccessToken();
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(
        `${API_BASE_URL}/api/v1/glycopharm/invoices?${params.toString()}`,
        {
          headers: { ...(accessToken && { Authorization: `Bearer ${accessToken}` }) },
          credentials: 'include',
        },
      );
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Unknown error');
      setInvoices(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Create draft
  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const accessToken = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/glycopharm/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          periodFrom: createForm.periodFrom,
          periodTo: createForm.periodTo,
          pharmacyId: createForm.pharmacyId || undefined,
          supplierId: createForm.supplierId || undefined,
          unit: createForm.unit,
          unitPrice: createForm.unitPrice,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to create invoice');
      setShowCreateModal(false);
      fetchInvoices();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Confirm invoice
  const handleConfirm = async (invoiceId: string) => {
    setConfirming(true);
    try {
      const accessToken = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/glycopharm/invoices/${invoiceId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        credentials: 'include',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to confirm');
      setConfirmingId(null);
      fetchInvoices();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setConfirming(false);
    }
  };

  // View detail
  const handleViewDetail = async (invoiceId: string) => {
    try {
      const accessToken = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/glycopharm/invoices/${invoiceId}`, {
        headers: { ...(accessToken && { Authorization: `Bearer ${accessToken}` }) },
        credentials: 'include',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDetailInvoice(json.data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Send invoice (Phase 3-E)
  const handleSend = async () => {
    if (!sendInvoiceId || !sendEmail) return;
    setSending(true);
    setSendError(null);
    try {
      const accessToken = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/glycopharm/invoices/${sendInvoiceId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        credentials: 'include',
        body: JSON.stringify({ recipientEmail: sendEmail }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to send');
      setSendInvoiceId(null);
      setSendEmail('');
      fetchInvoices();
    } catch (err: any) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  // Mark received (Phase 3-E)
  const handleMarkReceived = async (invoiceId: string) => {
    try {
      const accessToken = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/glycopharm/invoices/${invoiceId}/received`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        credentials: 'include',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to mark received');
      fetchInvoices();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // View dispatch log (Phase 3-E)
  const handleViewDispatchLog = async (invoiceId: string) => {
    try {
      const accessToken = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/glycopharm/invoices/${invoiceId}/dispatch-log`, {
        headers: { ...(accessToken && { Authorization: `Bearer ${accessToken}` }) },
        credentials: 'include',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDispatchLogInvoice({
        invoiceId: json.data.invoiceId,
        log: json.data.dispatchLog || [],
        dispatchStatus: json.data.dispatchStatus,
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  // CSV export for detail
  const handleCsvExport = (inv: Invoice) => {
    const lines: string[] = [];
    lines.push(`인보이스 스냅샷 (${inv.status})`);
    lines.push(`ID,${inv.id}`);
    lines.push(`기간,${fmtDate(inv.periodFrom)} ~ ${fmtDate(inv.periodTo)}`);
    if (inv.pharmacyName) lines.push(`약국,${inv.pharmacyName}`);
    lines.push(`청구 기준,${UNIT_LABELS[inv.unit]}`);
    lines.push(`단가,${inv.unitPrice}`);
    lines.push(`건수,${inv.count}`);
    lines.push(`금액,${inv.amount}`);
    lines.push(`상태,${STATUS_CONFIG[inv.status].label}`);
    lines.push(`스냅샷 시점,${inv.snapshotAt}`);
    if (inv.confirmedAt) lines.push(`확정 시점,${inv.confirmedAt}`);
    lines.push('');

    if (inv.lineSnapshot && inv.lineSnapshot.length > 0) {
      lines.push('=== 상세 근거 ===');
      lines.push('날짜,Source ID,Request ID,Action Type,단가');
      inv.lineSnapshot.forEach((d) => {
        lines.push(`${d.date},${d.sourceId || ''},${d.requestId},${d.actionType},${d.unitPrice}`);
      });
    }

    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${inv.id.slice(0, 8)}-${fmtDate(inv.periodFrom)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">인보이스 관리</h1>
          <p className="text-slate-500 mt-1">청구 스냅샷 · 초안/확정 · 발송/수령</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            DRAFT 생성
          </button>
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1 w-fit">
        {([
          { key: 'all' as StatusFilter, label: '전체' },
          { key: 'DRAFT' as StatusFilter, label: '초안' },
          { key: 'CONFIRMED' as StatusFilter, label: '확정' },
          { key: 'ARCHIVED' as StatusFilter, label: '보관' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === key ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">{error}</p>
          <button onClick={fetchInvoices} className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
            다시 시도
          </button>
        </div>
      )}

      {/* Invoice List */}
      {!loading && !error && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">인보이스가 없습니다</p>
              <p className="text-sm text-slate-400 mt-1">DRAFT 생성 버튼으로 새 인보이스를 만들 수 있습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">상태</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">발송</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">기간</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">약국</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">기준</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">건수</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">단가</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">금액</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const sc = STATUS_CONFIG[inv.status];
                    const dc = DISPATCH_CONFIG[inv.dispatchStatus || 'NONE'];
                    return (
                      <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-6 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold border ${sc.bg} ${sc.color}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {inv.status === 'CONFIRMED' || inv.status === 'ARCHIVED' ? (
                            <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold border ${dc.bg} ${dc.color}`}>
                              {dc.label}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{fmtDate(inv.periodFrom)} ~ {fmtDate(inv.periodTo)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{inv.pharmacyName || '전체'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{UNIT_LABELS[inv.unit]}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-700">{fmt(inv.count)}</td>
                        <td className="px-4 py-3 text-sm text-right text-slate-500">{krw(inv.unitPrice)}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-green-700">{krw(inv.amount)}</td>
                        <td className="px-6 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleViewDetail(inv.id)}
                              className="p-1.5 text-slate-400 hover:text-primary-600 transition-colors"
                              title="상세 보기"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCsvExport(inv)}
                              className="p-1.5 text-slate-400 hover:text-primary-600 transition-colors"
                              title="CSV 다운로드"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {inv.status === 'DRAFT' && (
                              <button
                                onClick={() => setConfirmingId(inv.id)}
                                className="p-1.5 text-amber-500 hover:text-green-600 transition-colors"
                                title="확정"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            {inv.status === 'CONFIRMED' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSendInvoiceId(inv.id);
                                    setSendEmail(inv.dispatchedTo || '');
                                    setSendError(null);
                                  }}
                                  className="p-1.5 text-blue-500 hover:text-blue-700 transition-colors"
                                  title="이메일 발송"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                                {(inv.dispatchStatus === 'SENT') && (
                                  <button
                                    onClick={() => handleMarkReceived(inv.id)}
                                    className="p-1.5 text-emerald-500 hover:text-emerald-700 transition-colors"
                                    title="수령 확인"
                                  >
                                    <Inbox className="w-4 h-4" />
                                  </button>
                                )}
                                {inv.dispatchStatus !== 'NONE' && (
                                  <button
                                    onClick={() => handleViewDispatchLog(inv.id)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                                    title="발송 이력"
                                  >
                                    <Clock className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========== CREATE MODAL ========== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">DRAFT 인보이스 생성</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">시작일</label>
                  <input
                    type="date"
                    value={createForm.periodFrom}
                    onChange={(e) => setCreateForm((f) => ({ ...f, periodFrom: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">종료일</label>
                  <input
                    type="date"
                    value={createForm.periodTo}
                    onChange={(e) => setCreateForm((f) => ({ ...f, periodTo: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">약국</label>
                <div className="relative">
                  <select
                    value={createForm.pharmacyId}
                    onChange={(e) => setCreateForm((f) => ({ ...f, pharmacyId: e.target.value }))}
                    className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">전체 약국</option>
                    {pharmacies.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">청구 기준</label>
                <div className="flex gap-2">
                  {(['consultation_action', 'approved_request'] as BillingUnit[]).map((u) => (
                    <button
                      key={u}
                      onClick={() => setCreateForm((f) => ({ ...f, unit: u }))}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        createForm.unit === u ? 'bg-primary-600 text-white border-primary-600' : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {UNIT_LABELS[u]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">단가 (원)</label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={createForm.unitPrice}
                  onChange={(e) => setCreateForm((f) => ({ ...f, unitPrice: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{createError}</div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {creating ? '생성 중...' : 'DRAFT 생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== CONFIRM MODAL ========== */}
      {confirmingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h2 className="text-lg font-semibold text-slate-800">인보이스 확정</h2>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              이 인보이스를 <strong>확정(CONFIRMED)</strong>합니까?
            </p>
            <p className="text-xs text-slate-400 mb-6">
              확정 후에는 금액, 건수, 단가를 변경할 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingId(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleConfirm(confirmingId)}
                disabled={confirming}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {confirming ? '확정 중...' : '확정'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== SEND MODAL (Phase 3-E) ========== */}
      {sendInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-blue-500" />
              <h2 className="text-lg font-semibold text-slate-800">인보이스 발송</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              PDF와 CSV가 첨부된 이메일이 발송됩니다.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">수신 이메일</label>
              <input
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {sendError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">{sendError}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setSendInvoiceId(null); setSendEmail(''); setSendError(null); }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !sendEmail}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {sending ? '발송 중...' : '발송'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== DISPATCH LOG MODAL (Phase 3-E) ========== */}
      {dispatchLogInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[70vh] overflow-y-auto p-6 mx-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-800">발송 이력</h2>
                <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold border ${DISPATCH_CONFIG[(dispatchLogInvoice.dispatchStatus as DispatchStatus) || 'NONE'].bg} ${DISPATCH_CONFIG[(dispatchLogInvoice.dispatchStatus as DispatchStatus) || 'NONE'].color}`}>
                  {DISPATCH_CONFIG[(dispatchLogInvoice.dispatchStatus as DispatchStatus) || 'NONE'].label}
                </span>
              </div>
              <button onClick={() => setDispatchLogInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {dispatchLogInvoice.log.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">발송 이력이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dispatchLogInvoice.log.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className={`mt-0.5 p-1.5 rounded-full ${
                      entry.action === 'received' ? 'bg-emerald-100 text-emerald-600' :
                      entry.action === 'sent' || entry.action === 'resent' ? 'bg-blue-100 text-blue-600' :
                      'bg-slate-200 text-slate-500'
                    }`}>
                      {entry.action === 'received' ? <Inbox className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">
                          {entry.action === 'sent' ? '발송' : entry.action === 'resent' ? '재발송' : entry.action === 'received' ? '수령 확인' : entry.action}
                        </span>
                        {entry.channel && (
                          <span className="text-xs text-slate-400">{entry.channel}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{fmtDateTime(entry.at)}</p>
                      {entry.to && <p className="text-xs text-slate-500">수신: {entry.to}</p>}
                      {entry.note && <p className="text-xs text-red-500 mt-1">{entry.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 text-right">
              <button
                onClick={() => setDispatchLogInvoice(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== DETAIL MODAL ========== */}
      {detailInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 mx-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-800">인보이스 상세</h2>
                <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold border ${STATUS_CONFIG[detailInvoice.status].bg} ${STATUS_CONFIG[detailInvoice.status].color}`}>
                  {STATUS_CONFIG[detailInvoice.status].label}
                </span>
                {detailInvoice.status !== 'DRAFT' && (
                  <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold border ${DISPATCH_CONFIG[detailInvoice.dispatchStatus || 'NONE'].bg} ${DISPATCH_CONFIG[detailInvoice.dispatchStatus || 'NONE'].color}`}>
                    {DISPATCH_CONFIG[detailInvoice.dispatchStatus || 'NONE'].label}
                  </span>
                )}
              </div>
              <button onClick={() => setDetailInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">기간</p>
                <p className="text-sm font-semibold text-slate-800">{fmtDate(detailInvoice.periodFrom)} ~ {fmtDate(detailInvoice.periodTo)}</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs text-blue-600">기준</p>
                <p className="text-sm font-semibold text-blue-800">{UNIT_LABELS[detailInvoice.unit]}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-600">단가</p>
                <p className="text-sm font-bold text-amber-800">{krw(detailInvoice.unitPrice)}</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-xs text-green-600">금액</p>
                <p className="text-sm font-bold text-green-800">{krw(detailInvoice.amount)}</p>
              </div>
            </div>

            <div className="text-center bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-500">{fmt(detailInvoice.count)}건 x {krw(detailInvoice.unitPrice)} = <strong className="text-green-700">{krw(detailInvoice.amount)}</strong></p>
            </div>

            {/* Dispatch Info (Phase 3-E) */}
            {detailInvoice.status !== 'DRAFT' && detailInvoice.dispatchStatus !== 'NONE' && (
              <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">발송 정보</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {detailInvoice.dispatchedTo && (
                    <div>
                      <span className="text-blue-600">수신:</span>{' '}
                      <span className="text-blue-900">{detailInvoice.dispatchedTo}</span>
                    </div>
                  )}
                  {detailInvoice.dispatchedAt && (
                    <div>
                      <span className="text-blue-600">발송 시각:</span>{' '}
                      <span className="text-blue-900">{fmtDateTime(detailInvoice.dispatchedAt)}</span>
                    </div>
                  )}
                  {detailInvoice.receivedAt && (
                    <div>
                      <span className="text-emerald-600">수령 시각:</span>{' '}
                      <span className="text-emerald-900">{fmtDateTime(detailInvoice.receivedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Snapshot Lines */}
            {detailInvoice.lineSnapshot && detailInvoice.lineSnapshot.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700">스냅샷 근거 ({fmt(detailInvoice.lineSnapshot.length)}건)</h3>
                  <button onClick={() => handleCsvExport(detailInvoice)} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
                    <Download className="w-3 h-3" /> CSV
                  </button>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">날짜</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Source</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Request</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Type</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500">단가</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailInvoice.lineSnapshot.map((d, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                          <td className="px-3 py-1.5 text-slate-700">{d.date}</td>
                          <td className="px-3 py-1.5 font-mono text-slate-500">{d.sourceId || '-'}</td>
                          <td className="px-3 py-1.5 font-mono text-slate-500">{d.requestId.slice(0, 8)}...</td>
                          <td className="px-3 py-1.5 text-slate-600">{d.actionType}</td>
                          <td className="px-3 py-1.5 text-right text-slate-700">{krw(d.unitPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-6 text-right">
              <button
                onClick={() => setDetailInvoice(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
