/**
 * PolicyPage - 이용약관 페이지 (공개)
 *
 * WO-O4O-KPA-LEGAL-POLICY-ROUTES-ALIGNMENT-V1:
 *   localStorage/static fallback 제거 → 운영자(/operator/legal)가 입력·게시한
 *   kpa_legal_documents(document_type='terms', published) 를 표시. 게시 문서 없으면 중립 empty.
 */

import { LegalDocumentView } from './LegalDocumentView';

export function PolicyPage() {
  return <LegalDocumentView documentType="terms" heading="이용약관" />;
}
