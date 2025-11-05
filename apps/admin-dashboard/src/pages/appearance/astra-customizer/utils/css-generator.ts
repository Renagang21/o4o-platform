import { AstraCustomizerSettings, ResponsiveValue } from '../types/customizer-types';

/**
 * Generate CSS from customizer settings
 */
export function generateCSS(settings: AstraCustomizerSettings): string {
  const css: string[] = [];
  
  // Add CSS custom properties (CSS Variables)
  css.push(':root {');
  css.push(...generateColorVariables(settings));
  css.push(...generateTypographyVariables(settings));
  css.push(...generateSpacingVariables(settings));
  css.push('}');
  
  // Generate responsive CSS
  css.push(...generateResponsiveCSS(settings));
  
  // Generate component-specific CSS
  css.push(...generateHeaderCSS(settings));
  css.push(...generateFooterCSS(settings));
  css.push(...generateContainerCSS(settings));
  css.push(...generateSidebarCSS(settings));
  css.push(...generateBlogCSS(settings));
  css.push(...generateButtonCSS(settings));
  css.push(...generateBreadcrumbCSS(settings));
  css.push(...generateScrollToTopCSS(settings));

  // Add custom CSS
  if (settings.customCSS) {
    css.push(settings.customCSS);
  }
  
  return css.join('\n');
}

function generateColorVariables(settings: AstraCustomizerSettings): string[] {
  const vars: string[] = [];
  const { colors } = settings;

  // Unified --wp-* variables (matching token-map.ts)
  vars.push(`  --wp-color-primary-500: ${colors.primaryColor};`);
  vars.push(`  --wp-color-secondary-500: ${colors.secondaryColor};`);
  vars.push(`  --wp-text-primary: ${colors.textColor};`);
  vars.push(`  --wp-link-color: ${colors.linkColor.normal};`);
  vars.push(`  --wp-link-color-hover: ${colors.linkColor.hover || colors.linkColor.normal};`);
  vars.push(`  --wp-border-primary: ${colors.borderColor};`);
  vars.push(`  --wp-bg-body: ${colors.bodyBackground};`);
  vars.push(`  --wp-bg-content: ${colors.contentBackground};`);

  // Legacy backward compatibility
  vars.push(`  --ast-primary-color: ${colors.primaryColor};`);
  vars.push(`  --ast-secondary-color: ${colors.secondaryColor};`);
  vars.push(`  --ast-text-color: ${colors.textColor};`);
  vars.push(`  --ast-link-color: ${colors.linkColor.normal};`);
  vars.push(`  --ast-link-hover-color: ${colors.linkColor.hover || colors.linkColor.normal};`);
  vars.push(`  --ast-border-color: ${colors.borderColor};`);
  vars.push(`  --ast-body-bg: ${colors.bodyBackground};`);
  vars.push(`  --ast-content-bg: ${colors.contentBackground};`);

  // Palette colors
  Object.entries(colors.palette).forEach(([key, value]) => {
    vars.push(`  --ast-palette-${key}: ${value};`);
  });

  return vars;
}

function generateTypographyVariables(settings: AstraCustomizerSettings): string[] {
  const vars: string[] = [];
  const { typography } = settings;

  // Unified --wp-* variables
  vars.push(`  --wp-font-body: ${typography.bodyFont.fontFamily};`);
  vars.push(`  --wp-font-size-body-desktop: ${typography.bodyFont.fontSize.desktop}px;`);
  vars.push(`  --wp-font-size-body-tablet: ${typography.bodyFont.fontSize.tablet}px;`);
  vars.push(`  --wp-font-size-body-mobile: ${typography.bodyFont.fontSize.mobile}px;`);
  vars.push(`  --wp-line-height-body-desktop: ${typography.bodyFont.lineHeight.desktop};`);
  vars.push(`  --wp-line-height-body-tablet: ${typography.bodyFont.lineHeight.tablet};`);
  vars.push(`  --wp-line-height-body-mobile: ${typography.bodyFont.lineHeight.mobile};`);

  // Legacy backward compatibility
  vars.push(`  --ast-body-font-family: ${typography.bodyFont.fontFamily};`);
  vars.push(`  --ast-body-font-weight: ${typography.bodyFont.fontWeight};`);
  vars.push(`  --ast-body-text-transform: ${typography.bodyFont.textTransform};`);

  // Button font
  vars.push(`  --ast-button-font-family: ${typography.button.fontFamily};`);
  vars.push(`  --ast-button-font-weight: ${typography.button.fontWeight};`);
  vars.push(`  --ast-button-text-transform: ${typography.button.textTransform};`);

  return vars;
}

