// UAGB Call to Action Block View - Spectra 스타일
// WordPress Gutenberg Inspector Controls 스타일을 모방

import React, { useState, useCallback, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Edit3, Save, X, Plus, Trash2, ArrowRight, Layout, Palette, Type, Settings } from 'lucide-react';
import { 
  UAGBCallToActionAttributes,
  UAGBCSSGenerator, 
  injectCSS,
  UAGBPanel,
  UAGBTabs,
  UAGBTextControl,
  generateBlockId
} from './tiptap-block';

interface UAGBCallToActionViewProps {
  node: {
    attrs: UAGBCallToActionAttributes;
  };
  updateAttributes: (attrs: Partial<UAGBCallToActionAttributes>) => void;
  selected: boolean;
}

const UAGBCallToActionView: React.FC<UAGBCallToActionViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempAttrs, setTempAttrs] = useState<UAGBCallToActionAttributes>(node.attrs);
  const [activeTab, setActiveTab] = useState('general');

  // CSS 생성 및 주입
  useEffect(() => {
    const cssGenerator = UAGBCSSGenerator.getInstance();
    const css = cssGenerator.generateBlockCSS('uagb/call-to-action', node.attrs, node.attrs.block_id);
    injectCSS(css, node.attrs.block_id);
  }, [node.attrs]);

  const handleSave = useCallback(() => {
    updateAttributes(tempAttrs);
    setIsEditing(false);
  }, [tempAttrs, updateAttributes]);

  const handleCancel = useCallback(() => {
    setTempAttrs(node.attrs);
    setIsEditing(false);
  }, [node.attrs]);

  const updateTempAttr = <K extends keyof UAGBCallToActionAttributes>(
    key: K,
    value: UAGBCallToActionAttributes[K]
  ) => {
    setTempAttrs(prev => ({ ...prev, [key]: value }));
  };

  const addButton = () => {
    const newButton = {
      text: '새 버튼',
      link: '#',
      target: false,
      noFollow: false,
      backgroundColor: '#3B82F6',
      backgroundHoverColor: '#2563EB',
      color: '#ffffff',
      hoverColor: '#ffffff',
      borderStyle: 'none',
      borderWidth: 0,
      borderColor: 'transparent',
      borderHoverColor: 'transparent',
      borderRadius: 8,
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 24,
      paddingRight: 24,
      paddingUnit: 'px' as const,
      fontFamily: 'inherit',
      fontWeight: '600',
      fontSize: 16,
      fontSizeType: 'px' as const,
      fontSizeTablet: 15,
      fontSizeMobile: 14,
      lineHeight: 1.5,
      letterSpacing: 0,
      icon: '✨',
      iconPosition: 'before' as const,
      iconSpacing: 8,
    };
    updateTempAttr('ctaButtons', [...tempAttrs.ctaButtons, newButton]);
  };

  const removeButton = (index: number) => {
    updateTempAttr('ctaButtons', tempAttrs.ctaButtons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, field: string, value: any) => {
    const updatedButtons = tempAttrs.ctaButtons.map((button, i) => 
      i === index ? { ...button, [field]: value } : button
    );
    updateTempAttr('ctaButtons', updatedButtons);
  };

  const addTrustItem = () => {
    updateTempAttr('trustItems', [...tempAttrs.trustItems, '✅ 새로운 혜택']);
  };

  const removeTrustItem = (index: number) => {
    updateTempAttr('trustItems', tempAttrs.trustItems.filter((_, i) => i !== index));
  };

  const updateTrustItem = (index: number, value: string) => {
    const updatedItems = tempAttrs.trustItems.map((item, i) => 
      i === index ? value : item
    );
    updateTempAttr('trustItems', updatedItems);
  };

  // 에디터 모드
  if (isEditing) {
    return (
      <NodeViewWrapper className="uagb-cta-editor">
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Layout className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Call to Action</h3>
                  <p className="text-sm text-gray-500">Configure your CTA section</p>
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
                    id: 'general',
                    label: 'General',
                    icon: <Layout className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* 정렬 */}
                        <UAGBSelectControl
                          label="Alignment"
                          value={tempAttrs.align}
                          onChange={(value) => updateTempAttr('align', value as any)}
                          options={[
                            { label: 'Left', value: 'left' },
                            { label: 'Center', value: 'center' },
                            { label: 'Right', value: 'right' },
                          ]}
                        />

                        {/* 제목 */}
                        <UAGBTextareaControl
                          label="Title"
                          value={tempAttrs.ctaTitle}
                          onChange={(value) => updateTempAttr('ctaTitle', value)}
                          placeholder="Enter your CTA title"
                          rows={2}
                        />

                        <UAGBSelectControl
                          label="Title Tag"
                          value={tempAttrs.titleTag}
                          onChange={(value) => updateTempAttr('titleTag', value as any)}
                          options={[
                            { label: 'H1', value: 'h1' },
                            { label: 'H2', value: 'h2' },
                            { label: 'H3', value: 'h3' },
                            { label: 'H4', value: 'h4' },
                            { label: 'H5', value: 'h5' },
                            { label: 'H6', value: 'h6' },
                            { label: 'P', value: 'p' },
                            { label: 'Span', value: 'span' },
                          ]}
                        />

                        {/* 설명 */}
                        <UAGBTextareaControl
                          label="Description"
                          value={tempAttrs.ctaDescription}
                          onChange={(value) => updateTempAttr('ctaDescription', value)}
                          placeholder="Enter your CTA description"
                          rows={2}
                        />

                        {/* 긴급성 메시지 */}
                        <UAGBPanel title="Urgency Message">
                          <UAGBToggleControl
                            label="Show Urgency Message"
                            checked={tempAttrs.showUrgency}
                            onChange={(checked) => updateTempAttr('showUrgency', checked)}
                          />
                          {tempAttrs.showUrgency && (
                            <UAGBTextControl
                              label="Urgency Text"
                              value={tempAttrs.urgencyText}
                              onChange={(value) => updateTempAttr('urgencyText', value)}
                              placeholder="Enter urgency message"
                            />
                          )}
                        </UAGBPanel>

                        {/* 신뢰 요소 */}
                        <UAGBPanel title="Trust Elements">
                          <UAGBToggleControl
                            label="Show Trust Elements"
                            checked={tempAttrs.showTrust}
                            onChange={(checked) => updateTempAttr('showTrust', checked)}
                          />
                          {tempAttrs.showTrust && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Trust Items</span>
                                <button
                                  onClick={addTrustItem}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                >
                                  <Plus className="w-3 h-3" />
                                  Add
                                </button>
                              </div>
                              {tempAttrs.trustItems.map((item, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => updateTrustItem(index, e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                  />
                                  <button
                                    onClick={() => removeTrustItem(index)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
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
                        <UAGBPanel title="Spacing">
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
                            unit={tempAttrs.titleLineHeightType}
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
                            max={100}
                          />

                          <UAGBNumberControl
                            label="Line Height"
                            value={tempAttrs.descLineHeight}
                            onChange={(value) => updateTempAttr('descLineHeight', value)}
                            min={0.5}
                            max={3}
                            step={0.1}
                            unit={tempAttrs.descLineHeightType}
                          />
                        </UAGBPanel>
                      </div>
                    ),
                  },
                  {
                    id: 'buttons',
                    label: 'Buttons',
                    icon: <Settings className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* 버튼 정렬 */}
                        <UAGBSelectControl
                          label="Button Alignment"
                          value={tempAttrs.buttonAlign}
                          onChange={(value) => updateTempAttr('buttonAlign', value as any)}
                          options={[
                            { label: 'Left', value: 'left' },
                            { label: 'Center', value: 'center' },
                            { label: 'Right', value: 'right' },
                            { label: 'Full Width', value: 'full' },
                          ]}
                        />

                        {/* 버튼 간격 */}
                        <UAGBResponsiveControl
                          label="Button Gap"
                          values={{
                            desktop: tempAttrs.buttonGap,
                            tablet: tempAttrs.buttonGapTablet,
                            mobile: tempAttrs.buttonGapMobile,
                          }}
                          onChange={(values) => {
                            updateTempAttr('buttonGap', values.desktop);
                            updateTempAttr('buttonGapTablet', values.tablet);
                            updateTempAttr('buttonGapMobile', values.mobile);
                          }}
                          unit="px"
                          max={100}
                        />

                        {/* 버튼 목록 */}
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
                            {tempAttrs.ctaButtons.map((button, index) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-4">
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
                                  <UAGBColorControl
                                    label="Background"
                                    value={button.backgroundColor}
                                    onChange={(value) => updateButton(index, 'backgroundColor', value)}
                                  />
                                  <UAGBColorControl
                                    label="Text Color"
                                    value={button.color}
                                    onChange={(value) => updateButton(index, 'color', value)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
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
    <NodeViewWrapper className={`uagb-cta-wrapper ${selected ? 'selected' : ''}`}>
      <div 
        className={`uagb-block-${node.attrs.block_id} uagb-call-to-action`}
        style={{
          position: 'relative',
        }}
      >
        {/* 편집 버튼 */}
        {selected && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-4 right-4 z-10 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            title="Edit Call to Action"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}

        {/* CTA 콘텐츠 */}
        <div className="uagb-cta-content">
          {/* 긴급성 메시지 */}
          {node.attrs.showUrgency && node.attrs.urgencyText && (
            <div className="uagb-cta-urgency">
              {node.attrs.urgencyText}
            </div>
          )}

          {/* 제목 */}
          {React.createElement(
            node.attrs.titleTag,
            { 
              className: 'uagb-cta-title',
              style: { margin: 0 }
            },
            node.attrs.ctaTitle.split('\n').map((line, index) => (
              <React.Fragment key={index}>
                {line}
                {index < node.attrs.ctaTitle.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))
          )}
          
          {/* 설명 */}
          {node.attrs.ctaDescription && (
            <div className="uagb-cta-description">
              {node.attrs.ctaDescription.split('\n').map((line, index) => (
                <React.Fragment key={index}>
                  {line}
                  {index < node.attrs.ctaDescription.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          )}
          
          {/* 버튼들 */}
          {node.attrs.ctaButtons.length > 0 && (
            <div className="uagb-cta-buttons">
              {node.attrs.ctaButtons.map((button, index) => (
                <a
                  key={index}
                  href={button.link}
                  className="uagb-cta-button"
                  target={button.target ? '_blank' : undefined}
                  rel={button.noFollow ? 'nofollow' : undefined}
                  style={{
                    backgroundColor: button.backgroundColor,
                    color: button.color,
                    borderWidth: button.borderWidth,
                    borderStyle: button.borderStyle,
                    borderColor: button.borderColor,
                    borderRadius: `${button.borderRadius}px`,
                    padding: `${button.paddingTop}${button.paddingUnit} ${button.paddingRight}${button.paddingUnit} ${button.paddingBottom}${button.paddingUnit} ${button.paddingLeft}${button.paddingUnit}`,
                    fontFamily: button.fontFamily,
                    fontWeight: button.fontWeight,
                    fontSize: `${button.fontSize}${button.fontSizeType}`,
                    lineHeight: button.lineHeight,
                    letterSpacing: `${button.letterSpacing}px`,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: `${button.iconSpacing || 8}px`,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = button.backgroundHoverColor;
                    e.currentTarget.style.color = button.hoverColor;
                    e.currentTarget.style.borderColor = button.borderHoverColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = button.backgroundColor;
                    e.currentTarget.style.color = button.color;
                    e.currentTarget.style.borderColor = button.borderColor;
                  }}
                >
                  {button.icon && button.iconPosition === 'before' && (
                    <span>{button.icon}</span>
                  )}
                  <span>{button.text}</span>
                  {button.icon && button.iconPosition === 'after' && (
                    <span>{button.icon}</span>
                  )}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              ))}
            </div>
          )}

          {/* 신뢰 요소 */}
          {node.attrs.showTrust && node.attrs.trustItems.length > 0 && (
            <div className="uagb-cta-trust">
              {node.attrs.trustItems.map((item, index) => (
                <div key={index} className="uagb-trust-item">
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export default UAGBCallToActionView;