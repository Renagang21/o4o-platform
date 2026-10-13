import { useMemo, type Dispatch, type SetStateAction } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { ImagePlus, Eye, FileText } from 'lucide-react';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import type { SupplierProduct } from '../../../lib/api';
import {
  getAllowedOfferActions,
  getDrugSupplyGate,
  getSupplierProductTypeLabel,
  SUPPLIER_OFFER_ACTION_META,
  buildOfferActionUrl,
  type SupplierOfferAction,
} from '../../../lib/supplierProductTypes';
import { REGULATORY_TYPE_LABELS } from '../../../lib/productConstants';
import { baseColumns } from './supplierProductBaseColumns';
import type { RecruitModalProduct } from './productListFeedback';
import type { useSupplierProducts } from './useSupplierProducts';

type ColumnContext = Pick<
  ReturnType<typeof useSupplierProducts>,
  | 'products'
  | 'selectedIds'
  | 'highlightRowId'
  | 'toggleSelect'
  | 'toggleSelectAll'
  | 'setDrawerProduct'
  | 'showToast'
> & {
  navigate: NavigateFunction;
  setRegulatoryProduct: Dispatch<SetStateAction<SupplierProduct | null>>;
  setPreviewProduct: Dispatch<SetStateAction<SupplierProduct | null>>;
  setRecruitModalProduct: Dispatch<SetStateAction<RecruitModalProduct | null>>;
};

