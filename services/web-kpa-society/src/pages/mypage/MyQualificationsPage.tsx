/**
 * MyQualificationsPage — 내 자격 관리
 * WO-O4O-QUALIFICATION-SYSTEM-V1 + WO-O4O-INSTRUCTOR-APPLICATION-V1
 */

import { useState, useEffect } from 'react';
import {
  qualificationApi,
  type MemberQualification,
  type QualificationRequest,
  type QualificationType,
  QUALIFICATION_TYPE_LABELS,
} from '../../api/qualification';
import { colors } from '../../styles/theme';

// ─── 강사 신청 폼 상태 ───────────────────────────────────────

interface InstructorFormData {
  displayName: string;
  organization: string;
  jobTitle: string;
  expertiseInput: string;       // 입력 중인 태그
  expertise: string[];          // 완성된 태그 배열
  bio: string;
  experience: string;
  lectureTopicsInput: string;   // 입력 중인 태그
  lectureTopics: string[];
  lecturePlanSummary: string;
  portfolioUrl: string;
}

const emptyInstructorForm = (): InstructorFormData => ({
  displayName: '',
  organization: '',
  jobTitle: '',
  expertiseInput: '',
  expertise: [],
  bio: '',
  experience: '',
  lectureTopicsInput: '',
  lectureTopics: [],
  lecturePlanSummary: '',
  portfolioUrl: '',
});

// 일반 자격용 간단 폼
interface SimpleFormData {
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
  const [qualifications, setQualifications] = useState<MemberQualification[]>([]);
  const [requests, setRequests] = useState<QualificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [selectedType, setSelectedType] = useState<QualificationType>('instructor');

  // 강사 폼
  const [instructorForm, setInstructorForm] = useState<InstructorFormData>(emptyInstructorForm());
  // 일반 자격 폼
  const [simpleForm, setSimpleForm] = useState<SimpleFormData>({ bio: '', experience: '', organization: '' });

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

  // 전문 분야 태그 추가
  const addExpertiseTag = () => {
    const tag = instructorForm.expertiseInput.trim();
    if (!tag || instructorForm.expertise.includes(tag)) return;
    setInstructorForm(p => ({ ...p, expertise: [...p.expertise, tag], expertiseInput: '' }));
  };
  const removeExpertiseTag = (tag: string) =>
    setInstructorForm(p => ({ ...p, expertise: p.expertise.filter(e => e !== tag) }));

  // 강의 주제 태그 추가
  const addLectureTopicTag = () => {
    const tag = instructorForm.lectureTopicsInput.trim();
    if (!tag || instructorForm.lectureTopics.includes(tag)) return;
    setInstructorForm(p => ({ ...p, lectureTopics: [...p.lectureTopics, tag], lectureTopicsInput: '' }));
  };
  const removeLectureTopicTag = (tag: string) =>
    setInstructorForm(p => ({ ...p, lectureTopics: p.lectureTopics.filter(t => t !== tag) }));

