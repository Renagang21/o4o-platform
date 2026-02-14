/**
 * PharmacyDashboardPage - 약국 운영 허브
 *
 * WO-PHARMACY-HUB-REALIGN-PHASEH1-V1
 *
 * 약국 Context 진입 후 매장 운영 허브.
 * - ContextGuard로 pharmacy Context 필수
 * - StoreOverview: 매장 현황 요약 (최상단)
 * - StoreManagement: 매장 관리 링크 그룹
 * - ActiveServices: 이용 중인 외부 서비스
 * - QuickActions + MyRequests: 신청/상태
 * - RecommendedServices: 하단 추천
 */

import { useOrganization } from '../../contexts';
import { ContextGuard } from '../../components/common/ContextGuard';
import { StoreOverviewSection } from './sections/StoreOverviewSection';
import { StoreManagementSection } from './sections/StoreManagementSection';
import { ActiveServicesSection } from './sections/ActiveServicesSection';
import { QuickActionsSection } from './sections/QuickActionsSection';
import { MyRequestsSection } from './sections/MyRequestsSection';
import { RecommendedServicesSection } from './sections/RecommendedServicesSection';

function PharmacyDashboardContent() {
  const { currentOrganization } = useOrganization();

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px',
        paddingBottom: '20px',
        borderBottom: '2px solid #e2e8f0',
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
          약국 운영 허브
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '15px', color: '#64748b' }}>
          {currentOrganization.name} — 약국 경영 지원
        </p>
      </div>

      {/* 1. Store Overview — 매장 현황 요약 (최상단) */}
      <StoreOverviewSection />

      {/* 2. Store Management — 매장 운영 링크 */}
      <StoreManagementSection />

      {/* 3. Connected Services — 이용 중인 서비스 */}
      <ActiveServicesSection />

      {/* 4. Requests & Status */}
      <QuickActionsSection />
      <MyRequestsSection />

      {/* 5. Recommended — 하단 */}
      <RecommendedServicesSection />
    </div>
  );
}

/**
 * ContextGuard로 감싼 약국경영 페이지
 * pharmacy Context가 아니면 /pharmacy로 리다이렉트
 */
export function PharmacyDashboardPage() {
  return (
    <ContextGuard requiredType="pharmacy" fallbackPath="/pharmacy">
      <PharmacyDashboardContent />
    </ContextGuard>
  );
}
