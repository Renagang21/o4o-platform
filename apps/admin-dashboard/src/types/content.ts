// Content Management Types
export type PostStatus = 'draft' | 'published' | 'private' | 'archived' | 'scheduled'
export type PostType = 'post' | 'page' | 'notice' | 'news' | 'product'

export interface SEOMetadata {
  title?: string
  description?: string
  keywords?: string[]
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogType?: string
  twitterCard?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
  canonicalUrl?: string
  noindex?: boolean
  nofollow?: boolean
  schema?: Record<string, any>
  score?: number
}

export interface Post {
  id: string
  title: string
  slug: string
  content: any // TipTap JSONContent
  excerpt?: string
  type: PostType
  status: PostStatus
  author: string
  authorId: string
  category?: string
  categories?: string[]
  tags: string[]
  featuredImage?: string
  featuredImageId?: string
  views: number
  likes?: number
  comments?: number
  publishedAt?: string
  scheduledAt?: string
  createdAt: string
  updatedAt: string
  seo: SEOMetadata
  customFields?: Record<string, any>
  template?: string
  parentId?: string // For hierarchical content
  order?: number
  isSticky?: boolean // For featured posts
  allowComments?: boolean
  passwordProtected?: boolean
  password?: string
}

export interface Page extends Omit<Post, 'type' | 'category' | 'tags'> {
  type: 'page'
  template: string
  menuOrder?: number
  parentId?: string
  children?: Page[]
  isHomepage?: boolean
  showInMenu?: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  parentId?: string
  children?: Category[]
  image?: string
  color?: string
  order: number
  postCount: number
  isActive: boolean
  seo?: SEOMetadata
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: string
  name: string
  slug: string
  description?: string
  color?: string
  postCount: number
  createdAt: string
  updatedAt: string
}

export interface MediaFile {
  id: string
  name: string
  originalName: string
  filename: string
  type: 'image' | 'video' | 'audio' | 'document' | 'other'
  mimeType: string
  size: number
  url: string
  thumbnailUrl?: string
  sizes?: MediaSize[]
  folder?: string
  folderId?: string
  tags: string[]
  altText?: string
  caption?: string
  description?: string
  dimensions?: {
    width: number
    height: number
  }
  metadata?: Record<string, any>
  uploadedBy: string
  uploadedAt: string
  updatedAt: string
}

export interface MediaSize {
  name: string // thumbnail, small, medium, large, original
  width: number
  height: number
  url: string
  fileSize: number
  mimeType: string
}

export interface MediaFolder {
  id: string
  name: string
  slug: string
  parentId?: string
  children?: MediaFolder[]
  fileCount: number
  totalSize: number
  createdAt: string
  updatedAt: string
}

export interface CustomField {
  id: string
  name: string
  label: string
  type: CustomFieldType
  description?: string
  required: boolean
  defaultValue?: any
  placeholder?: string
  validation?: ValidationRules
  conditionalLogic?: ConditionalLogic[]
  options?: FieldOption[] // For select, radio, checkbox
  min?: number
  max?: number
  step?: number
  maxLength?: number
  minLength?: number
  pattern?: string
  multiple?: boolean
  order: number
  groupId: string
}

export type CustomFieldType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'url'
  | 'tel'
  | 'password'
  | 'date'
  | 'datetime'
  | 'time'
  | 'color'
  | 'range'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'toggle'
  | 'image'
  | 'gallery'
  | 'file'
  | 'wysiwyg'
  | 'code'
  | 'location'
  | 'repeater'
  | 'group'
  | 'tab'

export interface FieldOption {
  label: string
  value: string
  disabled?: boolean
  selected?: boolean
}

export interface ValidationRules {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  custom?: string // Custom validation function
}

export interface ConditionalLogic {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'empty' | 'not_empty'
  value: any
  action: 'show' | 'hide' | 'enable' | 'disable'
}

export interface FieldGroup {
  id: string
  title: string
  description?: string
  location: LocationRule[]
  placement: 'normal' | 'high' | 'side'
  style: 'default' | 'seamless'
  hideOnScreen?: string[]
  active: boolean
  order: number
  fields: CustomField[]
  createdAt: string
  updatedAt: string
}

export interface LocationRule {
  param: string // post_type, page_template, category, etc.
  operator: 'equals' | 'not_equals' | 'contains'
  value: string
  and?: LocationRule[]
  or?: LocationRule[]
}

export interface Template {
  id: string
  name: string
  type: 'page' | 'post' | 'archive' | 'single'
  description?: string
  thumbnail?: string
  content: any // TipTap JSONContent or custom structure
  customFields?: string[] // Field group IDs
  isDefault?: boolean
  category?: string
  tags?: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Menu {
  id: string
  name: string
  slug: string
  location: string
  items: MenuItem[]
  createdAt: string
  updatedAt: string
}

export interface MenuItem {
  id: string
  label: string
  type: 'post' | 'page' | 'category' | 'tag' | 'custom' | 'external'
  url?: string
  target?: '_self' | '_blank'
  postId?: string
  pageId?: string
  categoryId?: string
  tagId?: string
  parentId?: string
  children?: MenuItem[]
  order: number
  cssClasses?: string[]
  description?: string
  isActive: boolean
}

// API Response Types
export interface ApiResponse<T> {
  data: T
  message?: string
  pagination?: {
    currentPage: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export interface ContentFilters {
  type?: PostType
  status?: PostStatus
  author?: string
  category?: string
  tag?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  featured?: boolean
  orderBy?: 'title' | 'date' | 'views' | 'updated'
  order?: 'asc' | 'desc'
}

export interface BulkAction {
  action: 'publish' | 'draft' | 'archive' | 'delete' | 'update'
  ids: string[]
  data?: Partial<Post>
}

// Editor Types
export interface EditorContent {
  type: string
  content?: EditorContent[]
  marks?: Array<{
    type: string
    attrs?: Record<string, any>
  }>
  attrs?: Record<string, any>
  text?: string
}

export interface EditorState {
  content: EditorContent
  selection?: {
    anchor: number
    head: number
  }
}

// Component Props Types
export interface PostEditorProps {
  post?: Post
  onSave: (post: Partial<Post>) => Promise<void>
  onPreview?: (post: Post) => void
  autosave?: boolean
  autoSaveInterval?: number
}

export interface MediaLibraryProps {
  multiple?: boolean
  allowedTypes?: string[]
  onSelect?: (files: MediaFile[]) => void
  onClose?: () => void
  maxFiles?: number
  maxFileSize?: number
}

export interface CategoryManagerProps {
  hierarchical?: boolean
  allowCreate?: boolean
  allowEdit?: boolean
  allowDelete?: boolean
  onSelectionChange?: (categories: Category[]) => void
}

// Hook Types
export interface UseContentOptions {
  type?: PostType
  filters?: ContentFilters
  page?: number
  pageSize?: number
  enabled?: boolean
}

export interface UseContentResult {
  posts: Post[]
  loading: boolean
  error: string | null
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    hasNext: boolean
    hasPrev: boolean
  }
  refresh: () => void
  loadMore: () => void
}