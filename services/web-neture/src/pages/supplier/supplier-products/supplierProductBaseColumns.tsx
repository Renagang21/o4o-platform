import { Tag } from 'lucide-react';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import type { SupplierProduct, SupplierProductPurpose } from '../../../lib/api';
import {
  APPROVAL_STATUS_BADGE,
  VISIBILITY_STATUS,
  getVisibilityStatus,
  getSupplyPolicyBadges,
  getServiceDisplay,
} from '../../../lib/productConstants';

const PURPOSE_CONFIG: Record<SupplierProductPurpose, { label: string; bg: string; text: string }> =
  {
    CATALOG: { label: '정보 제공', bg: 'bg-slate-100', text: 'text-slate-600' },
    APPLICATION: { label: '신청 가능', bg: 'bg-blue-50', text: 'text-blue-700' },
    ACTIVE_SALES: { label: '판매 중', bg: 'bg-green-50', text: 'text-green-700' },
  };

function deriveSubmissionStatus(product: SupplierProduct): {
  label: string;
  bg: string;
  text: string;
} {
  // WO-NETURE-LEGACY-NETURE-SERVICE-SELECTION-DATA-CLEANUP-V1: neture 필터링
  const approvals = (product.serviceApprovals || []).filter((a) => a.serviceKey !== 'neture');

  // offer-level APPROVED (legacy) 우선
  if (product.approvalStatus === 'APPROVED') {
    return APPROVAL_STATUS_BADGE.approved;
  }

  if (approvals.length === 0) {
    return APPROVAL_STATUS_BADGE.none;
  }

  const hasRejected = approvals.some((a) => a.status === 'rejected');
  if (hasRejected) {
    return APPROVAL_STATUS_BADGE.rejected;
  }

  const allApproved = approvals.every((a) => a.status === 'approved');
  if (allApproved) {
    return APPROVAL_STATUS_BADGE.approved;
  }

  return APPROVAL_STATUS_BADGE.pending;
}

// ─── Column definitions ───

