// Re-export Post types from SSOT
export type { PostStatus, PostType, SEOMetadata } from '@o4o/types/cpt';
// Note: Tag is defined locally in this file (line 80), not re-exported

// TipTap Editor Types (unique to this app)
export interface TipTapJSONContent {
  type?: string
  attrs?: Record<string, unknown>
  content?: TipTapJSONContent[]
  marks?: {
    type: string
    attrs?: Record<string, unknown>
  }[]
  text?: string
}

// Local Post interface (extends base Post with TipTap content)
import type { Post as BasePost, PostType, PostStatus, SEOMetadata } from '@o4o/types/cpt';

export interface Post {
  id: string
  title: string
  slug: string
  content: TipTapJSONContent
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
  customFields?: Record<string, unknown>
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
  metadata?: Record<string, unknown>
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

// Re-export ACF field types from SSOT (these are essentially the same as CustomField)
export type {
  ACFFieldDefinition as CustomField,
  ACFFieldType as CustomFieldType,
  ACFFieldGroup as FieldGroup,
  ACFLocation as LocationRule,
  ACFValidation as ValidationRules
} from '@o4o/types/cpt';

// Local field option interface (app-specific)
export interface FieldOption {
  label: string
  value: string
  disabled?: boolean
  selected?: boolean
}

// Local conditional logic (app-specific with action field)
export interface ConditionalLogic {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'empty' | 'not_empty'
  value: string | number | boolean | string[]
  action: 'show' | 'hide' | 'enable' | 'disable'
}

export interface Template {
  id: string
  name: string
  slug?: string
  type: 'page' | 'post' | 'archive' | 'single' | 'product' | string
  layoutType?: 'personal-blog' | 'photo-blog' | 'complex-blog' | 'custom'
  description?: string
  thumbnail?: string
  preview?: string
  content: TipTapJSONContent // TipTap JSONContent or custom structure
  customFields?: string[] | Record<string, unknown> // Field group IDs or actual fields
  settings?: Record<string, unknown>
  isDefault?: boolean
  active?: boolean
  featured?: boolean
  status?: 'active' | 'inactive' | 'draft'
  category?: string
  tags?: string[]
  version?: string
  compatibility?: {
    minVersion?: string
    maxVersion?: string
    requiredPlugins?: string[]
  }
  createdBy?: string
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
    attrs?: Record<string, unknown>
  }>
  attrs?: Record<string, unknown>
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