// UAGB Forms View - Spectra 스타일 (Part 1)
// 고급 폼 빌더 뷰 컴포넌트

import React, { useState, useMemo } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { 
  UAGBTabs, 
  UAGBPanel, 
  UAGBTextControl,
  UAGBSelectControl,
  UAGBToggleControl,
  UAGBColorControl,
  UAGBNumberControl,
  generateBlockId
} from './tiptap-block';
import { 
  FileText, Settings, Palette, Layout, Plus, Trash2, Move, 
  GripVertical, Mail, Phone, Calendar, FileImage, CheckSquare,
  Circle, Type, Hash, Lock, Link as LinkIcon, Database,
  Table, Layers, Archive, Users
} from 'lucide-react';
import { 
  UAGBFormsAttributes, 
  UAGBFormField, 
  createDefaultPostTypeDefinition,
  generateDatabaseSchema,
  generateCreateTableSQL,
  generateRelationshipTablesSQL,
  createPostTypeAPI,
  getPostTypeSchemaAPI,
  createPostAPI
} from './UAGBFormsBlock';

interface UAGBFormsViewProps {
  node: {
    attrs: UAGBFormsAttributes;
  };
  updateAttributes: (attrs: Partial<UAGBFormsAttributes>) => void;
  selected: boolean;
}

// 필드 타입별 아이콘 매핑
const fieldTypeIcons: Record<string, React.ReactNode> = {
  text: <Type size={16} />,
  email: <Mail size={16} />,
  tel: <Phone size={16} />,
  url: <LinkIcon size={16} />,
  password: <Lock size={16} />,
  textarea: <FileText size={16} />,
  select: <Circle size={16} />,
  radio: <Circle size={16} />,
  checkbox: <CheckSquare size={16} />,
  file: <FileImage size={16} />,
  date: <Calendar size={16} />,
  number: <Hash size={16} />,
  hidden: <Type size={16} />
};