export const baseColumns: ListColumnDef<SupplierProduct>[] = [
  {
    key: 'barcode',
    header: '바코드',
    width: '120px',
    minWidth: 80,
    resizable: true,
    sortable: true,
    render: (v) => <span className="font-mono text-xs">{v || '-'}</span>,
  },
  {
    key: 'name',
    header: '상품명',
    width: '180px',
    minWidth: 100,
    resizable: true,
    sortable: true,
    render: (v) => <span className="font-medium">{v || '-'}</span>,
  },
  {
    key: 'categoryName',
    header: '카테고리',
    width: '100px',
    minWidth: 60,
    resizable: true,
    sortable: true,
    render: (v) => v || '-',
  },
  // primaryImageUrl column is inserted dynamically below
  {
    key: 'priceGeneral',
    header: '공급가',
    width: '110px',
    minWidth: 80,
    resizable: true,
    sortable: true,
    sortAccessor: (row) => (row.priceGeneral != null ? Number(row.priceGeneral) : null),
    align: 'right',
    editable: true,
    render: (v) => (v != null ? `${Number(v).toLocaleString()}원` : '-'),
    editRender: (value, _row, onChange) => (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full px-2 py-1 text-sm text-right border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      />
    ),
  },
  {
    key: 'consumerReferencePrice',
    header: '소비자가',
    width: '100px',
    minWidth: 80,
    resizable: true,
    sortable: true,
    sortAccessor: (row) =>
      row.consumerReferencePrice != null ? Number(row.consumerReferencePrice) : null,
    align: 'right',
    editable: true,
    render: (v) => (v != null ? `${Number(v).toLocaleString()}원` : '-'),
    editRender: (value, _row, onChange) => (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full px-2 py-1 text-sm text-right border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      />
    ),
  },
  // WO-NETURE-SUPPLIER-EDIT-UI-CONSISTENCY-FIX-V1: 재고 인라인 편집
  {
    key: 'stockQuantity' as any,
    header: '재고',
    width: '80px',
    align: 'right' as const,
    sortable: true,
    sortAccessor: (row: any) => (row.stockQuantity != null ? Number(row.stockQuantity) : null),
    editable: true,
    render: (v: any) => (v != null ? Number(v).toLocaleString() : '0'),
    editRender: (value: any, _row: any, onChange: any) => (
      <input
        type="number"
        value={value ?? 0}
        onChange={(e: any) => onChange(e.target.value ? Number(e.target.value) : 0)}
        className="w-full px-2 py-1 text-sm text-right border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        min="0"
        autoFocus
      />
    ),
  },
  // WO-NETURE-SUPPLIER-PRODUCT-LIST-STRUCTURE-REFINE-V1: 통합 유통 정책 컬럼
  {
    key: 'distributionType',
    header: '유통',
    width: '120px',
    minWidth: 80,
    resizable: true,
    render: (_v: string, row: SupplierProduct) => {
      const badges = getSupplyPolicyBadges(row);
      return (
        <div className="flex flex-wrap gap-0.5">
          {badges.map((b) => (
            <span
              key={b.label}
              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${b.bg} ${b.text}`}
            >
              {b.label}
            </span>
          ))}
        </div>
      );
    },
  },
  // WO-NETURE-SUPPLIER-PRODUCT-LIST-STRUCTURE-REFINE-V1: KPA 우선 서비스 표기
  {
    key: 'serviceKeys' as any,
    header: '서비스',
    width: '100px',
    minWidth: 60,
    resizable: true,
    render: (v: string[] | undefined | null) => {
      const display = getServiceDisplay(v);
      if (!display)
        return (
          <span
            className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium"
            title="승인요청 전 상품 편집에서 서비스를 선택하세요"
          >
            서비스 미설정
          </span>
        );
      return (
        <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
          {display}
        </span>
      );
    },
  },
  {
    key: 'isActive',
    header: '노출',
    width: '80px',
    align: 'center',
    editable: true,
    render: (v: boolean, row: SupplierProduct) => {
      const key = getVisibilityStatus(row);
      const s = VISIBILITY_STATUS[key];
      return (
        <div className="flex items-center justify-center gap-1" title={s.description}>
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${v ? 'bg-green-500' : 'bg-slate-300'}`}
          />
          <span className={`text-[10px] font-medium leading-tight ${s.text}`}>{s.label}</span>
        </div>
      );
    },
    editRender: (value, _row, onChange) => (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-blue-600 cursor-pointer"
      />
    ),
  },
  {
    key: 'purpose',
    header: '상태',
    width: '80px',
    align: 'center',
    render: (v: SupplierProductPurpose) => {
      const cfg = PURPOSE_CONFIG[v] || PURPOSE_CONFIG.CATALOG;
      return (
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}
        >
          {cfg.label}
        </span>
      );
    },
  },
  {
    key: 'approvalStatus',
    header: '승인',
    width: '90px',
    align: 'center',
    sortable: true,
    sortAccessor: (row: SupplierProduct) => deriveSubmissionStatus(row).label,
    render: (_v: string, row: SupplierProduct) => {
      const cfg = deriveSubmissionStatus(row);
      const approvals = (row.serviceApprovals || []).filter((a) => a.serviceKey !== 'neture');
      // WO-O4O-NETURE-SUPPLIER-PRODUCT-CANCELLED-STATUS-LABEL-CONSISTENCY-V1:
      // 반려(rejected) 사유만 '*'/tooltip 으로 표시. cancelled(공급자 철회)는 문제 표시가 아니므로 제외 —
      // 승인 badge 에 철회 사유가 붙어 반려처럼 오인되지 않게 한다.
      const reasonApproval = approvals.find((a) => a.reason && a.status === 'rejected');
      return (
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}
          title={reasonApproval?.reason || undefined}
        >
          {cfg.label}
          {reasonApproval?.reason ? ' *' : ''}
        </span>
      );
    },
  },
  {
    key: 'completenessScore' as any,
    header: '완성도',
    width: '90px',
    align: 'center' as const,
    sortable: true,
    sortAccessor: (row: any) => (row.completenessScore != null ? Number(row.completenessScore) : 0),
    render: (v: number | undefined, row: SupplierProduct) => {
      const score = v || 0;
      const color =
        score >= 80 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-500';
      const bgColor = score >= 80 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
      const missing: string[] = [];
      if (!row.priceGeneral || row.priceGeneral <= 0) missing.push('가격');
      if (!row.primaryImageUrl) missing.push('이미지');
      if (!row.consumerShortDescription) missing.push('간단 소개');
      if (!row.consumerDetailDescription) missing.push('상세 설명');
      if (!row.distributionType) missing.push('유통 타입');
      return (
        <div className="group relative">
          <div className="flex items-center gap-1.5">
            <div className="w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full ${bgColor} rounded-full`} style={{ width: `${score}%` }} />
            </div>
            <span className={`text-xs font-medium ${color}`}>{score}%</span>
          </div>
          {missing.length > 0 && (
            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded whitespace-nowrap z-10">
              부족: {missing.join(', ')}
            </div>
          )}
        </div>
      );
    },
  },
  // WO-NETURE-PRODUCT-LIST-COLUMN-LABEL-AND-DESCRIPTION-REFINE-V1:
  // 태그 컬럼: 텍스트 직접 노출 → 아이콘 + tooltip 조회 방식
  {
    key: 'tags',
    header: '태그',
    width: '60px',
    align: 'center',
    render: (v: string[] | undefined | null) => {
      const tags = Array.isArray(v) ? v : [];
      if (tags.length === 0) return <span className="text-xs text-slate-300">-</span>;
      return (
        <span
          className="inline-flex items-center gap-1 text-blue-600"
          title={`${tags.length}개: ${tags.join(', ')}`}
        >
          <Tag size={13} />
          <span className="text-[11px] font-medium">{tags.length}</span>
        </span>
      );
    },
  },
];
