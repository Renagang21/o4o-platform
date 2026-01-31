/**
 * ActiveUsageList - 현재 판매 중인 매장 표시 컴포넌트
 *
 * Work Order: WO-NETURE-EXTENSION-P4
 *
 * 표시 대상: ProductPurpose === 'ACTIVE_SALES' 인 제품만
 *
 * 표현 원칙:
 * - 조회용/참고용 정보만 제공
 * - 외부 링크만 제공
 * - Neture는 판매 상태를 관리하지 않음
 *
 * 금지사항:
 * - 신청/승인/연결 버튼 없음
 * - 자동 매칭 없음
 * - 상태 변경 없음
 */

import { ExternalLink, Store } from 'lucide-react';

// 매장 정보 타입
interface ActiveStore {
  id: string;
  serviceName: string;
  serviceIcon: string;
  storeName: string;
  storeUrl: string;
  status: 'active';
}

// 서비스별 그룹화된 매장 데이터
interface ServiceGroup {
  serviceId: string;
  serviceName: string;
  serviceIcon: string;
  stores: ActiveStore[];
}

interface Props {
  /** 제품 ID */
  productId: string;
  /** 제품명 */
  productName: string;
  /** 활성 매장 목록 (API 응답 또는 정적 데이터) */
  activeStores?: ActiveStore[];
}

// Mock 데이터 (실제 API 연동 전)
const MOCK_ACTIVE_STORES: ActiveStore[] = [
  {
    id: 'store-1',
    serviceName: 'GlycoPharm',
    serviceIcon: '🏥',
    storeName: '강남약국',
    storeUrl: 'https://glycopharm.co.kr/store/gangnam',
    status: 'active',
  },
  {
    id: 'store-2',
    serviceName: 'GlycoPharm',
    serviceIcon: '🏥',
    storeName: '서초중앙약국',
    storeUrl: 'https://glycopharm.co.kr/store/seocho',
    status: 'active',
  },
  {
    id: 'store-3',
    serviceName: 'K-Cosmetics',
    serviceIcon: '💄',
    storeName: '뷰티플러스 명동점',
    storeUrl: 'https://k-cosmetics.site/store/myeongdong',
    status: 'active',
  },
];

// 서비스별로 그룹화
function groupByService(stores: ActiveStore[]): ServiceGroup[] {
  const groups = new Map<string, ServiceGroup>();

  stores.forEach((store) => {
    const key = store.serviceName;
    if (!groups.has(key)) {
      groups.set(key, {
        serviceId: key.toLowerCase().replace(/\s+/g, '-'),
        serviceName: store.serviceName,
        serviceIcon: store.serviceIcon,
        stores: [],
      });
    }
    groups.get(key)!.stores.push(store);
  });

  return Array.from(groups.values());
}

export function ActiveUsageList({
  productId: _productId,
  productName,
  activeStores,
}: Props) {
  void _productId; // Reserved for future use
  // 실제 데이터가 없으면 Mock 사용 (데모용)
  const stores = activeStores || MOCK_ACTIVE_STORES;
  const serviceGroups = groupByService(stores);

  if (stores.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <Store size={20} />
        </div>
        <div>
          <h3 style={styles.title}>현재 판매 중인 매장</h3>
          <p style={styles.subtitle}>
            <strong>{productName}</strong>은(는) 아래 매장에서 현재 판매 중입니다.
          </p>
        </div>
      </div>

      {/* Service Groups */}
      <div style={styles.serviceGroups}>
        {serviceGroups.map((group) => (
          <div key={group.serviceId} style={styles.serviceGroup}>
            {/* Service Header */}
            <div style={styles.serviceHeader}>
              <span style={styles.serviceIcon}>{group.serviceIcon}</span>
              <span style={styles.serviceName}>{group.serviceName}</span>
              <span style={styles.storeCount}>{group.stores.length}개 매장</span>
            </div>

            {/* Store List */}
            <div style={styles.storeList}>
              {group.stores.map((store) => (
                <a
                  key={store.id}
                  href={store.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.storeCard}
                >
                  <div style={styles.storeInfo}>
                    <span style={styles.storeName}>{store.storeName}</span>
                    <span style={styles.statusBadge}>판매 중</span>
                  </div>
                  <ExternalLink size={14} style={styles.linkIcon} />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Notice */}
      <div style={styles.footer}>
        <p style={styles.footerText}>
          Neture는 판매 상태를 관리하지 않습니다.
          실제 재고 및 판매 여부는 각 매장에서 직접 확인해 주세요.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#f0fdf4',
    borderRadius: '12px',
    border: '1px solid #bbf7d0',
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
    backgroundColor: '#dcfce7',
    color: '#15803d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#14532d',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#166534',
    margin: 0,
    lineHeight: 1.5,
  },
  serviceGroups: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  serviceGroup: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #dcfce7',
    overflow: 'hidden',
  },
  serviceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#f0fdf4',
    borderBottom: '1px solid #dcfce7',
  },
  serviceIcon: {
    fontSize: '18px',
  },
  serviceName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#14532d',
    flex: 1,
  },
  storeCount: {
    fontSize: '12px',
    color: '#166534',
    backgroundColor: '#dcfce7',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  storeList: {
    padding: '8px',
  },
  storeCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: '6px',
    textDecoration: 'none',
    transition: 'background-color 0.15s',
    cursor: 'pointer',
  },
  storeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  storeName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#15803d',
    backgroundColor: '#dcfce7',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  linkIcon: {
    color: '#64748b',
  },
  footer: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #dcfce7',
  },
  footerText: {
    fontSize: '12px',
    color: '#166534',
    margin: 0,
    textAlign: 'center',
    lineHeight: 1.5,
  },
};

export default ActiveUsageList;
