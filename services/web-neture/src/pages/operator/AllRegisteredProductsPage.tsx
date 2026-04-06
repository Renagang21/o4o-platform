/**
 * AllRegisteredProductsPage — 운영자 전체 등록 상품 Overview
 *
 * WO-NETURE-OPERATOR-ALL-OFFERS-VIEW-FOUNDATION-V1
 *
 * 전체 등록 상품 (isActive/distributionType 필터 없음) 조회.
 * 서버사이드 페이징 + KPI 카드 + 상세 패널 drill-down.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, RefreshCw, ChevronLeft, ChevronRight,
  X, CheckCircle, XCircle, Clock, Eye, EyeOff,
} from 'lucide-react';
import {
  operatorAllOffersApi,
  type AllRegisteredOffer,
  type AllOffersKpi,
} from '../../lib/api';
import {
  DISTRIBUTION_TYPE_BADGE,
  DISTRIBUTION_TYPE_LABELS,
  APPROVAL_STATUS_BADGE,
  REGULATORY_TYPE_LABELS,
  REGULATORY_TYPE_BADGE,
} from '../../lib/productConstants';

export default function AllRegisteredProductsPage() {
  const [offers, setOffers] = useState<AllRegisteredOffer[]>([]);
  const [kpi, setKpi] = useState<AllOffersKpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [distFilter, setDistFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [regulatoryFilter, setRegulatoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [detailOffer, setDetailOffer] = useState<AllRegisteredOffer | null>(null);

  const PAGE_SIZE = 50;

  const fetchOffers = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const result = await operatorAllOffersApi.getAll({
        page: p,
        limit: PAGE_SIZE,
        keyword: search || undefined,
        distributionType: distFilter || undefined,
        isActive: activeFilter || undefined,
        approvalStatus: approvalFilter || undefined,
        regulatoryType: regulatoryFilter || undefined,
        sort: 'createdAt',
        order: 'DESC',
      });
      setOffers(result.data);
      setKpi(result.kpi);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, distFilter, activeFilter, approvalFilter, regulatoryFilter]);

  useEffect(() => { fetchOffers(page); }, [fetchOffers, page]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, distFilter, activeFilter, approvalFilter, regulatoryFilter]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">전체 등록 상품</h1>
          <p className="text-sm text-slate-500 mt-1">
            플랫폼에 등록된 모든 상품 현황 (활성/비활성, 공개/비공개 포함)
          </p>
        </div>
        <button
          onClick={() => fetchOffers(page)}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />새로고침
        </button>
      </div>

      {/* KPI Cards */}
      {kpi && (
        <div className="grid grid-cols-3 lg:grid-cols-9 gap-3 mb-6">
          <KpiCard label="전체" value={kpi.total} cls="text-slate-900" />
          <KpiCard
            label="활성" value={kpi.active} cls="text-green-700"
            active={activeFilter === 'true'}
            onClick={() => setActiveFilter(activeFilter === 'true' ? '' : 'true')}
          />
          <KpiCard
            label="비활성" value={kpi.inactive} cls="text-slate-500"
            active={activeFilter === 'false'}
            onClick={() => setActiveFilter(activeFilter === 'false' ? '' : 'false')}
          />
          <KpiCard
            label="PUBLIC" value={kpi.distPublic} cls="text-blue-700"
            active={distFilter === 'PUBLIC'}
            onClick={() => setDistFilter(distFilter === 'PUBLIC' ? '' : 'PUBLIC')}
          />
          <KpiCard
            label="SERVICE" value={kpi.distService} cls="text-indigo-700"
            active={distFilter === 'SERVICE'}
            onClick={() => setDistFilter(distFilter === 'SERVICE' ? '' : 'SERVICE')}
          />
          <KpiCard
            label="PRIVATE" value={kpi.distPrivate} cls="text-slate-500"
            active={distFilter === 'PRIVATE'}
            onClick={() => setDistFilter(distFilter === 'PRIVATE' ? '' : 'PRIVATE')}
          />
          <KpiCard
            label="승인 대기" value={kpi.approvalPending} cls="text-amber-700"
            active={approvalFilter === 'PENDING'}
            onClick={() => setApprovalFilter(approvalFilter === 'PENDING' ? '' : 'PENDING')}
          />
          <KpiCard
            label="승인됨" value={kpi.approvalApproved} cls="text-green-700"
            active={approvalFilter === 'APPROVED'}
            onClick={() => setApprovalFilter(approvalFilter === 'APPROVED' ? '' : 'APPROVED')}
          />
          <KpiCard
            label="반려됨" value={kpi.approvalRejected} cls="text-red-600"
            active={approvalFilter === 'REJECTED'}
            onClick={() => setApprovalFilter(approvalFilter === 'REJECTED' ? '' : 'REJECTED')}
          />
        </div>
      )}

      {/* Search + Active Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="상품명 / 바코드 / 공급자 검색"
            className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={regulatoryFilter}
          onChange={(e) => setRegulatoryFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">규제 유형 전체</option>
          {Object.entries(REGULATORY_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className="text-sm text-slate-500">총 {total}건</span>
        {(distFilter || activeFilter || approvalFilter || regulatoryFilter) && (
          <button
            onClick={() => { setDistFilter(''); setActiveFilter(''); setApprovalFilter(''); setRegulatoryFilter(''); }}
            className="text-xs text-blue-600 hover:underline"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase border-b border-slate-200">
              <th className="px-4 py-3 font-medium w-12"></th>
              <th className="px-4 py-3 font-medium">상품명</th>
              <th className="px-4 py-3 font-medium">공급자</th>
              <th className="px-4 py-3 font-medium">카테고리</th>
              <th className="px-4 py-3 font-medium text-center">규제</th>
              <th className="px-4 py-3 font-medium text-center">활성</th>
              <th className="px-4 py-3 font-medium text-center">유통</th>
              <th className="px-4 py-3 font-medium text-right">공급가</th>
              <th className="px-4 py-3 font-medium text-center">승인</th>
              <th className="px-4 py-3 font-medium text-center">서비스</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">불러오는 중...</td></tr>
            ) : offers.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                {search || distFilter || activeFilter || approvalFilter || regulatoryFilter
                  ? '조건에 맞는 상품이 없습니다.'
                  : '등록된 상품이 없습니다.'}
              </td></tr>
            ) : offers.map((o) => {
              const distBadge = DISTRIBUTION_TYPE_BADGE[o.distributionType] || { label: o.distributionType || '-', bg: 'bg-slate-100', text: 'text-slate-500' };
              const apprBadge = APPROVAL_STATUS_BADGE[o.approvalStatus] || { label: o.approvalStatus || '-', bg: 'bg-slate-100', text: 'text-slate-600' };
              const regLabel = o.regulatoryType ? REGULATORY_TYPE_LABELS[o.regulatoryType] : null;
              const regBadge = o.regulatoryType ? REGULATORY_TYPE_BADGE[o.regulatoryType] : null;
              return (
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setDetailOffer(o)}>
                  <td className="px-4 py-3">
                    {o.primaryImageUrl ? (
                      <img src={o.primaryImageUrl} alt="" className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{o.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{o.barcode || o.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{o.supplierName || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{o.categoryName || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {regLabel && regBadge ? (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${regBadge.bg} ${regBadge.text}`}>
                        {regLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {o.isActive ? (
                      <Eye className="w-4 h-4 text-green-600 mx-auto" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-400 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${distBadge.bg} ${distBadge.text}`}>
                      {distBadge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {o.priceGeneral ? `₩${o.priceGeneral.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${apprBadge.bg} ${apprBadge.text}`}>
                      {apprBadge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ServiceBadges approvals={o.serviceApprovals} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-600 px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel (right slide) */}
      {detailOffer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDetailOffer(null)} />
          <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">상품 상세</h2>
              <button onClick={() => setDetailOffer(null)} className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Image */}
              {detailOffer.primaryImageUrl ? (
                <img src={detailOffer.primaryImageUrl} alt="" className="w-full h-48 rounded-lg object-cover bg-slate-100" />
              ) : (
                <div className="w-full h-48 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Package className="w-12 h-12 text-slate-300" />
                </div>
              )}
              {/* Info */}
              <div>
                <h3 className="text-lg font-bold text-slate-900">{detailOffer.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{detailOffer.barcode || detailOffer.id}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailCard label="공급자" value={detailOffer.supplierName || '-'} />
                <DetailCard label="공급자 상태" value={detailOffer.supplierStatus || '-'} />
                <DetailCard label="활성 상태" value={detailOffer.isActive ? '활성' : '비활성'} />
                <DetailCard label="유통 타입" value={DISTRIBUTION_TYPE_LABELS[detailOffer.distributionType] || detailOffer.distributionType || '-'} />
                <DetailCard label="공급가" value={detailOffer.priceGeneral ? `₩${detailOffer.priceGeneral.toLocaleString()}` : '-'} />
                <DetailCard label="소비자가" value={detailOffer.consumerReferencePrice ? `₩${detailOffer.consumerReferencePrice.toLocaleString()}` : '-'} />
                <DetailCard label="승인 상태" value={APPROVAL_STATUS_BADGE[detailOffer.approvalStatus]?.label || detailOffer.approvalStatus || '-'} />
                <DetailCard label="카테고리" value={detailOffer.categoryName || '-'} />
                <DetailCard label="규제 유형" value={detailOffer.regulatoryType ? (REGULATORY_TYPE_LABELS[detailOffer.regulatoryType] || detailOffer.regulatoryType) : '-'} />
                {detailOffer.brandName && <DetailCard label="브랜드" value={detailOffer.brandName} />}
                {detailOffer.specification && <DetailCard label="규격" value={detailOffer.specification} />}
              </div>
              {/* Service Approvals */}
              {detailOffer.serviceApprovals && detailOffer.serviceApprovals.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2">서비스 승인 현황</p>
                  <div className="space-y-1.5">
                    {detailOffer.serviceApprovals.map((sa, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{sa.serviceKey}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          sa.status === 'approved' ? 'bg-green-50 text-green-700' :
                          sa.status === 'rejected' ? 'bg-red-50 text-red-600' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {sa.status === 'approved' ? '승인' : sa.status === 'rejected' ? '반려' : '대기'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Created At */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">등록일</p>
                <p className="text-sm text-slate-800 mt-0.5">{new Date(detailOffer.createdAt).toLocaleDateString('ko-KR')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, cls, active, onClick }: {
  label: string; value: number; cls: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`bg-white rounded-lg border p-3 text-left transition-colors ${
        active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <p className="text-xs text-slate-500 truncate">{label}</p>
      <p className={`text-lg font-bold ${cls}`}>{value}</p>
    </button>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}

function ServiceBadges({ approvals }: { approvals: Array<{ serviceKey: string; status: string }> }) {
  if (!approvals || approvals.length === 0) return <span className="text-xs text-slate-400">-</span>;
  return (
    <div className="flex items-center justify-center gap-1">
      {approvals.map((a, i) => (
        <span key={i} title={`${a.serviceKey}: ${a.status}`}>
          {a.status === 'approved' ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
          ) : a.status === 'rejected' ? (
            <XCircle className="w-3.5 h-3.5 text-red-500" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          )}
        </span>
      ))}
    </div>
  );
}
