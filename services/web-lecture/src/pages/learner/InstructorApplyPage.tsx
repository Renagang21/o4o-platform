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

export default function InstructorApplyPage() {
  const { user } = useAuth();
  const agreement = useServiceEnrollmentPolicies('lecture', async () => (await api.get('/public/services/lecture/enrollment-policies')).data.data, user?.id ?? 'signed-out');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const alreadyInstructor = (user?.roles ?? []).includes(ROLES.instructor);

  async function apply() {
    if (!agreement.ready || state === 'sending') return;
    setState('sending'); setError(null);
    try { await learnerApi.applyInstructor(agreement.references); setState('done'); }
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
          {error && <p className="notice notice-error">{error}</p>}
          <ServiceEnrollmentPolicyAgreement agreement={agreement} />
          <button type="button" className="btn btn-primary" disabled={state === 'sending' || !agreement.ready} onClick={() => void apply()}>{state === 'sending' ? '신청 중...' : '강사 신청하기'}</button>
        </>}
  </section></main>;
}
