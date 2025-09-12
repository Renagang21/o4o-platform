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
  
  // Archive layout
  css.push('.ast-blog-archive {');
  css.push('  display: grid;');
  css.push(`  grid-template-columns: repeat(${blog.archive.columns.desktop}, 1fr);`);
  css.push('  gap: 30px;');
  css.push('}');
  
  css.push('@media (max-width: 992px) {');
  css.push('  .ast-blog-archive {');
  css.push(`    grid-template-columns: repeat(${blog.archive.columns.tablet}, 1fr);`);
  css.push('  }');
  css.push('}');
  
  css.push('@media (max-width: 576px) {');
  css.push('  .ast-blog-archive {');
  css.push(`    grid-template-columns: repeat(${blog.archive.columns.mobile}, 1fr);`);
  css.push('  }');
  css.push('}');
  
  // Single post
  if (blog.single.layout === 'narrow') {
    css.push('.ast-single-post {');
    css.push('  max-width: 720px;');
    css.push('  margin: 0 auto;');
    css.push('}');
  }
  
  // Excerpt
  css.push('.ast-excerpt {');
  css.push('  display: -webkit-box;');
  css.push(`  -webkit-line-clamp: ${Math.floor(blog.archive.excerpt.length / 50)};`);
  css.push('  -webkit-box-orient: vertical;');
  css.push('  overflow: hidden;');
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