/**
 * MembershipFeePage - 지부 연회비 관리
 */

import { useState } from 'react';
import { AdminHeader } from '../../components/admin';
import { colors } from '../../styles/theme';

interface FeeRecord {
  id: string;
  memberId: string;
  memberName: string;
  pharmacyName: string;
  division: string;
  divisionId: string;
  year: number;
  amount: number;
  status: 'paid' | 'unpaid' | 'partial';
  paidAmount: number;
  paidAt?: string;
  dueDate: string;
}

export function MembershipFeePage() {
  const [filterYear, setFilterYear] = useState(2025);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDivision, setFilterDivision] = useState<string>('all');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // 샘플 데이터
  const [feeRecords] = useState<FeeRecord[]>([
    {
      id: '1',
      memberId: 'm1',
      memberName: '홍길동',
      pharmacyName: '샘플약국',
      division: '샘플분회',
      divisionId: 'div-1',
      year: 2025,
      amount: 300000,
      status: 'paid',
      paidAmount: 300000,
      paidAt: '2025-01-02',
      dueDate: '2025-03-31',
    },
    {
      id: '2',
      memberId: 'm2',
      memberName: '김테스트',
      pharmacyName: '테스트약국',
      division: '샘플분회',
      divisionId: 'div-1',
      year: 2025,
      amount: 300000,
      status: 'unpaid',
      paidAmount: 0,
      dueDate: '2025-03-31',
    },
    {
      id: '3',
      memberId: 'm3',
      memberName: '박신입',
      pharmacyName: '데모약국',
      division: '테스트분회',
      divisionId: 'div-2',
      year: 2025,
      amount: 300000,
      status: 'partial',
      paidAmount: 150000,
      paidAt: '2025-01-03',
      dueDate: '2025-03-31',
    },
  ]);

  const divisions = [
    { id: 'all', name: '전체 분회' },
    { id: 'div-1', name: '샘플분회' },
    { id: 'div-2', name: '테스트분회' },
  ];

  const filteredRecords = feeRecords.filter((r) => {
    const matchesYear = r.year === filterYear;
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesDivision = filterDivision === 'all' || r.divisionId === filterDivision;
    return matchesYear && matchesStatus && matchesDivision;
  });

  // 통계 계산
  const yearRecords = feeRecords.filter((r) => r.year === filterYear);
  const totalAmount = yearRecords.reduce((sum, r) => sum + r.amount, 0);
  const paidAmount = yearRecords.reduce((sum, r) => sum + r.paidAmount, 0);
  const unpaidCount = yearRecords.filter((r) => r.status === 'unpaid').length;
  const paymentRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  const getStatusBadge = (status: FeeRecord['status']) => {
    const config: Record<string, { bg: string; label: string }> = {
      paid: { bg: colors.accentGreen, label: '완납' },
      unpaid: { bg: colors.accentRed, label: '미납' },
      partial: { bg: colors.accentYellow, label: '부분납' },
    };
    const { bg, label } = config[status];
    return <span style={{ ...styles.badge, backgroundColor: bg }}>{label}</span>;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const unpaidIds = filteredRecords
        .filter((r) => r.status !== 'paid')
        .map((r) => r.id);
      setSelectedMembers(unpaidIds);
    } else {
      setSelectedMembers([]);
    }
  };

  const handleSelectMember = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedMembers([...selectedMembers, id]);
    } else {
      setSelectedMembers(selectedMembers.filter((m) => m !== id));
    }
  };

  const handleConfirmPayment = (recordId: string) => {
    alert(`연회비 #${recordId} 납부 확인 처리`);
  };

  const handleSendReminder = () => {
    if (selectedMembers.length === 0) {
      alert('독촉 대상을 선택해주세요.');
      return;
    }
    alert(`${selectedMembers.length}명에게 독촉 메시지 발송 (UI 데모)`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  return (
    <div>
      <AdminHeader
        title="연회비 관리"
        subtitle={`${filterYear}년 연회비 현황`}
        actions={
          <div style={styles.headerActions}>
            <button
              style={styles.reminderButton}
              onClick={handleSendReminder}
              disabled={selectedMembers.length === 0}
            >
              📧 독촉 발송 ({selectedMembers.length})
            </button>
            <button style={styles.exportButton}>📥 Excel 내보내기</button>
          </div>
        }
      />

      <div style={styles.content}>
        {/* 통계 카드 */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{formatCurrency(totalAmount)}</div>
            <div style={styles.statLabel}>총 부과액</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: colors.accentGreen }}>
              {formatCurrency(paidAmount)}
            </div>
            <div style={styles.statLabel}>납부액</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: colors.accentRed }}>
              {formatCurrency(totalAmount - paidAmount)}
            </div>
            <div style={styles.statLabel}>미납액</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: colors.primary }}>{paymentRate}%</div>
            <div style={styles.statLabel}>납부율</div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${paymentRate}%` }} />
            </div>
          </div>
        </div>

        {/* 연도 탭 및 필터 */}
        <div style={styles.toolbar}>
          <div style={styles.yearTabs}>
            {[2025, 2024, 2023].map((year) => (
              <button
                key={year}
                style={{
                  ...styles.yearTab,
                  ...(filterYear === year ? styles.yearTabActive : {}),
                }}
                onClick={() => setFilterYear(year)}
              >
                {year}년
              </button>
            ))}
          </div>

          <div style={styles.filters}>
            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
              style={styles.select}
            >
              {divisions.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.select}
            >
              <option value="all">전체 상태</option>
              <option value="paid">완납</option>
              <option value="partial">부분납</option>
              <option value="unpaid">미납</option>
            </select>
          </div>
        </div>

        {/* 미납자 요약 */}
        {unpaidCount > 0 && (
          <div style={styles.unpaidAlert}>
            ⚠️ 미납자 {unpaidCount}명 - 납부 기한: {yearRecords[0]?.dueDate || '-'}
          </div>
        )}

        {/* 연회비 목록 테이블 */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  <input
                    type="checkbox"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={
                      selectedMembers.length > 0 &&
                      selectedMembers.length ===
                        filteredRecords.filter((r) => r.status !== 'paid').length
                    }
                  />
                </th>
                <th style={styles.th}>회원명</th>
                <th style={styles.th}>약국명</th>
                <th style={styles.th}>분회</th>
                <th style={styles.th}>부과액</th>
                <th style={styles.th}>납부액</th>
                <th style={styles.th}>상태</th>
                <th style={styles.th}>납부일</th>
                <th style={styles.th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} style={styles.tr}>
                  <td style={styles.td}>
                    {record.status !== 'paid' && (
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(record.id)}
                        onChange={(e) => handleSelectMember(record.id, e.target.checked)}
                      />
                    )}
                  </td>
                  <td style={styles.td}>{record.memberName}</td>
                  <td style={styles.td}>{record.pharmacyName}</td>
                  <td style={styles.td}>{record.division}</td>
                  <td style={styles.td}>{formatCurrency(record.amount)}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        color: record.paidAmount === record.amount ? colors.accentGreen : colors.neutral700,
                      }}
                    >
                      {formatCurrency(record.paidAmount)}
                    </span>
                  </td>
                  <td style={styles.td}>{getStatusBadge(record.status)}</td>
                  <td style={styles.td}>{record.paidAt || '-'}</td>
                  <td style={styles.td}>
                    {record.status !== 'paid' && (
                      <button
                        style={styles.confirmButton}
                        onClick={() => handleConfirmPayment(record.id)}
                      >
                        납부확인
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 분회별 납부 현황 */}
        <div style={styles.divisionSummary}>
          <h3 style={styles.summaryTitle}>분회별 납부 현황</h3>
          <div style={styles.divisionGrid}>
            {divisions
              .filter((d) => d.id !== 'all')
              .map((div) => {
                const divRecords = yearRecords.filter((r) => r.divisionId === div.id);
                const divTotal = divRecords.reduce((sum, r) => sum + r.amount, 0);
                const divPaid = divRecords.reduce((sum, r) => sum + r.paidAmount, 0);
                const divRate = divTotal > 0 ? Math.round((divPaid / divTotal) * 100) : 0;
                const divUnpaid = divRecords.filter((r) => r.status === 'unpaid').length;

                return (
                  <div key={div.id} style={styles.divisionCard}>
                    <div style={styles.divisionName}>{div.name}</div>
                    <div style={styles.divisionStats}>
                      <div style={styles.divisionStat}>
                        <span style={styles.divisionStatLabel}>납부율</span>
                        <span style={{ ...styles.divisionStatValue, color: colors.primary }}>
                          {divRate}%
                        </span>
                      </div>
                      <div style={styles.divisionStat}>
                        <span style={styles.divisionStatLabel}>미납</span>
                        <span
                          style={{
                            ...styles.divisionStatValue,
                            color: divUnpaid > 0 ? colors.accentRed : colors.accentGreen,
                          }}
                        >
                          {divUnpaid}명
                        </span>
                      </div>
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${divRate}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  reminderButton: {
    padding: '10px 16px',
    backgroundColor: colors.accentYellow,
    color: colors.neutral900,
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
  progressBar: {
    height: '6px',
    backgroundColor: colors.neutral200,
    borderRadius: '3px',
    marginTop: '12px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
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
  unpaidAlert: {
    padding: '16px 20px',
    backgroundColor: '#FEF3C7',
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral800,
    marginBottom: '20px',
    border: `1px solid ${colors.accentYellow}`,
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
  badge: {
    padding: '4px 10px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  confirmButton: {
    padding: '6px 12px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  divisionSummary: {
    marginTop: '32px',
  },
  summaryTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '16px',
  },
  divisionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  divisionCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  divisionName: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '12px',
  },
  divisionStats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  divisionStat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  divisionStatLabel: {
    fontSize: '12px',
    color: colors.neutral500,
  },
  divisionStatValue: {
    fontSize: '18px',
    fontWeight: 600,
  },
};
