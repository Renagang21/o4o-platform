/**
 * AISummary - Display AI-generated post summary
 * Phase 16: AI Summary & Auto-Tagging
 */

'use client';

import { useState, useEffect } from 'react';
import { useForumAI, type ForumPostAIMeta } from '@/hooks/useForumAI';

interface AISummaryProps {
  postId: string;
  /** Pre-loaded AI metadata (optional) */
  initialData?: ForumPostAIMeta | null;
  /** Show collapsed by default */
  collapsed?: boolean;
  /** Compact mode for search results */
  compact?: boolean;
  /** Show regenerate button */
  showRegenerate?: boolean;
}

export function AISummary({
  postId,
  initialData,
  collapsed = true,
  compact = false,
  showRegenerate = false,
}: AISummaryProps) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const { aiMeta, loading, fetchAIMeta, processPost, isProcessing } = useForumAI({ postId });

  // Use initial data or fetched data
  const data = aiMeta || initialData;

  // Fetch if no initial data
  useEffect(() => {
    if (!initialData && postId) {
      fetchAIMeta();
    }
  }, [postId, initialData, fetchAIMeta]);

  // Loading state
  if (loading && !data) {
    return (
      <div className="ai-summary ai-summary--loading">
        <div className="ai-summary__spinner" />
        <span>AI 요약 로딩 중...</span>
      </div>
    );
  }

  // No data state
  if (!data?.summary) {
    if (showRegenerate) {
      return (
        <div className="ai-summary ai-summary--empty">
          <button
            onClick={() => processPost()}
            disabled={isProcessing}
            className="ai-summary__generate-btn"
          >
            {isProcessing ? 'AI 분석 중...' : 'AI 요약 생성'}
          </button>
        </div>
      );
    }
    return null;
  }

  const { summary } = data;

  // Compact mode for search results
  if (compact) {
    return (
      <div className="ai-summary ai-summary--compact">
        <span className="ai-summary__badge">AI</span>
        <p className="ai-summary__short">{summary.shortSummary}</p>
      </div>
    );
  }

  return (
    <div className={`ai-summary ${isExpanded ? 'ai-summary--expanded' : ''}`}>
      <div
        className="ai-summary__header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
      >
        <span className="ai-summary__badge">AI 요약</span>
        <span className="ai-summary__toggle">
          {isExpanded ? '접기' : '펼치기'}
        </span>
      </div>

      {isExpanded && (
        <div className="ai-summary__content">
          <p className="ai-summary__short">{summary.shortSummary}</p>

          {summary.bulletSummary.length > 0 && (
            <ul className="ai-summary__bullets">
              {summary.bulletSummary.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          )}

          <div className="ai-summary__meta">
            <span className="ai-summary__model">
              모델: {summary.model}
            </span>
            <span className="ai-summary__date">
              생성: {new Date(summary.generatedAt).toLocaleDateString('ko-KR')}
            </span>
            {showRegenerate && (
              <button
                onClick={() => processPost(true)}
                disabled={isProcessing}
                className="ai-summary__regenerate-btn"
              >
                {isProcessing ? '재생성 중...' : '재생성'}
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        .ai-summary {
          background: var(--color-surface, #f8f9fa);
          border: 1px solid var(--color-border, #e9ecef);
          border-radius: 8px;
          margin: 16px 0;
          font-size: 14px;
        }

        .ai-summary--loading,
        .ai-summary--empty {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-text-secondary, #6c757d);
        }

        .ai-summary__spinner {
          width: 16px;
          height: 16px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .ai-summary__header {
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }

        .ai-summary__badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .ai-summary__toggle {
          color: var(--color-primary, #0066cc);
          font-size: 12px;
        }

        .ai-summary__content {
          padding: 0 16px 16px;
          border-top: 1px solid var(--color-border, #e9ecef);
        }

        .ai-summary__short {
          margin: 12px 0;
          color: var(--color-text, #212529);
          line-height: 1.6;
        }

        .ai-summary__bullets {
          margin: 12px 0;
          padding-left: 20px;
        }

        .ai-summary__bullets li {
          margin: 6px 0;
          color: var(--color-text-secondary, #6c757d);
          line-height: 1.5;
        }

        .ai-summary__meta {
          display: flex;
          gap: 16px;
          align-items: center;
          font-size: 12px;
          color: var(--color-text-tertiary, #adb5bd);
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed var(--color-border, #e9ecef);
        }

        .ai-summary__generate-btn,
        .ai-summary__regenerate-btn {
          padding: 6px 12px;
          background: var(--color-primary, #0066cc);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .ai-summary__generate-btn:disabled,
        .ai-summary__regenerate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ai-summary__regenerate-btn {
          background: transparent;
          color: var(--color-primary, #0066cc);
          border: 1px solid currentColor;
          margin-left: auto;
        }

        /* Compact mode */
        .ai-summary--compact {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 12px;
          background: transparent;
          border: none;
        }

        .ai-summary--compact .ai-summary__badge {
          flex-shrink: 0;
          font-size: 10px;
          padding: 1px 6px;
        }

        .ai-summary--compact .ai-summary__short {
          margin: 0;
          font-size: 13px;
          color: var(--color-text-secondary, #6c757d);
        }
      `}</style>
    </div>
  );
}

export default AISummary;
