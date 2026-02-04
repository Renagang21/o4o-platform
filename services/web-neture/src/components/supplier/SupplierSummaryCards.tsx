/**
 * SupplierSummaryCards - 운영 요약 카드
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P2, WO-AI-PREVIEW-SUMMARY-V1
 *
 * 표시 항목:
 * - ACTIVE_SALES 제품 수
 * - 승인 대기 신청 수
 * - 최근 승인 건수 (최근 7일)
 * - 진행 중 주문 수
 * - 게시 중 콘텐츠 수
 * - 연결된 서비스 수
 *
 * AI 요약 버튼 (WO-AI-PREVIEW-SUMMARY-V1):
 * - 헤더에 AI 요약 버튼 표시
 * - 공통 AiSummaryButton 컴포넌트 사용
 *
 * 금지:
 * - 증감/비교/퍼센트 표시
 * - 클릭 이벤트 (AI 버튼 제외)
 */

import {
  Package,
  Clock,
  CheckCircle,
  ShoppingCart,
  FileText,
  Link2,
} from 'lucide-react';
import { AiSummaryButton } from '../ai';

export interface SummaryData {
  activeProducts: number;
  pendingRequests: number;
  recentApprovals: number;
  activeOrders: number;
  publishedContents: number;
  connectedServices: number;
}

interface Props {
  data: SummaryData;
  loading?: boolean;
}

export function SupplierSummaryCards({ data, loading }: Props) {
  // WO-O4O-ICON-SYSTEM-MODERNIZATION-V1: 무채색 아이콘
  const cards = [
    {
      icon: Package,
      label: '판매 중 제품',
      value: data.activeProducts,
      color: '#64748b',
      bgColor: '#f1f5f9',
    },
    {
      icon: Clock,
      label: '승인 대기',
      value: data.pendingRequests,
      color: '#64748b',
      bgColor: '#f1f5f9',
    },
    {
      icon: CheckCircle,
      label: '최근 7일 승인',
      value: data.recentApprovals,
      color: '#64748b',
      bgColor: '#f1f5f9',
    },
    {
      icon: ShoppingCart,
      label: '진행 중 주문',
      value: data.activeOrders,
      color: '#64748b',
      bgColor: '#f1f5f9',
    },
    {
      icon: FileText,
      label: '게시 중 콘텐츠',
      value: data.publishedContents,
      color: '#64748b',
      bgColor: '#f1f5f9',
    },
    {
      icon: Link2,
      label: '연결된 서비스',
      value: data.connectedServices,
      color: '#64748b',
      bgColor: '#f1f5f9',
    },
  ];

  if (loading) {
    return (
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>운영 요약</h2>
        <p style={styles.sectionSubtitle}>현재 상황을 한눈에 확인하세요</p>
        <div style={styles.grid}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ ...styles.card, opacity: 0.5 }}>
              <div style={styles.skeleton} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>운영 요약</h2>
          <p style={styles.sectionSubtitle}>현재 상황을 한눈에 확인하세요</p>
        </div>
        <AiSummaryButton contextLabel="공급자 운영 요약" />
      </div>
      <div style={styles.grid}>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={styles.card}>
              <div
                style={{
                  ...styles.iconWrapper,
                  backgroundColor: card.bgColor,
                }}
              >
                <Icon size={20} style={{ color: card.color }} />
              </div>
              <div style={styles.content}>
                <p style={styles.value}>{card.value}</p>
                <p style={styles.label}>{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '32px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  sectionSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
    lineHeight: 1,
  },
  label: {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  skeleton: {
    width: '100%',
    height: '48px',
    backgroundColor: '#e2e8f0',
    borderRadius: '8px',
  },
};

export default SupplierSummaryCards;
