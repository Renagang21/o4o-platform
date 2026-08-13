/**
 * App — Pharmacy-Hub Foundation
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1
 * WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1 — /store-owner 하위를 공통 매장 셸로 편입
 */

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
import MembershipsPage from './pages/operator/MembershipsPage';
import MembershipDetailPage from './pages/operator/MembershipDetailPage';
import SupplierProductsPage from './pages/supplier/ProductsPage';
import StoreOwnerHomePage from './pages/store-owner/HomePage';
import StoreOwnerProductsPage from './pages/store-owner/ProductsPage';
import StoreOwnerProductDetailPage from './pages/store-owner/ProductDetailPage';
import CartPage from './pages/store-owner/CartPage';
import OrdersPage from './pages/store-owner/OrdersPage';
import OrderDetailPage from './pages/store-owner/OrderDetailPage';
import PaymentPage from './pages/store-owner/PaymentPage';
import PaymentSuccessPage from './pages/store-owner/PaymentSuccessPage';
import PaymentFailPage from './pages/store-owner/PaymentFailPage';
import HandledProductsPage from './pages/store-owner/HandledProductsPage';
import LocalProductsPage from './pages/store-owner/LocalProductsPage';
import ContentPage from './pages/store-owner/ContentPage';
import LibraryPage from './pages/store-owner/LibraryPage';
import LibraryResourcesPage from './pages/store-owner/LibraryResourcesPage';
import BlogPage from './pages/store-owner/BlogPage';
import BlogEditorPage from './pages/store-owner/BlogEditorPage';
import StoreInfoPage from './pages/store-owner/StoreInfoPage';
import AccountPage from './pages/store-owner/AccountPage';
import QrPage from './pages/store-owner/QrPage';
import PopPage from './pages/store-owner/PopPage';
import SignagePage from './pages/store-owner/SignagePage';
import ManualsPage from './pages/store-owner/ManualsPage';
import ManualDetailPage from './pages/store-owner/ManualDetailPage';
import QrLandingPage from './pages/QrLandingPage';
import NotFoundPage from './pages/NotFoundPage';
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

            {/* Community common Core — active PharmacyHub membership only */}
            <Route
              path="/forum"
              element={
                <MembershipGate>
                  <ForumHubPage />
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

            <Route
              path="/supplier/products"
              element={
                <MembershipGate>
                  <SupplierProductsPage />
                </MembershipGate>
              }
            />

            <Route path="/store-owner" element={<StoreOwnerShell />}>
              <Route index element={<StoreOwnerHomePage />} />
              <Route path="products" element={<StoreOwnerProductsPage />} />
              <Route path="products/:offerId" element={<StoreOwnerProductDetailPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:orderId" element={<OrderDetailPage />} />
              <Route path="handled-products" element={<HandledProductsPage />} />
              <Route path="local-products" element={<LocalProductsPage />} />
              <Route path="content" element={<ContentPage />} />
              <Route path="library" element={<LibraryPage />} />
              <Route path="library/resources" element={<LibraryResourcesPage />} />
              <Route path="blog" element={<BlogPage />} />
              <Route path="blog/new" element={<BlogEditorPage />} />
              <Route path="blog/:id/edit" element={<BlogEditorPage />} />
              <Route path="qr" element={<QrPage />} />
              <Route path="pop" element={<PopPage />} />
              <Route path="signage" element={<SignagePage />} />
              <Route path="tablets" element={<TabletsPage />} />
              <Route path="manuals" element={<ManualsPage />} />
              <Route path="manuals/:listingId" element={<ManualDetailPage />} />
              <Route path="info" element={<StoreInfoPage />} />
              <Route path="account" element={<AccountPage />} />
            </Route>

            <Route path="/store-owner/payment" element={<StoreOwnerShell requireStoreOwnerRole={false} />}>
              <Route index element={<PaymentPage />} />
              <Route path="success" element={<PaymentSuccessPage />} />
              <Route path="fail" element={<PaymentFailPage />} />
            </Route>

            <Route path="/qr/:slug" element={<QrLandingPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </O4OErrorBoundary>
  );
}
