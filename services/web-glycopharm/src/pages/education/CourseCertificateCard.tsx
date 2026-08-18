/**
 * CourseCertificateCard — GlycoPharm 전용 수료증 카드
 *
 * WO-O4O-COMMUNITY-LMS-COURSE-DETAIL-AND-LESSON-PLAYER-COMMONIZATION-V1:
 * 공통 `CourseDetailView` 의 `renderSidebarExtra` slot 으로 주입되는 서비스 고유 UI.
 * GlycoPharm 만 수료증 PDF 다운로드를 제공한다(KPA=수료증 화면 / KCos=미제공).
 */

import { useEffect, useState } from 'react';
import { Award, Download, Loader2 } from 'lucide-react';
import { lmsApi, type LmsCertificate } from '@/api/lms';
import type { LmsEnrollmentData } from '@o4o/lms-ui';

interface Props {
  courseId: string;
  enrollment: LmsEnrollmentData | null;
}

export function CourseCertificateCard({ courseId, enrollment }: Props) {
  const completed = !!enrollment && (enrollment.status === 'completed' || (enrollment.progress ?? 0) >= 100);
  const [certificate, setCertificate] = useState<LmsCertificate | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!completed) return;
    let cancelled = false;
    setLoading(true);
    lmsApi
      .getMyCertificate(courseId)
      .then((cert) => {
        if (!cancelled) setCertificate(cert);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, completed]);

  const handleDownload = async () => {
    if (!certificate || downloading) return;
    setDownloading(true);
    try {
      const blob = await lmsApi.downloadCertificate(certificate.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certificate.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // PDF 다운로드 실패 시 조용히 무시 (기존 동작 유지)
    } finally {
      setDownloading(false);
    }
  };

  if (!completed) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mt-4">
      <div className="flex items-center gap-2 mb-3 text-slate-800">
        <Award className="w-5 h-5 text-emerald-600" />
        <h3 className="text-sm font-semibold">수료증</h3>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> 수료증 확인 중...
        </p>
      ) : certificate ? (
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          {downloading ? '다운로드 중...' : '수료증 PDF 다운로드'}
        </button>
      ) : (
        <p className="text-sm text-slate-500">수료증이 아직 발급되지 않았습니다.</p>
      )}
    </div>
  );
}
