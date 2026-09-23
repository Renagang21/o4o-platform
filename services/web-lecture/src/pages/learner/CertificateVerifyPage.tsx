/**
 * 수료증 진위 확인 (공개 · 비로그인 허용)
 *  - `/certificates/verify/:code` — verificationCode 기반 (`GET /lms/certificates/verify/:code`)
 *  - `/certificate/verify/:id`    — PDF QR · 기존 서비스 외부 이동 경로, certificate id 기반
 *                                   (`GET /lms/certificates/:id/verify`, WO Phase 2 §17)
 * 두 경로 모두 같은 화면 — code 로 먼저 조회하고, UUID 형태면 id 검증으로 보완한다.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LmsLoading } from '@o4o/lms-ui';
import { learnerApi, errorMessage } from '../../api/lecture';

interface PublicView { certificateId: string; certificateCode: string; userName: string; courseTitle: string; completedAt: string | null; issuedAt: string | null; issuer: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveView(code: string): Promise<PublicView | null> {
  try {
    const res = await learnerApi.verifyCertificate(code);
    const view = res?.data?.certificate as PublicView | undefined;
    if (view) return view;
  } catch (err) {
    if (!UUID_RE.test(code)) throw err;
  }
  if (!UUID_RE.test(code)) return null;
  const byId = await learnerApi.verifyCertificateById(code);
  return byId?.valid && byId.certificate ? (byId.certificate as PublicView) : null;
}

export default function CertificateVerifyPage() {
  const { code = '' } = useParams<{ code: string }>();
  const [view, setView] = useState<PublicView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const resolved = await resolveView(code);
        if (!alive) return;
        if (resolved) setView(resolved);
        else setError('유효하지 않은 수료증입니다.');
      } catch (err) { if (alive) setError(errorMessage(err, '유효하지 않은 수료증입니다.')); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [code]);

  return <main className="center-card"><section className="card">
    <h1>수료증 진위 확인</h1>
    {loading && <LmsLoading message="확인 중..." />}
    {error && <p className="notice notice-error">{error}</p>}
    {view && <dl className="dl">
      <dt>수료자</dt><dd>{view.userName}</dd>
      <dt>강의</dt><dd>{view.courseTitle}</dd>
      <dt>수료증 번호</dt><dd>{view.certificateCode}</dd>
      <dt>수료일</dt><dd>{view.completedAt ?? '-'}</dd>
      <dt>발급일</dt><dd>{view.issuedAt ?? '-'}</dd>
      <dt>발급 기관</dt><dd>{view.issuer}</dd>
    </dl>}
    {view && <p className="badge badge-active">✓ 유효한 수료증입니다</p>}
  </section></main>;
}
