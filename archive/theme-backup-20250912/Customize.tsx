import { FC, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Monitor, Tablet, Smartphone, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import '@/styles/wordpress-customizer.css';

/**
 * WordPress-style Customizer
 * 단일 테마 사용자 정의 인터페이스
 */
const Customize: FC = () => {
  const navigate = useNavigate();
  const { success } = useAdminNotices();
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isDirty, setIsDirty] = useState(false);
  const [activePanel, setActivePanel] = useState<string>('site-identity');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Preview iframe dimensions
  const getPreviewDimensions = () => {
    switch (device) {
      case 'mobile':
        return { width: 375, height: 812 };
      case 'tablet':
        return { width: 768, height: 1024 };
      default:
        return { width: '100%', height: '100%' };
    }
  };

  const dimensions = getPreviewDimensions();

  // Handle save/publish
  const handlePublish = () => {
    // TODO: Save customization settings
    success('Settings published successfully.');
    setIsDirty(false);
  };

  // Panels configuration
  const panels = [
    {
      id: 'site-identity',
      label: '사이트 아이덴티티',
      description: '사이트 제목, 태그라인, 로고'
    },
    {
      id: 'colors',
      label: '색상',
      description: '배경색, 텍스트 색상'
    },
    {
      id: 'menus',
      label: '메뉴',
      description: '내비게이션 메뉴 관리'
    },
    {
      id: 'widgets',
      label: '위젯',
      description: '사이드바 및 푸터 위젯'
    },
    {
      id: 'homepage-settings',
      label: '홈페이지 설정',
      description: '정적 페이지 또는 최신 글'
    },
    {
      id: 'additional-css',
      label: '추가 CSS',
      description: '사용자 정의 CSS 추가'
    }
  ];

  return (
    <div className="wp-customizer">
      {/* Header */}
      <div className="wp-customizer-header">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin')}
          className="wp-customizer-close"
        >
          <X className="w-5 h-5 mr-2" />
          닫기
        </Button>
        
        <div className="wp-customizer-title">
          <h1>사용자 정의하기</h1>
          <span className="wp-customizer-site-name">O4O Platform</span>
        </div>

        <div className="wp-customizer-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDirty(false)}
            disabled={!isDirty}
          >
            저장
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            className="wp-customizer-publish"
          >
            <Check className="w-4 h-4 mr-2" />
            게시
          </Button>
        </div>
      </div>

      <div className="wp-customizer-body">
        {/* Sidebar */}
        <div className="wp-customizer-sidebar">
          <div className="wp-customizer-panels">
            {panels.map(panel => (
              <div
                key={panel.id}
                className={`wp-customizer-panel ${activePanel === panel.id ? 'active' : ''}`}
                onClick={() => setActivePanel(panel.id)}
              >
                <h3 className="wp-customizer-panel-title">{panel.label}</h3>
                <p className="wp-customizer-panel-description">{panel.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="wp-customizer-preview">
          <div className="wp-customizer-preview-header">
            <div className="wp-customizer-device-buttons">
              <Button
                variant={device === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDevice('desktop')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                variant={device === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDevice('tablet')}
              >
                <Tablet className="w-4 h-4" />
              </Button>
              <Button
                variant={device === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDevice('mobile')}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="wp-customizer-preview-body">
            <div 
              className={`wp-customizer-preview-frame wp-customizer-preview-${device}`}
              style={{
                width: typeof dimensions.width === 'number' ? `${dimensions.width}px` : dimensions.width,
                height: typeof dimensions.height === 'number' ? `${dimensions.height}px` : dimensions.height,
              }}
            >
              <iframe
                ref={iframeRef}
                src="/"
                title="Site Preview"
                className="wp-customizer-iframe"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Customize;