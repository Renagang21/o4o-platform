// UAGB Image View - Spectra 스타일
// 고급 이미지 블록 뷰 컴포넌트

import React, { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { 
  UAGBTabs, 
  UAGBPanel, 
  UAGBTextControl,
  UAGBSelectControl,
  UAGBToggleControl,
  UAGBColorControl,
  UAGBNumberControl,
  UAGBRangeControl
} from './tiptap-block';
import { Image, Settings, Palette, Layout, Link, Filter, Upload } from 'lucide-react';
import { UAGBImageAttributes } from './UAGBImageBlock';

interface UAGBImageViewProps {
  node: {
    attrs: UAGBImageAttributes;
  };
  updateAttributes: (attrs: Partial<UAGBImageAttributes>) => void;
  selected: boolean;
}

export const UAGBImageView: React.FC<UAGBImageViewProps> = ({
  node,
  updateAttributes,
  selected
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const attrs = node.attrs;

  // 이미지 컨테이너 스타일
  const getContainerStyle = (): React.CSSProperties => {
    const alignmentMap = {
      'left': 'flex-start',
      'center': 'center',
      'right': 'flex-end',
      'wide': 'center',
      'full': 'center'
    };

    return {
      display: 'flex',
      justifyContent: alignmentMap[attrs.align] || 'center',
      padding: `${attrs.blockTopPadding}px ${attrs.blockRightPadding}px ${attrs.blockBottomPadding}px ${attrs.blockLeftPadding}px`,
      margin: `${attrs.blockTopMargin}px ${attrs.blockRightMargin}px ${attrs.blockBottomMargin}px ${attrs.blockLeftMargin}px`,
      border: selected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: '#fff',
      position: 'relative'
    };
  };

  // 이미지 래퍼 스타일
  const getImageWrapperStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'relative',
      display: 'inline-block',
      overflow: 'hidden',
      borderRadius: `${attrs.borderRadius}px`,
      transition: `all ${attrs.hoverTransition}ms ease`,
      cursor: attrs.linkTo !== 'none' ? 'pointer' : 'default'
    };

    // 크기 설정
    if (attrs.sizeSlug === 'custom') {
      if (attrs.widthUnit === '%') {
        baseStyle.width = `${attrs.customWidth}%`;
      } else {
        baseStyle.width = `${attrs.customWidth}px`;
      }

      if (attrs.heightUnit !== 'auto') {
        baseStyle.height = `${attrs.customHeight}px`;
      }
    } else {
      // 기본 크기들
      const sizeMap = {
        'thumbnail': { width: 150, height: 150 },
        'medium': { width: 300, height: 200 },
        'large': { width: 600, height: 400 },
        'full': { width: '100%', height: 'auto' }
      };
      
      const size = sizeMap[attrs.sizeSlug];
      baseStyle.width = size.width;
      baseStyle.height = size.height;
    }

    // 테두리
    if (attrs.borderStyle !== 'none') {
      baseStyle.border = `${attrs.borderWidth}px ${attrs.borderStyle} ${attrs.borderColor}`;
    }

    // 그림자
    if (attrs.boxShadow) {
      baseStyle.boxShadow = `${attrs.boxShadowHOffset}px ${attrs.boxShadowVOffset}px ${attrs.boxShadowBlur}px ${attrs.boxShadowSpread}px ${attrs.boxShadowColor}`;
    }

    // 호버 효과
    if (attrs.enableHoverEffect && isHovered) {
      switch (attrs.hoverEffect) {
        case 'zoom':
          baseStyle.transform = 'scale(1.05)';
          break;
        case 'lift':
          baseStyle.transform = 'translateY(-5px)';
          baseStyle.boxShadow = `${attrs.boxShadowHOffset}px ${attrs.boxShadowVOffset + 5}px ${attrs.boxShadowBlur + 5}px ${attrs.boxShadowSpread}px ${attrs.boxShadowColor}`;
          break;
        case 'rotate':
          baseStyle.transform = 'rotate(2deg)';
          break;
        case 'scale':
          baseStyle.transform = 'scale(1.1)';
          break;
      }
    }

    // 마스킹
    if (attrs.enableMask) {
      const masks = {
        'circle': 'circle(50% at center)',
        'square': 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        'triangle': 'polygon(50% 0%, 0% 100%, 100% 100%)',
        'hexagon': 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
        'star': 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
        'heart': 'polygon(50% 30%, 85% 0%, 100% 35%, 85% 100%, 50% 85%, 15% 100%, 0% 35%, 15% 0%)'
      };
      baseStyle.clipPath = masks[attrs.maskShape];
    }

    return baseStyle;
  };

  // 이미지 스타일
  const getImageStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      width: '100%',
      height: '100%',
      objectFit: attrs.objectFit,
      objectPosition: attrs.objectPosition,
      transition: `all ${attrs.hoverTransition}ms ease`
    };

    // 필터 적용
    if (attrs.enableFilters || (attrs.enableHoverFilters && isHovered)) {
      const filters = [];
      
      const brightness = isHovered && attrs.enableHoverFilters ? attrs.hoverBrightness : attrs.brightness;
      const contrast = isHovered && attrs.enableHoverFilters ? attrs.hoverContrast : attrs.contrast;
      const saturation = isHovered && attrs.enableHoverFilters ? attrs.hoverSaturation : attrs.saturation;
      const blur = isHovered && attrs.enableHoverFilters ? attrs.hoverBlur : attrs.blur;
      const hue = isHovered && attrs.enableHoverFilters ? attrs.hoverHue : attrs.hue;

      if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
      if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
      if (saturation !== 100) filters.push(`saturate(${saturation}%)`);
      if (blur > 0) filters.push(`blur(${blur}px)`);
      if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`);

      if (filters.length > 0) {
        style.filter = filters.join(' ');
      }
    }

    return style;
  };

  // 오버레이 스타일
  const getOverlayStyle = (): React.CSSProperties => {
    if (!attrs.showOverlay) return { display: 'none' };

    return {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: attrs.overlayColor,
      opacity: attrs.overlayOpacity,
      mixBlendMode: attrs.overlayBlendMode,
      transition: `all ${attrs.hoverTransition}ms ease`,
      pointerEvents: 'none'
    };
  };

  // 캡션 스타일
  const getCaptionStyle = (): React.CSSProperties => {
    return {
      fontFamily: attrs.captionFontFamily,
      fontSize: `${attrs.captionFontSize}px`,
      fontWeight: attrs.captionFontWeight,
      color: attrs.captionColor,
      backgroundColor: attrs.captionBackgroundColor,
      textAlign: attrs.captionAlign,
      padding: `${attrs.captionPadding}px`,
      marginTop: `${attrs.captionMarginTop}px`,
      margin: `${attrs.captionMarginTop}px 0 0 0`
    };
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        updateAttributes({ 
          imageUrl: result,
          imageAlt: file.name.split('.')[0]
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const ImageElement = () => (
    <div
      style={getImageWrapperStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src={attrs.imageUrl}
        alt={attrs.imageAlt}
        title={attrs.imageTitle}
        style={getImageStyle()}
        loading={attrs.lazyLoad ? 'lazy' : 'eager'}
      />
      <div style={getOverlayStyle()} />
    </div>
  );

  return (
    <NodeViewWrapper 
      className={`uagb-block-${attrs.block_id} uagb-image`}
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
            Edit Image
          </button>
        )}

        <div style={{ maxWidth: '100%' }}>
          {/* 이미지 (링크 처리) */}
          {attrs.linkTo !== 'none' ? (
            <a
              href={attrs.linkTo === 'media' ? attrs.imageUrl : attrs.linkUrl}
              target={attrs.linkTarget}
              rel={attrs.linkRel}
              style={{ display: 'inline-block', textDecoration: 'none' }}
            >
              <ImageElement />
            </a>
          ) : (
            <ImageElement />
          )}

          {/* 캡션 */}
          {attrs.showCaption && attrs.caption && (
            <div style={getCaptionStyle()}>
              {attrs.caption}
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
            maxWidth: '1000px',
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
                Edit Image
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
                    icon: <Image size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        <UAGBPanel title="Image Source" isOpen={true}>
                          <UAGBTextControl
                            label="Image URL"
                            value={attrs.imageUrl}
                            onChange={(imageUrl) => updateAttributes({ imageUrl })}
                          />
                          
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Upload New Image
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                          </div>
                          
                          <UAGBTextControl
                            label="Alt Text"
                            value={attrs.imageAlt}
                            onChange={(imageAlt) => updateAttributes({ imageAlt })}
                          />
                          
                          <UAGBTextControl
                            label="Title"
                            value={attrs.imageTitle}
                            onChange={(imageTitle) => updateAttributes({ imageTitle })}
                          />
                        </UAGBPanel>

                        <UAGBPanel title="Size & Alignment" isOpen={false}>
                          <UAGBSelectControl
                            label="Size"
                            value={attrs.sizeSlug}
                            options={[
                              { label: 'Thumbnail', value: 'thumbnail' },
                              { label: 'Medium', value: 'medium' },
                              { label: 'Large', value: 'large' },
                              { label: 'Full Size', value: 'full' },
                              { label: 'Custom', value: 'custom' }
                            ]}
                            onChange={(sizeSlug) => updateAttributes({ sizeSlug: sizeSlug as any })}
                          />
                          
                          {attrs.sizeSlug === 'custom' && (
                            <>
                              <UAGBNumberControl
                                label="Width"
                                value={attrs.customWidth}
                                min={0}
                                max={2000}
                                onChange={(customWidth) => updateAttributes({ customWidth })}
                              />
                              
                              <UAGBNumberControl
                                label="Height"
                                value={attrs.customHeight}
                                min={0}
                                max={2000}
                                onChange={(customHeight) => updateAttributes({ customHeight })}
                              />
                              
                              <UAGBSelectControl
                                label="Width Unit"
                                value={attrs.widthUnit}
                                options={[
                                  { label: 'Pixels', value: 'px' },
                                  { label: 'Percentage', value: '%' },
                                  { label: 'Viewport Width', value: 'vw' }
                                ]}
                                onChange={(widthUnit) => updateAttributes({ widthUnit: widthUnit as any })}
                              />
                            </>
                          )}
                          
                          <UAGBSelectControl
                            label="Alignment"
                            value={attrs.align}
                            options={[
                              { label: 'Left', value: 'left' },
                              { label: 'Center', value: 'center' },
                              { label: 'Right', value: 'right' },
                              { label: 'Wide Width', value: 'wide' },
                              { label: 'Full Width', value: 'full' }
                            ]}
                            onChange={(align) => updateAttributes({ align: align as any })}
                          />
                          
                          <UAGBSelectControl
                            label="Object Fit"
                            value={attrs.objectFit}
                            options={[
                              { label: 'Cover', value: 'cover' },
                              { label: 'Contain', value: 'contain' },
                              { label: 'Fill', value: 'fill' },
                              { label: 'None', value: 'none' },
                              { label: 'Scale Down', value: 'scale-down' }
                            ]}
                            onChange={(objectFit) => updateAttributes({ objectFit: objectFit as any })}
                          />
                        </UAGBPanel>

                        <UAGBPanel title="Link Settings" isOpen={false}>
                          <UAGBSelectControl
                            label="Link To"
                            value={attrs.linkTo}
                            options={[
                              { label: 'None', value: 'none' },
                              { label: 'Media File', value: 'media' },
                              { label: 'Custom URL', value: 'custom' }
                            ]}
                            onChange={(linkTo) => updateAttributes({ linkTo: linkTo as any })}
                          />
                          
                          {attrs.linkTo === 'custom' && (
                            <>
                              <UAGBTextControl
                                label="Link URL"
                                value={attrs.linkUrl}
                                onChange={(linkUrl) => updateAttributes({ linkUrl })}
                              />
                              
                              <UAGBSelectControl
                                label="Link Target"
                                value={attrs.linkTarget}
                                options={[
                                  { label: 'Same Window', value: '_self' },
                                  { label: 'New Window', value: '_blank' }
                                ]}
                                onChange={(linkTarget) => updateAttributes({ linkTarget: linkTarget as any })}
                              />
                            </>
                          )}
                        </UAGBPanel>

                        <UAGBPanel title="Caption" isOpen={false}>
                          <UAGBToggleControl
                            label="Show Caption"
                            checked={attrs.showCaption}
                            onChange={(showCaption) => updateAttributes({ showCaption })}
                          />
                          
                          {attrs.showCaption && (
                            <>
                              <UAGBTextControl
                                label="Caption Text"
                                value={attrs.caption}
                                onChange={(caption) => updateAttributes({ caption })}
                              />
                              
                              <UAGBSelectControl
                                label="Caption Alignment"
                                value={attrs.captionAlign}
                                options={[
                                  { label: 'Left', value: 'left' },
                                  { label: 'Center', value: 'center' },
                                  { label: 'Right', value: 'right' }
                                ]}
                                onChange={(captionAlign) => updateAttributes({ captionAlign: captionAlign as any })}
                              />
                              
                              <UAGBColorControl
                                label="Caption Color"
                                value={attrs.captionColor}
                                onChange={(captionColor) => updateAttributes({ captionColor })}
                              />
                            </>
                          )}
                        </UAGBPanel>
                      </div>
                    )
                  },
                  {
                    id: 'style',
                    label: 'Style',
                    icon: <Palette size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        <UAGBPanel title="Border & Shadow" isOpen={true}>
                          <UAGBSelectControl
                            label="Border Style"
                            value={attrs.borderStyle}
                            options={[
                              { label: 'None', value: 'none' },
                              { label: 'Solid', value: 'solid' },
                              { label: 'Dashed', value: 'dashed' },
                              { label: 'Dotted', value: 'dotted' },
                              { label: 'Double', value: 'double' }
                            ]}
                            onChange={(borderStyle) => updateAttributes({ borderStyle: borderStyle as any })}
                          />
                          
                          {attrs.borderStyle !== 'none' && (
                            <>
                              <UAGBNumberControl
                                label="Border Width"
                                value={attrs.borderWidth}
                                min={0}
                                max={20}
                                onChange={(borderWidth) => updateAttributes({ borderWidth })}
                              />
                              
                              <UAGBColorControl
                                label="Border Color"
                                value={attrs.borderColor}
                                onChange={(borderColor) => updateAttributes({ borderColor })}
                              />
                            </>
                          )}
                          
                          <UAGBNumberControl
                            label="Border Radius"
                            value={attrs.borderRadius}
                            min={0}
                            max={100}
                            onChange={(borderRadius) => updateAttributes({ borderRadius })}
                          />
                          
                          <UAGBToggleControl
                            label="Box Shadow"
                            checked={attrs.boxShadow}
                            onChange={(boxShadow) => updateAttributes({ boxShadow })}
                          />
                        </UAGBPanel>

                        <UAGBPanel title="Overlay" isOpen={false}>
                          <UAGBToggleControl
                            label="Show Overlay"
                            checked={attrs.showOverlay}
                            onChange={(showOverlay) => updateAttributes({ showOverlay })}
                          />
                          
                          {attrs.showOverlay && (
                            <>
                              <UAGBColorControl
                                label="Overlay Color"
                                value={attrs.overlayColor}
                                onChange={(overlayColor) => updateAttributes({ overlayColor })}
                              />
                              
                              <UAGBRangeControl
                                label="Overlay Opacity"
                                value={attrs.overlayOpacity}
                                min={0}
                                max={1}
                                step={0.01}
                                onChange={(overlayOpacity) => updateAttributes({ overlayOpacity })}
                              />
                              
                              <UAGBSelectControl
                                label="Blend Mode"
                                value={attrs.overlayBlendMode}
                                options={[
                                  { label: 'Normal', value: 'normal' },
                                  { label: 'Multiply', value: 'multiply' },
                                  { label: 'Screen', value: 'screen' },
                                  { label: 'Overlay', value: 'overlay' },
                                  { label: 'Darken', value: 'darken' },
                                  { label: 'Lighten', value: 'lighten' }
                                ]}
                                onChange={(overlayBlendMode) => updateAttributes({ overlayBlendMode: overlayBlendMode as any })}
                              />
                            </>
                          )}
                        </UAGBPanel>

                        <UAGBPanel title="Hover Effects" isOpen={false}>
                          <UAGBToggleControl
                            label="Enable Hover Effect"
                            checked={attrs.enableHoverEffect}
                            onChange={(enableHoverEffect) => updateAttributes({ enableHoverEffect })}
                          />
                          
                          {attrs.enableHoverEffect && (
                            <>
                              <UAGBSelectControl
                                label="Hover Effect"
                                value={attrs.hoverEffect}
                                options={[
                                  { label: 'None', value: 'none' },
                                  { label: 'Zoom', value: 'zoom' },
                                  { label: 'Lift', value: 'lift' },
                                  { label: 'Rotate', value: 'rotate' },
                                  { label: 'Scale', value: 'scale' }
                                ]}
                                onChange={(hoverEffect) => updateAttributes({ hoverEffect: hoverEffect as any })}
                              />
                              
                              <UAGBNumberControl
                                label="Transition Duration (ms)"
                                value={attrs.hoverTransition}
                                min={0}
                                max={1000}
                                step={50}
                                onChange={(hoverTransition) => updateAttributes({ hoverTransition })}
                              />
                            </>
                          )}
                        </UAGBPanel>
                      </div>
                    )
                  },
                  {
                    id: 'effects',
                    label: 'Effects',
                    icon: <Filter size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        <UAGBPanel title="Image Filters" isOpen={true}>
                          <UAGBToggleControl
                            label="Enable Filters"
                            checked={attrs.enableFilters}
                            onChange={(enableFilters) => updateAttributes({ enableFilters })}
                          />
                          
                          {attrs.enableFilters && (
                            <>
                              <UAGBRangeControl
                                label="Brightness"
                                value={attrs.brightness}
                                min={0}
                                max={200}
                                onChange={(brightness) => updateAttributes({ brightness })}
                              />
                              
                              <UAGBRangeControl
                                label="Contrast"
                                value={attrs.contrast}
                                min={0}
                                max={200}
                                onChange={(contrast) => updateAttributes({ contrast })}
                              />
                              
                              <UAGBRangeControl
                                label="Saturation"
                                value={attrs.saturation}
                                min={0}
                                max={200}
                                onChange={(saturation) => updateAttributes({ saturation })}
                              />
                              
                              <UAGBRangeControl
                                label="Blur"
                                value={attrs.blur}
                                min={0}
                                max={20}
                                onChange={(blur) => updateAttributes({ blur })}
                              />
                              
                              <UAGBRangeControl
                                label="Hue Rotate"
                                value={attrs.hue}
                                min={0}
                                max={360}
                                onChange={(hue) => updateAttributes({ hue })}
                              />
                            </>
                          )}
                        </UAGBPanel>

                        <UAGBPanel title="Hover Filters" isOpen={false}>
                          <UAGBToggleControl
                            label="Enable Hover Filters"
                            checked={attrs.enableHoverFilters}
                            onChange={(enableHoverFilters) => updateAttributes({ enableHoverFilters })}
                          />
                          
                          {attrs.enableHoverFilters && (
                            <>
                              <UAGBRangeControl
                                label="Hover Brightness"
                                value={attrs.hoverBrightness}
                                min={0}
                                max={200}
                                onChange={(hoverBrightness) => updateAttributes({ hoverBrightness })}
                              />
                              
                              <UAGBRangeControl
                                label="Hover Contrast"
                                value={attrs.hoverContrast}
                                min={0}
                                max={200}
                                onChange={(hoverContrast) => updateAttributes({ hoverContrast })}
                              />
                              
                              <UAGBRangeControl
                                label="Hover Saturation"
                                value={attrs.hoverSaturation}
                                min={0}
                                max={200}
                                onChange={(hoverSaturation) => updateAttributes({ hoverSaturation })}
                              />
                            </>
                          )}
                        </UAGBPanel>

                        <UAGBPanel title="Masking" isOpen={false}>
                          <UAGBToggleControl
                            label="Enable Mask"
                            checked={attrs.enableMask}
                            onChange={(enableMask) => updateAttributes({ enableMask })}
                          />
                          
                          {attrs.enableMask && (
                            <>
                              <UAGBSelectControl
                                label="Mask Shape"
                                value={attrs.maskShape}
                                options={[
                                  { label: 'Circle', value: 'circle' },
                                  { label: 'Square', value: 'square' },
                                  { label: 'Triangle', value: 'triangle' },
                                  { label: 'Hexagon', value: 'hexagon' },
                                  { label: 'Star', value: 'star' },
                                  { label: 'Heart', value: 'heart' }
                                ]}
                                onChange={(maskShape) => updateAttributes({ maskShape: maskShape as any })}
                              />
                              
                              <UAGBRangeControl
                                label="Mask Size"
                                value={attrs.maskSize}
                                min={10}
                                max={200}
                                onChange={(maskSize) => updateAttributes({ maskSize })}
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

export default UAGBImageView;
