/**
 * MembersPage - 지부 전체 회원 관리
 */

import { useState } from 'react';
import { AdminHeader } from '../../components/admin';
import { colors } from '../../styles/theme';

interface Member {
  id: string;
  name: string;
  licenseNumber: string;
  pharmacyName: string;
  division: string;
  divisionId: string;
  phone: string;
  email: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'pending';
  feeStatus: 'paid' | 'unpaid' | 'partial';
  reportStatus: 'submitted' | 'pending' | 'overdue';
}

export function MembersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDivision, setFilterDivision] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // 샘플 회원 데이터
  const [members] = useState<Member[]>([
    {
      id: '1',
      name: '홍길동',
      licenseNumber: '12345',
      pharmacyName: '샘플약국',
      division: '샘플분회',
      divisionId: 'div-1',
      phone: '010-1234-5678',
      email: 'hong@pharmacy.com',
      joinDate: '2024-01-15',
      status: 'active',
      feeStatus: 'paid',
      reportStatus: 'submitted',
    },
    {
      id: '2',
      name: '김테스트',
      licenseNumber: '12346',
      pharmacyName: '테스트약국',
      division: '샘플분회',
      divisionId: 'div-1',
      phone: '010-2345-6789',
      email: 'kim@pharmacy.com',
      joinDate: '2024-03-01',
      status: 'pending',
      feeStatus: 'unpaid',
      reportStatus: 'pending',
    },
    {
      id: '3',
      name: '박신입',
      licenseNumber: '12347',
      pharmacyName: '데모약국',
      division: '테스트분회',
      divisionId: 'div-2',
      phone: '010-3456-7890',
      email: 'park@pharmacy.com',
      joinDate: '2024-06-01',
      status: 'active',
      feeStatus: 'paid',
      reportStatus: 'submitted',
    },
  ]);

  const divisions = [
    { id: 'all', name: '전체 분회' },
    { id: 'div-1', name: '샘플분회' },
    { id: 'div-2', name: '테스트분회' },
    { id: 'div-3', name: '데모분회' },
  ];

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.includes(searchTerm) ||
      member.pharmacyName.includes(searchTerm) ||
      member.licenseNumber.includes(searchTerm);
    const matchesDivision = filterDivision === 'all' || member.divisionId === filterDivision;
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus;
    return matchesSearch && matchesDivision && matchesStatus;
  });

  const getStatusBadge = (status: Member['status']) => {
    const config: Record<string, { bg: string; label: string }> = {
      active: { bg: colors.accentGreen, label: '활성' },
      inactive: { bg: colors.neutral400, label: '비활성' },
      pending: { bg: colors.accentYellow, label: '승인대기' },
    };
    const { bg, label } = config[status];
    return <span style={{ ...styles.badge, backgroundColor: bg }}>{label}</span>;
  };

  const getFeeStatusBadge = (status: Member['feeStatus']) => {
    const config: Record<string, { bg: string; label: string }> = {
      paid: { bg: colors.accentGreen, label: '납부' },
      unpaid: { bg: colors.accentRed, label: '미납' },
      partial: { bg: colors.accentYellow, label: '일부' },
    };
    const { bg, label } = config[status];
    return <span style={{ ...styles.badge, backgroundColor: bg }}>{label}</span>;
  };

  const getReportStatusBadge = (status: Member['reportStatus']) => {
    const config: Record<string, { bg: string; label: string }> = {
      submitted: { bg: colors.accentGreen, label: '제출' },
      pending: { bg: colors.accentYellow, label: '미제출' },
      overdue: { bg: colors.accentRed, label: '기한초과' },
    };
    const { bg, label } = config[status];
    return <span style={{ ...styles.badge, backgroundColor: bg }}>{label}</span>;
  };

  return (
    <div>
      <AdminHeader
        title="회원 관리"
        subtitle={`전체 ${members.length}명`}
        actions={
          <button style={styles.exportButton}>
            📥 Excel 내보내기
          </button>
        }
      />

      <div style={styles.content}>
        {/* 통계 */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{members.length}</div>
            <div style={styles.statLabel}>전체 회원</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: colors.accentGreen }}>
              {members.filter((m) => m.status === 'active').length}
            </div>
            <div style={styles.statLabel}>활성 회원</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: colors.accentYellow }}>
              {members.filter((m) => m.status === 'pending').length}
            </div>
            <div style={styles.statLabel}>승인 대기</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: colors.accentRed }}>
              {members.filter((m) => m.feeStatus === 'unpaid').length}
            </div>
            <div style={styles.statLabel}>연회비 미납</div>
          </div>
        </div>

        {/* 필터 */}
        <div style={styles.toolbar}>
          <div style={styles.searchBox}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="이름, 약국명, 면허번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.filters}>
            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
              style={styles.select}
            >
              {divisions.map((div) => (
                <option key={div.id} value={div.id}>{div.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.select}
            >
              <option value="all">전체 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="pending">승인대기</option>
            </select>
          </div>
        </div>

        {/* 회원 테이블 */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>이름</th>
                <th style={styles.th}>면허번호</th>
                <th style={styles.th}>약국명</th>
                <th style={styles.th}>소속 분회</th>
                <th style={styles.th}>상태</th>
                <th style={styles.th}>연회비</th>
                <th style={styles.th}>신상신고</th>
                <th style={styles.th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.memberName}>{member.name}</div>
                    <div style={styles.memberEmail}>{member.email}</div>
                  </td>
                  <td style={styles.td}>{member.licenseNumber}</td>
                  <td style={styles.td}>{member.pharmacyName}</td>
                  <td style={styles.td}>
                    <span style={styles.divisionTag}>{member.division}</span>
                  </td>
                  <td style={styles.td}>{getStatusBadge(member.status)}</td>
                  <td style={styles.td}>{getFeeStatusBadge(member.feeStatus)}</td>
                  <td style={styles.td}>{getReportStatusBadge(member.reportStatus)}</td>
                  <td style={styles.td}>
                    <button style={styles.actionButton}>상세</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div style={styles.pagination}>
          <span style={styles.pageInfo}>
            전체 {members.length}명 중 {filteredMembers.length}명 표시
          </span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  exportButton: {
    padding: '10px 16px',
    backgroundColor: colors.primary,
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
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statValue: {
    fontSize: '28px',
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
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: colors.white,
    borderRadius: '8px',
    border: `1px solid ${colors.neutral300}`,
    width: '320px',
  },
  searchIcon: {
    fontSize: '16px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
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
  memberName: {
    fontWeight: 500,
  },
  memberEmail: {
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '2px',
  },
  divisionTag: {
    padding: '4px 8px',
    backgroundColor: colors.neutral100,
    borderRadius: '4px',
    fontSize: '12px',
    color: colors.neutral700,
  },
  badge: {
    padding: '4px 8px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  actionButton: {
    padding: '6px 12px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px',
    padding: '16px',
  },
  pageInfo: {
    fontSize: '14px',
    color: colors.neutral600,
  },
};
