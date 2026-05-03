/**
 * InstructorDashboardPage — 강사 메인 대시보드
 *
 * WO-O4O-INSTRUCTOR-DASHBOARD-V1 (초기 구현)
 * WO-O4O-LMS-INSTRUCTOR-DASHBOARD-CONNECT-V1: 운영 요약 + 다음 행동 진입점 중심으로 재정비
 *
 * 화면 구성:
 *  1. 운영 요약 KPI 카드 (강의 수 / 수강생 수 / 평균 완료율 / 승인 대기)
 *  2. 운영 대시보드 CTA (/instructor/dashboard)
 *  3. 승인 대기 수강신청 카드 (목록 + 승인/거절 버튼)
 *  4. 내 강의 목록 카드 (dashboardCourses 기반)
 *  5. 강사 프로필 카드 (수정 모달 유지)
 *  6. 신청/심사 정보 카드
 *
 * 사용 API (모두 기존):
 *  - instructorApi.getMe / updateProfile
 *  - lmsInstructorApi.dashboardCourses
 *  - lmsInstructorApi.pendingEnrollments
 *  - lmsInstructorApi.approveEnrollment / rejectEnrollment
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { instructorApi, type InstructorDashboardData, type UpdateProfileDto } from '../../api/instructor';
import {
  lmsInstructorApi,
  type CourseStatus,
  type PendingEnrollmentItem,
} from '../../api/lms-instructor';
import { colors } from '../../styles/theme';

// ── 공통 컴포넌트 ───────────────────────────────────────────
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

function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 700, color: colors.neutral800, margin: 0 }}>
        {children}
      </h2>
      {action}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: '14px' }}>
      <span style={{ fontWeight: 600, color: colors.neutral500, minWidth: '90px' }}>{label}</span>
      <span style={{ color: colors.neutral800, flex: 1 }}>{value || '-'}</span>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  pending_review: '검토 대기',
  published: '공개',
  rejected: '반려됨',
  archived: '종료',
};
const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  draft:          { bg: '#f3f4f6', color: '#374151' },
  pending_review: { bg: '#dbeafe', color: '#1d4ed8' },
  published:      { bg: '#dcfce7', color: '#15803d' },
  rejected:       { bg: '#fee2e2', color: '#b91c1c' },
  archived:       { bg: '#f3f4f6', color: '#6b7280' },
};

// ── KPI 카드 ─────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div style={{
      backgroundColor: colors.white,
      borderRadius: '10px',
      padding: '16px 20px',
      borderLeft: `4px solid ${accent}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    }}>
      <p style={{ fontSize: '12px', color: colors.neutral500, margin: '0 0 6px' }}>{label}</p>
      <p style={{ fontSize: '26px', fontWeight: 700, color: colors.neutral900, margin: 0, lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p style={{ fontSize: '11px', color: colors.neutral400, margin: '6px 0 0' }}>{sub}</p>}
    </div>
  );
}

// ── 강사 프로필 카드 ─────────────────────────────────────────
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
      <CardTitle action={<button style={styles.editBtn} onClick={onEdit}>프로필 수정</button>}>
        강사 프로필
      </CardTitle>
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

// ── 신청/심사 정보 카드 ──────────────────────────────────────
function ReviewInfoCard({ data }: { data: InstructorDashboardData }) {
  const { qualification, latestRequest } = data;
  return (
    <Card>
      <CardTitle>신청 / 심사 정보</CardTitle>
      <InfoRow label="신청일" value={qualification.requestedAt ? new Date(qualification.requestedAt).toLocaleDateString('ko-KR') : '-'} />
      <InfoRow label="승인일" value={qualification.approvedAt ? new Date(qualification.approvedAt).toLocaleDateString('ko-KR') : '-'} />
      <InfoRow label="상태" value={
        <span style={{ padding: '2px 10px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
          승인 완료
        </span>
      } />
      {latestRequest?.reviewNote && <InfoRow label="심사 의견" value={latestRequest.reviewNote} />}
    </Card>
  );
}

// ── 프로필 수정 모달 ─────────────────────────────────────────
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
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: colors.neutral900, marginBottom: '20px' }}>프로필 수정</h2>
        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.formGroup}><label style={styles.label}>표시 이름 *</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.formGroup}><label style={styles.label}>소속 기관</label>
          <input value={organization} onChange={e => setOrganization(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.formGroup}><label style={styles.label}>직책</label>
          <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.formGroup}><label style={styles.label}>전문 분야</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
            {expertise.map(tag => (
              <span key={tag} style={{ ...styles.tag, cursor: 'pointer' }} onClick={() => removeTag(tag, setExpertise, expertise)}>
                {tag} ✕
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input value={expertiseInput} onChange={e => setExpertiseInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag(expertiseInput, setExpertise, expertise, setExpertiseInput))}
              placeholder="입력 후 Enter" style={{ ...styles.input, flex: 1 }} />
            <button style={styles.tagAddBtn} onClick={() => addTag(expertiseInput, setExpertise, expertise, setExpertiseInput)}>추가</button>
          </div>
        </div>
        <div style={styles.formGroup}><label style={styles.label}>자기소개</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={styles.textarea} />
        </div>
        <div style={styles.formGroup}><label style={styles.label}>경력 사항</label>
          <textarea value={experience} onChange={e => setExperience(e.target.value)} rows={3} style={styles.textarea} />
        </div>
        <div style={styles.formGroup}><label style={styles.label}>포트폴리오 URL</label>
          <input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} style={styles.input} />
        </div>

        <div style={styles.modalActions}>
          <button style={styles.cancelBtn} onClick={onClose}>취소</button>
          <button style={{ ...styles.saveBtn, ...(saving ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }} onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────
type DashboardCourse = {
  courseId: string;
  title: string;
  status: CourseStatus;
  totalEnrollments: number;
  completionRate: number;
  averageProgress: number;
};

export default function InstructorDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<InstructorDashboardData | null>(null);
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [pendings, setPendings] = useState<PendingEnrollmentItem[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, coursesRes, pendingRes] = await Promise.allSettled([
        instructorApi.getMe(),
        lmsInstructorApi.dashboardCourses(),
        lmsInstructorApi.pendingEnrollments({ limit: 5 }),
      ]);

      if (meRes.status === 'fulfilled' && meRes.value.data.success) {
        setData(meRes.value.data.data);
      } else if (meRes.status === 'rejected') {
        const code = (meRes.reason as any)?.response?.data?.code;
        if (code === 'NOT_QUALIFIED') {
          navigate('/mypage/qualifications', { replace: true });
          return;
        }
      }

      if (coursesRes.status === 'fulfilled') {
        setCourses(coursesRes.value.data.data?.courses ?? []);
      }

      if (pendingRes.status === 'fulfilled') {
        setPendings((pendingRes.value.data.data ?? []) as PendingEnrollmentItem[]);
        setPendingTotal(pendingRes.value.data.pagination?.total ?? (pendingRes.value.data.data?.length ?? 0));
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSave = async (dto: UpdateProfileDto) => {
    const res = await instructorApi.updateProfile(dto);
    if (res.data.success && data) {
      setData({ ...data, profile: res.data.data as any });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleApprove = async (id: string) => {
    setActionPending(id);
    try {
      await lmsInstructorApi.approveEnrollment(id);
      // 목록에서 제거 + 카운트 갱신
      setPendings(prev => prev.filter(p => p.id !== id));
      setPendingTotal(prev => Math.max(prev - 1, 0));
    } catch (err: any) {
      alert(err?.response?.data?.error || '승인 처리에 실패했습니다.');
    } finally {
      setActionPending(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('해당 수강 신청을 거절합니다. 진행할까요?')) return;
    setActionPending(id);
    try {
      await lmsInstructorApi.rejectEnrollment(id);
      setPendings(prev => prev.filter(p => p.id !== id));
      setPendingTotal(prev => Math.max(prev - 1, 0));
    } catch (err: any) {
      alert(err?.response?.data?.error || '거절 처리에 실패했습니다.');
    } finally {
      setActionPending(null);
    }
  };

  if (loading) return <div style={styles.loading}>불러오는 중...</div>;
  if (!data) return (
    <div style={styles.container}>
      <div style={styles.errorBanner}>강사 자격 정보를 불러오지 못했습니다.</div>
    </div>
  );

  // ── 합산 KPI 계산 (frontend aggregation, 백엔드 변경 없음) ──
  const totalCourses = courses.length;
  const totalEnrollments = courses.reduce((sum, c) => sum + (c.totalEnrollments || 0), 0);
  const avgCompletionRate = courses.length > 0
    ? courses.reduce((sum, c) => sum + (c.completionRate || 0), 0) / courses.length
    : 0;

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>강사 대시보드</h1>
          <p style={{ fontSize: '14px', color: colors.neutral500, marginTop: '4px' }}>
            운영 요약과 다음 행동을 한 눈에 확인하세요.
          </p>
        </div>
        <button style={styles.mypageBtn} onClick={() => navigate('/mypage')}>마이페이지로</button>
      </div>

      {saveSuccess && <div style={styles.successBanner}>프로필이 저장되었습니다.</div>}

      {/* 1. 운영 요약 KPI */}
      <div style={styles.kpiGrid}>
        <KpiCard label="내 강의" value={totalCourses} sub="등록된 강의" accent="#2563eb" />
        <KpiCard label="전체 수강생" value={totalEnrollments} sub="합산 수강 인원" accent="#10b981" />
        <KpiCard label="평균 완료율" value={`${avgCompletionRate.toFixed(1)}%`} sub="강의 평균" accent="#f59e0b" />
        <KpiCard label="승인 대기" value={pendingTotal} sub="수강 신청" accent={pendingTotal > 0 ? '#dc2626' : '#94a3b8'} />
      </div>

      {/* 2. CTA: 강의 운영 대시보드 */}
      <Card style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '15px', fontWeight: 700, color: colors.neutral900, margin: 0 }}>강의 운영 대시보드</p>
          <p style={{ fontSize: '13px', color: colors.neutral500, margin: '4px 0 0' }}>강의별 수강자 / 진도 / 퀴즈 통계 / 인증서 발급 현황</p>
        </div>
        <button style={styles.primaryBtn} onClick={() => navigate('/instructor/dashboard')}>운영 대시보드 보기</button>
      </Card>

      {/* 3. 승인 대기 수강신청 */}
      {pendings.length > 0 && (
        <Card style={{ marginTop: '16px' }}>
          <CardTitle action={
            pendingTotal > pendings.length ? (
              <span style={{ fontSize: '12px', color: colors.neutral500 }}>
                상위 {pendings.length}건 표시 / 총 {pendingTotal}건
              </span>
            ) : null
          }>
            승인 대기 수강신청
          </CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendings.map(p => (
              <div key={p.id} style={styles.pendingRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: colors.neutral900, margin: 0 }}>
                    {p.user?.name || '(이름 없음)'}
                  </p>
                  <p style={{ fontSize: '12px', color: colors.neutral500, margin: '2px 0 0' }}>
                    {p.course?.title || '(강의 미상)'} · {new Date(p.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    style={{ ...styles.smallApprove, opacity: actionPending === p.id ? 0.6 : 1 }}
                    onClick={() => handleApprove(p.id)}
                    disabled={actionPending !== null}
                  >
                    승인
                  </button>
                  <button
                    style={{ ...styles.smallReject, opacity: actionPending === p.id ? 0.6 : 1 }}
                    onClick={() => handleReject(p.id)}
                    disabled={actionPending !== null}
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. 내 강의 목록 */}
      <Card style={{ marginTop: '16px' }}>
        <CardTitle action={
          <button style={styles.linkBtn} onClick={() => navigate('/instructor/courses/new')}>+ 신규 강의</button>
        }>
          내 강의
        </CardTitle>
        {courses.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: colors.neutral400 }}>
            아직 강의가 없습니다. <button style={styles.linkBtn} onClick={() => navigate('/instructor/courses/new')}>강의 만들기</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.coursesTable}>
              <thead>
                <tr style={{ backgroundColor: colors.neutral50 }}>
                  {['강의명', '상태', '수강자', '완료율', '평균 진도', ''].map((h, i) => (
                    <th key={i} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courses.map(c => {
                  const sc = STATUS_COLOR[c.status] ?? { bg: '#f3f4f6', color: '#374151' };
                  return (
                    <tr key={c.courseId}>
                      <td style={styles.td}>{c.title}</td>
                      <td style={styles.td}>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, backgroundColor: sc.bg, color: sc.color }}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </td>
                      <td style={styles.td}>{(c.totalEnrollments ?? 0).toLocaleString()}명</td>
                      <td style={styles.td}>{(c.completionRate ?? 0).toFixed(1)}%</td>
                      <td style={styles.td}>{(c.averageProgress ?? 0).toFixed(1)}%</td>
                      <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                        <button style={styles.tinyBtn} onClick={() => navigate(`/instructor/courses/${c.courseId}`)}>편집</button>
                        <button style={styles.tinyBtn} onClick={() => navigate(`/instructor/contents/${c.courseId}/participants`)}>수강자</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 5+6. 프로필 + 신청/심사 */}
      <div style={styles.profileGrid}>
        <InstructorProfileCard data={data} onEdit={() => setEditOpen(true)} />
        <ReviewInfoCard data={data} />
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
// WO-O4O-LMS-INSTRUCTOR-DASHBOARD-CONNECT-V1:
//   InstructorLayout 사이드바가 외곽 폭을 잡으므로 페이지 자체 maxWidth 미설정.
//   KPI는 자동 4열, 섹션 간 16px gap.
const styles: Record<string, React.CSSProperties> = {
  container: { padding: '0' },
  loading: { padding: '60px', textAlign: 'center', color: colors.neutral400 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' },
  title: { fontSize: '24px', fontWeight: 700, color: colors.neutral900 },
  errorBanner: { padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', marginBottom: '16px', fontSize: '14px' },
  successBanner: { padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '14px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  profileGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginTop: '16px' },
  pendingRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: colors.neutral50, borderRadius: '8px', gap: '12px' },
  coursesTable: { width: '100%', borderCollapse: 'collapse' as const },
  th: { padding: '10px 12px', textAlign: 'left' as const, fontSize: '12px', fontWeight: 600, color: colors.neutral600, borderBottom: `1px solid ${colors.neutral200}` },
  td: { padding: '10px 12px', fontSize: '14px', color: colors.neutral800, borderBottom: `1px solid ${colors.neutral100}` },
  editBtn: { padding: '6px 14px', fontSize: '13px', color: colors.primary, backgroundColor: 'transparent', border: `1px solid ${colors.primary}`, borderRadius: '6px', cursor: 'pointer' },
  primaryBtn: { padding: '9px 18px', fontSize: '14px', fontWeight: 500, color: colors.white, backgroundColor: colors.primary, border: 'none', borderRadius: '7px', cursor: 'pointer' },
  linkBtn: { padding: '4px 10px', fontSize: '12px', color: colors.primary, backgroundColor: 'transparent', border: `1px solid ${colors.primary}`, borderRadius: '6px', cursor: 'pointer' },
  tinyBtn: { padding: '4px 10px', fontSize: '12px', color: colors.neutral700, backgroundColor: colors.neutral100, border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '4px' },
  smallApprove: { padding: '5px 12px', fontSize: '12px', fontWeight: 500, color: colors.white, backgroundColor: '#10b981', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  smallReject: { padding: '5px 12px', fontSize: '12px', fontWeight: 500, color: colors.white, backgroundColor: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' },
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
