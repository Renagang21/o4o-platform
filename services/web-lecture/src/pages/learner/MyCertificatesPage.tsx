/** 내 수료증 — `/lms/certificates` (본인 userId 강제) · PDF 다운로드 (WO Phase 2 §11 Learner 수료) */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LmsEmptyState, LmsLoading } from '@o4o/lms-ui';
import { learnerApi, errorMessage, type LectureCertificate } from '../../api/lecture';
import { api } from '../../lib/apiClient';
import { useToast } from '../../components/Toast';

export default function MyCertificatesPage() {
  const toast = useToast();
  const [items, setItems] = useState<LectureCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await learnerApi.getMyCertificates<LectureCertificate>({ limit: 100 });
        if (alive) setItems(res.data ?? []);
      } catch (err) { if (alive) setError(errorMessage(err, '수료증을 불러오지 못했습니다.')); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  async function downloadPdf(c: LectureCertificate) {
    try {
      const res = await api.get(`/lms/certificates/${c.id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${c.certificateNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(errorMessage(err, 'PDF 를 내려받지 못했습니다.')); }
  }

  return <main className="page page-wide">
    <div className="page-head"><h1>내 수료증</h1><p className="muted">수료한 강의의 수료증입니다. 진위 확인은 수료증 번호로 누구나 할 수 있습니다.</p></div>
    {loading && <LmsLoading message="불러오는 중..." />}
    {error && <div className="notice notice-error">{error}</div>}
    {!loading && !error && items.length === 0 && <LmsEmptyState title="발급된 수료증이 없습니다" description="강의를 수료하면 이곳에서 수료증을 확인할 수 있습니다." />}
    <ul className="list">
      {items.map((c) => <li key={c.id} className="list-item">
        <div className="list-main">
          <span className="list-title">{c.course?.title ?? '강의'}</span>
          {c.status && c.status !== 'active' && <span className={`badge badge-${c.status}`}>{c.status}</span>}
        </div>
        <div className="list-meta muted">번호 {c.certificateNumber} · 발급 {c.issuedAt?.slice(0, 10)}{c.expiresAt ? ` · 만료 ${c.expiresAt.slice(0, 10)}` : ''}</div>
        <div className="list-actions">
          <button type="button" className="btn" onClick={() => void downloadPdf(c)}>PDF</button>
          {c.verificationCode && <Link className="btn btn-ghost" to={`/certificates/verify/${c.verificationCode}`}>진위 확인</Link>}
        </div>
      </li>)}
    </ul>
  </main>;
}
