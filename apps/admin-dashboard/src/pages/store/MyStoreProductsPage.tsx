/**
 * MyStoreProductsPage — 내 매장 상품 관리 (admin-dashboard thin wrapper)
 *
 * WO-O4O-STORE-PRODUCT-REGISTRATION-PHASE1-V1
 * WO-O4O-STORE-PRODUCT-REGISTRATION-PHASE1-5-V1
 * WO-O4O-STORE-PRODUCTS-UI-CORE-EXTRACTION-V1: 공통 패키지 @o4o/store-products-ui 기반 thin wrapper.
 *
 * 모든 비즈니스 로직 + 모달은 @o4o/store-products-ui 의 StoreProductsManagerPage 가 보유한다.
 * 본 wrapper는 admin-dashboard 의 PageHeader 를 headerSlot 으로 주입해 기존 admin UI 톤을 유지한다.
 *
 * 경로: /store/my-products  (platform.routes.tsx)
 *
 * NOTE: 본 위치(admin-dashboard)는 최종 위치가 아니다 — 다음 Phase에서 매장 경영자 서비스 웹앱
 *       (web-kpa-society / web-glycopharm / web-k-cosmetics) 으로 라우팅을 이전한다.
 */

import { Plus, RefreshCw } from 'lucide-react';
import { StoreProductsManagerPage } from '@o4o/store-products-ui';
import PageHeader from '../../components/common/PageHeader';

export default function MyStoreProductsPage() {
  return (
    <StoreProductsManagerPage
      headerSlot={({ onRegister, onRefresh }) => (
        <PageHeader
          title="내 매장 상품"
          subtitle="진열 상품을 관리하고 채널별 노출을 제어하세요."
          actions={[
            {
              id: 'register',
              label: '상품 등록',
              icon: <Plus size={14} />,
              onClick: onRegister,
              variant: 'primary',
            },
            {
              id: 'refresh',
              label: '새로고침',
              icon: <RefreshCw size={14} />,
              onClick: onRefresh,
            },
          ]}
        />
      )}
    />
  );
}
