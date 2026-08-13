/**
 * App — Pharmacy-Hub Foundation
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1
 * WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1 — /store-owner 하위를 공통 매장 셸로 편입
 *
 * 라우트:
 *   /                            홈 (브랜드 표시 + 역할별 진입점)
 *   /login                       로그인 (serviceKey='pharmacy-hub')
 *   /join                        가입 신청 (public)
 *   /join/status                 내 가입 상태
 *   /forum                       커뮤니티 홈 (MembershipGate + 공통 ForumHubTemplate)
 *   /forum/posts                 게시글 목록
 *   /forum/posts/:postId         게시글 상세 (WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1)
 *   /forum/write                 글쓰기      (동일 WO · write 권한은 backend guard 가 강제)
 *   /supplier                    공급자 진입점        (MembershipGate)
 *   /supplier/products           내 상품 Pharmacy-Hub 제공 설정 (WO-...-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1)
 *   /operator                    서비스 운영자 진입점 (MembershipGate)
 *   /operator/memberships        가입 신청 관리 목록  (MembershipGate + operator role)
 *   /operator/memberships/:id    가입 신청 상세
 *
 *   /store-hub                   매장허브 홈 — 자원 탐색 진입점 (공통 StoreHubTemplate)
 *
 *   /store-owner                 매장 경영 셸 (StoreDashboardLayout — 공통)
 *     ├ (index)                  매장 경영 홈
 *     ├ /products                공급 상품 목록
 *     ├ /products/:offerId       공급 상품 상세
 *     ├ /cart                    장바구니
 *     ├ /orders                  주문 내역
 *     ├ /orders/:orderId         주문 상세
 *     ├ /handled-products        매장 경영활용 제품 (WO-...-STORE-HANDLED-PRODUCTS-V1)
 *     ├ /local-products          매장 자체 상품 (동일 WO)
 *     ├ /content                 매장 콘텐츠 (WO-...-STORE-CONTENT-LIBRARY-V1)
 *     ├ /library                 자료함 — 제작 자료 목록 (동일 WO)
 *     ├ /library/resources       자료 등록·관리 (동일 WO)
 *     ├ /blog                    매장 블로그 목록 (동일 WO)
 *     ├ /blog/new                블로그 글쓰기 (동일 WO)
 *     ├ /blog/:id/edit           블로그 글 수정 (동일 WO)
 *     ├ /info                  매장 정보 (조직 · WO-...-STORE-INFO-AND-ACCOUNT-V1)
 *     └ /account                 내 계정 (사용자 · 동일 WO)
 *   /store-owner/payment         결제 (셸 동일 · 사이드바 메뉴 미노출 deep route)
 *     ├ /success                 PG 성공 callback
 *     └ /fail                    PG 실패 callback
 *
 * URL 은 전부 기존과 동일하다 (결제 callback 은 PG 등록 URL 이라 불변이어야 한다).
 * React Router 는 정적 세그먼트가 더 구체적인 `/store-owner/payment` 를
 * `/store-owner` 보다 우선 매칭하므로 두 부모 라우트가 충돌하지 않는다.
 *
 * 운영자 콘솔의 실제 권한 경계는 backend guard(pharmacy-hub:operator scope)가 강제한다.
 * 프론트 라우트는 UX 안내이며 권한 판정 근거가 아니다.
 */

