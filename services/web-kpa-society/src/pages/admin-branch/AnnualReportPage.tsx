/**
 * AnnualReportPage - 지부 신상신고 관리
 */

import { useState } from 'react';
import { toast } from '@o4o/error-handling';
import { AdminHeader } from '../../components/admin';
import { colors } from '../../styles/theme';

interface AnnualReport {
  id: string;
  memberId: string;
  memberName: string;
  pharmacyName: string;
  division: string;
  divisionId: string;
  year: number;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  changes: { field: string; oldValue: string; newValue: string }[];
  reviewNote?: string;
}

export function AnnualReportPage() {
  const [filterYear, setFilterYear] = useState(2025);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDivision, setFilterDivision] = useState<string>('all');

  // 샘플 데이터
  const [reports] = useState<AnnualReport[]>([
    {
      id: '1',
      memberId: 'm1',
      memberName: '홍길동',
      pharmacyName: '샘플약국',
      division: '샘플분회',
      divisionId: 'div-1',
      year: 2025,
      submittedAt: '2025-01-04 10:30',
      status: 'pending',
      changes: [
        { field: '약국주소', oldValue: '서울시 강남구 역삼동 123', newValue: '서울시 강남구 삼성동 456' },
        { field: '전화번호', oldValue: '02-1234-5678', newValue: '02-9876-5432' },
      ],
    },
    {
      id: '2',
      memberId: 'm2',
      memberName: '김테스트',
      pharmacyName: '테스트약국',
      division: '샘플분회',
      divisionId: 'div-1',
      year: 2025,
      submittedAt: '2025-01-03 15:20',
      status: 'approved',
      changes: [
        { field: '자택주소', oldValue: '서울시 서초구', newValue: '서울시 송파구' },
      ],
      reviewNote: '확인 완료',
    },
    {
      id: '3',
      memberId: 'm3',
      memberName: '박신입',
      pharmacyName: '데모약국',
      division: '테스트분회',
      divisionId: 'div-2',
      year: 2025,
      submittedAt: '2025-01-02 09:15',
      status: 'pending',
      changes: [
        { field: '근무약국', oldValue: '이전약국', newValue: '데모약국' },
      ],
    },
  ]);

  const divisions = [
    { id: 'all', name: '전체 분회' },
    { id: 'div-1', name: '샘플분회' },
    { id: 'div-2', name: '테스트분회' },
  ];

  const filteredReports = reports.filter((r) => {
    const matchesYear = r.year === filterYear;
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesDivision = filterDivision === 'all' || r.divisionId === filterDivision;
    return matchesYear && matchesStatus && matchesDivision;
  });

  const pendingCount = reports.filter((r) => r.status === 'pending').length;

  const getStatusBadge = (status: AnnualReport['status']) => {
    const config: Record<string, { bg: string; label: string }> = {
      pending: { bg: colors.accentYellow, label: '검토대기' },
      approved: { bg: colors.accentGreen, label: '승인' },
      rejected: { bg: colors.accentRed, label: '반려' },
      revision_requested: { bg: colors.primary, label: '수정요청' },
    };
    const { bg, label } = config[status];
    return <span style={{ ...styles.badge, backgroundColor: bg }}>{label}</span>;
  };

  const handleApprove = (reportId: string) => {
    toast.success(`신상신고 #${reportId} 승인 처리`);
  };

  const handleReject = (reportId: string) => {
    const reason = prompt('반려 사유를 입력하세요:');
    if (reason) {
      toast.success(`신상신고 #${reportId} 반려 처리: ${reason}`);
    }
  };

  return (
    <div>
      <AdminHeader
        title="신상신고 관리"
        subtitle={`${filterYear}년 신상신고 현황 - 검토 대기 ${pendingCount}건`}
        actions={
          <button style={styles.exportButton}>
            📥 지부 보고용 Export
          </button>
        }
      />

      <div style={styles.content}>
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
                <option key={div.id} value={div.id}>{div.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.select}
            >
              <option value="all">전체 상태</option>
              <option value="pending">검토대기</option>
              <option value="approved">승인</option>
              <option value="rejected">반려</option>
            </select>
          </div>
        </div>

        {/* 신상신고 목록 */}
        <div style={styles.reportList}>
          {filteredReports.map((report) => (
            <div key={report.id} style={styles.reportCard}>
              <div style={styles.reportHeader}>
                <div style={styles.reportMember}>
                  <div style={styles.memberName}>{report.memberName}</div>
                  <div style={styles.pharmacyName}>{report.pharmacyName}</div>
                  <div style={styles.divisionName}>{report.division}</div>
                </div>
                {getStatusBadge(report.status)}
              </div>

              <div style={styles.reportMeta}>
                <span>📅 제출일: {report.submittedAt}</span>
              </div>

              <div style={styles.changesList}>
                <div style={styles.changesTitle}>변경 내용:</div>
                {report.changes.map((change, idx) => (
                  <div key={idx} style={styles.changeItem}>
                    <span style={styles.changeField}>{change.field}</span>
                    <span style={styles.changeArrow}>
                      <span style={styles.oldValue}>{change.oldValue}</span>
                      <span style={styles.arrow}>→</span>
                      <span style={styles.newValue}>{change.newValue}</span>
                    </span>
                  </div>
                ))}
              </div>

              {report.reviewNote && (
                <div style={styles.reviewNote}>
                  💬 검토 메모: {report.reviewNote}
                </div>
              )}

              {report.status === 'pending' && (
                <div style={styles.reportActions}>
                  <button
                    style={{ ...styles.actionBtn, ...styles.approveBtn }}
                    onClick={() => handleApprove(report.id)}
                  >
                    ✓ 승인
                  </button>
                  <button
                    style={{ ...styles.actionBtn, ...styles.rejectBtn }}
                    onClick={() => handleReject(report.id)}
                  >
                    ✕ 반려
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 통계 요약 */}
        <div style={styles.summary}>
          <div style={styles.summaryTitle}>{filterYear}년 신상신고 통계</div>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryItem}>
              <div style={styles.summaryValue}>{reports.filter((r) => r.year === filterYear).length}</div>
              <div style={styles.summaryLabel}>전체 제출</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryValue}>{reports.filter((r) => r.year === filterYear && r.status === 'approved').length}</div>
              <div style={styles.summaryLabel}>승인</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryValue}>{reports.filter((r) => r.year === filterYear && r.status === 'pending').length}</div>
              <div style={styles.summaryLabel}>검토대기</div>
            </div>
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
  exportButton: {
    padding: '10px 16px',
    backgroundColor: colors.accentGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
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
  reportList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  reportMember: {},
  memberName: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  pharmacyName: {
    fontSize: '13px',
    color: colors.neutral500,
    marginTop: '2px',
  },
  divisionName: {
    fontSize: '12px',
    color: colors.primary,
    marginTop: '4px',
  },
  badge: {
    padding: '4px 10px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  reportMeta: {
    fontSize: '13px',
    color: colors.neutral600,
    marginBottom: '16px',
  },
  changesList: {
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
  },
  changesTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral700,
    marginBottom: '10px',
  },
  changeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  changeField: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral800,
    minWidth: '80px',
  },
  changeArrow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
  },
  oldValue: {
    color: colors.neutral500,
    textDecoration: 'line-through',
  },
  arrow: {
    color: colors.neutral400,
  },
  newValue: {
    color: colors.primary,
    fontWeight: 500,
  },
  reviewNote: {
    fontSize: '13px',
    color: colors.neutral600,
    padding: '12px',
    backgroundColor: colors.neutral100,
    borderRadius: '6px',
    marginBottom: '12px',
  },
  reportActions: {
    display: 'flex',
    gap: '10px',
    paddingTop: '12px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  actionBtn: {
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
  },
  approveBtn: {
    backgroundColor: colors.accentGreen,
    color: colors.white,
  },
  rejectBtn: {
    backgroundColor: colors.neutral200,
    color: colors.accentRed,
  },
  summary: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    marginTop: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  summaryTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '16px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  summaryItem: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  summaryValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: '13px',
    color: colors.neutral600,
    marginTop: '4px',
  },
};
