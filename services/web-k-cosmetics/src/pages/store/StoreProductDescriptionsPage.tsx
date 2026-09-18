/**
 * StoreProductDescriptionsPage — K-Cosmetics 내 매장 상품 상세설명 관리
 *
 * WO-O4O-MY-STORE-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1:
 *   화면 본체를 @o4o/store-ui-core 의 StoreProductDescriptionsView 로 이관.
 *   이 파일은 API adapter + template registry + 편집기 주입만 담는 thin adapter 다.
 *   이전 계약(WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1 소유·오류 구분,
 *   WO-O4O-PRODUCT-DESCRIPTION-GUIDE-NOTICE-V1 안내, template registry)은 View 안에서 유지된다.
 *
 * K-Cosmetics 사용자-facing 문구는 "내 매장" 표현 사용
 * ⚠️ "내 약국" 또는 약국 전용 문구 사용 금지
 */

import {
  StoreProductDescriptionsView,
  type StoreProductDescriptionsApi,
  buildStoreContentAuthoringPrompt,
  STORE_LLM_ASSIST_LABEL,
} from '@o4o/store-ui-core';
import { RichTextEditor, LlmAssistPanel } from '@o4o/content-editor';
import { fetchLocalProducts, updateLocalProduct } from '@/services/localProductApi';
import { findTemplate } from '@/config/productionTemplates';

const descriptionsApi: StoreProductDescriptionsApi = {
  fetchLocalProducts: (params) => fetchLocalProducts(params),
  updateLocalProduct: (id, data) => updateLocalProduct(id, data),
};

export default function StoreProductDescriptionsPage() {
  return (
    <StoreProductDescriptionsView
      api={descriptionsApi}
      storeNoun="매장"
      findTemplate={(id) => findTemplate(id) ?? null}
      /* WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1 §19~§20: 외부 LLM 상품 설명 작업 — 가장 엄격한 사실성 계약(task='product-description').
         Context = 제품명 · 현재 설명 · 자료함 prefill 메모 · 저장된 요약만. 제품명으로 사실을 유추하지 않는다. */
      renderAssist={({ product, value, prefillNote, onApplyHtml }) => (
        <LlmAssistPanel
          label={STORE_LLM_ASSIST_LABEL}
          contextLabel="상품 상세 설명 — 제공된 제품 정보만으로 작성·정리합니다"
          guideText={({ additionalInstruction }) =>
            buildStoreContentAuthoringPrompt({
              task: 'product-description',
              productName: product.name,
              currentHtml: value,
              referenceText: [prefillNote, product.summary].filter(Boolean).join('\n'),
              additionalInstruction,
            })
          }
          currentHtml={value}
          onApplyHtml={onApplyHtml}
        />
      )}
      renderEditor={({ editorKey, value, onChange, placeholder }) => (
        <RichTextEditor showInternalAi={false}
          key={editorKey}
          value={value}
          onChange={(c) => onChange(c.html)}
          placeholder={placeholder}
          minHeight="360px"
          preset="full"
        />
      )}
    />
  );
}