function generateSpacingVariables(settings: AstraCustomizerSettings): string[] {
  const vars: string[] = [];
  const { container, sidebar } = settings;

  // Unified --wp-* variables
  vars.push(`  --wp-container-width-desktop: ${container.width.desktop}px;`);
  vars.push(`  --wp-container-width-tablet: ${container.width.tablet}px;`);
  vars.push(`  --wp-container-width-mobile: ${container.width.mobile}px;`);

  // Legacy backward compatibility
  vars.push(`  --ast-container-width-desktop: ${container.width.desktop}px;`);
  vars.push(`  --ast-container-width-tablet: ${container.width.tablet}px;`);
  vars.push(`  --ast-container-width-mobile: ${container.width.mobile}px;`);

  // Sidebar
  vars.push(`  --ast-sidebar-width-desktop: ${sidebar.width.desktop}%;`);
  vars.push(`  --ast-sidebar-width-tablet: ${sidebar.width.tablet}%;`);
  vars.push(`  --ast-sidebar-width-mobile: ${sidebar.width.mobile}%;`);
  vars.push(`  --ast-sidebar-gap: ${sidebar.gap.desktop}px;`);

  return vars;
}

function generateResponsiveCSS(settings: AstraCustomizerSettings): string[] {
  const css: string[] = [];
  const { typography, container } = settings;
  
  // Desktop styles (default)
  css.push('body {');
  css.push(`  font-family: ${typography.bodyFont.fontFamily};`);
  css.push(`  font-size: ${typography.bodyFont.fontSize.desktop}px;`);
  css.push(`  font-weight: ${typography.bodyFont.fontWeight};`);
  css.push(`  line-height: ${typography.bodyFont.lineHeight.desktop};`);
  css.push(`  letter-spacing: ${typography.bodyFont.letterSpacing.desktop}px;`);
  css.push(`  color: var(--wp-text-primary);`);
  css.push(`  background-color: var(--wp-bg-body);`);
  css.push('}');

  // Headings
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
    const heading = typography.headings[tag as keyof typeof typography.headings];
    css.push(`${tag} {`);
    css.push(`  font-family: ${heading.fontFamily};`);
    css.push(`  font-size: ${heading.fontSize.desktop}px;`);
    css.push(`  font-weight: ${heading.fontWeight};`);
    css.push(`  line-height: ${heading.lineHeight.desktop};`);
    css.push(`  letter-spacing: ${heading.letterSpacing.desktop}px;`);
    css.push(`  text-transform: ${heading.textTransform};`);
    css.push('}');
  });

  // Links
  css.push('a {');
  css.push(`  color: var(--wp-link-color);`);
  css.push(`  text-decoration: none;`);
  css.push(`  transition: color 0.2s;`);
  css.push('}');
  css.push('a:hover {');
  css.push(`  color: var(--wp-link-color-hover);`);
  css.push('}');
  
  // Tablet styles
  css.push('@media (max-width: 992px) {');
  css.push('  body {');
  css.push(`    font-size: ${typography.bodyFont.fontSize.tablet}px;`);
  css.push(`    line-height: ${typography.bodyFont.lineHeight.tablet};`);
  css.push('  }');
  
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
    const heading = typography.headings[tag as keyof typeof typography.headings];
    css.push(`  ${tag} {`);
    css.push(`    font-size: ${heading.fontSize.tablet}px;`);
    css.push(`    line-height: ${heading.lineHeight.tablet};`);
    css.push('  }');
  });
  css.push('}');
  
  // Mobile styles
  css.push('@media (max-width: 576px) {');
  css.push('  body {');
  css.push(`    font-size: ${typography.bodyFont.fontSize.mobile}px;`);
  css.push(`    line-height: ${typography.bodyFont.lineHeight.mobile};`);
  css.push('  }');
  
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
    const heading = typography.headings[tag as keyof typeof typography.headings];
    css.push(`  ${tag} {`);
    css.push(`    font-size: ${heading.fontSize.mobile}px;`);
    css.push(`    line-height: ${heading.lineHeight.mobile};`);
    css.push('  }');
  });
  css.push('}');
  
  return css;
}

