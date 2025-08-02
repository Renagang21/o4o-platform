// Template System Types

// Generic component type to avoid React dependency
type ComponentType<P = {}> = (props: P) => any;

export interface TemplateBlock {
  id: string
  type: TemplateBlockType
  content: Record<string, any>
  settings: TemplateBlockSettings
  children?: TemplateBlock[]
  order: number
}

export type TemplateBlockType = 
  | 'hero'
  | 'heading' 
  | 'paragraph'
  | 'image'
  | 'video'
  | 'button'
  | 'columns'
  | 'spacer'
  | 'card'
  | 'list'
  | 'quote'
  | 'code'
  | 'divider'
  | 'carousel'
  | 'gallery'
  | 'contact-form'
  | 'social-media'
  | 'newsletter'
  | 'pricing-table'
  | 'testimonial'
  | 'faq'
  | 'map'
  | 'countdown'
  | 'progress-bar'

export interface TemplateBlockSettings {
  margin?: SpacingSettings
  padding?: SpacingSettings
  background?: BackgroundSettings
  border?: BorderSettings
  animation?: AnimationSettings
  responsive?: ResponsiveSettings
  visibility?: VisibilitySettings
}

export interface SpacingSettings {
  top?: string
  right?: string
  bottom?: string
  left?: string
}

export interface BackgroundSettings {
  type: 'none' | 'color' | 'gradient' | 'image' | 'video'
  color?: string
  gradient?: GradientSettings
  image?: ImageBackgroundSettings
  video?: VideoBackgroundSettings
}

export interface GradientSettings {
  type: 'linear' | 'radial'
  colors: string[]
  direction?: string
  position?: string
}

export interface ImageBackgroundSettings {
  url: string
  position: string
  repeat: string
  size: string
  attachment: string
  overlay?: {
    color: string
    opacity: number
  }
}

export interface VideoBackgroundSettings {
  url: string
  poster?: string
  loop: boolean
  muted: boolean
  overlay?: {
    color: string
    opacity: number
  }
}

export interface BorderSettings {
  style?: string
  width?: string
  color?: string
  radius?: string
}

export interface AnimationSettings {
  type: 'none' | 'fade' | 'slide' | 'zoom' | 'bounce' | 'rotate'
  duration: number
  delay: number
  trigger: 'page-load' | 'scroll' | 'hover' | 'click'
}

export interface ResponsiveSettings {
  desktop?: Partial<TemplateBlockSettings>
  tablet?: Partial<TemplateBlockSettings>
  mobile?: Partial<TemplateBlockSettings>
}

export interface VisibilitySettings {
  desktop: boolean
  tablet: boolean
  mobile: boolean
  loggedIn?: boolean
  userRoles?: string[]
}

