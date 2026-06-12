/**
 * PolicyDocumentViewer — 공개 정책 문서(약관/개인정보처리방침) 뷰어 (공통)
 *
 * WO-O4O-CROSSSERVICE-POLICY-ROUTES-V1
 *
 * serviceKey + documentType 으로 published 정책 문서를 조회·표시한다.
 * 실제 HTTP 호출은 service 측에서 `loadPolicy` 로 주입(서비스별 apiClient/base 상이).
 * backend 계약: GET /api/v1/public/services/:serviceKey/policies/:documentType
 *   (published 만 반환, 미게시/없음 → null).
 *
 * 원칙:
 *   - published 문서만 표시. placeholder/가짜 약관/“준비 중” 문구 생성 금지.
 *   - 미게시/없음 → 중립 empty state.
 *   - 본문은 plain text(whitespace-pre-wrap)로 안전 렌더 — dangerouslySetInnerHTML 미사용(XSS 회피).
 *     (RichText/HTML 렌더는 후속 개선에서 sanitize 동반 시 검토.)
 */

import { type CSSProperties, useCallback, useEffect, useState } from 'react';

export interface PolicyDocumentDto {
  serviceKey: string;
  documentType: string;
  title: string;
  slug: string | null;
  content: string;
  version: number;
  effectiveDate: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface PolicyDocumentViewerProps {
  serviceKey: string;
  documentType: string;
  /** 페이지 제목(문서 미게시 시에도 표시). 예: '이용약관' | '개인정보처리방침'. */
  heading: string;
  /** service 측 주입: published 문서 조회. 없음/미게시 → null 반환, 오류는 throw. */
  loadPolicy: (serviceKey: string, documentType: string) => Promise<PolicyDocumentDto | null>;
}

const S: Record<string, CSSProperties> = {
  page: { maxWidth: 820, margin: '0 auto', padding: '40px 20px' },
  h1: { fontSize: 26, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' },
  meta: { fontSize: 13, color: '#64748b', margin: '0 0 24px' },
  body: { fontSize: 15, lineHeight: 1.8, color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  state: { padding: '48px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 },
};

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString('ko-KR'); } catch { return null; }
}

export function PolicyDocumentViewer({ serviceKey, documentType, heading, loadPolicy }: PolicyDocumentViewerProps) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'empty' | 'error'>('loading');
  const [doc, setDoc] = useState<PolicyDocumentDto | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const result = await loadPolicy(serviceKey, documentType);
      if (result) {
        setDoc(result);
        setStatus('ok');
      } else {
        setDoc(null);
        setStatus('empty');
      }
    } catch {
      setStatus('error');
    }
  }, [loadPolicy, serviceKey, documentType]);

  useEffect(() => { load(); }, [load]);

  const effective = fmtDate(doc?.effectiveDate);
  const published = fmtDate(doc?.publishedAt);

  return (
    <div style={S.page}>
      <h1 style={S.h1}>{doc?.title || heading}</h1>
      {status === 'ok' && doc && (
        <>
          <p style={S.meta}>
            버전 v{doc.version}
            {effective ? ` · 시행일 ${effective}` : ''}
            {published ? ` · 게시일 ${published}` : ''}
          </p>
          <div style={S.body}>{doc.content}</div>
        </>
      )}
      {status === 'loading' && <div style={S.state}>불러오는 중…</div>}
      {status === 'empty' && <div style={S.state}>현재 공개된 문서가 없습니다.</div>}
      {status === 'error' && <div style={S.state}>문서를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>}
    </div>
  );
}
