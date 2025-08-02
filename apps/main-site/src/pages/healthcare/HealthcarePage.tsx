import { useState, useEffect, FC } from 'react';
import { HealthcareMainPage } from '@o4o/ui/healthcare';
import { Button } from '@o4o/ui';
import { Edit3, Save, RefreshCw } from 'lucide-react';

const HealthcarePage: FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
    if (isEditing && hasChanges) {
      // Simulate saving changes
      // console.log('Saving changes...');
      setHasChanges(false);
    }
  };

  const handleSaveChanges = () => {
    // Simulate API call to save changes
    // console.log('Saving changes...');
    setHasChanges(false);
    
    // Show success message (you can implement toast notifications)
    alert('변경사항이 저장되었습니다.');
  };

  const handleResetChanges = () => {
    // Reset to original state
    if (confirm('모든 변경사항을 취소하시겠습니까?')) {
      setHasChanges(false);
      // Force re-render by toggling edit mode
      setIsEditing(false);
      setTimeout(() => setIsEditing(true), 100);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header - Only visible in edit mode */}
      {isEditing && (
        <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-gray-900">
                  헬스케어 메인페이지 편집
                </h1>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${hasChanges ? 'bg-yellow-500' : 'bg-green-500'}`} />
                  <span className="text-sm text-gray-600">
                    {hasChanges ? '저장되지 않은 변경사항' : '모든 변경사항 저장됨'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {hasChanges && (
                  <Button
                    onClick={handleResetChanges}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    되돌리기
                  </Button>
                )}
                
                <Button
                  onClick={handleSaveChanges}
                  variant="default"
                  size="sm"
                  disabled={!hasChanges}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-1" />
                  저장
                </Button>
                
                <Button
                  onClick={handleToggleEdit}
                  variant="outline"
                  size="sm"
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  편집 종료
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Edit Mode Toggle - Only visible when not in edit mode */}
      {!isEditing && (
        <div className="fixed top-4 right-4 z-40">
          <Button
            onClick={handleToggleEdit}
            className="shadow-lg bg-blue-600 hover:bg-blue-700"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            페이지 편집
          </Button>
        </div>
      )}

      {/* Responsive Warning */}
      {isEditing && isMobile && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="flex items-center gap-2 text-yellow-800">
            <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-white text-xs font-bold">
              !
            </div>
            <p className="text-sm">
              모바일에서는 편집 기능이 제한됩니다. 더 나은 편집 경험을 위해 데스크톱을 사용해주세요.
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <HealthcareMainPage
        isEditing={isEditing}
        onToggleEdit={handleToggleEdit}
      />

      {/* SEO Meta Tags (for production) */}
      <div style={{ display: 'none' }}>
        <meta name="description" content="전문가가 검증한 건강 정보와 제품을 만나보세요. 의약품, 건강기능식품, 의료기기까지 신뢰할 수 있는 헬스케어 플랫폼입니다." />
        <meta name="keywords" content="헬스케어, 건강, 의약품, 건강기능식품, 의료기기, 뷰티, 웰니스" />
        <meta property="og:title" content="헬스케어 플랫폼 - 건강한 삶을 위한 첫걸음" />
        <meta property="og:description" content="전문가가 검증한 건강 정보와 제품을 만나보세요" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </div>
    </div>
  );
};

export { HealthcarePage };
export default HealthcarePage;