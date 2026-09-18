/**
 * ProductDescriptionsPage — 매장 상품 설명 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §7
 *   KPA / K-Cosmetics 와 **같은 공통 View** 를 소비하는 thin adapter.
 *   저장 대상은 이미 있는 매장 자체 상품(store_local_products.detail_html) 이다 — 신규 원장 0.
 *   PharmacyHub 에는 제작 템플릿 registry 가 없어 findTemplate 을 주입하지 않는다
 *   (템플릿 진입 경로 자체가 없다 — 빈 registry 를 만들지 않는다).
 */
import {
  StoreProductDescriptionsView,
  type StoreProductDescriptionsApi,
  buildStoreContentAuthoringPrompt,
  STORE_LLM_ASSIST_LABEL,
} from '@o4o/store-ui-core';
import { RichTextEditor, LlmAssistPanel } from '@o4o/content-editor';
import { getAccessToken } from '@o4o/auth-client';
import { fetchLocalProducts, updateLocalProduct } from '../../lib/api/pharmacyHubLocalProducts';

const descriptionsApi: StoreProductDescriptionsApi = {
  fetchLocalProducts: (params) => fetchLocalProducts(params),
  updateLocalProduct: (id, data) => updateLocalProduct(id, data),
};

export default function ProductDescriptionsPage() {
  return (
    <StoreProductDescriptionsView
      api={descriptionsApi}
      storeNoun="매장"
      links={{
        localProducts: '/store-owner/local-products',
        library: '/store-owner/library',
      }}
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
          aiRequestHeaders={(() => {
            const token = getAccessToken();
            return token ? { Authorization: `Bearer ${token}` } : undefined;
          })()}
        />
      )}
    />
  );
}
