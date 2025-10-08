// Widget System Types

export interface Widget {
  id: string
  type: WidgetType
  title: string
  content: Record<string, unknown>
  settings: WidgetSettings
  position: WidgetPosition
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type WidgetType = 
  | 'text'
  | 'html'
  | 'image'
  | 'menu'
  | 'recent-posts'
  | 'categories'
  | 'tags'
  | 'archives'
  | 'search'
  | 'social-links'
  | 'contact-info'
  | 'newsletter'
  | 'custom-code'
  | 'rss-feed'
  | 'calendar'

export type WidgetPosition = 
  | 'footer-1'
  | 'footer-2' 
  | 'footer-3'
  | 'footer-4'
  | 'sidebar-main'
  | 'sidebar-shop'
  | 'header-top'
  | 'header-bottom'

export interface WidgetSettings {
  showTitle: boolean
  customCSS?: string
  visibility: WidgetVisibility
  animation?: WidgetAnimation
  spacing: WidgetSpacing
  styling: WidgetStyling
}

export interface WidgetVisibility {
  desktop: boolean
  tablet: boolean
  mobile: boolean
  loggedIn?: boolean
  userRoles?: string[]
  pages?: string[]
  hideOnPages?: string[]
}

export interface WidgetAnimation {
  type: 'none' | 'fade' | 'slide' | 'bounce'
  duration: number
  delay: number
}

export interface WidgetSpacing {
  margin: {
    top: string
    right: string
    bottom: string
    left: string
  }
  padding: {
    top: string
    right: string
    bottom: string
    left: string
  }
}

export interface WidgetStyling {
  backgroundColor?: string
  textColor?: string
  borderColor?: string
  borderWidth?: string
  borderRadius?: string
  fontSize?: string
  fontWeight?: string
  textAlign?: 'left' | 'center' | 'right'
}

// Widget Area Configuration
export interface WidgetArea {
  id: string
  name: string
  description: string
  position: WidgetPosition
  maxWidgets?: number
  allowedTypes?: WidgetType[]
  isActive: boolean
  widgets: Widget[]
  settings: WidgetAreaSettings
}

export interface WidgetAreaSettings {
  columns: number
  gap: string
  backgroundColor?: string
  padding: string
  containerClass?: string
}

// Widget Content Types
export interface TextWidgetContent {
  text: string
  autoP: boolean
}

export interface HtmlWidgetContent {
  html: string
}

export interface ImageWidgetContent {
  url: string
  alt: string
  link?: string
  caption?: string
  size: 'thumbnail' | 'medium' | 'large' | 'full'
}

export interface MenuWidgetContent {
  menuId: string
  showHierarchy: boolean
  maxDepth: number
}

export interface RecentPostsWidgetContent {
  count: number
  showDate: boolean
  showExcerpt: boolean
  excerptLength: number
  categoryId?: string
  excludeCategories?: string[]
}

export interface CategoriesWidgetContent {
  showPostCount: boolean
  showHierarchy: boolean
  hideEmpty: boolean
  excludeCategories?: string[]
}

export interface TagsWidgetContent {
  showPostCount: boolean
  hideEmpty: boolean
  maxTags?: number
  orderBy: 'name' | 'count'
  order: 'asc' | 'desc'
}

export interface ArchivesWidgetContent {
  type: 'monthly' | 'yearly'
  showPostCount: boolean
  maxItems?: number
}

export interface SearchWidgetContent {
  placeholder: string
  buttonText: string
  searchCategories: boolean
}

export interface SocialLinksWidgetContent {
  links: SocialLink[]
  style: 'icons' | 'buttons' | 'text'
  size: 'small' | 'medium' | 'large'
  openInNewTab: boolean
}

export interface SocialLink {
  platform: SocialPlatform
  url: string
  label?: string
}

export type SocialPlatform = 
  | 'facebook'
  | 'twitter'
  | 'instagram'
  | 'youtube'
  | 'linkedin'
  | 'tiktok'
  | 'pinterest'
  | 'github'
  | 'discord'
  | 'telegram'
  | 'whatsapp'
  | 'email'
  | 'phone'

export interface ContactInfoWidgetContent {
  address?: string
  phone?: string
  email?: string
  website?: string
  businessHours?: BusinessHours[]
  showMap: boolean
  mapAddress?: string
}

export interface BusinessHours {
  day: string
  open: string
  close: string
  closed: boolean
}

export interface NewsletterWidgetContent {
  title: string
  description: string
  placeholder: string
  buttonText: string
  successMessage: string
  privacyText?: string
  provider: 'mailchimp' | 'constant-contact' | 'custom'
  apiKey?: string
  listId?: string
}

export interface CustomCodeWidgetContent {
  code: string
  type: 'html' | 'javascript' | 'css'
}

export interface RSSFeedWidgetContent {
  feedUrl: string
  maxItems: number
  showDate: boolean
  showDescription: boolean
  descriptionLength: number
}

export interface CalendarWidgetContent {
  eventSource: 'google' | 'custom'
  calendarId?: string
  maxEvents: number
  showTime: boolean
  dateFormat: string
}

// Form Data Types
export interface CreateWidgetDto {
  type: WidgetType
  title: string
  content: Record<string, unknown>
  position: WidgetPosition
  settings?: Partial<WidgetSettings>
}

export interface UpdateWidgetDto {
  title?: string
  content?: Record<string, unknown>
  settings?: Partial<WidgetSettings>
  position?: WidgetPosition
  order?: number
  isActive?: boolean
}

export interface ReorderWidgetDto {
  widgetId: string
  newOrder: number
  newPosition?: WidgetPosition
}

export interface WidgetAreaConfigDto {
  settings: Partial<WidgetAreaSettings>
  allowedTypes?: WidgetType[]
  maxWidgets?: number
}

// API Response Types
export interface WidgetListResponse {
  widgets: Widget[]
  areas: WidgetArea[]
  total: number
}

export interface WidgetAreaResponse {
  area: WidgetArea
  availableTypes: WidgetTypeDefinition[]
}

export interface WidgetTypeDefinition {
  type: WidgetType
  name: string
  description: string
  icon: string
  category: WidgetCategory
  defaultContent: Record<string, unknown>
  defaultSettings: Partial<WidgetSettings>
  fields: WidgetField[]
}

export type WidgetCategory = 
  | 'content'
  | 'navigation'
  | 'social'
  | 'forms'
  | 'media'
  | 'advanced'

export interface WidgetField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multiselect' | 'image' | 'url' | 'color'
  required?: boolean
  default?: any
  options?: { value: any; label: string }[]
  placeholder?: string
  help?: string
  validation?: WidgetFieldValidation
}

export interface WidgetFieldValidation {
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
  message?: string
}

// Widget Builder Types
export interface WidgetBuilderState {
  selectedArea: WidgetPosition | null
  selectedWidget: string | null
  isEditing: boolean
  isDragging: boolean
  draggedWidget: string | null
  previewMode: boolean
}

export interface WidgetDragItem {
  id: string
  type: WidgetType
  fromPosition: WidgetPosition
  order: number
}

// Widget Template Types
export interface WidgetTemplate {
  id: string
  name: string
  description: string
  category: WidgetCategory
  widgets: Omit<Widget, 'id' | 'createdAt' | 'updatedAt'>[]
  preview: string
  isPremium: boolean
  downloads: number
  rating: number
}

export interface ApplyWidgetTemplateDto {
  templateId: string
  targetArea: WidgetPosition
  replaceExisting: boolean
}