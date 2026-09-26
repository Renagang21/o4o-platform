/**
 * Unified Store Workspace 라우트 — WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §3-⑥ · §8-3
 *
 *   /            홈                    /services   내 서비스(서비스 클릭 = /work/:serviceKey 문맥 전환)
 *   /store/*     내 매장(공통 기능 1회)  /work/*     서비스 업무(서비스 종속 기능만)
 *   /hub/*       매장 HUB              /settings   설정
 *
 * 공통 기능은 KPA canonical 트리(pages/pharmacy)를 서비스 prefix 만 동적으로 바꿔 1회 mount 한다(복사 3벌 금지).
 * 서비스 종속 기능은 /work/<serviceKey> 아래에만 있다. 모든 업무 화면은 StoreGate(매장 선택·서버 재검증) 뒤에 있다.
 */
import { Suspense, lazy, type ComponentType, type ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StoreProductsManagerPage } from '@o4o/store-products-ui';
import { AuthProvider } from './contexts/AuthContext';
import { StoreProvider } from './contexts/StoreContext';
import { TermsAcceptanceGate } from './components/TermsAcceptanceGate';
import { StoreGate } from './components/StoreGate';
import RootShell from './components/RootShell';
import UnifiedStoreLayout, { ServiceStoreLayout, StoreOwnerOnly } from './components/layouts/UnifiedStoreLayout';
import ServiceWorkLayout, { ServiceWorkHomePage, ServiceWorkIndexPage } from './components/layouts/ServiceWorkLayout';
import UnifiedHubLayout from './components/layouts/UnifiedHubLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import HandoffPage from './pages/HandoffPage';
import StoreSelectorPage from './pages/StoreSelectorPage';
import MyServicesPage from './pages/MyServicesPage';
import SettingsPage from './pages/SettingsPage';
import { WORKSPACE_PATHS } from './config/workspace';

const named = <M extends Record<string, unknown>, K extends keyof M>(load: () => Promise<M>, key: K) =>
  lazy(() => load().then((m) => ({ default: m[key] as ComponentType<Record<string, unknown>> })));

// ── 내 매장(공통) — KPA canonical ─────────────────────────────────────────────
const StoreHomePage = named(() => import('./pages/pharmacy/StoreHomePage'), 'StoreHomePage');
const PharmacyInfoPage = named(() => import('./pages/pharmacy/PharmacyInfoPage'), 'PharmacyInfoPage');
const StoreExecutionPage = lazy(() => import('./pages/pharmacy/StoreExecutionPage'));
const StoreQRPage = named(() => import('./pages/pharmacy/StoreQRPage'), 'StoreQRPage');
const StoreQrAiDescriptionPage = lazy(() => import('./pages/pharmacy/StoreQrAiDescriptionPage'));
const StorePopV2Page = named(() => import('./pages/pharmacy/StorePopV2Page'), 'StorePopV2Page');
const StoreSignagePage = named(() => import('./pages/pharmacy/StoreSignagePage'), 'StoreSignagePage');
const StorePlaylistCreatePage = named(() => import('./pages/pharmacy/StorePlaylistCreatePage'), 'StorePlaylistCreatePage');
const SignagePlayerSelectPage = named(() => import('./pages/pharmacy/SignagePlayerSelectPage'), 'SignagePlayerSelectPage');
const SignagePlaybackPage = named(() => import('./pages/pharmacy/SignagePlaybackPage'), 'SignagePlaybackPage');
const StoreHandledProductsPage = lazy(() => import('./pages/pharmacy/StoreHandledProductsPage'));
const StoreProductMultilingualContentPage = lazy(() => import('./pages/pharmacy/StoreProductMultilingualContentPage'));
const StoreLibraryContentsPage = lazy(() => import('./pages/pharmacy/StoreLibraryContentsPage'));
const StoreLibraryResourcesPage = lazy(() => import('./pages/pharmacy/StoreLibraryResourcesPage'));
const ProductionMaterialEditorPage = lazy(() => import('./pages/pharmacy/ProductionMaterialEditorPage'));
const StoreProductDescriptionsPage = lazy(() => import('./pages/pharmacy/StoreProductDescriptionsPage'));
const StoreLocalProductsPage = lazy(() => import('./pages/pharmacy/StoreLocalProductsPage'));
const StoreTabletDisplaysPage = lazy(() => import('./pages/pharmacy/StoreTabletDisplaysPage'));
const TabletRequestsPage = named(() => import('./pages/pharmacy/TabletRequestsPage'), 'TabletRequestsPage');
const MarketingAnalyticsPage = named(() => import('./pages/pharmacy/MarketingAnalyticsPage'), 'MarketingAnalyticsPage');
const StoreAssetsPage = lazy(() => import('./pages/pharmacy/StoreAssetsPage'));
const PharmacyBlogPage = named(() => import('./pages/pharmacy/PharmacyBlogPage'), 'PharmacyBlogPage');
const PharmacyPopPage = named(() => import('./pages/pharmacy/PharmacyPopPage'), 'PharmacyPopPage');
const PharmacyVideoPage = named(() => import('./pages/pharmacy/PharmacyVideoPage'), 'PharmacyVideoPage');
const StoreDirectContentPage = lazy(() => import('./pages/pharmacy/StoreDirectContentPage'));
const StoreContentEditPage = lazy(() => import('./pages/pharmacy/StoreContentEditPage'));

