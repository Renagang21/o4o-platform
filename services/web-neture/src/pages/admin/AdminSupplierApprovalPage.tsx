/**
 * AdminSupplierApprovalPage - 공급자 승인 관리
 *
 * WO-O4O-ADMIN-UI-COMPLETION-V1
 * Pattern: OperatorsPage.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { adminSupplierApi, type AdminSupplier, ACTIVATION_FIELD_LABELS } from '../../lib/api';
import SupplierRegulatedCategoriesModal from '../../components/supplier/SupplierRegulatedCategoriesModal';

// WO-O4O-NETURE-SUPPLIER-ACTIVATION-GATE-ALIGN-AND-ERROR-SURFACE-V1:
// 활성화 가능 여부는 backend(activationReady/missingActivationFields)가 단일 권위.
function activationLabels(s: AdminSupplier): string[] {
  return (s.missingActivationFields ?? []).map((f) => ACTIVATION_FIELD_LABELS[f] || f);
}

const statusLabels: Record<string, string> = {
  PENDING: '승인대기',
  ACTIVE: '활성',
  REJECTED: '거절됨',
  INACTIVE: '비활성',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
};

// 통신판매업 신고 상태 — 운영자/admin 확인 항목 (ACTIVE 전환 차단 조건 아님)
const mailOrderStatusLabels: Record<string, string> = {
  not_applicable: '해당 없음',
  reported: '신고 완료',
  pending: '확인 필요',
};

// WO-O4O-NETURE-SUPPLIER-ACTIVATION-DOCUMENT-GATE-RELAXATION-V1:
// ACTIVE 승인은 기본 사업자 정보만 필수. 사업자등록증/정산정보/통장사본/세금계산서 이메일은
// 판매 전·정산 전 필요 항목으로 분리(활성화 차단 아님). 통신판매업은 종전대로 비차단.
function getDeferredItems(supplier: AdminSupplier): { label: string; stage: string }[] {
  const items: { label: string; stage: string }[] = [];
  if (!supplier.businessRegistrationDocumentId) items.push({ label: '사업자등록증', stage: '판매 전' });
  if (!supplier.taxInvoiceEmail) items.push({ label: '세금계산서 이메일', stage: '정산 전' });
  if (!supplier.settlementBankName) items.push({ label: '은행명', stage: '정산 전' });
  if (!supplier.settlementAccountNumberMasked) items.push({ label: '계좌번호', stage: '정산 전' });
  if (!supplier.settlementAccountHolder) items.push({ label: '예금주', stage: '정산 전' });
  if (!supplier.settlementBankbookDocumentId) items.push({ label: '통장 사본', stage: '정산 전' });
  return items;
}
function describeDeferred(items: { label: string; stage: string }[]): string {
  return ['판매 전', '정산 전']
    .map((stage) => {
      const labels = items.filter((i) => i.stage === stage).map((i) => i.label);
      return labels.length ? `${stage} 필요: ${labels.join(', ')}` : null;
    })
    .filter(Boolean)
    .join(' · ');
}

export default function AdminSupplierApprovalPage() {
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [categoryModal, setCategoryModal] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null);
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    const data = await adminSupplierApi.getSuppliers();
    setSuppliers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleApprove = async () => {
    if (!approveConfirmId) return;
    const id = approveConfirmId;
    const target = suppliers.find((s) => s.id === id);
    setApproveConfirmId(null);
    setActionLoading(id);
    const result = await adminSupplierApi.approveSupplier(id);
    setActionLoading(null);
    if (result.success) {
      setActionMessage({ type: 'success', text: `${target?.name || '공급자'} 활성화 완료 (ACTIVE)` });
      await loadSuppliers();
      return;
    }
    let text = '활성화에 실패했습니다. 잠시 후 다시 시도해 주세요.';
    if (result.code === 'ONBOARDING_INCOMPLETE') {
      const labels = (result.missingFields ?? []).map((f) => ACTIVATION_FIELD_LABELS[f] || f);
      text = labels.length
        ? `${labels.join(', ')}이(가) 비어 있어 활성화할 수 없습니다. 공급자가 해당 정보를 입력해야 합니다.`
        : '필수 정보가 비어 있어 활성화할 수 없습니다.';
    } else if (result.code === 'INVALID_STATUS') {
      text = '이미 처리된 공급자입니다. 목록을 새로고침합니다.';
      await loadSuppliers();
    } else if (result.code === 'SUPPLIER_NOT_FOUND') {
      text = '공급자를 찾을 수 없습니다.';
    }
    setActionMessage({ type: 'error', text });
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    const ok = await adminSupplierApi.rejectSupplier(rejectModal.id, rejectReason);
    setActionLoading(null);
    setRejectModal(null);
    setRejectReason('');
    if (ok) await loadSuppliers();
  };

  const handleDeactivate = async () => {
    if (!deactivateConfirmId) return;
    const id = deactivateConfirmId;
    setDeactivateConfirmId(null);
    setActionLoading(id);
    const ok = await adminSupplierApi.deactivateSupplier(id);
    setActionLoading(null);
    if (ok) await loadSuppliers();
  };

  const handleDownloadDocument = async (
    supplierId: string,
    documentType: 'business_registration' | 'bank_statement' | 'mail_order_report',
  ) => {
    const blob = await adminSupplierApi.downloadDocument(supplierId, documentType);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const statuses = ['all', 'PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE'];

  const filtered = suppliers.filter((s) => {
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchSearch = !term || s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  const pendingCount = suppliers.filter((s) => s.status === 'PENDING').length;
  const activeCount = suppliers.filter((s) => s.status === 'ACTIVE').length;
  const inactiveCount = suppliers.filter((s) => s.status === 'INACTIVE' || s.status === 'REJECTED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">공급자 승인 관리</h1>
        <p className="text-slate-500 mt-1">공급자 등록 신청을 검토하고 승인/거절합니다</p>
      </div>

      {actionMessage && (
        <div
          className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${
            actionMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="shrink-0 text-slate-400 hover:text-slate-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">전체</p>
          <p className="text-2xl font-bold text-slate-800">{suppliers.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">승인대기</p>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">활성</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">비활성/거절</p>
          <p className="text-2xl font-bold text-slate-400">{inactiveCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="공급자명, 이메일 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'all' ? '전체' : statusLabels[s] || s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            {suppliers.length === 0 ? '등록된 공급자가 없습니다' : '검색 결과가 없습니다'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">공급자명</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">대표자</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">사업자번호</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">이메일</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">서류/정산</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상태</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">등록일</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-slate-500">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => {
                const deferred = getDeferredItems(s);
                const activationReady = s.activationReady ?? !!s.representativeName;
                const missingActivation = activationLabels(s);
                return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.id.slice(0, 8)}...</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{s.representativeName || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{s.businessNumber || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div>{s.email}</div>
                    {s.taxInvoiceEmail && s.taxInvoiceEmail !== s.email && (
                      <div className="text-xs text-slate-400 mt-0.5">세금: {s.taxInvoiceEmail}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="space-y-1">
                      <div className={activationReady ? 'text-emerald-700' : 'text-amber-700'}>
                        {activationReady
                          ? '승인 가능 (기본 정보 완료)'
                          : `활성화 불가 — 누락: ${missingActivation.join(', ')}`}
                      </div>
                      {deferred.length > 0 && (
                        <div className="text-xs text-amber-600">{describeDeferred(deferred)}</div>
                      )}
                      <div className="text-xs text-slate-500">
                        {s.settlementBankName && s.settlementAccountHolder
                          ? `${s.settlementBankName} / ${s.settlementAccountHolder} / ${s.settlementAccountNumberMasked || '-'}`
                          : '정산 정보 없음'}
                      </div>
                      <div className="text-xs text-slate-500">
                        통신판매업: {s.mailOrderSalesStatus
                          ? `${mailOrderStatusLabels[s.mailOrderSalesStatus] || s.mailOrderSalesStatus}${s.mailOrderSalesRegistrationNumber ? ` (${s.mailOrderSalesRegistrationNumber})` : ''}`
                          : '미입력'}
                      </div>
                      <div className="flex gap-2 text-xs">
                        {s.businessRegistrationDocumentId && (
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(s.id, 'business_registration')}
                            className="text-emerald-700 hover:text-emerald-900"
                          >
                            사업자등록증
                          </button>
                        )}
                        {s.settlementBankbookDocumentId && (
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(s.id, 'bank_statement')}
                            className="text-emerald-700 hover:text-emerald-900"
                          >
                            통장 사본
                          </button>
                        )}
                        {s.mailOrderSalesDocumentId && (
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(s.id, 'mail_order_report')}
                            className="text-emerald-700 hover:text-emerald-900"
                          >
                            통신판매업 신고증
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[s.status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[s.status] || s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(s.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-center space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setCategoryModal({ id: s.id, name: s.name })}
                      className="text-slate-600 hover:text-slate-900 font-medium text-sm"
                    >
                      품목군
                    </button>
                    {s.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => setApproveConfirmId(s.id)}
                          disabled={actionLoading === s.id || !activationReady}
                          title={!activationReady ? `누락: ${missingActivation.join(', ')}` : undefined}
                          className="text-emerald-600 hover:text-emerald-800 font-medium text-sm disabled:opacity-50"
                        >
                          {actionLoading === s.id ? '처리중...' : '승인'}
                        </button>
                        <button
                          onClick={() => setRejectModal({ id: s.id, name: s.name })}
                          disabled={actionLoading === s.id}
                          className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                        >
                          거절
                        </button>
                      </>
                    )}
                    {s.status === 'ACTIVE' && (
                      <button
                        onClick={() => setDeactivateConfirmId(s.id)}
                        disabled={actionLoading === s.id}
                        className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                      >
                        {actionLoading === s.id ? '처리중...' : '비활성화'}
                      </button>
                    )}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        )}
      </div>

      {categoryModal && (
        <SupplierRegulatedCategoriesModal
          supplierId={categoryModal.id}
          supplierName={categoryModal.name}
          api={adminSupplierApi}
          onClose={() => setCategoryModal(null)}
        />
      )}

      {approveConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-3">공급자 승인</h3>
            <p className="text-sm text-slate-600 mb-5">이 공급자를 승인하시겠습니까?</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setApproveConfirmId(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                승인
              </button>
            </div>
          </div>
        </div>
      )}

      {deactivateConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-amber-700 mb-3">공급자 비활성화</h3>
            <p className="text-sm text-slate-600 mb-5">이 공급자를 비활성화하시겠습니까?</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeactivateConfirmId(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={handleDeactivate}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                비활성화
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">공급자 거절</h3>
            <p className="text-sm text-slate-500 mb-4">{rejectModal.name}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 입력하세요 (선택)"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectModal.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === rejectModal.id ? '처리중...' : '거절'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
