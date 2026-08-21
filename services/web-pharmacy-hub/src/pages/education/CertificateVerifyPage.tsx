/**
 * CertificateVerifyPage — 수료증 공개 검증 (Pharmacy-Hub wrapper)
 *
 * WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §10
 * 공통 `@o4o/account-ui` CertificateVerifyView 채택(KPA 원본을 공통 View 로 추출).
 * 인증 없이 접근하는 공개 검증 화면이며 `GET /api/v1/lms/certificates/:id/verify`
 * 계약만 소비한다 — 소유자 전용 API 를 쓰지 않는다.
 */

import { useParams } from 'react-router-dom';
import { CertificateVerifyView } from '@o4o/account-ui';
import { API_BASE_URL } from '../../lib/apiClient';

export default function CertificateVerifyPage() {
  const { certificateId } = useParams<{ certificateId: string }>();
  // base URL 은 apiClient 가 단일 출처다 (환경변수 직접 사용 금지 — CLAUDE.md §1).
  return <CertificateVerifyView certificateId={certificateId} apiBaseUrl={API_BASE_URL} />;
}
