/**
 * App — Pharmacy-Hub Foundation
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1
 *
 * 라우트:
 *   /                            홈 (브랜드 표시 + 역할별 진입점)
 *   /login                       로그인 (serviceKey='pharmacy-hub')
 *   /join                        가입 신청 (public)
 *   /join/status                 내 가입 상태
 *   /store-owner                 약국 경영자 진입점   (MembershipGate)
 *   /supplier                    공급자 진입점        (MembershipGate)
 *   /operator                    서비스 운영자 진입점 (MembershipGate)
 *   /operator/memberships        가입 신청 관리 목록  (MembershipGate + operator role)
 *   /operator/memberships/:id    가입 신청 상세
 *   /supplier/products           내 상품 Pharmacy-Hub 제공 설정 (WO-...-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1)
 *   /store-owner/products        제공 상품 목록
 *   /store-owner/products/:id    제공 상품 상세
 *
 * 운영자 콘솔의 실제 권한 경계는 backend guard(pharmacy-hub:operator scope)가 강제한다.
 * 프론트 라우트는 UX 안내이며 권한 판정 근거가 아니다.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MembershipGate } from './components/MembershipGate';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RoleEntryPage from './pages/RoleEntryPage';
import JoinPage from './pages/JoinPage';
import JoinStatusPage from './pages/JoinStatusPage';
import MembershipsPage from './pages/operator/MembershipsPage';
import MembershipDetailPage from './pages/operator/MembershipDetailPage';
// WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1
import SupplierProductsPage from './pages/supplier/ProductsPage';
import StoreOwnerProductsPage from './pages/store-owner/ProductsPage';
import StoreOwnerProductDetailPage from './pages/store-owner/ProductDetailPage';
import { ROLES } from './config/service';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join/status" element={<JoinStatusPage />} />

          <Route
            path="/store-owner"
            element={
              <MembershipGate>
                <RoleEntryPage
                  role={ROLES.storeOwner}
                  plannedFeatures={[
                    '주문 · 장바구니 (공통 주문 원장 재사용) — 후속',
                    '공급자 제공 콘텐츠 수신 및 매장 실행 자산 제작',
                    '커뮤니티 참여',
                  ]}
                  links={[{ to: '/store-owner/products', label: '공급 상품 보기' }]}
                />
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

          <Route
            path="/store-owner/products"
            element={
              <MembershipGate>
                <StoreOwnerProductsPage />
              </MembershipGate>
            }
          />

          <Route
            path="/store-owner/products/:offerId"
            element={
              <MembershipGate>
                <StoreOwnerProductDetailPage />
              </MembershipGate>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