function generateHeaderCSS(settings: AstraCustomizerSettings): string[] {
  const css: string[] = [];
  const { header, siteIdentity } = settings;
  
  css.push('.ast-header {');
  css.push(`  background: ${header.primary.background};`);
  css.push(`  height: ${header.primary.height.desktop}px;`);
  if (header.sticky) {
    css.push('  position: sticky;');
    css.push('  top: 0;');
    css.push('  z-index: 999;');
  }
  css.push('}');
  
  // Site title
  if (siteIdentity.siteTitle.show) {
    css.push('.site-title {');
    css.push(`  color: ${siteIdentity.siteTitle.color.normal};`);
    css.push(`  font-family: ${siteIdentity.siteTitle.typography.fontFamily};`);
    css.push(`  font-size: ${siteIdentity.siteTitle.typography.fontSize.desktop}px;`);
    css.push(`  font-weight: ${siteIdentity.siteTitle.typography.fontWeight};`);
    css.push('}');
    css.push('.site-title:hover {');
    css.push(`  color: ${siteIdentity.siteTitle.color.hover};`);
    css.push('}');
  }
  
  // Logo
  if (siteIdentity.logo.desktop) {
    css.push('.site-logo img {');
    css.push(`  max-width: ${siteIdentity.logo.width.desktop}px;`);
    css.push('}');
  }
  
  // Menu alignment
  css.push('.ast-primary-menu {');
  css.push(`  text-align: ${header.primary.menuAlignment};`);
  css.push('}');
  
  return css;
}

function generateFooterCSS(settings: AstraCustomizerSettings): string[] {
  const css: string[] = [];
  const { footer } = settings;
  
  // Footer widgets
  if (footer.widgets.enabled) {
    css.push('.ast-footer-widgets {');
    css.push(`  background: ${footer.widgets.background};`);
    css.push(`  color: ${footer.widgets.textColor};`);
    css.push(`  padding-top: ${footer.widgets.padding.desktop.top}px;`);
    css.push(`  padding-bottom: ${footer.widgets.padding.desktop.bottom}px;`);
    css.push('}');
    
    css.push('.ast-footer-widgets a {');
    css.push(`  color: ${footer.widgets.linkColor.normal};`);
    css.push('}');
    css.push('.ast-footer-widgets a:hover {');
    css.push(`  color: ${footer.widgets.linkColor.hover};`);
    css.push('}');
    
    css.push('.ast-footer-widget-area {');
    css.push('  display: grid;');
    css.push(`  grid-template-columns: repeat(${footer.widgets.columns.desktop}, 1fr);`);
    css.push('  gap: 30px;');
    css.push('}');
  }
  
  // Bottom bar
  if (footer.bottomBar.enabled) {
    css.push('.ast-footer-bottom {');
    css.push(`  background: ${footer.bottomBar.background};`);
    css.push(`  color: ${footer.bottomBar.textColor};`);
    css.push(`  padding-top: ${footer.bottomBar.padding.desktop.top}px;`);
    css.push(`  padding-bottom: ${footer.bottomBar.padding.desktop.bottom}px;`);
    css.push('}');
    
    css.push('.ast-footer-bottom a {');
    css.push(`  color: ${footer.bottomBar.linkColor.normal};`);
    css.push('}');
    css.push('.ast-footer-bottom a:hover {');
    css.push(`  color: ${footer.bottomBar.linkColor.hover};`);
    css.push('}');
  }
  
  return css;
}