// WO-O4O-WEB-CATCH-ALL-ROUTE-CROSS-SERVICE-V1: catch-all 이 Navigate → NotFoundPage 로 바뀌면서
// 이 파일에서 Navigate 사용처가 0 이 됐다 (다른 redirect 는 없다).
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { O4OErrorBoundary, O4OToastProvider } from '@o4o/error-handling';
import { AuthProvider } from './contexts/AuthContext';
import { MembershipGate } from './components/MembershipGate';
import { StoreOwnerShell } from './layouts/StoreOwnerShell';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RoleEntryPage from './pages/RoleEntryPage';
import JoinPage from './pages/JoinPage';
import JoinStatusPage from './pages/JoinStatusPage';
import ForumHubPage from './pages/forum/ForumHubPage';
import ForumListPage from './pages/forum/ForumListPage';
// WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1 — 상세 · 작성
import ForumDetailPage from './pages/forum/ForumDetailPage';
import ForumWritePage from './pages/forum/ForumWritePage';
import MembershipsPage from './pages/operator/MembershipsPage';
import MembershipDetailPage from './pages/operator/MembershipDetailPage';
// WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1
import SupplierProductsPage from './pages/supplier/ProductsPage';
// WO-O4O-PHARMACY-HUB-STORE-HUB-HOME-INTRODUCTION-V1 — 매장허브 홈 (공통 StoreHubTemplate)
import StoreHubPage from './pages/store-hub/StoreHubPage';
import StoreOwnerHomePage from './pages/store-owner/HomePage';
import StoreOwnerProductsPage from './pages/store-owner/ProductsPage';
import StoreOwnerProductDetailPage from './pages/store-owner/ProductDetailPage';
// WO-PHARMACY-HUB-STORE-OWNER-CHECKOUT-AND-PAYMENT-UI-V1
import CartPage from './pages/store-owner/CartPage';
import OrdersPage from './pages/store-owner/OrdersPage';
import OrderDetailPage from './pages/store-owner/OrderDetailPage';
import PaymentPage from './pages/store-owner/PaymentPage';
import PaymentSuccessPage from './pages/store-owner/PaymentSuccessPage';
import PaymentFailPage from './pages/store-owner/PaymentFailPage';
// WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1
import HandledProductsPage from './pages/store-owner/HandledProductsPage';
import LocalProductsPage from './pages/store-owner/LocalProductsPage';
// WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1
import ContentPage from './pages/store-owner/ContentPage';
import LibraryPage from './pages/store-owner/LibraryPage';
import LibraryResourcesPage from './pages/store-owner/LibraryResourcesPage';
import BlogPage from './pages/store-owner/BlogPage';
import BlogEditorPage from './pages/store-owner/BlogEditorPage';
// WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1
import StoreInfoPage from './pages/store-owner/StoreInfoPage';
import AccountPage from './pages/store-owner/AccountPage';
// WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 — 매장 실행 자산 (QR · POP · 사이니지 · 상품 설명서)
import QrPage from './pages/store-owner/QrPage';
import PopPage from './pages/store-owner/PopPage';
import SignagePage from './pages/store-owner/SignagePage';
import ManualsPage from './pages/store-owner/ManualsPage';
import ManualDetailPage from './pages/store-owner/ManualDetailPage';
import QrLandingPage from './pages/QrLandingPage';
// WO-O4O-WEB-CATCH-ALL-ROUTE-CROSS-SERVICE-V1 — 없는 경로 404 안내 (redirect 아님)
import NotFoundPage from './pages/NotFoundPage';
// WO-PHARMACY-HUB-STORE-TABLET-SERVICE-SCOPED-INTEGRATION-V1 — 태블릿 · 화면 세트
import TabletsPage from './pages/store-owner/TabletsPage';
import { ROLES } from './config/service';

