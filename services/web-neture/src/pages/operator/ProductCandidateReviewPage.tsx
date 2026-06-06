/**
 * ProductCandidateReviewPage — Operator 상품 후보 검토 (Phase 5)
 *
 * WO-O4O-OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1
 *
 * Phase 3 product_candidates 큐 + Phase 4 mobile draft → candidate 흐름을 운영자가 검토.
 * 기존 /api/v1/operator/product-candidates API 사용 — backend 변경 없음.
 *
 * 액션: 재매칭 / 수동매칭(기존 Master 연결) / 반려 / 보관.
 * 금지: 신규 ProductMaster 생성 UI, 자동 승인 UI.
 */

import { useState, useCallback, useEffect } from 'react';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { GuideBlock } from '@o4o/shared-space-ui';
import {
  operatorProductCandidateApi,
  type ProductCandidate,
  type ProductCandidateStatus,
  type ProductCandidateMatchStatus,
  type ProductCandidateSourceType,
  type ProductTypeClass,
} from '../../lib/api/operatorProductCandidates';

// ─── Constants ───

const STATUS_TABS: { key: 'all' | ProductCandidateStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'reviewing', label: '검토중' },
  { key: 'matched', label: '매칭됨' },
  { key: 'linked', label: '활용연결' },
  { key: 'rejected', label: '반려' },
  { key: 'archived', label: '보관' },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: '대기', cls: 'bg-amber-50 text-amber-700' },
  reviewing: { label: '검토중', cls: 'bg-blue-50 text-blue-700' },
  matched: { label: '매칭됨', cls: 'bg-green-50 text-green-700' },
  linked: { label: '활용연결', cls: 'bg-emerald-50 text-emerald-700' },
  approved_new_master: { label: '신규승격', cls: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: '반려', cls: 'bg-red-50 text-red-700' },
  merged: { label: '병합', cls: 'bg-slate-100 text-slate-600' },
  archived: { label: '보관', cls: 'bg-slate-100 text-slate-500' },
};

const MATCH_BADGE: Record<string, { label: string; cls: string }> = {
  unmatched: { label: '미매칭', cls: 'bg-slate-100 text-slate-500' },
  exact_identifier_match: { label: '식별자 일치', cls: 'bg-green-50 text-green-700' },
  possible_identifier_match: { label: '식별자 후보', cls: 'bg-teal-50 text-teal-700' },
  possible_text_match: { label: '이름 후보', cls: 'bg-indigo-50 text-indigo-700' },
  conflict: { label: '충돌', cls: 'bg-orange-50 text-orange-700' },
  no_match: { label: '결과없음', cls: 'bg-slate-100 text-slate-500' },
  manually_matched: { label: '수동매칭', cls: 'bg-green-50 text-green-700' },
};

// WO-O4O-PRODUCT-TYPE-CLASSIFICATION-WIRING-F3-V1
const PRODUCT_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  non_drug: { label: '비의약품', cls: 'bg-slate-100 text-slate-600' },
  otc_drug: { label: '비처방의약품', cls: 'bg-amber-50 text-amber-700' },
  rx_drug: { label: '처방의약품', cls: 'bg-red-50 text-red-700' },
  quasi_drug: { label: '의약외품', cls: 'bg-teal-50 text-teal-700' },
  health_functional: { label: '건강기능식품', cls: 'bg-indigo-50 text-indigo-700' },
  drug_unspecified: { label: '의약품 미분류', cls: 'bg-orange-50 text-orange-700' },
  unknown: { label: '미상', cls: 'bg-slate-100 text-slate-400' },
};

const PRODUCT_TYPE_FILTERS: { key: 'all' | ProductTypeClass; label: string }[] = [
  { key: 'all', label: '분류 전체' },
  { key: 'non_drug', label: '비의약품' },
  { key: 'otc_drug', label: '비처방의약품' },
  { key: 'rx_drug', label: '처방의약품' },
  { key: 'drug_unspecified', label: '의약품 미분류' },
  { key: 'quasi_drug', label: '의약외품' },
];

const SOURCE_LABEL: Record<ProductCandidateSourceType, string> = {
  supplier_web: '공급자',
  pharmacy_web: '약국',
  store_web: '매장',
  mobile_draft: '모바일',
  csv_import: 'CSV',
  xlsx_import: 'XLSX',
  operator_import: '운영자',
  external_api: '외부API',
  unknown: '미상',
};