// ── 서비스 업무: KPA ─────────────────────────────────────────────────────────
const PharmacyB2BPage = named(() => import('./pages/pharmacy/PharmacyB2BPage'), 'PharmacyB2BPage');
const PharmacySellPage = named(() => import('./pages/pharmacy/PharmacySellPage'), 'PharmacySellPage');
const ProductMarketingPage = named(() => import('./pages/pharmacy/ProductMarketingPage'), 'ProductMarketingPage');
const ProductPopBuilderPage = named(() => import('./pages/pharmacy/ProductPopBuilderPage'), 'ProductPopBuilderPage');
const StoreOrderWorktablePage = named(() => import('./pages/pharmacy/StoreOrderWorktablePage'), 'StoreOrderWorktablePage');
const KpaStoreOrdersPage = named(() => import('./pages/pharmacy/StoreOrdersPage'), 'StoreOrdersPage');
const SellerRecruitmentsBrowsePage = lazy(() => import('./pages/pharmacy/SellerRecruitmentsBrowsePage'));
const StoreRecruitmentApplicationsPage = lazy(() => import('./pages/pharmacy/StoreRecruitmentApplicationsPage'));
const StoreChannelsPage = lazy(() => import('./pages/pharmacy/StoreChannelsPage').then((m) => ({ default: m.StoreChannelsPage })));
const OnlineSalesOrdersRetiredPage = named(() => import('./pages/pharmacy/OnlineSalesOrdersRetiredPage'), 'OnlineSalesOrdersRetiredPage');
const ForeignVisitorSalesSupportPage = named(() => import('./pages/pharmacy/ForeignVisitorSalesSupportPage'), 'ForeignVisitorSalesSupportPage');
const ForeignVisitorSalesSupportPaymentSuccessPage = named(() => import('./pages/pharmacy/ForeignVisitorSalesSupportPaymentResultPage'), 'ForeignVisitorSalesSupportPaymentSuccessPage');
const ForeignVisitorSalesSupportPaymentFailPage = named(() => import('./pages/pharmacy/ForeignVisitorSalesSupportPaymentResultPage'), 'ForeignVisitorSalesSupportPaymentFailPage');
const ForeignVisitorPartnersPage = named(() => import('./pages/pharmacy/ForeignVisitorPartnersPage'), 'ForeignVisitorPartnersPage');
const ForeignVisitorPartnerQrCodesPage = named(() => import('./pages/pharmacy/ForeignVisitorPartnerQrCodesPage'), 'ForeignVisitorPartnerQrCodesPage');

// ── 서비스 업무: K-Cosmetics ─────────────────────────────────────────────────
const KcosStoreCommerceProductsPage = lazy(() => import('./services/kcos/pages/StoreCommerceProductsPage'));
const KcosStoreOrdersPage = lazy(() => import('./services/kcos/pages/StoreOrdersPage'));
const KcosStoreRevenueSummaryPage = lazy(() => import('./services/kcos/pages/StoreRevenueSummaryPage'));
const KcosInterestRequestsPage = lazy(() => import('./services/kcos/pages/InterestRequestsPage'));

