// UAGB Forms Block - Spectra 스타일
// 고급 폼 빌더 블록

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { 
  UAGBCommonAttributes, 
  generateBlockId
} from './tiptap-block';
import UAGBFormsView from './UAGBFormsView';

// Post Type Definition 인터페이스
export interface UAGBPostTypeDefinition {
  enabled: boolean;
  postType: string;                    // 'blog', 'portfolio', 'product', 'news' 등
  postTypeName: string;               // 사용자 친화적 이름
  
  // 기본 필드 설정
  hasTitle: boolean;
  hasContent: boolean;
  hasExcerpt: boolean;
  hasFeaturedImage: boolean;
  hasCategories: boolean;
  hasTagsField: boolean;
  hasAuthorField: boolean;
  hasDateField: boolean;
  hasStatusField: boolean;
  
  // 카테고리/태그 설정
  categories: string[];               // 사전 정의된 카테고리들
  defaultCategory: string;
  allowNewCategories: boolean;
  
  // 메타 데이터
  metaFields: {
    seoTitle: boolean;
    seoDescription: boolean;
    customFields: boolean;
  };
  
  // 데이터베이스 설정
  tableName: string;                  // 자동 생성: posts_{postType}
  primaryKey: string;                 // 기본: id
  timestampFields: boolean;           // created_at, updated_at 자동 추가
  
  // 권한 설정
  permissions: {
    canCreate: string[];              // 생성 권한 (역할별)
    canEdit: string[];                // 편집 권한
    canDelete: string[];              // 삭제 권한
    canPublish: string[];             // 발행 권한
  };
  
  // 워크플로우 설정
  workflow: {
    autoSave: boolean;                // 자동 저장
    requireApproval: boolean;         // 승인 필요
    notificationEmail: string;        // 알림 이메일
  };
}

// Database Schema Generator 설정
export interface UAGBDatabaseSchema {
  tableName: string;
  columns: {
    [key: string]: {
      type: string;
      length?: number;
      nullable?: boolean;
      default?: any;
      unique?: boolean;
      index?: boolean;
    };
  };
  relationships: {
    [key: string]: {
      table: string;
      foreignKey: string;
      type: 'oneToMany' | 'manyToMany' | 'oneToOne';
    };
  };
  indexes: string[];
}

// 개별 폼 필드 인터페이스
export interface UAGBFormField {
  id: string;
  type: 'text' | 'email' | 'tel' | 'url' | 'password' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file' | 'date' | 'number' | 'hidden';
  label: string;
  placeholder: string;
  name: string;
  required: boolean;
  width: 'full' | 'half' | 'third' | 'quarter';
  
  // 옵션 (select, radio, checkbox용)
  options: { label: string; value: string; }[];
  
  // 유효성 검사
  validation: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    customMessage?: string;
  };
  
  // 스타일링
  labelFontSize: number;
  labelColor: string;
  labelFontWeight: string;
  inputBackgroundColor: string;
  inputTextColor: string;
  inputBorderColor: string;
  inputBorderWidth: number;
  inputBorderRadius: number;
  inputPadding: number;
  
  // 조건부 로직
  conditionalLogic: {
    enabled: boolean;
    conditions: {
      field: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
      value: string;
    }[];
    action: 'show' | 'hide';
  };
}

// 폼 제출 설정
export interface UAGBFormSubmission {
  method: 'email' | 'webhook' | 'database' | 'post_creation';
  emailTo: string;
  emailSubject: string;
  emailTemplate: string;
  webhookUrl: string;
  redirectUrl: string;
  showSuccessMessage: boolean;
  successMessage: string;
  showErrorMessage: boolean;
  errorMessage: string;
  
  // Post Creation 전용 설정
  postCreationSettings: {
    autoPublish: boolean;
    defaultStatus: 'draft' | 'published' | 'pending';
    assignToUser: string;
    notifyOnSubmission: boolean;
    moderationRequired: boolean;
  };
}

// UAGB Forms 속성 정의
export interface UAGBFormsAttributes extends UAGBCommonAttributes {
  // Form Fields
  fields: UAGBFormField[];
  
  // Form Settings
  formName: string;
  formId: string;
  enableAjax: boolean;
  enableRecaptcha: boolean;
  recaptchaSiteKey: string;
  
  // Form Submission
  submission: UAGBFormSubmission;
  
