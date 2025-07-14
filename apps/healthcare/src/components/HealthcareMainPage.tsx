import React from 'react';

interface HealthcareMainPageProps {
  isEditing?: boolean;
  onToggleEdit?: () => void;
}

const HealthcareMainPage: React.FC<HealthcareMainPageProps> = ({ isEditing }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            O4O Healthcare Platform
          </h1>
          <div className="bg-white rounded-lg shadow-lg p-12">
            <div className="text-6xl mb-6">🏥</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              전문가가 검증한 건강 정보와 제품
            </h2>
            <p className="text-gray-600 mb-8">
              의약품, 건강기능식품, 의료기기까지<br />
              신뢰할 수 있는 헬스케어 플랫폼
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-blue-800 font-medium">
                🚧 현재 개발 중입니다
              </p>
              <p className="text-blue-600 text-sm mt-2">
                더 나은 서비스로 곧 찾아뵙겠습니다
              </p>
            </div>
            {isEditing && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800 text-sm">
                  편집 모드 활성화됨 - 향후 콘텐츠 관리 기능이 추가될 예정입니다
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { HealthcareMainPage };
export default HealthcareMainPage;