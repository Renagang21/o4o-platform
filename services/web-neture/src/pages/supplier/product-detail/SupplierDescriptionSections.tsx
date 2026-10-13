import { useNavigate } from 'react-router-dom';
import { ContentRenderer } from '@o4o/content-editor';
import { Section } from '@o4o/operator-ux-core';
import type { SupplierProduct } from '../../../lib/api';

export default function SupplierDescriptionSections({ product }: { product: SupplierProduct }) {
  const navigate = useNavigate();
  return (
    <>
      {/* ── 소비자 공개 설명 (B2C) ── */}
      <Section title="소비자 공개 설명 (B2C)">
        {!product.consumerShortDescription && !product.consumerDetailDescription && (
          <p className="text-xs text-amber-600 mb-2">
            소비자 공개용 설명이 비어 있습니다. 편집 모드에서 입력해 주세요.
          </p>
        )}
        {product.consumerShortDescription ? (
          <div>
            <span className="text-xs text-slate-400 block mb-1">간단 소개</span>
            <ContentRenderer
              html={product.consumerShortDescription}
              className="text-sm text-slate-700 prose prose-sm max-w-none line-clamp-3"
            />
          </div>
        ) : (
          <div>
            <span className="text-xs text-slate-400 block mb-1">간단 소개</span>
            <p className="text-sm text-slate-400 italic">미작성</p>
          </div>
        )}
        {product.consumerDetailDescription ? (
          <div>
            <span className="text-xs text-slate-400 block mb-1">상세 설명</span>
            <ContentRenderer
              html={product.consumerDetailDescription}
              className="text-sm text-slate-700 prose prose-sm max-w-none line-clamp-5"
              variant="product-detail"
            />
          </div>
        ) : (
          <div>
            <span className="text-xs text-slate-400 block mb-1">상세 설명</span>
            <p className="text-sm text-slate-400 italic">미작성</p>
          </div>
        )}
      </Section>

      {/* ── 판매자 지원 설명 (B2B) ── */}
      <Section title="판매자 지원 설명 (B2B)">
        {!product.businessShortDescription && !product.businessDetailDescription && (
          <p className="text-xs text-amber-600 mb-2">
            판매자 지원 설명이 비어 있습니다. 편집 모드에서 입력해 주세요.
          </p>
        )}
        {product.businessShortDescription ? (
          <div>
            <span className="text-xs text-slate-400 block mb-1">간단 소개</span>
            <ContentRenderer
              html={product.businessShortDescription}
              className="text-sm text-slate-700 prose prose-sm max-w-none line-clamp-3"
            />
          </div>
        ) : (
          <div>
            <span className="text-xs text-slate-400 block mb-1">간단 소개</span>
            <p className="text-sm text-slate-400 italic">미작성</p>
          </div>
        )}
        {product.businessDetailDescription ? (
          <div>
            <span className="text-xs text-slate-400 block mb-1">상세 설명</span>
            <ContentRenderer
              html={product.businessDetailDescription}
              className="text-sm text-slate-700 prose prose-sm max-w-none line-clamp-5"
              variant="product-detail"
            />
          </div>
        ) : (
          <div>
            <span className="text-xs text-slate-400 block mb-1">상세 설명</span>
            <p className="text-sm text-slate-400 italic">미작성</p>
          </div>
        )}
      </Section>

      {/* ── 매장용 상품 설명서 ──
              WO-O4O-NETURE-SUPPLIER-PRODUCT-AND-STORE-DESCRIPTION-WORKFLOW-SMOKE-BATCH-V1:
                상품 → 매장용 설명서 작성 이동선이 없어 사이드바 경유로만 닿았다.
                이동만 보완한다 — 권한·정책·API 변경 0 (대상 화면은 이미 전 상품을 나열한다). */}
      <Section title="매장용 상품 설명서">
        <p className="text-[11px] text-slate-500 mb-2">
          위 B2C·B2B 설명과는 다른 축입니다. 매장 경영자가 고객 응대·QR·태블릿에 활용하는
          매장용(STORE) 설명서는 운영자 검수를 거쳐 매장에 노출됩니다.
        </p>
        <button
          type="button"
          onClick={() =>
            navigate(
              `/supplier/store-descriptions?masterId=${encodeURIComponent(product.masterId || '')}`,
            )
          }
          className="w-full py-2 text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200"
        >
          이 상품의 매장용 설명서 작성
        </button>
      </Section>
    </>
  );
}
