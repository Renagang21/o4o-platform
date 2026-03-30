/**
 * TemplateModal — 템플릿 선택 모달
 *
 * WO-O4O-CONTENT-TEMPLATE-SYSTEM-V1
 *
 * 인라인 스타일 모달 (외부 UI 라이브러리 의존 없음).
 */

import { useState, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { ContentRenderer } from './ContentRenderer';
import type { ContentTemplate } from '../types';

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (html: string, templateId: string) => void;
  templates: ContentTemplate[];
  loading?: boolean;
}

export function TemplateModal({ open, onClose, onSelect, templates, loading }: TemplateModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [scope, setScope] = useState<'all' | 'my' | 'public'>('all');

  const hasPublic = templates.some((t) => t.isPublic);

  const scopedTemplates = useMemo(() => {
    if (scope === 'my') return templates.filter((t) => !t.isPublic);
    if (scope === 'public') return templates.filter((t) => t.isPublic);
    return templates;
  }, [templates, scope]);

  const categories = useMemo(() => {
    const cats = new Set(scopedTemplates.map((t) => t.category));
    return ['all', ...Array.from(cats)];
  }, [scopedTemplates]);

  const filtered = useMemo(() => {
    if (selectedCategory === 'all') return scopedTemplates;
    return scopedTemplates.filter((t) => t.category === selectedCategory);
  }, [scopedTemplates, selectedCategory]);

  const popularTemplates = useMemo(() => {
    return templates
      .filter((t) => (t.usageCount ?? 0) > 0)
      .sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0))
      .slice(0, 5);
  }, [templates]);

  const previewTemplate = previewId ? templates.find((t) => t.id === previewId) : null;

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>템플릿 불러오기</h3>
          <button style={styles.closeBtn} onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {/* Scope Tabs (내 템플릿 / 공용) */}
        {hasPublic && (
          <div style={styles.tabs}>
            {(['all', 'my', 'public'] as const).map((s) => (
              <button
                key={s}
                type="button"
                style={{
                  ...styles.tab,
                  ...(scope === s ? styles.tabActive : {}),
                }}
                onClick={() => { setScope(s); setSelectedCategory('all'); setPreviewId(null); }}
              >
                {s === 'all' ? '전체' : s === 'my' ? '내 템플릿' : '공용'}
              </button>
            ))}
          </div>
        )}

        {/* Category Tabs */}
        {categories.length > 2 && (
          <div style={{ ...styles.tabs, borderBottom: '1px solid #f1f5f9' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                style={{
                  ...styles.tab,
                  ...(selectedCategory === cat ? styles.tabActive : {}),
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? '전체' : cat}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={styles.body}>
          {loading ? (
            <p style={styles.emptyText}>불러오는 중...</p>
          ) : filtered.length === 0 ? (
            <p style={styles.emptyText}>저장된 템플릿이 없습니다.</p>
          ) : (
            <>
            {/* Recommendations */}
            {scope === 'all' && selectedCategory === 'all' && popularTemplates.length > 0 && (
              <div style={styles.recommendSection}>
                <div style={styles.recommendLabel}>인기 템플릿</div>
                <div style={styles.recommendList}>
                  {popularTemplates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      style={{
                        ...styles.recommendChip,
                        ...(previewId === t.id ? styles.recommendChipActive : {}),
                      }}
                      onClick={() => setPreviewId(t.id)}
                    >
                      {t.isPublic && <span style={styles.publicBadge}>공용</span>}
                      {t.name}
                      <span style={styles.recommendCount}>{t.usageCount}회</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={styles.grid}>
              {filtered.map((t) => (
                <div
                  key={t.id}
                  style={{
                    ...styles.card,
                    ...(previewId === t.id ? styles.cardSelected : {}),
                  }}
                  onClick={() => setPreviewId(t.id)}
                >
                  <div style={styles.cardHeader}>
                    <span style={styles.cardName}>
                      {t.isPublic && <span style={styles.publicBadge}>공용</span>}
                      {t.name}
                    </span>
                    <span style={styles.cardCategory}>{t.category}</span>
                  </div>
                  <div style={styles.cardPreview}>
                    <ContentRenderer html={t.contentHtml} style={{ fontSize: '11px', lineHeight: '1.4' }} />
                  </div>
                  {(t.usageCount ?? 0) > 0 && (
                    <div style={styles.cardUsage}>{t.usageCount}회 사용</div>
                  )}
                </div>
              ))}
            </div>
            </>
          )}
        </div>

        {/* Preview + Actions */}
        {previewTemplate && (
          <div style={styles.previewSection}>
            <div style={styles.previewLabel}>미리보기: {previewTemplate.name}</div>
            <div style={styles.previewContent}>
              <ContentRenderer html={previewTemplate.contentHtml} />
            </div>
          </div>
        )}

        <div style={styles.footer}>
          <button type="button" style={styles.cancelBtn} onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            style={{
              ...styles.selectBtn,
              opacity: previewTemplate ? 1 : 0.5,
            }}
            disabled={!previewTemplate}
            onClick={() => {
              if (previewTemplate) {
                onSelect(previewTemplate.contentHtml, previewTemplate.id);
                onClose();
              }
            }}
          >
            선택
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 700,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#1e293b',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#94a3b8',
    padding: '4px 8px',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    padding: '8px 20px',
    borderBottom: '1px solid #f1f5f9',
    flexWrap: 'wrap' as const,
  },
  tab: {
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 500,
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    background: 'white',
    color: '#64748b',
    cursor: 'pointer',
  },
  tabActive: {
    background: '#f0fdf4',
    borderColor: '#86efac',
    color: '#16a34a',
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: '12px 20px',
    minHeight: 120,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center' as const,
    padding: '32px 0',
    fontSize: 14,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 10,
  },
  card: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 10,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  cardSelected: {
    borderColor: '#059669',
    boxShadow: '0 0 0 1px #059669',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e293b',
  },
  cardCategory: {
    fontSize: 10,
    color: '#94a3b8',
    background: '#f8fafc',
    padding: '2px 6px',
    borderRadius: 8,
  },
  publicBadge: {
    display: 'inline-block',
    fontSize: 9,
    fontWeight: 600,
    color: '#2563eb',
    background: '#eff6ff',
    padding: '1px 5px',
    borderRadius: 4,
    marginRight: 4,
    verticalAlign: 'middle',
  },
  cardPreview: {
    height: 60,
    overflow: 'hidden',
    borderRadius: 4,
    background: '#f8fafc',
    padding: 6,
  },
  cardUsage: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'right' as const,
  },
  recommendSection: {
    marginBottom: 12,
    padding: '10px 12px',
    background: '#fffbeb',
    borderRadius: 8,
    border: '1px solid #fde68a',
  },
  recommendLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#92400e',
    marginBottom: 8,
  },
  recommendList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  recommendChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 500,
    border: '1px solid #fde68a',
    borderRadius: 16,
    background: 'white',
    color: '#78350f',
    cursor: 'pointer',
  },
  recommendChipActive: {
    borderColor: '#059669',
    background: '#f0fdf4',
    color: '#059669',
  },
  recommendCount: {
    fontSize: 10,
    color: '#b45309',
    fontWeight: 400,
  },
  previewSection: {
    borderTop: '1px solid #e5e7eb',
    padding: '10px 20px',
    maxHeight: 150,
    overflow: 'auto',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    marginBottom: 6,
  },
  previewContent: {
    fontSize: 13,
    lineHeight: '1.5',
    color: '#334155',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '12px 20px',
    borderTop: '1px solid #e5e7eb',
  },
  cancelBtn: {
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 500,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: 'white',
    color: '#475569',
    cursor: 'pointer',
  },
  selectBtn: {
    padding: '8px 24px',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    background: '#059669',
    color: 'white',
    cursor: 'pointer',
  },
};