export const UAGBFormsView: React.FC<UAGBFormsViewProps> = ({
  node,
  updateAttributes,
  selected
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('fields');
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [tempAttrs, setTempAttrs] = useState<UAGBFormsAttributes>(node.attrs);
  const attrs = node.attrs;

  // Post Creation Mode 관련 헬퍼 함수들
  const togglePostCreationMode = async (enabled: boolean) => {
    const updates: Partial<UAGBFormsAttributes> = {
      isPostCreationMode: enabled
    };
    
    if (enabled && !attrs.postTypeDefinition.enabled) {
      // 처음 활성화할 때 기본 Post Type Definition 생성
      const defaultPostTypeDef = createDefaultPostTypeDefinition();
      defaultPostTypeDef.enabled = true;
      
      try {
        // 🚀 실제 API 호출로 Post Type 생성
        await createPostTypeAPI(defaultPostTypeDef);
        console.log('✅ Post Type created successfully via API');
        
        updates.postTypeDefinition = defaultPostTypeDef;
        
        // 제출 방법을 post_creation으로 변경
        updates.submission = {
          ...attrs.submission,
          method: 'post_creation'
        };
        
        // 성공 메시지
        alert('Post Creation Mode가 활성화되었습니다! 데이터베이스에 새로운 Post Type이 생성되었습니다.');
        
      } catch (error) {
        console.error('Failed to create post type:', error);
        alert('Post Type 생성에 실패했습니다. 콘솔을 확인해주세요.');
        return; // 실패 시 업데이트하지 않음
      }
    }
    
    updateAttributes(updates);
  };

  const updatePostTypeDefinition = async (updates: Partial<typeof attrs.postTypeDefinition>) => {
    const newPostTypeDef = { ...attrs.postTypeDefinition, ...updates };
    const newSchema = generateDatabaseSchema(newPostTypeDef, attrs.fields);
    
    // Post Type이 변경된 경우 API 호출
    if (updates.postType && updates.postType !== attrs.postTypeDefinition.postType) {
      try {
        // 기존 Post Type 스키마 확인
        const existingSchema = await getPostTypeSchemaAPI(updates.postType);
        
        if (!existingSchema) {
          // 새로운 Post Type 생성
          await createPostTypeAPI(newPostTypeDef);
          console.log('✅ New Post Type created via API:', updates.postType);
        } else {
          console.log('ℹ️ Post Type already exists:', updates.postType);
        }
      } catch (error) {
        console.error('Failed to update post type:', error);
      }
    }
    
    updateAttributes({
      postTypeDefinition: newPostTypeDef,
      databaseSchema: newSchema
    });
  };

  // Database Schema Preview
  const schemaSQL = useMemo(() => {
    if (!attrs.isPostCreationMode || !attrs.databaseSchema) return '';
    
    const mainTableSQL = generateCreateTableSQL(attrs.databaseSchema);
    const relationshipTablesSQL = generateRelationshipTablesSQL(attrs.databaseSchema);
    
    return [mainTableSQL, ...relationshipTablesSQL].join('\n\n');
  }, [attrs.isPostCreationMode, attrs.databaseSchema]);

  // 기존 필드 관련 함수들...

  // 필드 추가
  const addField = (type: UAGBFormField['type']) => {
    const newField: UAGBFormField = {
      id: generateBlockId(),
      type,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      placeholder: `Enter ${type}`,
      name: `field_${attrs.fields.length + 1}`,
      required: false,
      width: 'full',
      options: type === 'select' || type === 'radio' || type === 'checkbox' ? 
        [{ label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' }] : [],
      validation: {},
      labelFontSize: attrs.globalLabelFontSize,
      labelColor: attrs.globalLabelColor,
      labelFontWeight: attrs.globalLabelFontWeight,
      inputBackgroundColor: attrs.globalInputBackgroundColor,
      inputTextColor: attrs.globalInputTextColor,
      inputBorderColor: attrs.globalInputBorderColor,
      inputBorderWidth: attrs.globalInputBorderWidth,
      inputBorderRadius: attrs.globalInputBorderRadius,
      inputPadding: attrs.globalInputPaddingTop,
      conditionalLogic: {
        enabled: false,
        conditions: [],
        action: 'show'
      }
    };

    updateAttributes({
      fields: [...attrs.fields, newField]
    });
  };

  // 필드 삭제
  const removeField = (index: number) => {
    if (attrs.fields.length <= 1) return;
    
    const newFields = attrs.fields.filter((_, i) => i !== index);
    updateAttributes({ fields: newFields });
    
    if (selectedFieldIndex >= newFields.length) {
      setSelectedFieldIndex(newFields.length - 1);
    }
  };

  // 필드 업데이트
  const updateField = (index: number, updates: Partial<UAGBFormField>) => {
    const newFields = [...attrs.fields];
    newFields[index] = { ...newFields[index], ...updates };
    updateAttributes({ fields: newFields });
  };

  // 필드 순서 변경
  const moveField = (fromIndex: number, toIndex: number) => {
    const newFields = [...attrs.fields];
    const [movedField] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, movedField);
    updateAttributes({ fields: newFields });
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null) {
      moveField(draggedIndex, dropIndex);
      setDraggedIndex(null);
    }
  };

  // 컨테이너 스타일
  const getContainerStyle = (): React.CSSProperties => {
    return {
      padding: `${attrs.blockTopPadding}px ${attrs.blockRightPadding}px ${attrs.blockBottomPadding}px ${attrs.blockLeftPadding}px`,
      margin: `${attrs.blockTopMargin}px ${attrs.blockRightMargin}px ${attrs.blockBottomMargin}px ${attrs.blockLeftMargin}px`,
      border: selected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: '#fff',
      position: 'relative'
    };
  };

  // 폼 스타일
  const getFormStyle = (): React.CSSProperties => {
    return {
      backgroundColor: attrs.formBackgroundColor,
      border: attrs.formBorderWidth > 0 ? `${attrs.formBorderWidth}px solid ${attrs.formBorderColor}` : 'none',
      borderRadius: `${attrs.formBorderRadius}px`,
      padding: `${attrs.formPaddingTop}px ${attrs.formPaddingRight}px ${attrs.formPaddingBottom}px ${attrs.formPaddingLeft}px`,
      display: 'flex',
      flexDirection: 'column',
      gap: `${attrs.fieldSpacing}px`
    };
  };

  // 라벨 스타일
  const getLabelStyle = (field: UAGBFormField): React.CSSProperties => {
    return {
      fontFamily: attrs.globalLabelFontFamily,
      fontSize: `${field.labelFontSize || attrs.globalLabelFontSize}px`,
      fontWeight: field.labelFontWeight || attrs.globalLabelFontWeight,
      color: field.labelColor || attrs.globalLabelColor,
      marginBottom: `${attrs.globalLabelMarginBottom}px`,
      display: 'block'
    };
  };

  // 입력 필드 스타일
  const getInputStyle = (field: UAGBFormField): React.CSSProperties => {
    return {
      fontFamily: attrs.globalInputFontFamily,
      fontSize: `${attrs.globalInputFontSize}px`,
      backgroundColor: field.inputBackgroundColor || attrs.globalInputBackgroundColor,
      color: field.inputTextColor || attrs.globalInputTextColor,
      border: `${field.inputBorderWidth || attrs.globalInputBorderWidth}px ${attrs.globalInputBorderStyle} ${field.inputBorderColor || attrs.globalInputBorderColor}`,
      borderRadius: `${field.inputBorderRadius || attrs.globalInputBorderRadius}px`,
      padding: `${attrs.globalInputPaddingTop}px ${attrs.globalInputPaddingRight}px ${attrs.globalInputPaddingBottom}px ${attrs.globalInputPaddingLeft}px`,
      width: '100%',
      outline: 'none',
      transition: 'border-color 0.2s ease',
      minHeight: field.type === 'textarea' ? '120px' : `${attrs.globalInputHeight}px`,
      resize: field.type === 'textarea' ? 'vertical' : 'none'
    };
  };

  // 필드 렌더링
  const renderField = (field: UAGBFormField, index: number) => {
    const fieldStyle: React.CSSProperties = {
      width: field.width === 'full' ? '100%' : 
             field.width === 'half' ? '50%' : 
             field.width === 'third' ? '33.333%' : '25%',
      paddingRight: field.width !== 'full' ? '10px' : '0'
    };

    return (
      <div 
        key={field.id}
        style={fieldStyle}
        draggable={selected}
        onDragStart={() => handleDragStart(index)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, index)}
      >
        {/* 필드 편집 오버레이 */}
        {selected && (
          <div style={{
            position: 'relative',
            border: selectedFieldIndex === index ? '2px solid #3b82f6' : '1px dashed #d1d5db',
            borderRadius: '4px',
            padding: '8px',
            marginBottom: '8px'
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              left: '8px',
              background: '#3b82f6',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {fieldTypeIcons[field.type]}
              {field.type}
              {field.required && <span style={{ color: attrs.requiredFieldColor }}>{attrs.requiredFieldIndicator}</span>}
            </div>

            <div style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              display: 'flex',
              gap: '4px'
            }}>
              <button
                onClick={() => {
                  setSelectedFieldIndex(index);
                  setIsEditorOpen(true);
                }}
                className="p-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                title="Edit Field"
              >
                ✏️
              </button>
              
              {attrs.fields.length > 1 && (
                <button
                  onClick={() => removeField(index)}
                  className="p-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                  title="Delete Field"
                >
                  <Trash2 size={10} />
                </button>
              )}
              
              <div
                className="p-1 bg-gray-600 text-white rounded text-xs cursor-move"
                title="Drag to reorder"
              >
                <GripVertical size={10} />
              </div>
            </div>
          </div>
        )}

        {/* 실제 필드 */}
        <div style={{ marginBottom: `${attrs.fieldSpacing}px` }}>
          <label style={getLabelStyle(field)}>
            {field.label}
            {field.required && (
              <span style={{ color: attrs.requiredFieldColor, marginLeft: '4px' }}>
                {attrs.requiredFieldIndicator}
              </span>
            )}
          </label>

          {/* 입력 필드 타입별 렌더링 */}
          {field.type === 'textarea' ? (
            <textarea
              placeholder={field.placeholder}
              style={getInputStyle(field)}
              disabled={true}
              rows={4}
            />
          ) : field.type === 'select' ? (
            <select style={getInputStyle(field)} disabled={true}>
              <option value="">{field.placeholder || 'Choose an option'}</option>
              {field.options.map((option, idx) => (
                <option key={idx} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : field.type === 'radio' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {field.options.map((option, idx) => (
                <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input 
                    type="radio" 
                    name={field.name} 
                    value={option.value} 
                    disabled={true}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          ) : field.type === 'checkbox' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {field.options.map((option, idx) => (
                <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input 
                    type="checkbox" 
                    name={field.name} 
                    value={option.value} 
                    disabled={true}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          ) : (
            <input
              type={field.type}
              placeholder={field.placeholder}
              style={getInputStyle(field)}
              disabled={true}
            />
          )}
        </div>
      </div>
    );
  };

  // 제출 버튼 스타일
  const getSubmitButtonStyle = (): React.CSSProperties => {
    const alignmentMap = {
      'left': 'flex-start',
      'center': 'center',
      'right': 'flex-end',
      'full': 'stretch'
    };

    return {
      display: 'flex',
      justifyContent: attrs.submitButtonAlign === 'full' ? 'stretch' : alignmentMap[attrs.submitButtonAlign],
      marginTop: `${attrs.fieldSpacing}px`
    };
  };

  const getButtonStyle = (): React.CSSProperties => {
    return {
      fontFamily: attrs.submitButtonFontFamily,
      fontSize: `${attrs.submitButtonFontSize}px`,
      fontWeight: attrs.submitButtonFontWeight,
      color: attrs.submitButtonColor,
      backgroundColor: attrs.submitButtonBackgroundColor,
      border: `${attrs.submitButtonBorderWidth}px solid ${attrs.submitButtonBorderColor}`,
      borderRadius: `${attrs.submitButtonBorderRadius}px`,
      padding: `${attrs.submitButtonPaddingTop}px ${attrs.submitButtonPaddingRight}px ${attrs.submitButtonPaddingBottom}px ${attrs.submitButtonPaddingLeft}px`,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      outline: 'none',
      width: attrs.submitButtonAlign === 'full' ? '100%' : 'auto'
    };
  };

  return (
    <NodeViewWrapper 
      className={`uagb-block-${attrs.block_id} uagb-forms`}
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
            <div style={{
              display: 'flex',
              gap: '4px',
              background: '#f3f4f6',
              borderRadius: '6px',
              padding: '4px'
            }}>
              {[
                { type: 'text', icon: <Type size={12} /> },
                { type: 'email', icon: <Mail size={12} /> },
                { type: 'textarea', icon: <FileText size={12} /> },
                { type: 'select', icon: <Circle size={12} /> },
                { type: 'checkbox', icon: <CheckSquare size={12} /> }
              ].map((fieldType) => (
                <button
                  key={fieldType.type}
                  onClick={() => addField(fieldType.type as any)}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={`Add ${fieldType.type} field`}
                >
                  {fieldType.icon}
                </button>
              ))}
            </div>
            
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
              Edit Form
            </button>
          </div>
        )}

        {/* 폼 미리보기 */}
        <form style={getFormStyle()} onSubmit={(e) => e.preventDefault()}>
          {/* 폼 제목 */}
          {attrs.formName && (
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '24px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {attrs.formName}
            </h3>
          )}

          {/* 프로그레스 바 */}
          {attrs.enableProgressBar && (
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: attrs.progressBarBackgroundColor,
              borderRadius: '2px',
              marginBottom: '20px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '33%',
                height: '100%',
                backgroundColor: attrs.progressBarColor,
                transition: 'width 0.3s ease'
              }} />
            </div>
          )}

          {/* 필드들 */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: `${attrs.fieldSpacing}px`
          }}>
            {attrs.fields.map((field, index) => renderField(field, index))}
          </div>

          {/* 제출 버튼 */}
          <div style={getSubmitButtonStyle()}>
            <button 
              type="submit" 
              style={getButtonStyle()}
              disabled={true}
            >
              {attrs.submitButtonText}
            </button>
          </div>
        </form>
      </div>

      {/* 편집 모달 - 파일 길이 제한으로 인해 간소화 */}
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
            height: '70%',
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
                Edit Form Builder
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

            {/* 탭과 콘텐츠 */}
            <div className="flex-1 overflow-hidden">
              <UAGBTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabs={[
                  {
                    id: 'fields',
                    label: 'Form Fields',
                    icon: <Type className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* 기본 폼 설정 */}
                        <UAGBPanel title="Form Settings">
                          <UAGBTextControl
                            label="Form Name"
                            value={attrs.formName}
                            onChange={(formName) => updateAttributes({ formName })}
                            placeholder="Enter form name"
                          />
                          
                          <UAGBSelectControl
                            label="Form Layout"
                            value={attrs.formLayout}
                            onChange={(formLayout) => updateAttributes({ formLayout: formLayout as any })}
                            options={[
                              { label: 'Default', value: 'default' },
                              { label: 'Inline', value: 'inline' },
                              { label: 'Floating Labels', value: 'floating' }
                            ]}
                          />
                          
                          <UAGBNumberControl
                            label="Field Spacing"
                            value={attrs.fieldSpacing}
                            min={0}
                            max={50}
                            onChange={(fieldSpacing) => updateAttributes({ fieldSpacing })}
                          />
                        </UAGBPanel>

                        {/* 필드 추가 */}
                        <UAGBPanel title="Add New Fields">
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                            {[
                              { type: 'text', label: 'Text', icon: <Type size={14} /> },
                              { type: 'email', label: 'Email', icon: <Mail size={14} /> },
                              { type: 'tel', label: 'Phone', icon: <Phone size={14} /> },
                              { type: 'textarea', label: 'Textarea', icon: <FileText size={14} /> },
                              { type: 'select', label: 'Select', icon: <Circle size={14} /> },
                              { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare size={14} /> },
                              { type: 'file', label: 'File', icon: <FileImage size={14} /> },
                              { type: 'date', label: 'Date', icon: <Calendar size={14} /> },
                              { type: 'number', label: 'Number', icon: <Hash size={14} /> }
                            ].map((fieldType) => (
                              <button
                                key={fieldType.type}
                                onClick={() => addField(fieldType.type as any)}
                                className="flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                {fieldType.icon}
                                {fieldType.label}
                              </button>
                            ))}
                          </div>
                        </UAGBPanel>

                        {/* 현재 필드 목록 */}
                        <UAGBPanel title={`Current Fields (${attrs.fields.length})`}>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {attrs.fields.map((field, index) => (
                              <div 
                                key={field.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    {fieldTypeIcons[field.type]}
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      {field.type}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="font-medium">{field.label}</div>
                                    <div className="text-sm text-gray-500">Name: {field.name}</div>
                                  </div>
                                  {field.required && (
                                    <span className="text-red-500 text-sm">Required</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setSelectedFieldIndex(index)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                  >
                                    Edit
                                  </button>
                                  {attrs.fields.length > 1 && (
                                    <button
                                      onClick={() => removeField(index)}
                                      className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </UAGBPanel>
                      </div>
                    )
                  },
                  
                  // 🆕 Post Creation Mode 탭
                  {
                    id: 'post-creation',
                    label: 'Post Creation',
                    icon: <Database className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* Post Creation Mode 토글 */}
                        <UAGBPanel title="Post Creation Mode">
                          <UAGBToggleControl
                            label="Enable Post Creation Mode"
                            checked={attrs.isPostCreationMode}
                            onChange={togglePostCreationMode}
                            help="Transform this form into a post creation system like WordPress Custom Post Types"
                          />
                          
                          {attrs.isPostCreationMode && (
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                              <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                                <Archive size={16} />
                                Post Creation Mode Active
                              </div>
                              <p className="text-sm text-blue-700">
                                Form submissions will create new posts in your database. 
                                Configure the post type settings below.
                              </p>
                            </div>
                          )}
                        </UAGBPanel>

                        {attrs.isPostCreationMode && (
                          <>
                            {/* Post Type 설정 */}
                            <UAGBPanel title="Post Type Configuration">
                              <UAGBTextControl
                                label="Post Type"
                                value={attrs.postTypeDefinition.postType}
                                onChange={(postType) => updatePostTypeDefinition({ 
                                  postType,
                                  tableName: `posts_${postType}`
                                })}
                                placeholder="blog, news, portfolio, product..."
                                help="Internal name (lowercase, no spaces)"
                              />
                              
                              <UAGBTextControl
                                label="Post Type Display Name"
                                value={attrs.postTypeDefinition.postTypeName}
                                onChange={(postTypeName) => updatePostTypeDefinition({ postTypeName })}
                                placeholder="Blog Posts, News Articles..."
                                help="User-friendly name"
                              />
                            </UAGBPanel>

                            {/* 기본 필드 설정 */}
                            <UAGBPanel title="Standard Post Fields">
                              <div className="grid grid-cols-2 gap-4">
                                <UAGBToggleControl
                                  label="Title Field"
                                  checked={attrs.postTypeDefinition.hasTitle}
                                  onChange={(hasTitle) => updatePostTypeDefinition({ hasTitle })}
                                />
                                
                                <UAGBToggleControl
                                  label="Content Field"
                                  checked={attrs.postTypeDefinition.hasContent}
                                  onChange={(hasContent) => updatePostTypeDefinition({ hasContent })}
                                />
                                
                                <UAGBToggleControl
                                  label="Excerpt Field"
                                  checked={attrs.postTypeDefinition.hasExcerpt}
                                  onChange={(hasExcerpt) => updatePostTypeDefinition({ hasExcerpt })}
                                />
                                
                                <UAGBToggleControl
                                  label="Featured Image"
                                  checked={attrs.postTypeDefinition.hasFeaturedImage}
                                  onChange={(hasFeaturedImage) => updatePostTypeDefinition({ hasFeaturedImage })}
                                />
                                
                                <UAGBToggleControl
                                  label="Categories"
                                  checked={attrs.postTypeDefinition.hasCategories}
                                  onChange={(hasCategories) => updatePostTypeDefinition({ hasCategories })}
                                />
                                
                                <UAGBToggleControl
                                  label="Tags"
                                  checked={attrs.postTypeDefinition.hasTagsField}
                                  onChange={(hasTagsField) => updatePostTypeDefinition({ hasTagsField })}
                                />
                                
                                <UAGBToggleControl
                                  label="Author Field"
                                  checked={attrs.postTypeDefinition.hasAuthorField}
                                  onChange={(hasAuthorField) => updatePostTypeDefinition({ hasAuthorField })}
                                />
                                
                                <UAGBToggleControl
                                  label="Date Field"
                                  checked={attrs.postTypeDefinition.hasDateField}
                                  onChange={(hasDateField) => updatePostTypeDefinition({ hasDateField })}
                                />
                              </div>
                            </UAGBPanel>

                            {/* 카테고리 설정 */}
                            {attrs.postTypeDefinition.hasCategories && (
                              <UAGBPanel title="Categories Configuration">
                                <UAGBTextControl
                                  label="Categories (comma-separated)"
                                  value={attrs.postTypeDefinition.categories.join(', ')}
                                  onChange={(value) => updatePostTypeDefinition({ 
                                    categories: value.split(',').map(cat => cat.trim()).filter(Boolean)
                                  })}
                                  placeholder="General, News, Tutorial, Blog"
                                />
                                
                                <UAGBSelectControl
                                  label="Default Category"
                                  value={attrs.postTypeDefinition.defaultCategory}
                                  onChange={(defaultCategory) => updatePostTypeDefinition({ defaultCategory })}
                                  options={attrs.postTypeDefinition.categories.map(cat => ({
                                    label: cat,
                                    value: cat
                                  }))}
                                />
                                
                                <UAGBToggleControl
                                  label="Allow New Categories"
                                  checked={attrs.postTypeDefinition.allowNewCategories}
                                  onChange={(allowNewCategories) => updatePostTypeDefinition({ allowNewCategories })}
                                  help="Users can create new categories when submitting"
                                />
                              </UAGBPanel>
                            )}

                            {/* 워크플로우 설정 */}
                            <UAGBPanel title="Publishing Workflow">
                              <UAGBSelectControl
                                label="Default Status"
                                value={attrs.submission.postCreationSettings?.defaultStatus || 'draft'}
                                onChange={(defaultStatus) => updateAttributes({
                                  submission: {
                                    ...attrs.submission,
                                    postCreationSettings: {
                                      ...attrs.submission.postCreationSettings,
                                      defaultStatus: defaultStatus as any
                                    }
                                  }
                                })}
                                options={[
                                  { label: 'Draft', value: 'draft' },
                                  { label: 'Published', value: 'published' },
                                  { label: 'Pending Review', value: 'pending' }
                                ]}
                              />
                              
                              <UAGBToggleControl
                                label="Auto Publish"
                                checked={attrs.submission.postCreationSettings?.autoPublish || false}
                                onChange={(autoPublish) => updateAttributes({
                                  submission: {
                                    ...attrs.submission,
                                    postCreationSettings: {
                                      ...attrs.submission.postCreationSettings,
                                      autoPublish
                                    }
                                  }
                                })}
                                help="Automatically publish posts without moderation"
                              />
                              
                              <UAGBToggleControl
                                label="Require Approval"
                                checked={attrs.submission.postCreationSettings?.moderationRequired || false}
                                onChange={(moderationRequired) => updateAttributes({
                                  submission: {
                                    ...attrs.submission,
                                    postCreationSettings: {
                                      ...attrs.submission.postCreationSettings,
                                      moderationRequired
                                    }
                                  }
                                })}
                                help="Posts need admin approval before publishing"
                              />
                            </UAGBPanel>
                          </>
                        )}
                      </div>
                    )
                  },

                  // Database Schema 탭 (Post Creation Mode일 때만 표시)
                  ...(attrs.isPostCreationMode ? [{
                    id: 'database',
                    label: 'Database Schema',
                    icon: <Table className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        <UAGBPanel title="Generated Database Schema">
                          <div className="text-sm text-gray-600 mb-4">
                            This schema will be automatically generated based on your post type and form field settings.
                          </div>
                          
                          {/* 테이블 정보 */}
                          <div className="bg-gray-50 p-4 rounded-lg mb-4">
                            <h4 className="font-medium mb-2">Table Information</h4>
                            <div className="space-y-1 text-sm">
                              <div><strong>Main Table:</strong> {attrs.databaseSchema?.tableName}</div>
                              <div><strong>Primary Key:</strong> {attrs.postTypeDefinition.primaryKey}</div>
                              <div><strong>Columns:</strong> {Object.keys(attrs.databaseSchema?.columns || {}).length}</div>
                              <div><strong>Relationships:</strong> {Object.keys(attrs.databaseSchema?.relationships || {}).length}</div>
                            </div>
                          </div>

                          {/* SQL Preview */}
                          <div>
                            <h4 className="font-medium mb-2">SQL Schema Preview</h4>
                            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                              {schemaSQL || 'No schema generated yet'}
                            </pre>
                          </div>

                          {/* 컬럼 리스트 */}
                          {attrs.databaseSchema?.columns && (
                            <div>
                              <h4 className="font-medium mb-2">Database Columns</h4>
                              <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left">Column Name</th>
                                      <th className="px-3 py-2 text-left">Type</th>
                                      <th className="px-3 py-2 text-left">Nullable</th>
                                      <th className="px-3 py-2 text-left">Default</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(attrs.databaseSchema.columns).map(([name, config]) => (
                                      <tr key={name} className="border-t">
                                        <td className="px-3 py-2 font-mono">{name}</td>
                                        <td className="px-3 py-2">{config.type}</td>
                                        <td className="px-3 py-2">{config.nullable ? 'Yes' : 'No'}</td>
                                        <td className="px-3 py-2">{config.default || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </UAGBPanel>
                      </div>
                    )
                  }] : []),

                  // 스타일 탭
                  {
                    id: 'style',
                    label: 'Styling',
                    icon: <Palette className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* 제출 버튼 스타일 */}
                        <UAGBPanel title="Submit Button">
                          <UAGBTextControl
                            label="Button Text"
                            value={attrs.submitButtonText}
                            onChange={(submitButtonText) => updateAttributes({ submitButtonText })}
                          />
                          
                          <UAGBSelectControl
                            label="Button Alignment"
                            value={attrs.submitButtonAlign}
                            onChange={(submitButtonAlign) => updateAttributes({ submitButtonAlign: submitButtonAlign as any })}
                            options={[
                              { label: 'Left', value: 'left' },
                              { label: 'Center', value: 'center' },
                              { label: 'Right', value: 'right' },
                              { label: 'Full Width', value: 'full' }
                            ]}
                          />
                          
                          <UAGBColorControl
                            label="Button Background Color"
                            value={attrs.submitButtonBackgroundColor}
                            onChange={(submitButtonBackgroundColor) => updateAttributes({ submitButtonBackgroundColor })}
                          />
                          
                          <UAGBColorControl
                            label="Button Text Color"
                            value={attrs.submitButtonColor}
                            onChange={(submitButtonColor) => updateAttributes({ submitButtonColor })}
                          />
                          
                          <UAGBNumberControl
                            label="Button Border Radius"
                            value={attrs.submitButtonBorderRadius}
                            min={0}
                            max={50}
                            onChange={(submitButtonBorderRadius) => updateAttributes({ submitButtonBorderRadius })}
                          />
                        </UAGBPanel>

                        {/* 글로벌 필드 스타일 */}
                        <UAGBPanel title="Global Field Styles">
                          <UAGBColorControl
                            label="Label Color"
                            value={attrs.globalLabelColor}
                            onChange={(globalLabelColor) => updateAttributes({ globalLabelColor })}
                          />
                          
                          <UAGBNumberControl
                            label="Label Font Size"
                            value={attrs.globalLabelFontSize}
                            min={10}
                            max={24}
                            onChange={(globalLabelFontSize) => updateAttributes({ globalLabelFontSize })}
                          />
                          
                          <UAGBColorControl
                            label="Input Background Color"
                            value={attrs.globalInputBackgroundColor}
                            onChange={(globalInputBackgroundColor) => updateAttributes({ globalInputBackgroundColor })}
                          />
                          
                          <UAGBColorControl
                            label="Input Text Color"
                            value={attrs.globalInputTextColor}
                            onChange={(globalInputTextColor) => updateAttributes({ globalInputTextColor })}
                          />
                          
                          <UAGBColorControl
                            label="Input Border Color"
                            value={attrs.globalInputBorderColor}
                            onChange={(globalInputBorderColor) => updateAttributes({ globalInputBorderColor })}
                          />
                          
                          <UAGBNumberControl
                            label="Input Border Radius"
                            value={attrs.globalInputBorderRadius}
                            min={0}
                            max={20}
                            onChange={(globalInputBorderRadius) => updateAttributes({ globalInputBorderRadius })}
                          />
                        </UAGBPanel>

                        {/* 폼 컨테이너 스타일 */}
                        <UAGBPanel title="Form Container">
                          <UAGBColorControl
                            label="Background Color"
                            value={attrs.formBackgroundColor}
                            onChange={(formBackgroundColor) => updateAttributes({ formBackgroundColor })}
                          />
                          
                          <UAGBColorControl
                            label="Border Color"
                            value={attrs.formBorderColor}
                            onChange={(formBorderColor) => updateAttributes({ formBorderColor })}
                          />
                          
                          <UAGBNumberControl
                            label="Border Width"
                            value={attrs.formBorderWidth}
                            min={0}
                            max={10}
                            onChange={(formBorderWidth) => updateAttributes({ formBorderWidth })}
                          />
                          
                          <UAGBNumberControl
                            label="Border Radius"
                            value={attrs.formBorderRadius}
                            min={0}
                            max={20}
                            onChange={(formBorderRadius) => updateAttributes({ formBorderRadius })}
                          />
                        </UAGBPanel>
                      </div>
                    )
                  },

                  // 고급 설정 탭
                  {
                    id: 'advanced',
                    label: 'Advanced',
                    icon: <Settings className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* 제출 설정 */}
                        <UAGBPanel title="Form Submission">
                          <UAGBSelectControl
                            label="Submission Method"
                            value={attrs.submission.method}
                            onChange={(method) => updateAttributes({
                              submission: { ...attrs.submission, method: method as any }
                            })}
                            options={[
                              { label: 'Email', value: 'email' },
                              { label: 'Webhook', value: 'webhook' },
                              { label: 'Database', value: 'database' },
                              { label: 'Post Creation', value: 'post_creation' }
                            ]}
                          />
                          
                          {attrs.submission.method === 'email' && (
                            <UAGBTextControl
                              label="Email To"
                              value={attrs.submission.emailTo}
                              onChange={(emailTo) => updateAttributes({
                                submission: { ...attrs.submission, emailTo }
                              })}
                              placeholder="admin@example.com"
                            />
                          )}
                          
                          {attrs.submission.method === 'webhook' && (
                            <UAGBTextControl
                              label="Webhook URL"
                              value={attrs.submission.webhookUrl}
                              onChange={(webhookUrl) => updateAttributes({
                                submission: { ...attrs.submission, webhookUrl }
                              })}
                              placeholder="https://your-site.com/webhook"
                            />
                          )}
                          
                          <UAGBTextControl
                            label="Success Message"
                            value={attrs.submission.successMessage}
                            onChange={(successMessage) => updateAttributes({
                              submission: { ...attrs.submission, successMessage }
                            })}
                            placeholder="Thank you for your submission!"
                          />
                        </UAGBPanel>

                        {/* 보안 설정 */}
                        <UAGBPanel title="Security & Validation">
                          <UAGBToggleControl
                            label="Enable reCAPTCHA"
                            checked={attrs.enableRecaptcha}
                            onChange={(enableRecaptcha) => updateAttributes({ enableRecaptcha })}
                          />
                          
                          {attrs.enableRecaptcha && (
                            <UAGBTextControl
                              label="reCAPTCHA Site Key"
                              value={attrs.recaptchaSiteKey}
                              onChange={(recaptchaSiteKey) => updateAttributes({ recaptchaSiteKey })}
                              placeholder="Your reCAPTCHA site key"
                            />
                          )}
                          
                          <UAGBToggleControl
                            label="Enable AJAX"
                            checked={attrs.enableAjax}
                            onChange={(enableAjax) => updateAttributes({ enableAjax })}
                            help="Submit form without page reload"
                          />
                        </UAGBPanel>

                        {/* 애니메이션 설정 */}
                        <UAGBPanel title="Animations">
                          <UAGBToggleControl
                            label="Enable Field Animation"
                            checked={attrs.enableFieldAnimation}
                            onChange={(enableFieldAnimation) => updateAttributes({ enableFieldAnimation })}
                          />
                          
                          {attrs.enableFieldAnimation && (
                            <>
                              <UAGBSelectControl
                                label="Animation Type"
                                value={attrs.fieldAnimationType}
                                onChange={(fieldAnimationType) => updateAttributes({ fieldAnimationType: fieldAnimationType as any })}
                                options={[
                                  { label: 'Fade In', value: 'fadeIn' },
                                  { label: 'Slide Up', value: 'slideUp' },
                                  { label: 'Slide Left', value: 'slideLeft' },
                                  { label: 'None', value: 'none' }
                                ]}
                              />
                              
                              <UAGBNumberControl
                                label="Animation Duration (ms)"
                                value={attrs.animationDuration}
                                min={100}
                                max={2000}
                                step={100}
                                onChange={(animationDuration) => updateAttributes({ animationDuration })}
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

export default UAGBFormsView;
