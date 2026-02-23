/**
 * HubList — 공용 1열 리스트 컴포넌트
 *
 * WO-O4O-HUB-LIST-UI-UNIFICATION-V1
 *
 * B2B, 플랫폼 콘텐츠 등 Hub 섹션에서 재사용.
 * 내장 페이지네이션, hover highlight, 우측 액션 버튼 지원.
 */

import { useState } from 'react';
import type { HubListProps } from '../types.js';
import { NEUTRALS } from '../theme.js';
import { injectExplorationStyles } from '../utils/style-inject.js';

const S = {
  container: {
    borderRadius: '16px',
    padding: '24px',
  } as const,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  } as const,
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: NEUTRALS[900],
  } as const,
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#ffffff',
    border: `1px solid ${NEUTRALS[200]}`,
    borderRadius: '12px',
    overflow: 'hidden',
  } as const,
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    border: 'none',
    background: 'transparent',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    width: '100%',
  } as const,
  thumbnailWrap: {
    flexShrink: 0,
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: NEUTRALS[100],
    fontSize: '1.5rem',
  } as const,
  thumbnailImg: {
    width: '48px',
    height: '48px',
    objectFit: 'cover' as const,
    borderRadius: '8px',
  } as const,
  textBlock: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  } as const,
  primaryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as const,
  primary: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: NEUTRALS[800],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as const,
  secondary: {
    fontSize: '0.75rem',
    color: NEUTRALS[500],
    flexShrink: 0,
  } as const,
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as const,
  tertiary: {
    fontSize: '0.75rem',
    color: NEUTRALS[400],
  } as const,
  info: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: NEUTRALS[900],
  } as const,
  actionBtn: {
    flexShrink: 0,
    padding: '5px 12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#2563EB',
    background: '#2563EB10',
    border: `1px solid #2563EB30`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  } as const,
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '12px',
  } as const,
  pageBtn: {
    padding: '6px 12px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: NEUTRALS[600],
    background: 'transparent',
    border: `1px solid ${NEUTRALS[200]}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  } as const,
  pageInfo: {
    fontSize: '0.8125rem',
    color: NEUTRALS[500],
  } as const,
  cta: {
    display: 'block',
    width: '100%',
    marginTop: '16px',
    padding: '12px',
    background: 'transparent',
    border: `1px solid ${NEUTRALS[300]}`,
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: NEUTRALS[700],
    cursor: 'pointer',
    textAlign: 'center' as const,
    fontFamily: 'inherit',
  } as const,
  empty: {
    padding: '40px 20px',
    textAlign: 'center' as const,
    fontSize: '0.875rem',
    color: NEUTRALS[400],
    background: '#ffffff',
    border: `1px solid ${NEUTRALS[200]}`,
    borderRadius: '12px',
  } as const,
};

function isUrl(s: string): boolean {
  return s.startsWith('http') || s.startsWith('/') || s.startsWith('data:');
}

export function HubList({
  items,
  pageSize = 6,
  title,
  ctaLabel,
  onCtaClick,
  backgroundColor,
  emptyMessage,
}: HubListProps) {
  injectExplorationStyles();

  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const visible = items.slice(page * pageSize, (page + 1) * pageSize);

  if (items.length === 0 && !emptyMessage) return null;

  return (
    <div style={{ ...S.container, background: backgroundColor || 'transparent' }}>
      {title && (
        <div style={S.header}>
          <h2 style={S.title}>{title}</h2>
        </div>
      )}

      {items.length === 0 ? (
        <div style={S.empty}>{emptyMessage}</div>
      ) : (
        <div style={S.list}>
          {visible.map((item, i) => (
            <div
              key={item.id}
              className="hub-list-row"
              style={{
                ...S.row,
                borderBottom: i < visible.length - 1
                  ? `1px solid ${NEUTRALS[200]}`
                  : 'none',
              }}
              onClick={item.onClick}
            >
              {item.thumbnail && (
                <div style={S.thumbnailWrap}>
                  {isUrl(item.thumbnail) ? (
                    <img src={item.thumbnail} alt="" style={S.thumbnailImg} />
                  ) : (
                    item.thumbnail
                  )}
                </div>
              )}

              <div style={S.textBlock}>
                <div style={S.primaryRow}>
                  <span style={S.primary}>{item.primaryText}</span>
                  {item.secondaryText && (
                    <span style={S.secondary}>{item.secondaryText}</span>
                  )}
                </div>
                {(item.tertiaryText || item.infoText) && (
                  <div style={S.metaRow}>
                    {item.tertiaryText && (
                      <span style={S.tertiary}>{item.tertiaryText}</span>
                    )}
                    {item.infoText && (
                      <span style={S.info}>{item.infoText}</span>
                    )}
                  </div>
                )}
              </div>

              {item.actionLabel && item.onAction && (
                <button
                  style={S.actionBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onAction?.();
                  }}
                  type="button"
                >
                  {item.actionLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={S.pagination}>
          <button
            style={{ ...S.pageBtn, opacity: page <= 0 ? 0.4 : 1 }}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page <= 0}
            type="button"
          >
            &#171; 이전
          </button>
          <span style={S.pageInfo}>{page + 1} / {totalPages}</span>
          <button
            style={{ ...S.pageBtn, opacity: page >= totalPages - 1 ? 0.4 : 1 }}
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            type="button"
          >
            다음 &#187;
          </button>
        </div>
      )}

      {ctaLabel && onCtaClick && (
        <button style={S.cta} onClick={onCtaClick} type="button">
          {ctaLabel} &rarr;
        </button>
      )}
    </div>
  );
}
