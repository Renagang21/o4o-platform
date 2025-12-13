/**
 * ContentBundleViewer Component
 *
 * LMS Core ContentBundle 뷰어
 * - 콘텐츠 아이템 순서대로 렌더링
 * - Quiz/Survey 실행
 * - Engagement Logging 자동 연동
 *
 * Usage:
 * <ContentBundleViewer bundle={bundle} />
 */

import { useEffect, useState, useCallback } from 'react';
import { ContentItemRenderer, type ContentItem } from './ContentItemRenderer';
import { engagementApi } from '@/lib/api/engagementApi';

// ContentBundle type
export interface ContentBundle {
  id: string;
  title: string;
  description?: string;
  type: 'marketing' | 'education' | 'product_info' | 'announcement' | 'general';
  status: 'draft' | 'published' | 'archived';
  thumbnailUrl?: string;
  items: ContentItem[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

interface ContentBundleViewerProps {
  bundle: ContentBundle;
  autoLogView?: boolean;
  showHeader?: boolean;
  showProgress?: boolean;
  onComplete?: () => void;
  onQuizComplete?: (attempt: any) => void;
  onSurveyComplete?: (response: any) => void;
}

export function ContentBundleViewer({
  bundle,
  autoLogView = true,
  showHeader = true,
  showProgress = true,
  onComplete,
  onQuizComplete,
  onSurveyComplete,
}: ContentBundleViewerProps) {
  const [viewLogged, setViewLogged] = useState(false);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [viewStartTime] = useState(Date.now());

  // Sort items by order
  const sortedItems = [...bundle.items].sort((a, b) => a.order - b.order);
  const totalItems = sortedItems.length;
  const completedCount = completedItems.size;
  const progressPercent = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  // Log view on mount
  useEffect(() => {
    if (autoLogView && !viewLogged) {
      engagementApi.logView(bundle.id, {
        pageTitle: bundle.title,
        referrer: document.referrer,
      }).catch(console.error);
      setViewLogged(true);
    }
  }, [bundle.id, autoLogView, viewLogged]);

  // Check completion
  useEffect(() => {
    if (completedCount === totalItems && totalItems > 0) {
      const timeSpent = Math.floor((Date.now() - viewStartTime) / 1000);
      engagementApi.logComplete(bundle.id, undefined, {
        timeSpent,
        completedAt: new Date().toISOString(),
      }).catch(console.error);
      onComplete?.();
    }
  }, [completedCount, totalItems, bundle.id, viewStartTime, onComplete]);

  // Handle item click (for engagement logging)
  const handleItemClick = useCallback(
    (elementId: string) => {
      engagementApi.logClick(bundle.id, elementId).catch(console.error);
    },
    [bundle.id]
  );

  // Handle quiz completion
  const handleQuizComplete = useCallback(
    (attempt: any) => {
      const item = sortedItems.find((i) => i.quiz?.id === attempt.quizId);
      if (item) {
        setCompletedItems((prev) => new Set([...prev, item.id]));
      }
      onQuizComplete?.(attempt);
    },
    [sortedItems, onQuizComplete]
  );

  // Handle survey completion
  const handleSurveyComplete = useCallback(
    (response: any) => {
      const item = sortedItems.find((i) => i.survey?.id === response.surveyId);
      if (item) {
        setCompletedItems((prev) => new Set([...prev, item.id]));
      }
      onSurveyComplete?.(response);
    },
    [sortedItems, onSurveyComplete]
  );

  // Mark non-interactive items as completed when scrolled into view
  const handleItemVisible = useCallback((itemId: string, itemType: string) => {
    // Only auto-complete non-interactive items
    if (!['quiz', 'survey'].includes(itemType)) {
      setCompletedItems((prev) => new Set([...prev, itemId]));
    }
  }, []);

  return (
    <div className="content-bundle-viewer">
      {/* Header */}
      {showHeader && (
        <div className="mb-6">
          {bundle.thumbnailUrl && (
            <div className="aspect-video mb-4 rounded-lg overflow-hidden">
              <img
                src={bundle.thumbnailUrl}
                alt={bundle.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {bundle.title}
          </h1>
          {bundle.description && (
            <p className="text-gray-600 text-lg">{bundle.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1">
              <TypeBadge type={bundle.type} />
            </span>
            {bundle.publishedAt && (
              <span>
                {new Date(bundle.publishedAt).toLocaleDateString('ko-KR')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {showProgress && totalItems > 0 && (
        <div className="mb-6 bg-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>진행률</span>
            <span>{completedCount} / {totalItems} 완료</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Content items */}
      <div className="space-y-8">
        {sortedItems.map((item, index) => (
          <ContentItemObserver
            key={item.id}
            itemId={item.id}
            itemType={item.type}
            onVisible={handleItemVisible}
          >
            <div
              className={`content-item ${
                completedItems.has(item.id) ? 'completed' : ''
              }`}
            >
              {/* Item number indicator for sequential content */}
              {totalItems > 1 && !['quiz', 'survey'].includes(item.type) && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                    {index + 1}
                  </span>
                  {completedItems.has(item.id) && (
                    <span className="text-green-600 text-sm">✓ 확인됨</span>
                  )}
                </div>
              )}

              <ContentItemRenderer
                item={item}
                bundleId={bundle.id}
                onQuizComplete={handleQuizComplete}
                onSurveyComplete={handleSurveyComplete}
                onClick={handleItemClick}
              />
            </div>
          </ContentItemObserver>
        ))}
      </div>

      {/* Completion message */}
      {completedCount === totalItems && totalItems > 0 && (
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
            <span className="text-2xl">🎉</span>
          </div>
          <h3 className="text-lg font-semibold text-green-800 mb-1">
            모든 콘텐츠를 완료했습니다!
          </h3>
          <p className="text-green-600 text-sm">
            학습을 완료해 주셔서 감사합니다.
          </p>
        </div>
      )}
    </div>
  );
}

// Type badge component
function TypeBadge({ type }: { type: ContentBundle['type'] }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    marketing: { bg: 'bg-purple-100', text: 'text-purple-700', label: '마케팅' },
    education: { bg: 'bg-blue-100', text: 'text-blue-700', label: '교육' },
    product_info: { bg: 'bg-orange-100', text: 'text-orange-700', label: '제품정보' },
    announcement: { bg: 'bg-red-100', text: 'text-red-700', label: '공지' },
    general: { bg: 'bg-gray-100', text: 'text-gray-700', label: '일반' },
  };

  const style = styles[type] || styles.general;

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

// Intersection Observer wrapper for tracking item visibility
interface ContentItemObserverProps {
  itemId: string;
  itemType: string;
  onVisible: (itemId: string, itemType: string) => void;
  children: React.ReactNode;
}

function ContentItemObserver({
  itemId,
  itemType,
  onVisible,
  children,
}: ContentItemObserverProps) {
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    if (hasBeenVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setHasBeenVisible(true);
            onVisible(itemId, itemType);
          }
        });
      },
      { threshold: 0.5 }
    );

    const element = document.getElementById(`content-item-${itemId}`);
    if (element) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [itemId, itemType, onVisible, hasBeenVisible]);

  return <div id={`content-item-${itemId}`}>{children}</div>;
}

export default ContentBundleViewer;