function generateContainerCSS(settings: AstraCustomizerSettings): string[] {
  const css: string[] = [];
  const { container } = settings;
  
  css.push('.ast-container {');
  
  if (container.layout === 'boxed') {
    css.push(`  max-width: ${container.width.desktop}px;`);
    css.push('  margin: 0 auto;');
  } else if (container.layout === 'full-width') {
    css.push('  width: 100%;');
    css.push('  max-width: 100%;');
  } else if (container.layout === 'fluid') {
    css.push('  width: 100%;');
    css.push(`  max-width: ${container.width.desktop}px;`);
    css.push('  margin: 0 auto;');
  }
  
  css.push(`  padding-left: ${container.padding.desktop.left}px;`);
  css.push(`  padding-right: ${container.padding.desktop.right}px;`);
  css.push('}');
  
  // Responsive container
  css.push('@media (max-width: 992px) {');
  css.push('  .ast-container {');
  css.push(`    max-width: ${container.width.tablet}px;`);
  css.push(`    padding-left: ${container.padding.tablet.left}px;`);
  css.push(`    padding-right: ${container.padding.tablet.right}px;`);
  css.push('  }');
  css.push('}');
  
  css.push('@media (max-width: 576px) {');
  css.push('  .ast-container {');
  css.push(`    max-width: ${container.width.mobile}px;`);
  css.push(`    padding-left: ${container.padding.mobile.left}px;`);
  css.push(`    padding-right: ${container.padding.mobile.right}px;`);
  css.push('  }');
  css.push('}');
  
  return css;
}

function generateSidebarCSS(settings: AstraCustomizerSettings): string[] {
  const css: string[] = [];
  const { sidebar } = settings;
  
  if (sidebar.layout !== 'no-sidebar') {
    css.push('.ast-content-area {');
    css.push('  display: flex;');
    css.push(`  gap: ${sidebar.gap.desktop}px;`);
    css.push('}');
    
    css.push('.ast-primary-content {');
    css.push(`  flex: 1 1 ${100 - sidebar.width.desktop}%;`);
    css.push('}');
    
    css.push('.ast-sidebar {');
    css.push(`  flex: 0 0 ${sidebar.width.desktop}%;`);
    css.push('}');
    
    if (sidebar.layout === 'left-sidebar') {
      css.push('.ast-sidebar {');
      css.push('  order: -1;');
      css.push('}');
    }
    
    // Responsive
    css.push('@media (max-width: 768px) {');
    css.push('  .ast-content-area {');
    css.push('    flex-direction: column;');
    css.push('  }');
    css.push('  .ast-sidebar {');
    css.push('    flex: 0 0 100%;');
    css.push('  }');
    css.push('}');
  }
  
  return css;
}

