/**
 * CertificateVerifyPage — 수료증 공개 검증 (KPA wrapper)
 *
 * WO-O4O-LMS-CERTIFICATE-VERIFICATION-V1 / 경로 `/certificate/verify/:certificateId` (공개)
 * WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §20:
 *   화면 구현은 공통 `@o4o/account-ui` CertificateVerifyView 로 이관했다.
 *   서비스는 route param + API base 만 넘긴다(마크업 동일).
 */

import { useParams } from 'react-router-dom';
import { CertificateVerifyView } from '@o4o/account-ui';

export default function CertificateVerifyPage() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

  return <CertificateVerifyView certificateId={certificateId} apiBaseUrl={apiBaseUrl} />;
}