// ── 서비스 업무: PharmacyHub ─────────────────────────────────────────────────
const PhProductsPage = lazy(() => import('./services/ph/pages/ProductsPage'));
const PhProductDetailPage = lazy(() => import('./services/ph/pages/ProductDetailPage'));
const PhCartPage = lazy(() => import('./services/ph/pages/CartPage'));
const PhOrdersPage = lazy(() => import('./services/ph/pages/OrdersPage'));
const PhOrderDetailPage = lazy(() => import('./services/ph/pages/OrderDetailPage'));
const PhPaymentPage = lazy(() => import('./services/ph/pages/PaymentPage'));
const PhPaymentSuccessPage = lazy(() => import('./services/ph/pages/PaymentSuccessPage'));
const PhPaymentFailPage = lazy(() => import('./services/ph/pages/PaymentFailPage'));

// ── 매장 HUB ─────────────────────────────────────────────────────────────────
const StoreHubPage = named(() => import('./pages/pharmacy/StoreHubPage'), 'StoreHubPage');
const HubB2BCatalogPage = named(() => import('./pages/pharmacy/HubB2BCatalogPage'), 'HubB2BCatalogPage');
const HubSignageLibraryPage = named(() => import('./pages/pharmacy/HubSignageLibraryPage'), 'HubSignageLibraryPage');
const KpaEventOfferPage = named(() => import('./pages/event-offer/KpaEventOfferPage'), 'KpaEventOfferPage');
const StoreCartPage = named(() => import('./pages/store-cart/StoreCartPage'), 'StoreCartPage');
const HubContentLibraryPage = named(() => import('./pages/pharmacy/HubContentLibraryPage'), 'HubContentLibraryPage');
const HubBlogLibraryPage = named(() => import('./pages/pharmacy/HubBlogLibraryPage'), 'HubBlogLibraryPage');
const HubPopLibraryPage = named(() => import('./pages/pharmacy/HubPopLibraryPage'), 'HubPopLibraryPage');
const HubQrLibraryPage = named(() => import('./pages/pharmacy/HubQrLibraryPage'), 'HubQrLibraryPage');
const HubVideoLibraryPage = named(() => import('./pages/pharmacy/HubVideoLibraryPage'), 'HubVideoLibraryPage');
const HubScreenSetLibraryPage = named(() => import('./pages/pharmacy/HubScreenSetLibraryPage'), 'HubScreenSetLibraryPage');
const HubMultilingualContentLibraryPage = named(() => import('./pages/pharmacy/HubMultilingualContentLibraryPage'), 'HubMultilingualContentLibraryPage');
const StoreMultilingualContentsMyPage = named(() => import('./pages/pharmacy/StoreMultilingualContentsMyPage'), 'StoreMultilingualContentsMyPage');
const HubSupplierLibraryPage = named(() => import('./pages/pharmacy/HubSupplierLibraryPage'), 'HubSupplierLibraryPage');

const gated = (el: ReactElement) => <StoreGate>{el}</StoreGate>;
const Loading = <div className="p-8 text-center text-sm text-slate-500">불러오는 중...</div>;
const NotFound = <main className="center-card"><section className="card"><h1>페이지를 찾을 수 없습니다</h1></section></main>;
const S = WORKSPACE_PATHS.myStore;
const W = WORKSPACE_PATHS.serviceWork;
const H = WORKSPACE_PATHS.storeHub;

/**
 * 내 매장 화면(공통 컴포넌트) — `/store/*` 와 서비스 지정 `/work/<serviceKey>/store/*` 두 곳에 같은 트리를 mount 한다.
 * CHECK-O4O-URL-FIRST-CENSUS-V1 §21-13 (서비스별 매장 경영자 화면 위치 이전). 경로 · 컴포넌트 · 권한 동작은 그대로다.
 */
