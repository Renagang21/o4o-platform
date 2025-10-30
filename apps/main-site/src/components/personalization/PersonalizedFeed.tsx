/**
 * 개인화된 피드 컴포넌트
 *
 * - 메인 카드 그리드 표시
 * - 스켈레톤 로딩
 * - 이벤트 추적
 */

import React, { useEffect } from 'react';
import { ContentCard } from '../../types/personalization';
import { trackEvent } from '../../utils/analytics';
import { trackCardExecution } from '../../services/signalTracker';

interface PersonalizedFeedProps {
  cards: ContentCard[];
  role: string;
  isLoading?: boolean;
}

export const PersonalizedFeed: React.FC<PersonalizedFeedProps> = ({
  cards,
  role,
  isLoading = false
}) => {
  // 피드 로드 이벤트
  useEffect(() => {
    if (!isLoading && cards.length > 0) {
      trackEvent('feed_loaded', {
        role,
        itemCount: cards.length,
        from: 'rules'
      });
    }
  }, [isLoading, cards.length, role]);

  // 카드 impression 추적
  useEffect(() => {
    if (!isLoading) {
      cards.forEach((card, index) => {
        trackEvent('card_impression', {
          role,
          cardId: card.id,
          pos: index
        });
      });
    }
  }, [isLoading, cards, role]);

  // 카드 클릭 핸들러
  const handleCardClick = (card: ContentCard, index: number) => {
    trackEvent('card_click', {
      role,
      cardId: card.id,
      pos: index
    });
    trackCardExecution(card.id);
  };

  if (isLoading) {
    return (
      <div className="personalized-feed">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="personalized-feed">
        <div className="text-center py-12 text-gray-500">
          <p>표시할 콘텐츠가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="personalized-feed">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            data-card-id={card.id}
          >
            {/* 배지 */}
            {card.badge && (
              <span
                className={`inline-block px-2 py-1 text-xs font-semibold text-white rounded mb-3 ${
                  card.badge.variant === 'urgent'
                    ? 'bg-red-500'
                    : card.badge.variant === 'new'
                    ? 'bg-blue-500'
                    : card.badge.variant === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-gray-500'
                }`}
              >
                {card.badge.text}
              </span>
            )}

            {/* 제목 */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{card.description}</p>

            {/* 액션 버튼 */}
            {card.action && (
              <a
                href={card.action.url}
                onClick={() => handleCardClick(card, index)}
                className={`inline-block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  card.action.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {card.action.label}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonalizedFeed;
