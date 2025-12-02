// Template system types for dynamic page/post rendering

export interface TemplateField {
  name: string;
  label: string;
  shortcode: string;
  example: string;
}

export interface TemplateCondition {
  field: string;
  operator: string;
  value: string;
}

export interface TemplateSettings {
  responsive: boolean;
  cache: boolean;
  cacheTime: number;
}

export interface Template {
  id: string;
  name: string;
  title: string;
  description?: string;
  type: 'single' | 'archive' | 'custom';
  postType?: string; // CPT slug for single/archive templates
  htmlContent: string;
  cssContent: string;
  jsContent?: string;
  conditions?: TemplateCondition[];
  settings: TemplateSettings;
  shortcode: string; // [template name="template-name"]
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateFormData {
  name: string;
  title: string;
  description: string;
  type: 'single' | 'archive' | 'custom';
  postType: string;
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  conditions: TemplateCondition[];
  settings: TemplateSettings;
}

export interface AvailableCPT {
  slug: string;
  name: string;
}

export type PreviewMode = 'desktop' | 'tablet' | 'mobile';
export type EditorMode = 'html' | 'css' | 'js';