  // Form Layout
  formLayout: 'default' | 'inline' | 'floating';
  fieldSpacing: number;
  fieldSpacingTablet: number;
  fieldSpacingMobile: number;
  
  // Global Field Styles
  globalLabelFontFamily: string;
  globalLabelFontSize: number;
  globalLabelFontSizeTablet: number;
  globalLabelFontSizeMobile: number;
  globalLabelFontWeight: string;
  globalLabelColor: string;
  globalLabelMarginBottom: number;
  
  // Global Input Styles
  globalInputFontFamily: string;
  globalInputFontSize: number;
  globalInputFontSizeTablet: number;
  globalInputFontSizeMobile: number;
  globalInputBackgroundColor: string;
  globalInputTextColor: string;
  globalInputBorderColor: string;
  globalInputBorderColorFocus: string;
  globalInputBorderWidth: number;
  globalInputBorderStyle: 'solid' | 'dashed' | 'dotted';
  globalInputBorderRadius: number;
  globalInputPaddingTop: number;
  globalInputPaddingRight: number;
  globalInputPaddingBottom: number;
  globalInputPaddingLeft: number;
  globalInputHeight: number;
  
  // Submit Button
  submitButtonText: string;
  submitButtonAlign: 'left' | 'center' | 'right' | 'full';
  submitButtonFontFamily: string;
  submitButtonFontSize: number;
  submitButtonFontWeight: string;
  submitButtonColor: string;
  submitButtonBackgroundColor: string;
  submitButtonBorderColor: string;
  submitButtonColorHover: string;
  submitButtonBackgroundColorHover: string;
  submitButtonBorderColorHover: string;
  submitButtonBorderWidth: number;
  submitButtonBorderRadius: number;
  submitButtonPaddingTop: number;
  submitButtonPaddingRight: number;
  submitButtonPaddingBottom: number;
  submitButtonPaddingLeft: number;
  
  // Error Styling
  errorColor: string;
  errorFontSize: number;
  errorMarginTop: number;
  
  // Required Field Indicator
  requiredFieldIndicator: string;
  requiredFieldColor: string;
  
  // Form Container
  formBackgroundColor: string;
  formBorderColor: string;
  formBorderWidth: number;
  formBorderRadius: number;
  formPaddingTop: number;
  formPaddingRight: number;
  formPaddingBottom: number;
  formPaddingLeft: number;
  
  // Advanced
  enableProgressBar: boolean;
  progressBarColor: string;
  progressBarBackgroundColor: string;
  enableFieldAnimation: boolean;
  fieldAnimationType: 'fadeIn' | 'slideUp' | 'slideLeft' | 'none';
  animationDuration: number;
  
  // Post Creation Mode (새로 추가)
  postTypeDefinition: UAGBPostTypeDefinition;
  isPostCreationMode: boolean;
  databaseSchema: UAGBDatabaseSchema;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    uagbForms: {
      setUAGBForms: (attrs: Partial<UAGBFormsAttributes>) => ReturnType;
      updateUAGBForms: (attrs: Partial<UAGBFormsAttributes>) => ReturnType;
    };
  }
}

