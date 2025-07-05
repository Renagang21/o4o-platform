import React from 'react';
import { Link } from 'react-router-dom';
import { TestBanner } from '../../types/testData';
import Card from '../common/Card';
import Badge from '../common/Badge';

interface TestBannerGridProps {
  banners: TestBanner[];
  title?: string;
  description?: string;
}

const TestBannerGrid: React.FC<TestBannerGridProps> = ({ 
  banners, 
  title = '테스트 기능 바로가기',
  description = '각 기능을 클릭하여 테스트를 시작하세요'
}) => {
  const featureBanners = banners.filter(b => b.category === 'feature');
  const utilityBanners = banners.filter(b => b.category === 'utility');

  return (
    <section className="py-16 bg-[#ecf0f3]">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-4 tracking-tight">
            {title}
          </h2>
          <p className="text-lg text-gray-600 font-light max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        {/* 주요 기능 테스트 */}
        <div className="mb-12">
          <h3 className="text-xl font-medium text-gray-800 mb-6">주요 기능 테스트</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureBanners.map((banner) => (
              <Card
                key={banner.id}
                variant="elevated"
                hoverable
                className="relative overflow-hidden"
              >
                <div className="flex items-start space-x-4">
                  <div className="text-3xl flex-shrink-0">{banner.icon}</div>
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900 mb-1">
                      {banner.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {banner.description}
                    </p>
                    <div className="flex items-center justify-between">
                      {banner.status === 'active' ? (
                        <Link
                          to={banner.path}
                          className="text-[#5787c5] hover:text-[#4a73a8] text-sm font-medium uppercase tracking-wide transition-colors"
                        >
                          테스트 시작 →
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-sm font-medium uppercase tracking-wide">
                          준비중
                        </span>
                      )}
                      <Badge
                        variant={banner.status === 'active' ? 'success' : 'secondary'}
                        size="sm"
                      >
                        {banner.status === 'active' ? '사용 가능' : '개발 중'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 유틸리티 도구 */}
        <div>
          <h3 className="text-xl font-medium text-gray-800 mb-6">관리자 도구</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {utilityBanners.map((banner) => (
              <Card
                key={banner.id}
                variant="default"
                hoverable
                className="relative overflow-hidden"
              >
                <div className="flex items-start space-x-4">
                  <div className="text-3xl flex-shrink-0">{banner.icon}</div>
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900 mb-1">
                      {banner.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {banner.description}
                    </p>
                    <Link
                      to={banner.path}
                      className="text-[#5787c5] hover:text-[#4a73a8] text-sm font-medium uppercase tracking-wide transition-colors"
                    >
                      바로가기 →
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestBannerGrid;