// UAGB Counter View - Spectra 스타일
// StatsBlockView를 UAGB Counter View로 변환

import React, { useState, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { 
  UAGBTabs, 
  UAGBPanel, 
  UAGBCounterControl,
  UAGBNumberControl,
  UAGBTextControl,
  UAGBSelectControl,
  UAGBToggleControl
} from './tiptap-block';
import { Hash, Settings, Type, Palette, Layout } from 'lucide-react';
import { UAGBCounterAttributes } from './UAGBCounterBlock';

interface UAGBCounterViewProps {
  node: {
    attrs: UAGBCounterAttributes;
  };
  updateAttributes: (attrs: Partial<UAGBCounterAttributes>) => void;
  selected: boolean;
}

export const UAGBCounterView: React.FC<UAGBCounterViewProps> = ({
  node,
  updateAttributes,
  selected
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentNumber, setCurrentNumber] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const attrs = node.attrs;

  // Counter 애니메이션 효과
  useEffect(() => {
    if (selected && !isAnimating) {
      setIsAnimating(true);
      const duration = attrs.animationDuration;
      const increment = (attrs.endNumber - attrs.startNumber) / (duration / 50);
      let current = attrs.startNumber;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= attrs.endNumber) {
          current = attrs.endNumber;
          clearInterval(timer);
          setIsAnimating(false);
        }
        setCurrentNumber(Math.floor(current));
      }, 50);

      return () => clearInterval(timer);
    }
  }, [selected, attrs.startNumber, attrs.endNumber, attrs.animationDuration]);

  // 숫자 포맷팅 (천 단위 구분자)
  const formatNumber = (num: number): string => {
    if (!attrs.showSeparator) return num.toString();
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, attrs.separator);
  };

  // 완성된 숫자 문자열
  const getFormattedNumber = (): string => {
    return `${attrs.prefix}${formatNumber(selected ? currentNumber : attrs.endNumber)}${attrs.suffix}`;
  };

  // 레이아웃에 따른 스타일
  const getContainerStyle = (): React.CSSProperties => {
    return {
      display: 'flex',
      flexDirection: attrs.layout === 'vertical' ? 'column' : 'row',
      alignItems: attrs.layout === 'vertical' ? attrs.textAlign : 'center',
      justifyContent: attrs.textAlign,
      textAlign: attrs.textAlign,
      gap: attrs.layout === 'horizontal' ? '16px' : '0',
      padding: `${attrs.blockTopPadding}px ${attrs.blockRightPadding}px ${attrs.blockBottomPadding}px ${attrs.blockLeftPadding}px`,
      border: selected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: '#fff',
      position: 'relative'
    };
  };

  // Counter 숫자 스타일
  const getCounterStyle = (): React.CSSProperties => {
    const sizeMap = {
      'small': 24,
      'medium': 32,
      'large': 48,
      'extra-large': 64
    };

    return {
      fontSize: attrs.counterSize in sizeMap ? sizeMap[attrs.counterSize] : attrs.counterFontSize,
      fontWeight: attrs.counterFontWeight,
      color: attrs.counterColor,
      marginBottom: `${attrs.counterBottomSpacing}px`,
      lineHeight: '1.2'
    };
  };

  // 제목 스타일
  const getTitleStyle = (): React.CSSProperties => {
    return {
      fontSize: `${attrs.titleFontSize}px`,
      fontWeight: attrs.titleFontWeight,
      color: attrs.titleColor,
      marginBottom: `${attrs.titleBottomSpacing}px`,
      margin: '0 0 8px 0'
    };
  };

  // 설명 스타일
  const getDescriptionStyle = (): React.CSSProperties => {
    return {
      fontSize: `${attrs.descriptionFontSize}px`,
      color: attrs.descriptionColor,
      margin: '0',
      lineHeight: '1.5'
    };
  };

  return (
    <NodeViewWrapper 
      className={`uagb-block-${attrs.block_id} uagb-counter`}
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
            Edit Counter
          </button>
        )}

        {/* 아이콘 (위쪽 또는 왼쪽) */}
        {attrs.showIcon && (attrs.iconPosition === 'top' || attrs.iconPosition === 'left') && (
          <div style={{ 
            fontSize: '32px', 
            marginBottom: attrs.iconPosition === 'top' ? '16px' : '0',
            marginRight: attrs.iconPosition === 'left' ? '16px' : '0'
          }}>
            {attrs.icon}
          </div>
        )}

        <div style={{ flex: 1 }}>
          {/* Counter 숫자 */}
          <div style={getCounterStyle()}>
            {getFormattedNumber()}
          </div>

          {/* 제목 */}
          {attrs.showTitle && (
            <h3 style={getTitleStyle()}>
              {attrs.title}
            </h3>
          )}

          {/* 설명 */}
          {attrs.showDescription && (
            <p style={getDescriptionStyle()}>
              {attrs.description}
            </p>
          )}
        </div>

        {/* 아이콘 (아래쪽 또는 오른쪽) */}
        {attrs.showIcon && (attrs.iconPosition === 'bottom' || attrs.iconPosition === 'right') && (
          <div style={{ 
            fontSize: '32px', 
            marginTop: attrs.iconPosition === 'bottom' ? '16px' : '0',
            marginLeft: attrs.iconPosition === 'right' ? '16px' : '0'
          }}>
            {attrs.icon}
          </div>
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
            maxWidth: '800px',
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
                Edit Counter
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
                    icon: <Hash size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        <UAGBCounterControl
                          settings={{
                            startNumber: attrs.startNumber,
                            endNumber: attrs.endNumber,
                            animationDuration: attrs.animationDuration,
                            animationDelay: attrs.animationDelay,
                            prefix: attrs.prefix,
                            suffix: attrs.suffix,
                            separator: attrs.separator,
                            showSeparator: attrs.showSeparator,
                            animationEasing: attrs.animationEasing,
                            counterSize: attrs.counterSize,
                            layout: attrs.layout,
                            iconPosition: attrs.iconPosition,
                            showIcon: attrs.showIcon,
                            icon: attrs.icon,
                            title: attrs.title,
                            description: attrs.description,
                            showTitle: attrs.showTitle,
                            showDescription: attrs.showDescription
                          }}
                          onChange={(settings) => updateAttributes(settings)}
                        />
                      </div>
                    )
                  },
                  {
                    id: 'content',
                    label: 'Content',
                    icon: <Type size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        <UAGBPanel title="Content Settings" isOpen={true}>
                          <UAGBTextControl
                            label="Title"
                            value={attrs.title}
                            onChange={(title) => updateAttributes({ title })}
                          />
                          
                          <UAGBTextControl
                            label="Description"
                            value={attrs.description}
                            onChange={(description) => updateAttributes({ description })}
                          />
                          
                          <UAGBToggleControl
                            label="Show Title"
                            checked={attrs.showTitle}
                            onChange={(showTitle) => updateAttributes({ showTitle })}
                          />
                          
                          <UAGBToggleControl
                            label="Show Description"
                            checked={attrs.showDescription}
                            onChange={(showDescription) => updateAttributes({ showDescription })}
                          />
                        </UAGBPanel>

                        <UAGBPanel title="Icon Settings" isOpen={false}>
                          <UAGBToggleControl
                            label="Show Icon"
                            checked={attrs.showIcon}
                            onChange={(showIcon) => updateAttributes({ showIcon })}
                          />
                          
                          {attrs.showIcon && (
                            <>
                              <UAGBTextControl
                                label="Icon (Emoji)"
                                value={attrs.icon}
                                onChange={(icon) => updateAttributes({ icon })}
                              />
                              
                              <UAGBSelectControl
                                label="Icon Position"
                                value={attrs.iconPosition}
                                options={[
                                  { label: 'Top', value: 'top' },
                                  { label: 'Left', value: 'left' },
                                  { label: 'Right', value: 'right' },
                                  { label: 'Bottom', value: 'bottom' }
                                ]}
                                onChange={(iconPosition) => updateAttributes({ iconPosition: iconPosition as any })}
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
                        <UAGBPanel title="Layout & Alignment" isOpen={true}>
                          <UAGBSelectControl
                            label="Layout"
                            value={attrs.layout}
                            options={[
                              { label: 'Vertical', value: 'vertical' },
                              { label: 'Horizontal', value: 'horizontal' }
                            ]}
                            onChange={(layout) => updateAttributes({ layout: layout as any })}
                          />
                          
                          <UAGBSelectControl
                            label="Text Alignment"
                            value={attrs.textAlign}
                            options={[
                              { label: 'Left', value: 'left' },
                              { label: 'Center', value: 'center' },
                              { label: 'Right', value: 'right' }
                            ]}
                            onChange={(textAlign) => updateAttributes({ textAlign: textAlign as any })}
                          />
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

export default UAGBCounterView;