export const UAGBFormsBlock = Node.create({
  name: 'uagb/forms',
  
  group: 'block',
  atom: true,
  
  addAttributes() {
    return {
      // 블록 식별
      block_id: {
        default: () => generateBlockId(),
        parseHTML: element => element.getAttribute('data-block-id'),
        renderHTML: attributes => ({ 'data-block-id': attributes.block_id }),
      },
      classMigrate: {
        default: false,
      },
      
      // Form Fields
      fields: {
        default: [
          {
            id: generateBlockId(),
            type: 'text',
            label: 'Full Name',
            placeholder: 'Enter your full name',
            name: 'full_name',
            required: true,
            width: 'full',
            options: [],
            validation: {},
            labelFontSize: 16,
            labelColor: '#333333',
            labelFontWeight: '600',
            inputBackgroundColor: '#ffffff',
            inputTextColor: '#333333',
            inputBorderColor: '#d1d5db',
            inputBorderWidth: 1,
            inputBorderRadius: 6,
            inputPadding: 12,
            conditionalLogic: {
              enabled: false,
              conditions: [],
              action: 'show'
            }
          },
          {
            id: generateBlockId(),
            type: 'email',
            label: 'Email Address',
            placeholder: 'Enter your email',
            name: 'email',
            required: true,
            width: 'full',
            options: [],
            validation: {},
            labelFontSize: 16,
            labelColor: '#333333',
            labelFontWeight: '600',
            inputBackgroundColor: '#ffffff',
            inputTextColor: '#333333',
            inputBorderColor: '#d1d5db',
            inputBorderWidth: 1,
            inputBorderRadius: 6,
            inputPadding: 12,
            conditionalLogic: {
              enabled: false,
              conditions: [],
              action: 'show'
            }
          },
          {
            id: generateBlockId(),
            type: 'textarea',
            label: 'Message',
            placeholder: 'Enter your message',
            name: 'message',
            required: false,
            width: 'full',
            options: [],
            validation: {
              minLength: 10,
              maxLength: 500
            },
            labelFontSize: 16,
            labelColor: '#333333',
            labelFontWeight: '600',
            inputBackgroundColor: '#ffffff',
            inputTextColor: '#333333',
            inputBorderColor: '#d1d5db',
            inputBorderWidth: 1,
            inputBorderRadius: 6,
            inputPadding: 12,
            conditionalLogic: {
              enabled: false,
              conditions: [],
              action: 'show'
            }
          }
        ]
      },
      
      // Form Settings
      formName: { default: 'Contact Form' },
      formId: { default: () => generateBlockId() },
      enableAjax: { default: true },
      enableRecaptcha: { default: false },
      recaptchaSiteKey: { default: '' },
      
      // Form Submission
      submission: {
        default: {
          method: 'email',
          emailTo: 'admin@example.com',
          emailSubject: 'New Form Submission',
          emailTemplate: 'New form submission from {{full_name}} ({{email}})\n\nMessage:\n{{message}}',
          webhookUrl: '',
          redirectUrl: '',
          showSuccessMessage: true,
          successMessage: 'Thank you! Your message has been sent successfully.',
          showErrorMessage: true,
          errorMessage: 'Sorry, there was an error sending your message. Please try again.',
          
          // 🆕 Post Creation 전용 설정
          postCreationSettings: {
            autoPublish: false,
            defaultStatus: 'draft',
            assignToUser: '',
            notifyOnSubmission: true,
            moderationRequired: true
          }
        }
      },
      
      // Form Layout
      formLayout: { default: 'default' },
      fieldSpacing: { default: 20 },
      fieldSpacingTablet: { default: 18 },
      fieldSpacingMobile: { default: 16 },
      
      // Global Label Styles
      globalLabelFontFamily: { default: 'inherit' },
      globalLabelFontSize: { default: 16 },
      globalLabelFontSizeTablet: { default: 16 },
      globalLabelFontSizeMobile: { default: 14 },
      globalLabelFontWeight: { default: '600' },
      globalLabelColor: { default: '#333333' },
      globalLabelMarginBottom: { default: 8 },
      
      // Global Input Styles
      globalInputFontFamily: { default: 'inherit' },
      globalInputFontSize: { default: 16 },
      globalInputFontSizeTablet: { default: 16 },
      globalInputFontSizeMobile: { default: 14 },
      globalInputBackgroundColor: { default: '#ffffff' },
      globalInputTextColor: { default: '#333333' },
      globalInputBorderColor: { default: '#d1d5db' },
      globalInputBorderColorFocus: { default: '#3b82f6' },
      globalInputBorderWidth: { default: 1 },
      globalInputBorderStyle: { default: 'solid' },
      globalInputBorderRadius: { default: 6 },
      globalInputPaddingTop: { default: 12 },
      globalInputPaddingRight: { default: 16 },
      globalInputPaddingBottom: { default: 12 },
      globalInputPaddingLeft: { default: 16 },
      globalInputHeight: { default: 48 },
      
      // Submit Button
      submitButtonText: { default: 'Send Message' },
      submitButtonAlign: { default: 'left' },
      submitButtonFontFamily: { default: 'inherit' },
      submitButtonFontSize: { default: 16 },
      submitButtonFontWeight: { default: '600' },
      submitButtonColor: { default: '#ffffff' },
      submitButtonBackgroundColor: { default: '#3b82f6' },
      submitButtonBorderColor: { default: '#3b82f6' },
      submitButtonColorHover: { default: '#ffffff' },
      submitButtonBackgroundColorHover: { default: '#2563eb' },
      submitButtonBorderColorHover: { default: '#2563eb' },
      submitButtonBorderWidth: { default: 1 },
      submitButtonBorderRadius: { default: 6 },
      submitButtonPaddingTop: { default: 12 },
      submitButtonPaddingRight: { default: 24 },
      submitButtonPaddingBottom: { default: 12 },
      submitButtonPaddingLeft: { default: 24 },
      
      // Error Styling
      errorColor: { default: '#ef4444' },
      errorFontSize: { default: 14 },
      errorMarginTop: { default: 6 },
      
      // Required Field
      requiredFieldIndicator: { default: '*' },
      requiredFieldColor: { default: '#ef4444' },
      
      // Form Container
      formBackgroundColor: { default: 'transparent' },
      formBorderColor: { default: 'transparent' },
      formBorderWidth: { default: 0 },
      formBorderRadius: { default: 0 },
      formPaddingTop: { default: 0 },
      formPaddingRight: { default: 0 },
      formPaddingBottom: { default: 0 },
      formPaddingLeft: { default: 0 },
      
      // Advanced
      enableProgressBar: { default: false },
      progressBarColor: { default: '#3b82f6' },
      progressBarBackgroundColor: { default: '#e5e7eb' },
      enableFieldAnimation: { default: false },
      fieldAnimationType: { default: 'fadeIn' },
      animationDuration: { default: 300 },
      
      // 🆕 Post Creation Mode (새로 추가된 기본값들)
      isPostCreationMode: { default: false },
      postTypeDefinition: { 
        default: () => createDefaultPostTypeDefinition()
      },
      databaseSchema: { 
        default: () => ({
          tableName: '',
          columns: {},
          relationships: {},
          indexes: []
        })
      },
      
      // Common UAGB attributes
      blockTopMargin: { default: 0 },
      blockRightMargin: { default: 0 },
      blockBottomMargin: { default: 0 },
      blockLeftMargin: { default: 0 },
      blockTopMarginTablet: { default: 0 },
      blockRightMarginTablet: { default: 0 },
      blockBottomMarginTablet: { default: 0 },
      blockLeftMarginTablet: { default: 0 },
      blockTopMarginMobile: { default: 0 },
      blockRightMarginMobile: { default: 0 },
      blockBottomMarginMobile: { default: 0 },
      blockLeftMarginMobile: { default: 0 },
      
      blockTopPadding: { default: 20 },
      blockRightPadding: { default: 20 },
      blockBottomPadding: { default: 20 },
      blockLeftPadding: { default: 20 },
      blockTopPaddingTablet: { default: 20 },
      blockRightPaddingTablet: { default: 20 },
      blockBottomPaddingTablet: { default: 20 },
      blockLeftPaddingTablet: { default: 20 },
      blockTopPaddingMobile: { default: 16 },
      blockRightPaddingMobile: { default: 16 },
      blockBottomPaddingMobile: { default: 16 },
      blockLeftPaddingMobile: { default: 16 },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="uagb/forms"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'uagb/forms',
          'class': `uagb-block-${HTMLAttributes['data-block-id']} uagb-forms`,
        },
        HTMLAttributes
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UAGBFormsView);
  },

  addCommands() {
    return {
      setUAGBForms:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
      updateUAGBForms:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },
});