  const handleApply = async () => {
    setError(null);

    let data: Record<string, any>;

    if (selectedType === 'instructor') {
      // 필수 필드 클라이언트 검증
      if (!instructorForm.displayName.trim()) {
        setError('이름(displayName)을 입력해 주세요.');
        return;
      }
      if (instructorForm.expertise.length === 0) {
        setError('전문 분야를 1개 이상 입력해 주세요.');
        return;
      }
      if (!instructorForm.lecturePlanSummary.trim()) {
        setError('강의 계획 요약을 입력해 주세요.');
        return;
      }
      data = {
        displayName: instructorForm.displayName.trim(),
        organization: instructorForm.organization.trim() || undefined,
        jobTitle: instructorForm.jobTitle.trim() || undefined,
        expertise: instructorForm.expertise,
        bio: instructorForm.bio.trim() || undefined,
        experience: instructorForm.experience.trim() || undefined,
        lectureTopics: instructorForm.lectureTopics,
        lecturePlanSummary: instructorForm.lecturePlanSummary.trim(),
        portfolioUrl: instructorForm.portfolioUrl.trim() || undefined,
      };
    } else {
      if (!simpleForm.bio.trim()) {
        setError('소개를 입력해 주세요.');
        return;
      }
      data = {
        bio: simpleForm.bio.trim(),
        experience: simpleForm.experience.trim() || undefined,
        organization: simpleForm.organization.trim() || undefined,
      };
    }

    setSubmitting(true);
    try {
      const res = await qualificationApi.apply({ qualificationType: selectedType, data });
      if (res.data.success) {
        setSuccess('자격 신청이 완료되었습니다. 검토 후 결과를 알려드립니다.');
        setShowApplyForm(false);
        setInstructorForm(emptyInstructorForm());
        setSimpleForm({ bio: '', experience: '', organization: '' });
        await loadData();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || '신청에 실패했습니다.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingOrApprovedTypes = new Set(
    qualifications
      .filter(q => q.status === 'pending' || q.status === 'approved')
      .map(q => q.qualification_type),
  );

  if (loading) return <div style={styles.loading}>불러오는 중...</div>;

  return (
    <div style={styles.container}>
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
                <span style={styles.qualName}>{QUALIFICATION_TYPE_LABELS[q.qualification_type]}</span>
                <span style={{ ...styles.statusBadge, backgroundColor: STATUS_COLORS[q.status] }}>
                  {STATUS_LABELS[q.status]}
                </span>
                {q.approved_at && (
                  <span style={styles.qualDate}>
                    승인일: {new Date(q.approved_at).toLocaleDateString('ko-KR')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 신청 버튼 */}
      {!showApplyForm && (
        <button style={styles.applyBtn} onClick={() => { setShowApplyForm(true); setError(null); setSuccess(null); }}>
          + 자격 신청
        </button>
      )}

      {/* 신청 폼 */}
      {showApplyForm && (
        <section style={styles.formCard}>
          <h2 style={styles.sectionTitle}>자격 신청</h2>

          {/* 자격 유형 선택 */}
          <div style={styles.formGroup}>
            <label style={styles.label}>자격 유형 *</label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as QualificationType)}
              style={styles.select}
            >
              {(Object.entries(QUALIFICATION_TYPE_LABELS) as [QualificationType, string][]).map(([k, v]) => (
                <option key={k} value={k} disabled={pendingOrApprovedTypes.has(k)}>
                  {v}{pendingOrApprovedTypes.has(k) ? ' (신청됨)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 강사 전용 확장 폼 */}
          {selectedType === 'instructor' ? (
            <InstructorForm
              form={instructorForm}
              onChange={setInstructorForm}
              onAddExpertise={addExpertiseTag}
              onRemoveExpertise={removeExpertiseTag}
              onAddLectureTopic={addLectureTopicTag}
              onRemoveLectureTopic={removeLectureTopicTag}
            />
          ) : (
            <SimpleQualificationForm form={simpleForm} onChange={setSimpleForm} />
          )}

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
                  <span style={styles.qualName}>{QUALIFICATION_TYPE_LABELS[r.qualification_type]}</span>
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

// ─── 강사 신청 확장 폼 ────────────────────────────────────────

interface InstructorFormProps {
  form: InstructorFormData;
  onChange: (f: InstructorFormData) => void;
  onAddExpertise: () => void;
  onRemoveExpertise: (tag: string) => void;
  onAddLectureTopic: () => void;
  onRemoveLectureTopic: (tag: string) => void;
}

function InstructorForm({ form, onChange, onAddExpertise, onRemoveExpertise, onAddLectureTopic, onRemoveLectureTopic }: InstructorFormProps) {
  const set = (key: keyof InstructorFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...form, [key]: e.target.value });

  return (
    <>
      {/* 기본 정보 */}
      <div style={styles.fieldGroup}>
        <h3 style={styles.fieldGroupTitle}>기본 정보</h3>

        <div style={styles.formGroup}>
          <label style={styles.label}>이름 (표시명) *</label>
          <input value={form.displayName} onChange={set('displayName')} placeholder="강사로 표시될 이름" style={styles.input} />
        </div>

        <div style={styles.formRow}>
          <div style={{ ...styles.formGroup, flex: 1 }}>
            <label style={styles.label}>소속</label>
            <input value={form.organization} onChange={set('organization')} placeholder="약국 / 기업 / 학교 등" style={styles.input} />
          </div>
          <div style={{ ...styles.formGroup, flex: 1 }}>
            <label style={styles.label}>직함</label>
            <input value={form.jobTitle} onChange={set('jobTitle')} placeholder="약사 / 교수 / 마케터 등" style={styles.input} />
          </div>
        </div>
      </div>

      {/* 전문성 */}
      <div style={styles.fieldGroup}>
        <h3 style={styles.fieldGroupTitle}>전문성</h3>

        <div style={styles.formGroup}>
          <label style={styles.label}>전문 분야 * (Enter 또는 추가 버튼)</label>
          <div style={styles.tagInputRow}>
            <input
              value={form.expertiseInput}
              onChange={set('expertiseInput')}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddExpertise(); } }}
              placeholder="예: 당뇨, 건기식, 마케팅"
              style={{ ...styles.input, flex: 1 }}
            />
            <button type="button" onClick={onAddExpertise} style={styles.tagAddBtn}>추가</button>
          </div>
          <div style={styles.tagList}>
            {form.expertise.map(tag => (
              <span key={tag} style={styles.tag}>
                {tag}
                <button onClick={() => onRemoveExpertise(tag)} style={styles.tagRemove}>×</button>
              </span>
            ))}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>자기 소개</label>
          <textarea value={form.bio} onChange={set('bio')} placeholder="전문성과 강의 배경을 소개해 주세요" style={styles.textarea} rows={4} />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>경력</label>
          <textarea value={form.experience} onChange={set('experience')} placeholder="관련 경력을 입력해 주세요" style={styles.textarea} rows={3} />
        </div>
      </div>

      {/* 강의 관련 */}
      <div style={styles.fieldGroup}>
        <h3 style={styles.fieldGroupTitle}>강의 관련</h3>

        <div style={styles.formGroup}>
          <label style={styles.label}>강의 주제 (Enter 또는 추가 버튼)</label>
          <div style={styles.tagInputRow}>
            <input
              value={form.lectureTopicsInput}
              onChange={set('lectureTopicsInput')}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddLectureTopic(); } }}
              placeholder="예: 당뇨약 복약지도, 건기식 상담"
              style={{ ...styles.input, flex: 1 }}
            />
            <button type="button" onClick={onAddLectureTopic} style={styles.tagAddBtn}>추가</button>
          </div>
          <div style={styles.tagList}>
            {form.lectureTopics.map(tag => (
              <span key={tag} style={styles.tag}>
                {tag}
                <button onClick={() => onRemoveLectureTopic(tag)} style={styles.tagRemove}>×</button>
              </span>
            ))}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>강의 계획 요약 *</label>
          <textarea value={form.lecturePlanSummary} onChange={set('lecturePlanSummary')} placeholder="어떤 강의를 하실 계획인지 간략하게 설명해 주세요" style={styles.textarea} rows={4} />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>포트폴리오 URL</label>
          <input value={form.portfolioUrl} onChange={set('portfolioUrl')} placeholder="https://..." style={styles.input} type="url" />
        </div>
      </div>
    </>
  );
}

// ─── 일반 자격 간단 폼 ────────────────────────────────────────

function SimpleQualificationForm({ form, onChange }: { form: SimpleFormData; onChange: (f: SimpleFormData) => void }) {
  const set = (key: keyof SimpleFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...form, [key]: e.target.value });

  return (
    <>
      <div style={styles.formGroup}>
        <label style={styles.label}>소개 *</label>
        <textarea value={form.bio} onChange={set('bio')} placeholder="신청 자격 관련 전문성과 배경을 소개해 주세요" style={styles.textarea} rows={4} />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>경력</label>
        <textarea value={form.experience} onChange={set('experience')} placeholder="관련 경력을 입력해 주세요" style={styles.textarea} rows={3} />
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
  formCard: { backgroundColor: colors.white, padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' },
  formGroup: { marginBottom: '16px' },
  formRow: { display: 'flex', gap: '16px' },
  fieldGroup: { borderTop: `1px solid ${colors.neutral100}`, paddingTop: '20px', marginBottom: '8px' },
  fieldGroupTitle: { fontSize: '14px', fontWeight: 600, color: colors.neutral600, marginBottom: '14px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  label: { display: 'block', fontSize: '14px', fontWeight: 500, color: colors.neutral700, marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', fontSize: '14px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', boxSizing: 'border-box' as const },
  select: { width: '100%', padding: '10px 12px', fontSize: '14px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', boxSizing: 'border-box' as const },
  textarea: { width: '100%', padding: '10px 12px', fontSize: '14px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', resize: 'vertical' as const, boxSizing: 'border-box' as const },
  tagInputRow: { display: 'flex', gap: '8px', marginBottom: '8px' },
  tagAddBtn: { padding: '10px 14px', fontSize: '13px', backgroundColor: colors.neutral100, border: `1px solid ${colors.neutral300}`, borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' as const },
  tagList: { display: 'flex', flexWrap: 'wrap' as const, gap: '8px' },
  tag: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px', fontSize: '13px', color: '#1d4ed8' },
  tagRemove: { background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd', fontSize: '16px', lineHeight: 1, padding: '0 2px' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: `1px solid ${colors.neutral100}` },
  cancelBtn: { padding: '10px 20px', fontSize: '14px', color: colors.neutral600, backgroundColor: colors.neutral100, border: 'none', borderRadius: '6px', cursor: 'pointer' },
  submitBtn: { padding: '10px 24px', fontSize: '14px', fontWeight: 600, color: colors.white, backgroundColor: colors.primary, border: 'none', borderRadius: '6px', cursor: 'pointer' },
  disabledBtn: { backgroundColor: colors.neutral400, cursor: 'not-allowed' },
  requestList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  requestItem: { padding: '16px', backgroundColor: colors.neutral50, borderRadius: '8px' },
  requestHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' },
  requestMeta: { fontSize: '12px', color: colors.neutral400 },
  reviewNote: { marginTop: '8px', fontSize: '13px', color: colors.neutral600, padding: '8px', backgroundColor: colors.white, borderRadius: '4px' },
};

export default MyQualificationsPage;
