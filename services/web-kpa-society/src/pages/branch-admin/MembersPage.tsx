/**
 * MembersPage - 회원 관리 페이지
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminHeader } from '../../components/branch-admin';
import { colors } from '../../styles/theme';

interface Member {
  id: string;
  name: string;
  licenseNumber: string;
  pharmacyName: string;
  phone: string;
  email: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'pending';
  annualReportStatus: 'submitted' | 'pending' | 'overdue';
  feeStatus: 'paid' | 'unpaid' | 'partial';
}

export function MembersPage() {
  const { branchId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // 샘플 데이터 (테스트용 최소 데이터)
  const [members] = useState<Member[]>([
    {
      id: '1',
      name: '홍길동',
      licenseNumber: '12345',
      pharmacyName: '샘플약국',
      phone: '010-1234-5678',
      email: 'sample@pharmacy.com',
      joinDate: '2024-01-15',
      status: 'active',
      annualReportStatus: 'submitted',
      feeStatus: 'paid',
    },
    {
      id: '2',
      name: '김테스트',
      licenseNumber: '12346',
      pharmacyName: '테스트약국',
      phone: '010-2345-6789',
      email: 'test@pharmacy.com',
      joinDate: '2024-03-01',
      status: 'pending',
      annualReportStatus: 'pending',
      feeStatus: 'unpaid',
    },
  ]);

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.includes(searchTerm) ||
      member.pharmacyName.includes(searchTerm) ||
      member.licenseNumber.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Member['status']) => {
    const styles: Record<string, React.CSSProperties> = {
      active: { backgroundColor: colors.accentGreen, color: colors.white },
      inactive: { backgroundColor: colors.neutral400, color: colors.white },
      pending: { backgroundColor: colors.accentYellow, color: colors.white },
    };
    const labels: Record<string, string> = {
      active: '활성',
      inactive: '비활성',
      pending: '승인대기',
    };
    return <span style={{ ...badgeStyle, ...styles[status] }}>{labels[status]}</span>;
  };

  const getAnnualReportBadge = (status: Member['annualReportStatus']) => {
    const styles: Record<string, React.CSSProperties> = {
      submitted: { backgroundColor: colors.accentGreen, color: colors.white },
      pending: { backgroundColor: colors.accentYellow, color: colors.white },
      overdue: { backgroundColor: colors.accentRed, color: colors.white },
    };
    const labels: Record<string, string> = {
      submitted: '제출완료',
      pending: '미제출',
      overdue: '기한초과',
    };
    return <span style={{ ...badgeStyle, ...styles[status] }}>{labels[status]}</span>;
  };

  const getFeeBadge = (status: Member['feeStatus']) => {
    const styles: Record<string, React.CSSProperties> = {
      paid: { backgroundColor: colors.accentGreen, color: colors.white },
      unpaid: { backgroundColor: colors.accentRed, color: colors.white },
      partial: { backgroundColor: colors.accentYellow, color: colors.white },
    };
    const labels: Record<string, string> = {
      paid: '납부완료',
      unpaid: '미납',
      partial: '일부납부',
    };
    return <span style={{ ...badgeStyle, ...styles[status] }}>{labels[status]}</span>;
  };

  const toggleSelectMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredMembers.map((m) => m.id));
    }
  };

  return (
    <div>
      <AdminHeader
        title="회원 관리"
        subtitle="분회 소속 회원을 관리합니다"
      />

      <div style={pageStyles.content}>
        {/* 검색 및 필터 */}
        <div style={pageStyles.toolbar}>
          <div style={pageStyles.searchBox}>
            <span style={pageStyles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="이름, 약국명, 면허번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={pageStyles.searchInput}
            />
          </div>

          <div style={pageStyles.filters}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={pageStyles.select}
            >
              <option value="all">전체 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="pending">승인대기</option>
            </select>

            <button style={pageStyles.exportButton}>
              📥 Excel 내보내기
            </button>
          </div>
        </div>

        {/* 선택된 항목 액션 */}
        {selectedMembers.length > 0 && (
          <div style={pageStyles.bulkActions}>
            <span style={pageStyles.selectedCount}>
              {selectedMembers.length}명 선택됨
            </span>
            <button style={pageStyles.bulkButton}>📧 일괄 메일 발송</button>
            <button style={pageStyles.bulkButton}>📱 SMS 발송</button>
            <button style={{ ...pageStyles.bulkButton, ...pageStyles.dangerButton }}>
              🚫 비활성화
            </button>
          </div>
        )}

        {/* 회원 테이블 */}
        <div style={pageStyles.tableWrapper}>
          <table style={pageStyles.table}>
            <thead>
              <tr>
                <th style={pageStyles.th}>
                  <input
                    type="checkbox"
                    checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={pageStyles.th}>이름</th>
                <th style={pageStyles.th}>면허번호</th>
                <th style={pageStyles.th}>약국명</th>
                <th style={pageStyles.th}>연락처</th>
                <th style={pageStyles.th}>상태</th>
                <th style={pageStyles.th}>신상신고</th>
                <th style={pageStyles.th}>연회비</th>
                <th style={pageStyles.th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id} style={pageStyles.tr}>
                  <td style={pageStyles.td}>
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleSelectMember(member.id)}
                    />
                  </td>
                  <td style={pageStyles.td}>
                    <div style={pageStyles.memberName}>{member.name}</div>
                    <div style={pageStyles.memberEmail}>{member.email}</div>
                  </td>
                  <td style={pageStyles.td}>{member.licenseNumber}</td>
                  <td style={pageStyles.td}>{member.pharmacyName}</td>
                  <td style={pageStyles.td}>{member.phone}</td>
                  <td style={pageStyles.td}>{getStatusBadge(member.status)}</td>
                  <td style={pageStyles.td}>{getAnnualReportBadge(member.annualReportStatus)}</td>
                  <td style={pageStyles.td}>{getFeeBadge(member.feeStatus)}</td>
                  <td style={pageStyles.td}>
                    <div style={pageStyles.actions}>
                      <Link
                        to={`/branch/${branchId}/admin/members/${member.id}`}
                        style={pageStyles.actionLink}
                      >
                        상세
                      </Link>
                      <button style={pageStyles.actionButton}>수정</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div style={pageStyles.pagination}>
          <span style={pageStyles.pageInfo}>
            전체 {members.length}명 중 {filteredMembers.length}명 표시
          </span>
          <div style={pageStyles.pageButtons}>
            <button style={pageStyles.pageButton}>← 이전</button>
            <button style={{ ...pageStyles.pageButton, ...pageStyles.pageButtonActive }}>1</button>
            <button style={pageStyles.pageButton}>2</button>
            <button style={pageStyles.pageButton}>3</button>
            <button style={pageStyles.pageButton}>다음 →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const badgeStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 500,
};

const pageStyles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
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
    padding: '10px 16px',
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
  exportButton: {
    padding: '10px 16px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  bulkActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: colors.neutral100,
    borderRadius: '8px',
    marginBottom: '16px',
  },
  selectedCount: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral700,
  },
  bulkButton: {
    padding: '8px 14px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  dangerButton: {
    borderColor: colors.accentRed,
    color: colors.accentRed,
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
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionLink: {
    padding: '6px 12px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '12px',
    textDecoration: 'none',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    padding: '16px',
  },
  pageInfo: {
    fontSize: '14px',
    color: colors.neutral600,
  },
  pageButtons: {
    display: 'flex',
    gap: '8px',
  },
  pageButton: {
    padding: '8px 14px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  pageButtonActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
  },
};
