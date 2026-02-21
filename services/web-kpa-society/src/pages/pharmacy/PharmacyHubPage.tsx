/**
 * PharmacyHubPage - 약국 HUB (공동 자원 탐색)
 *
 * WO-KPA-A-PAGE-ROLE-CLEANUP-V1
 *
 * Hub = "여기서 가져간다" — 탐색/선택 공간
 * - 추천 서비스 발견 (RecommendedServicesSection)
 *
 * 결과/KPI/매장 상태는 여기에 넣지 않는다.
 */

import { useOrganization } from '../../contexts';
import { RecommendedServicesSection } from './sections/RecommendedServicesSection';

function PharmacyHubContent() {
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
          약국 HUB
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '15px', color: '#64748b' }}>
          {currentOrganization.name} — 공동 자원 탐색
        </p>
      </div>

      {/* 추천 서비스 발견 */}
      <RecommendedServicesSection />
    </div>
  );
}

export function PharmacyHubPage() {
  return <PharmacyHubContent />;
}
