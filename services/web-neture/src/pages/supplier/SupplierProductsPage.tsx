/**
 * SupplierProductsPage — 엑셀형 공급자 제품 관리
 *
 * WO-NETURE-SUPPLIER-EXCEL-LIST-V1
 * WO-O4O-NETURE-SUPPLIER-PRODUCTS-UX-REFORM-V1 — 벌크 가격 제거, 인라인 편집, 일괄 삭제
 * WO-NETURE-SUPPLIER-CONTENT-EDIT-UX-V1 — 이미지/설명 필터, 업로드 모달, 설명 편집 모달
 * WO-NETURE-SUPPLIER-PRODUCT-COMPLETENESS-MANAGEMENT-V1 — 완성도 점수, 진행바, 필터
 * WO-NETURE-SUPPLIER-WORKFLOW-SHORTCUTS-V1 — 부족 항목 클릭 → 편집 UI 바로 열기
 * WO-NETURE-SUPPLIER-EDIT-UI-CONSISTENCY-FIX-V1 — 재고/규제/이미지타입/상품명 편집
 *
 * EditableDataTable 기반. 다건 인라인 편집 + batch 저장.
 * 검색/정렬/페이지네이션/필터 지원.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Sparkles, ImagePlus, X, Eye, Send } from 'lucide-react';
import {
  EditableDataTable,
  SearchBar,
  Pagination,
} from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { supplierApi, productApi, type SupplierProduct, type SupplierProductPurpose } from '../../lib/api';
import ProductDetailDrawer from './ProductDetailDrawer';

// ─── Badge configs ───

const PURPOSE_CONFIG: Record<SupplierProductPurpose, { label: string; bg: string; text: string }> = {
  CATALOG: { label: '정보 제공', bg: 'bg-slate-100', text: 'text-slate-600' },
  APPLICATION: { label: '신청 가능', bg: 'bg-blue-50', text: 'text-blue-700' },
  ACTIVE_SALES: { label: '판매 중', bg: 'bg-green-50', text: 'text-green-700' },
};

// ─── Regulatory type labels (WO-NETURE-SUPPLIER-EDIT-UI-CONSISTENCY-FIX-V1) ───

const REGULATORY_TYPE_LABELS: Record<string, string> = {
  DRUG: '의약품',
  HEALTH_FUNCTIONAL: '건강기능식품',
  QUASI_DRUG: '의약외품',
  COSMETIC: '화장품',
  GENERAL: '일반',
};

// ─── Image type options (WO-NETURE-SUPPLIER-EDIT-UI-CONSISTENCY-FIX-V1) ───

const IMAGE_TYPE_OPTIONS: { value: 'thumbnail' | 'detail' | 'content'; label: string; desc: string }[] = [
  { value: 'thumbnail', label: '대표 이미지', desc: '목록/카드에 표시' },
  { value: 'detail', label: '상세 이미지', desc: '상품 상세 페이지' },
  { value: 'content', label: '콘텐츠 이미지', desc: '설명/성분 등 보조' },
];

// ─── Filter Chip ───

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-slate-800 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Image Upload Modal (WO-NETURE-SUPPLIER-EDIT-UI-CONSISTENCY-FIX-V1: 3타입 지원) ───

function ImageUploadModal({
  masterId,
  onClose,
  onUploaded,
}: {
  masterId: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageType, setImageType] = useState<'thumbnail' | 'detail' | 'content'>('thumbnail');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await productApi.uploadProductImage(masterId, file, imageType);
      onUploaded();
    } catch {
      alert('이미지 업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[400px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">이미지 업로드</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>

        {/* Image type selector */}
        <div className="flex gap-1.5 mb-4">
          {IMAGE_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setImageType(opt.value)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                imageType === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title={opt.desc}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {preview ? (
          <div className="mb-4 flex justify-center">
            <img src={preview} alt="미리보기" className="max-h-48 rounded-lg object-contain" />
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            className="mb-4 border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400"
          >
            <ImagePlus size={32} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-500">클릭하여 이미지 선택</p>
            <p className="text-[10px] text-slate-400 mt-1">{IMAGE_TYPE_OPTIONS.find(o => o.value === imageType)?.desc}</p>
          </div>
        )}

        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={uploading} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">취소</button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            {uploading ? '업로드 중...' : '업로드'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Description Edit Modal (WO-NETURE-SUPPLIER-EDIT-UI-CONSISTENCY-FIX-V1: marketingName 추가) ───

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

function DescriptionEditModal({
  product,
  onClose,
  onSaved,
}: {
  product: SupplierProduct;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [marketingName, setMarketingName] = useState(product.name || product.masterName || '');
  const [shortDesc, setShortDesc] = useState(stripHtml(product.consumerShortDescription));
  const [detailDesc, setDetailDesc] = useState(stripHtml(product.consumerDetailDescription));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supplierApi.updateProduct(product.id, {
        marketingName: marketingName || undefined,
        consumerShortDescription: shortDesc ? `<p>${shortDesc}</p>` : '',
        consumerDetailDescription: detailDesc ? `<p>${detailDesc}</p>` : '',
      });
      onSaved();
    } catch {
      alert('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[480px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">상품 정보 편집</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">상품명</label>
            <input
              type="text"
              value={marketingName}
              onChange={(e) => setMarketingName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="상품명 (마케팅명)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">간단 소개</label>
            <textarea
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="소비자에게 보여줄 간단 소개"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">상세 설명</label>
            <textarea
              value={detailDesc}
              onChange={(e) => setDetailDesc(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="상세 설명 (성분, 용법 등)"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">취소</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Regulatory Info Modal (WO-NETURE-SUPPLIER-EDIT-UI-CONSISTENCY-FIX-V1) ───

function RegulatoryInfoModal({
  product,
  onClose,
}: {
  product: SupplierProduct;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[420px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">규제 정보</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>

        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-4">
          규제 정보는 상품 등록 시 설정되며 수정할 수 없습니다.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">규제 유형</label>
            <p className="text-sm text-slate-900">
              {product.regulatoryType ? (REGULATORY_TYPE_LABELS[product.regulatoryType] || product.regulatoryType) : '-'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">포장명 (규제명)</label>
            <p className="text-sm text-slate-900">{product.regulatoryName || '-'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">MFDS 허가번호</label>
            <p className="text-sm text-slate-900 font-mono">{product.mfdsPermitNumber || '-'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">제조사</label>
            <p className="text-sm text-slate-900">{product.manufacturerName || '-'}</p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">닫기</button>
        </div>
      </div>
    </div>
  );
}

// ─── Service Key Select Modal (WO-NETURE-PRODUCT-LIFECYCLE-COMPLETION-V1) ───

const AVAILABLE_SERVICES = [
  { key: 'neture', name: 'Neture' },
  { key: 'glycopharm', name: 'GlycoPharm' },
  { key: 'glucoseview', name: 'GlucoseView' },
  { key: 'kpa-society', name: 'KPA Society' },
  { key: 'k-cosmetics', name: 'K-Cosmetics' },
];

function ServiceKeySelectModal({
  selectedCount,
  onClose,
  onSubmit,
}: {
  selectedCount: number;
  onClose: () => void;
  onSubmit: (serviceKeys: string[]) => void;
}) {
  const [chosen, setChosen] = useState<Set<string>>(new Set(['neture']));
  const [submitting, setSubmitting] = useState(false);

  const toggle = (key: string) => {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (chosen.size === 0) return;
    setSubmitting(true);
    await onSubmit(Array.from(chosen));
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[420px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">승인 요청</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          선택한 <strong>{selectedCount}개</strong> 상품을 아래 서비스에 승인 요청합니다.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {AVAILABLE_SERVICES.map((svc) => {
            const selected = chosen.has(svc.key);
            return (
              <label
                key={svc.key}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggle(svc.key)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-sm font-medium">{svc.name}</span>
              </label>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={submitting} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={chosen.size === 0 || submitting}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
          >
            <Send size={14} />
            {submitting ? '요청 중...' : '승인 요청'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Approval status helper (WO-NETURE-PRODUCT-LIFECYCLE-COMPLETION-V1) ───

function deriveSubmissionStatus(product: SupplierProduct): { label: string; bg: string; text: string } {
  const approvals = product.serviceApprovals || [];

  // offer-level APPROVED (legacy) 우선
  if (product.approvalStatus === 'APPROVED') {
    return { label: '승인', bg: 'bg-green-50', text: 'text-green-700' };
  }

  if (approvals.length === 0) {
    return { label: '미요청', bg: 'bg-slate-100', text: 'text-slate-500' };
  }

  const hasRejected = approvals.some((a) => a.status === 'rejected');
  if (hasRejected) {
    return { label: '거절', bg: 'bg-red-50', text: 'text-red-700' };
  }

  const allApproved = approvals.every((a) => a.status === 'approved');
  if (allApproved) {
    return { label: '승인', bg: 'bg-green-50', text: 'text-green-700' };
  }

  return { label: '심사중', bg: 'bg-amber-50', text: 'text-amber-700' };
}

// ─── Column definitions ───

const baseColumns: ListColumnDef<SupplierProduct>[] = [
  {
    key: 'barcode',
    header: '바코드',
    width: '120px',
    minWidth: 80,
    resizable: true,
    render: (v) => <span className="font-mono text-xs">{v || '-'}</span>,
  },
  {
    key: 'name',
    header: '상품명',
    width: '180px',
    minWidth: 100,
    resizable: true,
    render: (v) => <span className="font-medium">{v || '-'}</span>,
  },
  {
    key: 'categoryName',
    header: '카테고리',
    width: '100px',
    minWidth: 60,
    resizable: true,
    render: (v) => v || '-',
  },
  // primaryImageUrl column is inserted dynamically below
  {
    key: 'priceGeneral',
    header: '공급가',
    width: '110px',
    minWidth: 80,
    resizable: true,
    align: 'right',
    editable: true,
    render: (v) =>
      v != null ? `${Number(v).toLocaleString()}원` : '-',
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
    align: 'right',
    editable: true,
    render: (v) =>
      v != null ? `${Number(v).toLocaleString()}원` : '-',
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
    editable: true,
    render: (v: any) => v != null ? Number(v).toLocaleString() : '0',
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
  {
    key: 'distributionType',
    header: '유통',
    width: '90px',
    align: 'center',
    editable: true,
    render: (v) => {
      const config: Record<string, { label: string; cls: string }> = {
        PUBLIC: { label: '전체 공개', cls: 'bg-green-50 text-green-700' },
        SERVICE: { label: '서비스', cls: 'bg-blue-50 text-blue-700' },
        PRIVATE: { label: '비공개', cls: 'bg-amber-50 text-amber-700' },
      };
      const c = config[v] || config.PUBLIC;
      return (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${c.cls}`}>
          {c.label}
        </span>
      );
    },
    editRender: (value, _row, onChange) => (
      <select
        value={value || 'PUBLIC'}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      >
        <option value="PUBLIC">전체 공개</option>
        <option value="SERVICE">서비스</option>
        <option value="PRIVATE">비공개</option>
      </select>
    ),
  },
  // WO-NETURE-DISTRIBUTION-SETTINGS-UX-V1: serviceKeys 열
  {
    key: 'serviceKeys' as any,
    header: '서비스',
    width: '120px',
    minWidth: 70,
    resizable: true,
    render: (v: string[] | undefined | null) => {
      const keys = Array.isArray(v) ? v : [];
      if (keys.length === 0) return <span className="text-xs text-slate-400">-</span>;
      const display = keys.slice(0, 2);
      const rest = keys.length - 2;
      return (
        <div className="flex flex-wrap gap-1">
          {display.map((k) => (
            <span key={k} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">{k}</span>
          ))}
          {rest > 0 && <span className="text-[10px] text-slate-400">+{rest}</span>}
        </div>
      );
    },
  },
  {
    key: 'isActive',
    header: '활성',
    width: '60px',
    align: 'center',
    editable: true,
    render: (v) => (
      <span className={`inline-block w-3 h-3 rounded-full ${v ? 'bg-green-500' : 'bg-slate-300'}`} />
    ),
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
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
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
    render: (_v: string, row: SupplierProduct) => {
      const cfg = deriveSubmissionStatus(row);
      const approvals = row.serviceApprovals || [];
      const reasonApproval = approvals.find((a) => a.reason);
      return (
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}
          title={reasonApproval?.reason || undefined}
        >
          {cfg.label}{reasonApproval?.reason ? ' *' : ''}
        </span>
      );
    },
  },
  {
    key: 'completenessScore' as any,
    header: '완성도',
    width: '90px',
    align: 'center' as const,
    render: (v: number | undefined, row: SupplierProduct) => {
      const score = v || 0;
      const color = score >= 80 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-500';
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
  {
    key: 'tags',
    header: '태그',
    width: '120px',
    minWidth: 60,
    resizable: true,
    render: (v: string[] | undefined | null) => {
      const tags = Array.isArray(v) ? v : [];
      if (tags.length === 0) return <span className="text-xs text-slate-400">-</span>;
      return (
        <div className="flex items-center gap-1 overflow-hidden whitespace-nowrap">
          {tags.slice(0, 2).map((tag, i) => (
            <span key={i} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded truncate max-w-[50px]">{tag}</span>
          ))}
          {tags.length > 2 && (
            <span className="text-xs text-slate-400 shrink-0">+{tags.length - 2}</span>
          )}
        </div>
      );
    },
  },
];

// ─── Page Component ───

export default function SupplierProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingTagFor, setGeneratingTagFor] = useState<string | null>(null);

  // Bulk edit state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Filter state
  const [filterHasImage, setFilterHasImage] = useState('');
  const [filterHasDescription, setFilterHasDescription] = useState('');
  const [filterBarcodeSource, setFilterBarcodeSource] = useState('');
  const [filterCompleteness, setFilterCompleteness] = useState('');

  // WO-O4O-NETURE-PRODUCT-LIFECYCLE-FINALIZATION-V1: server-side approval tab
  type ApprovalTab = 'all' | 'pending' | 'approved' | 'rejected';
  const [activeTab, setActiveTab] = useState<ApprovalTab>('all');
  const [tabCounts, setTabCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  // Modal state
  const [imageUploadMasterId, setImageUploadMasterId] = useState<string | null>(null);
  const [descEditProduct, setDescEditProduct] = useState<SupplierProduct | null>(null);
  const [regulatoryProduct, setRegulatoryProduct] = useState<SupplierProduct | null>(null);

  // Drawer state (WO-O4O-NETURE-SUPPLIER-DRAWER-V1)
  const [drawerProduct, setDrawerProduct] = useState<SupplierProduct | null>(null);

  // Continuous workflow state
  const [autoNext, setAutoNext] = useState(true);
  const [highlightRowId, setHighlightRowId] = useState<string | null>(null);
  const lastEditedRef = useRef<{ id: string; type: 'image' | 'description' | 'save' } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  // Bulk delete (WO-O4O-NETURE-SUPPLIER-PRODUCTS-UX-REFORM-V1)
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const result = await supplierApi.bulkDelete(Array.from(selectedIds));
    setBulkDeleting(false);
    setShowDeleteConfirm(false);
    showToast(`${result.deleted}건 삭제 완료${result.failed.length > 0 ? ` (${result.failed.length}건 실패)` : ''}`);
    setSelectedIds(new Set());
    await fetchProducts(pagination.page);
    fetchTabCounts();
  };

  // Column with checkbox, image, description, quick price, regulatory
  const enhancedColumns = useMemo(() => {
    const selectCol: ListColumnDef<SupplierProduct> = {
      key: '_select' as any,
      header: '' as any,
      width: '40px',
      align: 'center',
      render: (_v: any, row: SupplierProduct) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelect(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 accent-blue-600 cursor-pointer"
        />
      ),
    };

    const imageCol: ListColumnDef<SupplierProduct> = {
      key: 'primaryImageUrl' as any,
      header: '이미지',
      width: '70px',
      align: 'center',
      render: (v: any, row: SupplierProduct) =>
        v ? (
          <img src={v} alt="" className="w-10 h-10 rounded object-cover mx-auto" />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setImageUploadMasterId(row.masterId); }}
            className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600"
            title="이미지 추가"
          >
            <ImagePlus size={18} />
          </button>
        ),
    };

    const descCol: ListColumnDef<SupplierProduct> = {
      key: 'consumerShortDescription' as any,
      header: '설명',
      width: '70px',
      align: 'center',
      render: (v: any, row: SupplierProduct) =>
        v ? (
          <button
            onClick={(e) => { e.stopPropagation(); setDescEditProduct(row); }}
            className="text-xs text-green-600 hover:underline"
          >
            수정
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setDescEditProduct(row); }}
            className="text-xs text-red-500 hover:underline font-medium"
          >
            미작성
          </button>
        ),
    };

    // WO-NETURE-SUPPLIER-EDIT-UI-CONSISTENCY-FIX-V1: 규제 정보 읽기 전용 컬럼
    const regulatoryCol: ListColumnDef<SupplierProduct> = {
      key: 'regulatoryType' as any,
      header: '규제',
      width: '60px',
      align: 'center' as const,
      render: (v: any, row: SupplierProduct) => {
        if (!v) return <span className="text-xs text-slate-300">-</span>;
        const label = REGULATORY_TYPE_LABELS[v] || v;
        return (
          <button
            onClick={(e) => { e.stopPropagation(); setRegulatoryProduct(row); }}
            className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 hover:bg-violet-100 truncate"
            title="규제 정보 보기"
          >
            {label}
          </button>
        );
      },
    };

    // Insert name column with group indicator
    const cols = baseColumns.map((col) => {
      if (col.key === 'name') {
        return {
          ...col,
          render: (v: any, row: SupplierProduct, index: number) => {
            const isGroupStart = index === 0 || row.masterId !== products[index - 1]?.masterId;
            const groupSize = products.filter((p) => p.masterId === row.masterId).length;
            return (
              <div>
                {isGroupStart && groupSize > 1 && (
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium mr-1">
                    {groupSize} Offers
                  </span>
                )}
                <span className={`font-medium ${!isGroupStart && groupSize > 1 ? 'pl-2 text-slate-500' : ''}`}>
                  {v || '-'}
                </span>
              </div>
            );
          },
        };
      }
      // Enhance completenessScore with clickable workflow shortcuts
      if ((col as any).key === 'completenessScore') {
        return {
          ...col,
          width: '110px',
          render: (v: number | undefined, row: SupplierProduct) => {
            const score = v || 0;
            const color = score >= 80 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-500';
            const bgColor = score >= 80 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
            type MissingItem = { label: string; action: () => void };
            const missing: MissingItem[] = [];
            if (!row.primaryImageUrl) missing.push({ label: '이미지', action: () => setImageUploadMasterId(row.masterId) });
            if (!row.priceGeneral || row.priceGeneral <= 0) missing.push({ label: '가격', action: () => showToast('공급가 셀을 클릭하여 편집하세요') });
            if (!row.consumerShortDescription) missing.push({ label: '간단 소개', action: () => setDescEditProduct(row) });
            if (!row.consumerDetailDescription) missing.push({ label: '상세 설명', action: () => setDescEditProduct(row) });
            if (!row.distributionType) missing.push({ label: '유통 타입', action: () => showToast('유통 셀을 클릭하여 편집하세요') });
            const next = missing[0];
            const isHighlighted = highlightRowId === row.id;
            return (
              <div className={`group/comp relative ${isHighlighted ? 'animate-pulse' : ''}`}>
                <div className="flex items-center gap-1.5">
                  <div className="w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${bgColor} rounded-full`} style={{ width: `${score}%` }} />
                  </div>
                  <span className={`text-xs font-medium ${color}`}>{score}%</span>
                  {isHighlighted && <span className="text-blue-500 text-xs">&#9654;</span>}
                </div>
                {next && (
                  <button
                    onClick={(e) => { e.stopPropagation(); next.action(); }}
                    className="mt-0.5 text-[10px] text-blue-600 hover:text-blue-800 hover:underline truncate block"
                  >
                    &rarr; {next.label}
                  </button>
                )}
                {missing.length > 1 && (
                  <div className="hidden group-hover/comp:flex flex-col absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 rounded shadow-lg z-10 py-1 min-w-[100px]">
                    {missing.map((item, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); item.action(); }}
                        className="px-3 py-1 text-[11px] text-white hover:bg-slate-700 text-left whitespace-nowrap"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          },
        };
      }
      return col;
    });

    // Insert imageCol after categoryName
    const catIdx = cols.findIndex((c) => c.key === 'categoryName');
    if (catIdx >= 0) cols.splice(catIdx + 1, 0, imageCol);

    // Insert descCol after consumerReferencePrice
    const refPriceIdx = cols.findIndex((c) => c.key === 'consumerReferencePrice');
    if (refPriceIdx >= 0) cols.splice(refPriceIdx + 1, 0, descCol);

    // Insert regulatoryCol after barcode
    const barcodeIdx = cols.findIndex((c) => c.key === 'barcode');
    if (barcodeIdx >= 0) cols.splice(barcodeIdx + 1, 0, regulatoryCol);

    // WO-O4O-NETURE-SUPPLIER-DRAWER-V1: 상세 보기 버튼 컬럼
    const detailCol: ListColumnDef<SupplierProduct> = {
      key: '_detail' as any,
      header: '',
      width: '40px',
      align: 'center',
      render: (_v: any, row: SupplierProduct) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setDrawerProduct(row); }}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          title="상세 보기"
        >
          <Eye size={15} />
        </button>
      ),
    };

    return [selectCol, detailCol, ...cols];
  }, [products, selectedIds, highlightRowId]);

  const handleGenerateAiTags = async (masterId: string) => {
    setGeneratingTagFor(masterId);
    await productApi.regenerateAiTags(masterId);
    setTimeout(() => {
      fetchProducts(pagination.page);
      setGeneratingTagFor(null);
    }, 2000);
  };

  const fetchProducts = useCallback(async (page = 1, searchKeyword?: string) => {
    setLoading(true);
    const kw = searchKeyword !== undefined ? searchKeyword : keyword;
    const result = await supplierApi.getProductsPaginated({
      page,
      limit: 50,
      keyword: kw || undefined,
      hasImage: filterHasImage || undefined,
      hasDescription: filterHasDescription || undefined,
      barcodeSource: filterBarcodeSource || undefined,
      completenessStatus: filterCompleteness || undefined,
      serviceApprovalStatus: activeTab === 'all' ? undefined : activeTab,
    });
    setProducts(result.data);
    setPagination(result.pagination);
    setSelectedIds(new Set());
    setDrawerProduct(null);
    setLoading(false);
  }, [keyword, filterHasImage, filterHasDescription, filterBarcodeSource, filterCompleteness, activeTab]);

  // WO-O4O-NETURE-PRODUCT-LIFECYCLE-FINALIZATION-V1: fetch tab counts
  const fetchTabCounts = useCallback(async () => {
    const counts = await supplierApi.getApprovalCounts();
    setTabCounts(counts);
  }, []);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  useEffect(() => {
    fetchTabCounts();
  }, [fetchTabCounts]);

  // Auto-next: after action completes, move to next incomplete product
  useEffect(() => {
    const pending = lastEditedRef.current;
    if (!pending || !autoNext || loading) return;
    lastEditedRef.current = null;

    const currentIdx = products.findIndex(p => p.id === pending.id);
    if (currentIdx < 0) return;

    let next: SupplierProduct | null = null;
    for (let i = currentIdx + 1; i < products.length; i++) {
      const p = products[i];
      if ((p.completenessScore || 0) < 100 && p.completenessStatus !== 'APPROVED') {
        next = p;
        break;
      }
    }

    if (!next) {
      setToast('이 페이지의 미완성 상품을 모두 처리했습니다!');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setToast(`다음: ${next.name || next.masterName}`);
    setTimeout(() => setToast(null), 3000);
    setHighlightRowId(next.id);
    setTimeout(() => setHighlightRowId(null), 2000);

    // Scroll to target row
    const targetIdx = products.findIndex(p => p.id === next!.id);
    setTimeout(() => {
      const rows = document.querySelectorAll('tbody tr');
      if (targetIdx >= 0 && rows[targetIdx]) {
        rows[targetIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    // Auto-open editor for same action type
    if (pending.type === 'image' && !next.primaryImageUrl) {
      setTimeout(() => setImageUploadMasterId(next!.masterId), 400);
    } else if (pending.type === 'description' && (!next.consumerShortDescription || !next.consumerDetailDescription)) {
      setTimeout(() => setDescEditProduct(next!), 400);
    }
  }, [products, autoNext, loading]);

  const handleSearch = useCallback((value: string) => {
    fetchProducts(1, value);
  }, [fetchProducts]);

  const handleSave = async (changedRows: SupplierProduct[]) => {
    setSaving(true);
    const updates = changedRows.map((r) => ({
      offerId: r.id,
      isActive: r.isActive,
      distributionType: r.distributionType,
      priceGeneral: r.priceGeneral != null ? Number(r.priceGeneral) : undefined,
      consumerReferencePrice: r.consumerReferencePrice != null ? Number(r.consumerReferencePrice) : null,
      stockQuantity: (r as any).stockQuantity != null ? Number((r as any).stockQuantity) : undefined,
    }));
    await supplierApi.batchUpdateProducts(updates);
    if (autoNext && changedRows.length === 1) {
      lastEditedRef.current = { id: changedRows[0].id, type: 'save' };
    }
    await fetchProducts(pagination.page);
    fetchTabCounts();
    setSaving(false);
  };

  // Filter toggle helpers
  const toggleFilter = (setter: React.Dispatch<React.SetStateAction<string>>, value: string, current: string) => {
    setter(current === value ? '' : value);
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">내 제품 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            공급하는 제품을 관리하고, 가격 및 유통 정책을 설정합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/supplier/products/library')}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
          >
            <Search size={16} />
            라이브러리 검색
          </button>
          <button
            onClick={() => navigate('/supplier/products/new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            <Plus size={16} />
            상품 등록
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3">
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          onSearch={handleSearch}
          placeholder="바코드, 상품명으로 검색"
        />
      </div>

      {/* Approval Status Tabs (WO-O4O-NETURE-PRODUCT-LIFECYCLE-FINALIZATION-V1) */}
      <div className="flex border-b border-slate-200 mb-3">
        {([
          { key: 'all' as ApprovalTab, label: '전체', count: tabCounts.total },
          { key: 'pending' as ApprovalTab, label: '승인전', count: tabCounts.pending },
          { key: 'approved' as ApprovalTab, label: '승인완료', count: tabCounts.approved },
          { key: 'rejected' as ApprovalTab, label: '거절됨', count: tabCounts.rejected },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        <FilterChip label="이미지 없음" active={filterHasImage === 'false'} onClick={() => toggleFilter(setFilterHasImage, 'false', filterHasImage)} />
        <FilterChip label="설명 없음" active={filterHasDescription === 'false'} onClick={() => toggleFilter(setFilterHasDescription, 'false', filterHasDescription)} />
        <FilterChip label="INTERNAL 상품" active={filterBarcodeSource === 'INTERNAL'} onClick={() => toggleFilter(setFilterBarcodeSource, 'INTERNAL', filterBarcodeSource)} />
        <span className="w-px h-4 bg-slate-300" />
        <FilterChip label="미완성" active={filterCompleteness === 'INCOMPLETE'} onClick={() => toggleFilter(setFilterCompleteness, 'INCOMPLETE', filterCompleteness)} />
        <FilterChip label="완성" active={filterCompleteness === 'READY'} onClick={() => toggleFilter(setFilterCompleteness, 'READY', filterCompleteness)} />
        <span className="w-px h-4 bg-slate-300" />
        <button
          onClick={() => setAutoNext(prev => !prev)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            autoNext ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          연속 작업 {autoNext ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-700 font-medium">{selectedIds.size}개 선택</span>
          <button
            onClick={() => setShowApprovalModal(true)}
            className="flex items-center gap-1 px-3 py-1 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded"
          >
            <Send size={13} />
            승인 요청
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1 text-sm text-white bg-red-600 hover:bg-red-700 rounded"
          >
            일괄 삭제
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded"
          >
            선택 해제
          </button>
        </div>
      )}

      {/* Table */}
      <EditableDataTable
        columns={[
          ...enhancedColumns,
          {
            key: 'masterId' as any,
            header: 'AI',
            width: '50px',
            align: 'center',
            render: (_v: string, row: SupplierProduct) => (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleGenerateAiTags(row.masterId); }}
                disabled={generatingTagFor === row.masterId}
                className="p-1 rounded hover:bg-blue-50 text-blue-600 disabled:opacity-50 disabled:animate-pulse"
                title="AI 태그 생성"
              >
                <Sparkles size={14} />
              </button>
            ),
          } as any,
        ]}
        data={products}
        rowKey="id"
        loading={loading}
        emptyMessage="등록된 제품이 없습니다"
        onSave={handleSave}
        saving={saving}
      />

      {/* Pagination */}
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={(p) => fetchProducts(p)}
      />

      {/* Select All hint */}
      {products.length > 0 && (
        <div className="mt-2 text-center">
          <button onClick={toggleSelectAll} className="text-xs text-slate-400 hover:text-slate-600">
            {selectedIds.size === products.length ? '전체 선택 해제' : '전체 선택'}
          </button>
        </div>
      )}

      {/* Modals */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[400px]">
            <h3 className="text-lg font-bold text-slate-900 mb-2">상품 삭제 확인</h3>
            <p className="text-sm text-slate-600 mb-1">
              선택한 <strong>{selectedIds.size}개</strong> 상품을 삭제합니다.
            </p>
            <p className="text-xs text-red-600 mb-4">이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {bulkDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
      {imageUploadMasterId && (
        <ImageUploadModal
          masterId={imageUploadMasterId}
          onClose={() => setImageUploadMasterId(null)}
          onUploaded={() => {
            const p = products.find(pr => pr.masterId === imageUploadMasterId);
            if (p) lastEditedRef.current = { id: p.id, type: 'image' };
            setImageUploadMasterId(null);
            fetchProducts(pagination.page);
          }}
        />
      )}
      {descEditProduct && (
        <DescriptionEditModal
          product={descEditProduct}
          onClose={() => setDescEditProduct(null)}
          onSaved={() => {
            lastEditedRef.current = { id: descEditProduct!.id, type: 'description' };
            setDescEditProduct(null);
            fetchProducts(pagination.page);
          }}
        />
      )}
      {regulatoryProduct && (
        <RegulatoryInfoModal
          product={regulatoryProduct}
          onClose={() => setRegulatoryProduct(null)}
        />
      )}
      {showApprovalModal && (
        <ServiceKeySelectModal
          selectedCount={selectedIds.size}
          onClose={() => setShowApprovalModal(false)}
          onSubmit={async (serviceKeys) => {
            const result = await supplierApi.submitForApproval(Array.from(selectedIds), serviceKeys);
            setShowApprovalModal(false);
            if (result.success && result.data) {
              showToast(`${result.data.submitted}건 승인 요청 완료${result.data.errors.length > 0 ? ` (${result.data.errors.length}건 실패)` : ''}`);
            } else {
              showToast('승인 요청 실패');
            }
            setSelectedIds(new Set());
            await fetchProducts(pagination.page);
          }}
        />
      )}

      {/* Product Detail Drawer (WO-O4O-NETURE-SUPPLIER-DRAWER-V1 / EDITABLE-V1) */}
      <ProductDetailDrawer
        product={drawerProduct}
        open={!!drawerProduct}
        onClose={() => setDrawerProduct(null)}
        onSaved={() => fetchProducts(pagination.page)}
      />
    </div>
  );
}
