import { FC } from 'react';

interface TrustDetails {
  verified: boolean;
  expertReviewed: boolean;
  userRating: number;
  certifications: string[];
  quality?: number;
  safety?: number;
  satisfaction?: number;
  expert?: number;
}

interface TrustIndicatorProps {
  score: number;
  type: 'product' | 'supplier' | 'project' | 'partner';
  details: TrustDetails;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
}

const TrustIndicator: FC<TrustIndicatorProps> = ({
  score,
  type,
  details,
  size = 'medium',
  showDetails = true
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'p-3 text-sm';
      case 'large':
        return 'p-6 text-lg';
      default:
        return 'p-4 text-base';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-trust-verified';
    if (score >= 70) return 'text-trust-pending';
    if (score >= 50) return 'text-trust-unverified';
    return 'text-trust-warning';
  };

  const getProgressColor = (value: number) => {
    if (value >= 90) return 'bg-trust-verified';
    if (value >= 70) return 'bg-trust-pending';
    if (value >= 50) return 'bg-trust-unverified';
    return 'bg-trust-warning';
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - Math.ceil(rating);

    return (
      <div className="flex items-center space-x-1">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400">⭐</span>
        ))}
        {/* Half star */}
        {hasHalfStar && <span className="text-yellow-400">⭐</span>}
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300">⭐</span>
        ))}
        <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  const renderProgressBar = (label: string, value: number) => (
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-gray-700">{label}:</span>
      <div className="flex items-center space-x-2">
        <div className="w-24 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(value)}`}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-sm font-medium">{value}%</span>
      </div>
    </div>
  );

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${getSizeClasses()}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
            신뢰도 점수: {score}점
          </div>
          {details.verified && (
            <div className="flex items-center space-x-1 text-trust-verified">
              <span className="text-sm">🏆</span>
              <span className="text-sm font-medium">전문가 인증</span>
            </div>
          )}
        </div>
      </div>

      {/* 별점 표시 */}
      <div className="mb-4">
        {renderStars(details.userRating)}
      </div>

      {showDetails && (
        <>
          {/* 세부 평가 */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">📊 세부 평가</h4>
            {details.quality && renderProgressBar('품질 검증', details.quality)}
            {details.safety && renderProgressBar('안전성 평가', details.safety)}
            {details.satisfaction && renderProgressBar('사용자 만족', details.satisfaction)}
            {details.expert && renderProgressBar('전문가 평가', details.expert)}
          </div>

          {/* 인증 배지 */}
          {details.certifications && details.certifications.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">🏅 인증 마크</h4>
              <div className="flex flex-wrap gap-2">
                {details.certifications.map((cert, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-trust-verified bg-opacity-10 text-trust-verified"
                  >
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 검증 상태 */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">검증 상태:</span>
              <div className="flex items-center space-x-1">
                {details.verified ? (
                  <>
                    <span className="w-2 h-2 bg-trust-verified rounded-full"></span>
                    <span className="text-trust-verified font-medium">검증 완료</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-trust-pending rounded-full"></span>
                    <span className="text-trust-pending font-medium">검증 중</span>
                  </>
                )}
              </div>
            </div>
            {details.expertReviewed && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">전문가 검토:</span>
                <span className="text-trust-verified font-medium">완료</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TrustIndicator;