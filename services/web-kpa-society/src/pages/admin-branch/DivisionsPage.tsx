/**
 * DivisionsPage - 분회 관리 페이지
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminHeader } from '../../components/admin';
import { colors } from '../../styles/theme';

interface Division {
  id: string;
  code: string;
  name: string;
  memberCount: number;
  officerCount: number;
  feeRate: number;
  reportRate: number;
  isActive: boolean;
  createdAt: string;
  contact: {
    address?: string;
    phone?: string;
    email?: string;
  };
}

export function DivisionsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // 샘플 분회 데이터
  const [divisions] = useState<Division[]>([
    {
      id: 'div-1',
      code: 'SAMPLE',
      name: '샘플분회',
      memberCount: 25,
      officerCount: 5,
      feeRate: 88,
      reportRate: 92,
      isActive: true,
      createdAt: '2024-01-15',
      contact: { address: '서울시 강남구 테헤란로 123', phone: '02-1234-5678', email: 'sample@kpa.or.kr' },
    },
    {
      id: 'div-2',
      code: 'TEST',
      name: '테스트분회',
      memberCount: 20,
      officerCount: 4,
      feeRate: 75,
      reportRate: 85,
      isActive: true,
      createdAt: '2024-02-01',
      contact: { address: '서울시 서초구 반포대로 45', phone: '02-2345-6789' },
    },
    {
      id: 'div-3',
      code: 'DEMO',
      name: '데모분회',
      memberCount: 30,
      officerCount: 6,
      feeRate: 90,
      reportRate: 95,
      isActive: true,
      createdAt: '2024-02-15',
      contact: { address: '서울시 송파구 올림픽로 100' },
    },
  ]);

  const filteredDivisions = divisions.filter((div) =>
    div.name.includes(searchTerm) || div.code.includes(searchTerm.toUpperCase())
  );

  const totalMembers = divisions.reduce((sum, d) => sum + d.memberCount, 0);
  const avgFeeRate = Math.round(divisions.reduce((sum, d) => sum + d.feeRate, 0) / divisions.length);
  const avgReportRate = Math.round(divisions.reduce((sum, d) => sum + d.reportRate, 0) / divisions.length);

  return (
    <div>
      <AdminHeader
        title="분회 관리"
        subtitle={`전체 ${divisions.length}개 분회`}
        actions={
          <button style={styles.addButton}>
            + 새 분회 등록
          </button>
        }
      />

      <div style={styles.content}>
        {/* 통계 요약 */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{divisions.length}</div>
            <div style={styles.statLabel}>전체 분회</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{totalMembers}</div>
            <div style={styles.statLabel}>전체 회원</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: colors.accentGreen }}>{avgFeeRate}%</div>
            <div style={styles.statLabel}>평균 납부율</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: colors.primary }}>{avgReportRate}%</div>
            <div style={styles.statLabel}>평균 신고율</div>
          </div>
        </div>

        {/* 검색 */}
        <div style={styles.toolbar}>
          <div style={styles.searchBox}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="분회명 또는 코드로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        {/* 분회 목록 */}
        <div style={styles.divisionList}>
          {filteredDivisions.map((division) => (
            <div key={division.id} style={styles.divisionCard}>
              <div style={styles.divisionMain}>
                <div style={styles.divisionInfo}>
                  <div style={styles.divisionHeader}>
                    <h3 style={styles.divisionName}>{division.name}</h3>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: division.isActive ? colors.accentGreen : colors.neutral400,
                    }}>
                      {division.isActive ? '활성' : '비활성'}
                    </span>
                  </div>
                  <div style={styles.divisionMeta}>
                    <span>코드: {division.code}</span>
                    <span>•</span>
                    <span>회원 {division.memberCount}명</span>
                    <span>•</span>
                    <span>임원 {division.officerCount}명</span>
                  </div>
                  {division.contact.address && (
                    <div style={styles.divisionAddress}>
                      📍 {division.contact.address}
                    </div>
                  )}
                </div>

                <div style={styles.divisionStats}>
                  <div style={styles.rateBox}>
                    <div style={styles.rateValue}>{division.feeRate}%</div>
                    <div style={styles.rateLabel}>납부율</div>
                    <div style={styles.rateBar}>
                      <div style={{ ...styles.rateBarFill, width: `${division.feeRate}%`, backgroundColor: colors.accentGreen }} />
                    </div>
                  </div>
                  <div style={styles.rateBox}>
                    <div style={styles.rateValue}>{division.reportRate}%</div>
                    <div style={styles.rateLabel}>신고율</div>
                    <div style={styles.rateBar}>
                      <div style={{ ...styles.rateBarFill, width: `${division.reportRate}%`, backgroundColor: colors.primary }} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.divisionActions}>
                <Link to={`/admin/divisions/${division.id}`} style={styles.actionButton}>
                  상세 보기
                </Link>
                <Link to={`/branch/${division.id}/admin`} style={styles.actionButton} target="_blank">
                  분회 관리자
                </Link>
                <Link to={`/branch/${division.id}`} style={styles.actionButton} target="_blank">
                  사이트 보기
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  addButton: {
    padding: '12px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
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
  divisionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  divisionCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  divisionMain: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '24px',
    marginBottom: '20px',
  },
  divisionInfo: {
    flex: 1,
  },
  divisionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  divisionName: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  statusBadge: {
    padding: '4px 10px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  divisionMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '13px',
    color: colors.neutral500,
    marginBottom: '8px',
  },
  divisionAddress: {
    fontSize: '13px',
    color: colors.neutral600,
  },
  divisionStats: {
    display: 'flex',
    gap: '24px',
  },
  rateBox: {
    width: '120px',
    textAlign: 'center',
  },
  rateValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  rateLabel: {
    fontSize: '12px',
    color: colors.neutral500,
    marginBottom: '8px',
  },
  rateBar: {
    height: '6px',
    backgroundColor: colors.neutral200,
    borderRadius: '3px',
    overflow: 'hidden',
  },
  rateBarFill: {
    height: '100%',
    borderRadius: '3px',
  },
  divisionActions: {
    display: 'flex',
    gap: '8px',
    paddingTop: '16px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  actionButton: {
    padding: '10px 16px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'none',
  },
};
