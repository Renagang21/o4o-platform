/**
 * PartnerSettlementBatchPage - 파트너 정산 내역
 *
 * Work Order: WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1
 *
 * 정산 배치 목록 및 상세 조회
 * - 정산 목록: 카드형 (총 금액 / 건수 / 상태 / 날짜)
 * - 상세 확장: 포함 커미션 목록
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
} from 'lucide-react';
import {
  partnerSettlementApi,
  type PartnerSettlementSummary,
  type PartnerSettlementDetail,
} from '../../lib/api';

const STATUS_MAP: Record<string, { label: string; bg: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: '대기', bg: '#FEF3C7', color: '#92400E', icon: Clock },
  processing: { label: '처리중', bg: '#DBEAFE', color: '#1E40AF', icon: Clock },
  paid: { label: '지급완료', bg: '#D1FAE5', color: '#065F46', icon: CheckCircle },
};

function formatCurrency(v: number): string {
  return v.toLocaleString('ko-KR');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function PartnerSettlementBatchPage() {
  const [settlements, setSettlements] = useState<PartnerSettlementSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<PartnerSettlementDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await partnerSettlementApi.getSettlements({ page, limit: 20 });
      setSettlements(result.data);
      setTotalPages(result.meta.totalPages);
    } catch {
      // defaults remain
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    const detail = await partnerSettlementApi.getDetail(id);
    setExpandedDetail(detail);
    setDetailLoading(false);
  };

  return (
    <div style={styles.container}>
      {/* Back Link */}
      <Link to="/partner/dashboard" style={styles.backLink}>
        <ArrowLeft size={18} />
        Partner HUB로 돌아가기
      </Link>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <Wallet size={28} style={{ color: '#7C3AED' }} />
        </div>
        <div>
          <h1 style={styles.title}>정산 내역</h1>
          <p style={styles.subtitle}>커미션 정산 배치 및 지급 현황을 확인합니다</p>
        </div>
      </div>

      {/* Settlements List */}
      {loading ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>불러오는 중...</p>
        </div>
      ) : settlements.length === 0 ? (
        <div style={styles.emptyState}>
          <Wallet size={40} style={{ color: '#CBD5E1', marginBottom: '12px' }} />
          <p style={styles.emptyText}>아직 정산 내역이 없습니다.</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#94A3B8' }}>
            승인된 커미션이 정산되면 이곳에 표시됩니다.
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {settlements.map((s) => {
            const st = STATUS_MAP[s.status] || STATUS_MAP.pending;
            const StatusIcon = st.icon;
            const isExpanded = expandedId === s.id;

            return (
              <div key={s.id} style={styles.card}>
                {/* Card Header - clickable to expand */}
                <div style={styles.cardHeader} onClick={() => handleExpand(s.id)}>
                  <div style={styles.cardLeft}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: st.bg,
                        color: st.color,
                      }}>
                        <StatusIcon size={14} />
                        {st.label}
                      </span>
                      <span style={{ fontSize: '13px', color: '#94A3B8' }}>
                        {formatDate(s.created_at)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                      <span style={{ fontSize: '22px', fontWeight: 700, color: '#1E293B' }}>
                        {formatCurrency(s.total_commission)}원
                      </span>
                      <span style={{ fontSize: '14px', color: '#64748B' }}>
                        {s.commission_count}건
                      </span>
                    </div>
                    {s.paid_at && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#16A34A' }}>
                        지급일: {formatDate(s.paid_at)}
                      </p>
                    )}
                  </div>
                  <div style={{ cursor: 'pointer', color: '#94A3B8' }}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div style={styles.cardDetail}>
                    {detailLoading ? (
                      <p style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                        상세 로딩 중...
                      </p>
                    ) : expandedDetail ? (
                      <div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                          포함 커미션 ({expandedDetail.items.length}건)
                        </p>
                        {expandedDetail.items.map((item, idx) => (
                          <div key={idx} style={styles.detailItem}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#475569' }}>
                                #{item.order_number}
                              </span>
                              <span style={{ fontSize: '13px', color: '#94A3B8', marginLeft: '8px' }}>
                                {item.supplier_name || '-'}
                              </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: '#16A34A' }}>
                                {formatCurrency(item.commission_amount)}원
                              </span>
                              <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: '8px' }}>
                                {formatDate(item.commission_date)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#94A3B8', fontSize: '13px' }}>상세 정보를 불러올 수 없습니다.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ ...styles.pageBtn, opacity: page <= 1 ? 0.4 : 1 }}
          >
            <ChevronLeft size={16} /> 이전
          </button>
          <span style={styles.pageInfo}>{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{ ...styles.pageBtn, opacity: page >= totalPages ? 0.4 : 1 }}
          >
            다음 <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Info Notice */}
      <div style={styles.infoCard}>
        <p style={styles.infoText}>
          정산은 승인된 커미션을 묶어 배치로 생성됩니다.<br />
          지급 완료 시 해당 커미션은 &ldquo;지급완료&rdquo; 상태로 변경됩니다.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#64748B',
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  headerIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: '#F5F3FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1E293B',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748B',
    margin: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#F8FAFC',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: '14px',
    color: '#64748B',
    margin: 0,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 20px',
    cursor: 'pointer',
  },
  cardLeft: {
    flex: 1,
  },
  cardDetail: {
    padding: '0 20px 18px 20px',
    borderTop: '1px solid #F1F5F9',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #F1F5F9',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  pageBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    backgroundColor: '#fff',
    color: '#475569',
    fontSize: '13px',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '13px',
    color: '#64748B',
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    padding: '16px 20px',
  },
  infoText: {
    fontSize: '13px',
    color: '#64748B',
    margin: 0,
    lineHeight: 1.6,
  },
};