function generateBlogCSS(settings: AstraCustomizerSettings): string[] {
  const css: string[] = [];
  const { blog } = settings;

  // Safety check - if blog settings are incomplete, return empty CSS
  if (!blog?.archive?.styling) {
    return css;
  }

  const { archive } = blog;
  const { styling, meta } = archive;

  // CSS Variables for blog styling
  css.push(':root {');
  css.push(`  --blog-card-spacing: ${archive.cardSpacing || 20}px;`);
  css.push(`  --blog-card-bg: ${styling.backgroundColor || '#ffffff'};`);
  css.push(`  --blog-card-border: ${styling.borderColor || '#e1e5e9'};`);
  css.push(`  --blog-card-border-radius: ${styling.borderRadius || 8}px;`);
  css.push(`  --blog-card-padding: ${styling.cardPadding || 20}px;`);
  css.push(`  --blog-title-color: ${styling.titleColor || '#333333'};`);
  css.push(`  --blog-title-hover-color: ${styling.titleHoverColor || '#0073e6'};`);
  css.push(`  --blog-excerpt-color: ${styling.excerptColor || '#6c757d'};`);
  css.push(`  --blog-meta-text-color: ${meta?.colors?.text || '#6c757d'};`);
  css.push(`  --blog-meta-link-color: ${meta?.colors?.links || '#0073e6'};`);
  css.push(`  --blog-meta-icon-color: ${meta?.colors?.icons || '#6c757d'};`);
  css.push(`  --blog-title-size-desktop: ${styling.typography?.titleSize?.desktop || 20}px;`);
  css.push(`  --blog-title-size-tablet: ${styling.typography?.titleSize?.tablet || 18}px;`);
  css.push(`  --blog-title-size-mobile: ${styling.typography?.titleSize?.mobile || 16}px;`);
  css.push(`  --blog-title-weight: ${styling.typography?.titleWeight || 600};`);
  css.push(`  --blog-excerpt-size-desktop: ${styling.typography?.excerptSize?.desktop || 14}px;`);
  css.push(`  --blog-excerpt-size-tablet: ${styling.typography?.excerptSize?.tablet || 13}px;`);
  css.push(`  --blog-excerpt-size-mobile: ${styling.typography?.excerptSize?.mobile || 12}px;`);
  css.push(`  --blog-meta-size-desktop: ${styling.typography?.metaSize?.desktop || 12}px;`);
  css.push(`  --blog-meta-size-tablet: ${styling.typography?.metaSize?.tablet || 11}px;`);
  css.push(`  --blog-meta-size-mobile: ${styling.typography?.metaSize?.mobile || 10}px;`);
  css.push('}');
  
  // Blog Archive Container
  css.push('.blog-archive {');
  css.push('  width: 100%;');
  css.push('}');
  
  // Grid Layout
  if (blog.archive.layout === 'grid') {
    css.push('.blog-archive-grid .posts-container {');
    css.push('  display: grid;');
    css.push('  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));');
    css.push('  gap: var(--blog-card-spacing);');
    css.push('}');
  }
  
  // List Layout
  if (blog.archive.layout === 'list') {
    css.push('.blog-archive-list .posts-container {');
    css.push('  display: flex;');
    css.push('  flex-direction: column;');
    css.push('  gap: var(--blog-card-spacing);');
    css.push('}');
  }
  
  // Masonry Layout
  if (blog.archive.layout === 'masonry') {
    css.push('.blog-archive-masonry .posts-container {');
    css.push('  column-count: auto;');
    css.push('  column-width: 300px;');
    css.push('  column-gap: var(--blog-card-spacing);');
    css.push('  column-fill: balance;');
    css.push('}');
  }
  
  // Post Cards
  css.push('.post-card {');
  css.push('  background: var(--blog-card-bg);');
  css.push('  border-radius: var(--blog-card-border-radius);');
  css.push('  padding: var(--blog-card-padding);');
  css.push('  transition: all 0.3s ease;');
  css.push('  height: fit-content;');
  css.push('}');
  
  // Card Styles
  if (blog.archive.cardStyle === 'boxed') {
    css.push('.card-style-boxed {');
    css.push('  border: 1px solid var(--blog-card-border);');
    css.push('}');
  }
  
  if (blog.archive.cardStyle === 'shadow') {
    css.push('.card-style-shadow {');
    css.push('  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);');
    css.push('}');
    css.push('.card-style-shadow:hover {');
    css.push('  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);');
    css.push('  transform: translateY(-2px);');
    css.push('}');
  }
  
  // Typography
  css.push('.post-title a {');
  css.push('  color: var(--blog-title-color);');
  css.push('  font-size: var(--blog-title-size-desktop);');
  css.push('  font-weight: var(--blog-title-weight);');
  css.push('  text-decoration: none;');
  css.push('  transition: color 0.3s ease;');
  css.push('}');
  
  css.push('.post-title a:hover {');
  css.push('  color: var(--blog-title-hover-color);');
  css.push('}');
  
  css.push('.post-excerpt {');
  css.push('  color: var(--blog-excerpt-color);');
  css.push('  font-size: var(--blog-excerpt-size-desktop);');
  css.push('  line-height: 1.6;');
  css.push('}');
  
  css.push('.post-meta {');
  css.push('  font-size: var(--blog-meta-size-desktop);');
  css.push('  color: var(--blog-meta-text-color);');
  css.push('}');
  
  css.push('.meta-link {');
  css.push('  color: var(--blog-meta-link-color);');
  css.push('  text-decoration: none;');
  css.push('  transition: opacity 0.3s ease;');
  css.push('}');
  
  css.push('.meta-link:hover {');
  css.push('  opacity: 0.8;');
  css.push('}');
  
  css.push('.meta-icon {');
  css.push('  color: var(--blog-meta-icon-color);');
  css.push('}');
  
  // Featured Images
  if (blog.archive.featuredImage.enabled) {
    css.push('.featured-image {');
    css.push('  width: 100%;');
    css.push('  height: 100%;');
    css.push('  object-fit: cover;');
    css.push('  transition: transform 0.3s ease;');
    css.push('}');
    
    if (blog.archive.featuredImage.hoverEffect === 'zoom') {
      css.push('.post-card:hover .featured-image {');
      css.push('  transform: scale(1.05);');
      css.push('}');
    }
    
    if (blog.archive.featuredImage.hoverEffect === 'fade') {
      css.push('.post-card:hover .featured-image {');
      css.push('  opacity: 0.8;');
      css.push('}');
    }
  }
  
  // Responsive Design
  css.push('@media (max-width: 1024px) {');
  css.push('  .post-title a {');
  css.push('    font-size: var(--blog-title-size-tablet);');
  css.push('  }');
  css.push('  .post-excerpt {');
  css.push('    font-size: var(--blog-excerpt-size-tablet);');
  css.push('  }');
  css.push('  .post-meta {');
  css.push('    font-size: var(--blog-meta-size-tablet);');
  css.push('  }');
  css.push('  .blog-archive-grid .posts-container {');
  css.push('    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));');
  css.push('  }');
  css.push('  .blog-archive-masonry .posts-container {');
  css.push('    column-count: 2;');
  css.push('    column-width: auto;');
  css.push('  }');
  css.push('}');
  
  css.push('@media (max-width: 768px) {');
  css.push('  .post-title a {');
  css.push('    font-size: var(--blog-title-size-mobile);');
  css.push('  }');
  css.push('  .post-excerpt {');
  css.push('    font-size: var(--blog-excerpt-size-mobile);');
  css.push('  }');
  css.push('  .post-meta {');
  css.push('    font-size: var(--blog-meta-size-mobile);');
  css.push('  }');
  css.push('  .blog-archive-grid .posts-container {');
  css.push('    grid-template-columns: 1fr;');
  css.push('  }');
  css.push('  .blog-archive-masonry .posts-container {');
  css.push('    column-count: 1;');
  css.push('  }');
  css.push('  .post-card-list {');
  css.push('    flex-direction: column;');
  css.push('  }');
  css.push('}');
  
  return css;
}