export default function App() {
  return (
    <O4OErrorBoundary>
      <O4OToastProvider />
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join/status" element={<JoinStatusPage />} />

          {/* WO-O4O-PHARMACY-HUB-COMMUNITY-HOME-COMMON-CORE-V1 — active PharmacyHub 회원만 */}
          <Route
            path="/forum"
            element={
              <MembershipGate>
                <ForumHubPage />
              </MembershipGate>
            }
          />
          <Route
            path="/forum/posts"
            element={
              <MembershipGate>
                <ForumListPage />
              </MembershipGate>
            }
          />

          {/* WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1 */}
          <Route
            path="/forum/write"
            element={
              <MembershipGate>
                <ForumWritePage />
              </MembershipGate>
            }
          />
          <Route
            path="/forum/posts/:postId"
            element={
              <MembershipGate>
                <ForumDetailPage />
              </MembershipGate>
            }
          />

          <Route
            path="/supplier"
            element={
              <MembershipGate>
                <RoleEntryPage
                  role={ROLES.supplier}
                  plannedFeatures={[
                    '공급자 콘텐츠 제공 (운영자 개입 없음) — 후속',
                    '이벤트 오퍼 (pharmacy-hub-event-offer) — 후속',
                  ]}
                  links={[{ to: '/supplier/products', label: '상품 제공 설정' }]}
                />
              </MembershipGate>
            }
          />

          <Route
            path="/operator"
            element={
              <MembershipGate>
                <RoleEntryPage
                  role={ROLES.operator}
                  plannedFeatures={[
                    '커뮤니티 운영 · 신고 처리',
                    '공지 · 운영자 콘텐츠',
                  ]}
                  links={[{ to: '/operator/memberships', label: '가입 신청 관리' }]}
                />
              </MembershipGate>
            }
          />

          <Route
            path="/operator/memberships"
            element={
              <MembershipGate>
                <MembershipsPage />
              </MembershipGate>
            }
          />

          <Route
            path="/operator/memberships/:membershipId"
            element={
              <MembershipGate>
                <MembershipDetailPage />
              </MembershipGate>
            }
          />

          {/* WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1 — 권한 경계는 backend guard 가 강제 */}
          <Route
            path="/supplier/products"
            element={
              <MembershipGate>
                <SupplierProductsPage />
              </MembershipGate>
            }
          />

          {/*
            매장허브 홈 (WO-O4O-PHARMACY-HUB-STORE-HUB-HOME-INTRODUCTION-V1)
            `/store-hub` = 공급자·플랫폼 자원 **탐색** 진입점 / `/store-owner` = 매장 **운영·주문·관리**.
            셸은 StoreOwnerShell 을 그대로 재사용한다 — Pharmacy-Hub 전용 Hub 레이아웃 사본을 만들지 않으며
            가드(StoreOwnerGuard + MembershipGate)도 매장 화면과 동일 기준을 쓴다.
            기존 `/store-owner/*` URL 은 이동·redirect 없이 그대로 유지한다.
          */}
          <Route path="/store-hub" element={<StoreOwnerShell />}>
            <Route index element={<StoreHubPage />} />
          </Route>

          {/*
            매장 경영 셸 (WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1)
            StoreOwnerShell = StoreOwnerGuard(pharmacy-hub) + MembershipGate + 공통 StoreDashboardLayout.
            하위 화면은 URL·컴포넌트 그대로 셸의 <Outlet/> 안으로 편입한다 (이중 운영 없음).
          */}
          <Route path="/store-owner" element={<StoreOwnerShell />}>
            <Route index element={<StoreOwnerHomePage />} />
            <Route path="products" element={<StoreOwnerProductsPage />} />
            <Route path="products/:offerId" element={<StoreOwnerProductDetailPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:orderId" element={<OrderDetailPage />} />
            {/* WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1 — 매장 제품 (공급 상품과 다른 축) */}
            <Route path="handled-products" element={<HandledProductsPage />} />
            <Route path="local-products" element={<LocalProductsPage />} />
            {/* WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1 — 콘텐츠 · 자료함 · 블로그 (공통 원장 재사용) */}
            <Route path="content" element={<ContentPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="library/resources" element={<LibraryResourcesPage />} />
            <Route path="blog" element={<BlogPage />} />
            <Route path="blog/new" element={<BlogEditorPage />} />
            <Route path="blog/:id/edit" element={<BlogEditorPage />} />
            {/* WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 — 매장 실행 자산 (출력·실행) */}
            <Route path="qr" element={<QrPage />} />
            <Route path="pop" element={<PopPage />} />
            <Route path="signage" element={<SignagePage />} />
            <Route path="tablets" element={<TabletsPage />} />
            <Route path="manuals" element={<ManualsPage />} />
            <Route path="manuals/:listingId" element={<ManualDetailPage />} />
            {/* WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1 — 설정 (매장 정보 / 내 계정) */}
            <Route path="info" element={<StoreInfoPage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>

          {/*
            결제 (WO-PHARMACY-HUB-STORE-OWNER-CHECKOUT-AND-PAYMENT-UI-V1)
            success/fail 은 PG 리다이렉트 대상이라 URL 에 결제 파라미터가 실려 온다.
            StoreOwnerGuard 는 미인증 시 /login 으로 navigate 하며 LoginPage 는 returnUrl 을
            복원하지 않으므로 callback 파라미터가 소실된다. 따라서 결제 서브트리는 기존과
            동일하게 MembershipGate 만 적용한다(같은 URL 에서 안내). 셸은 동일하게 렌더한다.
          */}
          <Route path="/store-owner/payment" element={<StoreOwnerShell requireStoreOwnerRole={false} />}>
            <Route index element={<PaymentPage />} />
            <Route path="success" element={<PaymentSuccessPage />} />
            <Route path="fail" element={<PaymentFailPage />} />
          </Route>

          {/*
            공개 QR 랜딩 (WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1)
            매장 QR payload = https://pharmacyhub.co.kr/qr/{slug}. 소비자가 스캔하는 화면이라
            로그인·매장 셸을 요구하지 않는다.
          */}
          <Route path="/qr/:slug" element={<QrLandingPage />} />

          {/*
            catch-all — 반드시 마지막
            WO-O4O-WEB-CATCH-ALL-ROUTE-CROSS-SERVICE-V1:
              기존에는 `<Navigate to="/" replace />` 로 홈에 흡수했다. 없는 주소를 입력하면
              안내 없이 홈으로 튕겨 요청 URL 이 사라졌다. redirect 대신 404 안내를 그 자리에
              render 하여 주소를 보존한다. 위 route 는 전부 이보다 구체적이라 영향이 없다.
          */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </O4OErrorBoundary>
  );
}
