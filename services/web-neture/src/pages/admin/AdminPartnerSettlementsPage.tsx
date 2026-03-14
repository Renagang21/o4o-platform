/**
 * AdminPartnerSettlementsPage - 파트너 커미션 정산 관리
 *
 * Work Order: WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1
 * WO-O4O-NETURE-ADMIN-DASHBOARD-PARTNER-KPI-V1: Partner 검색 UI 개선
 *
 * 구성:
 * - 정산 생성: 파트너 검색 → 선택 → approved 커미션 batch 생성
 * - 상태 필터: 전체 / pending / paid
 * - 정산 목록: 파트너 / 커미션 건수 / 총 금액 / 상태 / 생성일 / 지급일 / 액션
 * - 상세 확장: 포함 커미션 목록
 * - 지급 완료 처리
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, Plus, CreditCard, Search, X } from 'lucide-react';
import {
  adminPartnerSettlementApi,
  adminPartnerMonitoringApi,
  type PartnerSettlement,
  type PartnerSettlementDetail,
  type PartnerSettlementStatus,
  type PartnerMonitoringItem,
} from '../../lib/api/admin.js';

// ============================================================================
// Status Config
// ============================================================================

type StatusConfig = { label: string; bg: string; color: string };

const STATUS_MAP: Record<string, StatusConfig> = {
  pending: { label: '대기', bg: '#FEF3C7', color: '#92400E' },
  processing: { label: '처리중', bg: '#DBEAFE', color: '#1E40AF' },
  paid: { label: '지급완료', bg: '#D1FAE5', color: '#065F46' },
};

function getStatus(status: string): StatusConfig {
  return STATUS_MAP[status] || { label: status, bg: '#F1F5F9', color: '#64748B' };
}

function formatCurrency(v: number): string {
  return v.toLocaleString('ko-KR');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ============================================================================
// Filter Tabs
// ============================================================================

const FILTER_TABS: Array<{ value: PartnerSettlementStatus | 'all'; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'paid', label: '지급완료' },
];

// ============================================================================
// Component
// ============================================================================

export default function AdminPartnerSettlementsPage() {
  const [settlements, setSettlements] = useState<PartnerSettlement[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<PartnerSettlementStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<PartnerSettlementDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create settlement — Partner search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PartnerMonitoringItem[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<{ id: string; name: string; email: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pay action
  const [payingId, setPayingId] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced partner search
  useEffect(() => {
    if (!searchQuery.trim() || selectedPartner) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      const result = await adminPartnerMonitoringApi.getPartners({ search: searchQuery, limit: 10 });
      setSearchResults(result.data);
      setShowDropdown(result.data.length > 0);
      setSearching(false);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, selectedPartner]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const params: { page?: number; status?: PartnerSettlementStatus } = { page };
    if (statusFilter !== 'all') params.status = statusFilter;
    const result = await adminPartnerSettlementApi.getList(params);
    setSettlements(result.data);
    setTotalPages(result.meta.totalPages);
    setTotal(result.meta.total);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    const detail = await adminPartnerSettlementApi.getDetail(id);
    setExpandedDetail(detail);
    setDetailLoading(false);
  };

  const handleSelectPartner = (partner: PartnerMonitoringItem) => {
    setSelectedPartner({ id: partner.partner_id, name: partner.name, email: partner.email });
    setSearchQuery(partner.name);
    setShowDropdown(false);
    setCreateMessage(null);
  };

  const handleClearPartner = () => {
    setSelectedPartner(null);
    setSearchQuery('');
    setCreateMessage(null);
  };

  const handleCreate = async () => {
    if (!selectedPartner) return;
    setCreating(true);
    setCreateMessage(null);
    const result = await adminPartnerSettlementApi.create(selectedPartner.id);
    if (result.success) {
      setCreateMessage({ type: 'success', text: `정산 생성 완료: ${result.data?.commission_count}건, ${formatCurrency(result.data?.total_commission ?? 0)}원` });
      handleClearPartner();
      fetchList();
    } else {
      setCreateMessage({ type: 'error', text: result.error || '정산 생성 실패' });
    }
    setCreating(false);
  };

  const handlePay = async (id: string) => {
    if (!confirm('이 정산을 지급 완료 처리하시겠습니까?')) return;
    setPayingId(id);
    const ok = await adminPartnerSettlementApi.pay(id);
    if (ok) {
      fetchList();
      if (expandedId === id) {
        setExpandedId(null);
        setExpandedDetail(null);
      }
    }
    setPayingId(null);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Partner Settlements</h1>
      <p style={styles.subtitle}>파트너 커미션 정산 관리</p>

      {/* Create Settlement */}
      <div style={styles.createSection}>
        <h2 style={styles.sectionTitle}>정산 생성</h2>
        <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748B' }}>
          파트너를 검색하여 선택하면 해당 파트너의 승인(approved) 상태 커미션을 묶어 정산 배치를 생성합니다.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }} ref={dropdownRef}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="파트너 이름 또는 이메일 검색"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selectedPartner) setSelectedPartner(null);
                }}
                style={{ ...styles.input, paddingLeft: '36px', paddingRight: selectedPartner ? '36px' : '14px' }}
              />
              {selectedPartner && (
                <button
                  onClick={handleClearPartner}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '2px' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {/* Search Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div style={styles.dropdown}>
                {searchResults.map((p) => (
                  <button
                    key={p.partner_id}
                    onClick={() => handleSelectPartner(p)}
                    style={styles.dropdownItem}
                  >
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#1E293B' }}>{p.name}</span>
                    <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: '8px' }}>{p.email}</span>
                  </button>
                ))}
              </div>
            )}
            {searching && (
              <div style={{ ...styles.dropdown, padding: '12px 16px' }}>
                <span style={{ fontSize: '13px', color: '#94A3B8' }}>검색 중...</span>
              </div>
            )}
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !selectedPartner}
            style={{
              ...styles.actionBtn,
              backgroundColor: '#2563EB',
              color: '#fff',
              opacity: creating || !selectedPartner ? 0.5 : 1,
            }}
          >
            <Plus size={14} />
            {creating ? '생성 중...' : '정산 생성'}
          </button>
        </div>
        {selectedPartner && (
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#2563EB' }}>
            선택: {selectedPartner.name} ({selectedPartner.email})
          </p>
        )}
        {createMessage && (
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '13px',
            color: createMessage.type === 'success' ? '#16A34A' : '#DC2626',
          }}>
            {createMessage.text}
          </p>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            style={{
              ...styles.filterTab,
              backgroundColor: statusFilter === tab.value ? '#2563EB' : '#F1F5F9',
              color: statusFilter === tab.value ? '#fff' : '#475569',
            }}
          >
            {tab.label}
          </button>
        ))}
        <span style={{ fontSize: '13px', color: '#94A3B8', marginLeft: 'auto' }}>
          총 {total}건
        </span>
      </div>

      {/* Settlements List */}
      {loading ? (
        <div style={styles.emptyBox}>로딩 중...</div>
      ) : settlements.length === 0 ? (
        <div style={styles.emptyBox}>정산 내역이 없습니다.</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}></th>
                <th style={styles.th}>파트너</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>커미션 건수</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>총 금액</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>상태</th>
                <th style={styles.th}>생성일</th>
                <th style={styles.th}>지급일</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => {
                const st = getStatus(s.status);
                const isExpanded = expandedId === s.id;
                return (
                  <>
                    <tr key={s.id} style={styles.tr}>
                      <td style={{ ...styles.td, width: '40px', cursor: 'pointer' }} onClick={() => handleExpand(s.id)}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{s.partner_name || '-'}</div>
                        <div style={{ fontSize: '12px', color: '#94A3B8' }}>{s.partner_email || s.partner_id.slice(0, 8)}</div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>{s.commission_count}건</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(s.total_commission)}원
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: st.bg,
                          color: st.color,
                        }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ ...styles.td, fontSize: '13px', color: '#64748B' }}>
                        {formatDate(s.created_at)}
                      </td>
                      <td style={{ ...styles.td, fontSize: '13px', color: '#64748B' }}>
                        {s.paid_at ? formatDate(s.paid_at) : '-'}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {s.status === 'pending' && (
                          <button
                            onClick={() => handlePay(s.id)}
                            disabled={payingId === s.id}
                            style={{
                              ...styles.actionBtn,
                              backgroundColor: '#16A34A',
                              color: '#fff',
                              opacity: payingId === s.id ? 0.5 : 1,
                            }}
                          >
                            <CreditCard size={12} />
                            {payingId === s.id ? '처리 중...' : '지급'}
                          </button>
                        )}
                        {s.status === 'paid' && (
                          <span style={{ fontSize: '12px', color: '#94A3B8' }}>완료</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${s.id}-detail`}>
                        <td colSpan={8} style={{ padding: '0 16px 16px 56px', backgroundColor: '#F8FAFC' }}>
                          {detailLoading ? (
                            <p style={{ color: '#94A3B8', fontSize: '13px' }}>상세 로딩 중...</p>
                          ) : expandedDetail ? (
                            <table style={{ ...styles.table, border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                              <thead>
                                <tr>
                                  <th style={styles.thSub}>주문번호</th>
                                  <th style={styles.thSub}>공급자</th>
                                  <th style={{ ...styles.thSub, textAlign: 'right' }}>주문금액</th>
                                  <th style={{ ...styles.thSub, textAlign: 'right' }}>커미션</th>
                                </tr>
                              </thead>
                              <tbody>
                                {expandedDetail.items.map((item, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={styles.tdSub}>{item.order_number || '-'}</td>
                                    <td style={styles.tdSub}>{item.supplier_name || '-'}</td>
                                    <td style={{ ...styles.tdSub, textAlign: 'right' }}>
                                      {formatCurrency(item.order_amount)}원
                                    </td>
                                    <td style={{ ...styles.tdSub, textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>
                                      {formatCurrency(item.commission_amount)}원
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p style={{ color: '#94A3B8', fontSize: '13px' }}>상세 정보를 불러올 수 없습니다.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                ...styles.pageBtn,
                backgroundColor: page === p ? '#2563EB' : '#fff',
                color: page === p ? '#fff' : '#475569',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  title: {
    fontSize: '26px',
    fontWeight: 700,
    color: '#1E293B',
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748B',
    margin: '0 0 24px 0',
  },
  createSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    padding: '20px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1E293B',
    margin: '0 0 8px 0',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    zIndex: 50,
    maxHeight: '240px',
    overflowY: 'auto' as const,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '10px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background-color 0.15s',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '16px',
  },
  filterTab: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  emptyBox: {
    textAlign: 'center' as const,
    padding: '60px',
    color: '#94A3B8',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
  },
  tableWrap: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748B',
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid #E2E8F0',
    backgroundColor: '#F8FAFC',
    textAlign: 'left' as const,
    letterSpacing: '0.05em',
  },
  tr: {
    borderBottom: '1px solid #F1F5F9',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#1E293B',
  },
  thSub: {
    padding: '10px 14px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748B',
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid #E2E8F0',
    backgroundColor: '#F1F5F9',
    textAlign: 'left' as const,
  },
  tdSub: {
    padding: '10px 14px',
    fontSize: '13px',
    color: '#475569',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    gap: '4px',
    marginTop: '16px',
  },
  pageBtn: {
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: '#fff',
  },
};
