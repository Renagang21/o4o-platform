/**
 * DivisionDetailPage - 분회 상세 페이지
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AdminHeader } from '../../components/admin';
import { colors } from '../../styles/theme';

interface DivisionDetail {
  id: string;
  code: string;
  name: string;
  memberCount: number;
  officerCount: number;
  feeRate: number;
  reportRate: number;
  contact: {
    address?: string;
    phone?: string;
    email?: string;
  };
}

interface Member {
  id: string;
  name: string;
  pharmacyName: string;
  feeStatus: 'paid' | 'unpaid';
  reportStatus: 'submitted' | 'pending';
}

interface AnnualReport {
  id: string;
  memberName: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface Officer {
  id: string;
  name: string;
  position: string;
  phone: string;
}

export function DivisionDetailPage() {
  const { divisionId } = useParams();

  // 샘플 분회 데이터
  const [division] = useState<DivisionDetail>({
    id: divisionId || 'div-1',
    code: 'SAMPLE',
    name: '샘플분회',
    memberCount: 25,
    officerCount: 5,
    feeRate: 88,
    reportRate: 92,
    contact: {
      address: '서울시 강남구 테헤란로 123',
      phone: '02-1234-5678',
      email: 'sample@kpa.or.kr',
    },
  });

  // 샘플 회원 데이터
  const [members] = useState<Member[]>([
    { id: '1', name: '홍길동', pharmacyName: '샘플약국', feeStatus: 'paid', reportStatus: 'submitted' },
    { id: '2', name: '김테스트', pharmacyName: '테스트약국', feeStatus: 'unpaid', reportStatus: 'pending' },
  ]);

  // 샘플 신상신고 데이터
  const [annualReports] = useState<AnnualReport[]>([
    { id: '1', memberName: '홍길동', submittedAt: '2025-01-04', status: 'pending' },
    { id: '2', memberName: '박신입', submittedAt: '2025-01-03', status: 'approved' },
  ]);

  // 샘플 임원 데이터
  const [officers] = useState<Officer[]>([
    { id: '1', name: '홍분회장', position: '분회장', phone: '010-1111-2222' },
    { id: '2', name: '김총무', position: '총무', phone: '010-2222-3333' },
  ]);

  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'reports' | 'officers'>('overview');

  const getStatusBadge = (status: string, type: 'fee' | 'report' | 'approval') => {
    const configs: Record<string, Record<string, { bg: string; label: string }>> = {
      fee: {
        paid: { bg: colors.accentGreen, label: '납부' },
        unpaid: { bg: colors.accentRed, label: '미납' },
      },
      report: {
        submitted: { bg: colors.accentGreen, label: '제출' },
        pending: { bg: colors.accentYellow, label: '미제출' },
      },
      approval: {
        pending: { bg: colors.accentYellow, label: '대기' },
        approved: { bg: colors.accentGreen, label: '승인' },
        rejected: { bg: colors.accentRed, label: '반려' },
      },
    };
    const config = configs[type][status];
    return (
      <span style={{ ...styles.badge, backgroundColor: config.bg }}>
        {config.label}
      </span>
    );
  };

  return (
    <div>
      <AdminHeader
        title={division.name}
        subtitle={`분회 코드: ${division.code}`}
        actions={
          <div style={styles.headerActions}>
            <Link to={`/branch/${divisionId}/admin`} style={styles.adminButton} target="_blank">
              분회 관리자
            </Link>
            <Link to={`/branch/${divisionId}`} style={styles.siteButton} target="_blank">
              사이트 보기
            </Link>
          </div>
        }
      />

      <div style={styles.content}>
        {/* 탭 네비게이션 */}
        <div style={styles.tabs}>
          {[
            { key: 'overview', label: '개요' },
            { key: 'members', label: '회원' },
            { key: 'reports', label: '신상신고' },
            { key: 'officers', label: '임원' },
          ].map((tab) => (
            <button
              key={tab.key}
              style={{
                ...styles.tab,
                ...(activeTab === tab.key ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 개요 탭 */}
        {activeTab === 'overview' && (
          <div style={styles.overviewGrid}>
            {/* 통계 카드 */}
            <div style={styles.statsCard}>
              <h3 style={styles.cardTitle}>현황 통계</h3>
              <div style={styles.statsRow}>
                <div style={styles.statItem}>
                  <div style={styles.statValue}>{division.memberCount}</div>
                  <div style={styles.statLabel}>전체 회원</div>
                </div>
                <div style={styles.statItem}>
                  <div style={{ ...styles.statValue, color: colors.accentGreen }}>{division.feeRate}%</div>
                  <div style={styles.statLabel}>납부율</div>
                </div>
                <div style={styles.statItem}>
                  <div style={{ ...styles.statValue, color: colors.primary }}>{division.reportRate}%</div>
                  <div style={styles.statLabel}>신고율</div>
                </div>
              </div>
            </div>

            {/* 연락처 정보 */}
            <div style={styles.contactCard}>
              <h3 style={styles.cardTitle}>연락처 정보</h3>
              <div style={styles.contactInfo}>
                {division.contact.address && (
                  <div style={styles.contactRow}>
                    <span style={styles.contactLabel}>📍 주소</span>
                    <span>{division.contact.address}</span>
                  </div>
                )}
                {division.contact.phone && (
                  <div style={styles.contactRow}>
                    <span style={styles.contactLabel}>📞 전화</span>
                    <span>{division.contact.phone}</span>
                  </div>
                )}
                {division.contact.email && (
                  <div style={styles.contactRow}>
                    <span style={styles.contactLabel}>📧 이메일</span>
                    <span>{division.contact.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 최근 신상신고 */}
            <div style={styles.recentCard}>
              <h3 style={styles.cardTitle}>최근 신상신고</h3>
              <div style={styles.recentList}>
                {annualReports.slice(0, 3).map((report) => (
                  <div key={report.id} style={styles.recentItem}>
                    <span>{report.memberName}</span>
                    <span style={styles.recentDate}>{report.submittedAt}</span>
                    {getStatusBadge(report.status, 'approval')}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 회원 탭 */}
        {activeTab === 'members' && (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>이름</th>
                  <th style={styles.th}>약국명</th>
                  <th style={styles.th}>연회비</th>
                  <th style={styles.th}>신상신고</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} style={styles.tr}>
                    <td style={styles.td}>{member.name}</td>
                    <td style={styles.td}>{member.pharmacyName}</td>
                    <td style={styles.td}>{getStatusBadge(member.feeStatus, 'fee')}</td>
                    <td style={styles.td}>{getStatusBadge(member.reportStatus, 'report')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 신상신고 탭 */}
        {activeTab === 'reports' && (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>회원명</th>
                  <th style={styles.th}>제출일</th>
                  <th style={styles.th}>상태</th>
                  <th style={styles.th}>관리</th>
                </tr>
              </thead>
              <tbody>
                {annualReports.map((report) => (
                  <tr key={report.id} style={styles.tr}>
                    <td style={styles.td}>{report.memberName}</td>
                    <td style={styles.td}>{report.submittedAt}</td>
                    <td style={styles.td}>{getStatusBadge(report.status, 'approval')}</td>
                    <td style={styles.td}>
                      {report.status === 'pending' && (
                        <div style={styles.actionButtons}>
                          <button style={{ ...styles.smallButton, backgroundColor: colors.accentGreen }}>승인</button>
                          <button style={{ ...styles.smallButton, backgroundColor: colors.accentRed }}>반려</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 임원 탭 */}
        {activeTab === 'officers' && (
          <div style={styles.officerGrid}>
            {officers.map((officer) => (
              <div key={officer.id} style={styles.officerCard}>
                <div style={styles.officerAvatar}>{officer.name.charAt(0)}</div>
                <div style={styles.officerInfo}>
                  <div style={styles.officerName}>{officer.name}</div>
                  <div style={styles.officerPosition}>{officer.position}</div>
                  <div style={styles.officerPhone}>{officer.phone}</div>
                </div>
              </div>
            ))}
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
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  adminButton: {
    padding: '10px 16px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    textDecoration: 'none',
  },
  siteButton: {
    padding: '10px 16px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    textDecoration: 'none',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  tab: {
    padding: '12px 20px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '20px',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  statItem: {
    textAlign: 'center',
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
  contactCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  contactRow: {
    display: 'flex',
    gap: '12px',
    fontSize: '14px',
  },
  contactLabel: {
    width: '80px',
    color: colors.neutral500,
  },
  recentCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  recentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    fontSize: '14px',
  },
  recentDate: {
    flex: 1,
    color: colors.neutral500,
    fontSize: '13px',
  },
  badge: {
    padding: '4px 8px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
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
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  smallButton: {
    padding: '6px 12px',
    color: colors.white,
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  officerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  officerCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  officerAvatar: {
    width: '56px',
    height: '56px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 600,
  },
  officerInfo: {},
  officerName: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  officerPosition: {
    fontSize: '13px',
    color: colors.primary,
    marginTop: '2px',
  },
  officerPhone: {
    fontSize: '13px',
    color: colors.neutral500,
    marginTop: '4px',
  },
};
