// UAGB Info Box View - Spectra 스타일
// 여러 개의 정보 박스 섹션 관리

import React, { useState, useCallback, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Edit3, Save, X, Plus, Trash2, ArrowRight, Layout, Palette, Type, Settings, Grid, Image, Link } from 'lucide-react';
import { UAGBInfoBoxSectionAttributes, UAGBInfoBoxItem } from './UAGBInfoBoxBlock';
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

interface UAGBInfoBoxViewProps {
  node: {
    attrs: UAGBInfoBoxSectionAttributes;
  };
  updateAttributes: (attrs: Partial<UAGBInfoBoxSectionAttributes>) => void;
  selected: boolean;
}

const UAGBInfoBoxView: React.FC<UAGBInfoBoxViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempAttrs, setTempAttrs] = useState<UAGBInfoBoxSectionAttributes>(node.attrs);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  // CSS 생성 및 주입
  useEffect(() => {
    const cssGenerator = UAGBCSSGenerator.getInstance();
    const css = generateInfoBoxSectionCSS(node.attrs);
    injectCSS(css, node.attrs.block_id);
  }, [node.attrs]);

  // 커스텀 CSS 생성 함수
  const generateInfoBoxSectionCSS = (attrs: UAGBInfoBoxSectionAttributes): string => {
    const blockSelector = `.uagb-block-${attrs.block_id}`;
    
    let css = `
      /* 섹션 스타일 */
      ${blockSelector} {
        background-color: ${attrs.sectionBackgroundColor};
        padding: ${attrs.sectionTopPadding}px ${attrs.sectionRightPadding}px ${attrs.sectionBottomPadding}px ${attrs.sectionLeftPadding}px;
        margin: ${attrs.blockTopMargin}px ${attrs.blockRightMargin}px ${attrs.blockBottomMargin}px ${attrs.blockLeftMargin}px;
      }
      
      /* 섹션 제목 */
      ${blockSelector} .uagb-section-title {
        color: ${attrs.sectionTitleColor};
        font-family: ${attrs.sectionTitleFontFamily};
        font-weight: ${attrs.sectionTitleFontWeight};
        font-size: ${attrs.sectionTitleFontSize}${attrs.sectionTitleFontSizeType};
        line-height: ${attrs.sectionTitleLineHeight}${attrs.sectionTitleLineHeightType === 'px' ? 'px' : ''};
        letter-spacing: ${attrs.sectionTitleLetterSpacing}px;
        text-align: ${attrs.sectionAlign};
        margin: 0 0 ${attrs.sectionTitleBottomSpacing}px 0;
      }
      
      /* 섹션 설명 */
      ${blockSelector} .uagb-section-description {
        color: ${attrs.sectionDescColor};
        font-family: ${attrs.sectionDescFontFamily};
        font-weight: ${attrs.sectionDescFontWeight};
        font-size: ${attrs.sectionDescFontSize}${attrs.sectionDescFontSizeType};
        line-height: ${attrs.sectionDescLineHeight}${attrs.sectionDescLineHeightType === 'px' ? 'px' : ''};
        letter-spacing: ${attrs.sectionDescLetterSpacing}px;
        text-align: ${attrs.sectionAlign};
        margin: 0 0 ${attrs.sectionDescBottomSpacing}px 0;
      }
      
      /* Info Box 그리드 */
      ${blockSelector} .uagb-info-box-grid {
        display: grid;
        grid-template-columns: repeat(${attrs.columns}, 1fr);
        gap: ${attrs.gap}px;
      }
      
      /* Info Box 아이템 */
      ${blockSelector} .uagb-info-box-item {
        background: #ffffff;
        border-radius: 12px;
        padding: 30px;
        text-align: center;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        transition: all 0.3s ease;
      }
      
      ${blockSelector} .uagb-info-box-item:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }
      
      /* 아이콘 */
      ${blockSelector} .uagb-info-box-icon {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px auto;
        font-size: 36px;
      }
      
      /* 제목 */
      ${blockSelector} .uagb-info-box-title {
        font-size: 20px;
        font-weight: 600;
        margin: 0 0 12px 0;
        line-height: 1.4;
      }
      
      /* 설명 */
      ${blockSelector} .uagb-info-box-desc {
        font-size: 16px;
        line-height: 1.6;
        margin: 0 0 20px 0;
        opacity: 0.8;
      }
      
      /* 버튼 */
      ${blockSelector} .uagb-info-box-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: 6px;
        font-weight: 500;
        text-decoration: none;
        transition: all 0.2s ease;
        border: 2px solid transparent;
      }
      
      ${blockSelector} .uagb-info-box-button:hover {
        transform: translateY(-1px);
      }
      
      /* 태블릿 스타일 */
      @media (max-width: 976px) {
        ${blockSelector} {
          padding: ${attrs.sectionTopPaddingTablet}px ${attrs.sectionRightPaddingTablet}px ${attrs.sectionBottomPaddingTablet}px ${attrs.sectionLeftPaddingTablet}px;
        }
        
        ${blockSelector} .uagb-section-title {
          font-size: ${attrs.sectionTitleFontSizeTablet}${attrs.sectionTitleFontSizeType};
          text-align: ${attrs.sectionAlignTablet || attrs.sectionAlign};
        }
        
        ${blockSelector} .uagb-section-description {
          font-size: ${attrs.sectionDescFontSizeTablet}${attrs.sectionDescFontSizeType};
          text-align: ${attrs.sectionAlignTablet || attrs.sectionAlign};
        }
        
        ${blockSelector} .uagb-info-box-grid {
          grid-template-columns: repeat(${attrs.columnsTablet}, 1fr);
          gap: ${attrs.gapTablet}px;
        }
      }
      
      /* 모바일 스타일 */
      @media (max-width: 767px) {
        ${blockSelector} {
          padding: ${attrs.sectionTopPaddingMobile}px ${attrs.sectionRightPaddingMobile}px ${attrs.sectionBottomPaddingMobile}px ${attrs.sectionLeftPaddingMobile}px;
        }
        
        ${blockSelector} .uagb-section-title {
          font-size: ${attrs.sectionTitleFontSizeMobile}${attrs.sectionTitleFontSizeType};
          text-align: ${attrs.sectionAlignMobile || attrs.sectionAlign};
        }
        
        ${blockSelector} .uagb-section-description {
          font-size: ${attrs.sectionDescFontSizeMobile}${attrs.sectionDescFontSizeType};
          text-align: ${attrs.sectionAlignMobile || attrs.sectionAlign};
        }
        
        ${blockSelector} .uagb-info-box-grid {
          grid-template-columns: repeat(${attrs.columnsMobile}, 1fr);
          gap: ${attrs.gapMobile}px;
        }
        
        ${blockSelector} .uagb-info-box-item {
          padding: 20px;
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

  const updateTempAttr = <K extends keyof UAGBInfoBoxSectionAttributes>(
    key: K,
    value: UAGBInfoBoxSectionAttributes[K]
  ) => {
    setTempAttrs(prev => ({ ...prev, [key]: value }));
  };

  const addInfoBoxItem = () => {
    const newItem: UAGBInfoBoxItem = {
      id: generateBlockId(),
      icon: '✨',
      iconType: 'icon',
      title: '새로운 정보 박스',
      description: '여기에 설명을 입력하세요.',
      showButton: true,
      buttonText: '자세히 보기',
      buttonLink: '#',
      buttonTarget: false,
      buttonNoFollow: false,
      iconColor: '#3b82f6',
      iconBackgroundColor: '#eff6ff',
      iconSize: 48,
      titleColor: '#1f2937',
      descColor: '#6b7280',
      buttonBgColor: '#3b82f6',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#3b82f6',
      iconPosition: 'top',
    };
    updateTempAttr('infoBoxItems', [...tempAttrs.infoBoxItems, newItem]);
  };

  const removeInfoBoxItem = (index: number) => {
    updateTempAttr('infoBoxItems', tempAttrs.infoBoxItems.filter((_, i) => i !== index));
    if (selectedItemIndex === index) {
      setSelectedItemIndex(null);
    }
  };

  const updateInfoBoxItem = (index: number, field: keyof UAGBInfoBoxItem, value: any) => {
    const updatedItems = tempAttrs.infoBoxItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    updateTempAttr('infoBoxItems', updatedItems);
  };

  const duplicateInfoBoxItem = (index: number) => {
    const itemToDuplicate = { ...tempAttrs.infoBoxItems[index] };
    itemToDuplicate.id = generateBlockId();
    itemToDuplicate.title = `${itemToDuplicate.title} (복사본)`;
    updateTempAttr('infoBoxItems', [...tempAttrs.infoBoxItems, itemToDuplicate]);
  };

  // 에디터 모드
  if (isEditing) {
    return (
      <NodeViewWrapper className="uagb-info-box-editor">
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Grid className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Info Box Section</h3>
                  <p className="text-sm text-gray-500">Configure your information boxes</p>
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
            <div className="flex-1 overflow-hidden flex">
              {/* 사이드바 - 아이템 리스트 */}
              <div className="w-80 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Info Box Items</h4>
                    <button
                      onClick={addInfoBoxItem}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {tempAttrs.infoBoxItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedItemIndex === index 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedItemIndex(index)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{item.icon}</span>
                            <div>
                              <div className="font-medium text-sm truncate">{item.title}</div>
                              <div className="text-xs text-gray-500">Item {index + 1}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateInfoBoxItem(index);
                              }}
                              className="text-gray-400 hover:text-gray-600 text-xs"
                              title="Duplicate"
                            >
                              📋
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeInfoBoxItem(index);
                              }}
                              className="text-red-400 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 레이아웃 설정 */}
                <div className="p-4 space-y-4">
                  <UAGBResponsiveControl
                    label="Columns"
                    values={{
                      desktop: tempAttrs.columns,
                      tablet: tempAttrs.columnsTablet,
                      mobile: tempAttrs.columnsMobile,
                    }}
                    onChange={(values) => {
                      updateTempAttr('columns', values.desktop);
                      updateTempAttr('columnsTablet', values.tablet);
                      updateTempAttr('columnsMobile', values.mobile);
                    }}
                    unit=""
                    min={1}
                    max={6}
                  />

                  <UAGBResponsiveControl
                    label="Gap"
                    values={{
                      desktop: tempAttrs.gap,
                      tablet: tempAttrs.gapTablet,
                      mobile: tempAttrs.gapMobile,
                    }}
                    onChange={(values) => {
                      updateTempAttr('gap', values.desktop);
                      updateTempAttr('gapTablet', values.tablet);
                      updateTempAttr('gapMobile', values.mobile);
                    }}
                    unit="px"
                    max={100}
                  />
                </div>
              </div>

              {/* 메인 편집 영역 */}
              <div className="flex-1 overflow-hidden">
                <UAGBTabs
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  tabs={[
                    {
                      id: 'general',
                      label: 'General',
                      icon: <Layout className="w-4 h-4" />,
                      content: (
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                          {/* 섹션 설정 */}
                          <UAGBPanel title="Section Settings">
                            <UAGBTextareaControl
                              label="Section Title"
                              value={tempAttrs.sectionTitle}
                              onChange={(value) => updateTempAttr('sectionTitle', value)}
                              placeholder="Enter section title"
                              rows={2}
                            />

                            <UAGBSelectControl
                              label="Title Tag"
                              value={tempAttrs.sectionTitleTag}
                              onChange={(value) => updateTempAttr('sectionTitleTag', value as any)}
                              options={[
                                { label: 'H1', value: 'h1' },
                                { label: 'H2', value: 'h2' },
                                { label: 'H3', value: 'h3' },
                                { label: 'H4', value: 'h4' },
                                { label: 'H5', value: 'h5' },
                                { label: 'H6', value: 'h6' },
                              ]}
                            />

                            <UAGBTextareaControl
                              label="Section Description"
                              value={tempAttrs.sectionDescription}
                              onChange={(value) => updateTempAttr('sectionDescription', value)}
                              placeholder="Enter section description"
                              rows={2}
                            />

                            <UAGBSelectControl
                              label="Section Alignment"
                              value={tempAttrs.sectionAlign}
                              onChange={(value) => updateTempAttr('sectionAlign', value as any)}
                              options={[
                                { label: 'Left', value: 'left' },
                                { label: 'Center', value: 'center' },
                                { label: 'Right', value: 'right' },
                              ]}
                            />
                          </UAGBPanel>

                          {/* 선택된 아이템 설정 */}
                          {selectedItemIndex !== null && (
                            <UAGBPanel title={`Item ${selectedItemIndex + 1} Settings`}>
                              <UAGBTextControl
                                label="Icon/Emoji"
                                value={tempAttrs.infoBoxItems[selectedItemIndex].icon}
                                onChange={(value) => updateInfoBoxItem(selectedItemIndex, 'icon', value)}
                                placeholder="Enter emoji or icon"
                              />

                              <UAGBTextControl
                                label="Title"
                                value={tempAttrs.infoBoxItems[selectedItemIndex].title}
                                onChange={(value) => updateInfoBoxItem(selectedItemIndex, 'title', value)}
                                placeholder="Enter title"
                              />

                              <UAGBTextareaControl
                                label="Description"
                                value={tempAttrs.infoBoxItems[selectedItemIndex].description}
                                onChange={(value) => updateInfoBoxItem(selectedItemIndex, 'description', value)}
                                placeholder="Enter description"
                                rows={3}
                              />

                              <UAGBToggleControl
                                label="Show Button"
                                checked={tempAttrs.infoBoxItems[selectedItemIndex].showButton}
                                onChange={(checked) => updateInfoBoxItem(selectedItemIndex, 'showButton', checked)}
                              />

                              {tempAttrs.infoBoxItems[selectedItemIndex].showButton && (
                                <>
                                  <UAGBTextControl
                                    label="Button Text"
                                    value={tempAttrs.infoBoxItems[selectedItemIndex].buttonText}
                                    onChange={(value) => updateInfoBoxItem(selectedItemIndex, 'buttonText', value)}
                                    placeholder="Button text"
                                  />

                                  <UAGBTextControl
                                    label="Button Link"
                                    value={tempAttrs.infoBoxItems[selectedItemIndex].buttonLink}
                                    onChange={(value) => updateInfoBoxItem(selectedItemIndex, 'buttonLink', value)}
                                    placeholder="https://example.com"
                                    type="url"
                                  />
                                </>
                              )}
                            </UAGBPanel>
                          )}
                        </div>
                      ),
                    },
                    {
                      id: 'style',
                      label: 'Style',
                      icon: <Palette className="w-4 h-4" />,
                      content: (
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                          {/* 섹션 배경 */}
                          <UAGBPanel title="Section Background">
                            <UAGBSelectControl
                              label="Background Type"
                              value={tempAttrs.sectionBackgroundType}
                              onChange={(value) => updateTempAttr('sectionBackgroundType', value as any)}
                              options={[
                                { label: 'None', value: 'none' },
                                { label: 'Color', value: 'color' },
                                { label: 'Gradient', value: 'gradient' },
                              ]}
                            />

                            {tempAttrs.sectionBackgroundType === 'color' && (
                              <UAGBColorControl
                                label="Background Color"
                                value={tempAttrs.sectionBackgroundColor}
                                onChange={(value) => updateTempAttr('sectionBackgroundColor', value)}
                              />
                            )}
                          </UAGBPanel>

                          {/* 섹션 간격 */}
                          <UAGBPanel title="Section Spacing">
                            <UAGBResponsiveControl
                              label="Padding Top"
                              values={{
                                desktop: tempAttrs.sectionTopPadding,
                                tablet: tempAttrs.sectionTopPaddingTablet,
                                mobile: tempAttrs.sectionTopPaddingMobile,
                              }}
                              onChange={(values) => {
                                updateTempAttr('sectionTopPadding', values.desktop);
                                updateTempAttr('sectionTopPaddingTablet', values.tablet);
                                updateTempAttr('sectionTopPaddingMobile', values.mobile);
                              }}
                              unit="px"
                              max={200}
                            />

                            <UAGBResponsiveControl
                              label="Padding Bottom"
                              values={{
                                desktop: tempAttrs.sectionBottomPadding,
                                tablet: tempAttrs.sectionBottomPaddingTablet,
                                mobile: tempAttrs.sectionBottomPaddingMobile,
                              }}
                              onChange={(values) => {
                                updateTempAttr('sectionBottomPadding', values.desktop);
                                updateTempAttr('sectionBottomPaddingTablet', values.tablet);
                                updateTempAttr('sectionBottomPaddingMobile', values.mobile);
                              }}
                              unit="px"
                              max={200}
                            />
                          </UAGBPanel>

                          {/* 선택된 아이템 스타일 */}
                          {selectedItemIndex !== null && (
                            <UAGBPanel title={`Item ${selectedItemIndex + 1} Colors`}>
                              <UAGBColorControl
                                label="Icon Color"
                                value={tempAttrs.infoBoxItems[selectedItemIndex].iconColor}
                                onChange={(value) => updateInfoBoxItem(selectedItemIndex, 'iconColor', value)}
                              />

                              <UAGBColorControl
                                label="Icon Background"
                                value={tempAttrs.infoBoxItems[selectedItemIndex].iconBackgroundColor}
                                onChange={(value) => updateInfoBoxItem(selectedItemIndex, 'iconBackgroundColor', value)}
                              />

                              <UAGBColorControl
                                label="Title Color"
                                value={tempAttrs.infoBoxItems[selectedItemIndex].titleColor}
                                onChange={(value) => updateInfoBoxItem(selectedItemIndex, 'titleColor', value)}
                              />

                              <UAGBColorControl
                                label="Description Color"
                                value={tempAttrs.infoBoxItems[selectedItemIndex].descColor}
                                onChange={(value) => updateInfoBoxItem(selectedItemIndex, 'descColor', value)}
                              />

                              {tempAttrs.infoBoxItems[selectedItemIndex].showButton && (
                                <>
                                  <UAGBColorControl
                                    label="Button Background"
                                    value={tempAttrs.infoBoxItems[selectedItemIndex].buttonBgColor}
                                    onChange={(value) => updateInfoBoxItem(selectedItemIndex, 'buttonBgColor', value)}
                                  />

                                  <UAGBColorControl
                                    label="Button Text Color"
                                    value={tempAttrs.infoBoxItems[selectedItemIndex].buttonTextColor}
                                    onChange={(value) => updateInfoBoxItem(selectedItemIndex, 'buttonTextColor', value)}
                                  />
                                </>
                              )}
                            </UAGBPanel>
                          )}
                        </div>
                      ),
                    },
                    {
                      id: 'typography',
                      label: 'Typography',
                      icon: <Type className="w-4 h-4" />,
                      content: (
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                          {/* 섹션 제목 타이포그래피 */}
                          <UAGBPanel title="Section Title Typography">
                            <UAGBColorControl
                              label="Title Color"
                              value={tempAttrs.sectionTitleColor}
                              onChange={(value) => updateTempAttr('sectionTitleColor', value)}
                            />

                            <UAGBResponsiveControl
                              label="Font Size"
                              values={{
                                desktop: tempAttrs.sectionTitleFontSize,
                                tablet: tempAttrs.sectionTitleFontSizeTablet,
                                mobile: tempAttrs.sectionTitleFontSizeMobile,
                              }}
                              onChange={(values) => {
                                updateTempAttr('sectionTitleFontSize', values.desktop);
                                updateTempAttr('sectionTitleFontSizeTablet', values.tablet);
                                updateTempAttr('sectionTitleFontSizeMobile', values.mobile);
                              }}
                              unit={tempAttrs.sectionTitleFontSizeType}
                              max={100}
                            />

                            <UAGBSelectControl
                              label="Font Weight"
                              value={tempAttrs.sectionTitleFontWeight}
                              onChange={(value) => updateTempAttr('sectionTitleFontWeight', value)}
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
                          </UAGBPanel>

                          {/* 섹션 설명 타이포그래피 */}
                          <UAGBPanel title="Section Description Typography">
                            <UAGBColorControl
                              label="Description Color"
                              value={tempAttrs.sectionDescColor}
                              onChange={(value) => updateTempAttr('sectionDescColor', value)}
                            />

                            <UAGBResponsiveControl
                              label="Font Size"
                              values={{
                                desktop: tempAttrs.sectionDescFontSize,
                                tablet: tempAttrs.sectionDescFontSizeTablet,
                                mobile: tempAttrs.sectionDescFontSizeMobile,
                              }}
                              onChange={(values) => {
                                updateTempAttr('sectionDescFontSize', values.desktop);
                                updateTempAttr('sectionDescFontSizeTablet', values.tablet);
                                updateTempAttr('sectionDescFontSizeMobile', values.mobile);
                              }}
                              unit={tempAttrs.sectionDescFontSizeType}
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
        </div>
      </NodeViewWrapper>
    );
  }

  // 프론트엔드 뷰
  return (
    <NodeViewWrapper className={`uagb-info-box-wrapper ${selected ? 'selected' : ''}`}>
      <div 
        className={`uagb-block-${node.attrs.block_id} uagb-info-box-section`}
        style={{ position: 'relative' }}
      >
        {/* 편집 버튼 */}
        {selected && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-4 right-4 z-10 bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
            title="Edit Info Box Section"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}

        {/* 섹션 제목 */}
        {React.createElement(
          node.attrs.sectionTitleTag,
          { className: 'uagb-section-title' },
          node.attrs.sectionTitle.split('\n').map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < node.attrs.sectionTitle.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))
        )}

        {/* 섹션 설명 */}
        {node.attrs.sectionDescription && (
          <div className="uagb-section-description">
            {node.attrs.sectionDescription}
          </div>
        )}

        {/* Info Box 그리드 */}
        <div className="uagb-info-box-grid">
          {node.attrs.infoBoxItems.map((item, index) => (
            <div key={item.id} className="uagb-info-box-item">
              {/* 아이콘 */}
              <div 
                className="uagb-info-box-icon"
                style={{
                  backgroundColor: item.iconBackgroundColor,
                  color: item.iconColor,
                }}
              >
                {item.iconType === 'icon' ? (
                  <span style={{ fontSize: `${item.iconSize}px` }}>{item.icon}</span>
                ) : (
                  <img 
                    src={item.imageURL} 
                    alt={item.title}
                    style={{ width: `${item.iconSize}px`, height: `${item.iconSize}px` }}
                  />
                )}
              </div>

              {/* 제목 */}
              <h3 
                className="uagb-info-box-title"
                style={{ color: item.titleColor }}
              >
                {item.title}
              </h3>

              {/* 설명 */}
              <p 
                className="uagb-info-box-desc"
                style={{ color: item.descColor }}
              >
                {item.description}
              </p>

              {/* 버튼 */}
              {item.showButton && item.buttonText && (
                <a
                  href={item.buttonLink}
                  className="uagb-info-box-button"
                  target={item.buttonTarget ? '_blank' : undefined}
                  rel={item.buttonNoFollow ? 'nofollow' : undefined}
                  style={{
                    backgroundColor: item.buttonBgColor,
                    color: item.buttonTextColor,
                    borderColor: item.buttonBorderColor,
                  }}
                >
                  {item.buttonText}
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export default UAGBInfoBoxView;