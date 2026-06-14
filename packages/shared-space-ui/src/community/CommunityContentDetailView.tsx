/**
 * CommunityContentDetailView — O4O 표준 커뮤니티 콘텐츠 상세 표시 shell
 *
 * WO-O4O-CONTENT-STANDARD-MODULE-EXTRACT-PHASE2-V1
 *
 * KPA `/content/:id` 상세의 **표시 구조**(배지/제목/작성자·메타/요약/태그/본문)를
 * service-neutral 순수 display component 로 추출.
 *
 * - **API client / router / toast 미 import** — 데이터는 wrapper 가 조회·가공해 `data` 로 주입.
 * - 서비스 고유 요소는 slot 으로: `backSlot`(목록 링크) · `actionsSlot`(추천/복사/수정 등) ·
 *   `footerSlot`(KPA AppreciationPanel 등). shell 은 이들의 내용·핸들러를 모름.
 * - 추천/조회수 증가/링크복사/감사하기 등 동작은 전부 wrapper 책임.
 */

import { type ReactNode, type CSSProperties } from 'react';

export type CommunityContentBadgeTone = 'primary' | 'muted' | 'warning';

export interface CommunityContentBadge {
  text: string;
  tone?: CommunityContentBadgeTone;
}

export interface CommunityContentDetailData {
  title: string;
  authorName?: string | null;
  /** wrapper 가 포맷한 날짜 라벨 */
  dateLabel?: string;
  viewCount?: number;
  summary?: string | null;
  tags?: string[];
  /** 본문 HTML (sanitize 는 wrapper/백엔드 책임) */
  bodyHtml?: string | null;
  badges?: CommunityContentBadge[];
}

export interface CommunityContentDetailViewProps {
  data: CommunityContentDetailData;
  /** 목록으로 돌아가기 등 */
  backSlot?: ReactNode;
  /** 추천/링크복사/수정 등 액션 바 (wrapper 가 구성) */
  actionsSlot?: ReactNode;
  /** AppreciationPanel 등 서비스 고유 하단 패널 */
  footerSlot?: ReactNode;
  emptyBodyText?: string;
}

const BADGE_TONE: Record<CommunityContentBadgeTone, CSSProperties> = {
  primary: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  muted: { backgroundColor: '#f1f5f9', color: '#64748b' },
  warning: { backgroundColor: '#fef3c7', color: '#92400e' },
};

export function CommunityContentDetailView({
  data,
  backSlot,
  actionsSlot,
  footerSlot,
  emptyBodyText = '본문 콘텐츠가 없습니다.',
}: CommunityContentDetailViewProps) {
  const { title, authorName, dateLabel, viewCount, summary, tags, bodyHtml, badges } = data;

  return (
    <div style={styles.page}>
      {backSlot && <div style={styles.backRow}>{backSlot}</div>}

      <article style={styles.article}>
        {badges && badges.length > 0 && (
          <div style={styles.metaRow}>
            {badges.map((b, i) => (
              <span key={`${b.text}-${i}`} style={{ ...styles.badge, ...BADGE_TONE[b.tone ?? 'muted'] }}>
                {b.text}
              </span>
            ))}
          </div>
        )}

        <h1 style={styles.articleTitle}>{title}</h1>

        <div style={styles.authorRow}>
          <span style={styles.authorName}>{authorName || '익명'}</span>
          {dateLabel && (<><span style={styles.dot}>·</span><span style={styles.dateText}>{dateLabel}</span></>)}
          {typeof viewCount === 'number' && (<><span style={styles.dot}>·</span><span style={styles.viewText}>조회 {viewCount}</span></>)}
        </div>

        {summary && (
          <div style={styles.summaryBox}>
            <p style={styles.summaryText}>{summary}</p>
          </div>
        )}

        {tags && tags.length > 0 && (
          <div style={styles.tagRow}>
            {tags.map((tag) => (<span key={tag} style={styles.tag}>#{tag}</span>))}
          </div>
        )}

        <div style={styles.bodyWrap}>
          {bodyHtml ? (
            <div style={styles.bodyHtml} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          ) : (
            <p style={styles.emptyBody}>{emptyBodyText}</p>
          )}
        </div>

        {actionsSlot && <div style={styles.actionBar}>{actionsSlot}</div>}

        {footerSlot && <div style={{ marginTop: '20px' }}>{footerSlot}</div>}
      </article>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { maxWidth: 780, margin: '0 auto', padding: '24px 16px 60px' },
  backRow: { marginBottom: 16 },
  article: {
    backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0',
    padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  metaRow: { display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  badge: { display: 'inline-block', padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 600, borderRadius: 4 },
  articleTitle: { fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 12px', lineHeight: 1.4 },
  authorRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  authorName: { fontSize: '0.875rem', fontWeight: 500, color: '#334155' },
  dot: { color: '#cbd5e1' },
  dateText: { fontSize: '0.8125rem', color: '#94a3b8' },
  viewText: { fontSize: '0.8125rem', color: '#94a3b8' },
  summaryBox: { backgroundColor: '#f8fafc', borderRadius: 8, padding: '12px 16px', marginBottom: 16, borderLeft: '3px solid #2563eb' },
  summaryText: { fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.6 },
  tagRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  tag: { fontSize: '0.8125rem', color: '#2563eb' },
  bodyWrap: { minHeight: 200, marginBottom: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9' },
  bodyHtml: { fontSize: '0.9375rem', color: '#334155', lineHeight: 1.8, wordBreak: 'break-word' },
  emptyBody: { textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '0.875rem' },
  actionBar: { display: 'flex', gap: 8, paddingTop: 16, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' },
};

export default CommunityContentDetailView;
