/**
 * ProductDescriptionsPage — 매장 상품 설명 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §7
 *   KPA / GlycoPharm / K-Cosmetics 와 **같은 공통 View** 를 소비하는 thin adapter.
 *   저장 대상은 이미 있는 매장 자체 상품(store_local_products.detail_html) 이다 — 신규 원장 0.
 *   PharmacyHub 에는 제작 템플릿 registry 가 없어 findTemplate 을 주입하지 않는다
 *   (템플릿 진입 경로 자체가 없다 — 빈 registry 를 만들지 않는다).
 */
import { StoreProductDescriptionsView, type StoreProductDescriptionsApi } from '@o4o/store-ui-core';
import { RichTextEditor } from '@o4o/content-editor';
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
      renderEditor={({ editorKey, value, onChange, placeholder }) => (
        <RichTextEditor
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
