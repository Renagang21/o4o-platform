/**
 * MyQualificationsPage — 내 자격 관리
 * WO-O4O-QUALIFICATION-SYSTEM-V1 + WO-O4O-INSTRUCTOR-APPLICATION-V1
 * WO-LMS-CREATOR-QUALIFICATION-FLOW-REFORM-V1: 단일 자격(LMS 제작자)으로 통합
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyPageNavigation } from '@o4o/account-ui';
import { KPA_MYPAGE_NAV_ITEMS } from './navItems';
import {
  qualificationApi,
  getQualificationLabel,
  type MemberQualification,
  type QualificationRequest,
} from '../../api/qualification';
import { colors } from '../../styles/theme';

interface LmsCreatorFormData {
  bio: string;
  experience: string;
  organization: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '심사 중',
  approved: '승인됨',
  rejected: '반려됨',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
};

// ─── Component ───────────────────────────────────────────────

export function MyQualificationsPage() {
  const navigate = useNavigate();
  const [qualifications, setQualifications] = useState<MemberQualification[]>([]);
  const [requests, setRequests] = useState<QualificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyForm, setShowApplyForm] = useState(false);

  const [form, setForm] = useState<LmsCreatorFormData>({ bio: '', experience: '', organization: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [qualRes, reqRes] = await Promise.all([
        qualificationApi.getMyQualifications(),
        qualificationApi.getMyRequests(),
      ]);
      if (qualRes.data.success) setQualifications(qualRes.data.data);
      if (reqRes.data.success) setRequests(reqRes.data.data);
    } catch {
      setError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const lmsCreatorQual = qualifications.find(q => q.qualification_type === 'lms_creator');
  const alreadyApplied = lmsCreatorQual?.status === 'pending' || lmsCreatorQual?.status === 'approved';

  const handleApply = async () => {
    setError(null);
    if (!form.bio.trim()) {
      setError('소개를 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await qualificationApi.apply({
        qualificationType: 'lms_creator',
        data: {
          bio: form.bio.trim(),
          experience: form.experience.trim() || undefined,
          organization: form.organization.trim() || undefined,
        },
      });
      if (res.data.success) {
        setSuccess('자격 신청이 완료되었습니다. 검토 후 결과를 알려드립니다.');
        setShowApplyForm(false);
        setForm({ bio: '', experience: '', organization: '' });
        await loadData();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || '신청에 실패했습니다.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={styles.loading}>불러오는 중...</div>;

  return (
    <div style={styles.container}>
      <MyPageNavigation items={KPA_MYPAGE_NAV_ITEMS} />
      <h1 style={styles.title}>내 자격</h1>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {success && <div style={styles.successBanner}>{success}</div>}

      {/* 보유 자격 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>보유 자격</h2>
        {qualifications.length === 0 ? (
          <p style={styles.empty}>보유한 자격이 없습니다.</p>
        ) : (
          <div style={styles.qualList}>
            {qualifications.map(q => (
              <div key={q.id} style={styles.qualCard}>
                <span style={styles.qualName}>{getQualificationLabel(q.qualification_type)}</span>
                <span style={{ ...styles.statusBadge, backgroundColor: STATUS_COLORS[q.status] }}>
                  {STATUS_LABELS[q.status]}
                </span>
                {q.approved_at && (
                  <span style={styles.qualDate}>
                    승인일: {new Date(q.approved_at).toLocaleDateString('ko-KR')}
                  </span>
                )}
                {q.qualification_type === 'lms_creator' && q.status === 'approved' && (
                  <button
                    style={styles.dashboardBtn}
                    onClick={() => navigate('/instructor')}
                  >
                    강사 대시보드 →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 신청 버튼 or 이미 신청됨 안내 */}
      {!showApplyForm && !alreadyApplied && (
        <button style={styles.applyBtn} onClick={() => { setShowApplyForm(true); setError(null); setSuccess(null); }}>
          + 자격 신청
        </button>
      )}
      {!showApplyForm && alreadyApplied && (
        <div style={styles.alreadyApplied}>
          LMS 제작자 자격이 이미 신청되었거나 승인되어 있습니다.
        </div>
      )}

      {/* 신청 폼 */}
      {showApplyForm && (
        <section style={styles.formCard}>
          <h2 style={styles.sectionTitle}>자격 신청</h2>

          {/* 자격 유형 (고정) */}
          <div style={styles.formGroup}>
            <label style={styles.label}>자격 유형</label>
            <div style={styles.fixedType}>LMS 제작자</div>
          </div>

          {/* 자격 설명 */}
          <div style={styles.descBox}>
            <p style={styles.descText}>이 자격을 승인받으면 LMS에서 다음 작업이 가능합니다:</p>
            <ul style={styles.descList}>
              <li>강의 등록</li>
              <li>콘텐츠 등록</li>
              <li>설문/퀴즈 생성</li>
            </ul>
          </div>

          {/* 승인 소요 안내 */}
          <div style={styles.noticeBox}>
            강사 신청 후 운영자 승인까지 1~2일 소요될 수 있습니다.
          </div>

          <LmsCreatorForm form={form} onChange={setForm} />

          <div style={styles.formActions}>
            <button style={styles.cancelBtn} onClick={() => setShowApplyForm(false)}>
              취소
            </button>
            <button
              style={{ ...styles.submitBtn, ...(submitting ? styles.disabledBtn : {}) }}
              onClick={handleApply}
              disabled={submitting}
            >
              {submitting ? '신청 중...' : '신청하기'}
            </button>
          </div>
        </section>
      )}

      {/* 신청 내역 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>신청 내역</h2>
        {requests.length === 0 ? (
          <p style={styles.empty}>신청 내역이 없습니다.</p>
        ) : (
          <div style={styles.requestList}>
            {requests.map(r => (
              <div key={r.id} style={styles.requestItem}>
                <div style={styles.requestHeader}>
                  <span style={styles.qualName}>{getQualificationLabel(r.qualification_type)}</span>
                  <span style={{ ...styles.statusBadge, backgroundColor: STATUS_COLORS[r.status] }}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </div>
                <div style={styles.requestMeta}>
                  신청일: {new Date(r.created_at).toLocaleDateString('ko-KR')}
                  {r.reviewed_at && ` · 검토일: ${new Date(r.reviewed_at).toLocaleDateString('ko-KR')}`}
                </div>
                {r.review_note && (
                  <div style={styles.reviewNote}>검토 의견: {r.review_note}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── LMS 제작자 신청 폼 ────────────────────────────────────────

function LmsCreatorForm({ form, onChange }: { form: LmsCreatorFormData; onChange: (f: LmsCreatorFormData) => void }) {
  const set = (key: keyof LmsCreatorFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...form, [key]: e.target.value });

  return (
    <>
      <div style={styles.formGroup}>
        <label style={styles.label}>소개 *</label>
        <textarea value={form.bio} onChange={set('bio')} placeholder="제작자로서의 전문성과 활동 배경을 소개해 주세요" style={styles.textarea} rows={4} />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>경력</label>
        <textarea value={form.experience} onChange={set('experience')} placeholder="관련 경력을 입력해 주세요 (선택)" style={styles.textarea} rows={3} />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>소속 기관</label>
        <input value={form.organization} onChange={set('organization')} placeholder="소속 기관명 (선택)" style={styles.input} />
      </div>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px 32px', maxWidth: '800px', margin: '0 auto' },
  title: { fontSize: '24px', fontWeight: 700, color: colors.neutral900, marginBottom: '24px' },
  loading: { padding: '40px', textAlign: 'center', color: colors.neutral500 },
  errorBanner: { padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', marginBottom: '16px', fontSize: '14px' },
  successBanner: { padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '14px' },
  section: { backgroundColor: colors.white, padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' },
  sectionTitle: { fontSize: '16px', fontWeight: 600, color: colors.neutral900, margin: '0 0 16px 0' },
  empty: { color: colors.neutral400, fontSize: '14px', margin: 0 },
  qualList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  qualCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: colors.neutral50, borderRadius: '8px' },
  qualName: { fontSize: '15px', fontWeight: 600, color: colors.neutral800, flex: 1 },
  qualDate: { fontSize: '12px', color: colors.neutral400 },
  statusBadge: { padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, color: colors.white },
  applyBtn: { width: '100%', padding: '14px', fontSize: '15px', fontWeight: 600, color: colors.white, backgroundColor: colors.primary, border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' },
  alreadyApplied: { padding: '14px 16px', backgroundColor: colors.neutral50, border: `1px solid ${colors.neutral200}`, borderRadius: '8px', color: colors.neutral500, fontSize: '14px', textAlign: 'center', marginBottom: '20px' },
  dashboardBtn: { marginLeft: 'auto', padding: '5px 14px', fontSize: '13px', fontWeight: 500, color: colors.white, backgroundColor: '#10b981', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  formCard: { backgroundColor: colors.white, padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '14px', fontWeight: 500, color: colors.neutral700, marginBottom: '6px' },
  fixedType: { padding: '10px 12px', fontSize: '14px', backgroundColor: colors.neutral50, border: `1px solid ${colors.neutral200}`, borderRadius: '6px', color: colors.neutral700, fontWeight: 500 },
  descBox: { padding: '14px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', marginBottom: '20px' },
  descText: { fontSize: '14px', color: '#1d4ed8', margin: '0 0 8px 0', fontWeight: 500 },
  descList: { margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#1e40af', lineHeight: 1.8 },
  input: { width: '100%', padding: '10px 12px', fontSize: '14px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', boxSizing: 'border-box' as const },
  textarea: { width: '100%', padding: '10px 12px', fontSize: '14px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', resize: 'vertical' as const, boxSizing: 'border-box' as const },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: `1px solid ${colors.neutral100}` },
  cancelBtn: { padding: '10px 20px', fontSize: '14px', color: colors.neutral600, backgroundColor: colors.neutral100, border: 'none', borderRadius: '6px', cursor: 'pointer' },
  submitBtn: { padding: '10px 24px', fontSize: '14px', fontWeight: 600, color: colors.white, backgroundColor: colors.primary, border: 'none', borderRadius: '6px', cursor: 'pointer' },
  disabledBtn: { backgroundColor: colors.neutral400, cursor: 'not-allowed' },
  requestList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  requestItem: { padding: '16px', backgroundColor: colors.neutral50, borderRadius: '8px' },
  requestHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' },
  requestMeta: { fontSize: '12px', color: colors.neutral400 },
  reviewNote: { marginTop: '8px', fontSize: '13px', color: colors.neutral600, padding: '8px', backgroundColor: colors.white, borderRadius: '4px' },
  noticeBox: { padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '13px', color: '#15803d', marginBottom: '20px' },
};

export default MyQualificationsPage;
