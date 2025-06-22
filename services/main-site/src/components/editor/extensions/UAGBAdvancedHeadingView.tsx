// UAGB Advanced Heading View - Spectra 스타일
// 고급 제목 블록 뷰 컴포넌트

import React, { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { 
  UAGBTabs, 
  UAGBPanel, 
  UAGBTextControl,
  UAGBSelectControl,
  UAGBToggleControl,
  UAGBColorControl,
  UAGBTypographyControl,
  UAGBResponsiveControl
} from './tiptap-block';
import { Type, Settings, Palette, Layout } from 'lucide-react';
import { UAGBAdvancedHeadingAttributes } from './UAGBAdvancedHeadingBlock';

interface UAGBAdvancedHeadingViewProps {
  node: {
    attrs: UAGBAdvancedHeadingAttributes;
  };
  updateAttributes: (attrs: Partial<UAGBAdvancedHeadingAttributes>) => void;
  selected: boolean;
}

export const UAGBAdvancedHeadingView: React.FC<UAGBAdvancedHeadingViewProps> = ({
  node,
  updateAttributes,
  selected
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const attrs = node.attrs;

  // 제목에서 하이라이트 텍스트 처리
  const renderHeadingWithHighlight = (text: string) => {
    if (!attrs.showHighlight || !attrs.highlightText) {
      return text;
    }

    const parts = text.split(attrs.highlightText);
    if (parts.length === 1) return text;

    return parts.map((part, index) => (
      <React.Fragment key={index}>
        {part}
        {index < parts.length - 1 && (
          <span
            style={{
              color: attrs.highlightColor,
              backgroundColor: attrs.highlightBackgroundColor,
              padding: `${attrs.highlightPadding}px`,
              borderRadius: `${attrs.highlightBorderRadius}px`,
              display: 'inline-block'
            }}
          >
            {attrs.highlightText}
          </span>
        )}
      </React.Fragment>
    ));
  };

  // 구분선 스타일
  const getSeparatorStyle = (): React.CSSProperties => {
    return {
      width: `${attrs.separatorWidth}px`,
      height: `${attrs.separatorThickness}px`,
      backgroundColor: attrs.separatorColor,
      border: 'none',
      borderRadius: attrs.separatorStyle === 'solid' ? '0' : '2px',
      borderStyle: attrs.separatorStyle === 'solid' ? 'none' : attrs.separatorStyle,
      borderWidth: attrs.separatorStyle !== 'solid' ? `${attrs.separatorThickness}px` : '0',
      borderColor: attrs.separatorStyle !== 'solid' ? attrs.separatorColor : 'transparent',
      backgroundColor: attrs.separatorStyle === 'solid' ? attrs.separatorColor : 'transparent',
      margin: `${attrs.separatorBottomSpacing}px auto`,
      display: 'block'
    };
  };

  // 컨테이너 스타일
  const getContainerStyle = (): React.CSSProperties => {
    return {
      textAlign: attrs.headingAlign,
      padding: `${attrs.blockTopPadding}px ${attrs.blockRightPadding}px ${attrs.blockBottomPadding}px ${attrs.blockLeftPadding}px`,
      margin: `${attrs.blockTopMargin}px ${attrs.blockRightMargin}px ${attrs.blockBottomMargin}px ${attrs.blockLeftMargin}px`,
      border: selected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: '#fff',
      position: 'relative'
    };
  };

  // 메인 헤딩 스타일
  const getHeadingStyle = (): React.CSSProperties => {
    return {
      fontFamily: attrs.headingFontFamily,
      fontSize: `${attrs.headingFontSize}px`,
      fontWeight: attrs.headingFontWeight,
      lineHeight: attrs.headingLineHeight,
      letterSpacing: `${attrs.headingLetterSpacing}px`,
      color: attrs.headingColor,
      textTransform: attrs.headingTextTransform,
      marginBottom: `${attrs.headingBottomSpacing}px`,
      margin: `0 0 ${attrs.headingBottomSpacing}px 0`
    };
  };

  // 서브 헤딩 스타일
  const getSubHeadingStyle = (): React.CSSProperties => {
    return {
      fontFamily: attrs.subHeadingFontFamily,
      fontSize: `${attrs.subHeadingFontSize}px`,
      fontWeight: attrs.subHeadingFontWeight,
      lineHeight: attrs.subHeadingLineHeight,
      letterSpacing: `${attrs.subHeadingLetterSpacing}px`,
      color: attrs.subHeadingColor,
      marginBottom: `${attrs.subHeadingBottomSpacing}px`,
      margin: `0 0 ${attrs.subHeadingBottomSpacing}px 0`
    };
  };

  const HeadingTag = attrs.headingTag as keyof JSX.IntrinsicElements;

  return (
    <NodeViewWrapper 
      className={`uagb-block-${attrs.block_id} uagb-advanced-heading`}
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
            Edit Heading
          </button>
        )}

        {/* 상단 구분선 */}
        {attrs.showSeparator && attrs.separatorPosition === 'above' && (
          <hr style={getSeparatorStyle()} />
        )}

        {/* 메인 헤딩 */}
        <HeadingTag style={getHeadingStyle()} className="uagb-heading-text">
          {renderHeadingWithHighlight(attrs.headingText)}
        </HeadingTag>

        {/* 헤딩과 서브헤딩 사이 구분선 */}
        {attrs.showSeparator && attrs.separatorPosition === 'between' && (
          <hr style={getSeparatorStyle()} />
        )}

        {/* 서브 헤딩 */}
        {attrs.subHeadingText && (
          <p style={getSubHeadingStyle()} className="uagb-subheading-text">
            {attrs.subHeadingText}
          </p>
        )}

        {/* 하단 구분선 */}
        {attrs.showSeparator && attrs.separatorPosition === 'below' && (
          <hr style={getSeparatorStyle()} />
        )}
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
                Edit Advanced Heading
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
                    icon: <Type size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        <UAGBPanel title="Content" isOpen={true}>
                          <UAGBTextControl
                            label="Heading Text"
                            value={attrs.headingText}
                            onChange={(headingText) => updateAttributes({ headingText })}
                          />
                          
                          <UAGBSelectControl
                            label="Heading Tag"
                            value={attrs.headingTag}
                            options={[
                              { label: 'H1', value: 'h1' },
                              { label: 'H2', value: 'h2' },
                              { label: 'H3', value: 'h3' },
                              { label: 'H4', value: 'h4' },
                              { label: 'H5', value: 'h5' },
                              { label: 'H6', value: 'h6' }
                            ]}
                            onChange={(headingTag) => updateAttributes({ headingTag: headingTag as any })}
                          />
                          
                          <UAGBTextControl
                            label="Sub Heading Text"
                            value={attrs.subHeadingText}
                            onChange={(subHeadingText) => updateAttributes({ subHeadingText })}
                          />
                          
                          <UAGBSelectControl
                            label="Alignment"
                            value={attrs.headingAlign}
                            options={[
                              { label: 'Left', value: 'left' },
                              { label: 'Center', value: 'center' },
                              { label: 'Right', value: 'right' }
                            ]}
                            onChange={(headingAlign) => updateAttributes({ headingAlign: headingAlign as any })}
                          />
                        </UAGBPanel>

                        <UAGBPanel title="Highlight" isOpen={false}>
                          <UAGBToggleControl
                            label="Show Highlight"
                            checked={attrs.showHighlight}
                            onChange={(showHighlight) => updateAttributes({ showHighlight })}
                          />
                          
                          {attrs.showHighlight && (
                            <>
                              <UAGBTextControl
                                label="Highlight Text"
                                value={attrs.highlightText}
                                onChange={(highlightText) => updateAttributes({ highlightText })}
                              />
                              
                              <UAGBColorControl
                                label="Highlight Text Color"
                                value={attrs.highlightColor}
                                onChange={(highlightColor) => updateAttributes({ highlightColor })}
                              />
                              
                              <UAGBColorControl
                                label="Highlight Background"
                                value={attrs.highlightBackgroundColor}
                                onChange={(highlightBackgroundColor) => updateAttributes({ highlightBackgroundColor })}
                              />
                            </>
                          )}
                        </UAGBPanel>

                        <UAGBPanel title="Separator" isOpen={false}>
                          <UAGBToggleControl
                            label="Show Separator"
                            checked={attrs.showSeparator}
                            onChange={(showSeparator) => updateAttributes({ showSeparator })}
                          />
                          
                          {attrs.showSeparator && (
                            <>
                              <UAGBSelectControl
                                label="Position"
                                value={attrs.separatorPosition}
                                options={[
                                  { label: 'Above Heading', value: 'above' },
                                  { label: 'Between Heading & Sub', value: 'between' },
                                  { label: 'Below Sub Heading', value: 'below' }
                                ]}
                                onChange={(separatorPosition) => updateAttributes({ separatorPosition: separatorPosition as any })}
                              />
                              
                              <UAGBSelectControl
                                label="Style"
                                value={attrs.separatorStyle}
                                options={[
                                  { label: 'Solid', value: 'solid' },
                                  { label: 'Dashed', value: 'dashed' },
                                  { label: 'Dotted', value: 'dotted' },
                                  { label: 'Double', value: 'double' }
                                ]}
                                onChange={(separatorStyle) => updateAttributes({ separatorStyle: separatorStyle as any })}
                              />
                              
                              <UAGBColorControl
                                label="Separator Color"
                                value={attrs.separatorColor}
                                onChange={(separatorColor) => updateAttributes({ separatorColor })}
                              />
                            </>
                          )}
                        </UAGBPanel>
                      </div>
                    )
                  },
                  {
                    id: 'typography',
                    label: 'Typography',
                    icon: <Type size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        <UAGBTypographyControl
                          label="Heading Typography"
                          settings={{
                            fontFamily: attrs.headingFontFamily,
                            fontSize: attrs.headingFontSize,
                            fontWeight: attrs.headingFontWeight,
                            lineHeight: attrs.headingLineHeight,
                            letterSpacing: attrs.headingLetterSpacing,
                            textTransform: attrs.headingTextTransform,
                            textDecoration: 'none',
                            fontStyle: 'normal',
                            color: attrs.headingColor,
                            textAlign: attrs.headingAlign
                          }}
                          onChange={(settings) => updateAttributes({
                            headingFontFamily: settings.fontFamily,
                            headingFontSize: settings.fontSize,
                            headingFontWeight: settings.fontWeight,
                            headingLineHeight: settings.lineHeight,
                            headingLetterSpacing: settings.letterSpacing,
                            headingTextTransform: settings.textTransform,
                            headingColor: settings.color
                          })}
                          showAlignment={false}
                        />

                        <UAGBTypographyControl
                          label="Sub Heading Typography"
                          settings={{
                            fontFamily: attrs.subHeadingFontFamily,
                            fontSize: attrs.subHeadingFontSize,
                            fontWeight: attrs.subHeadingFontWeight,
                            lineHeight: attrs.subHeadingLineHeight,
                            letterSpacing: attrs.subHeadingLetterSpacing,
                            textTransform: 'none',
                            textDecoration: 'none',
                            fontStyle: 'normal',
                            color: attrs.subHeadingColor,
                            textAlign: attrs.headingAlign
                          }}
                          onChange={(settings) => updateAttributes({
                            subHeadingFontFamily: settings.fontFamily,
                            subHeadingFontSize: settings.fontSize,
                            subHeadingFontWeight: settings.fontWeight,
                            subHeadingLineHeight: settings.lineHeight,
                            subHeadingLetterSpacing: settings.letterSpacing,
                            subHeadingColor: settings.color
                          })}
                          showAlignment={false}
                        />
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

export default UAGBAdvancedHeadingView;
