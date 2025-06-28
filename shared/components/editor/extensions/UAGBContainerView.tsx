// UAGB Container View - Spectra 스타일
// Hero 섹션에 최적화된 컨테이너 블록

import React, { useState, useCallback, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Edit3, Save, X, Plus, Trash2, ArrowRight, Layout, Palette, Type, Settings, Container, Layers } from 'lucide-react';
import { UAGBHeroContainerAttributes, UAGBHeroContent } from './UAGBContainerBlock';
import { UAGBCSSGenerator, injectCSS, generateBlockId } from './spectra/css-generator';
import {
  UAGBPanel,
  UAGBTabs,
  UAGBTextControl,
  UAGBTextareaControl,
  UAGBSelectControl,
  UAGBNumberControl,
  UAGBToggleControl,
  UAGBColorControl,
  UAGBResponsiveControl,
} from './spectra/ui-components';

interface UAGBContainerViewProps {
  node: {
    attrs: UAGBHeroContainerAttributes;
  };
  updateAttributes: (attrs: Partial<UAGBHeroContainerAttributes>) => void;
  selected: boolean;
}

const UAGBContainerView: React.FC<UAGBContainerViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempAttrs, setTempAttrs] = useState<UAGBHeroContainerAttributes>(node.attrs);
  const [activeTab, setActiveTab] = useState('content');

  // CSS 생성 및 주입
  useEffect(() => {
    const css = generateHeroContainerCSS(node.attrs);
    injectCSS(css, node.attrs.block_id);
  }, [node.attrs]);

  // 커스텀 CSS 생성 함수
  const generateHeroContainerCSS = (attrs: UAGBHeroContainerAttributes): string => {
    const blockSelector = `.uagb-block-${attrs.block_id}`;
    
    let css = `
      /* 컨테이너 기본 스타일 */
      ${blockSelector} {
        display: flex;
        flex-direction: ${attrs.directionDesktop};
        justify-content: ${attrs.justifyContent};
        align-items: ${attrs.alignItems};
        min-height: ${attrs.minHeightSetDesktop}${attrs.minHeightType};
        max-width: ${attrs.widthSetDesktop}px;
        margin: ${attrs.blockTopMargin}px auto ${attrs.blockBottomMargin}px auto;
        padding: ${attrs.blockTopPadding}px ${attrs.blockRightPadding}px ${attrs.blockBottomPadding}px ${attrs.blockLeftPadding}px;
        gap: ${attrs.rowGapDesktop}px;
        text-align: ${attrs.heroLayout};
        position: relative;
        overflow: hidden;
      }
      
      /* 배경 */
      ${blockSelector}::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: -1;
        ${attrs.backgroundType === 'gradient' && attrs.gradientOverlay ? 
          `background: linear-gradient(${attrs.gradientAngle}deg, ${attrs.gradientColor1} ${attrs.gradientLocation1}%, ${attrs.gradientColor2} ${attrs.gradientLocation2}%);` :
          attrs.backgroundType === 'color' ? `background-color: ${attrs.backgroundColor};` : ''
        }
      }
      
      /* Hero 콘텐츠 컨테이너 */
      ${blockSelector} .uagb-hero-content {
        width: 100%;
        text-align: ${attrs.heroLayout};
        display: flex;
        flex-direction: column;
        align-items: ${attrs.heroLayout === 'center' ? 'center' : attrs.heroLayout === 'right' ? 'flex-end' : 'flex-start'};
        justify-content: ${attrs.heroVerticalAlign === 'center' ? 'center' : attrs.heroVerticalAlign === 'bottom' ? 'flex-end' : 'flex-start'};
      }
      
      /* 제목 */
      ${blockSelector} .uagb-hero-title {
        color: ${attrs.titleColor};
        font-family: ${attrs.titleFontFamily};
        font-weight: ${attrs.titleFontWeight};
        font-size: ${attrs.titleFontSize}${attrs.titleFontSizeType};
        line-height: ${attrs.titleLineHeight};
        letter-spacing: ${attrs.titleLetterSpacing}px;
        margin: 0 0 ${attrs.titleBottomSpacing}px 0;
      }
      
      /* 부제목 */
      ${blockSelector} .uagb-hero-subtitle {
        color: ${attrs.subtitleColor};
        font-family: ${attrs.subtitleFontFamily};
        font-weight: ${attrs.subtitleFontWeight};
        font-size: ${attrs.subtitleFontSize}${attrs.subtitleFontSizeType};
        margin: 0 0 ${attrs.subtitleBottomSpacing}px 0;
      }
      
      /* 설명 */
      ${blockSelector} .uagb-hero-description {
        color: ${attrs.descColor};
        font-family: ${attrs.descFontFamily};
        font-weight: ${attrs.descFontWeight};
        font-size: ${attrs.descFontSize}${attrs.descFontSizeType};
        line-height: ${attrs.descLineHeight};
        margin: 0 0 ${attrs.descBottomSpacing}px 0;
        max-width: 600px;
      }
      
      /* 버튼 컨테이너 */
      ${blockSelector} .uagb-hero-buttons {
        display: flex;
        gap: ${attrs.buttonGap}px;
        margin-bottom: ${attrs.buttonsBottomSpacing}px;
        justify-content: ${attrs.buttonAlign === 'center' ? 'center' : attrs.buttonAlign === 'right' ? 'flex-end' : 'flex-start'};
        flex-wrap: wrap;
      }
      
      /* 버튼 */
      ${blockSelector} .uagb-hero-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 14px 28px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
        text-decoration: none;
        transition: all 0.3s ease;
        border: 2px solid transparent;
        cursor: pointer;
      }
      
      ${blockSelector} .uagb-hero-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      }
      
      /* 통계 */
      ${blockSelector} .uagb-hero-stats {
        display: flex;
        gap: ${attrs.statsGap}px;
        justify-content: ${attrs.heroLayout === 'center' ? 'center' : attrs.heroLayout === 'right' ? 'flex-end' : 'flex-start'};
        flex-wrap: wrap;
      }
      
      ${blockSelector} .uagb-stat-item {
        text-align: center;
      }
      
      ${blockSelector} .uagb-stat-number {
        color: ${attrs.statsColor};
        font-size: ${attrs.statsFontSize}px;
        font-weight: 700;
        margin: 0 0 4px 0;
        line-height: 1;
      }
      
      ${blockSelector} .uagb-stat-label {
        color: ${attrs.statsLabelColor};
        font-size: ${attrs.statsLabelFontSize}px;
        font-weight: 500;
        margin: 0;
        opacity: 0.8;
      }
      
      /* 태블릿 스타일 */
      @media (max-width: 976px) {
        ${blockSelector} {
          flex-direction: ${attrs.directionTablet};
          min-height: ${attrs.minHeightSetTablet}${attrs.minHeightType};
          max-width: ${attrs.widthSetTablet}px;
          padding: ${attrs.blockTopPaddingTablet}px ${attrs.blockRightPaddingTablet}px ${attrs.blockBottomPaddingTablet}px ${attrs.blockLeftPaddingTablet}px;
          gap: ${attrs.rowGapTablet}px;
        }
        
        ${blockSelector} .uagb-hero-title {
          font-size: ${attrs.titleFontSizeTablet}${attrs.titleFontSizeType};
        }
        
        ${blockSelector} .uagb-hero-subtitle {
          font-size: ${attrs.subtitleFontSizeTablet}${attrs.subtitleFontSizeType};
        }
        
        ${blockSelector} .uagb-hero-description {
          font-size: ${attrs.descFontSizeTablet}${attrs.descFontSizeType};
        }
        
        ${blockSelector} .uagb-hero-buttons {
          gap: ${attrs.buttonGapTablet}px;
          ${attrs.buttonStack === 'tablet' ? 'flex-direction: column; align-items: stretch;' : ''}
        }
      }
      
      /* 모바일 스타일 */
      @media (max-width: 767px) {
        ${blockSelector} {
          flex-direction: ${attrs.directionMobile};
          min-height: ${attrs.minHeightSetMobile}${attrs.minHeightType};
          max-width: ${attrs.widthSetMobile}px;
          padding: ${attrs.blockTopPaddingMobile}px ${attrs.blockRightPaddingMobile}px ${attrs.blockBottomPaddingMobile}px ${attrs.blockLeftPaddingMobile}px;
          gap: ${attrs.rowGapMobile}px;
        }
        
        ${blockSelector} .uagb-hero-title {
          font-size: ${attrs.titleFontSizeMobile}${attrs.titleFontSizeType};
        }
        
        ${blockSelector} .uagb-hero-subtitle {
          font-size: ${attrs.subtitleFontSizeMobile}${attrs.subtitleFontSizeType};
        }
        
        ${blockSelector} .uagb-hero-description {
          font-size: ${attrs.descFontSizeMobile}${attrs.descFontSizeType};
        }
        
        ${blockSelector} .uagb-hero-buttons {
          gap: ${attrs.buttonGapMobile}px;
          ${attrs.buttonStack === 'mobile' || attrs.buttonStack === 'tablet' ? 'flex-direction: column; align-items: stretch;' : ''}
        }
        
        ${blockSelector} .uagb-hero-stats {
          gap: ${Math.max(attrs.statsGap - 10, 20)}px;
        }
      }
    `;
    
    return css;
  };

  const handleSave = useCallback(() => {
    updateAttributes(tempAttrs);
    setIsEditing(false);
  }, [tempAttrs, updateAttributes]);

  const handleCancel = useCallback(() => {
    setTempAttrs(node.attrs);
    setIsEditing(false);
  }, [node.attrs]);

  const updateTempAttr = <K extends keyof UAGBHeroContainerAttributes>(
    key: K,
    value: UAGBHeroContainerAttributes[K]
  ) => {
    setTempAttrs(prev => ({ ...prev, [key]: value }));
  };

  const updateHeroContent = <K extends keyof UAGBHeroContent>(
    key: K,
    value: UAGBHeroContent[K]
  ) => {
    setTempAttrs(prev => ({
      ...prev,
      heroContent: { ...prev.heroContent, [key]: value }
    }));
  };

  const addButton = () => {
    const newButton = {
      id: generateBlockId(),
      text: '새 버튼',
      link: '#',
      target: false,
      noFollow: false,
      style: 'primary' as const,
      backgroundColor: '#3B82F6',
      textColor: '#ffffff',
      borderColor: '#3B82F6',
      hoverBackgroundColor: '#2563EB',
      hoverTextColor: '#ffffff',
      icon: '✨',
    };
    updateHeroContent('buttons', [...tempAttrs.heroContent.buttons, newButton]);
  };

  const removeButton = (index: number) => {
    updateHeroContent('buttons', tempAttrs.heroContent.buttons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, field: string, value: any) => {
    const updatedButtons = tempAttrs.heroContent.buttons.map((button, i) => 
      i === index ? { ...button, [field]: value } : button
    );
    updateHeroContent('buttons', updatedButtons);
  };

  const addStat = () => {
    const newStat = {
      id: generateBlockId(),
      number: '100%',
      label: '새 지표',
      color: '#ffffff',
    };
    updateHeroContent('stats', [...tempAttrs.heroContent.stats, newStat]);
  };

  const removeStat = (index: number) => {
    updateHeroContent('stats', tempAttrs.heroContent.stats.filter((_, i) => i !== index));
  };

  const updateStat = (index: number, field: string, value: any) => {
    const updatedStats = tempAttrs.heroContent.stats.map((stat, i) => 
      i === index ? { ...stat, [field]: value } : stat
    );
    updateHeroContent('stats', updatedStats);
  };

  // 에디터 모드
  if (isEditing) {
    return (
      <NodeViewWrapper className="uagb-container-editor">
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Container className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Hero Container</h3>
                  <p className="text-sm text-gray-500">Configure your hero section</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>

            {/* 탭과 콘텐츠 */}
            <div className="flex-1 overflow-hidden">
              <UAGBTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabs={[
                  {
                    id: 'content',
                    label: 'Content',
                    icon: <Type className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* Hero 콘텐츠 */}
                        <UAGBPanel title="Hero Content">
                          <UAGBTextareaControl
                            label="Title"
                            value={tempAttrs.heroContent.title}
                            onChange={(value) => updateHeroContent('title', value)}
                            placeholder="Enter hero title"
                            rows={2}
                          />

                          <UAGBSelectControl
                            label="Title Tag"
                            value={tempAttrs.heroContent.titleTag}
                            onChange={(value) => updateHeroContent('titleTag', value as any)}
                            options={[
                              { label: 'H1', value: 'h1' },
                              { label: 'H2', value: 'h2' },
                              { label: 'H3', value: 'h3' },
                              { label: 'H4', value: 'h4' },
                              { label: 'H5', value: 'h5' },
                              { label: 'H6', value: 'h6' },
                            ]}
                          />

                          <UAGBTextControl
                            label="Subtitle"
                            value={tempAttrs.heroContent.subtitle}
                            onChange={(value) => updateHeroContent('subtitle', value)}
                            placeholder="Enter subtitle (optional)"
                          />

                          <UAGBTextareaControl
                            label="Description"
                            value={tempAttrs.heroContent.description}
                            onChange={(value) => updateHeroContent('description', value)}
                            placeholder="Enter hero description"
                            rows={3}
                          />
                        </UAGBPanel>

                        {/* 버튼들 */}
                        <UAGBPanel title="Buttons">
                          <div className="flex items-center justify-between mb-4">
                            <span className="font-medium">Button List</span>
                            <button
                              onClick={addButton}
                              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              <Plus className="w-4 h-4" />
                              Add Button
                            </button>
                          </div>
                          
                          <div className="space-y-4">
                            {tempAttrs.heroContent.buttons.map((button, index) => (
                              <div key={button.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="font-medium text-sm">Button {index + 1}</span>
                                  <button
                                    onClick={() => removeButton(index)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <UAGBTextControl
                                    label="Text"
                                    value={button.text}
                                    onChange={(value) => updateButton(index, 'text', value)}
                                  />
                                  <UAGBTextControl
                                    label="Link"
                                    value={button.link}
                                    onChange={(value) => updateButton(index, 'link', value)}
                                    type="url"
                                  />
                                  <UAGBSelectControl
                                    label="Style"
                                    value={button.style}
                                    onChange={(value) => updateButton(index, 'style', value)}
                                    options={[
                                      { label: 'Primary', value: 'primary' },
                                      { label: 'Secondary', value: 'secondary' },
                                      { label: 'Outline', value: 'outline' },
                                    ]}
                                  />
                                  <UAGBTextControl
                                    label="Icon"
                                    value={button.icon || ''}
                                    onChange={(value) => updateButton(index, 'icon', value)}
                                    placeholder="Emoji or icon"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </UAGBPanel>

                        {/* 통계 */}
                        <UAGBPanel title="Statistics">
                          <UAGBToggleControl
                            label="Show Statistics"
                            checked={tempAttrs.heroContent.showStats}
                            onChange={(checked) => updateHeroContent('showStats', checked)}
                          />

                          {tempAttrs.heroContent.showStats && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">Stats List</span>
                                <button
                                  onClick={addStat}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add Stat
                                </button>
                              </div>
                              
                              {tempAttrs.heroContent.stats.map((stat, index) => (
                                <div key={stat.id} className="border border-gray-200 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">Stat {index + 1}</span>
                                    <button
                                      onClick={() => removeStat(index)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    <UAGBTextControl
                                      label="Number"
                                      value={stat.number}
                                      onChange={(value) => updateStat(index, 'number', value)}
                                    />
                                    <UAGBTextControl
                                      label="Label"
                                      value={stat.label}
                                      onChange={(value) => updateStat(index, 'label', value)}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </UAGBPanel>
                      </div>
                    ),
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
                            label="Hero Layout"
                            value={tempAttrs.heroLayout}
                            onChange={(value) => updateTempAttr('heroLayout', value as any)}
                            options={[
                              { label: 'Left', value: 'left' },
                              { label: 'Center', value: 'center' },
                              { label: 'Right', value: 'right' },
                            ]}
                          />

                          <UAGBSelectControl
                            label="Vertical Alignment"
                            value={tempAttrs.heroVerticalAlign}
                            onChange={(value) => updateTempAttr('heroVerticalAlign', value as any)}
                            options={[
                              { label: 'Top', value: 'top' },
                              { label: 'Center', value: 'center' },
                              { label: 'Bottom', value: 'bottom' },
                            ]}
                          />
                        </UAGBPanel>

                        {/* 컨테이너 크기 */}
                        <UAGBPanel title="Container Size">
                          <UAGBResponsiveControl
                            label="Width"
                            values={{
                              desktop: tempAttrs.widthSetDesktop,
                              tablet: tempAttrs.widthSetTablet,
                              mobile: tempAttrs.widthSetMobile,
                            }}
                            onChange={(values) => {
                              updateTempAttr('widthSetDesktop', values.desktop);
                              updateTempAttr('widthSetTablet', values.tablet);
                              updateTempAttr('widthSetMobile', values.mobile);
                            }}
                            unit="px"
                            min={300}
                            max={2000}
                          />

                          <UAGBResponsiveControl
                            label="Min Height"
                            values={{
                              desktop: tempAttrs.minHeightSetDesktop,
                              tablet: tempAttrs.minHeightSetTablet,
                              mobile: tempAttrs.minHeightSetMobile,
                            }}
                            onChange={(values) => {
                              updateTempAttr('minHeightSetDesktop', values.desktop);
                              updateTempAttr('minHeightSetTablet', values.tablet);
                              updateTempAttr('minHeightSetMobile', values.mobile);
                            }}
                            unit={tempAttrs.minHeightType}
                            min={20}
                            max={150}
                          />
                        </UAGBPanel>

                        {/* 간격 */}
                        <UAGBPanel title="Spacing">
                          <UAGBResponsiveControl
                            label="Row Gap"
                            values={{
                              desktop: tempAttrs.rowGapDesktop,
                              tablet: tempAttrs.rowGapTablet,
                              mobile: tempAttrs.rowGapMobile,
                            }}
                            onChange={(values) => {
                              updateTempAttr('rowGapDesktop', values.desktop);
                              updateTempAttr('rowGapTablet', values.tablet);
                              updateTempAttr('rowGapMobile', values.mobile);
                            }}
                            unit="px"
                            max={100}
                          />
                        </UAGBPanel>
                      </div>
                    ),
                  },
                  {
                    id: 'style',
                    label: 'Style',
                    icon: <Palette className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* 배경 */}
                        <UAGBPanel title="Background">
                          <UAGBSelectControl
                            label="Background Type"
                            value={tempAttrs.backgroundType}
                            onChange={(value) => updateTempAttr('backgroundType', value as any)}
                            options={[
                              { label: 'None', value: 'none' },
                              { label: 'Color', value: 'color' },
                              { label: 'Gradient', value: 'gradient' },
                            ]}
                          />

                          {tempAttrs.backgroundType === 'color' && (
                            <UAGBColorControl
                              label="Background Color"
                              value={tempAttrs.backgroundColor}
                              onChange={(value) => updateTempAttr('backgroundColor', value)}
                            />
                          )}

                          {tempAttrs.backgroundType === 'gradient' && (
                            <>
                              <UAGBColorControl
                                label="Gradient Color 1"
                                value={tempAttrs.gradientColor1}
                                onChange={(value) => updateTempAttr('gradientColor1', value)}
                              />
                              <UAGBColorControl
                                label="Gradient Color 2"
                                value={tempAttrs.gradientColor2}
                                onChange={(value) => updateTempAttr('gradientColor2', value)}
                              />
                              <UAGBNumberControl
                                label="Gradient Angle"
                                value={tempAttrs.gradientAngle}
                                onChange={(value) => updateTempAttr('gradientAngle', value)}
                                min={0}
                                max={360}
                                unit="°"
                              />
                            </>
                          )}
                        </UAGBPanel>

                        {/* 간격 */}
                        <UAGBPanel title="Padding">
                          <UAGBResponsiveControl
                            label="Padding Top"
                            values={{
                              desktop: tempAttrs.blockTopPadding,
                              tablet: tempAttrs.blockTopPaddingTablet,
                              mobile: tempAttrs.blockTopPaddingMobile,
                            }}
                            onChange={(values) => {
                              updateTempAttr('blockTopPadding', values.desktop);
                              updateTempAttr('blockTopPaddingTablet', values.tablet);
                              updateTempAttr('blockTopPaddingMobile', values.mobile);
                            }}
                            unit={tempAttrs.blockPaddingUnit}
                            max={300}
                          />

                          <UAGBResponsiveControl
                            label="Padding Bottom"
                            values={{
                              desktop: tempAttrs.blockBottomPadding,
                              tablet: tempAttrs.blockBottomPaddingTablet,
                              mobile: tempAttrs.blockBottomPaddingMobile,
                            }}
                            onChange={(values) => {
                              updateTempAttr('blockBottomPadding', values.desktop);
                              updateTempAttr('blockBottomPaddingTablet', values.tablet);
                              updateTempAttr('blockBottomPaddingMobile', values.mobile);
                            }}
                            unit={tempAttrs.blockPaddingUnit}
                            max={300}
                          />
                        </UAGBPanel>
                      </div>
                    ),
                  },
                  {
                    id: 'typography',
                    label: 'Typography',
                    icon: <Type className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* 제목 타이포그래피 */}
                        <UAGBPanel title="Title Typography">
                          <UAGBColorControl
                            label="Title Color"
                            value={tempAttrs.titleColor}
                            onChange={(value) => updateTempAttr('titleColor', value)}
                          />

                          <UAGBResponsiveControl
                            label="Font Size"
                            values={{
                              desktop: tempAttrs.titleFontSize,
                              tablet: tempAttrs.titleFontSizeTablet,
                              mobile: tempAttrs.titleFontSizeMobile,
                            }}
                            onChange={(values) => {
                              updateTempAttr('titleFontSize', values.desktop);
                              updateTempAttr('titleFontSizeTablet', values.tablet);
                              updateTempAttr('titleFontSizeMobile', values.mobile);
                            }}
                            unit={tempAttrs.titleFontSizeType}
                            max={200}
                          />

                          <UAGBSelectControl
                            label="Font Weight"
                            value={tempAttrs.titleFontWeight}
                            onChange={(value) => updateTempAttr('titleFontWeight', value)}
                            options={[
                              { label: '300', value: '300' },
                              { label: '400', value: '400' },
                              { label: '500', value: '500' },
                              { label: '600', value: '600' },
                              { label: '700', value: '700' },
                              { label: '800', value: '800' },
                              { label: '900', value: '900' },
                            ]}
                          />

                          <UAGBNumberControl
                            label="Line Height"
                            value={tempAttrs.titleLineHeight}
                            onChange={(value) => updateTempAttr('titleLineHeight', value)}
                            min={0.5}
                            max={3}
                            step={0.1}
                          />
                        </UAGBPanel>

                        {/* 설명 타이포그래피 */}
                        <UAGBPanel title="Description Typography">
                          <UAGBColorControl
                            label="Description Color"
                            value={tempAttrs.descColor}
                            onChange={(value) => updateTempAttr('descColor', value)}
                          />

                          <UAGBResponsiveControl
                            label="Font Size"
                            values={{
                              desktop: tempAttrs.descFontSize,
                              tablet: tempAttrs.descFontSizeTablet,
                              mobile: tempAttrs.descFontSizeMobile,
                            }}
                            onChange={(values) => {
                              updateTempAttr('descFontSize', values.desktop);
                              updateTempAttr('descFontSizeTablet', values.tablet);
                              updateTempAttr('descFontSizeMobile', values.mobile);
                            }}
                            unit={tempAttrs.descFontSizeType}
                            max={50}
                          />
                        </UAGBPanel>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // 프론트엔드 뷰
  return (
    <NodeViewWrapper className={`uagb-container-wrapper ${selected ? 'selected' : ''}`}>
      <div 
        className={`uagb-block-${node.attrs.block_id} uagb-container`}
        style={{ position: 'relative' }}
      >
        {/* 편집 버튼 */}
        {selected && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-4 right-4 z-10 bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors shadow-lg"
            title="Edit Hero Container"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}

        {/* Hero 콘텐츠 */}
        <div className="uagb-hero-content">
          {/* 부제목 */}
          {node.attrs.heroContent.subtitle && (
            <div className="uagb-hero-subtitle">
              {node.attrs.heroContent.subtitle}
            </div>
          )}

          {/* 제목 */}
          {React.createElement(
            node.attrs.heroContent.titleTag,
            { className: 'uagb-hero-title' },
            node.attrs.heroContent.title.split('\n').map((line, index) => (
              <React.Fragment key={index}>
                {line}
                {index < node.attrs.heroContent.title.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))
          )}

          {/* 설명 */}
          {node.attrs.heroContent.description && (
            <div className="uagb-hero-description">
              {node.attrs.heroContent.description.split('\n').map((line, index) => (
                <React.Fragment key={index}>
                  {line}
                  {index < node.attrs.heroContent.description.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* 버튼들 */}
          {node.attrs.heroContent.buttons.length > 0 && (
            <div className="uagb-hero-buttons">
              {node.attrs.heroContent.buttons.map((button, index) => (
                <a
                  key={button.id}
                  href={button.link}
                  className="uagb-hero-button"
                  target={button.target ? '_blank' : undefined}
                  rel={button.noFollow ? 'nofollow' : undefined}
                  style={{
                    backgroundColor: button.backgroundColor,
                    color: button.textColor,
                    borderColor: button.borderColor,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = button.hoverBackgroundColor;
                    e.currentTarget.style.color = button.hoverTextColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = button.backgroundColor;
                    e.currentTarget.style.color = button.textColor;
                  }}
                >
                  {button.icon && <span>{button.icon}</span>}
                  <span>{button.text}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              ))}
            </div>
          )}

          {/* 통계 */}
          {node.attrs.heroContent.showStats && node.attrs.heroContent.stats.length > 0 && (
            <div className="uagb-hero-stats">
              {node.attrs.heroContent.stats.map((stat) => (
                <div key={stat.id} className="uagb-stat-item">
                  <div className="uagb-stat-number">{stat.number}</div>
                  <div className="uagb-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 추가 콘텐츠를 위한 NodeViewContent */}
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
};

export default UAGBContainerView;