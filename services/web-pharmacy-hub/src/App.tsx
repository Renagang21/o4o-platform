/**
 * App — Pharmacy-Hub Foundation
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1
 * WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1 — /store-owner 하위를 공통 매장 셸로 편입
 * WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1 — /operator 하위를 공통 운영자 셸로 편입
 * WO-O4O-PHARMACY-HUB-SUPPLIER-SHELL-COMMON-CORE-ADOPTION-V1 — /supplier 하위를 공급자 셸로 편입
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
 *   /supplier                    공급자 셸 (SupplierShell)
 *     ├ (index)                  공급자 진입점
 *     └ /products                내 상품 Pharmacy-Hub 제공 설정 (WO-...-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1)
 *   /operator                    운영자 셸 (OperatorLayoutWrapper — 공통 OperatorAreaShell)
 *     ├ (index)                  서비스 운영자 진입점
 *     ├ /memberships             가입 신청 관리 목록
 *     └ /memberships/:id         가입 신청 상세
 *   /admin                       관리자 셸 (AdminLayoutWrapper — 공통 OperatorAreaShell + admin 가드)
 *     ├ (index)                  관리자 대시보드 (공통 4-Block @o4o/admin-ux-core)
 *     └ /settings/legal-terms    법정정보·약관 설정 (공통 service-legal 컴포넌트)
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
import { StoreOwnerShell } from './layouts/StoreOwnerShell';
// WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1
import { OperatorLayoutWrapper } from './layouts/OperatorLayoutWrapper';
import { AdminLayoutWrapper } from './layouts/AdminLayoutWrapper';
// WO-O4O-PHARMACY-HUB-SUPPLIER-SHELL-COMMON-CORE-ADOPTION-V1
import { SupplierShell } from './layouts/SupplierShell';
// WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1 — 공개 영역 공통 셸(헤더·푸터)
import { PublicLayout } from './layouts/PublicLayout';
import { TermsPage, PrivacyPage } from './pages/legal/PolicyDocumentPage';
import { MembershipGate } from './components/MembershipGate';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RoleEntryPage from './pages/RoleEntryPage';
import JoinPage from './pages/JoinPage';
import JoinStatusPage from './pages/JoinStatusPage';
import OperatorDashboardPage from './pages/operator/OperatorDashboardPage';
import ForumHubPage from './pages/forum/ForumHubPage';
import ForumListPage from './pages/forum/ForumListPage';
// WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1 — 상세 · 작성
import ForumDetailPage from './pages/forum/ForumDetailPage';
import ForumWritePage from './pages/forum/ForumWritePage';
import MembershipsPage from './pages/operator/MembershipsPage';
// WO-O4O-PHARMACY-HUB-SERVICE-LEGAL-SETTINGS-ADOPTION-V1 — 공통 법정정보 설정 채택
import PharmacyHubAdminDashboard from './pages/admin/PharmacyHubAdminDashboard';
import ServiceLegalSettingsPage from './pages/admin/ServiceLegalSettingsPage';
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
// WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1 — 역할 무관 개인 프로필 (canonical /account)
import MyProfilePage from './pages/account/MyProfilePage';
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
          {/*
            공개 영역 셸 (WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1)
            PublicLayout = 공통 GlobalHeader(브릿지) + <Outlet/> + 공개 푸터.
            URL 은 하나도 바뀌지 않는다 — pathless layout route 로 감싸기만 한다.
            역할 업무 셸(/store-owner · /store-hub · /operator · /supplier)과
            공개 QR 랜딩(/qr/:slug)은 자체 상단 계약이 있어 여기 포함하지 않는다.
          */}
          <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join/status" element={<JoinStatusPage />} />

          {/*
            내 프로필 (WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1 — production 잔여 결함)
            개인 계정(users) 화면은 역할 셸에 종속되지 않는다. 기존에는 매장 셸 안의
            `/store-owner/account` 가 유일한 계정 화면이라 운영자·공급자에게는 Profile
            진입점이 아예 없었다. 로그인만 하면 들어올 수 있는 공개 셸 route 로 올린다.
            가입 상태(pending/rejected)와 무관하게 본인 계정 확인·비밀번호 변경은 가능해야
            하므로 MembershipGate 를 걸지 않는다(미인증 안내는 화면이 직접 렌더).
            매장·사업자 정보(organizations)는 이 화면에 없다 — `/store-owner/info` 소관.
          */}
          <Route path="/account" element={<MyProfilePage />} />

          {/* WO-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1:
              공개 정책 문서. 다른 4서비스와 같은 공통 PolicyDocumentViewer 소비(게시 문서만 표시,
              미게시 시 중립 empty). 이 route 가 있어야 운영자 설정의 policies 탭이 데드링크를
              만들지 않는다. */}
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

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
          {/* WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §7-C */}
          <Route
            path="/forum/edit/:postId"
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
          </Route>

          {/*
            공급자 영역 셸 (WO-O4O-PHARMACY-HUB-SUPPLIER-SHELL-COMMON-CORE-ADOPTION-V1)
            SupplierShell = MembershipGate + 공급자 헤더/사이드바 + <Outlet/>.
            공통 Supplier Shell 은 아직 존재하지 않아(조사 결과 — CHECK §2) 최소 thin wrapper 로 둔다.
            URL 2개(/supplier · /supplier/products) 는 그대로 두고 nested route 로만 정리한다 —
            하위 화면 컴포넌트·상품 업무 로직 무변경.
          */}
          <Route path="/supplier" element={<SupplierShell />}>
            <Route
              index
              element={
                /*
                  WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1:
                    plannedFeatures(미구현 로드맵) 화면 노출 제거 — 실제 진입 가능한
                    기능만 안내한다. 로드맵은 WO 문서가 보유한다.
                */
                <RoleEntryPage
                  role={ROLES.supplier}
                  links={[{ to: '/supplier/products', label: '상품 제공 설정' }]}
                />
              }
            />
            <Route path="products" element={<SupplierProductsPage />} />
          </Route>

          {/*
            운영자 영역 셸 (WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1)
            OperatorLayoutWrapper = MembershipGate + 공통 OperatorAreaShell(@o4o/operator-ux-core)
              + DomainIASidebar. KPA / K-Cosmetics / GlycoPharm 와 같은 구조다.
            URL 3개(/operator · /operator/memberships · /operator/memberships/:membershipId) 는
            그대로 두고 nested route 로만 정리한다 — 하위 화면 컴포넌트도 무변경.
          */}
          <Route path="/operator" element={<OperatorLayoutWrapper />}>
            {/*
              WO-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1:
                RoleEntryPage placeholder(후속 예정 기능 안내) 제거 →
                실제 구현된 기능(가입 신청 승인)만으로 구성한 공통 5-Block 운영자 홈.
            */}
            <Route index element={<OperatorDashboardPage />} />
            <Route path="memberships" element={<MembershipsPage />} />
            <Route path="memberships/:membershipId" element={<MembershipDetailPage />} />
          </Route>

          {/*
            관리자 영역 셸 (WO-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1)
            AdminLayoutWrapper = MembershipGate + 역할 가드(admin | platform:super_admin)
              + 공통 OperatorAreaShell. K-Cosmetics / GlycoPharm / Neture / KPA 의 `/admin` 과 같은 축이다.
            admin 이 operator API 를 쓸 수 있다는 이유로 두 영역을 합치지 않는다.

            법정정보·약관 설정은 저장이 `pharmacy-hub:admin` 권한이므로 다른 4서비스와 동일하게
            관리자 영역으로 이동했다 (기존 `/operator/settings/legal` 제거 — 이중 진입점 방지).
          */}
          <Route path="/admin" element={<AdminLayoutWrapper />}>
            <Route index element={<PharmacyHubAdminDashboard />} />
            <Route path="settings/legal-terms" element={<ServiceLegalSettingsPage />} />
          </Route>

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
          {/*
            WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1:
              404 도 공개 셸 안에서 렌더한다 — 없는 주소에 도착한 사용자가 헤더/푸터로
              바로 복귀할 수 있어야 한다. 주소 보존 계약(redirect 아님)은 그대로다.
          */}
          <Route element={<PublicLayout />}>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </O4OErrorBoundary>
  );
}