/**
 * Get responsive value for current device
 */
export function getResponsiveValue<T>(
  value: ResponsiveValue<T> | T,
  device: 'desktop' | 'tablet' | 'mobile' = 'desktop'
): T {
  if (value && typeof value === 'object' && 'desktop' in value) {
    return (value as ResponsiveValue<T>)[device];
  }
  return value as T;
}

function generateButtonCSS(settings: AstraCustomizerSettings): string[] {
  const css: string[] = [];
  const { buttons } = settings as any;

  if (!buttons) return css;

  // CSS Variables for button styling
  css.push(':root {');

  // Primary button variables
  if (buttons.primary) {
    css.push(`  --button-primary-bg: ${buttons.primary.backgroundColor || 'var(--wp-color-primary-500)'};`);
    css.push(`  --button-primary-text: ${buttons.primary.textColor || '#ffffff'};`);
    css.push(`  --button-primary-border-radius: ${buttons.primary.borderRadius || 4}px;`);
    css.push(`  --button-primary-padding-v: ${buttons.primary.paddingVertical || 12}px;`);
    css.push(`  --button-primary-padding-h: ${buttons.primary.paddingHorizontal || 24}px;`);

    if (buttons.primary.hoverBackgroundColor) {
      css.push(`  --button-primary-bg-hover: ${buttons.primary.hoverBackgroundColor};`);
    }
  }

  // Secondary button variables
  if (buttons.secondary) {
    css.push(`  --button-secondary-bg: ${buttons.secondary.backgroundColor || '#6c757d'};`);
    css.push(`  --button-secondary-text: ${buttons.secondary.textColor || '#ffffff'};`);
  }

  // Outline button variables
  if (buttons.outline) {
    css.push(`  --button-outline-border: ${buttons.outline.borderColor || 'var(--wp-color-primary-500)'};`);
    css.push(`  --button-outline-text: ${buttons.outline.textColor || 'var(--wp-color-primary-500)'};`);
    css.push(`  --button-outline-border-width: ${buttons.outline.borderWidth || 1}px;`);
  }

  css.push('}');

  // Apply button styles
  css.push('.wp-element-button, .ast-button, button[type="submit"] {');
  css.push('  background-color: var(--button-primary-bg);');
  css.push('  color: var(--button-primary-text);');
  css.push('  border-radius: var(--button-primary-border-radius);');
  css.push('  padding: var(--button-primary-padding-v) var(--button-primary-padding-h);');
  css.push('  transition: all 0.3s;');
  css.push('}');

  css.push('.wp-element-button:hover, .ast-button:hover, button[type="submit"]:hover {');
  css.push('  background-color: var(--button-primary-bg-hover, var(--button-primary-bg));');
  css.push('  opacity: 0.9;');
  css.push('}');

  return css;
}