function storeChildRoutes() {
  return <>
        <Route index element={<StoreHomePage />} />
        <Route path="info" element={<PharmacyInfoPage />} />
        <Route path="settings" element={<Navigate to={`${S}/info`} replace />} />
        {/* 서비스 앱의 옛 매장 경로(북마크 · handoff returnPath) — 404 대신 같은 화면으로(§21-14) */}
        <Route path="dashboard" element={<Navigate to={S} replace />} />
        <Route path="settings/layout" element={<Navigate to={`${S}/info`} replace />} />
        <Route path="settings/template" element={<Navigate to={`${S}/info`} replace />} />
        <Route path="execution" element={<StoreExecutionPage />} />
        <Route path="execution/product-info" element={<Navigate to={`${S}/handled-products`} replace />} />
        {/* 매장 제품 */}
        <Route path="my-products" element={<StoreOwnerOnly><StoreProductsManagerPage
          title="내 매장 제품"
          description="O4O 제품 중 매장이 취급 등록한 제품을 관리합니다. 태블릿, QR, 사이니지 등 매장 서비스에 활용합니다."
          registerButtonLabel="O4O 제품 취급 등록"
          infoText="O4O 제품을 매장 경영활용 제품으로 등록할 수 있습니다. 등록한 제품은 태블릿 전시, QR 안내, 사이니지 등에 연결해 활용할 수 있습니다."
          emptyTitle="취급 중인 O4O 제품이 없습니다"
          emptyDescription="O4O 제품을 취급 등록해 태블릿과 매장 안내 서비스에 활용해 주세요."
        /></StoreOwnerOnly>} />
        <Route path="handled-products" element={<StoreOwnerOnly><StoreHandledProductsPage /></StoreOwnerOnly>} />
        <Route path="commerce/local-products" element={<StoreOwnerOnly><StoreLocalProductsPage /></StoreOwnerOnly>} />
        <Route path="products/multilingual/:targetKind/:targetId" element={<StoreOwnerOnly><StoreProductMultilingualContentPage /></StoreOwnerOnly>} />
        {/* 매장 경영지원 */}
        <Route path="marketing/product-descriptions" element={<StoreProductDescriptionsPage />} />
        <Route path="marketing/qr" element={<StoreQRPage />} />
        <Route path="marketing/qr/ai-description" element={<StoreQrAiDescriptionPage />} />
        <Route path="marketing/pop" element={<Navigate to={`${S}/marketing/pop-v2`} replace />} />
        <Route path="marketing/pop-v2" element={<StorePopV2Page />} />
        <Route path="commerce/tablet-displays" element={<StoreTabletDisplaysPage />} />
        <Route path="requests" element={<TabletRequestsPage />} />
        {/* 매장 자료함 · 콘텐츠 */}
        <Route path="library/contents" element={<StoreLibraryContentsPage />} />
        <Route path="library/resources" element={<StoreLibraryResourcesPage />} />
        <Route path="library/production-materials" element={<Navigate to={`${S}/library/contents`} replace />} />
        <Route path="library/production-materials/new" element={<Navigate to={`${S}/library/contents`} replace />} />
        <Route path="library/production-materials/:id/edit" element={<ProductionMaterialEditorPage />} />
        <Route path="content" element={<StoreAssetsPage />} />
        <Route path="content/blog" element={<PharmacyBlogPage />} />
        <Route path="content/pop" element={<PharmacyPopPage />} />
        <Route path="content/video" element={<PharmacyVideoPage />} />
        <Route path="content/direct/:id" element={<StoreDirectContentPage />} />
        <Route path="content/:snapshotId/edit" element={<StoreContentEditPage />} />
        {/* 디지털 사이니지 */}
        <Route path="marketing/signage" element={<Navigate to={`${S}/marketing/signage/playlist`} replace />} />
        <Route path="marketing/signage/playlist" element={<StoreSignagePage />} />
        <Route path="marketing/signage/playlist/new" element={<StorePlaylistCreatePage />} />
        <Route path="marketing/signage/videos" element={<StoreSignagePage />} />
        <Route path="marketing/signage/schedules" element={<StoreSignagePage />} />
        <Route path="marketing/signage/player" element={<SignagePlayerSelectPage />} />
        {/* 분석 */}
        <Route path="analytics/marketing" element={<MarketingAnalyticsPage />} />
        <Route path="analytics" element={<Navigate to={`${S}/analytics/marketing`} replace />} />
        {/* 레거시 단축 경로 */}
        <Route path="qr" element={<Navigate to={`${S}/marketing/qr`} replace />} />
        <Route path="pop" element={<Navigate to={`${S}/marketing/pop-v2`} replace />} />
        <Route path="signage" element={<Navigate to={`${S}/marketing/signage/playlist`} replace />} />
        <Route path="*" element={NotFound} />
  </>;
}

