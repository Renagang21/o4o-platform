// UAGB Buttons View - Spectra 스타일
// 다중 버튼 그룹 뷰 컴포넌트

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
  UAGBTypographyControl,
  generateBlockId
} from './tiptap-block';
import { MousePointer, Settings, Palette, Layout, Plus, Trash2, Move, Copy } from 'lucide-react';
import { UAGBButtonsAttributes, UAGBButton } from './UAGBButtonsBlock';

interface UAGBButtonsViewProps {
  node: {
    attrs: UAGBButtonsAttributes;
  };
  updateAttributes: (attrs: Partial<UAGBButtonsAttributes>) => void;
  selected: boolean;
}

export const UAGBButtonsView: React.FC<UAGBButtonsViewProps> = ({
  node,
  updateAttributes,
  selected
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedButtonIndex, setSelectedButtonIndex] = useState(0);
  const attrs = node.attrs;

  // 버튼 추가
  const addButton = () => {
    const newButton: UAGBButton = {
      id: generateBlockId(),
      text: `Button ${attrs.buttons.length + 1}`,
      link: '#',
      target: '_self',
      rel: '',
      icon: '🚀',
      iconPosition: 'before',
      showIcon: false,
      backgroundColor: attrs.globalBackgroundColor,
      textColor: attrs.globalTextColor,
      borderColor: attrs.globalBorderColor,
      backgroundColorHover: attrs.globalBackgroundColorHover,
      textColorHover: attrs.globalTextColorHover,
      borderColorHover: attrs.globalBorderColorHover,
      paddingTop: attrs.globalPaddingTop,
      paddingRight: attrs.globalPaddingRight,
      paddingBottom: attrs.globalPaddingBottom,
      paddingLeft: attrs.globalPaddingLeft,
      borderWidth: attrs.globalBorderWidth,
      borderRadius: attrs.globalBorderRadius,
      borderStyle: attrs.globalBorderStyle
    };

    updateAttributes({
      buttons: [...attrs.buttons, newButton]
    });
  };

  // 버튼 삭제
  const removeButton = (index: number) => {
    if (attrs.buttons.length <= 1) return; // 최소 1개 버튼 유지
    
    const newButtons = attrs.buttons.filter((_, i) => i !== index);
    updateAttributes({ buttons: newButtons });
    
    if (selectedButtonIndex >= newButtons.length) {
      setSelectedButtonIndex(newButtons.length - 1);
    }
  };

  // 버튼 복사
  const duplicateButton = (index: number) => {
    const buttonToCopy = { ...attrs.buttons[index] };
    buttonToCopy.id = generateBlockId();
    buttonToCopy.text = `${buttonToCopy.text} Copy`;
    
    const newButtons = [...attrs.buttons];
    newButtons.splice(index + 1, 0, buttonToCopy);
    updateAttributes({ buttons: newButtons });
  };

  // 개별 버튼 업데이트
  const updateButton = (index: number, updates: Partial<UAGBButton>) => {
    const newButtons = [...attrs.buttons];
    newButtons[index] = { ...newButtons[index], ...updates };
    updateAttributes({ buttons: newButtons });
  };

  // 컨테이너 스타일
  const getContainerStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      display: 'flex',
      flexWrap: 'wrap',
      gap: `${attrs.gap}px`,
      padding: `${attrs.blockTopPadding}px ${attrs.blockRightPadding}px ${attrs.blockBottomPadding}px ${attrs.blockLeftPadding}px`,
      margin: `${attrs.blockTopMargin}px ${attrs.blockRightMargin}px ${attrs.blockBottomMargin}px ${attrs.blockLeftMargin}px`,
      border: selected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: '#fff',
      position: 'relative'
    };

    // 정렬 설정
    switch (attrs.alignment) {
      case 'left':
        baseStyle.justifyContent = 'flex-start';
        break;
      case 'right':
        baseStyle.justifyContent = 'flex-end';
        break;
      case 'center':
        baseStyle.justifyContent = 'center';
        break;
      case 'justify':
        baseStyle.justifyContent = 'space-between';
        break;
    }

    // 스택 설정 (모바일에서 세로 정렬)
    if (attrs.stack === 'mobile') {
      baseStyle.flexDirection = 'row';
      // 실제로는 미디어 쿼리로 처리되어야 함
    }

    return baseStyle;
  };

  // 개별 버튼 스타일
  const getButtonStyle = (button: UAGBButton, isHovered: boolean = false): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      fontFamily: attrs.fontFamily,
      fontSize: `${attrs.fontSize}px`,
      fontWeight: attrs.fontWeight,
      lineHeight: attrs.lineHeight,
      letterSpacing: `${attrs.letterSpacing}px`,
      textTransform: attrs.textTransform,
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: `${attrs.iconSpacing}px`,
      padding: `${button.paddingTop}px ${button.paddingRight}px ${button.paddingBottom}px ${button.paddingLeft}px`,
      backgroundColor: isHovered ? button.backgroundColorHover : button.backgroundColor,
      color: isHovered ? button.textColorHover : button.textColor,
      border: `${button.borderWidth}px ${button.borderStyle} ${isHovered ? button.borderColorHover : button.borderColor}`,
      borderRadius: `${button.borderRadius}px`,
      cursor: 'pointer',
      transition: `all ${attrs.transitionDuration}ms ease`,
      outline: 'none',
      flex: attrs.fullWidth ? '1' : 'none',
      minWidth: attrs.fullWidth ? '0' : 'auto'
    };

    // 호버 애니메이션
    if (attrs.enableHoverAnimation && isHovered) {
      switch (attrs.hoverAnimationType) {
        case 'scale':
          baseStyle.transform = 'scale(1.05)';
          break;
        case 'translate':
          baseStyle.transform = 'translateY(-2px)';
          break;
        case 'rotate':
          baseStyle.transform = 'rotate(2deg)';
          break;
        case 'glow':
          baseStyle.boxShadow = `0 0 20px ${button.backgroundColor}40`;
          break;
      }
    }

    return baseStyle;
  };

  // 버튼 렌더링
  const renderButton = (button: UAGBButton, index: number) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div 
        key={button.id}
        style={{ position: 'relative', display: 'inline-block' }}
      >
        <button
          style={getButtonStyle(button, isHovered)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={(e) => {
            e.preventDefault();
            if (selected) {
              setSelectedButtonIndex(index);
              setIsEditorOpen(true);
            }
          }}
        >
          {/* 아이콘 (앞) */}
          {button.showIcon && button.iconPosition === 'before' && (
            <span style={{ fontSize: `${attrs.iconSize}px` }}>
              {button.icon}
            </span>
          )}
          
          {/* 버튼 텍스트 */}
          <span>{button.text}</span>
          
          {/* 아이콘 (뒤) */}
          {button.showIcon && button.iconPosition === 'after' && (
            <span style={{ fontSize: `${attrs.iconSize}px` }}>
              {button.icon}
            </span>
          )}
        </button>

        {/* 선택된 버튼 표시 */}
        {selected && (
          <div style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            display: 'flex',
            gap: '4px'
          }}>
            <button
              onClick={() => duplicateButton(index)}
              className="p-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              title="Duplicate"
            >
              <Copy size={12} />
            </button>
            
            {attrs.buttons.length > 1 && (
              <button
                onClick={() => removeButton(index)}
                className="p-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <NodeViewWrapper 
      className={`uagb-block-${attrs.block_id} uagb-buttons`}
      data-block-id={attrs.block_id}
    >
      <div style={getContainerStyle()}>
        {/* 편집 버튼 */}
        {selected && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            display: 'flex',
            gap: '8px',
            zIndex: 10
          }}>
            <button
              onClick={addButton}
              style={{
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Plus size={14} />
              Add Button
            </button>
            
            <button
              onClick={() => setIsEditorOpen(true)}
              style={{
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Edit Buttons
            </button>
          </div>
        )}

        {/* 버튼들 렌더링 */}
        {attrs.buttons.map((button, index) => renderButton(button, index))}
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
                Edit Buttons
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

            {/* 버튼 선택기 */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px',
              overflowX: 'auto'
            }}>
              {attrs.buttons.map((button, index) => (
                <button
                  key={button.id}
                  onClick={() => setSelectedButtonIndex(index)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: selectedButtonIndex === index ? '#3b82f6' : '#fff',
                    color: selectedButtonIndex === index ? '#fff' : '#374151',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {button.text}
                </button>
              ))}
            </div>

            {/* 탭 컨텐츠 */}
            <div style={{ flex: '1', overflow: 'auto' }}>
              <UAGBTabs
                tabs={[
                  {
                    id: 'general',
                    label: 'General',
                    icon: <MousePointer size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        <UAGBPanel title="Button Content" isOpen={true}>
                          <UAGBTextControl
                            label="Button Text"
                            value={attrs.buttons[selectedButtonIndex]?.text || ''}
                            onChange={(text) => updateButton(selectedButtonIndex, { text })}
                          />
                          
                          <UAGBTextControl
                            label="Link URL"
                            value={attrs.buttons[selectedButtonIndex]?.link || ''}
                            onChange={(link) => updateButton(selectedButtonIndex, { link })}
                          />
                          
                          <UAGBSelectControl
                            label="Link Target"
                            value={attrs.buttons[selectedButtonIndex]?.target || '_self'}
                            options={[
                              { label: 'Same Window', value: '_self' },
                              { label: 'New Window', value: '_blank' }
                            ]}
                            onChange={(target) => updateButton(selectedButtonIndex, { target: target as any })}
                          />
                        </UAGBPanel>

                        <UAGBPanel title="Icon Settings" isOpen={false}>
                          <UAGBToggleControl
                            label="Show Icon"
                            checked={attrs.buttons[selectedButtonIndex]?.showIcon || false}
                            onChange={(showIcon) => updateButton(selectedButtonIndex, { showIcon })}
                          />
                          
                          {attrs.buttons[selectedButtonIndex]?.showIcon && (
                            <>
                              <UAGBTextControl
                                label="Icon (Emoji)"
                                value={attrs.buttons[selectedButtonIndex]?.icon || ''}
                                onChange={(icon) => updateButton(selectedButtonIndex, { icon })}
                              />
                              
                              <UAGBSelectControl
                                label="Icon Position"
                                value={attrs.buttons[selectedButtonIndex]?.iconPosition || 'before'}
                                options={[
                                  { label: 'Before Text', value: 'before' },
                                  { label: 'After Text', value: 'after' }
                                ]}
                                onChange={(iconPosition) => updateButton(selectedButtonIndex, { iconPosition: iconPosition as any })}
                              />
                            </>
                          )}
                        </UAGBPanel>

                        <UAGBPanel title="Layout Settings" isOpen={false}>
                          <UAGBSelectControl
                            label="Alignment"
                            value={attrs.alignment}
                            options={[
                              { label: 'Left', value: 'left' },
                              { label: 'Center', value: 'center' },
                              { label: 'Right', value: 'right' },
                              { label: 'Justify', value: 'justify' }
                            ]}
                            onChange={(alignment) => updateAttributes({ alignment: alignment as any })}
                          />
                          
                          <UAGBNumberControl
                            label="Gap Between Buttons"
                            value={attrs.gap}
                            min={0}
                            max={100}
                            onChange={(gap) => updateAttributes({ gap })}
                          />
                          
                          <UAGBToggleControl
                            label="Full Width"
                            checked={attrs.fullWidth}
                            onChange={(fullWidth) => updateAttributes({ fullWidth })}
                          />
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
                        <UAGBPanel title="Button Colors" isOpen={true}>
                          <UAGBColorControl
                            label="Background Color"
                            value={attrs.buttons[selectedButtonIndex]?.backgroundColor || ''}
                            onChange={(backgroundColor) => updateButton(selectedButtonIndex, { backgroundColor })}
                          />
                          
                          <UAGBColorControl
                            label="Text Color"
                            value={attrs.buttons[selectedButtonIndex]?.textColor || ''}
                            onChange={(textColor) => updateButton(selectedButtonIndex, { textColor })}
                          />
                          
                          <UAGBColorControl
                            label="Border Color"
                            value={attrs.buttons[selectedButtonIndex]?.borderColor || ''}
                            onChange={(borderColor) => updateButton(selectedButtonIndex, { borderColor })}
                          />
                        </UAGBPanel>

                        <UAGBPanel title="Hover Colors" isOpen={false}>
                          <UAGBColorControl
                            label="Background Color (Hover)"
                            value={attrs.buttons[selectedButtonIndex]?.backgroundColorHover || ''}
                            onChange={(backgroundColorHover) => updateButton(selectedButtonIndex, { backgroundColorHover })}
                          />
                          
                          <UAGBColorControl
                            label="Text Color (Hover)"
                            value={attrs.buttons[selectedButtonIndex]?.textColorHover || ''}
                            onChange={(textColorHover) => updateButton(selectedButtonIndex, { textColorHover })}
                          />
                          
                          <UAGBColorControl
                            label="Border Color (Hover)"
                            value={attrs.buttons[selectedButtonIndex]?.borderColorHover || ''}
                            onChange={(borderColorHover) => updateButton(selectedButtonIndex, { borderColorHover })}
                          />
                        </UAGBPanel>

                        <UAGBPanel title="Border Settings" isOpen={false}>
                          <UAGBNumberControl
                            label="Border Width"
                            value={attrs.buttons[selectedButtonIndex]?.borderWidth || 0}
                            min={0}
                            max={10}
                            onChange={(borderWidth) => updateButton(selectedButtonIndex, { borderWidth })}
                          />
                          
                          <UAGBNumberControl
                            label="Border Radius"
                            value={attrs.buttons[selectedButtonIndex]?.borderRadius || 0}
                            min={0}
                            max={50}
                            onChange={(borderRadius) => updateButton(selectedButtonIndex, { borderRadius })}
                          />
                          
                          <UAGBSelectControl
                            label="Border Style"
                            value={attrs.buttons[selectedButtonIndex]?.borderStyle || 'solid'}
                            options={[
                              { label: 'Solid', value: 'solid' },
                              { label: 'Dashed', value: 'dashed' },
                              { label: 'Dotted', value: 'dotted' },
                              { label: 'None', value: 'none' }
                            ]}
                            onChange={(borderStyle) => updateButton(selectedButtonIndex, { borderStyle: borderStyle as any })}
                          />
                        </UAGBPanel>
                      </div>
                    )
                  },
                  {
                    id: 'typography',
                    label: 'Typography',
                    icon: <Layout size={16} />,
                    content: (
                      <div style={{ padding: '24px' }}>
                        <UAGBTypographyControl
                          label="Button Typography"
                          settings={{
                            fontFamily: attrs.fontFamily,
                            fontSize: attrs.fontSize,
                            fontWeight: attrs.fontWeight,
                            lineHeight: attrs.lineHeight,
                            letterSpacing: attrs.letterSpacing,
                            textTransform: attrs.textTransform,
                            textDecoration: 'none',
                            fontStyle: 'normal',
                            color: attrs.buttons[selectedButtonIndex]?.textColor || '#ffffff',
                            textAlign: 'center'
                          }}
                          onChange={(settings) => updateAttributes({
                            fontFamily: settings.fontFamily,
                            fontSize: settings.fontSize,
                            fontWeight: settings.fontWeight,
                            lineHeight: settings.lineHeight,
                            letterSpacing: settings.letterSpacing,
                            textTransform: settings.textTransform
                          })}
                          showAlignment={false}
                          showColor={false}
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

export default UAGBButtonsView;
