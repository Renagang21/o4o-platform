import { FC, useState, useEffect  } from 'react';
import { RefreshCw } from 'lucide-react';

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

const TVDisplay: FC = () => {
  const [currentContent, setCurrentContent] = useState<SignageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');

  // 활성 콘텐츠 로드
  const loadActiveContent = () => {
    setLoading(true);
    
    // 실제로는 API에서 데이터를 가져옴
    // 현재는 localStorage에서 모의 데이터 사용
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
      }
    ];

    const activeContent = mockContents.find(c => c.isActive);
    setCurrentContent(activeContent || null);
    setLastUpdate(new Date().toLocaleTimeString());
    setLoading(false);
  };

  useEffect(() => {
    loadActiveContent();
    
    // 30초마다 자동 새로고침 (수동 업데이트 확인)
    const interval = setInterval(loadActiveContent, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // 키보드 단축키 (F5: 새로고침, ESC: 설정 화면 표시)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        loadActiveContent();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <RefreshCw className="w-16 h-16 animate-spin mx-auto mb-4" />
          <p className="text-xl">콘텐츠 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!currentContent) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-8">
            <span className="text-6xl">📺</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">디지털 사이니지</h1>
          <p className="text-xl opacity-80 mb-8">표시할 콘텐츠를 선택해주세요</p>
          <p className="text-sm opacity-60">마지막 업데이트: {lastUpdate}</p>
          <p className="text-xs opacity-40 mt-2">F5키를 눌러 새로고침</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* 콘텐츠 표시 영역 */}
      <div className="w-full h-full flex items-center justify-center">
        {currentContent.type === 'video' && (
          <video
            key={currentContent.id}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            controls={false}
            onError={() => {
              console.error('비디오 로드 실패:', currentContent.url);
            }}
          >
            <source src={currentContent.url} type="video/mp4" />
            <div className="text-white text-center">
              <p>동영상을 로드할 수 없습니다.</p>
              <p className="text-sm opacity-60">{currentContent.title}</p>
            </div>
          </video>
        )}

        {currentContent.type === 'image' && (
          <img
            key={currentContent.id}
            src={currentContent.url}
            alt={currentContent.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/api/placeholder/1920/1080';
            }}
          />
        )}

        {currentContent.type === 'slideshow' && (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <div className="text-white text-center">
              <h1 className="text-6xl font-bold mb-8">{currentContent.title}</h1>
              <p className="text-2xl opacity-80">슬라이드쇼 기능 준비 중</p>
            </div>
          </div>
        )}
      </div>

      {/* 상태 표시 (우하단) */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>재생 중</span>
        </div>
        <div className="text-xs opacity-60 mt-1">
          {currentContent.title} | {lastUpdate}
        </div>
      </div>

      {/* 새로고침 힌트 (좌하단) */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded text-xs opacity-60">
        F5: 새로고침 | 30초마다 자동 확인
      </div>
    </div>
  );
};

export default TVDisplay;