// 🔧 Database Schema Generator 유틸리티 함수들

/**
 * 폼 필드 타입을 데이터베이스 컬럼 타입으로 변환
 */
export const getColumnTypeFromFieldType = (fieldType: UAGBFormField['type']): string => {
  const typeMapping: Record<string, string> = {
    text: 'VARCHAR(255)',
    email: 'VARCHAR(255)',
    tel: 'VARCHAR(50)',
    url: 'VARCHAR(500)',
    password: 'VARCHAR(255)',
    textarea: 'TEXT',
    select: 'VARCHAR(100)',
    radio: 'VARCHAR(100)',
    checkbox: 'JSON',
    file: 'VARCHAR(500)',
    date: 'DATE',
    number: 'DECIMAL(10,2)',
    hidden: 'VARCHAR(255)'
  };
  return typeMapping[fieldType] || 'VARCHAR(255)';
};

/**
 * Post Type Definition으로부터 데이터베이스 스키마 생성
 */
export const generateDatabaseSchema = (
  postTypeDefinition: UAGBPostTypeDefinition,
  formFields: UAGBFormField[]
): UAGBDatabaseSchema => {
  const tableName = `posts_${postTypeDefinition.postType}`;
  
  // 기본 컬럼들
  const baseColumns = {
    id: {
      type: 'INT',
      nullable: false,
      unique: true,
      index: true
    },
    status: {
      type: 'ENUM',
      default: 'draft',
      nullable: false
    }
  };

  // 선택적 기본 필드들
  const optionalColumns: any = {};
  
  if (postTypeDefinition.hasTitle) {
    optionalColumns.title = { type: 'VARCHAR(255)', nullable: false, index: true };
  }
  
  if (postTypeDefinition.hasContent) {
    optionalColumns.content = { type: 'LONGTEXT', nullable: true };
  }
  
  if (postTypeDefinition.hasExcerpt) {
    optionalColumns.excerpt = { type: 'TEXT', nullable: true };
  }
  
  if (postTypeDefinition.hasFeaturedImage) {
    optionalColumns.featured_image = { type: 'VARCHAR(500)', nullable: true };
  }
  
  if (postTypeDefinition.hasAuthorField) {
    optionalColumns.author_id = { type: 'INT', nullable: true, index: true };
  }
  
  if (postTypeDefinition.hasDateField) {
    optionalColumns.published_at = { type: 'TIMESTAMP', nullable: true };
  }

  // 타임스탬프 필드
  if (postTypeDefinition.timestampFields) {
    optionalColumns.created_at = { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' };
    optionalColumns.updated_at = { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' };
  }

  // 커스텀 필드들을 컬럼으로 변환
  const customColumns: any = {};
  formFields.forEach(field => {
    if (field.name && !['title', 'content', 'excerpt', 'featured_image'].includes(field.name)) {
      customColumns[field.name] = {
        type: getColumnTypeFromFieldType(field.type),
        nullable: !field.required
      };
    }
  });

  // 관계 테이블 정의
  const relationships: any = {};
  
  if (postTypeDefinition.hasCategories) {
    relationships.categories = {
      table: `${tableName}_categories`,
      foreignKey: 'post_id',
      type: 'manyToMany' as const
    };
  }
  
  if (postTypeDefinition.hasTagsField) {
    relationships.tags = {
      table: `${tableName}_tags`,
      foreignKey: 'post_id',
      type: 'manyToMany' as const
    };
  }

  return {
    tableName,
    columns: {
      ...baseColumns,
      ...optionalColumns,
      ...customColumns
    },
    relationships,
    indexes: ['id', 'status', 'created_at']
  };
};

/**
 * 데이터베이스 스키마로부터 SQL CREATE TABLE 문 생성
 */
export const generateCreateTableSQL = (schema: UAGBDatabaseSchema): string => {
  const columns = Object.entries(schema.columns).map(([name, config]) => {
    let columnDef = `\`${name}\` ${config.type}`;
    
    if (name === 'id') {
      columnDef += ' AUTO_INCREMENT PRIMARY KEY';
    } else {
      if (!config.nullable) columnDef += ' NOT NULL';
      if (config.default) columnDef += ` DEFAULT ${config.default}`;
      if (config.unique) columnDef += ' UNIQUE';
    }
    
    return columnDef;
  });

  let sql = `CREATE TABLE IF NOT EXISTS \`${schema.tableName}\` (\n`;
  sql += '  ' + columns.join(',\n  ') + '\n';
  
  // 인덱스 추가
  if (schema.indexes.length > 0) {
    const indexes = schema.indexes
      .filter(idx => idx !== 'id') // PRIMARY KEY는 이미 추가됨
      .map(idx => `INDEX \`idx_${idx}\` (\`${idx}\`)`)
      .join(',\n  ');
    if (indexes) {
      sql += ',\n  ' + indexes + '\n';
    }
  }
  
  sql += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;';
  
  return sql;
};

/**
 * 관계 테이블들의 SQL 생성
 */
export const generateRelationshipTablesSQL = (schema: UAGBDatabaseSchema): string[] => {
  const sqls: string[] = [];
  
  Object.entries(schema.relationships).forEach(([name, relation]) => {
    if (relation.type === 'manyToMany') {
      const sql = `
CREATE TABLE IF NOT EXISTS \`${relation.table}\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`${relation.foreignKey}\` INT NOT NULL,
  \`${name}_id\` INT NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY \`unique_relation\` (\`${relation.foreignKey}\`, \`${name}_id\`),
  INDEX \`idx_post\` (\`${relation.foreignKey}\`),
  INDEX \`idx_${name}\` (\`${name}_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
      
      sqls.push(sql.trim());
    }
  });
  
  return sqls;
};

/**
 * 기본 Post Type Definition 생성
 */
export const createDefaultPostTypeDefinition = (postType: string = 'blog'): UAGBPostTypeDefinition => ({
  enabled: false,
  postType,
  postTypeName: postType.charAt(0).toUpperCase() + postType.slice(1),
  
  hasTitle: true,
  hasContent: true,
  hasExcerpt: true,
  hasFeaturedImage: true,
  hasCategories: true,
  hasTagsField: true,
  hasAuthorField: true,
  hasDateField: true,
  hasStatusField: true,
  
  categories: ['General', 'News', 'Tutorial'],
  defaultCategory: 'General',
  allowNewCategories: true,
  
  metaFields: {
    seoTitle: true,
    seoDescription: true,
    customFields: true
  },
  
  tableName: `posts_${postType}`,
  primaryKey: 'id',
  timestampFields: true,
  
  permissions: {
    canCreate: ['admin', 'editor', 'author'],
    canEdit: ['admin', 'editor'],
    canDelete: ['admin'],
    canPublish: ['admin', 'editor']
  },
  
  workflow: {
    autoSave: true,
    requireApproval: false,
    notificationEmail: ''
  }
});

export default UAGBFormsBlock;

// 🚀 Post Creation API 연동 함수들

/**
 * Post Type 생성 API 호출
 */
export const createPostTypeAPI = async (postTypeDefinition: UAGBPostTypeDefinition) => {
  try {
    const response = await fetch('http://localhost:3000/api/post-creation/post-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: postTypeDefinition.postType,
        name: postTypeDefinition.postTypeName,
        singularName: postTypeDefinition.postTypeName,
        description: `Post type for ${postTypeDefinition.postTypeName}`,
        fieldGroups: [{
          id: 'default',
          name: 'Default Fields',
          description: 'Auto-generated from form fields',
          fields: [], // TODO: UAGBFormField를 FieldSchema로 변환
          order: 0
        }],
        settings: {
          public: true,
          hasArchive: true,
          supports: [
            ...(postTypeDefinition.hasTitle ? ['title'] : []),
            ...(postTypeDefinition.hasContent ? ['content'] : []),
            ...(postTypeDefinition.hasFeaturedImage ? ['thumbnail'] : [])
          ]
        },
        createdBy: 'form-builder' // TODO: 실제 사용자 ID 사용
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create post type');
    }
    
    return result.data;
    
  } catch (error) {
    console.error('Create post type API error:', error);
    throw error;
  }
};

/**
 * Post 생성 API 호출 (폼 제출 시)
 */
export const createPostAPI = async (
  postTypeSlug: string,
  formData: Record<string, any>,
  postCreationSettings: any
) => {
  try {
    const response = await fetch('http://localhost:3000/api/post-creation/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postTypeSlug,
        title: formData.title || formData.full_name || 'Untitled Post',
        content: formData.content || formData.message || '',
        fields: formData,
        status: postCreationSettings.autoPublish ? 'published' : postCreationSettings.defaultStatus,
        authorId: formData.author_id || null, // TODO: 현재 사용자 ID 사용
        meta: {
          featured: false,
          thumbnail: formData.featured_image || null,
          tags: formData.tags || []
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create post');
    }
    
    return result.data;
    
  } catch (error) {
    console.error('Create post API error:', error);
    throw error;
  }
};

/**
 * Post Type 스키마 조회 API
 */
export const getPostTypeSchemaAPI = async (postTypeSlug: string) => {
  try {
    const response = await fetch(`http://localhost:3000/api/post-creation/post-types/${postTypeSlug}/schema`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Post Type이 존재하지 않음
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get post type schema');
    }
    
    return result.data;
    
  } catch (error) {
    console.error('Get post type schema API error:', error);
    return null;
  }
};

/**
 * UAGBFormField를 API FieldSchema로 변환
 */
export const convertFormFieldToAPIField = (formField: UAGBFormField) => {
  return {
    id: formField.id,
    name: formField.name,
    label: formField.label,
    type: formField.type,
    required: formField.required,
    description: '',
    placeholder: formField.placeholder,
    options: formField.options?.map(opt => opt.value) || [],
    validation: {
      min: formField.validation.min,
      max: formField.validation.max,
      pattern: formField.validation.pattern
    }
  };
};
