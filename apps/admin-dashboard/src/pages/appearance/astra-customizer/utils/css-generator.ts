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
  
  // Add custom CSS
  if (settings.customCSS) {
    css.push(settings.customCSS);
  }
  
  return css.join('\n');
}

function generateColorVariables(settings: AstraCustomizerSettings): string[] {
  const vars: string[] = [];
  const { colors } = settings;
  
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
  
  // Body font
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
  
  // Container widths
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
  css.push(`  color: var(--ast-text-color);`);
  css.push(`  background-color: var(--ast-body-bg);`);
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
  css.push(`  color: var(--ast-link-color);`);
  css.push(`  text-decoration: none;`);
  css.push(`  transition: color 0.2s;`);
  css.push('}');
  css.push('a:hover {');
  css.push(`  color: var(--ast-link-hover-color);`);
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
  
  // CSS Variables for blog styling
  css.push(':root {');
  css.push(`  --blog-card-spacing: ${blog.archive.cardSpacing}px;`);
  css.push(`  --blog-card-bg: ${blog.archive.styling.backgroundColor};`);
  css.push(`  --blog-card-border: ${blog.archive.styling.borderColor};`);
  css.push(`  --blog-card-border-radius: ${blog.archive.styling.borderRadius}px;`);
  css.push(`  --blog-card-padding: ${blog.archive.styling.cardPadding}px;`);
  css.push(`  --blog-title-color: ${blog.archive.styling.titleColor};`);
  css.push(`  --blog-title-hover-color: ${blog.archive.styling.titleHoverColor};`);
  css.push(`  --blog-excerpt-color: ${blog.archive.styling.excerptColor};`);
  css.push(`  --blog-meta-text-color: ${blog.archive.meta.colors.text};`);
  css.push(`  --blog-meta-link-color: ${blog.archive.meta.colors.links};`);
  css.push(`  --blog-meta-icon-color: ${blog.archive.meta.colors.icons};`);
  css.push(`  --blog-title-size-desktop: ${blog.archive.styling.typography.titleSize.desktop}px;`);
  css.push(`  --blog-title-size-tablet: ${blog.archive.styling.typography.titleSize.tablet}px;`);
  css.push(`  --blog-title-size-mobile: ${blog.archive.styling.typography.titleSize.mobile}px;`);
  css.push(`  --blog-title-weight: ${blog.archive.styling.typography.titleWeight};`);
  css.push(`  --blog-excerpt-size-desktop: ${blog.archive.styling.typography.excerptSize.desktop}px;`);
  css.push(`  --blog-excerpt-size-tablet: ${blog.archive.styling.typography.excerptSize.tablet}px;`);
  css.push(`  --blog-excerpt-size-mobile: ${blog.archive.styling.typography.excerptSize.mobile}px;`);
  css.push(`  --blog-meta-size-desktop: ${blog.archive.styling.typography.metaSize.desktop}px;`);
  css.push(`  --blog-meta-size-tablet: ${blog.archive.styling.typography.metaSize.tablet}px;`);
  css.push(`  --blog-meta-size-mobile: ${blog.archive.styling.typography.metaSize.mobile}px;`);
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