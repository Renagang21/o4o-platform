/**
 * ContentUtilizationGuide - 콘텐츠 활용 안내 컴포넌트
 *
 * Work Order: WO-NETURE-EXTENSION-P2
 *
 * Neture 책임 선언:
 * - Neture는 콘텐츠를 자동 배포하지 않음
 * - 콘텐츠 사용 결정은 각 서비스에서 처리
 * - 여기서는 "어디서 활용할 수 있는지" 안내만 제공
 *
 * 금지사항:
 * - "적용하기" 버튼 없음
 * - 콘텐츠 요청/승인 없음
 * - POST/PUT/DELETE 없음
 */

import { Info } from 'lucide-react';

// 서비스별 콘텐츠 활용 정보
interface ServiceUsageInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  usageAreas: string[];
}

// 지원 서비스 목록 (정적 데이터)
const SUPPORTED_SERVICES: ServiceUsageInfo[] = [
  {
    id: 'glycopharm',
    name: 'GlycoPharm',
    icon: '🏥',
    description: '약국 공급 플랫폼',
    usageAreas: ['상품 상세 페이지', '약국 매장 콘텐츠'],
  },
  {
    id: 'k-cosmetics',
    name: 'K-Cosmetics',
    icon: '💄',
    description: '화장품 유통 플랫폼',
    usageAreas: ['상품 상세 설명', '메인 배너', '프로모션 영역'],
  },
  // WO-O4O-SHARED-PACKAGES-GLUCOSEVIEW-RESIDUE-CLEANUP-V1: glucoseview entry 제거
];

interface Props {
  /** 활용 가능한 서비스 ID 목록 (없으면 모든 서비스 표시) */
  usableServices?: string[];
  /** 활용 방식 설명 (선택) */
  usageNote?: string;
  /** 콘텐츠 유형 (product / content) */
  contentType?: 'product' | 'content';
}

export function ContentUtilizationGuide({
  usableServices,
  usageNote,
  contentType = 'content',
}: Props) {
  // 활용 가능한 서비스 필터링
  const availableServices = usableServices
    ? SUPPORTED_SERVICES.filter((s) => usableServices.includes(s.id))
    : SUPPORTED_SERVICES;

  if (availableServices.length === 0) {
    return null;
  }

  const typeLabel = contentType === 'product' ? '제품 콘텐츠' : '콘텐츠';

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <Info size={20} />
        </div>
        <div>
          <h3 style={styles.title}>콘텐츠 활용 안내</h3>
          <p style={styles.subtitle}>
            이 {typeLabel}는 아래 서비스의 판매자 매장에서 활용할 수 있습니다.
          </p>
        </div>
      </div>

      {/* Usage Note */}
      {usageNote && (
        <div style={styles.noteBox}>
          <p style={styles.noteText}>{usageNote}</p>
        </div>
      )}

      {/* Service List */}
      <div style={styles.serviceList}>
        {availableServices.map((service) => (
          <div key={service.id} style={styles.serviceCard}>
            <div style={styles.serviceHeader}>
              <span style={styles.serviceIcon}>{service.icon}</span>
              <div style={styles.serviceInfo}>
                <span style={styles.serviceName}>{service.name}</span>
                <span style={styles.serviceDesc}>{service.description}</span>
              </div>
            </div>

            {/* Usage Areas */}
            <div style={styles.usageAreas}>
              <span style={styles.usageLabel}>활용 가능 영역:</span>
              <ul style={styles.usageList}>
                {service.usageAreas.map((area, idx) => (
                  <li key={idx} style={styles.usageItem}>
                    · {area}
                  </li>
                ))}
              </ul>
            </div>

            {/* 정보 안내만 제공 (WO-SUPPLIER-PROFILE-V1: 관리 링크 제거) */}
          </div>
        ))}
      </div>

      {/* Footer Notice */}
      <div style={styles.footer}>
        <p style={styles.footerText}>
          Neture는 콘텐츠 보관 및 안내만 제공합니다.
          실제 콘텐츠 적용은 각 서비스의 판매자 센터에서 진행해 주세요.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
  },
  header: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  headerIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#e2e8f0',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },
  noteBox: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
  },
  noteText: {
    fontSize: '14px',
    color: '#475569',
    margin: 0,
    lineHeight: 1.6,
  },
  serviceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    padding: '16px',
  },
  serviceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  serviceIcon: {
    fontSize: '24px',
  },
  serviceInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  serviceName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
  },
  serviceDesc: {
    fontSize: '13px',
    color: '#64748b',
  },
  usageAreas: {
    marginBottom: '12px',
  },
  usageLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#64748b',
    display: 'block',
    marginBottom: '6px',
  },
  usageList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  usageItem: {
    fontSize: '13px',
    color: '#475569',
    lineHeight: 1.6,
  },
  footer: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  footerText: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
    textAlign: 'center',
    lineHeight: 1.5,
  },
};

export default ContentUtilizationGuide;
