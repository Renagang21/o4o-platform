/**
 * UsageContextSummary - 사용 맥락 요약 컴포넌트
 *
 * Work Order: WO-NETURE-EXTENSION-P5
 *
 * 표시 대상: ProductPurpose === 'ACTIVE_SALES' 인 제품만
 *
 * 표현 원칙:
 * - 조회용/참고용 정보만 제공
 * - 각 서비스에서 어떻게 사용되는지 요약
 * - Neture는 사용 맥락 정보만 안내
 *
 * 금지사항:
 * - 신청/승인/연결 버튼 없음
 * - 자동 매칭 없음
 * - 상태 변경 없음
 */

import { Info, Sparkles } from 'lucide-react';

// 서비스별 사용 맥락
interface UsageContext {
  serviceId: string;
  serviceName: string;
  serviceIcon: string;
  contextDescription: string;
  targetAudience: string;
  usagePurpose: string;
}

interface Props {
  /** 제품 ID */
  productId: string;
  /** 제품명 */
  productName: string;
  /** 사용 맥락 목록 (API 응답 또는 정적 데이터) */
  usageContexts?: UsageContext[];
}

// Mock 데이터 (실제 API 연동 전)
const MOCK_USAGE_CONTEXTS: UsageContext[] = [
  {
    serviceId: 'glycopharm',
    serviceName: 'GlycoPharm',
    serviceIcon: '🏥',
    contextDescription: '약국 고객 대상 건강기능식품 판매',
    targetAudience: '약국 방문 고객',
    usagePurpose: '전문 상담과 함께 제품 판매',
  },
  {
    serviceId: 'k-cosmetics',
    serviceName: 'K-Cosmetics',
    serviceIcon: '💄',
    contextDescription: '뷰티 전문점 대상 화장품 유통',
    targetAudience: '뷰티샵 및 화장품 전문점',
    usagePurpose: '브랜드 입점 및 소매 판매',
  },
  {
    serviceId: 'glucoseview',
    serviceName: 'GlucoseView',
    serviceIcon: '📊',
    contextDescription: '혈당 관리 사용자 대상 건강식품',
    targetAudience: '당뇨 관리 앱 사용자',
    usagePurpose: '혈당 관리에 도움되는 제품 추천',
  },
];

export function UsageContextSummary({
  productId: _productId,
  productName,
  usageContexts,
}: Props) {
  void _productId; // Reserved for future use
  // 실제 데이터가 없으면 Mock 사용 (데모용)
  const contexts = usageContexts || MOCK_USAGE_CONTEXTS;

  if (contexts.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <Sparkles size={20} />
        </div>
        <div>
          <h3 style={styles.title}>사용 맥락 요약</h3>
          <p style={styles.subtitle}>
            <strong>{productName}</strong>이(가) 각 서비스에서 어떻게 활용되는지 안내합니다.
          </p>
        </div>
      </div>

      {/* Context Cards */}
      <div style={styles.contextList}>
        {contexts.map((context) => (
          <div key={context.serviceId} style={styles.contextCard}>
            {/* Service Header */}
            <div style={styles.cardHeader}>
              <span style={styles.serviceIcon}>{context.serviceIcon}</span>
              <span style={styles.serviceName}>{context.serviceName}</span>
            </div>

            {/* Context Details */}
            <div style={styles.cardBody}>
              <p style={styles.contextDescription}>{context.contextDescription}</p>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>대상</span>
                <span style={styles.detailValue}>{context.targetAudience}</span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>활용</span>
                <span style={styles.detailValue}>{context.usagePurpose}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Notice */}
      <div style={styles.footer}>
        <Info size={14} style={styles.footerIcon} />
        <p style={styles.footerText}>
          Neture는 사용 맥락 정보를 안내만 합니다.
          실제 판매 및 활용은 각 서비스에서 진행됩니다.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#faf5ff',
    borderRadius: '12px',
    border: '1px solid #e9d5ff',
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
    backgroundColor: '#f3e8ff',
    color: '#7c3aed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#581c87',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b21a8',
    margin: 0,
    lineHeight: 1.5,
  },
  contextList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  contextCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #f3e8ff',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#faf5ff',
    borderBottom: '1px solid #f3e8ff',
  },
  serviceIcon: {
    fontSize: '18px',
  },
  serviceName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#581c87',
  },
  cardBody: {
    padding: '16px',
  },
  contextDescription: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
    margin: '0 0 12px 0',
    lineHeight: 1.5,
  },
  detailRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '8px',
  },
  detailLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#7c3aed',
    backgroundColor: '#f3e8ff',
    padding: '2px 8px',
    borderRadius: '4px',
    minWidth: '40px',
    textAlign: 'center',
  },
  detailValue: {
    fontSize: '13px',
    color: '#475569',
    flex: 1,
  },
  footer: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #f3e8ff',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  footerIcon: {
    color: '#7c3aed',
    flexShrink: 0,
    marginTop: '2px',
  },
  footerText: {
    fontSize: '12px',
    color: '#6b21a8',
    margin: 0,
    lineHeight: 1.5,
  },
};

export default UsageContextSummary;
