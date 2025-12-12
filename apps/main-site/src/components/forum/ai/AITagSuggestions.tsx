/**
 * AITagSuggestions - Display and approve AI-suggested tags
 * Phase 16: AI Summary & Auto-Tagging
 */

'use client';

import { useState, useEffect } from 'react';
import { useForumAI, type ForumPostAIMeta } from '@/hooks/useForumAI';

interface AITagSuggestionsProps {
  postId: string;
  /** Pre-loaded AI metadata (optional) */
  initialData?: ForumPostAIMeta | null;
  /** Callback when tags are applied */
  onTagsApplied?: (tags: string[]) => void;
  /** Show only if user can approve (author/admin) */
  canApprove?: boolean;
  /** Domain for domain-specific tags display */
  domain?: 'cosmetics' | 'yaksa' | 'general';
}

export function AITagSuggestions({
  postId,
  initialData,
  onTagsApplied,
  canApprove = false,
  domain = 'general',
}: AITagSuggestionsProps) {
  const { aiMeta, loading, fetchAIMeta, applyTags } = useForumAI({ postId });
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

  // Use initial data or fetched data
  const data = aiMeta || initialData;

  // Fetch if no initial data
  useEffect(() => {
    if (!initialData && postId) {
      fetchAIMeta();
    }
  }, [postId, initialData, fetchAIMeta]);

  // Initialize selected tags
  useEffect(() => {
    if (data?.tags?.suggestedTags) {
      setSelectedTags(new Set(data.tags.suggestedTags));
    }
  }, [data?.tags?.suggestedTags]);

  // Loading state
  if (loading && !data) {
    return null;
  }

  // No tags available
  if (!data?.tags?.suggestedTags?.length) {
    return null;
  }

  // Already approved
  if (data.tagsApproved) {
    return (
      <div className="ai-tags ai-tags--approved">
        <span className="ai-tags__badge">AI 태그 적용됨</span>
        <span className="ai-tags__approved-date">
          {data.tagsApprovedAt
            ? new Date(data.tagsApprovedAt).toLocaleDateString('ko-KR')
            : ''}
        </span>
      </div>
    );
  }

  const { tags } = data;
  const confidencePercent = Math.round(tags.confidence * 100);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const handleApply = async () => {
    if (selectedTags.size === 0) return;

    setIsApplying(true);
    try {
      const tagsArray = Array.from(selectedTags);
      const success = await applyTags(tagsArray);
      if (success && onTagsApplied) {
        onTagsApplied(tagsArray);
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="ai-tags">
      <div className="ai-tags__header">
        <span className="ai-tags__badge">AI 태그 제안</span>
        <span className="ai-tags__confidence">
          신뢰도: {confidencePercent}%
        </span>
      </div>

      <div className="ai-tags__list">
        {tags.suggestedTags.map(tag => (
          <button
            key={tag}
            className={`ai-tags__tag ${selectedTags.has(tag) ? 'ai-tags__tag--selected' : ''}`}
            onClick={() => canApprove && toggleTag(tag)}
            disabled={!canApprove}
          >
            {tag}
          </button>
        ))}
      </div>

      {tags.suggestedCategory && (
        <div className="ai-tags__category">
          추천 카테고리: <strong>{tags.suggestedCategory}</strong>
        </div>
      )}

      {/* Domain-specific tags */}
      {domain === 'cosmetics' && tags.cosmeticsTags && (
        <div className="ai-tags__domain">
          <div className="ai-tags__domain-title">화장품 분석</div>
          {tags.cosmeticsTags.skinType && (
            <span className="ai-tags__domain-tag">
              피부타입: {tags.cosmeticsTags.skinType}
            </span>
          )}
          {tags.cosmeticsTags.concerns?.map(concern => (
            <span key={concern} className="ai-tags__domain-tag">
              {concern}
            </span>
          ))}
        </div>
      )}

      {domain === 'yaksa' && tags.yaksaTags && (
        <div className="ai-tags__domain">
          <div className="ai-tags__domain-title">문서 분석</div>
          {tags.yaksaTags.documentType && (
            <span className="ai-tags__domain-tag">
              문서유형: {tags.yaksaTags.documentType}
            </span>
          )}
          {tags.yaksaTags.isOrganizational && (
            <span className="ai-tags__domain-tag">조직 문서</span>
          )}
          {tags.yaksaTags.topics?.map(topic => (
            <span key={topic} className="ai-tags__domain-tag">
              {topic}
            </span>
          ))}
        </div>
      )}

      {canApprove && (
        <div className="ai-tags__actions">
          <button
            onClick={handleApply}
            disabled={isApplying || selectedTags.size === 0}
            className="ai-tags__apply-btn"
          >
            {isApplying ? '적용 중...' : `선택 태그 적용 (${selectedTags.size})`}
          </button>
        </div>
      )}

      <style>{`
        .ai-tags {
          background: var(--color-surface, #f8f9fa);
          border: 1px solid var(--color-border, #e9ecef);
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          font-size: 14px;
        }

        .ai-tags--approved {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--color-success-bg, #d4edda);
          border-color: var(--color-success-border, #c3e6cb);
        }

        .ai-tags__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .ai-tags__badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .ai-tags__confidence {
          font-size: 12px;
          color: var(--color-text-secondary, #6c757d);
        }

        .ai-tags__list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .ai-tags__tag {
          padding: 4px 12px;
          background: white;
          border: 1px solid var(--color-border, #dee2e6);
          border-radius: 16px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ai-tags__tag:hover:not(:disabled) {
          border-color: var(--color-primary, #0066cc);
        }

        .ai-tags__tag--selected {
          background: var(--color-primary, #0066cc);
          color: white;
          border-color: var(--color-primary, #0066cc);
        }

        .ai-tags__tag:disabled {
          cursor: default;
          opacity: 0.8;
        }

        .ai-tags__category {
          font-size: 13px;
          color: var(--color-text-secondary, #6c757d);
          margin-bottom: 12px;
        }

        .ai-tags__domain {
          background: white;
          border: 1px dashed var(--color-border, #dee2e6);
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .ai-tags__domain-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary, #6c757d);
          margin-bottom: 8px;
        }

        .ai-tags__domain-tag {
          display: inline-block;
          padding: 2px 8px;
          background: var(--color-surface, #f8f9fa);
          border-radius: 4px;
          font-size: 12px;
          margin-right: 6px;
          margin-bottom: 4px;
        }

        .ai-tags__actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 12px;
          border-top: 1px solid var(--color-border, #e9ecef);
        }

        .ai-tags__apply-btn {
          padding: 8px 16px;
          background: var(--color-primary, #0066cc);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
        }

        .ai-tags__apply-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ai-tags__approved-date {
          font-size: 12px;
          color: var(--color-success, #28a745);
        }
      `}</style>
    </div>
  );
}

export default AITagSuggestions;
