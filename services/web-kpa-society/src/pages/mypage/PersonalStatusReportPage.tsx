/**
 * PersonalStatusReportPage - 신상신고 페이지
 *
 * 약사 신상신고 현황 조회 및 신규 신고 제출
 * - 해당연도 신상신고 현황 표시
 * - 미제출 시 신규 신고 폼 제공
 * - 제출 완료 시 확인증 발급 링크
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { PageHeader, Card } from '../../components/common';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';

// Mock 데이터 - 신상신고 현황
interface StatusReportRecord {
  id: string;
  year: number;
  submittedAt: string | null;
  status: 'pending' | 'submitted' | 'approved';
  workplaceType: string;
  workplaceName: string;
  workplaceAddress: string;
}

const currentYear = new Date().getFullYear();

// Mock: 이전 신고 기록
const mockPreviousReports: StatusReportRecord[] = [
  {
    id: 'sr-2024',
    year: 2024,
    submittedAt: '2024-03-15',
    status: 'approved',
    workplaceType: '개국약국',
    workplaceName: '행복약국',
    workplaceAddress: '서울시 강남구 테헤란로 123',
  },
  {
    id: 'sr-2023',
    year: 2023,
    submittedAt: '2023-02-20',
    status: 'approved',
    workplaceType: '개국약국',
    workplaceName: '행복약국',
    workplaceAddress: '서울시 강남구 테헤란로 123',
  },
];

// Mock: 현재연도 신고 상태
const mockCurrentYearReport: StatusReportRecord | null = null; // 미제출 상태

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '검토중', color: colors.accentYellow },
  submitted: { label: '제출완료', color: colors.primary },
  approved: { label: '승인완료', color: colors.accentGreen },
};

const workplaceTypes = [
  { value: 'pharmacy', label: '개국약국' },
  { value: 'hospital', label: '병원약국' },
  { value: 'company', label: '제약회사' },
  { value: 'distributor', label: '도매상' },
  { value: 'government', label: '공무원' },
  { value: 'education', label: '교육기관' },
  { value: 'other', label: '기타' },
  { value: 'unemployed', label: '미취업' },
];

export function PersonalStatusReportPage() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    workplaceType: '',
    workplaceName: '',
    workplaceAddress: '',
    workplacePhone: '',
    position: '',
    startDate: '',
    remarks: '',
  });

  const currentYearReport = mockCurrentYearReport;
  const previousReports = mockPreviousReports;
  const needsSubmission = !currentYearReport;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.workplaceType) {
      toast.error('근무형태를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);

    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast.success('신상신고가 제출되었습니다.');
    setIsSubmitting(false);
    setShowForm(false);
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <PageHeader
          title="신상신고"
          breadcrumb={[
            { label: '홈', href: '/' },
            { label: '마이페이지', href: `/mypage` },
            { label: '신상신고' },
          ]}
        />
        <Card padding="large">
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🔒</span>
            <h3 style={styles.emptyTitle}>로그인이 필요합니다</h3>
            <p style={styles.emptyDescription}>
              신상신고 현황을 확인하려면 로그인해주세요.
            </p>
            <Link to="/login" style={styles.primaryButton}>
              로그인하기
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="신상신고"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '마이페이지', href: `/mypage` },
          { label: '신상신고' },
        ]}
      />

      {/* 현재연도 신상신고 현황 */}
      <Card padding="large" style={{ marginBottom: '24px' }}>
        <h3 style={styles.sectionTitle}>{currentYear}년 신상신고 현황</h3>

        {needsSubmission ? (
          <div style={styles.alertBox}>
            <div style={styles.alertIcon}>⚠️</div>
            <div style={styles.alertContent}>
              <p style={styles.alertTitle}>{currentYear}년 신상신고가 완료되지 않았습니다.</p>
              <p style={styles.alertDescription}>
                대한약사회 정관에 따라 매년 신상신고를 제출해야 합니다.
                아래 버튼을 클릭하여 신상신고를 완료해주세요.
              </p>
              {!showForm && (
                <button
                  style={styles.primaryButton}
                  onClick={() => setShowForm(true)}
                >
                  신상신고 하기
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✅</div>
            <div style={styles.successContent}>
              <p style={styles.successTitle}>{currentYear}년 신상신고가 완료되었습니다.</p>
              <div style={styles.reportSummary}>
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>제출일</span>
                  <span style={styles.summaryValue}>{currentYearReport?.submittedAt}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>상태</span>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: statusLabels[currentYearReport?.status || 'submitted'].color,
                  }}>
                    {statusLabels[currentYearReport?.status || 'submitted'].label}
                  </span>
                </div>
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>근무처</span>
                  <span style={styles.summaryValue}>{currentYearReport?.workplaceName}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 신상신고 입력 폼 */}
        {showForm && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <h4 style={styles.formTitle}>신상신고 정보 입력</h4>

            <div style={styles.formGrid}>
              <div style={styles.formField}>
                <label style={styles.label}>근무형태 *</label>
                <select
                  name="workplaceType"
                  value={formData.workplaceType}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                >
                  <option value="">선택해주세요</option>
                  {workplaceTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formField}>
                <label style={styles.label}>근무처명</label>
                <input
                  type="text"
                  name="workplaceName"
                  value={formData.workplaceName}
                  onChange={handleInputChange}
                  placeholder="근무처 이름을 입력하세요"
                  style={styles.input}
                />
              </div>

              <div style={styles.formFieldFull}>
                <label style={styles.label}>근무처 주소</label>
                <input
                  type="text"
                  name="workplaceAddress"
                  value={formData.workplaceAddress}
                  onChange={handleInputChange}
                  placeholder="근무처 주소를 입력하세요"
                  style={styles.input}
                />
              </div>

              <div style={styles.formField}>
                <label style={styles.label}>근무처 전화번호</label>
                <input
                  type="tel"
                  name="workplacePhone"
                  value={formData.workplacePhone}
                  onChange={handleInputChange}
                  placeholder="02-1234-5678"
                  style={styles.input}
                />
              </div>

              <div style={styles.formField}>
                <label style={styles.label}>직위</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="예: 관리약사, 대표약사"
                  style={styles.input}
                />
              </div>

              <div style={styles.formField}>
                <label style={styles.label}>근무시작일</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.formFieldFull}>
                <label style={styles.label}>비고</label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  placeholder="추가 사항이 있으면 입력하세요"
                  style={styles.textarea}
                  rows={3}
                />
              </div>
            </div>

            <div style={styles.formActions}>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setShowForm(false)}
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="submit"
                style={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? '제출 중...' : '신상신고 제출'}
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* 이전 신고 이력 */}
      <Card padding="large">
        <h3 style={styles.sectionTitle}>이전 신고 이력</h3>

        {previousReports.length > 0 ? (
          <div style={styles.historyList}>
            {previousReports.map(report => (
              <div key={report.id} style={styles.historyItem}>
                <div style={styles.historyYear}>{report.year}년</div>
                <div style={styles.historyDetails}>
                  <div style={styles.historyRow}>
                    <span style={styles.historyLabel}>근무처</span>
                    <span style={styles.historyValue}>
                      {report.workplaceType} - {report.workplaceName}
                    </span>
                  </div>
                  <div style={styles.historyRow}>
                    <span style={styles.historyLabel}>주소</span>
                    <span style={styles.historyValue}>{report.workplaceAddress}</span>
                  </div>
                  <div style={styles.historyRow}>
                    <span style={styles.historyLabel}>제출일</span>
                    <span style={styles.historyValue}>{report.submittedAt}</span>
                  </div>
                </div>
                <div style={{
                  ...styles.statusBadge,
                  backgroundColor: statusLabels[report.status].color,
                }}>
                  {statusLabels[report.status].label}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.noHistory}>이전 신고 이력이 없습니다.</p>
        )}
      </Card>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '20px',
  },

  // Alert Box (미제출)
  alertBox: {
    display: 'flex',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
    border: '1px solid #f59e0b',
  },
  alertIcon: {
    fontSize: '32px',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#92400e',
    marginBottom: '8px',
  },
  alertDescription: {
    fontSize: '0.875rem',
    color: '#a16207',
    marginBottom: '16px',
    lineHeight: 1.5,
  },

  // Success Box (제출완료)
  successBox: {
    display: 'flex',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#ecfdf5',
    borderRadius: '12px',
    border: '1px solid #10b981',
  },
  successIcon: {
    fontSize: '32px',
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#065f46',
    marginBottom: '12px',
  },
  reportSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  summaryRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    width: '60px',
  },
  summaryValue: {
    fontSize: '0.875rem',
    color: colors.neutral900,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#fff',
  },

  // Form
  form: {
    marginTop: '24px',
    padding: '24px',
    backgroundColor: colors.neutral50,
    borderRadius: '12px',
    border: `1px solid ${colors.gray200}`,
  },
  formTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '20px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
  },
  formFieldFull: {
    display: 'flex',
    flexDirection: 'column',
    gridColumn: '1 / -1',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral700,
    marginBottom: '6px',
  },
  input: {
    padding: '12px',
    fontSize: '0.875rem',
    border: `1px solid ${colors.gray300}`,
    borderRadius: '8px',
    outline: 'none',
  },
  select: {
    padding: '12px',
    fontSize: '0.875rem',
    border: `1px solid ${colors.gray300}`,
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: '#fff',
  },
  textarea: {
    padding: '12px',
    fontSize: '0.875rem',
    border: `1px solid ${colors.gray300}`,
    borderRadius: '8px',
    outline: 'none',
    resize: 'vertical',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },

  // Buttons
  primaryButton: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  secondaryButton: {
    padding: '12px 24px',
    backgroundColor: colors.gray100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  submitButton: {
    padding: '12px 24px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },

  // History
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    border: `1px solid ${colors.gray200}`,
  },
  historyYear: {
    fontSize: '1rem',
    fontWeight: 700,
    color: colors.primary,
    minWidth: '60px',
  },
  historyDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  historyRow: {
    display: 'flex',
    gap: '8px',
  },
  historyLabel: {
    fontSize: '0.75rem',
    color: colors.neutral500,
    minWidth: '50px',
  },
  historyValue: {
    fontSize: '0.875rem',
    color: colors.neutral700,
  },
  noHistory: {
    textAlign: 'center',
    color: colors.neutral500,
    padding: '40px 20px',
  },

  // Empty state
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '8px',
  },
  emptyDescription: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    marginBottom: '24px',
  },
};

export default PersonalStatusReportPage;