export interface Template {
  id: string
  name: string
  description: string
  type: TemplateType
  category: TemplateCategory
  status: TemplateStatus
  blocks: TemplateBlock[]
  settings: TemplateGlobalSettings
  preview: TemplatePreview
  metadata: TemplateMetadata
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type TemplateType = 
  | 'page'
  | 'post'
  | 'category'
  | 'archive'
  | 'search'
  | '404'
  | 'email'
  | 'popup'

export type TemplateCategory =
  | 'landing-page'
  | 'homepage'
  | 'about'
  | 'contact'
  | 'portfolio'
  | 'blog'
  | 'ecommerce'
  | 'business'
  | 'personal'
  | 'creative'
  | 'education'
  | 'nonprofit'

export type TemplateStatus = 
  | 'draft'
  | 'published'
  | 'archived'

export interface TemplateGlobalSettings {
  layout: LayoutSettings
  typography: TypographySettings
  colors: ColorSettings
  spacing: SpacingSettings
  seo: SEOSettings
}

export interface LayoutSettings {
  containerWidth: string
  contentWidth: string
  sidebar: {
    enabled: boolean
    position: 'left' | 'right'
    width: string
  }
  header: {
    enabled: boolean
    sticky: boolean
    transparent: boolean
  }
  footer: {
    enabled: boolean
    sticky: boolean
  }
}

export interface TypographySettings {
  fontFamily: {
    primary: string
    secondary: string
    monospace: string
  }
  fontSize: {
    base: string
    scale: number
  }
  lineHeight: {
    tight: number
    normal: number
    loose: number
  }
  fontWeight: {
    normal: number
    medium: number
    bold: number
  }
}

export interface ColorSettings {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: {
    primary: string
    secondary: string
    muted: string
  }
  border: string
  success: string
  warning: string
  error: string
}

export interface SEOSettings {
  title?: string
  description?: string
  keywords?: string[]
  ogImage?: string
  canonicalUrl?: string
  noindex?: boolean
  nofollow?: boolean
}

export interface TemplatePreview {
  thumbnail: string
  screenshots: string[]
  demoUrl?: string
}

export interface TemplateMetadata {
  tags: string[]
  author: string
  version: string
  minSystemVersion?: string
  compatibility: string[]
  usageCount: number
  rating: number
  downloads: number
  featured?: boolean
}

// Template Library Types
export interface TemplateLibraryItem {
  id: string
  name: string
  description: string
  category: TemplateCategory
  preview: TemplatePreview
  metadata: TemplateMetadata
  isPremium: boolean
  price?: number
  popularity: number
  featured: boolean
}

export interface TemplateLibraryFilter {
  category?: TemplateCategory
  type?: TemplateType
  tags?: string[]
  isPremium?: boolean
  priceRange?: [number, number]
  rating?: number
  search?: string
}

// Template Builder Types
export interface TemplateBuilderState {
  template: Template
  selectedBlockId: string | null
  previewMode: boolean
  devicePreview: 'desktop' | 'tablet' | 'mobile'
  zoom: number
  history: TemplateHistoryState[]
  historyIndex: number
}

export interface TemplateHistoryState {
  blocks: TemplateBlock[]
  settings: TemplateGlobalSettings
  timestamp: Date
  action: string
}

// Form Data Types
export interface CreateTemplateDto {
  name: string
  description: string
  type: TemplateType
  category: TemplateCategory
  template?: Partial<Template>
}

export interface UpdateTemplateDto {
  name?: string
  description?: string
  blocks?: TemplateBlock[]
  settings?: Partial<TemplateGlobalSettings>
  status?: TemplateStatus
}

export interface DuplicateTemplateDto {
  name: string
  description?: string
}

// API Response Types
export interface TemplateListResponse {
  templates: Template[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface TemplateLibraryResponse {
  items: TemplateLibraryItem[]
  total: number
  page: number
  limit: number
  totalPages: number
  categories: TemplateCategory[]
  tags: string[]
}

// Block Definitions
export interface BlockDefinition {
  type: TemplateBlockType
  name: string
  icon: string
  category: BlockCategory
  description: string
  defaultContent: Record<string, any>
  defaultSettings: TemplateBlockSettings
  contentSchema: ContentSchema
  settingsSchema: SettingsSchema
  preview: ComponentType<{ block: TemplateBlock }>
  editor: ComponentType<{ 
    block: TemplateBlock
    onChange: (updates: Partial<TemplateBlock>) => void 
  }>
}

export type BlockCategory = 
  | 'basic'
  | 'media'
  | 'layout'
  | 'interactive'
  | 'ecommerce'
  | 'social'
  | 'forms'
  | 'advanced'

export interface ContentSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object'
    required?: boolean
    default?: any
    validation?: ValidationRule[]
  }
}

export interface SettingsSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'image'
    label: string
    required?: boolean
    default?: any
    options?: { value: any; label: string }[]
    validation?: ValidationRule[]
  }
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'custom'
  value?: any
  message: string
  validator?: (value: any) => boolean
}

// Theme System Integration
export interface TemplateTheme {
  id: string
  name: string
  description: string
  settings: TemplateGlobalSettings
  customCSS?: string
  preview: TemplatePreview
  isDefault: boolean
}

export interface ApplyThemeDto {
  themeId: string
  preserveContent: boolean
  overrideSettings: Partial<TemplateGlobalSettings>
}