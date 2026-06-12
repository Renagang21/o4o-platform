/**
 * LegalDocumentView - KPA 공개 정책 문서 뷰 (이용약관 / 개인정보처리방침 공통)
 *
 * WO-O4O-KPA-LEGAL-POLICY-ROUTES-ALIGNMENT-V1
 *
 * 운영자가 /operator/legal 에서 입력·게시한 kpa_legal_documents(published) 를 표시한다.
 * - localStorage / static fallback 제거 → DB published 문서만 표시.
 * - 게시 문서 없으면 중립 empty state(가짜 약관 금지). draft 미노출(API 가 published 만 반환).
 * - 본문은 안전한 line 기반 markdown 렌더(React element 생성) — dangerouslySetInnerHTML 미사용.
 * - 기존 KPA 디자인 톤(styles) 유지.
 */

import { useEffect, useState } from 'react';
import { colors, spacing, typography } from '../../styles/theme';
import { loadPublishedLegalDocument, type KpaLegalDocument } from '../../lib/legalDocument';

interface LegalDocumentViewProps {
  /** kpa_legal_documents.document_type — 이용약관='terms', 개인정보처리방침='privacy'. */
  documentType: string;
  /** 문서 미게시 시에도 표시할 페이지 제목. */
  heading: string;
}

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString('ko-KR'); } catch { return null; }
}

/** 안전한 line 기반 markdown 렌더(기존 PolicyPage 렌더러와 동일 — HTML 주입 없음). */
function renderMarkdown(content: string) {
  return content.split('\n').map((line, index) => {
    if (line.startsWith('# ')) return <h1 key={index} style={styles.mdH1}>{line.slice(2)}</h1>;
    if (line.startsWith('## ')) return <h2 key={index} style={styles.mdH2}>{line.slice(3)}</h2>;
    if (line.startsWith('### ')) return <h3 key={index} style={styles.mdH3}>{line.slice(4)}</h3>;
    if (line.startsWith('- ')) return <li key={index} style={styles.mdLi}>{line.slice(2)}</li>;
    if (line.match(/^\d+\. /)) return <li key={index} style={styles.mdLi}>{line.replace(/^\d+\. /, '')}</li>;
    if (line.trim() === '') return <br key={index} />;
    return <p key={index} style={styles.mdP}>{line}</p>;
  });
}

export function LegalDocumentView({ documentType, heading }: LegalDocumentViewProps) {
  const [state, setState] = useState<'loading' | 'ok' | 'empty' | 'error'>('loading');
  const [doc, setDoc] = useState<KpaLegalDocument | null>(null);

  useEffect(() => {
    let alive = true;
    setState('loading');
    loadPublishedLegalDocument(documentType).then((r) => {
      if (!alive) return;
      if (r.status === 'ok') { setDoc(r.doc); setState('ok'); }
      else setState(r.status);
    });
    return () => { alive = false; };
  }, [documentType]);

  const published = fmtDate(doc?.published_at);
  const updated = fmtDate(doc?.updated_at);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>{doc?.title || heading}</h1>
        {state === 'ok' && doc && (
          <>
            {(published || updated) && (
              <p style={styles.updated}>
                {published ? `게시일 ${published}` : ''}
                {published && updated ? ' · ' : ''}
                {updated ? `최종 수정일 ${updated}` : ''}
              </p>
            )}
            <div style={styles.markdownContent}>{renderMarkdown(doc.content)}</div>
          </>
        )}
        {state === 'loading' && <p style={styles.stateText}>불러오는 중…</p>}
        {state === 'empty' && <p style={styles.stateText}>현재 공개된 문서가 없습니다.</p>}
        {state === 'error' && <p style={styles.stateText}>문서를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: colors.neutral50,
    padding: `${spacing.xl} ${spacing.lg}`,
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: spacing.xl,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    ...typography.headingL,
    color: colors.neutral900,
    marginBottom: spacing.xs,
  },
  updated: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    marginBottom: spacing.xl,
    paddingBottom: spacing.md,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  stateText: {
    fontSize: '0.938rem',
    color: colors.neutral500,
    textAlign: 'center',
    padding: `${spacing.xl} 0`,
  },
  markdownContent: {
    fontSize: '0.938rem',
    lineHeight: 1.8,
    color: colors.neutral700,
  },
  mdH1: {
    ...typography.headingL,
    color: colors.neutral900,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  mdH2: {
    ...typography.headingM,
    color: colors.neutral900,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  mdH3: {
    ...typography.headingS,
    color: colors.neutral800,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  mdP: {
    marginBottom: spacing.sm,
  },
  mdLi: {
    marginLeft: spacing.lg,
    marginBottom: spacing.xs,
    listStyleType: 'disc',
  },
};