function Badge({ map, value }: { map: Record<string, { label: string; cls: string }>; value: string }) {
  const b = map[value] || { label: value, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${b.cls}`}>{b.label}</span>;
}

// ─── Component ───

export default function ProductCandidateReviewPage() {
  const [items, setItems] = useState<ProductCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | ProductCandidateStatus>('all');
  const [matchFilter, setMatchFilter] = useState<'all' | ProductCandidateMatchStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ProductTypeClass>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [detail, setDetail] = useState<ProductCandidate | null>(null);
  const [manualMasterId, setManualMasterId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // 활용 상품 연결 (link-to-listing)
  const [linkOrgId, setLinkOrgId] = useState('');
  const [linkServiceKey, setLinkServiceKey] = useState('');
  const [linkDisplayName, setLinkDisplayName] = useState('');
  const [linkMessage, setLinkMessage] = useState<string | null>(null);

  // 의약품 분류 refine (F4)
  const [refineCategory, setRefineCategory] = useState('');
  const [refineNote, setRefineNote] = useState('');
  const [refineMessage, setRefineMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await operatorProductCandidateApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      matchStatus: matchFilter === 'all' ? undefined : matchFilter,
      limit: 100,
    });
    setItems(res.items);
    setLoading(false);
  }, [statusFilter, matchFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // 클라이언트 측 검색 (backend 는 text 검색 미지원 — 로드된 페이지 내 필터)
  const filtered = items.filter((c) => {
    if (typeFilter !== 'all' && (c.classification?.productTypeClass ?? 'unknown') !== typeFilter) return false;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      (c.candidateName || '').toLowerCase().includes(term) ||
      (c.identifierValue || '').toLowerCase().includes(term) ||
      (c.normalizedIdentifierValue || '').toLowerCase().includes(term)
    );
  });

  // ─── Actions ───

  const refreshDetail = async (id: string) => {
    const fresh = await operatorProductCandidateApi.get(id);
    setDetail(fresh);
  };

  const handleMatch = async () => {
    if (!detail) return;
    setActionLoading(true);
    try {
      await operatorProductCandidateApi.match(detail.id);
      await refreshDetail(detail.id);
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualMatch = async () => {
    if (!detail || !manualMasterId.trim()) return;
    setActionLoading(true);
    try {
      await operatorProductCandidateApi.manualMatch(detail.id, manualMasterId.trim());
      setManualMasterId('');
      await refreshDetail(detail.id);
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!detail) return;
    setActionLoading(true);
    try {
      await operatorProductCandidateApi.reject(detail.id, rejectReason || undefined);
      setRejectReason('');
      setDetail(null);
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!detail) return;
    setActionLoading(true);
    try {
      await operatorProductCandidateApi.archive(detail.id);
      setDetail(null);
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!detail || !detail.matchedProductMasterId) return;
    setActionLoading(true);
    setRefineMessage(null);
    try {
      const payload = { drugCategory: (refineCategory || null) as 'otc' | 'rx' | 'quasi_drug' | 'drug_unspecified' | null, note: refineNote.trim() || undefined };
      const result = await operatorProductCandidateApi.refineDrugCategory(detail.id, payload);
      if (result) {
        setRefineMessage('분류가 저장되었습니다.');
        await refreshDetail(detail.id);
        await load();
      } else {
        setRefineMessage('분류 저장에 실패했습니다.');
      }
    } catch (e: any) {
      const code = e?.response?.data?.error;
      setRefineMessage(
        code === 'DRUG_CATEGORY_REGULATORY_CONFLICT'
          ? '규제 유형과 충돌합니다 (의약품만 OTC/Rx 지정 가능).'
          : '분류 저장 중 오류가 발생했습니다.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleLink = async () => {
    if (!detail || !detail.matchedProductMasterId) return;
    if (!linkOrgId.trim() || !linkServiceKey.trim()) {
      setLinkMessage('조직 ID와 서비스 키가 필요합니다.');
      return;
    }
    setActionLoading(true);
    setLinkMessage(null);
    try {
      const result = await operatorProductCandidateApi.linkToListing(detail.id, {
        organizationId: linkOrgId.trim(),
        serviceKey: linkServiceKey.trim(),
        displayName: linkDisplayName.trim() || undefined,
      });
      if (result) {
        setLinkMessage(result.alreadyExisted ? '이미 추가된 활용 상품입니다.' : '활용 상품으로 추가되었습니다.');
        await refreshDetail(detail.id);
        await load();
      } else {
        setLinkMessage('연결에 실패했습니다.');
      }
    } catch {
      setLinkMessage('연결 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Columns ───

  const columns: ListColumnDef<ProductCandidate>[] = [
    {
      key: 'candidateName',
      header: '후보명',
      sortable: true,
      render: (_v, row) => (
        <div>
          <p className="font-medium text-slate-800">{row.candidateName || '(이름 없음)'}</p>
          <p className="text-xs text-slate-400 mt-0.5">{row.id.slice(0, 8)}...</p>
        </div>
      ),
    },
    {
      key: 'identifierValue',
      header: '식별자',
      render: (_v, row) =>
        row.identifierValue ? (
          <span className="text-xs text-slate-600">
            {row.identifierType ? `${row.identifierType}: ` : ''}{row.identifierValue}
          </span>
        ) : (
          <span className="text-xs text-slate-300">-</span>
        ),
    },
    {
      key: 'sourceType',
      header: '출처',
      align: 'center',
      width: '90px',
      render: (v) => <span className="text-xs text-slate-600">{SOURCE_LABEL[v as ProductCandidateSourceType] || v}</span>,
    },
    {
      key: '_productType',
      header: '분류',
      align: 'center',
      width: '110px',
      render: (_v, row) => {
        const cls = row.classification?.productTypeClass ?? 'unknown';
        return <Badge map={PRODUCT_TYPE_BADGE} value={cls} />;
      },
    },
    {
      key: 'serviceKey',
      header: '서비스',
      align: 'center',
      width: '90px',
      render: (v) => <span className="text-xs text-slate-500">{v || '-'}</span>,
    },
    {
      key: 'candidateStatus',
      header: '상태',
      align: 'center',
      width: '90px',
      sortable: true,
      render: (v) => <Badge map={STATUS_BADGE} value={v} />,
    },
    {
      key: 'matchStatus',
      header: '매칭',
      align: 'center',
      width: '100px',
      render: (v) => <Badge map={MATCH_BADGE} value={v} />,
    },
    {
      key: 'confidenceScore',
      header: '신뢰도',
      align: 'center',
      width: '70px',
      render: (v) => <span className="text-xs text-slate-500">{v ? Number(v).toFixed(2) : '-'}</span>,
    },
    {
      key: 'createdAt',
      header: '생성일',
      width: '110px',
      sortable: true,
      sortAccessor: (row) => new Date(row.createdAt).getTime(),
      render: (v) => <span className="text-xs text-slate-500">{new Date(v).toLocaleDateString('ko-KR')}</span>,
    },
  ];

  // ─── Counts ───
  const pendingCount = items.filter((c) => c.candidateStatus === 'pending').length;
  const matchedCount = items.filter((c) => c.candidateStatus === 'matched').length;
  const conflictCount = items.filter((c) => c.matchStatus === 'conflict').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">상품 후보 검토</h1>
        <p className="text-sm text-slate-500 mt-1">
          모바일·공급자·웹·import 로 수집된 상품 후보를 검토하고 기존 상품에 연결하거나 반려/보관합니다.
        </p>
      </div>

      <GuideBlock
        variant="info"
        title="상품 후보 검토 절차를 안내합니다."
        description="후보는 아직 정식 상품(ProductMaster)으로 확정되지 않은 수집 데이터입니다. 검토 후 기존 상품에 연결하거나 반려/보관합니다."
        steps={[
          '대기/검토중 후보를 선택해 식별자·이름·출처를 확인합니다',
          '재매칭으로 Identifier Core 기반 자동 매칭을 다시 시도합니다',
          '수동매칭으로 기존 상품(ProductMaster ID)에 직접 연결합니다',
          '부적합한 후보는 사유와 함께 반려하거나 보관합니다',
        ]}
        compact
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 my-6">
        {[
          { label: '전체', value: items.length, color: 'bg-slate-50 text-slate-700' },
          { label: '대기', value: pendingCount, color: 'bg-amber-50 text-amber-700' },
          { label: '매칭됨', value: matchedCount, color: 'bg-green-50 text-green-700' },
          { label: '충돌', value: conflictCount, color: 'bg-orange-50 text-orange-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg p-4 ${s.color}`}>
            <div className="text-sm font-medium">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === tab.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <select
          value={matchFilter}
          onChange={(e) => setMatchFilter(e.target.value as 'all' | ProductCandidateMatchStatus)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">매칭 전체</option>
          <option value="unmatched">미매칭</option>
          <option value="exact_identifier_match">식별자 일치</option>
          <option value="possible_identifier_match">식별자 후보</option>
          <option value="possible_text_match">이름 후보</option>
          <option value="conflict">충돌</option>
          <option value="no_match">결과없음</option>
          <option value="manually_matched">수동매칭</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | ProductTypeClass)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PRODUCT_TYPE_FILTERS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="후보명, 식별자 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 max-w-xs px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* DataTable */}
      <DataTable<ProductCandidate>
        columns={columns}
        data={filtered}
        rowKey="id"
        loading={loading}
        emptyMessage={items.length === 0 ? '검토할 상품 후보가 없습니다' : '검색 결과가 없습니다'}
        onRowClick={(row) => {
          setDetail(row);
          setManualMasterId('');
          setRejectReason('');
          setLinkOrgId(row.organizationId || '');
          setLinkServiceKey(row.serviceKey || '');
          setLinkDisplayName('');
          setLinkMessage(null);
          setRefineCategory(row.classification?.drugCategory || '');
          setRefineNote('');
          setRefineMessage(null);
        }}
        tableId="neture-product-candidates"
      />

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{detail.candidateName || '(이름 없음)'}</h3>
                <p className="text-xs text-slate-400 mt-1">{detail.id}</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <Badge map={STATUS_BADGE} value={detail.candidateStatus} />
                <Badge map={MATCH_BADGE} value={detail.matchStatus} />
                <Badge map={PRODUCT_TYPE_BADGE} value={detail.classification?.productTypeClass ?? 'unknown'} />
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* F3: 상품 분류 + 기본 노출/판매 정책 (표시용 — 권한 변경 아님) */}
              {detail.classification && (
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-slate-600">상품 분류</span>
                    <Badge map={PRODUCT_TYPE_BADGE} value={detail.classification.productTypeClass} />
                    {detail.classification.drugCategory && (
                      <span className="text-slate-400">drug_category: {detail.classification.drugCategory}</span>
                    )}
                    <span className="text-slate-300">
                      ({detail.classification.basis === 'matched_master' ? '매칭 상품 기준' : '후보 추론'})
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {detail.classification.displayPolicy.pharmacyOnly && (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">약국 전용</span>
                    )}
                    {!detail.classification.displayPolicy.customerDisplayAllowed && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-700">고객 노출 제한</span>
                    )}
                    {!detail.classification.displayPolicy.onlineSaleAllowed && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-700">온라인 판매 차단</span>
                    )}
                    {detail.classification.displayPolicy.advertisingReviewStatus === 'needs_review' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700">광고 검토 필요</span>
                    )}
                    {detail.classification.displayPolicy.advertisingReviewStatus === 'blocked' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-700">광고 차단</span>
                    )}
                    {detail.classification.isRxClass && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800 font-medium">처방의약품 — 온라인 판매/노출 불가</span>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">분류·정책은 안내용입니다. 등록/판매/노출 권한을 자동으로 변경하지 않습니다.</p>
                </div>
              )}

              {/* F4: 의약품 분류 refine (matched master 한정) */}
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">의약품 분류 수정 (검토)</label>
                {!detail.matchedProductMasterId ? (
                  <p className="text-xs text-slate-400">기존 상품에 먼저 매칭해야 분류를 수정할 수 있습니다.</p>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <select
                        value={refineCategory}
                        onChange={(e) => setRefineCategory(e.target.value)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">미지정</option>
                        <option value="drug_unspecified">의약품 미분류</option>
                        <option value="otc">비처방의약품</option>
                        <option value="rx">처방의약품</option>
                        <option value="quasi_drug">의약외품</option>
                      </select>
                      <input
                        type="text"
                        value={refineNote}
                        onChange={(e) => setRefineNote(e.target.value)}
                        placeholder="메모 (선택)"
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleRefine}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                      >
                        분류 저장
                      </button>
                    </div>
                    {refineCategory === 'rx' && (
                      <div className="mt-2 rounded-lg bg-red-50 border border-red-100 p-2 text-xs text-red-700">
                        처방의약품으로 분류하면 고객 공개 노출·온라인 판매·광고 노출은 기본 차단 상태로 유지됩니다.
                        이번 변경은 분류 표시와 검토 정책에만 반영됩니다.
                      </div>
                    )}
                    {refineMessage && <p className="mt-1 text-xs text-slate-500">{refineMessage}</p>}
                    <p className="mt-1 text-[11px] text-slate-400">이 분류 변경은 노출·판매 권한을 열지 않습니다. 온라인 판매/고객 노출은 별도 검토 정책이 필요합니다.</p>
                  </>
                )}
              </div>
              {/* Info grid */}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Field label="식별자 유형" value={detail.identifierType} />
                <Field label="식별자 값" value={detail.identifierValue} />
                <Field label="정규화 값" value={detail.normalizedIdentifierValue} />
                <Field label="출처" value={SOURCE_LABEL[detail.sourceType] || detail.sourceType} />
                <Field label="서비스" value={detail.serviceKey} />
                <Field label="조직" value={detail.organizationId} />
                <Field label="브랜드" value={detail.candidateBrand} />
                <Field label="제조사" value={detail.candidateManufacturer} />
                <Field label="카테고리" value={detail.candidateCategory} />
                <Field label="규격/단위" value={[detail.candidateSpec, detail.candidateUnit].filter(Boolean).join(' / ')} />
                <Field label="가격" value={detail.candidatePrice} />
                <Field label="신뢰도" value={detail.confidenceScore ? Number(detail.confidenceScore).toFixed(4) : null} />
                <Field label="매칭된 상품(Master)" value={detail.matchedProductMasterId} />
                <Field label="매칭된 식별자" value={detail.matchedIdentifierId} />
                <Field label="생성일" value={new Date(detail.createdAt).toLocaleString('ko-KR')} />
                <Field label="검토 메모" value={detail.reviewNote} />
              </dl>

              {detail.candidateImageUrl && (
                <img src={detail.candidateImageUrl} alt="후보 이미지" className="max-h-40 rounded-lg border border-slate-100" />
              )}

              {/* 재매칭 */}
              <div className="border-t border-slate-100 pt-4">
                <button
                  onClick={handleMatch}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  재매칭 실행
                </button>
                <span className="ml-2 text-xs text-slate-400">Identifier Core 기반 자동 매칭을 다시 시도합니다 (자동 승격 아님)</span>
              </div>

              {/* 수동 매칭 */}
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">수동 매칭 — 기존 상품(ProductMaster) ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualMasterId}
                    onChange={(e) => setManualMasterId(e.target.value)}
                    placeholder="ProductMaster UUID"
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleManualMatch}
                    disabled={actionLoading || !manualMasterId.trim()}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    연결
                  </button>
                </div>
              </div>

              {/* 활용 상품으로 추가 (link-to-listing) */}
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">활용 상품으로 추가 (내 약국/내 매장)</label>
                {!detail.matchedProductMasterId ? (
                  <p className="text-xs text-slate-400">매칭된 상품(ProductMaster)이 있어야 활용 상품으로 추가할 수 있습니다. 먼저 재매칭/수동매칭하세요.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={linkOrgId}
                        onChange={(e) => setLinkOrgId(e.target.value)}
                        placeholder="조직 ID (organizationId)"
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={linkServiceKey}
                        onChange={(e) => setLinkServiceKey(e.target.value)}
                        placeholder="서비스 키 (예: kpa)"
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <input
                      type="text"
                      value={linkDisplayName}
                      onChange={(e) => setLinkDisplayName(e.target.value)}
                      placeholder="매장 표시명 (선택, 미입력 시 후보명/상품명)"
                      className="w-full mt-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={handleLink}
                        disabled={actionLoading || !linkOrgId.trim() || !linkServiceKey.trim()}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                      >
                        활용 상품으로 추가
                      </button>
                      {linkMessage && <span className="text-xs text-slate-500">{linkMessage}</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">기존 상품(Master)을 매장 활용 상품(StoreProductProfile + Listing)으로 추가합니다. 신규 상품 생성 아님.</p>
                  </>
                )}
              </div>

              {/* 반려 */}
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">반려 사유 (선택)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="반려 사유를 입력하세요"
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-between gap-2 p-5 border-t border-slate-100">
              <button
                onClick={() => setDetail(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
              >
                닫기
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleArchive}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 disabled:opacity-50"
                >
                  보관
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  반려
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-slate-700 break-all">{value || <span className="text-slate-300">-</span>}</dd>
    </div>
  );
}
