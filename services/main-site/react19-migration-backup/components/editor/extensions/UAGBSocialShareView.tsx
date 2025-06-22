// UAGB Social Share View - Spectra 스타일
// 한국형 소셜 공유 버튼 뷰 컴포넌트

import React, { useState, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { 
  UAGBTabs, 
  UAGBPanel, 
  UAGBTextControl,
  UAGBSelectControl,
  UAGBToggleControl,
  UAGBColorControl,
  UAGBNumberControl
} from './tiptap-block';
import { 
  Share2, Settings, Palette, Layout, Copy, CheckCircle,
  ExternalLink, TrendingUp
} from 'lucide-react';
import { 
  UAGBSocialShareAttributes,
  SocialPlatform,
  generateShareUrl,
  shareToKakaoTalk,
  copyToClipboard,
  getShareCounts,
  getPlatformIcon
} from './UAGBSocialShareBlock';

interface UAGBSocialShareViewProps {
  node: {
    attrs: UAGBSocialShareAttributes;
  };
  updateAttributes: (attrs: Partial<UAGBSocialShareAttributes>) => void;
  selected: boolean;
}

export const UAGBSocialShareView: React.FC<UAGBSocialShareViewProps> = ({
  node,
  updateAttributes,
  selected
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [shareCounts, setShareCounts] = useState<Record<string, number>>({});
  const [copiedLink, setCopiedLink] = useState(false);
  
  const attrs = node.attrs;

  // 현재 페이지 URL 및 메타 정보
  const currentUrl = attrs.shareUrl || window.location.href;
  const shareTitle = attrs.shareTitle || document.title;
  const shareDescription = attrs.shareDescription || '';
  const shareImage = attrs.shareImage || '';

  // 공유 카운트 로드
  useEffect(() => {
    if (attrs.showCounts) {
      getShareCounts(currentUrl).then(setShareCounts);
    }
  }, [currentUrl, attrs.showCounts]);

  // 플랫폼별 공유 핸들러
  const handleShare = (platform: SocialPlatform) => {
    // 추적 이벤트 발생
    if (attrs.enableTracking && window.gtag) {
      window.gtag('event', attrs.trackingEvent, {
        platform: platform.id,
        url: currentUrl
      });
    }

    switch (platform.id) {
      case 'kakao_talk':
        if (attrs.kakaoAppKey) {
          shareToKakaoTalk(attrs.kakaoAppKey, currentUrl, shareTitle, shareDescription, shareImage);
        } else {
          alert('카카오톡 공유를 위해 앱키를 설정해주세요.');
        }
        break;
        
      case 'copy_link':
        const success = copyToClipboard(currentUrl);
        if (success) {
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
        }
        break;
        
      default:
        const shareUrl = generateShareUrl(platform, currentUrl, shareTitle, shareDescription, shareImage);
        if (attrs.openInNewWindow) {
          window.open(shareUrl, '_blank', 'width=600,height=400');
        } else {
          window.location.href = shareUrl;
        }
    }
  };

  // 버튼 크기 스타일
  const getButtonSizeStyle = (size: string) => {
    switch (size) {
      case 'small':
        return { padding: '6px 12px', fontSize: '12px', minWidth: '36px' };
      case 'large':
        return { padding: '12px 20px', fontSize: '16px', minWidth: '48px' };
      default:
        return { padding: '8px 16px', fontSize: '14px', minWidth: '40px' };
    }
  };

  // 버튼 스타일
  const getButtonStyle = (platform: SocialPlatform) => {
    const baseStyle = {
      ...getButtonSizeStyle(attrs.buttonSize),
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      border: 'none',
      borderRadius: `${attrs.borderRadius}px`,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textDecoration: 'none',
      fontWeight: '500'
    };

    switch (attrs.buttonStyle) {
      case 'filled':
        return {
          ...baseStyle,
          backgroundColor: platform.color,
          color: '#ffffff',
          border: 'none'
        };
        
      case 'outlined':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          color: platform.color,
          border: `2px solid ${platform.color}`
        };
        
      case 'minimal':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          color: platform.color,
          border: 'none'
        };
        
      case 'rounded':
        return {
          ...baseStyle,
          backgroundColor: platform.color,
          color: '#ffffff',
          borderRadius: '50px'
        };
        
      case 'square':
        return {
          ...baseStyle,
          backgroundColor: platform.color,
          color: '#ffffff',
          borderRadius: '0px'
        };
        
      default:
        return baseStyle;
    }
  };

  // 레이아웃 스타일
  const getLayoutStyle = () => {
    const baseStyle = {
      display: 'flex',
      gap: `${attrs.spacing}px`,
      padding: `${attrs.padding}px`,
      backgroundColor: attrs.backgroundColor,
      border: attrs.borderWidth > 0 ? `${attrs.borderWidth}px solid ${attrs.borderColor}` : 'none',
      borderRadius: `${attrs.borderRadius}px`
    };

    switch (attrs.layout) {
      case 'vertical':
        return { ...baseStyle, flexDirection: 'column' as const };
      case 'grid':
        return { 
          ...baseStyle, 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: `${attrs.spacing}px`
        };
      case 'floating':
        return {
          ...baseStyle,
          position: 'fixed' as const,
          top: '50%',
          right: '20px',
          transform: 'translateY(-50%)',
          flexDirection: 'column' as const,
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        };
      default:
        return { ...baseStyle, flexDirection: 'row' as const };
    }
  };

  return (
    <NodeViewWrapper>
      <div 
        className="uagb-social-share"
        style={{
          border: selected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
          borderRadius: '8px',
          position: 'relative'
        }}
      >
        {/* 편집 버튼 */}
        {selected && (
          <button
            onClick={() => setIsEditorOpen(true)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            <Settings size={12} />
          </button>
        )}

        {/* 소셜 공유 버튼들 */}
        <div style={getLayoutStyle()}>
          {/* 제목 */}
          {attrs.showTitle && (
            <div style={{
              marginBottom: attrs.layout === 'horizontal' ? '0' : `${attrs.spacing}px`,
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              ...(attrs.layout === 'horizontal' ? { marginRight: `${attrs.spacing}px` } : {})
            }}>
              {attrs.title}
            </div>
          )}

          {/* 플랫폼 버튼들 */}
          {attrs.platforms
            .filter(platform => platform.enabled)
            .map((platform) => (
              <button
                key={platform.id}
                onClick={() => handleShare(platform)}
                style={{
                  ...getButtonStyle(platform),
                  ...(attrs.hoverEffect ? {
                    ':hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                    }
                  } : {})
                }}
                onMouseEnter={(e) => {
                  if (attrs.hoverEffect) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (attrs.hoverEffect) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
                title={`Share on ${platform.name}`}
              >
                {/* 아이콘 */}
                <span style={{ fontSize: '16px' }}>
                  {platform.id === 'copy_link' && copiedLink ? (
                    <CheckCircle size={16} />
                  ) : (
                    getPlatformIcon(platform.id)
                  )}
                </span>

                {/* 라벨 */}
                {attrs.showLabels && (
                  <span>{platform.id === 'copy_link' && copiedLink ? 'Copied!' : platform.name}</span>
                )}

                {/* 공유 카운트 */}
                {attrs.showCounts && shareCounts[platform.id] && (
                  <span style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    marginLeft: '4px'
                  }}>
                    {shareCounts[platform.id].toLocaleString()}
                  </span>
                )}
              </button>
            ))}

          {/* 총 공유 카운트 */}
          {attrs.showCounts && attrs.shareCountSettings.showTotal && shareCounts.total && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#f3f4f6',
              borderRadius: `${attrs.borderRadius}px`,
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <TrendingUp size={14} />
              {shareCounts.total.toLocaleString()} shares
            </div>
          )}
        </div>
      </div>

      {/* 편집 모달 */}
      {isEditorOpen && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '800px',
            height: '80%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* 모달 헤더 */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Share2 className="w-5 h-5 text-blue-600" />
                <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600' }}>
                  Social Share Settings
                </h3>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* 탭과 콘텐츠 */}
            <div className="flex-1 overflow-hidden">
              <UAGBTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabs={[
                  {
                    id: 'general',
                    label: 'General',
                    icon: <Share2 className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* 기본 설정 */}
                        <UAGBPanel title="Basic Settings">
                          <UAGBTextControl
                            label="Title"
                            value={attrs.title}
                            onChange={(title) => updateAttributes({ title })}
                          />
                          
                          <UAGBToggleControl
                            label="Show Title"
                            checked={attrs.showTitle}
                            onChange={(showTitle) => updateAttributes({ showTitle })}
                          />
                        </UAGBPanel>

                        {/* 공유 정보 */}
                        <UAGBPanel title="Share Information">
                          <UAGBTextControl
                            label="Share URL (Leave empty for current page)"
                            value={attrs.shareUrl}
                            onChange={(shareUrl) => updateAttributes({ shareUrl })}
                            placeholder={window.location.href}
                          />
                          
                          <UAGBTextControl
                            label="Share Title (Leave empty for page title)"
                            value={attrs.shareTitle}
                            onChange={(shareTitle) => updateAttributes({ shareTitle })}
                            placeholder={document.title}
                          />
                          
                          <UAGBTextControl
                            label="Share Description"
                            value={attrs.shareDescription}
                            onChange={(shareDescription) => updateAttributes({ shareDescription })}
                            placeholder="Enter description for social media"
                          />
                          
                          <UAGBTextControl
                            label="Share Image URL"
                            value={attrs.shareImage}
                            onChange={(shareImage) => updateAttributes({ shareImage })}
                            placeholder="https://example.com/image.jpg"
                          />
                        </UAGBPanel>

                        {/* 한국 플랫폼 설정 */}
                        <UAGBPanel title="Korean Platform Settings">
                          <UAGBTextControl
                            label="Kakao App Key"
                            value={attrs.kakaoAppKey}
                            onChange={(kakaoAppKey) => updateAttributes({ kakaoAppKey })}
                            placeholder="Your Kakao JavaScript App Key"
                            help="카카오톡 공유를 위해 필요합니다"
                          />
                          
                          <UAGBTextControl
                            label="Naver Client ID"
                            value={attrs.naverClientId}
                            onChange={(naverClientId) => updateAttributes({ naverClientId })}
                            placeholder="Your Naver Client ID"
                            help="네이버 플랫폼 연동을 위해 필요합니다"
                          />
                        </UAGBPanel>
                      </div>
                    )
                  },
                  
                  {
                    id: 'platforms',
                    label: 'Platforms',
                    icon: <ExternalLink className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        <UAGBPanel title="Platform Selection">
                          <div className="space-y-4">
                            {attrs.platforms.map((platform, index) => (
                              <div key={platform.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <span style={{ fontSize: '20px' }}>{getPlatformIcon(platform.id)}</span>
                                  <span className="font-medium">{platform.name}</span>
                                </div>
                                <UAGBToggleControl
                                  label=""
                                  checked={platform.enabled}
                                  onChange={(enabled) => {
                                    const newPlatforms = [...attrs.platforms];
                                    newPlatforms[index] = { ...platform, enabled };
                                    updateAttributes({ platforms: newPlatforms });
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </UAGBPanel>
                      </div>
                    )
                  },
                  
                  {
                    id: 'layout',
                    label: 'Layout',
                    icon: <Layout className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* 레이아웃 설정 */}
                        <UAGBPanel title="Layout Settings">
                          <UAGBSelectControl
                            label="Layout Type"
                            value={attrs.layout}
                            onChange={(layout) => updateAttributes({ layout: layout as any })}
                            options={[
                              { label: 'Horizontal', value: 'horizontal' },
                              { label: 'Vertical', value: 'vertical' },
                              { label: 'Grid', value: 'grid' },
                              { label: 'Floating', value: 'floating' }
                            ]}
                          />
                          
                          <UAGBSelectControl
                            label="Alignment"
                            value={attrs.alignment}
                            onChange={(alignment) => updateAttributes({ alignment: alignment as any })}
                            options={[
                              { label: 'Left', value: 'left' },
                              { label: 'Center', value: 'center' },
                              { label: 'Right', value: 'right' }
                            ]}
                          />
                          
                          <UAGBSelectControl
                            label="Button Size"
                            value={attrs.buttonSize}
                            onChange={(buttonSize) => updateAttributes({ buttonSize: buttonSize as any })}
                            options={[
                              { label: 'Small', value: 'small' },
                              { label: 'Medium', value: 'medium' },
                              { label: 'Large', value: 'large' }
                            ]}
                          />
                          
                          <UAGBSelectControl
                            label="Button Style"
                            value={attrs.buttonStyle}
                            onChange={(buttonStyle) => updateAttributes({ buttonStyle: buttonStyle as any })}
                            options={[
                              { label: 'Filled', value: 'filled' },
                              { label: 'Outlined', value: 'outlined' },
                              { label: 'Minimal', value: 'minimal' },
                              { label: 'Rounded', value: 'rounded' },
                              { label: 'Square', value: 'square' }
                            ]}
                          />
                        </UAGBPanel>

                        {/* 표시 옵션 */}
                        <UAGBPanel title="Display Options">
                          <UAGBToggleControl
                            label="Show Labels"
                            checked={attrs.showLabels}
                            onChange={(showLabels) => updateAttributes({ showLabels })}
                          />
                          
                          <UAGBToggleControl
                            label="Show Share Counts"
                            checked={attrs.showCounts}
                            onChange={(showCounts) => updateAttributes({ showCounts })}
                          />
                          
                          <UAGBToggleControl
                            label="Hover Effect"
                            checked={attrs.hoverEffect}
                            onChange={(hoverEffect) => updateAttributes({ hoverEffect })}
                          />
                          
                          <UAGBToggleControl
                            label="Open in New Window"
                            checked={attrs.openInNewWindow}
                            onChange={(openInNewWindow) => updateAttributes({ openInNewWindow })}
                          />
                        </UAGBPanel>

                        {/* 간격 설정 */}
                        <UAGBPanel title="Spacing">
                          <UAGBNumberControl
                            label="Button Spacing"
                            value={attrs.spacing}
                            min={0}
                            max={50}
                            onChange={(spacing) => updateAttributes({ spacing })}
                          />
                          
                          <UAGBNumberControl
                            label="Container Padding"
                            value={attrs.padding}
                            min={0}
                            max={50}
                            onChange={(padding) => updateAttributes({ padding })}
                          />
                        </UAGBPanel>
                      </div>
                    )
                  },
                  
                  {
                    id: 'style',
                    label: 'Styling',
                    icon: <Palette className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* 컨테이너 스타일 */}
                        <UAGBPanel title="Container Style">
                          <UAGBColorControl
                            label="Background Color"
                            value={attrs.backgroundColor}
                            onChange={(backgroundColor) => updateAttributes({ backgroundColor })}
                          />
                          
                          <UAGBColorControl
                            label="Border Color"
                            value={attrs.borderColor}
                            onChange={(borderColor) => updateAttributes({ borderColor })}
                          />
                          
                          <UAGBNumberControl
                            label="Border Width"
                            value={attrs.borderWidth}
                            min={0}
                            max={10}
                            onChange={(borderWidth) => updateAttributes({ borderWidth })}
                          />
                          
                          <UAGBNumberControl
                            label="Border Radius"
                            value={attrs.borderRadius}
                            min={0}
                            max={50}
                            onChange={(borderRadius) => updateAttributes({ borderRadius })}
                          />
                        </UAGBPanel>

                        {/* 고급 기능 */}
                        <UAGBPanel title="Advanced Features">
                          <UAGBToggleControl
                            label="Enable Tracking"
                            checked={attrs.enableTracking}
                            onChange={(enableTracking) => updateAttributes({ enableTracking })}
                            help="Google Analytics 이벤트 추적"
                          />
                          
                          {attrs.enableTracking && (
                            <UAGBTextControl
                              label="Tracking Event Name"
                              value={attrs.trackingEvent}
                              onChange={(trackingEvent) => updateAttributes({ trackingEvent })}
                              placeholder="social_share"
                            />
                          )}
                        </UAGBPanel>
                      </div>
                    )
                  }
                ]}
              />
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default UAGBSocialShareView;