function generateBreadcrumbCSS(settings: AstraCustomizerSettings): string[] {
  const css: string[] = [];
  const { breadcrumbs } = settings as any;

  if (!breadcrumbs) return css;

  css.push(':root {');

  if (breadcrumbs.styling) {
    css.push(`  --breadcrumb-text-color: ${breadcrumbs.styling.textColor || '#6c757d'};`);
    css.push(`  --breadcrumb-link-color: ${breadcrumbs.styling.linkColor || 'var(--wp-link-color)'};`);
    css.push(`  --breadcrumb-separator-color: ${breadcrumbs.styling.separatorColor || '#6c757d'};`);
    css.push(`  --breadcrumb-font-size: ${breadcrumbs.styling.fontSize || 14}px;`);
  }

  css.push('}');

  // Apply breadcrumb styles
  css.push('.ast-breadcrumbs, .breadcrumb {');
  css.push('  color: var(--breadcrumb-text-color);');
  css.push('  font-size: var(--breadcrumb-font-size);');
  css.push('}');

  css.push('.ast-breadcrumbs a, .breadcrumb a {');
  css.push('  color: var(--breadcrumb-link-color);');
  css.push('  text-decoration: none;');
  css.push('}');

  css.push('.ast-breadcrumbs .separator, .breadcrumb-separator {');
  css.push('  color: var(--breadcrumb-separator-color);');
  css.push('  margin: 0 8px;');
  css.push('}');

  return css;
}

function generateScrollToTopCSS(settings: AstraCustomizerSettings): string[] {
  const css: string[] = [];
  const { scrollToTop } = settings as any;

  if (!scrollToTop || !scrollToTop.enabled) return css;

  css.push(':root {');

  if (scrollToTop.styling) {
    css.push(`  --scroll-top-bg: ${scrollToTop.styling.backgroundColor || 'var(--wp-color-primary-500)'};`);
    css.push(`  --scroll-top-icon-color: ${scrollToTop.styling.iconColor || '#ffffff'};`);
    css.push(`  --scroll-top-size: ${scrollToTop.styling.size || 40}px;`);
    css.push(`  --scroll-top-border-radius: ${scrollToTop.styling.borderRadius || 4}px;`);
    css.push(`  --scroll-top-position-bottom: ${scrollToTop.position?.bottom || 30}px;`);
    css.push(`  --scroll-top-position-right: ${scrollToTop.position?.right || 30}px;`);
  }

  css.push('}');

  // Apply scroll to top styles
  css.push('.ast-scroll-to-top, .scroll-to-top, #scroll-to-top {');
  css.push('  background-color: var(--scroll-top-bg);');
  css.push('  color: var(--scroll-top-icon-color);');
  css.push('  width: var(--scroll-top-size);');
  css.push('  height: var(--scroll-top-size);');
  css.push('  border-radius: var(--scroll-top-border-radius);');
  css.push('  position: fixed;');
  css.push('  bottom: var(--scroll-top-position-bottom);');
  css.push('  right: var(--scroll-top-position-right);');
  css.push('  z-index: 999;');
  css.push('  display: flex;');
  css.push('  align-items: center;');
  css.push('  justify-content: center;');
  css.push('  cursor: pointer;');
  css.push('  transition: all 0.3s;');
  css.push('}');

  css.push('.ast-scroll-to-top:hover, .scroll-to-top:hover, #scroll-to-top:hover {');
  css.push('  opacity: 0.8;');
  css.push('  transform: translateY(-2px);');
  css.push('}');

  return css;
}