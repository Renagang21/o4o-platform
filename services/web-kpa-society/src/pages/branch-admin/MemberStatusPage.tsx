/**
 * MemberStatusPage - 회원 현황 종합 리스트
 *
 * WO-KPA-MEMBER-STATUS-LIST-V1
 * - 각 회원별 신상신고/연수교육/회비납부 현황을 한눈에 확인
 * - CSV 다운로드로 대한약사회 보고용 데이터 추출
 * - 지부 보고 기능
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AdminHeader } from '../../components/branch-admin';
import { ACTIVITY_TYPE_LABELS } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';

// 회원 현황 데이터 타입
interface MemberStatus {
  id: string;
  name: string;
  licenseNumber: string;        // 약사 면허번호
  activityType: string;         // WO-ROLE-NORMALIZATION-PHASE3-C-V1
  pharmacyName: string;         // 근무지
  phone: string;
  email: string;
  // 신상신고 현황
  annualReport: {
    status: 'submitted' | 'pending' | 'overdue' | 'revision_requested';
    submittedAt?: string;
    year: number;
  };
  // 연수교육 현황
  training: {
    requiredHours: number;      // 필수 이수 시간
    completedHours: number;     // 완료 시간
    status: 'completed' | 'in_progress' | 'not_started' | 'overdue';
  };
  // 회비 납부 현황
  fee: {
    status: 'paid' | 'unpaid' | 'partial';
    amount: number;
    paidAmount: number;
    paidAt?: string;
  };
}

// WO-ROLE-NORMALIZATION-PHASE3-C-V1: ACTIVITY_TYPE_LABELS 사용

// 샘플 데이터
const sampleMembers: MemberStatus[] = [
  {
    id: '1',
    name: '홍길동',
    licenseNumber: '12345',
    activityType: 'pharmacy_employee',
    pharmacyName: '행복약국',
    phone: '010-1234-5678',
    email: 'hong@example.com',
    annualReport: { status: 'submitted', submittedAt: '2025-01-15', year: 2025 },
    training: { requiredHours: 8, completedHours: 8, status: 'completed' },
    fee: { status: 'paid', amount: 200000, paidAmount: 200000, paidAt: '2025-01-20' },
  },
  {
    id: '2',
    name: '김약사',
    licenseNumber: '23456',
    activityType: 'pharmacy_employee',
    pharmacyName: '건강약국',
    phone: '010-2345-6789',
    email: 'kim@example.com',
    annualReport: { status: 'pending', year: 2025 },
    training: { requiredHours: 8, completedHours: 4, status: 'in_progress' },
    fee: { status: 'unpaid', amount: 200000, paidAmount: 0 },
  },
  {
    id: '3',
    name: '이병원',
    licenseNumber: '34567',
    activityType: 'hospital',
    pharmacyName: '서울대병원',
    phone: '010-3456-7890',
    email: 'lee@example.com',
    annualReport: { status: 'overdue', year: 2025 },
    training: { requiredHours: 8, completedHours: 0, status: 'not_started' },
    fee: { status: 'partial', amount: 200000, paidAmount: 100000 },
  },
  {
    id: '4',
    name: '박산업',
    licenseNumber: '45678',
    activityType: 'other_industry',
    pharmacyName: '한국제약',
    phone: '010-4567-8901',
    email: 'park@example.com',
    annualReport: { status: 'submitted', submittedAt: '2025-01-10', year: 2025 },
    training: { requiredHours: 8, completedHours: 8, status: 'completed' },
    fee: { status: 'paid', amount: 160000, paidAmount: 160000, paidAt: '2025-01-10' },
  },
  {
    id: '5',
    name: '최기타',
    licenseNumber: '56789',
    activityType: 'other',
    pharmacyName: '프리랜서',
    phone: '010-5678-9012',
    email: 'choi@example.com',
    annualReport: { status: 'revision_requested', year: 2025 },
    training: { requiredHours: 8, completedHours: 6, status: 'in_progress' },
    fee: { status: 'unpaid', amount: 130000, paidAmount: 0 },
  },
];

export function MemberStatusPage() {
  const { branchId: _branchId } = useParams();
  const [selectedYear, setSelectedYear] = useState(2025);
  const [filter, setFilter] = useState<'all' | 'report_pending' | 'training_incomplete' | 'fee_unpaid'>('all');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // 필터링된 회원 목록
  const filteredMembers = sampleMembers.filter(member => {
    if (filter === 'all') return true;
    if (filter === 'report_pending') return member.annualReport.status !== 'submitted';
    if (filter === 'training_incomplete') return member.training.status !== 'completed';
    if (filter === 'fee_unpaid') return member.fee.status !== 'paid';
    return true;
  });

  // 통계 계산
  const stats = {
    total: sampleMembers.length,
    reportSubmitted: sampleMembers.filter(m => m.annualReport.status === 'submitted').length,
    trainingCompleted: sampleMembers.filter(m => m.training.status === 'completed').length,
    feePaid: sampleMembers.filter(m => m.fee.status === 'paid').length,
  };

  // 신상신고 상태 뱃지
  const getReportBadge = (status: MemberStatus['annualReport']['status']) => {
    const config = {
      submitted: { label: '제출완료', bg: '#D1FAE5', color: '#059669' },
      pending: { label: '미제출', bg: '#FEF3C7', color: '#D97706' },
      overdue: { label: '기한초과', bg: '#FEE2E2', color: '#DC2626' },
      revision_requested: { label: '수정요청', bg: '#DBEAFE', color: '#2563EB' },
    };
    const { label, bg, color } = config[status];
    return <span style={{ ...styles.badge, backgroundColor: bg, color }}>{label}</span>;
  };

  // 연수교육 상태 뱃지
  const getTrainingBadge = (status: MemberStatus['training']['status']) => {
    const config = {
      completed: { label: '이수완료', bg: '#D1FAE5', color: '#059669' },
      in_progress: { label: '진행중', bg: '#DBEAFE', color: '#2563EB' },
      not_started: { label: '미시작', bg: '#F3F4F6', color: '#6B7280' },
      overdue: { label: '기한초과', bg: '#FEE2E2', color: '#DC2626' },
    };
    const { label, bg, color } = config[status];
    return <span style={{ ...styles.badge, backgroundColor: bg, color }}>{label}</span>;
  };

  // 회비 상태 뱃지
  const getFeeBadge = (status: MemberStatus['fee']['status']) => {
    const config = {
      paid: { label: '납부완료', bg: '#D1FAE5', color: '#059669' },
      partial: { label: '일부납부', bg: '#FEF3C7', color: '#D97706' },
      unpaid: { label: '미납', bg: '#FEE2E2', color: '#DC2626' },
    };
    const { label, bg, color } = config[status];
    return <span style={{ ...styles.badge, backgroundColor: bg, color }}>{label}</span>;
  };

  // CSV 내보내기
  const exportCSV = () => {
    const headers = [
      '면허번호', '성명', '직능', '근무지', '전화번호', '이메일',
      '신상신고', '신상신고일', '연수교육시간', '연수교육상태',
      '회비금액', '납부금액', '납부상태', '납부일'
    ];

    const rows = filteredMembers.map(m => [
      m.licenseNumber,
      m.name,
      ACTIVITY_TYPE_LABELS[m.activityType] || m.activityType,
      m.pharmacyName,
      m.phone,
      m.email,
      m.annualReport.status === 'submitted' ? '제출' : '미제출',
      m.annualReport.submittedAt || '',
      `${m.training.completedHours}/${m.training.requiredHours}`,
      m.training.status === 'completed' ? '완료' : '미완료',
      m.fee.amount,
      m.fee.paidAmount,
      m.fee.status === 'paid' ? '완료' : m.fee.status === 'partial' ? '일부' : '미납',
      m.fee.paidAt || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `회원현황_${selectedYear}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 지부 보고
  const handleReportToDistrict = () => {
    if (confirm('지부에 현재 회원 현황을 보고하시겠습니까?')) {
      alert('지부에 보고되었습니다.\n보고일시: ' + new Date().toLocaleString('ko-KR'));
    }
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredMembers.map(m => m.id));
    }
  };

  // 개별 선택
  const toggleSelect = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div>
      <AdminHeader
        title="회원 현황"
        subtitle="신상신고, 연수교육, 회비납부 현황을 확인합니다"
      />

      <div style={styles.content}>
        {/* 통계 요약 */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>전체 회원</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#059669' }}>{stats.reportSubmitted}</div>
            <div style={styles.statLabel}>신상신고 제출</div>
            <div style={styles.statProgress}>
              {Math.round((stats.reportSubmitted / stats.total) * 100)}%
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#2563EB' }}>{stats.trainingCompleted}</div>
            <div style={styles.statLabel}>연수교육 완료</div>
            <div style={styles.statProgress}>
              {Math.round((stats.trainingCompleted / stats.total) * 100)}%
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#059669' }}>{stats.feePaid}</div>
            <div style={styles.statLabel}>회비 납부</div>
            <div style={styles.statProgress}>
              {Math.round((stats.feePaid / stats.total) * 100)}%
            </div>
          </div>
        </div>

        {/* 필터 및 액션 */}
        <div style={styles.toolbar}>
          <div style={styles.filterGroup}>
            <select
              style={styles.select}
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              <option value={2025}>2025년</option>
              <option value={2024}>2024년</option>
              <option value={2023}>2023년</option>
            </select>
            <select
              style={styles.select}
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option value="all">전체 보기</option>
              <option value="report_pending">신상신고 미제출</option>
              <option value="training_incomplete">연수교육 미완료</option>
              <option value="fee_unpaid">회비 미납</option>
            </select>
          </div>
          <div style={styles.actionGroup}>
            <button style={styles.secondaryButton} onClick={exportCSV}>
              CSV 다운로드
            </button>
            <button style={styles.primaryButton} onClick={handleReportToDistrict}>
              지부에 보고
            </button>
          </div>
        </div>

        {/* 회원 목록 테이블 */}
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>
                  <input
                    type="checkbox"
                    checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={styles.th}>면허번호</th>
                <th style={styles.th}>성명</th>
                <th style={styles.th}>직능</th>
                <th style={styles.th}>근무지</th>
                <th style={styles.th}>신상신고</th>
                <th style={styles.th}>연수교육</th>
                <th style={styles.th}>회비납부</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(member => (
                <tr key={member.id} style={styles.tableRow}>
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleSelect(member.id)}
                    />
                  </td>
                  <td style={styles.td}>{member.licenseNumber}</td>
                  <td style={styles.td}>
                    <div style={styles.memberName}>{member.name}</div>
                    <div style={styles.memberContact}>{member.phone}</div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.functionBadge}>
                      {ACTIVITY_TYPE_LABELS[member.activityType] || member.activityType}
                    </span>
                  </td>
                  <td style={styles.td}>{member.pharmacyName}</td>
                  <td style={styles.td}>
                    {getReportBadge(member.annualReport.status)}
                    {member.annualReport.submittedAt && (
                      <div style={styles.subText}>{member.annualReport.submittedAt}</div>
                    )}
                  </td>
                  <td style={styles.td}>
                    {getTrainingBadge(member.training.status)}
                    <div style={styles.subText}>
                      {member.training.completedHours}/{member.training.requiredHours}시간
                    </div>
                  </td>
                  <td style={styles.td}>
                    {getFeeBadge(member.fee.status)}
                    <div style={styles.subText}>
                      {member.fee.paidAmount.toLocaleString()}/{member.fee.amount.toLocaleString()}원
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 선택된 회원 액션 */}
        {selectedMembers.length > 0 && (
          <div style={styles.bulkActions}>
            <span style={styles.bulkCount}>{selectedMembers.length}명 선택됨</span>
            <button style={styles.bulkButton}>알림 발송</button>
            <button style={styles.bulkButton}>일괄 납부 확인</button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
    fontSize: '28px',
    fontWeight: 700,
    color: colors.primary,
  },
  statLabel: {
    fontSize: '13px',
    color: colors.neutral600,
    marginTop: '4px',
  },
  statProgress: {
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '4px',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  filterGroup: {
    display: 'flex',
    gap: '12px',
  },
  select: {
    padding: '10px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: colors.white,
  },
  actionGroup: {
    display: 'flex',
    gap: '12px',
  },
  primaryButton: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '10px 20px',
    backgroundColor: colors.white,
    color: colors.neutral700,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  tableContainer: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: colors.neutral50,
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral700,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  tableRow: {
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: colors.neutral800,
    verticalAlign: 'top',
  },
  memberName: {
    fontWeight: 500,
  },
  memberContact: {
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '2px',
  },
  functionBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  subText: {
    fontSize: '11px',
    color: colors.neutral500,
    marginTop: '4px',
  },
  bulkActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '16px',
    padding: '16px 20px',
    backgroundColor: colors.primary,
    borderRadius: '12px',
  },
  bulkCount: {
    color: colors.white,
    fontSize: '14px',
    fontWeight: 500,
  },
  bulkButton: {
    padding: '8px 16px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: colors.white,
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
};

export default MemberStatusPage;
