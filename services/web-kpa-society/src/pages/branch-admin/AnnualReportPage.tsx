/**
 * AnnualReportPage - 신상신고 관리 페이지
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AdminHeader } from '../../components/branch-admin';
import { colors } from '../../styles/theme';

interface AnnualReport {
  id: string;
  memberId: string;
  memberName: string;
  pharmacyName: string;
  year: number;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  reviewNote?: string;
}

export function AnnualReportPage() {
  const { branchId: _branchId } = useParams();
  const [filterYear, setFilterYear] = useState(2025);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [_selectedReport, _setSelectedReport] = useState<AnnualReport | null>(null);

  // 샘플 데이터 (테스트용 최소 데이터)
  const [reports] = useState<AnnualReport[]>([
    {
      id: '1',
      memberId: 'm1',
      memberName: '홍길동',
      pharmacyName: '샘플약국',
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
      year: 2025,
      submittedAt: '2025-01-03 15:20',
      status: 'approved',
      changes: [
        { field: '자택주소', oldValue: '서울시 서초구', newValue: '서울시 송파구' },
      ],
      reviewNote: '확인 완료',
    },
  ]);

  const getStatusBadge = (status: AnnualReport['status']) => {
    const styles: Record<string, React.CSSProperties> = {
      pending: { backgroundColor: colors.accentYellow, color: colors.white },
      approved: { backgroundColor: colors.accentGreen, color: colors.white },
      rejected: { backgroundColor: colors.accentRed, color: colors.white },
      revision_requested: { backgroundColor: colors.primary, color: colors.white },
    };
    const labels: Record<string, string> = {
      pending: '검토대기',
      approved: '승인',
      rejected: '반려',
      revision_requested: '수정요청',
    };
    return <span style={{ ...badgeStyle, ...styles[status] }}>{labels[status]}</span>;
  };

  const pendingCount = reports.filter((r) => r.status === 'pending').length;

  const handleApprove = (reportId: string) => {
    alert(`신상신고 #${reportId} 승인 처리`);
  };

  const handleReject = (reportId: string) => {
    const reason = prompt('반려 사유를 입력하세요:');
    if (reason) {
      alert(`신상신고 #${reportId} 반려 처리: ${reason}`);
    }
  };

  const handleRequestRevision = (reportId: string) => {
    const note = prompt('수정 요청 사항을 입력하세요:');
    if (note) {
      alert(`신상신고 #${reportId} 수정 요청: ${note}`);
    }
  };

  return (
    <div>
      <AdminHeader
        title="신상신고 관리"
        subtitle={`${filterYear}년 신상신고 현황 - 검토 대기 ${pendingCount}건`}
      />

      <div style={pageStyles.content}>
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
              <option value="pending">검토대기</option>
              <option value="approved">승인</option>
              <option value="rejected">반려</option>
              <option value="revision_requested">수정요청</option>
            </select>

            <button style={pageStyles.exportButton}>
              📥 지부 보고용 Export
            </button>
          </div>
        </div>

        {/* 신상신고 목록 */}
        <div style={pageStyles.reportList}>
          {reports
            .filter((r) => r.year === filterYear)
            .filter((r) => filterStatus === 'all' || r.status === filterStatus)
            .map((report) => (
              <div key={report.id} style={pageStyles.reportCard}>
                <div style={pageStyles.reportHeader}>
                  <div style={pageStyles.reportMember}>
                    <div style={pageStyles.memberName}>{report.memberName}</div>
                    <div style={pageStyles.pharmacyName}>{report.pharmacyName}</div>
                  </div>
                  {getStatusBadge(report.status)}
                </div>

                <div style={pageStyles.reportMeta}>
                  <span>📅 제출일: {report.submittedAt}</span>
                </div>

                <div style={pageStyles.changesList}>
                  <div style={pageStyles.changesTitle}>변경 내용:</div>
                  {report.changes.map((change, idx) => (
                    <div key={idx} style={pageStyles.changeItem}>
                      <span style={pageStyles.changeField}>{change.field}</span>
                      <span style={pageStyles.changeArrow}>
                        <span style={pageStyles.oldValue}>{change.oldValue}</span>
                        <span style={pageStyles.arrow}>→</span>
                        <span style={pageStyles.newValue}>{change.newValue}</span>
                      </span>
                    </div>
                  ))}
                </div>

                {report.reviewNote && (
                  <div style={pageStyles.reviewNote}>
                    💬 검토 메모: {report.reviewNote}
                  </div>
                )}

                {report.status === 'pending' && (
                  <div style={pageStyles.reportActions}>
                    <button
                      style={{ ...pageStyles.actionBtn, ...pageStyles.approveBtn }}
                      onClick={() => handleApprove(report.id)}
                    >
                      ✓ 승인
                    </button>
                    <button
                      style={{ ...pageStyles.actionBtn, ...pageStyles.revisionBtn }}
                      onClick={() => handleRequestRevision(report.id)}
                    >
                      📝 수정요청
                    </button>
                    <button
                      style={{ ...pageStyles.actionBtn, ...pageStyles.rejectBtn }}
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
        <div style={pageStyles.summary}>
          <div style={pageStyles.summaryTitle}>{filterYear}년 신상신고 통계</div>
          <div style={pageStyles.summaryGrid}>
            <div style={pageStyles.summaryItem}>
              <div style={pageStyles.summaryValue}>{reports.filter((r) => r.year === filterYear).length}</div>
              <div style={pageStyles.summaryLabel}>전체 제출</div>
            </div>
            <div style={pageStyles.summaryItem}>
              <div style={pageStyles.summaryValue}>{reports.filter((r) => r.year === filterYear && r.status === 'approved').length}</div>
              <div style={pageStyles.summaryLabel}>승인</div>
            </div>
            <div style={pageStyles.summaryItem}>
              <div style={pageStyles.summaryValue}>{reports.filter((r) => r.year === filterYear && r.status === 'pending').length}</div>
              <div style={pageStyles.summaryLabel}>검토대기</div>
            </div>
            <div style={pageStyles.summaryItem}>
              <div style={pageStyles.summaryValue}>245</div>
              <div style={pageStyles.summaryLabel}>전체 회원</div>
            </div>
          </div>
        </div>
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
  exportButton: {
    padding: '10px 16px',
    backgroundColor: colors.accentGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
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
  revisionBtn: {
    backgroundColor: colors.primary,
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
    gridTemplateColumns: 'repeat(4, 1fr)',
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
