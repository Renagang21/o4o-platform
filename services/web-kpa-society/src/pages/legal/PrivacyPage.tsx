/**
 * PrivacyPage - 개인정보처리방침 페이지 (공개)
 *
 * WO-O4O-KPA-LEGAL-POLICY-ROUTES-ALIGNMENT-V1:
 *   localStorage/static fallback 제거 → 운영자(/operator/legal)가 입력·게시한
 *   kpa_legal_documents(document_type='privacy', published) 를 표시. 게시 문서 없으면 중립 empty.
 */

import { LegalDocumentView } from './LegalDocumentView';

export function PrivacyPage() {
  return <LegalDocumentView documentType="privacy" heading="개인정보처리방침" />;
}
