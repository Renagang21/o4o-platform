import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Monitor, Play, Pause, Upload, 
  Settings, Eye, Tv, RefreshCw, Clock 
} from 'lucide-react';
import { Navbar, BetaFeedbackWidget, EnhancedBetaFeedbackWidget } from '@o4o/ui';

interface SignageContent {
  id: string;
  title: string;
  type: 'video' | 'image' | 'slideshow';
  url: string;
  thumbnail: string;
  duration?: number;
  createdAt: string;
  isActive: boolean;
}

const SignageDashboard: React.FC = () => {
  const [contents, setContents] = useState<SignageContent[]>([]);
  const [currentDisplay, setCurrentDisplay] = useState<SignageContent | null>(null);
  const [displayStatus, setDisplayStatus] = useState<'playing' | 'paused' | 'stopped'>('stopped');

  // 모의 데이터 로드
  useEffect(() => {
    const mockContents: SignageContent[] = [
      {
        id: '1',
        title: '매장 환영 동영상',
        type: 'video',
        url: '/signage/videos/welcome.mp4',
        thumbnail: '/signage/thumbnails/welcome.jpg',
        duration: 120,
        createdAt: '2025-01-20',
        isActive: true
      },
      {
        id: '2', 
        title: '신제품 프로모션',
        type: 'slideshow',
        url: '/signage/slides/promotion',
        thumbnail: '/signage/thumbnails/promotion.jpg',
        duration: 180,
        createdAt: '2025-01-19',
        isActive: false
      },
      {
        id: '3',
        title: '매장 안내사항',
        type: 'image',
        url: '/signage/images/notice.jpg',
        thumbnail: '/signage/thumbnails/notice.jpg',
        createdAt: '2025-01-18', 
        isActive: false
      }
    ];

    setContents(mockContents);
    setCurrentDisplay(mockContents.find(c => c.isActive) || null);
    setDisplayStatus(mockContents.find(c => c.isActive) ? 'playing' : 'stopped');
  }, []);

  const handleContentSelect = (content: SignageContent) => {
    // 이전 활성 콘텐츠 비활성화
    setContents(prev => prev.map(c => ({ ...c, isActive: false })));
    
    // 새 콘텐츠 활성화
    setContents(prev => prev.map(c => 
      c.id === content.id ? { ...c, isActive: true } : c
    ));
    
    setCurrentDisplay(content);
    setDisplayStatus('playing');
    
    // 실제로는 여기서 TV 디스플레이 업데이트 API 호출
    console.log('🖥️ TV 디스플레이 업데이트:', content.title);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                메인으로
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-bold text-gray-900">📺 디지털 사이니지</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                to="/signage/tv"
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Tv className="w-4 h-4" />
                TV 화면 보기
              </Link>
              <Link
                to="/signage/content/upload"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                콘텐츠 추가
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 현재 디스플레이 상태 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Monitor className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">현재 디스플레이</h2>
              </div>
              
              {currentDisplay ? (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={currentDisplay.thumbnail}
                      alt={currentDisplay.title}
                      className="w-full h-40 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/api/placeholder/400/200';
                      }}
                    />
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                      displayStatus === 'playing' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-500 text-white'
                    }`}>
                      {displayStatus === 'playing' ? '재생 중' : '정지'}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900">{currentDisplay.title}</h3>
                    <p className="text-sm text-gray-600 capitalize">{currentDisplay.type}</p>
                    {currentDisplay.duration && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Clock className="w-4 h-4" />
                        {Math.floor(currentDisplay.duration / 60)}분 {currentDisplay.duration % 60}초
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setDisplayStatus(displayStatus === 'playing' ? 'paused' : 'playing')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        displayStatus === 'playing'
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {displayStatus === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {displayStatus === 'playing' ? '일시정지' : '재생'}
                    </button>
                    
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      <RefreshCw className="w-4 h-4" />
                      새로고침
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">표시할 콘텐츠를 선택하세요</p>
                </div>
              )}
            </div>
            
            {/* 빠른 액션 */}
            <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">빠른 액션</h3>
              <div className="space-y-3">
                <Link
                  to="/signage/tv" 
                  target="_blank"
                  className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Eye className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">TV 화면 확인</span>
                </Link>
                
                <Link
                  to="/signage/content"
                  className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Settings className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">콘텐츠 관리</span>
                </Link>
              </div>
            </div>
          </div>
          
          {/* 콘텐츠 목록 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">콘텐츠 목록</h2>
                <div className="text-sm text-gray-500">
                  총 {contents.length}개 콘텐츠
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {contents.map((content) => (
                  <div
                    key={content.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      content.isActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleContentSelect(content)}
                  >
                    <div className="relative">
                      <img
                        src={content.thumbnail}
                        alt={content.title}
                        className="w-full h-32 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/api/placeholder/300/200';
                        }}
                      />
                      
                      {content.isActive && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                          재생 중
                        </div>
                      )}
                      
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                        {content.type === 'video' && '동영상'}
                        {content.type === 'image' && '이미지'}
                        {content.type === 'slideshow' && '슬라이드쇼'}
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <h3 className="font-semibold text-gray-900 truncate">{content.title}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-500">{content.createdAt}</span>
                        {content.duration && (
                          <span className="text-sm text-gray-500">
                            {Math.floor(content.duration / 60)}:{(content.duration % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContentSelect(content);
                        }}
                        className={`flex-1 py-2 px-3 rounded font-medium text-sm transition-colors ${
                          content.isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {content.isActive ? '재생 중' : 'TV에 표시'}
                      </button>
                      
                      <Link
                        to={`/signage/content/edit/${content.id}`}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Settings className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
                
                {/* 새 콘텐츠 추가 카드 */}
                <Link
                  to="/signage/content/upload"
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center h-64 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <span className="font-medium text-gray-600">새 콘텐츠 추가</span>
                  <span className="text-sm text-gray-500 mt-1">동영상, 이미지, 슬라이드쇼</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Beta Feedback Widget with Live Support */}
      <EnhancedBetaFeedbackWidget 
        page="signage-dashboard" 
        feature="signage_management"
      />
    </div>
  );
};

export default SignageDashboard;
