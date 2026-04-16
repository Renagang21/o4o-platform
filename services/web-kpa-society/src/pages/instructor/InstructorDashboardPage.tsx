/**
 * InstructorDashboardPage — 강사 전용 대시보드
 * WO-O4O-INSTRUCTOR-DASHBOARD-V1
 *
 * 접근 조건: instructor qualification status=approved
 * 구성: 강사 상태 카드 / 프로필 카드 / 강의 관리(placeholder) / 심사 정보 카드
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { instructorApi, type InstructorDashboardData, type UpdateProfileDto } from '../../api/instructor';
import { colors } from '../../styles/theme';

// ── 태그 칩 ─────────────────────────────────────────────────
function TagChip({ label }: { label: string }) {
  return (
    <span style={{
      padding: '2px 10px',
      backgroundColor: '#e0f2fe',
      color: '#0369a1',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 500,
    }}>
      {label}
    </span>
  );
}

// ── 카드 공통 래퍼 ────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      backgroundColor: colors.white,
      borderRadius: '12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      padding: '24px',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── 카드 타이틀 ───────────────────────────────────────────────
function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: '16px', fontWeight: 700, color: colors.neutral800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {children}
    </h2>
  );
}

// ── 정보 행 ───────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: '14px' }}>
      <span style={{ fontWeight: 600, color: colors.neutral500, minWidth: '90px' }}>{label}</span>
      <span style={{ color: colors.neutral800, flex: 1 }}>{value || '-'}</span>
    </div>
  );
}

// ── S1: 강사 상태 카드 ────────────────────────────────────────
function InstructorSummaryCard({ data }: { data: InstructorDashboardData }) {
  const { qualification, profile } = data;
  return (
    <Card style={{ borderLeft: '4px solid #10b981' }}>
      <CardTitle>강사 승인 현황</CardTitle>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{
          padding: '4px 14px',
          backgroundColor: '#dcfce7',
          color: '#15803d',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          승인 완료
        </span>
        <span style={{ fontSize: '13px', color: colors.neutral500 }}>
          {qualification.approvedAt ? `승인일: ${new Date(qualification.approvedAt).toLocaleDateString('ko-KR')}` : ''}
        </span>
      </div>
      {profile && (
        <>
          <InfoRow label="강사명" value={profile.displayName} />
          {profile.expertise.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: '14px' }}>
              <span style={{ fontWeight: 600, color: colors.neutral500, minWidth: '90px' }}>전문 분야</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {profile.expertise.map((tag, i) => <TagChip key={i} label={tag} />)}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ── S2: 강사 프로필 카드 ─────────────────────────────────────
function InstructorProfileCard({ data, onEdit }: { data: InstructorDashboardData; onEdit: () => void }) {
  const { profile } = data;

  if (!profile) {
    return (
      <Card>
        <CardTitle>강사 프로필</CardTitle>
        <p style={{ fontSize: '14px', color: colors.neutral500 }}>
          프로필 정보를 불러오지 못했습니다. 관리자에게 문의하세요.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <CardTitle>강사 프로필</CardTitle>
        <button style={styles.editBtn} onClick={onEdit}>프로필 수정</button>
      </div>
      <InfoRow label="표시 이름" value={profile.displayName} />
      <InfoRow label="소속 기관" value={profile.organization} />
      <InfoRow label="직책" value={profile.jobTitle} />
      {profile.expertise.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: '14px' }}>
          <span style={{ fontWeight: 600, color: colors.neutral500, minWidth: '90px' }}>전문 분야</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {profile.expertise.map((tag, i) => <TagChip key={i} label={tag} />)}
          </div>
        </div>
      )}
      <InfoRow label="자기소개" value={profile.bio} />
      <InfoRow label="경력" value={profile.experience} />
      {profile.lectureTopics.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: '14px' }}>
          <span style={{ fontWeight: 600, color: colors.neutral500, minWidth: '90px' }}>강의 주제</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {profile.lectureTopics.map((tag, i) => <TagChip key={i} label={tag} />)}
          </div>
        </div>
      )}
      {profile.portfolioUrl && (
        <InfoRow label="포트폴리오" value={
          <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary }}>
            {profile.portfolioUrl}
          </a>
        } />
      )}
    </Card>
  );
}

// ── S3: 강의 관리 카드 (WO-O4O-LMS-FOUNDATION-V1 + WO-O4O-LMS-INSTRUCTOR-DASHBOARD-MVP-V1) ──
function CourseManagementCard() {
  const navigate = useNavigate();
  return (
    <Card>
      <CardTitle>강의 관리</CardTitle>
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>📚</div>
        <p style={{ fontSize: '14px', color: colors.neutral600, marginBottom: '20px' }}>
          강의를 생성하고 레슨을 관리하세요.
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button style={styles.actionBtn} onClick={() => navigate('/instructor/courses')}>
            강의 관리
          </button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}
            onClick={() => navigate('/instructor/dashboard')}>
            운영 대시보드
          </button>
        </div>
      </div>
    </Card>
  );
}

// ── S4: 심사 정보 카드 ────────────────────────────────────────
function ReviewInfoCard({ data }: { data: InstructorDashboardData }) {
  const { qualification, latestRequest } = data;
  return (
    <Card>
      <CardTitle>신청 / 심사 정보</CardTitle>
      <InfoRow
        label="신청일"
        value={qualification.requestedAt ? new Date(qualification.requestedAt).toLocaleDateString('ko-KR') : '-'}
      />
      <InfoRow
        label="승인일"
        value={qualification.approvedAt ? new Date(qualification.approvedAt).toLocaleDateString('ko-KR') : '-'}
      />
      <InfoRow label="상태" value={
        <span style={{ padding: '2px 10px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
          승인 완료
        </span>
      } />
      {latestRequest?.reviewNote && (
        <InfoRow label="심사 의견" value={latestRequest.reviewNote} />
      )}
    </Card>
  );
}

// ── 향후 확장 영역 ─────────────────────────────────────────────
function FuturePlaceholderCard() {
  const items = [
    { icon: '📝', title: '콘텐츠 제공', desc: '강의 자료 업로드 및 공유' },
    { icon: '📊', title: '설문 / 퀴즈', desc: '수강생 피드백 수집' },
  ];
  return (
    <Card style={{ backgroundColor: '#f8fafc' }}>
      <CardTitle>향후 제공 예정</CardTitle>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {items.map(item => (
          <div key={item.title} style={{
            flex: '1 1 160px',
            padding: '16px',
            backgroundColor: colors.white,
            borderRadius: '8px',
            border: `1px solid ${colors.neutral200}`,
            opacity: 0.7,
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: colors.neutral700 }}>{item.title}</div>
            <div style={{ fontSize: '12px', color: colors.neutral500, marginTop: '4px' }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── 프로필 수정 모달 ──────────────────────────────────────────
function ProfileEditModal({
  profile,
  onClose,
  onSave,
}: {
  profile: NonNullable<InstructorDashboardData['profile']>;
  onClose: () => void;
  onSave: (dto: UpdateProfileDto) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [organization, setOrganization] = useState(profile.organization || '');
  const [jobTitle, setJobTitle] = useState(profile.jobTitle || '');
  const [expertise, setExpertise] = useState<string[]>(profile.expertise);
  const [expertiseInput, setExpertiseInput] = useState('');
  const [bio, setBio] = useState(profile.bio || '');
  const [experience, setExperience] = useState(profile.experience || '');
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolioUrl || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTag = (tag: string, setter: (v: string[]) => void, current: string[], inputSetter: (v: string) => void) => {
    const trimmed = tag.trim();
    if (trimmed && !current.includes(trimmed)) setter([...current, trimmed]);
    inputSetter('');
  };

  const removeTag = (tag: string, setter: (v: string[]) => void, current: string[]) =>
    setter(current.filter(t => t !== tag));

  const handleSave = async () => {
    if (!displayName.trim()) { setError('표시 이름은 필수입니다.'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        displayName: displayName.trim(),
        organization: organization || null,
        jobTitle: jobTitle || null,
        expertise,
        bio: bio || null,
        experience: experience || null,
        portfolioUrl: portfolioUrl || null,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: colors.neutral900, marginBottom: '20px' }}>
          프로필 수정
        </h2>
        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.formGroup}>
          <label style={styles.label}>표시 이름 *</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>소속 기관</label>
          <input value={organization} onChange={e => setOrganization(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>직책</label>
          <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>전문 분야</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
            {expertise.map(tag => (
              <span key={tag} style={{ ...styles.tag, cursor: 'pointer' }} onClick={() => removeTag(tag, setExpertise, expertise)}>
                {tag} ✕
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={expertiseInput}
              onChange={e => setExpertiseInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag(expertiseInput, setExpertise, expertise, setExpertiseInput))}
              placeholder="입력 후 Enter"
              style={{ ...styles.input, flex: 1 }}
            />
            <button style={styles.tagAddBtn} onClick={() => addTag(expertiseInput, setExpertise, expertise, setExpertiseInput)}>
              추가
            </button>
          </div>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>자기소개</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={styles.textarea} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>경력 사항</label>
          <textarea value={experience} onChange={e => setExperience(e.target.value)} rows={3} style={styles.textarea} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>포트폴리오 URL</label>
          <input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} style={styles.input} />
        </div>

        <div style={styles.modalActions}>
          <button style={styles.cancelBtn} onClick={onClose}>취소</button>
          <button
            style={{ ...styles.saveBtn, ...(saving ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function InstructorDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<InstructorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    instructorApi.getMe()
      .then((res: { data: { success: boolean; data: InstructorDashboardData } }) => {
        if (res.data.success) setData(res.data.data);
      })
      .catch((err: any) => {
        const code = err?.response?.data?.code;
        if (code === 'NOT_QUALIFIED') navigate('/mypage/qualifications', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSave = async (dto: UpdateProfileDto) => {
    const res = await instructorApi.updateProfile(dto);
    if (res.data.success && data) {
      setData({ ...data, profile: res.data.data as any });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  if (loading) return <div style={styles.loading}>불러오는 중...</div>;
  if (!data) return (
    <div style={styles.container}>
      <div style={styles.errorBanner}>강사 자격 정보를 불러오지 못했습니다.</div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>강사 대시보드</h1>
          <p style={{ fontSize: '14px', color: colors.neutral500, marginTop: '4px' }}>
            강사 자격이 승인되었습니다. 아래에서 프로필을 확인하고 관리하세요.
          </p>
        </div>
        <button style={styles.mypageBtn} onClick={() => navigate('/mypage')}>
          마이페이지로
        </button>
      </div>

      {saveSuccess && (
        <div style={styles.successBanner}>프로필이 저장되었습니다.</div>
      )}

      {/* 카드 그리드 */}
      <div style={styles.grid}>
        <InstructorSummaryCard data={data} />
        <InstructorProfileCard data={data} onEdit={() => setEditOpen(true)} />
        <CourseManagementCard />
        <ReviewInfoCard data={data} />
        <div style={{ gridColumn: '1 / -1' }}>
          <FuturePlaceholderCard />
        </div>
      </div>

      {/* 프로필 수정 모달 */}
      {editOpen && data.profile && (
        <ProfileEditModal
          profile={data.profile}
          onClose={() => setEditOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ── 스타일 ─────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px 32px', maxWidth: '900px', margin: '0 auto' },
  loading: { padding: '60px', textAlign: 'center', color: colors.neutral400 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 700, color: colors.neutral900 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  errorBanner: { padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', marginBottom: '16px', fontSize: '14px' },
  successBanner: { padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '14px' },
  editBtn: { padding: '6px 14px', fontSize: '13px', color: colors.primary, backgroundColor: 'transparent', border: `1px solid ${colors.primary}`, borderRadius: '6px', cursor: 'pointer' },
  actionBtn: { padding: '9px 20px', fontSize: '14px', fontWeight: 500, color: colors.white, backgroundColor: colors.primary, border: 'none', borderRadius: '7px', cursor: 'pointer' },
  mypageBtn: { padding: '8px 16px', fontSize: '13px', color: colors.neutral600, backgroundColor: colors.neutral100, border: 'none', borderRadius: '6px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal: { backgroundColor: colors.white, borderRadius: '12px', padding: '28px', width: '500px', maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto' as const },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 500, color: colors.neutral700, marginBottom: '6px' },
  input: { width: '100%', padding: '9px 12px', fontSize: '14px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', boxSizing: 'border-box' as const },
  textarea: { width: '100%', padding: '9px 12px', fontSize: '14px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', resize: 'vertical' as const, boxSizing: 'border-box' as const },
  tag: { padding: '3px 10px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '12px', fontSize: '12px', fontWeight: 500 },
  tagAddBtn: { padding: '9px 14px', fontSize: '13px', color: colors.primary, backgroundColor: 'transparent', border: `1px solid ${colors.primary}`, borderRadius: '6px', cursor: 'pointer' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  cancelBtn: { padding: '9px 18px', fontSize: '14px', color: colors.neutral600, backgroundColor: colors.neutral100, border: 'none', borderRadius: '6px', cursor: 'pointer' },
  saveBtn: { padding: '9px 18px', fontSize: '14px', fontWeight: 500, color: colors.white, backgroundColor: colors.primary, border: 'none', borderRadius: '6px', cursor: 'pointer' },
};