export function useSupplierProductColumns({
  products,
  selectedIds,
  highlightRowId,
  toggleSelect,
  toggleSelectAll,
  setDrawerProduct,
  showToast,
  navigate,
  setRegulatoryProduct,
  setPreviewProduct,
  setRecruitModalProduct,
}: ColumnContext) {
  // Column with checkbox, image, description, quick price, regulatory
  const enhancedColumns = useMemo(() => {
    const allSelected = products.length > 0 && selectedIds.size === products.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < products.length;
    // WO-NETURE-SUPPLIER-PRODUCT-LIST-CHECKBOX-FIX-V1:
    // operator 패턴과 동일하게 full custom — header 체크박스 직접 렌더 + onCellClick swallow
    const selectCol: ListColumnDef<SupplierProduct> = {
      key: '_select' as any,
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected;
          }}
          onChange={toggleSelectAll}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 accent-blue-600 cursor-pointer"
        />
      ) as any,
      width: '40px',
      align: 'center',
      system: true,
      sticky: true,
      onCellClick: () => {
        /* swallow row/cell click so checkbox clicks are isolated */
      },
      render: (_v: any, row: SupplierProduct) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            toggleSelect(row.id);
          }}
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
            onClick={(e) => {
              e.stopPropagation();
              setDrawerProduct(row);
            }}
            className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600"
            title="이미지 추가"
          >
            <ImagePlus size={18} />
          </button>
        ),
    };

    // WO-NETURE-PRODUCT-LIST-COLUMN-LABEL-AND-DESCRIPTION-REFINE-V1:
    // 설명 단일 컬럼 → 간단설명/상세설명 2개 분리 (아이콘 기반)
    const shortDescCol: ListColumnDef<SupplierProduct> = {
      key: 'consumerShortDescription' as any,
      header: '간단설명',
      width: '70px',
      align: 'center',
      render: (v: any, row: SupplierProduct) => {
        const has = !!v;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDrawerProduct(row);
            }}
            className={`p-1 rounded ${has ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-100'}`}
            title={has ? '간단설명 보기/편집' : '간단설명 미작성'}
          >
            <FileText size={14} />
          </button>
        );
      },
    };

    const detailDescCol: ListColumnDef<SupplierProduct> = {
      key: '_detailDesc' as any,
      header: '상세설명',
      width: '70px',
      align: 'center',
      render: (_v: any, row: SupplierProduct) => {
        const has = !!row.consumerDetailDescription;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPreviewProduct(row);
            }}
            className={`p-1 rounded ${has ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-300 hover:bg-slate-100'}`}
            title={has ? '상세설명 미리보기' : '상세설명 미작성'}
          >
            <FileText size={14} />
          </button>
        );
      },
    };

    // WO-NETURE-SUPPLIER-EDIT-UI-CONSISTENCY-FIX-V1: 규제 정보 읽기 전용 컬럼
    const regulatoryCol: ListColumnDef<SupplierProduct> = {
      key: 'regulatoryType' as any,
      header: '규제',
      width: '60px',
      align: 'center' as const,
      render: (v: any, row: SupplierProduct) => {
        if (!v) return <span className="text-xs text-slate-300">-</span>;
        // WO-O4O-NETURE-SUPPLIER-PRODUCT-LIST-DRUGCATEGORY-EXPOSURE-V1: drugCategory 조합 라벨
        const label =
          getSupplierProductTypeLabel(v, row.drugCategory) ?? REGULATORY_TYPE_LABELS[v] ?? v;
        const isDrug = String(v).toUpperCase() === 'DRUG';
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRegulatoryProduct(row);
            }}
            className={`text-[10px] px-1.5 py-0.5 rounded truncate ${isDrug ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}
            title="규제/분류 정보 보기"
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
                <span
                  className={`font-medium ${!isGroupStart && groupSize > 1 ? 'pl-2 text-slate-500' : ''}`}
                >
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
            const color =
              score >= 80 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-500';
            const bgColor =
              score >= 80 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
            type MissingItem = { label: string; action: () => void };
            const missing: MissingItem[] = [];
            if (!row.primaryImageUrl)
              missing.push({ label: '이미지', action: () => setDrawerProduct(row) });
            if (!row.priceGeneral || row.priceGeneral <= 0)
              missing.push({
                label: '가격',
                action: () => showToast('공급가 셀을 클릭하여 편집하세요'),
              });
            if (!row.consumerShortDescription)
              missing.push({ label: '간단 소개', action: () => setDrawerProduct(row) });
            if (!row.consumerDetailDescription)
              missing.push({ label: '상세 설명', action: () => setDrawerProduct(row) });
            if (!row.distributionType)
              missing.push({
                label: '유통 타입',
                action: () => showToast('유통 셀을 클릭하여 편집하세요'),
              });
            const next = missing[0];
            const isHighlighted = highlightRowId === row.id;
            return (
              <div className={`group/comp relative ${isHighlighted ? 'animate-pulse' : ''}`}>
                <div className="flex items-center gap-1.5">
                  <div className="w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bgColor} rounded-full`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${color}`}>{score}%</span>
                  {isHighlighted && <span className="text-blue-500 text-xs">&#9654;</span>}
                </div>
                {next && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      next.action();
                    }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          item.action();
                        }}
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

    // WO-NETURE-PRODUCT-LIST-COLUMN-LABEL-AND-DESCRIPTION-REFINE-V1:
    // 간단설명 / 상세설명 2개 컬럼 삽입
    const refPriceIdx = cols.findIndex((c) => c.key === 'consumerReferencePrice');
    if (refPriceIdx >= 0) cols.splice(refPriceIdx + 1, 0, shortDescCol, detailDescCol);

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
          onClick={(e) => {
            e.stopPropagation();
            setDrawerProduct(row);
          }}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          title="상세보기/수정"
        >
          <Eye size={15} />
        </button>
      ),
    };

    // WO-NETURE-SUPPLIER-PRODUCT-DESCRIPTION-PREVIEW-FROM-LIST-V2: 미리보기 컬럼
    const previewCol: ListColumnDef<SupplierProduct> = {
      key: '_preview' as any,
      header: '',
      width: '36px',
      align: 'center',
      render: (_v: any, row: SupplierProduct) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPreviewProduct(row);
          }}
          className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600"
          title="설명 미리보기"
        >
          <FileText size={14} />
        </button>
      ),
    };

    // WO-O4O-NETURE-SUPPLIER-OFFER-MODE-SELECTION-V1: 제품 유형별 후속 활용 액션
    const offerActionsCol: ListColumnDef<SupplierProduct> = {
      key: '_offerActions' as any,
      header: '후속 작업',
      width: '160px',
      render: (_v: any, row: SupplierProduct) => {
        const gate = getAllowedOfferActions({
          regulatoryType: row.regulatoryType,
          drugCategory: row.drugCategory,
        });
        if (gate.restricted) {
          // WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1:
          //   의약품 후속작업 표시를 OTC/Rx/미분류로 세분화 (액션은 계속 차단).
          const drugGate = getDrugSupplyGate({
            regulatoryType: row.regulatoryType,
            drugCategory: row.drugCategory,
          });
          const cls =
            drugGate.category === 'otc'
              ? 'text-amber-600'
              : drugGate.category === 'rx'
                ? 'text-red-500'
                : 'text-orange-500';
          return (
            <span className={`text-xs ${cls}`} title={drugGate.notice}>
              {drugGate.shortLabel || '운영자 검토 대상'}
            </span>
          );
        }
        return (
          <select
            value=""
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const action = e.target.value as SupplierOfferAction | '';
              e.currentTarget.value = '';
              if (!action) return;
              // WO-O4O-SELLER-RECRUITMENT-CREATION-FLOW-V1: 모집은 modal 로 생성(path 없음)
              if (action === 'recruit') {
                setRecruitModalProduct({
                  masterId: row.masterId,
                  name: row.name,
                  regulatoryType: row.regulatoryType,
                  distributionType: row.distributionType,
                });
                return;
              }
              const meta = SUPPLIER_OFFER_ACTION_META[action];
              if (!meta?.ready || !meta.path) return; // 준비 중 → no-op
              // 선택 상품 context 를 query 로 전달 (이벤트/펀딩 생성 화면 prefill)
              const url = buildOfferActionUrl(action, {
                id: row.id,
                masterId: row.masterId,
                name: row.name,
                brandName: row.brandName,
                priceGeneral: row.priceGeneral,
                regulatoryType: row.regulatoryType,
              });
              navigate(url ?? meta.path);
            }}
            className="w-full text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">후속 작업 연결…</option>
            {gate.actions.map((a) => {
              const meta = SUPPLIER_OFFER_ACTION_META[a];
              return (
                <option key={a} value={a} disabled={!meta.ready}>
                  {meta.label}
                </option>
              );
            })}
          </select>
        );
      },
    };

    return [selectCol, detailCol, previewCol, offerActionsCol, ...cols];
  }, [
    products,
    selectedIds,
    highlightRowId,
    navigate,
    setDrawerProduct,
    setPreviewProduct,
    setRecruitModalProduct,
    setRegulatoryProduct,
    showToast,
    toggleSelect,
    toggleSelectAll,
  ]);

  return enhancedColumns;
}
