/**
 * AllRegisteredProductsPage — 운영자 전체 등록 상품 Overview
 *
 * WO-NETURE-OPERATOR-ALL-OFFERS-VIEW-FOUNDATION-V1
 *
 * 전체 등록 상품 (isActive/distributionType 필터 없음) 조회.
 * 서버사이드 페이징 + KPI 카드 + 상세 패널 drill-down.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package, Search, RefreshCw, ChevronLeft, ChevronRight,
  X, Eye, EyeOff, FileText, FileSearch, Tag, Trash2,
  CheckCircle, XCircle,
} from 'lucide-react';
import { toast, parseApiError } from '@o4o/error-handling';
import { ContentRenderer } from '@o4o/content-editor';
import { ActionBar, BaseDetailDrawer, RowActionMenu } from '@o4o/ui';
import { DataTable, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  operatorAllOffersApi,
  type AllRegisteredOffer,
  type AllOffersKpi,
} from '../../lib/api';
import { productCleanupApi } from '../../lib/api/operatorProductCleanup';
// WO-O4O-NETURE-OPERATOR-PRODUCT-API-SCOPE-FIX-V1: adminProductApi → operatorProductApi
import { operatorProductApi } from '../../lib/api/operatorProductApi';
import {
  DISTRIBUTION_TYPE_LABELS,
  getApprovalStatusBadge,
  REGULATORY_TYPE_LABELS,
  REGULATORY_TYPE_BADGE,
  getSupplyPolicyBadges,
  getServiceDisplay,
} from '../../lib/productConstants';

// WO-NETURE-OPERATOR-PRODUCTS-UNIFIED-LIST-FINAL-V1: Primary tabs
type PrimaryTab = 'all' | 'approval' | 'supply';
type SupplySubTab = 'all' | 'service' | 'recruiting';
type ServiceTab = 'kpa-society' | 'glycopharm' | 'k-cosmetics';

const PRIMARY_TABS: { key: PrimaryTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'approval', label: '승인관리' },
  { key: 'supply', label: '공급현황' },
];

const SUPPLY_SUB_TABS: { key: SupplySubTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'service', label: '서비스' },
  { key: 'recruiting', label: '판매자모집' },
];

const SERVICE_TABS: { key: ServiceTab; label: string }[] = [
  { key: 'kpa-society', label: 'KPA' },
  { key: 'glycopharm', label: 'GlycoPharm' },
  { key: 'k-cosmetics', label: 'Cosmetics' },
];

// ─── Description/Tags Preview Modals (WO-NETURE-OPERATOR-PRODUCT-LIST-DESCRIPTION-COLUMNS-APPLY-V1) ───
// 운영자 검토 화면용 축약형: B2C/B2B를 탭 없이 한 화면에서 함께 표시.

type DescriptionMode = 'short' | 'detail';

function DescriptionPreviewModal({
  offer,
  mode,
  onClose,
}: {
  offer: AllRegisteredOffer;
  mode: DescriptionMode;
  onClose: () => void;
}) {
  const b2c = mode === 'short' ? offer.consumerShortDescription : offer.consumerDetailDescription;
  const b2b = mode === 'short' ? offer.businessShortDescription : offer.businessDetailDescription;
  const title = mode === 'short' ? '간단 설명 미리보기' : '상세 설명 미리보기';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-400 truncate">{offer.name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg flex-shrink-0">
            <X size={16} className="text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* B2C */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">B2C</span>
              <span className="text-xs text-slate-500">소비자 공개 설명</span>
            </div>
            {b2c ? (
              <ContentRenderer html={b2c} />
            ) : (
              <p className="text-xs text-slate-400 italic">미작성</p>
            )}
          </section>
          {/* Divider */}
          <div className="border-t border-slate-100" />
          {/* B2B */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">B2B</span>
              <span className="text-xs text-slate-500">판매자 지원 설명</span>
            </div>
            {b2b ? (
              <ContentRenderer html={b2b} />
            ) : (
              <p className="text-xs text-slate-400 italic">미작성</p>
            )}
          </section>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function TagsPreviewModal({
  offer,
  onClose,
}: {
  offer: AllRegisteredOffer;
  onClose: () => void;
}) {
  const tags = Array.isArray(offer.tags) ? offer.tags : [];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-800">태그 ({tags.length}개)</h3>
            <p className="text-xs text-slate-400 truncate">{offer.name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg flex-shrink-0">
            <X size={16} className="text-slate-400" />
          </button>
        </div>
        {tags.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-6">태그 없음</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t, i) => (
              <span key={i} className="inline-block px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// WO-NETURE-OPERATOR-PRODUCT-APPROVAL-ACTION-V1: 행별 승인/반려 액션 정책
// - 대상: offer-level approvalStatus (PENDING/APPROVED/REJECTED). 화면 badge와 일치
// - 행별/Bulk 모두 offer-level operatorProductApi 사용 (WO-O4O-NETURE-OPERATOR-PRODUCT-API-SCOPE-FIX-V1)
// WO-O4O-NETURE-OPERATOR-CANONICAL-INTERACTION-V1: delete 추가 → RowActionMenu
const productApprovalActionPolicy = defineActionPolicy<AllRegisteredOffer>('neture:all-products-approval', {
  inlineMax: 2,
  rules: [
    {
      key: 'approve',
      label: '승인',
      variant: 'primary',
      visible: (row) => row.approvalStatus === 'PENDING',
      confirm: (row) => ({
        title: '승인 확인',
        message: `"${row.name || row.id}"을(를) 승인하시겠습니까?`,
        confirmText: '승인',
      }),
    },
    {
      key: 'reject',
      label: '반려',
      variant: 'danger',
      visible: (row) => row.approvalStatus === 'PENDING',
      confirm: (row) => ({
        title: '상품 반려',
        message: row.name || row.id,
        variant: 'danger',
        confirmText: '반려',
        showReason: true,
        reasonPlaceholder: '반려 사유를 입력하세요 (선택)',
      }),
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      visible: () => true,
      confirm: (row) => ({
        title: '상품 삭제 확인',
        message: `"${row.name || '상품'}"을 삭제합니다. (휴지통으로 이동)`,
        variant: 'danger',
        confirmText: '삭제',
      }),
    },
  ],
});

const PRODUCT_APPROVAL_ACTION_ICONS: Record<string, React.ReactNode> = {
  approve: <CheckCircle className="w-4 h-4" />,
  reject: <XCircle className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

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
  // WO-NETURE-OPERATOR-PRODUCT-LIST-DESCRIPTION-COLUMNS-APPLY-V1
  const [shortPreviewOffer, setShortPreviewOffer] = useState<AllRegisteredOffer | null>(null);
  const [detailPreviewOffer, setDetailPreviewOffer] = useState<AllRegisteredOffer | null>(null);
  const [tagsPreviewOffer, setTagsPreviewOffer] = useState<AllRegisteredOffer | null>(null);

  // Unified tabs state
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('all');
  const [supplySubTab, setSupplySubTab] = useState<SupplySubTab>('all');
  const [serviceTab, setServiceTab] = useState<ServiceTab>('kpa-society');

  // WO-NETURE-OPERATOR-APPROVAL-LIST-SELECTION-ACTION-BAR-V1: Selection state
  const [selectedOfferIds, setSelectedOfferIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  // WO-O4O-NETURE-OPERATOR-CANONICAL-INTERACTION-V1: canonical drawer
  const [detailOffer, setDetailOffer] = useState<AllRegisteredOffer | null>(null);

  const PAGE_SIZE = 50;

  // Tab change → apply filters
  const handlePrimaryTabChange = (tab: PrimaryTab) => {
    setPrimaryTab(tab);
    setDistFilter('');
    setActiveFilter('');
    setApprovalFilter('');
    if (tab === 'approval') {
      // 승인관리: approval 상태 기준
      setApprovalFilter('PENDING');
    } else if (tab === 'supply') {
      // 공급현황: 활성 + 공개/서비스
      setActiveFilter('true');
      setSupplySubTab('all');
    }
  };

  const handleSupplySubTabChange = (sub: SupplySubTab) => {
    setSupplySubTab(sub);
    setDistFilter('');
    if (sub === 'service') {
      setDistFilter('SERVICE');
    } else if (sub === 'recruiting') {
      setDistFilter('PRIVATE');
    }
  };

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

  // Client-side service tab filtering
  const filteredOffers = useMemo(() => {
    if (primaryTab !== 'supply' || supplySubTab !== 'service') return offers;
    return offers.filter((o) =>
      o.serviceApprovals?.some((a) => a.serviceKey === serviceTab)
    );
  }, [offers, primaryTab, supplySubTab, serviceTab]);

  const displayOffers = filteredOffers;

  // WO-NETURE-OPERATOR-APPROVAL-LIST-SELECTION-ACTION-BAR-V1
  const hasPendingApproval = (o: AllRegisteredOffer) => o.approvalStatus === 'PENDING';

  // Reset selection on filter/page change
  useEffect(() => {
    setSelectedOfferIds(new Set());
  }, [page, search, distFilter, activeFilter, approvalFilter, regulatoryFilter, primaryTab, supplySubTab, serviceTab]);

  // WO-NETURE-OPERATOR-PRODUCT-APPROVAL-ACTION-V1 (보정):
  // 선택된 offer 중 PENDING(offer-level approvalStatus) offer id 추출
  const collectPendingOfferIds = (): string[] => {
    const ids: string[] = [];
    for (const o of displayOffers) {
      if (!selectedOfferIds.has(o.id)) continue;
      if (o.approvalStatus === 'PENDING') ids.push(o.id);
    }
    return ids;
  };

  // WO-O4O-NETURE-OPERATOR-CANONICAL-INTERACTION-V1: row-level delete → RowActionMenu
  const handleRowDelete = async (offer: AllRegisteredOffer) => {
    setActionLoading(true);
    try {
      const result = await productCleanupApi.softDelete(offer.id);
      if (result.success) {
        toast.success(`"${offer.name || '상품'}" 삭제되었습니다 (휴지통)`);
        setDetailOffer(null);
        await fetchOffers(page);
      } else {
        toast.error(`삭제 실패: ${result.error || '알 수 없는 오류'}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const targetOffers = displayOffers.filter((o) => selectedOfferIds.has(o.id));
    if (targetOffers.length === 0) return;
    setActionLoading(true);
    try {
      const results = await Promise.all(targetOffers.map((o) => productCleanupApi.softDelete(o.id)));
      const failed = results.filter((r) => !r.success).length;
      if (failed === 0) {
        toast.success(`${targetOffers.length}개 삭제 완료 (휴지통으로 이동)`);
      } else {
        toast.error(`${targetOffers.length - failed}개 삭제, ${failed}개 실패`);
      }
      setSelectedOfferIds(new Set());
      await fetchOffers(page);
    } catch {
      toast.error('삭제 중 오류가 발생했습니다');
    } finally {
      setActionLoading(false);
    }
  };

  // WO-NETURE-OPERATOR-PRODUCT-APPROVAL-ACTION-V1 (보정):
  // WO-O4O-NETURE-OPERATOR-PRODUCT-API-SCOPE-FIX-V1: operatorProductApi로 교체
  // 응답 형태: { success, data: { results: [{ id, status: success|skipped|failed }] } }
  const handleBulkApprove = async () => {
    const ids = collectPendingOfferIds();
    if (ids.length === 0) {
      toast.error('선택한 상품 중 승인 대기 중인 항목이 없습니다.');
      return;
    }
    setActionLoading(true);
    try {
      const result = await operatorProductApi.batchApprove(ids);
      const results: Array<{ status: string }> = result?.data?.results ?? [];
      const successCount = results.filter((r) => r.status === 'success').length;
      const failedCount = results.filter((r) => r.status === 'failed').length;
      if (failedCount === 0) {
        toast.success(`승인 완료: ${successCount}건`);
      } else {
        toast.error(`${successCount}건 승인, ${failedCount}건 실패`);
      }
      setSelectedOfferIds(new Set());
      await fetchOffers(page);
    } catch (err) {
      toast.error(parseApiError(err).userMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkReject = async (reason?: string) => {
    const ids = collectPendingOfferIds();
    if (ids.length === 0) return;
    setActionLoading(true);
    try {
      const result = await operatorProductApi.batchReject(ids, reason || undefined);
      const results: Array<{ status: string }> = result?.data?.results ?? [];
      const successCount = results.filter((r) => r.status === 'success').length;
      const failedCount = results.filter((r) => r.status === 'failed').length;
      if (failedCount === 0) {
        toast.success(`반려 완료: ${successCount}건`);
      } else {
        toast.error(`${successCount}건 반려, ${failedCount}건 실패`);
      }
      setSelectedOfferIds(new Set());
      await fetchOffers(page);
    } catch (err) {
      toast.error(parseApiError(err).userMessage);
    } finally {
      setActionLoading(false);
    }
  };

  // WO-NETURE-OPERATOR-PRODUCT-APPROVAL-ACTION-V1: 행별 승인/반려 (offer-level)
  const handleRowApprove = async (offer: AllRegisteredOffer) => {
    setActionLoading(true);
    try {
      const ok = await operatorProductApi.approveProduct(offer.id);
      if (ok) {
        toast.success(`"${offer.name || '상품'}" 승인되었습니다`);
        await fetchOffers(page);
      } else {
        toast.error('승인에 실패했습니다');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRowReject = async (offer: AllRegisteredOffer, reason?: string) => {
    setActionLoading(true);
    try {
      const ok = await operatorProductApi.rejectProduct(offer.id, reason);
      if (ok) {
        toast.success(`"${offer.name || '상품'}" 반려되었습니다`);
        await fetchOffers(page);
      } else {
        toast.error('반려에 실패했습니다');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkToggleActive = async (isActive: boolean) => {
    const ids = Array.from(selectedOfferIds);
    if (ids.length === 0) return;
    const label = isActive ? '활성화' : '비활성화';
    setActionLoading(true);
    try {
      const result = await operatorAllOffersApi.batchToggleActive(ids, isActive);
      const failCount = result.failed?.length || 0;
      if (failCount === 0) {
        toast.success(`${ids.length}개 ${label} 완료`);
      } else {
        toast.error(`${ids.length - failCount}개 ${label}, ${failCount}개 실패`);
      }
      setSelectedOfferIds(new Set());
      await fetchOffers(page);
    } catch {
      toast.error(`${label} 중 오류가 발생했습니다`);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Column definitions (WO-O4O-NETURE-OPERATOR-CANONICAL-INTERACTION-V1) ───
  // WO-O4O-NETURE-OPERATOR-PRODUCTS-LIST-MIGRATE-TO-BASETABLE-V1
  // DataTable selectable prop handles checkbox — no manual _select column needed
  const columns = useMemo<ListColumnDef<AllRegisteredOffer>[]>(() => [
    {
      key: '_image',
      header: '',
      width: '56px',
      system: true,
      render: (_v, row) => row.primaryImageUrl ? (
        <img src={row.primaryImageUrl} alt="" className="w-10 h-10 rounded object-cover" />
      ) : (
        <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
          <Package className="w-5 h-5 text-slate-400" />
        </div>
      ),
    },
    {
      key: 'name',
      header: '상품명',
      sortable: true,
      sortAccessor: (row) => row.name || '',
      render: (_v, row) => (
        <>
          <p className="font-medium text-slate-800">{row.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{row.barcode || row.id.slice(0, 8)}</p>
        </>
      ),
    },
    {
      key: 'supplierName',
      header: '공급자',
      sortable: true,
      sortAccessor: (row) => row.supplierName || '',
      render: (v) => <span className="text-slate-600">{v || '-'}</span>,
    },
    {
      key: 'categoryName',
      header: '카테고리',
      sortable: true,
      sortAccessor: (row) => row.categoryName || '',
      render: (v) => <span className="text-slate-600 text-sm">{v || '-'}</span>,
    },
    {
      key: 'regulatoryType',
      header: '규제',
      align: 'center',
      sortable: true,
      sortAccessor: (row) => row.regulatoryType ? (REGULATORY_TYPE_LABELS[row.regulatoryType] || row.regulatoryType) : '',
      render: (_v, row) => {
        const regLabel = row.regulatoryType ? REGULATORY_TYPE_LABELS[row.regulatoryType] : null;
        const regBadge = row.regulatoryType ? REGULATORY_TYPE_BADGE[row.regulatoryType] : null;
        return regLabel && regBadge ? (
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${regBadge.bg} ${regBadge.text}`}>
            {regLabel}
          </span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        );
      },
    },
    {
      key: 'isActive',
      header: '활성',
      align: 'center',
      sortable: true,
      sortAccessor: (row) => (row.isActive ? 1 : 0),
      render: (_v, row) => row.isActive ? (
        <Eye className="w-4 h-4 text-green-600 mx-auto" />
      ) : (
        <EyeOff className="w-4 h-4 text-slate-400 mx-auto" />
      ),
    },
    {
      key: 'distributionType',
      header: '유통',
      align: 'center',
      sortable: true,
      sortAccessor: (row) => row.distributionType || '',
      render: (_v, row) => {
        const policyBadges = getSupplyPolicyBadges(row);
        return (
          <div className="flex flex-wrap gap-0.5 justify-center">
            {policyBadges.map((b) => (
              <span key={b.label} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${b.bg} ${b.text}`}>
                {b.label}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'priceGeneral',
      header: '공급가',
      align: 'right',
      sortable: true,
      sortAccessor: (row) => (row.priceGeneral != null ? Number(row.priceGeneral) : null),
      render: (v) => <span className="text-slate-700">{v ? `₩${Number(v).toLocaleString()}` : '-'}</span>,
    },
    {
      key: 'approvalStatus',
      header: '승인',
      align: 'center',
      sortable: true,
      sortAccessor: (row) => row.approvalStatus || '',
      render: (_v, row) => {
        const apprBadge = getApprovalStatusBadge(row.approvalStatus);
        return (
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${apprBadge.bg} ${apprBadge.text}`}>
            {apprBadge.label}
          </span>
        );
      },
    },
    {
      key: 'serviceApprovals',
      header: '서비스',
      align: 'center',
      sortable: true,
      sortAccessor: (row) => getServiceDisplay(row.serviceApprovals?.map((a) => a.serviceKey)) || '',
      render: (_v, row) => {
        const svcDisplay = getServiceDisplay(row.serviceApprovals?.map((a) => a.serviceKey));
        return svcDisplay ? (
          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{svcDisplay}</span>
        ) : (
          <span className="text-xs text-slate-300">-</span>
        );
      },
    },
    // WO-NETURE-OPERATOR-PRODUCT-LIST-DESCRIPTION-COLUMNS-APPLY-V1
    {
      key: '_shortDesc',
      header: '간단 설명',
      align: 'center',
      width: '80px',
      render: (_v, row) => {
        const has = !!(row.consumerShortDescription || row.businessShortDescription);
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShortPreviewOffer(row); }}
            className={`p-1 rounded ${has ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}
            title={has ? '간단 설명 보기 (B2C/B2B)' : '미작성'}
          >
            <FileText className="w-4 h-4" />
          </button>
        );
      },
    },
    {
      key: '_detailDesc',
      header: '상세 설명',
      align: 'center',
      width: '80px',
      render: (_v, row) => {
        const has = !!(row.consumerDetailDescription || row.businessDetailDescription);
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDetailPreviewOffer(row); }}
            className={`p-1 rounded ${has ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-300 hover:bg-slate-50'}`}
            title={has ? '상세 설명 보기 (B2C/B2B)' : '미작성'}
          >
            <FileSearch className="w-4 h-4" />
          </button>
        );
      },
    },
    {
      key: '_tags',
      header: '태그',
      align: 'center',
      width: '80px',
      render: (_v, row) => {
        const count = Array.isArray(row.tags) ? row.tags.length : 0;
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setTagsPreviewOffer(row); }}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${count > 0 ? 'text-violet-700 hover:bg-violet-50' : 'text-slate-300 hover:bg-slate-50'}`}
            title={count > 0 ? `태그 ${count}개 보기` : '태그 없음'}
          >
            <Tag className="w-3.5 h-3.5" />
            {count > 0 && <span className="text-[10px] font-medium">{count}</span>}
          </button>
        );
      },
    },
    // WO-NETURE-OPERATOR-PRODUCT-APPROVAL-ACTION-V1: 행별 승인/반려/삭제 메뉴
    // WO-O4O-NETURE-OPERATOR-CANONICAL-INTERACTION-V1: delete added as destructive action
    {
      key: '_actions',
      header: '',
      align: 'center',
      width: '60px',
      system: true,
      onCellClick: () => { /* swallow row click */ },
      render: (_v, row) => (
        <RowActionMenu
          actions={buildRowActions(
            productApprovalActionPolicy,
            row,
            {
              approve: () => handleRowApprove(row),
              reject: (reason?: string) => handleRowReject(row, reason),
              delete: () => handleRowDelete(row),
            },
            { icons: PRODUCT_APPROVAL_ACTION_ICONS },
          )}
        />
      ),
    },
  ], []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">상품 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            플랫폼 상품 현황 · 승인 · 공급 통합 관리
          </p>
        </div>
        <button
          onClick={() => fetchOffers(page)}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />새로고침
        </button>
      </div>

      {/* Primary Tabs */}
      <div className="flex gap-1 mb-3 border-b border-slate-200">
        {PRIMARY_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handlePrimaryTabChange(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              primaryTab === t.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Secondary Tabs (supply) */}
      {primaryTab === 'supply' && (
        <div className="flex gap-1 mb-3">
          {SUPPLY_SUB_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => handleSupplySubTabChange(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                supplySubTab === t.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Tertiary Tabs (service) */}
      {primaryTab === 'supply' && supplySubTab === 'service' && (
        <div className="flex gap-1 mb-3">
          {SERVICE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setServiceTab(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                serviceTab === t.key
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Approval sub-tabs */}
      {primaryTab === 'approval' && (
        <div className="flex gap-1 mb-3">
          {[
            { key: '', label: '전체' },
            { key: 'PENDING', label: '대기' },
            { key: 'APPROVED', label: '승인' },
            { key: 'REJECTED', label: '거절' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setApprovalFilter(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                approvalFilter === t.key
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

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

      {/* V4-EXPANSION: Standard ActionBar */}
      {(() => {
        const pendingCount = displayOffers.filter((o) => selectedOfferIds.has(o.id) && hasPendingApproval(o)).length;
        return (
          <div className="mb-3">
            <ActionBar
              selectedCount={selectedOfferIds.size}
              onClearSelection={() => setSelectedOfferIds(new Set())}
              actions={[
                {
                  key: 'approve',
                  label: `승인 (${pendingCount})`,
                  onClick: handleBulkApprove,
                  variant: 'primary' as const,
                  loading: actionLoading,
                  group: 'approval',
                  visible: pendingCount > 0,
                  confirm: {
                    title: '일괄 승인 확인',
                    message: `${selectedOfferIds.size}개 상품의 ${pendingCount}개 승인 요청을 일괄 승인합니다.`,
                    confirmText: '승인',
                  },
                },
                {
                  key: 'reject',
                  label: `거절 (${pendingCount})`,
                  onClick: handleBulkReject,
                  variant: 'danger' as const,
                  loading: actionLoading,
                  group: 'approval',
                  visible: pendingCount > 0,
                  confirm: {
                    title: '일괄 거절 확인',
                    message: `${selectedOfferIds.size}개 상품의 ${pendingCount}개 승인 요청을 일괄 거절합니다.`,
                    variant: 'danger' as const,
                    confirmText: '거절',
                    showReason: true,
                    reasonPlaceholder: '거절 사유를 입력하세요 (선택)',
                  },
                },
                {
                  key: 'activate',
                  label: `활성화 (${selectedOfferIds.size})`,
                  onClick: () => handleBulkToggleActive(true),
                  icon: <Eye className="w-3.5 h-3.5" />,
                  loading: actionLoading,
                  group: 'status',
                  confirm: {
                    title: '일괄 활성화 확인',
                    message: `선택한 ${selectedOfferIds.size}개 상품을 활성화합니다.`,
                    confirmText: '활성화',
                  },
                },
                {
                  key: 'deactivate',
                  label: `비활성화 (${selectedOfferIds.size})`,
                  onClick: () => handleBulkToggleActive(false),
                  variant: 'warning' as const,
                  icon: <EyeOff className="w-3.5 h-3.5" />,
                  loading: actionLoading,
                  group: 'status',
                  confirm: {
                    title: '일괄 비활성화 확인',
                    message: `선택한 ${selectedOfferIds.size}개 상품을 비활성화합니다.`,
                    variant: 'warning' as const,
                    confirmText: '비활성화',
                  },
                },
                {
                  key: 'delete',
                  label: `삭제 (${selectedOfferIds.size})`,
                  onClick: handleBulkDelete,
                  variant: 'danger' as const,
                  icon: <Trash2 className="w-3.5 h-3.5" />,
                  loading: actionLoading,
                  group: 'danger',
                  confirm: {
                    title: '일괄 삭제 확인',
                    message: `선택한 ${selectedOfferIds.size}개 상품을 삭제합니다. (휴지통으로 이동)`,
                    variant: 'danger' as const,
                    confirmText: '삭제',
                  },
                },
              ]}
            />
          </div>
        );
      })()}

      {/* Table — WO-O4O-NETURE-OPERATOR-PRODUCTS-LIST-MIGRATE-TO-BASETABLE-V1 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <DataTable<AllRegisteredOffer>
          columns={columns}
          data={displayOffers}
          rowKey="id"
          loading={loading}
          emptyMessage={
            search || distFilter || activeFilter || approvalFilter || regulatoryFilter
              ? '조건에 맞는 상품이 없습니다.'
              : '등록된 상품이 없습니다.'
          }
          onRowClick={(row) => setDetailOffer(row)}
          tableId="neture-operator-all-products"
          reorderable
          persistState
          columnVisibility
          selectable
          selectedKeys={selectedOfferIds}
          onSelectionChange={setSelectedOfferIds}
        />

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

      {/* WO-NETURE-OPERATOR-PRODUCT-LIST-DESCRIPTION-COLUMNS-APPLY-V1: Preview modals */}
      {shortPreviewOffer && (
        <DescriptionPreviewModal
          offer={shortPreviewOffer}
          mode="short"
          onClose={() => setShortPreviewOffer(null)}
        />
      )}
      {detailPreviewOffer && (
        <DescriptionPreviewModal
          offer={detailPreviewOffer}
          mode="detail"
          onClose={() => setDetailPreviewOffer(null)}
        />
      )}
      {tagsPreviewOffer && (
        <TagsPreviewModal
          offer={tagsPreviewOffer}
          onClose={() => setTagsPreviewOffer(null)}
        />
      )}

      {/* WO-O4O-NETURE-OPERATOR-CANONICAL-INTERACTION-V1: canonical BaseDetailDrawer */}
      <BaseDetailDrawer
        open={!!detailOffer}
        onClose={() => setDetailOffer(null)}
        title={detailOffer?.name ?? ''}
        width={520}
      >
        {detailOffer && (
          <div style={{ fontSize: 14, color: '#374151' }}>
            {/* Image */}
            {detailOffer.primaryImageUrl ? (
              <img
                src={detailOffer.primaryImageUrl}
                alt=""
                style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }}
              />
            ) : (
              <div style={{ width: '100%', height: 120, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Package style={{ width: 40, height: 40, color: '#cbd5e1' }} />
              </div>
            )}
            {/* Metadata */}
            {[
              { label: '공급사', value: detailOffer.supplierName || '-' },
              { label: '카테고리', value: detailOffer.categoryName || '-' },
              { label: '공급가', value: detailOffer.priceGeneral ? `₩${Number(detailOffer.priceGeneral).toLocaleString()}` : '-' },
              { label: '소비자가', value: detailOffer.consumerReferencePrice ? `₩${Number(detailOffer.consumerReferencePrice).toLocaleString()}` : '-' },
              { label: '승인 상태', value: getApprovalStatusBadge(detailOffer.approvalStatus).label },
              { label: '활성', value: detailOffer.isActive ? '활성' : '비활성' },
              { label: '유통 방식', value: DISTRIBUTION_TYPE_LABELS[detailOffer.distributionType] || detailOffer.distributionType || '-' },
              { label: '규제 유형', value: detailOffer.regulatoryType ? (REGULATORY_TYPE_LABELS[detailOffer.regulatoryType] || detailOffer.regulatoryType) : '-' },
              { label: '등록일', value: new Date(detailOffer.createdAt).toLocaleDateString('ko-KR') },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: '#64748b', minWidth: 80, flexShrink: 0 }}>{item.label}</span>
                <span style={{ color: '#1e293b' }}>{item.value}</span>
              </div>
            ))}
            {/* Service exposure */}
            {detailOffer.serviceApprovals && detailOffer.serviceApprovals.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>서비스 노출 현황</div>
                {detailOffer.serviceApprovals.map((sa, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: '#374151' }}>{sa.serviceKey}</span>
                    <span style={{ color: sa.status === 'approved' ? '#15803d' : sa.status === 'rejected' ? '#dc2626' : '#d97706', fontWeight: 500 }}>
                      {sa.status === 'approved' ? '승인' : sa.status === 'rejected' ? '반려' : '대기'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </BaseDetailDrawer>
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

// WO-NETURE-OPERATOR-PRODUCTS-UNIFIED-LIST-V1: ServiceBadges 제거 → getServiceDisplay() 사용
