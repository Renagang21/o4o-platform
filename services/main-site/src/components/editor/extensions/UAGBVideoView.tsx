// UAGB Video View - Spectra 스타일
// YouTubeEmbedView를 UAGB Video View로 변환

import React, { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { 
  UAGBTabs, 
  UAGBPanel, 
  UAGBVideoControl,
  UAGBNumberControl,
  UAGBTextControl,
  UAGBSelectControl,
  UAGBToggleControl
} from './tiptap-block';
import { Video, Settings, Palette, Layout } from 'lucide-react';
import { UAGBVideoAttributes } from './UAGBVideoBlock';

interface UAGBVideoViewProps {
  node: {
    attrs: UAGBVideoAttributes;
  };
  updateAttributes: (attrs: Partial<UAGBVideoAttributes>) => void;
  selected: boolean;
}

export const UAGBVideoView: React.FC<UAGBVideoViewProps> = ({
  node,
  updateAttributes,
  selected
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const attrs = node.attrs;

  // 비디오 ID 추출 함수
  const extractVideoId = (url: string, type: string): string => {
    if (type === 'youtube') {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      return match ? match[1] : '';
    } else if (type === 'vimeo') {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? match[1] : '';
    }
    return '';
  };

  // 썸네일 URL 생성
  const getThumbnailUrl = (): string => {
    if (attrs.customThumbnail) {
      return attrs.customThumbnail;
    }
    
    if (attrs.videoType === 'youtube' && attrs.videoId) {
      return `https://img.youtube.com/vi/${attrs.videoId}/maxresdefault.jpg`;
    } else if (attrs.videoType === 'vimeo' && attrs.videoId) {
      return `https://vumbnail.com/${attrs.videoId}.jpg`;
    }
    
    return '';
  };

  // 임베드 URL 생성
  const getEmbedUrl = (): string => {
    if (attrs.videoType === 'youtube' && attrs.videoId) {
      const params = new URLSearchParams();
      if (attrs.autoplay) params.append('autoplay', '1');
      if (attrs.muted) params.append('mute', '1');
      if (attrs.loop) params.append('loop', '1');
      if (!attrs.showControls) params.append('controls', '0');
      if (!attrs.showRelated) params.append('rel', '0');
      if (attrs.startTime) params.append('start', attrs.startTime.toString());
      if (attrs.endTime) params.append('end', attrs.endTime.toString());
      
      return `https://www.youtube.com/embed/${attrs.videoId}?${params.toString()}`;
    } else if (attrs.videoType === 'vimeo' && attrs.videoId) {
      const params = new URLSearchParams();
      if (attrs.autoplay) params.append('autoplay', '1');
      if (attrs.muted) params.append('muted', '1');
      if (attrs.loop) params.append('loop', '1');
      if (!attrs.showTitle) params.append('title', '0');
      if (!attrs.showByline) params.append('byline', '0');
      if (attrs.color !== '#00adef') params.append('color', attrs.color.replace('#', ''));
      
      return `https://player.vimeo.com/video/${attrs.videoId}?${params.toString()}`;
    }
    
    return attrs.videoUrl;
  };

  // 컨테이너 스타일
  const getContainerStyle = (): React.CSSProperties => {
    return {
      display: 'flex',
      justifyContent: attrs.align,
      alignItems: 'center',
      padding: `${attrs.blockTopPadding}px ${attrs.blockRightPadding}px ${attrs.blockBottomPadding}px ${attrs.blockLeftPadding}px`,
      margin: `${attrs.blockTopMargin}px ${attrs.blockRightMargin}px ${attrs.blockBottomMargin}px ${attrs.blockLeftMargin}px`,
      border: selected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: '#fff',
      position: 'relative'
    };
  };

  // 비디오 래퍼 스타일
  const getVideoWrapperStyle = (): React.CSSProperties => {
    let aspectRatio = '16 / 9';
    
    switch (attrs.aspectRatio) {
      case '4:3':
        aspectRatio = '4 / 3';
        break;
      case '1:1':
        aspectRatio = '1 / 1';
        break;
      case '21:9':
        aspectRatio = '21 / 9';
        break;
      case 'custom':
        aspectRatio = `${attrs.customWidth} / ${attrs.customHeight}`;
        break;
    }

    return {
      position: 'relative',
      width: '100%',
      maxWidth: `${attrs.maxWidth}${attrs.maxWidthUnit}`,
      aspectRatio,
      backgroundColor: '#000',
      borderRadius: '8px',
      overflow: 'hidden'
    };
  };

  // 오버레이 스타일
  const getOverlayStyle = (): React.CSSProperties => {
    if (!attrs.overlay) return {};
    
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: attrs.overlayColor,
      opacity: attrs.overlayOpacity,
      zIndex: 1
    };
  };

  // Play 버튼 스타일
  const getPlayButtonStyle = (): React.CSSProperties => {
    const sizeMap = {
      'small': 48,
      'medium': 64,
      'large': 80
    };

    const size = sizeMap[attrs.playButtonSize];
    
    return {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: attrs.playButtonStyle === 'circle' ? '50%' : 
                    attrs.playButtonStyle === 'rounded' ? '12px' : 
                    attrs.playButtonStyle === 'square' ? '0' : '8px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: attrs.playButtonColor,
      fontSize: `${size * 0.4}px`,
      zIndex: 2,
      transition: 'all 0.3s ease'
    };
  };

  const thumbnailUrl = getThumbnailUrl();
  const embedUrl = getEmbedUrl();

  return (
    <NodeViewWrapper 
      className={`uagb-block-${attrs.block_id} uagb-video`}
      data-block-id={attrs.block_id}
    >
      <div style={getContainerStyle()}>
        {/* 편집 버튼 */}
        {selected && (
          <button
            onClick={() => setIsEditorOpen(true)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            Edit Video
          </button>
        )}

        <div style={getVideoWrapperStyle()}>
          {/* 썸네일 모드 */}
          {attrs.showThumbnail && thumbnailUrl ? (
            <>
              <img 
                src={thumbnailUrl}
                alt="Video thumbnail"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              
              {/* 오버레이 */}
              <div style={getOverlayStyle()} />
              
              {/* Play 버튼 */}
              <button style={getPlayButtonStyle()}>
                ▶
              </button>
            </>
          ) : (
            /* 임베드 모드 */
            <>
              {embedUrl && (attrs.videoType === 'youtube' || attrs.videoType === 'vimeo') ? (
                <iframe
                  src={embedUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : attrs.videoType === 'mp4' || attrs.videoType === 'webm' ? (
                <video
                  src={attrs.videoUrl}
                  controls={attrs.showControls}
                  autoPlay={attrs.autoplay}
                  muted={attrs.muted}
                  loop={attrs.loop}
                  playsInline={attrs.playsinline}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                /* 플레이스홀더 */
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <Video size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p style={{ margin: '0', fontSize: '14px' }}>
                      {attrs.videoUrl ? 'Invalid video URL' : 'Enter video URL to display'}
                    </p>
                  </div>
                </div>
              )}
            </>
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
            maxWidth: '900px',
            height: '80%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* 모달 헤더 */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600' }}>
                Edit Video
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>

            {/* 탭 컨텐츠 */}
            <div style={{ flex: '1', overflow: 'auto' }}>
              <UAGBTabs
                tabs={[
                  {
                    id: 'general',
                    label: 'General',
                    icon: <Video size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        <UAGBVideoControl
                          settings={{
                            videoUrl: attrs.videoUrl,
                            videoType: attrs.videoType,
                            videoId: attrs.videoId,
                            autoplay: attrs.autoplay,
                            muted: attrs.muted,
                            loop: attrs.loop,
                            showControls: attrs.showControls,
                            showThumbnail: attrs.showThumbnail,
                            customThumbnail: attrs.customThumbnail,
                            aspectRatio: attrs.aspectRatio,
                            customWidth: attrs.customWidth,
                            customHeight: attrs.customHeight,
                            startTime: attrs.startTime,
                            endTime: attrs.endTime,
                            playsinline: attrs.playsinline,
                            showRelated: attrs.showRelated,
                            showTitle: attrs.showTitle,
                            showByline: attrs.showByline,
                            color: attrs.color,
                            overlay: attrs.overlay,
                            overlayColor: attrs.overlayColor,
                            overlayOpacity: attrs.overlayOpacity,
                            playButtonStyle: attrs.playButtonStyle,
                            playButtonSize: attrs.playButtonSize
                          }}
                          onChange={(settings) => {
                            // URL이 변경되었을 때 자동으로 videoId와 videoType 업데이트
                            if (settings.videoUrl && settings.videoUrl !== attrs.videoUrl) {
                              let videoType: 'youtube' | 'vimeo' | 'mp4' | 'webm' = attrs.videoType;
                              
                              if (settings.videoUrl.includes('youtube.com') || settings.videoUrl.includes('youtu.be')) {
                                videoType = 'youtube';
                              } else if (settings.videoUrl.includes('vimeo.com')) {
                                videoType = 'vimeo';
                              } else if (settings.videoUrl.endsWith('.mp4')) {
                                videoType = 'mp4';
                              } else if (settings.videoUrl.endsWith('.webm')) {
                                videoType = 'webm';
                              }
                              
                              const videoId = extractVideoId(settings.videoUrl, videoType);
                              updateAttributes({ ...settings, videoType, videoId });
                            } else {
                              updateAttributes(settings);
                            }
                          }}
                        />
                      </div>
                    )
                  },
                  {
                    id: 'style',
                    label: 'Style',
                    icon: <Palette size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        <UAGBPanel title="Alignment & Sizing" isOpen={true}>
                          <UAGBSelectControl
                            label="Alignment"
                            value={attrs.align}
                            options={[
                              { label: 'Left', value: 'left' },
                              { label: 'Center', value: 'center' },
                              { label: 'Right', value: 'right' }
                            ]}
                            onChange={(align) => updateAttributes({ align: align as any })}
                          />
                          
                          <UAGBNumberControl
                            label="Max Width (%)"
                            value={attrs.maxWidth}
                            min={10}
                            max={100}
                            onChange={(maxWidth) => updateAttributes({ maxWidth })}
                          />
                        </UAGBPanel>

                        <UAGBPanel title="Overlay Settings" isOpen={false}>
                          <UAGBToggleControl
                            label="Show Overlay"
                            checked={attrs.overlay}
                            onChange={(overlay) => updateAttributes({ overlay })}
                          />
                          
                          {attrs.overlay && (
                            <>
                              <UAGBTextControl
                                label="Overlay Color"
                                value={attrs.overlayColor}
                                onChange={(overlayColor) => updateAttributes({ overlayColor })}
                              />
                              
                              <UAGBNumberControl
                                label="Overlay Opacity"
                                value={attrs.overlayOpacity}
                                min={0}
                                max={1}
                                step={0.1}
                                onChange={(overlayOpacity) => updateAttributes({ overlayOpacity })}
                              />
                            </>
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

export default UAGBVideoView;
