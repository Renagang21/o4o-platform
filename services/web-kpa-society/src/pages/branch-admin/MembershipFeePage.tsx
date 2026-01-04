/**
 * MembershipFeePage - 연회비 관리 페이지
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AdminHeader } from '../../components/branch-admin';
import { colors } from '../../styles/theme';

interface FeeRecord {
  id: string;
  memberId: string;
  memberName: string;
  pharmacyName: string;
  year: number;
  amount: number;
  paidAmount: number;
  paidAt?: string;
  status: 'paid' | 'unpaid' | 'partial' | 'pending_confirm';
  paymentMethod?: 'bank' | 'card' | 'cash';
  receiptNumber?: string;
}

export function MembershipFeePage() {
  const { branchId: _branchId } = useParams();
  const [filterYear, setFilterYear] = useState(2025);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);

  // 샘플 데이터 (테스트용 최소 데이터)
  const [records] = useState<FeeRecord[]>([
    {
      id: '1',
      memberId: 'm1',
      memberName: '홍길동',
      pharmacyName: '샘플약국',
      year: 2025,
      amount: 200000,
      paidAmount: 200000,
      paidAt: '2025-01-03',
      status: 'paid',
      paymentMethod: 'bank',
      receiptNumber: 'R2025-001',
    },
    {
      id: '2',
      memberId: 'm2',
      memberName: '김테스트',
      pharmacyName: '테스트약국',
      year: 2025,
      amount: 200000,
      paidAmount: 0,
      status: 'unpaid',
    },
  ]);

  const getStatusBadge = (status: FeeRecord['status']) => {
    const styles: Record<string, React.CSSProperties> = {
      paid: { backgroundColor: colors.accentGreen, color: colors.white },
      unpaid: { backgroundColor: colors.accentRed, color: colors.white },
      partial: { backgroundColor: colors.accentYellow, color: colors.white },
      pending_confirm: { backgroundColor: colors.primary, color: colors.white },
    };
    const labels: Record<string, string> = {
      paid: '납부완료',
      unpaid: '미납',
      partial: '일부납부',
      pending_confirm: '확인대기',
    };
    return <span style={{ ...badgeStyle, ...styles[status] }}>{labels[status]}</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  const totalAmount = records.filter((r) => r.year === filterYear).reduce((sum, r) => sum + r.amount, 0);
  const paidAmount = records.filter((r) => r.year === filterYear).reduce((sum, r) => sum + r.paidAmount, 0);
  const unpaidCount = records.filter((r) => r.year === filterYear && r.status === 'unpaid').length;
  const pendingCount = records.filter((r) => r.year === filterYear && r.status === 'pending_confirm').length;

  const handleConfirmPayment = (recordId: string) => {
    alert(`연회비 #${recordId} 납부 확인 완료`);
  };

  const handleSendReminder = () => {
    if (selectedRecords.length === 0) {
      alert('대상을 선택하세요.');
      return;
    }
    alert(`${selectedRecords.length}명에게 납부 독촉 메시지 발송`);
  };

  const toggleSelectRecord = (id: string) => {
    setSelectedRecords((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  return (
    <div>
      <AdminHeader
        title="연회비 관리"
        subtitle={`${filterYear}년 연회비 현황 - 확인 대기 ${pendingCount}건`}
      />

      <div style={pageStyles.content}>
        {/* 통계 카드 */}
        <div style={pageStyles.statsGrid}>
          <div style={pageStyles.statCard}>
            <div style={pageStyles.statValue}>{formatCurrency(totalAmount)}</div>
            <div style={pageStyles.statLabel}>총 부과금액</div>
          </div>
          <div style={pageStyles.statCard}>
            <div style={{ ...pageStyles.statValue, color: colors.accentGreen }}>{formatCurrency(paidAmount)}</div>
            <div style={pageStyles.statLabel}>납부완료</div>
          </div>
          <div style={pageStyles.statCard}>
            <div style={{ ...pageStyles.statValue, color: colors.accentRed }}>{formatCurrency(totalAmount - paidAmount)}</div>
            <div style={pageStyles.statLabel}>미납금액</div>
          </div>
          <div style={pageStyles.statCard}>
            <div style={pageStyles.statValue}>{Math.round((paidAmount / totalAmount) * 100)}%</div>
            <div style={pageStyles.statLabel}>납부율</div>
          </div>
        </div>

        {/* 연도 탭 및 필터 */}
        <div style={pageStyles.toolbar}>
          <div style={pageStyles.yearTabs}>
            {[2025, 2024, 2023].map((year) => (
              <button
                key={year}
                style={{
                  ...pageStyles.yearTab,
                  ...(filterYear === year ? pageStyles.yearTabActive : {}),
                }}
                onClick={() => setFilterYear(year)}
              >
                {year}년
              </button>
            ))}
          </div>

          <div style={pageStyles.filters}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={pageStyles.select}
            >
              <option value="all">전체 상태</option>
              <option value="paid">납부완료</option>
              <option value="unpaid">미납</option>
              <option value="partial">일부납부</option>
              <option value="pending_confirm">확인대기</option>
            </select>

            <button style={pageStyles.reminderButton} onClick={handleSendReminder}>
              📧 납부 독촉 발송
            </button>

            <button style={pageStyles.exportButton}>
              📥 지부 보고용 Export
            </button>
          </div>
        </div>

        {/* 연회비 테이블 */}
        <div style={pageStyles.tableWrapper}>
          <table style={pageStyles.table}>
            <thead>
              <tr>
                <th style={pageStyles.th}>
                  <input
                    type="checkbox"
                    onChange={() => {
                      const unpaidIds = records
                        .filter((r) => r.year === filterYear && r.status !== 'paid')
                        .map((r) => r.id);
                      setSelectedRecords(
                        selectedRecords.length === unpaidIds.length ? [] : unpaidIds
                      );
                    }}
                  />
                </th>
                <th style={pageStyles.th}>회원명</th>
                <th style={pageStyles.th}>약국명</th>
                <th style={pageStyles.th}>부과금액</th>
                <th style={pageStyles.th}>납부금액</th>
                <th style={pageStyles.th}>상태</th>
                <th style={pageStyles.th}>납부일</th>
                <th style={pageStyles.th}>결제수단</th>
                <th style={pageStyles.th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {records
                .filter((r) => r.year === filterYear)
                .filter((r) => filterStatus === 'all' || r.status === filterStatus)
                .map((record) => (
                  <tr key={record.id} style={pageStyles.tr}>
                    <td style={pageStyles.td}>
                      <input
                        type="checkbox"
                        checked={selectedRecords.includes(record.id)}
                        onChange={() => toggleSelectRecord(record.id)}
                        disabled={record.status === 'paid'}
                      />
                    </td>
                    <td style={pageStyles.td}>{record.memberName}</td>
                    <td style={pageStyles.td}>{record.pharmacyName}</td>
                    <td style={pageStyles.td}>{formatCurrency(record.amount)}</td>
                    <td style={pageStyles.td}>{formatCurrency(record.paidAmount)}</td>
                    <td style={pageStyles.td}>{getStatusBadge(record.status)}</td>
                    <td style={pageStyles.td}>{record.paidAt || '-'}</td>
                    <td style={pageStyles.td}>
                      {record.paymentMethod === 'bank' && '계좌이체'}
                      {record.paymentMethod === 'card' && '카드결제'}
                      {record.paymentMethod === 'cash' && '현금'}
                      {!record.paymentMethod && '-'}
                    </td>
                    <td style={pageStyles.td}>
                      {record.status === 'pending_confirm' && (
                        <button
                          style={pageStyles.confirmButton}
                          onClick={() => handleConfirmPayment(record.id)}
                        >
                          납부확인
                        </button>
                      )}
                      {record.status === 'paid' && record.receiptNumber && (
                        <span style={pageStyles.receiptNumber}>{record.receiptNumber}</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* 미납자 알림 */}
        {unpaidCount > 0 && (
          <div style={pageStyles.unpaidAlert}>
            <span style={pageStyles.alertIcon}>⚠️</span>
            <span>
              {filterYear}년 연회비 미납자 <strong>{unpaidCount}명</strong>이 있습니다.
              독촉 메시지를 발송하시겠습니까?
            </span>
            <button style={pageStyles.alertButton} onClick={handleSendReminder}>
              일괄 발송
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const badgeStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 500,
};

const pageStyles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  statLabel: {
    fontSize: '13px',
    color: colors.neutral500,
    marginTop: '4px',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  yearTabs: {
    display: 'flex',
    gap: '8px',
  },
  yearTab: {
    padding: '10px 20px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  yearTabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
  },
  filters: {
    display: 'flex',
    gap: '12px',
  },
  select: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.neutral300}`,
    fontSize: '14px',
    backgroundColor: colors.white,
  },
  reminderButton: {
    padding: '10px 16px',
    backgroundColor: colors.accentYellow,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  exportButton: {
    padding: '10px 16px',
    backgroundColor: colors.accentGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  tableWrapper: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral600,
    backgroundColor: colors.neutral50,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  tr: {
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: colors.neutral800,
  },
  confirmButton: {
    padding: '6px 12px',
    backgroundColor: colors.accentGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  receiptNumber: {
    fontSize: '12px',
    color: colors.neutral500,
  },
  unpaidAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    backgroundColor: '#FEF3C7',
    borderRadius: '8px',
    marginTop: '20px',
    fontSize: '14px',
    color: colors.neutral800,
  },
  alertIcon: {
    fontSize: '20px',
  },
  alertButton: {
    marginLeft: 'auto',
    padding: '8px 16px',
    backgroundColor: colors.accentYellow,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
};
