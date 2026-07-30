/**
 * App — Pharmacy-Hub Foundation
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 *
 * 라우트:
 *   /              홈 (브랜드 표시 + 역할별 진입점)
 *   /login         로그인 (serviceKey='pharmacy-hub')
 *   /store-owner   약국 경영자 진입점   (MembershipGate)
 *   /supplier      공급자 진입점        (MembershipGate)
 *   /operator      서비스 운영자 진입점 (MembershipGate)
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MembershipGate } from './components/MembershipGate';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RoleEntryPage from './pages/RoleEntryPage';
import { ROLES } from './config/service';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/store-owner"
            element={
              <MembershipGate>
                <RoleEntryPage
                  role={ROLES.storeOwner}
                  plannedFeatures={[
                    '공급자 제공 상품 열람 및 주문 (공통 ProductMaster / SupplierProductOffer / 주문 원장 재사용)',
                    '공급자 제공 콘텐츠 수신 및 매장 실행 자산 제작',
                    '커뮤니티 참여',
                  ]}
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
                    '기존 SupplierProductOffer.serviceKeys 로 Pharmacy-Hub 공급 (운영자 상품 승인 없음)',
                    '공급자 콘텐츠 제공 (운영자 개입 없음)',
                    '이벤트 오퍼 (pharmacy-hub-event-offer) — 후속',
                  ]}
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
                    '가입 신청 승인 · 회원 관리 (service_memberships)',
                    '커뮤니티 운영 · 신고 처리',
                    '공지 · 운영자 콘텐츠',
                  ]}
                />
              </MembershipGate>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
