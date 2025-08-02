import { useState, FC } from 'react';

type ResourceType = 'youtube' | 'blog' | 'article' | 'social' | 'document' | 'external';

interface ExternalResource {
  id: string;
  type: ResourceType;
  title: string;
  url: string;
  thumbnail?: string;
  description?: string;
  author?: string;
  publishedDate?: string;
  verified: boolean;
  relevanceScore: number;
  language: string;
  viewCount?: number;
  duration?: string; // for videos
  rating?: number;
  tags?: string[];
}

interface ExternalResourceWidgetProps {
  resource: ExternalResource;
  size?: 'small' | 'medium' | 'large';
  showMetadata?: boolean;
  allowEmbedding?: boolean;
  onAction?: (action: 'view' | 'bookmark' | 'report' | 'share') => void;
}

const ExternalResourceWidget: FC<ExternalResourceWidgetProps> = ({
  resource,
  size = 'medium',
  showMetadata = true,
  allowEmbedding = false,
  onAction
}) => {
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getTypeIcon = (type: ResourceType): string => {
    switch (type) {
      case 'youtube':
        return '🎬';
      case 'blog':
        return '📝';
      case 'article':
        return '📰';
      case 'social':
        return '📱';
      case 'document':
        return '📄';
      default:
        return '🌐';
    }
  };

  const getTypeLabel = (type: ResourceType): string => {
    switch (type) {
      case 'youtube':
        return '유튜브';
      case 'blog':
        return '블로그';
      case 'article':
        return '기사';
      case 'social':
        return 'SNS';
      case 'document':
        return '문서';
      default:
        return '외부 링크';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'p-3';
      case 'large':
        return 'p-6';
      default:
        return 'p-4';
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 90) return 'text-trust-verified bg-trust-verified';
    if (score >= 70) return 'text-trust-pending bg-trust-pending';
    return 'text-trust-unverified bg-trust-unverified';
  };

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDuration = (duration: string): string => {
    // Assuming duration is in MM:SS or HH:MM:SS format
    return duration;
  };

  const handleAction = (action: 'view' | 'bookmark' | 'report' | 'share') => {
    onAction?.(action);
    
    if (action === 'view') {
      if (allowEmbedding && resource.type === 'youtube') {
        setIsEmbedded(!isEmbedded);
      } else {
        window.open(resource.url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - Math.ceil(rating);

    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: fullStars }).map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400 text-sm">⭐</span>
        ))}
        {hasHalfStar && <span className="text-yellow-400 text-sm">⭐</span>}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300 text-sm">⭐</span>
        ))}
        <span className="ml-1 text-xs text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  const getYouTubeEmbedUrl = (url: string): string => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${getSizeClasses()}`}>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getTypeIcon(resource.type)}</span>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">
                {getTypeLabel(resource.type)}
              </span>
              {resource.verified && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-trust-verified bg-opacity-10 text-trust-verified">
                  ✅ 검증됨
                </span>
              )}
            </div>
            {resource.author && (
              <p className="text-xs text-gray-500">{resource.author}</p>
            )}
          </div>
        </div>
        
        {/* 연관성 점수 */}
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRelevanceColor(resource.relevanceScore)} bg-opacity-10`}>
          📊 {resource.relevanceScore}%
        </div>
      </div>

      {/* 제목 */}
      <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {resource.title}
      </h4>

      {/* 썸네일 또는 임베드 */}
      <div className="mb-3">
        {isEmbedded && resource.type === 'youtube' ? (
          <div className="aspect-video">
            <iframe
              src={getYouTubeEmbedUrl(resource.url)}
              title={resource.title}
              className="w-full h-full rounded-lg"
              allowFullScreen
            />
          </div>
        ) : resource.thumbnail && !imageError ? (
          <div className="relative group">
            <img
              src={resource.thumbnail}
              alt={resource.title}
              className="w-full h-40 object-cover rounded-lg"
              onError={() => setImageError(true)}
            />
            {resource.type === 'youtube' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg group-hover:bg-opacity-40 transition-all">
                <button
                  onClick={() => handleAction('view')}
                  className="flex items-center justify-center w-12 h-12 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                >
                  ▶️
                </button>
              </div>
            )}
            {resource.duration && (
              <span className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-75 text-white text-xs rounded">
                {formatDuration(resource.duration)}
              </span>
            )}
          </div>
        ) : (
          <div className="w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <span className="text-2xl">{getTypeIcon(resource.type)}</span>
              <p className="text-sm mt-1">미리보기 없음</p>
            </div>
          </div>
        )}
      </div>

      {/* 설명 */}
      {resource.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {resource.description}
        </p>
      )}

      {/* 메타데이터 */}
      {showMetadata && (
        <div className="space-y-2 mb-4">
          {/* 평점 */}
          {resource.rating && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">평점:</span>
              {renderStars(resource.rating)}
            </div>
          )}

          {/* 조회수 및 날짜 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              {resource.viewCount && (
                <span>📈 조회수 {formatViewCount(resource.viewCount)}</span>
              )}
              {resource.publishedDate && (
                <span>📅 {resource.publishedDate}</span>
              )}
            </div>
            <span>{resource.language.toUpperCase()}</span>
          </div>

          {/* 태그 */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {resource.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                >
                  #{tag}
                </span>
              ))}
              {resource.tags.length > 3 && (
                <span className="text-xs text-gray-500">+{resource.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 액션 버튼들 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleAction('view')}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-o4o-primary-500 rounded-md hover:bg-o4o-primary-600 transition-colors"
          >
            {allowEmbedding && resource.type === 'youtube' && !isEmbedded ? '재생하기' : '원본 보기'}
          </button>
          
          {allowEmbedding && resource.type === 'youtube' && (
            <button
              onClick={() => setIsEmbedded(!isEmbedded)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              {isEmbedded ? '접기' : '여기서 보기'}
            </button>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleAction('bookmark')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="북마크"
          >
            🔖
          </button>
          <button
            onClick={() => handleAction('share')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="공유"
          >
            🔗
          </button>
          <button
            onClick={() => handleAction('report')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="부적절 신고"
          >
            🚫
          </button>
        </div>
      </div>
    </div>
  );
};

// 외부 리소스 리스트 컴포넌트
interface ExternalResourceListProps {
  resources: ExternalResource[];
  title?: string;
  maxItems?: number;
  groupByType?: boolean;
  onLoadMore?: () => void;
}

export const ExternalResourceList: FC<ExternalResourceListProps> = ({
  resources,
  title = "연관 리소스",
  maxItems,
  groupByType = false,
  onLoadMore
}) => {
  const [showAll, setShowAll] = useState(false);

  const displayedResources = showAll || !maxItems 
    ? resources 
    : resources.slice(0, maxItems);

  const groupedResources = groupByType 
    ? resources.reduce((acc, resource) => {
        if (!acc[resource.type]) acc[resource.type] = [];
        acc[resource.type].push(resource);
        return acc;
      }, {} as Record<ResourceType, ExternalResource[]>)
    : null;

  if (groupByType && groupedResources) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {Object.entries(groupedResources).map(([type, typeResources]) => (
          <div key={type}>
            <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center space-x-2">
              <span>{getTypeIcon(type as ResourceType)}</span>
              <span>{getTypeLabel(type as ResourceType)} ({typeResources.length}개)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {typeResources.map((resource) => (
                <ExternalResourceWidget 
                  key={resource.id} 
                  resource={resource}
                  size="small"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500">{resources.length}개 리소스</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedResources.map((resource) => (
          <ExternalResourceWidget 
            key={resource.id} 
            resource={resource}
          />
        ))}
      </div>

      {maxItems && resources.length > maxItems && !showAll && (
        <div className="text-center">
          <button
            onClick={() => setShowAll(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-o4o-primary-600 bg-o4o-primary-50 rounded-md hover:bg-o4o-primary-100 transition-colors"
          >
            더 보기 ({resources.length - maxItems}개 더)
          </button>
        </div>
      )}

      {onLoadMore && (
        <div className="text-center">
          <button
            onClick={onLoadMore}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            더 많은 리소스 불러오기
          </button>
        </div>
      )}
    </div>
  );
};

// 유틸리티 함수들을 별도로 export
export const getTypeIcon = (type: ResourceType): string => {
  switch (type) {
    case 'youtube': return '🎬';
    case 'blog': return '📝';
    case 'article': return '📰';
    case 'social': return '📱';
    case 'document': return '📄';
    default: return '🌐';
  }
};

export const getTypeLabel = (type: ResourceType): string => {
  switch (type) {
    case 'youtube': return '유튜브';
    case 'blog': return '블로그';
    case 'article': return '기사';
    case 'social': return 'SNS';
    case 'document': return '문서';
    default: return '외부 링크';
  }
};

export default ExternalResourceWidget;