export default function App() {
  return <BrowserRouter><AuthProvider><StoreProvider><TermsAcceptanceGate><Suspense fallback={Loading}><Routes>
    <Route path={WORKSPACE_PATHS.handoff} element={<HandoffPage />} />
    {/* 사이니지 재생은 chrome-free (KPA 와 동일하게 layout 밖) */}
    <Route path={`${S}/marketing/signage/play/:playlistId`} element={gated(<SignagePlaybackPage />)} />

    <Route element={<RootShell />}>
      <Route path={WORKSPACE_PATHS.login} element={<LoginPage />} />
      <Route path={WORKSPACE_PATHS.select} element={gated(<StoreSelectorPage />)} />
      <Route path={WORKSPACE_PATHS.home} element={gated(<HomePage />)} />
      <Route path={WORKSPACE_PATHS.myServices} element={gated(<MyServicesPage />)} />
      <Route path={WORKSPACE_PATHS.settings} element={gated(<SettingsPage />)} />

      {/* ── 내 매장(공통 기능 1회) ── */}
      <Route path={S} element={gated(<UnifiedStoreLayout />)}>
        {storeChildRoutes()}
      </Route>

      {/* ── 서비스 업무(서비스 종속 기능만) ── */}
      {/* 서비스 지정 매장 화면 — 각 서비스 앱의 매장 경영자용 /store 의 새 위치(§21-13). 현재 KPA 만. */}
      <Route path={`${W}/kpa-society/store`} element={gated(<ServiceStoreLayout />)}>
        {storeChildRoutes()}
        {/* KPA `/store` 의 옛 단축 경로 — KPA 서비스 업무 화면으로(§21-14) */}
        <Route path="products" element={<Navigate to={`${W}/kpa-society/commerce/products`} replace />} />
        <Route path="products/b2c" element={<Navigate to={`${W}/kpa-society/commerce/products/b2c`} replace />} />
        <Route path="orders" element={<Navigate to={`${W}/kpa-society/commerce/orders`} replace />} />
      </Route>
      <Route path={W} element={gated(<ServiceWorkIndexPage />)} />
      <Route path={`${W}/:serviceKey`} element={gated(<ServiceWorkLayout />)}>
        <Route index element={<ServiceWorkHomePage />} />
        <Route path="*" element={NotFound} />
      </Route>
      <Route path={`${W}/kpa-society`} element={gated(<ServiceWorkLayout />)}>
        <Route index element={<ServiceWorkHomePage />} />
        <Route path="commerce/products" element={<PharmacyB2BPage />} />
        <Route path="commerce/products/b2c" element={<PharmacySellPage />} />
        <Route path="commerce/products/:productId/marketing" element={<ProductMarketingPage />} />
        <Route path="commerce/products/:productId/pop" element={<ProductPopBuilderPage />} />
        <Route path="commerce/orderable" element={<Navigate to={`${H}/b2b`} replace />} />
        <Route path="commerce/order-worktable" element={<StoreOrderWorktablePage />} />
        <Route path="commerce/orders" element={<KpaStoreOrdersPage />} />
        <Route path="commerce/seller-recruitments" element={<SellerRecruitmentsBrowsePage />} />
        <Route path="commerce/recruitment-applications" element={<StoreRecruitmentApplicationsPage />} />
        <Route path="online-sales/settings" element={<StoreChannelsPage section="settings" />} />
        <Route path="online-sales/products" element={<StoreChannelsPage section="products" />} />
        <Route path="online-sales/orders" element={<OnlineSalesOrdersRetiredPage />} />
        <Route path="online-sales/orders/:orderId" element={<OnlineSalesOrdersRetiredPage />} />
        <Route path="channels" element={<Navigate to={`${W}/kpa-society/online-sales/settings`} replace />} />
        {/* KPA `/store/channels/tablet` → `/store/requests` 와 같은 대상(§21-14) */}
        <Route path="channels/tablet" element={<Navigate to={`${W}/kpa-society/store/requests`} replace />} />
        <Route path="sales-channels/foreign-visitor" element={<ForeignVisitorSalesSupportPage />} />
        <Route path="sales-channels/foreign-visitor/payment/success" element={<ForeignVisitorSalesSupportPaymentSuccessPage />} />
        <Route path="sales-channels/foreign-visitor/payment/fail" element={<ForeignVisitorSalesSupportPaymentFailPage />} />
        <Route path="sales-channels/foreign-visitor/partners" element={<ForeignVisitorPartnersPage />} />
        <Route path="sales-channels/foreign-visitor/partners/:partnerId/qr-codes" element={<ForeignVisitorPartnerQrCodesPage />} />
        <Route path="*" element={NotFound} />
      </Route>
      <Route path={`${W}/k-cosmetics`} element={gated(<ServiceWorkLayout />)}>
        <Route index element={<ServiceWorkHomePage />} />
        <Route path="commerce/products" element={<KcosStoreCommerceProductsPage />} />
        <Route path="commerce/orders" element={<KcosStoreOrdersPage />} />
        <Route path="commerce/billing" element={<KcosStoreRevenueSummaryPage />} />
        <Route path="interest-requests" element={<KcosInterestRequestsPage />} />
        <Route path="*" element={NotFound} />
      </Route>
      <Route path={`${W}/pharmacy-hub`} element={gated(<ServiceWorkLayout />)}>
        <Route index element={<ServiceWorkHomePage />} />
        <Route path="products" element={<PhProductsPage />} />
        <Route path="products/:offerId" element={<PhProductDetailPage />} />
        <Route path="cart" element={<PhCartPage />} />
        <Route path="orders" element={<PhOrdersPage />} />
        <Route path="orders/:orderId" element={<PhOrderDetailPage />} />
        <Route path="payment" element={<PhPaymentPage />} />
        <Route path="payment/success" element={<PhPaymentSuccessPage />} />
        <Route path="payment/fail" element={<PhPaymentFailPage />} />
        <Route path="*" element={NotFound} />
      </Route>

      {/* ── 매장 HUB ── */}
      <Route path={H} element={gated(<UnifiedHubLayout />)}>
        <Route index element={<StoreHubPage />} />
        <Route path="b2b" element={<HubB2BCatalogPage />} />
        <Route path="event-offers" element={<KpaEventOfferPage />} />
        <Route path="cart" element={<StoreCartPage />} />
        <Route path="multilingual-product-contents" element={<HubMultilingualContentLibraryPage />} />
        <Route path="multilingual-product-contents/my" element={<StoreMultilingualContentsMyPage />} />
        <Route path="blog" element={<HubBlogLibraryPage />} />
        <Route path="pop" element={<HubPopLibraryPage />} />
        <Route path="qr" element={<HubQrLibraryPage />} />
        <Route path="video" element={<HubVideoLibraryPage />} />
        <Route path="signage" element={<HubSignageLibraryPage />} />
        <Route path="screen-set" element={<HubScreenSetLibraryPage />} />
        <Route path="content" element={<HubContentLibraryPage />} />
        <Route path="supplier-library" element={<HubSupplierLibraryPage />} />
        <Route path="*" element={NotFound} />
      </Route>
      {/* 기존 서비스의 /store-hub 경로로 들어온 handoff returnPath 호환 */}
      <Route path="/store-hub/*" element={<LegacyHubRedirect />} />

      <Route path="*" element={NotFound} />
    </Route>
  </Routes></Suspense></TermsAcceptanceGate></StoreProvider></AuthProvider></BrowserRouter>;
}

function LegacyHubRedirect() {
  const rest = window.location.pathname.replace(/^\/store-hub/, '');
  return <Navigate to={`${H}${rest}${window.location.search}`} replace />;
}
