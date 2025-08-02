import { useState, useEffect, FC } from 'react';
import { HealthcareMainPage } from '@o4o/ui/healthcare';
import { Button, Card, CardContent } from '@o4o/ui';
import { Play, Pause, RotateCcw, Monitor, Smartphone, Tablet } from 'lucide-react';

const HealthcareDemo: FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [autoPlay, setAutoPlay] = useState(false);

  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleReset = () => {
    setIsEditing(false);
    setAutoPlay(false);
    // Force component re-render
    window.location.reload();
  };

  const getViewportClass = () => {
    switch (viewMode) {
      case 'mobile':
        return 'max-w-sm mx-auto';
      case 'tablet':
        return 'max-w-4xl mx-auto';
      default:
        return 'w-full';
    }
  };

  const getViewportIcon = () => {
    switch (viewMode) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    if (autoPlay) {
      const interval = setInterval(() => {
        setIsEditing(prev => !prev);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [autoPlay]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Demo Controls */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">
                Healthcare Platform Demo
              </h1>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isEditing ? 'bg-blue-500' : 'bg-green-500'}`} />
                <span className="text-sm text-gray-600">
                  {isEditing ? '편집 모드' : '미리보기 모드'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Viewport Controls */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  onClick={() => setViewMode('desktop')}
                  variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  className="px-2"
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setViewMode('tablet')}
                  variant={viewMode === 'tablet' ? 'default' : 'ghost'}
                  size="sm"
                  className="px-2"
                >
                  <Tablet className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setViewMode('mobile')}
                  variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  className="px-2"
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Demo Controls */}
              <Button
                onClick={() => setAutoPlay(!autoPlay)}
                variant={autoPlay ? 'default' : 'outline'}
                size="sm"
              >
                {autoPlay ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                자동 데모
              </Button>
              
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                리셋
              </Button>
              
              <Button
                onClick={handleToggleEdit}
                variant={isEditing ? 'default' : 'outline'}
                size="sm"
              >
                {getViewportIcon()}
                <span className="ml-2">
                  {isEditing ? '미리보기 모드' : '편집 모드'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Information */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-800 font-medium">
                헬스케어 플랫폼 메인페이지 데모
              </p>
              <p className="text-blue-600 text-sm">
                블록 기반 편집, 드래그 앤 드롭, 반응형 디자인을 테스트해보세요
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-800 text-sm font-medium">
                현재 뷰포트: {viewMode === 'desktop' ? '데스크톱' : viewMode === 'tablet' ? '태블릿' : '모바일'}
              </p>
              <p className="text-blue-600 text-xs">
                {viewMode === 'desktop' && 'Full width display'}
                {viewMode === 'tablet' && 'Max width: 896px'}
                {viewMode === 'mobile' && 'Max width: 384px'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Instructions */}
      {isEditing && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="container mx-auto">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">편집 모드 사용법</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-yellow-700">
                  <div>
                    <h4 className="font-medium mb-1">블록 편집</h4>
                    <p>각 블록의 '편집' 버튼을 클릭하여 내용을 수정하세요</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">드래그 앤 드롭</h4>
                    <p>블록을 드래그하여 순서를 변경할 수 있습니다</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">블록 관리</h4>
                    <p>우측 상단 아이콘으로 표시/숨김, 복제, 삭제 가능</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Main Demo Content */}
      <div className={`transition-all duration-300 ${getViewportClass()}`}>
        <HealthcareMainPage
          isEditing={isEditing}
          onToggleEdit={handleToggleEdit}
        />
      </div>
    </div>
  );
};

export default HealthcareDemo;