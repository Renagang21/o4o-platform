/**
 * PharmacyDashboardPage - 약국경영 대시보드
 *
 * WO-PHARMACY-DASHBOARD-FRAME-V1
 *
 * 약국 Context 진입 후 공통 대시보드 프레임.
 * - ContextGuard로 pharmacy Context 필수
 * - 현재 약국 정보 헤더
 * - ActiveServicesSection: 이용 중인 서비스
 * - ProgramsSection: 참여 프로그램
 * - QuickActionsSection: 빠른 실행 링크
 */

import { useOrganization } from '../../contexts';
import { ContextGuard } from '../../components/common/ContextGuard';
import { ActiveServicesSection } from './sections/ActiveServicesSection';
import { ProgramsSection } from './sections/ProgramsSection';
import { QuickActionsSection } from './sections/QuickActionsSection';
import { MyRequestsSection } from './sections/MyRequestsSection';

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
          약국경영
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '15px', color: '#64748b' }}>
          {currentOrganization.name} — 약국 경영 지원 대시보드
        </p>
      </div>

      {/* Sections */}
      <ActiveServicesSection />
      <ProgramsSection />
      <QuickActionsSection />
      <MyRequestsSection />
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
