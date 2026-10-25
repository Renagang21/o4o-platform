import { api } from '../../lib/apiClient';
import { ServiceEnrollmentPolicyAgreement, useServiceEnrollmentPolicies } from '@o4o/shared-space-ui';
/**
 * 강사 신청 — 학습자(active membership) 가 `POST /lms/instructor/apply` 로 신청, 운영자가 승인하면 `lecture:instructor` 부여.
 * §12: KPA 약사 자격과 무관 — Lecture 강사 승인은 Lecture 운영자 판단만으로 이뤄진다.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { learnerApi, errorMessage } from '../../api/lecture';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../config/service';

function InstructorApplyForm() {
  const { user } = useAuth();
  const agreement = useServiceEnrollmentPolicies('lecture', async () => (await api.get('/public/services/lecture/enrollment-policies')).data.data, user?.id ?? 'signed-out');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [bio, setBio] = useState('');
  const [expertise, setExpertise] = useState('');
  const [error, setError] = useState<string | null>(null);
  const alreadyInstructor = (user?.roles ?? []).includes(ROLES.instructor);

  async function apply() {
    if (!agreement.ready || state === 'sending') return;
    if (bio.trim().length > 3000 || expertise.trim().length > 1000) { setError('강사 소개는 3,000자, 전문 분야는 1,000자 이내로 입력해 주세요.'); return; }
    setState('sending'); setError(null);
    try { await learnerApi.applyInstructor(agreement.references, { bio: bio.trim(), expertise: expertise.trim() }); setState('done'); }
    catch (err: any) { if (['POLICY_VERSION_MISMATCH', 'ENROLLMENT_POLICY_REQUIRED'].includes(err.response?.data?.code)) agreement.reload(); setError(errorMessage(err, '강사 신청에 실패했습니다.')); setState('idle'); }
  }

  return <main className="center-card"><section className="card">
    <h1>강사 신청</h1>
    {alreadyInstructor
      ? <p>이미 강사 권한이 있습니다. <Link to="/instructor">강사 공간으로</Link></p>
      : state === 'done'
        ? <p>강사 신청이 접수되었습니다. 운영자 승인 후 강사 공간을 이용할 수 있습니다.</p>
        : <>
          <p>O4O 강의에서 강의를 개설하려면 강사 승인이 필요합니다. 신청하면 운영자가 검토합니다.</p>
          {error && <p role="alert" className="notice notice-error">{error}</p>}
          <label className="field"><span>강사 소개 (선택 · 최대 3,000자)</span><textarea rows={5} maxLength={3000} value={bio} disabled={state === 'sending'} onChange={e => setBio(e.target.value)} /></label>
          <label className="field"><span>전문 분야 (선택 · 최대 1,000자)</span><textarea rows={3} maxLength={1000} value={expertise} disabled={state === 'sending'} onChange={e => setExpertise(e.target.value)} /></label>
          <p className="muted">신청 내용은 강사 승인 검토를 위해 운영자에게 전달됩니다. 연락처·민감한 개인정보는 적지 마세요. 강의 공개 소개에는 자동으로 게시되지 않습니다.</p>
          <ServiceEnrollmentPolicyAgreement agreement={agreement} />
          <button type="button" className="btn btn-primary" disabled={state === 'sending' || !agreement.ready} onClick={() => void apply()}>{state === 'sending' ? '신청 중...' : '강사 신청하기'}</button>
        </>}
  </section></main>;
}

export default function InstructorApplyPage() {
  const { user } = useAuth();
  return <InstructorApplyForm key={user?.id ?? 'signed-out'} />;
}
