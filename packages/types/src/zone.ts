/**
 * Zone-based Theme System Type Definitions
 */

// Zone Types
export type ZoneType = 'header' | 'footer' | 'main' | 'sidebar' | 'hero' | 'custom'
export type LayoutType = 'single-column' | 'two-column' | 'three-column' | 'landing' | 'custom'

// Block Constraint Interfaces
export interface BlockConstraint {
  allowedBlocks: string[]
  maxBlocks: number | null
  minBlocks: number
  required: boolean
  singleton: boolean
  allowNesting: boolean
  maxNestingLevel: number
}

// Zone Settings Interface
export interface ZoneSettings {
  width?: string
  maxWidth?: string
  minWidth?: string
  height?: string
  minHeight?: string
  maxHeight?: string
  padding?: string
  margin?: string
  backgroundColor?: string
  textColor?: string
  borderRadius?: string
  border?: string
  borderTop?: string
  borderBottom?: string
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky'
  sticky?: boolean
  stickyOffset?: number
  fullWidth?: boolean
  customCSS?: string
  className?: string
}

// Zone Block Interface
export interface ZoneBlock {
  id: string
  type: string
  attributes?: Record<string, any>
  innerBlocks?: ZoneBlock[]
  content?: string
  order?: number
}

// Zone Definition Interface
export interface Zone {
  id: string
  name: string
  description?: string
  type: ZoneType
  editable: boolean
  blocks: ZoneBlock[]
  constraints: BlockConstraint
  defaultBlocks?: ZoneBlock[]
  settings: ZoneSettings
  metadata?: Record<string, any>
}

// Zone-based Content Structure
export interface ZoneBasedContent {
  zones: Record<string, Zone>
  layout: LayoutType
  version?: string
  useZones: boolean
}

// Layout Structure Interfaces
export interface LayoutGridStructure {
  type: 'grid'
  areas: string[] | string[][]
  template: string
  gap: string
}

export interface LayoutFlexStructure {
  type: 'flex'
  direction: 'row' | 'column'
  gap: string
  wrap?: boolean
  justifyContent?: string
  alignItems?: string
}

export type LayoutStructure = LayoutGridStructure | LayoutFlexStructure

// Layout Zone Configuration
export interface LayoutZone {
  gridArea?: string
  order: number
  optional?: boolean
  zoneId?: string
  className?: string
  fullWidth?: boolean
  minHeight?: string
  backgroundColor?: string
  containerWidth?: string
  sticky?: boolean
}

// Responsive Layout Configuration
export interface ResponsiveConfig {
  minWidth?: string
  maxWidth?: string
  containerWidth?: string
  padding?: string
  sidebarWidth?: string
  structure?: Partial<LayoutStructure>
}

// Layout Definition
export interface Layout {
  id: string
  name: string
  description: string
  preview?: string
  structure: LayoutStructure
  zones: Record<string, LayoutZone>
  responsive: {
    desktop?: ResponsiveConfig
    tablet?: ResponsiveConfig
    mobile?: ResponsiveConfig
    wide?: ResponsiveConfig
  }
}

// Theme Customization Interfaces
export interface BrandingCustomization {
  logo?: string | null
  favicon?: string | null
  siteName?: string
  tagline?: string
}

// Alias for backward compatibility
export type BrandingConfig = BrandingCustomization

export interface ColorCustomization {
  primary?: string
  secondary?: string
  accent?: string
  text?: string
  background?: string
  muted?: string
  mutedForeground?: string
  border?: string
  input?: string
  ring?: string
  foreground?: string
  customPalette?: ColorPreset[]
}

// Alias for backward compatibility
export type ColorScheme = ColorCustomization

export interface ColorPreset {
  name: string
  slug: string
  color: string
}

export interface TypographyCustomization {
  fontFamily?: string
  fontSize?: string
  lineHeight?: number
  headingFontFamily?: string
  headingFontWeight?: string | number
}

export interface BusinessInfo {
  name?: string
  companyName?: string
  description?: string
  phone?: string
  email?: string
  address?: string
  website?: string
  socialMedia?: Record<string, string>
  socialLinks?: Record<string, string>
  businessHours?: Record<string, string>
}

export interface NavigationItem {
  id: string
  label: string
  url: string
  target?: '_self' | '_blank'
  children?: NavigationItem[]
  icon?: string
}

export interface NavigationConfig {
  menuItems: NavigationItem[]
  footerLinks: NavigationItem[]
  items?: NavigationItem[]
  showHome?: boolean
  sticky?: boolean
}

export interface ThemeCustomization {
  id?: string
  userId?: string
  name?: string
  branding: BrandingCustomization
  colors: ColorCustomization
  typography?: TypographyCustomization
  businessInfo: BusinessInfo
  navigation: NavigationConfig
  customCSS?: string
  customJS?: string
  isActive?: boolean
  isApproved?: boolean
  createdAt?: string
  updatedAt?: string
}

// Zone Configuration Schema
export interface ZoneConfig {
  $schema?: string
  version: string
  zones: Record<string, Omit<Zone, 'blocks'>>
  zoneGroups: {
    essential: string[]
    optional: string[]
    custom: string[]
  }
  blockConstraintRules?: Record<string, {
    maxInstances?: number
    allowedZones?: string[]
    requiredAttributes?: Record<string, any>
  }>
}

// Layout Configuration Schema
export interface LayoutConfig {
  $schema?: string
  version: string
  layouts: Record<string, Layout>
  breakpoints: Record<string, {
    min?: number
    max?: number
    unit: string
  }>
  containerSizes: Record<string, string>
  spacing: {
    unit: string
    scale: Record<string, number>
  }
  transitions?: {
    duration: Record<string, string>
    easing: Record<string, string>
  }
}

// Zone Template for Reusable Patterns
export interface ZoneTemplate {
  id: string
  name: string
  description?: string
  zoneId: string
  templateData: ZoneBlock[]
  category?: string
  isDefault?: boolean
  preview?: string
  createdAt?: Date
  updatedAt?: Date
}

// Page Zone Override
export interface PageZone {
  id: string
  pageId: string
  zoneId: string
  blocks: ZoneBlock[]
  settings?: ZoneSettings
  orderIndex?: number
}

// Content Adapter Types
export interface LegacyContent {
  blocks: Array<{
    id: string
    type: string
    content: any
    attributes?: Record<string, any>
  }>
}

// API Response Types
export interface ZoneApiResponse {
  zones: ZoneBasedContent
  customization?: ThemeCustomization
  layout: LayoutType
}

export interface ThemeCustomizationApiResponse {
  id: string
  userId: string
  themeId: string
  customization: ThemeCustomization
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Zone Validation Types
export interface ZoneValidationResult {
  valid: boolean
  errors?: ZoneValidationError[]
  warnings?: ZoneValidationWarning[]
}

export interface ZoneValidationError {
  zoneId: string
  blockId?: string
  type: 'constraint' | 'structure' | 'content'
  message: string
}

export interface ZoneValidationWarning {
  zoneId: string
  blockId?: string
  type: 'performance' | 'compatibility' | 'best-practice'
  message: string
}

// Export utility type for migration
export type ZoneMigrationData = {
  from: LegacyContent
  to: ZoneBasedContent
  migrationLog?: Array<{
    action: string
    timestamp: Date
    details?: any
  }>
}