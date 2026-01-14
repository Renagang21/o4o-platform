/**
 * ProductPurposeBadge - 제품 목적 표시 컴포넌트
 *
 * Work Order: WO-NETURE-EXTENSION-P3
 *
 * 제품 목적(Purpose) 표현:
 * - CATALOG: 정보 제공용 (Neutral)
 * - APPLICATION: 신청 가능 (Primary)
 * - ACTIVE_SALES: 판매 중 (Success)
 *
 * 금지사항:
 * - 신청/승인 버튼 없음
 * - 상태 변경 없음
 * - 서비스 동작 연결 없음
 */

import type { ProductPurpose } from '../lib/api';

interface PurposeConfig {
  label: string;
  description: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const PURPOSE_CONFIG: Record<ProductPurpose, PurposeConfig> = {
  CATALOG: {
    label: '정보 제공용',
    description: '이 제품은 정보 제공용으로 등록된 제품입니다.',
    bgColor: '#f1f5f9',
    textColor: '#475569',
    borderColor: '#e2e8f0',
  },
  APPLICATION: {
    label: '신청 가능',
    description: '이 제품은 판매자 신청 후 각 서비스에서 판매할 수 있습니다.',
    bgColor: '#eff6ff',
    textColor: '#1d4ed8',
    borderColor: '#bfdbfe',
  },
  ACTIVE_SALES: {
    label: '판매 중',
    description: '이 제품은 현재 제휴 서비스에서 판매 중입니다.',
    bgColor: '#f0fdf4',
    textColor: '#15803d',
    borderColor: '#bbf7d0',
  },
};

interface BadgeProps {
  purpose?: ProductPurpose;
  showDescription?: boolean;
  size?: 'small' | 'medium';
}

export function ProductPurposeBadge({
  purpose = 'CATALOG', // 기본값: CATALOG
  showDescription = false,
  size = 'small',
}: BadgeProps) {
  const config = PURPOSE_CONFIG[purpose];

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: size === 'small' ? '2px 8px' : '4px 12px',
    fontSize: size === 'small' ? '11px' : '13px',
    fontWeight: 500,
    borderRadius: '4px',
    backgroundColor: config.bgColor,
    color: config.textColor,
    border: `1px solid ${config.borderColor}`,
  };

  if (!showDescription) {
    return <span style={badgeStyle}>{config.label}</span>;
  }

  return (
    <div style={styles.container}>
      <span style={badgeStyle}>{config.label}</span>
      <p style={styles.description}>{config.description}</p>
    </div>
  );
}

/**
 * ProductPurposeGuide - 제품 목적 안내 섹션
 *
 * 제품 상세 페이지 하단에 표시되는 목적 안내
 */
interface GuideProps {
  purpose?: ProductPurpose;
  productName?: string;
}

export function ProductPurposeGuide({
  purpose = 'CATALOG',
  productName = '이 제품',
}: GuideProps) {
  const config = PURPOSE_CONFIG[purpose];

  return (
    <div style={styles.guideContainer}>
      <div style={styles.guideHeader}>
        <span
          style={{
            ...styles.guideBadge,
            backgroundColor: config.bgColor,
            color: config.textColor,
            borderColor: config.borderColor,
          }}
        >
          {config.label}
        </span>
      </div>
      <p style={styles.guideText}>
        {purpose === 'CATALOG' && (
          <>
            <strong>{productName}</strong>은(는) 정보 제공용으로 등록되어 있습니다.
            제품 정보 확인 및 공급자 문의가 가능합니다.
          </>
        )}
        {purpose === 'APPLICATION' && (
          <>
            <strong>{productName}</strong>은(는) 판매자 신청이 가능한 제품입니다.
            각 서비스의 판매자 센터에서 신청 후 판매할 수 있습니다.
          </>
        )}
        {purpose === 'ACTIVE_SALES' && (
          <>
            <strong>{productName}</strong>은(는) 현재 제휴 서비스에서 판매 중입니다.
            판매 현황은 각 서비스에서 확인하세요.
          </>
        )}
      </p>
      <p style={styles.guideNote}>
        Neture는 제품 정보를 안내만 합니다. 실제 판매/신청은 각 서비스에서 진행됩니다.
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  description: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },
  guideContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    padding: '16px',
  },
  guideHeader: {
    marginBottom: '12px',
  },
  guideBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: '6px',
    border: '1px solid',
  },
  guideText: {
    fontSize: '14px',
    color: '#334155',
    margin: '0 0 8px 0',
    lineHeight: 1.6,
  },
  guideNote: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: 1.5,
  },
};

export default ProductPurposeBadge;
