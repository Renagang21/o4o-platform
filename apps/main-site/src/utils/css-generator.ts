/**
 * CSS Generator for Main Site
 * Generates CSS from customizer settings
 * Adapted from admin-dashboard css-generator
 */

import { CustomizerSettings } from '../hooks/useCustomizerSettings';

/**
 * Generate CSS from customizer settings
 */
export function generateCSS(settings: CustomizerSettings): string {
  const css: string[] = [];

  // Safety check
  if (!settings) {
    return '';
  }

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
  css.push(...generateBlogCSS(settings));
  css.push(...generateButtonCSS(settings));
  css.push(...generateBreadcrumbCSS(settings));
  css.push(...generateScrollToTopCSS(settings));

  // Add custom CSS if present
  if (settings.customCSS) {
    css.push(settings.customCSS);
  }

  return css.join('\n');
}

function generateColorVariables(settings: CustomizerSettings): string[] {
  const vars: string[] = [];
  const colors = (settings as any).colors;

  if (!colors) {
    return vars;
  }

  // Unified --wp-* variables
  if (colors.primaryColor) {
    vars.push(`  --wp-color-primary-500: ${colors.primaryColor};`);
    vars.push(`  --ast-primary-color: ${colors.primaryColor};`);
  }

  if (colors.secondaryColor) {
    vars.push(`  --wp-color-secondary-500: ${colors.secondaryColor};`);
    vars.push(`  --ast-secondary-color: ${colors.secondaryColor};`);
  }

  if (colors.textColor) {
    vars.push(`  --wp-text-primary: ${colors.textColor};`);
    vars.push(`  --ast-text-color: ${colors.textColor};`);
  }

  if (colors.linkColor) {
    const normal = typeof colors.linkColor === 'object' ? colors.linkColor.normal : colors.linkColor;
    const hover = typeof colors.linkColor === 'object' ? (colors.linkColor.hover || normal) : normal;
    vars.push(`  --wp-link-color: ${normal};`);
    vars.push(`  --wp-link-color-hover: ${hover};`);
    vars.push(`  --ast-link-color: ${normal};`);
    vars.push(`  --ast-link-hover-color: ${hover};`);
  }

  if (colors.borderColor) {
    vars.push(`  --wp-border-primary: ${colors.borderColor};`);
    vars.push(`  --ast-border-color: ${colors.borderColor};`);
  }

  if (colors.bodyBackground) {
    vars.push(`  --wp-bg-body: ${colors.bodyBackground};`);
    vars.push(`  --ast-body-bg: ${colors.bodyBackground};`);
  }

  if (colors.contentBackground) {
    vars.push(`  --wp-bg-content: ${colors.contentBackground};`);
    vars.push(`  --ast-content-bg: ${colors.contentBackground};`);
  }

  // Palette colors
  if (colors.palette && typeof colors.palette === 'object') {
    Object.entries(colors.palette).forEach(([key, value]) => {
      vars.push(`  --ast-palette-${key}: ${value};`);
    });
  }

  return vars;
}

function generateTypographyVariables(settings: CustomizerSettings): string[] {
  const vars: string[] = [];
  const typography = (settings as any).typography;

  if (!typography) {
    return vars;
  }

  // Body font
  if (typography.bodyFont) {
    const { fontFamily, fontSize, fontWeight, lineHeight, textTransform } = typography.bodyFont;

    if (fontFamily) {
      vars.push(`  --wp-font-body: ${fontFamily};`);
      vars.push(`  --ast-body-font-family: ${fontFamily};`);
    }

    if (fontSize) {
      if (typeof fontSize === 'object') {
        vars.push(`  --wp-font-size-body-desktop: ${fontSize.desktop || 16}px;`);
        vars.push(`  --wp-font-size-body-tablet: ${fontSize.tablet || 15}px;`);
        vars.push(`  --wp-font-size-body-mobile: ${fontSize.mobile || 14}px;`);
      } else {
        vars.push(`  --wp-font-size-body-desktop: ${fontSize}px;`);
      }
    }

    if (lineHeight) {
      if (typeof lineHeight === 'object') {
        vars.push(`  --wp-line-height-body-desktop: ${lineHeight.desktop || 1.6};`);
        vars.push(`  --wp-line-height-body-tablet: ${lineHeight.tablet || 1.6};`);
        vars.push(`  --wp-line-height-body-mobile: ${lineHeight.mobile || 1.6};`);
      }
    }

    if (fontWeight) {
      vars.push(`  --ast-body-font-weight: ${fontWeight};`);
    }

    if (textTransform) {
      vars.push(`  --ast-body-text-transform: ${textTransform};`);
    }
  }

  // Button font
  if (typography.button) {
    const { fontFamily, fontWeight, textTransform } = typography.button;
    if (fontFamily) vars.push(`  --ast-button-font-family: ${fontFamily};`);
    if (fontWeight) vars.push(`  --ast-button-font-weight: ${fontWeight};`);
    if (textTransform) vars.push(`  --ast-button-text-transform: ${textTransform};`);
  }

  return vars;
}

function generateSpacingVariables(settings: CustomizerSettings): string[] {
  const vars: string[] = [];
  const { container } = settings;

  if (!container) {
    return vars;
  }

  // Container width
  if (container.width) {
    vars.push(`  --wp-container-width-desktop: ${container.width.desktop}px;`);
    vars.push(`  --wp-container-width-tablet: ${container.width.tablet}px;`);
    vars.push(`  --wp-container-width-mobile: ${container.width.mobile}px;`);
    vars.push(`  --ast-container-width-desktop: ${container.width.desktop}px;`);
    vars.push(`  --ast-container-width-tablet: ${container.width.tablet}px;`);
    vars.push(`  --ast-container-width-mobile: ${container.width.mobile}px;`);
  }

  // Sidebar (if exists)
  const sidebar = (settings as any).sidebar;
  if (sidebar) {
    if (sidebar.width) {
      vars.push(`  --ast-sidebar-width-desktop: ${sidebar.width.desktop}%;`);
      vars.push(`  --ast-sidebar-width-tablet: ${sidebar.width.tablet}%;`);
      vars.push(`  --ast-sidebar-width-mobile: ${sidebar.width.mobile}%;`);
    }
    if (sidebar.gap) {
      vars.push(`  --ast-sidebar-gap: ${sidebar.gap.desktop || 20}px;`);
    }
  }

  return vars;
}

function generateResponsiveCSS(settings: CustomizerSettings): string[] {
  const css: string[] = [];
  const typography = (settings as any).typography;
  const colors = (settings as any).colors;

  if (!typography?.bodyFont) {
    return css;
  }

  const { bodyFont, headings } = typography;

  // Desktop styles (default)
  css.push('body {');
  if (bodyFont.fontFamily) css.push(`  font-family: ${bodyFont.fontFamily};`);
  if (bodyFont.fontSize?.desktop) css.push(`  font-size: ${bodyFont.fontSize.desktop}px;`);
  if (bodyFont.fontWeight) css.push(`  font-weight: ${bodyFont.fontWeight};`);
  if (bodyFont.lineHeight?.desktop) css.push(`  line-height: ${bodyFont.lineHeight.desktop};`);
  if (bodyFont.letterSpacing?.desktop) css.push(`  letter-spacing: ${bodyFont.letterSpacing.desktop}px;`);
  if (colors?.textColor) css.push(`  color: var(--wp-text-primary);`);
  if (colors?.bodyBackground) css.push(`  background-color: var(--wp-bg-body);`);
  css.push('}');

  // Headings
  if (headings) {
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
      const heading = headings[tag];
      if (heading) {
        css.push(`${tag} {`);
        if (heading.fontFamily) css.push(`  font-family: ${heading.fontFamily};`);
        if (heading.fontSize?.desktop) css.push(`  font-size: ${heading.fontSize.desktop}px;`);
        if (heading.fontWeight) css.push(`  font-weight: ${heading.fontWeight};`);
        if (heading.lineHeight?.desktop) css.push(`  line-height: ${heading.lineHeight.desktop};`);
        if (heading.letterSpacing?.desktop) css.push(`  letter-spacing: ${heading.letterSpacing.desktop}px;`);
        if (heading.textTransform) css.push(`  text-transform: ${heading.textTransform};`);
        css.push('}');
      }
    });
  }

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
  if (bodyFont.fontSize?.tablet || headings) {
    css.push('@media (max-width: 992px) {');
    css.push('  body {');
    if (bodyFont.fontSize?.tablet) css.push(`    font-size: ${bodyFont.fontSize.tablet}px;`);
    if (bodyFont.lineHeight?.tablet) css.push(`    line-height: ${bodyFont.lineHeight.tablet};`);
    css.push('  }');

    if (headings) {
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        const heading = headings[tag];
        if (heading?.fontSize?.tablet) {
          css.push(`  ${tag} {`);
          css.push(`    font-size: ${heading.fontSize.tablet}px;`);
          if (heading.lineHeight?.tablet) css.push(`    line-height: ${heading.lineHeight.tablet};`);
          css.push('  }');
        }
      });
    }
    css.push('}');
  }

  // Mobile styles
  if (bodyFont.fontSize?.mobile || headings) {
    css.push('@media (max-width: 576px) {');
    css.push('  body {');
    if (bodyFont.fontSize?.mobile) css.push(`    font-size: ${bodyFont.fontSize.mobile}px;`);
    if (bodyFont.lineHeight?.mobile) css.push(`    line-height: ${bodyFont.lineHeight.mobile};`);
    css.push('  }');

    if (headings) {
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        const heading = headings[tag];
        if (heading?.fontSize?.mobile) {
          css.push(`  ${tag} {`);
          css.push(`    font-size: ${heading.fontSize.mobile}px;`);
          if (heading.lineHeight?.mobile) css.push(`    line-height: ${heading.lineHeight.mobile};`);
          css.push('  }');
        }
      });
    }
    css.push('}');
  }

  return css;
}

function generateHeaderCSS(settings: CustomizerSettings): string[] {
  const css: string[] = [];
  const header = (settings as any).header;
  const siteIdentity = settings.siteIdentity;

  if (!header && !siteIdentity) {
    return css;
  }

  // Header background and height
  if (header?.primary) {
    css.push('.ast-header {');
    if (header.primary.background) css.push(`  background: ${header.primary.background};`);
    if (header.primary.height?.desktop) css.push(`  height: ${header.primary.height.desktop}px;`);
    if (header.sticky) {
      css.push('  position: sticky;');
      css.push('  top: 0;');
      css.push('  z-index: 999;');
    }
    css.push('}');

    // Menu alignment
    if (header.primary.menuAlignment) {
      css.push('.ast-primary-menu {');
      css.push(`  text-align: ${header.primary.menuAlignment};`);
      css.push('}');
    }
  }

  // Site title
  if (siteIdentity?.siteTitle?.display) {
    css.push('.site-title {');
    if ((siteIdentity.siteTitle as any).color?.normal) {
      css.push(`  color: ${(siteIdentity.siteTitle as any).color.normal};`);
    }
    if ((siteIdentity.siteTitle as any).typography) {
      const typo = (siteIdentity.siteTitle as any).typography;
      if (typo.fontFamily) css.push(`  font-family: ${typo.fontFamily};`);
      if (typo.fontSize?.desktop) css.push(`  font-size: ${typo.fontSize.desktop}px;`);
      if (typo.fontWeight) css.push(`  font-weight: ${typo.fontWeight};`);
    }
    css.push('}');

    if ((siteIdentity.siteTitle as any).color?.hover) {
      css.push('.site-title:hover {');
      css.push(`  color: ${(siteIdentity.siteTitle as any).color.hover};`);
      css.push('}');
    }
  }

  // Logo
  if (siteIdentity?.logo?.desktop) {
    css.push('.site-logo img {');
    if (siteIdentity.logo.width?.desktop) {
      css.push(`  max-width: ${siteIdentity.logo.width.desktop}px;`);
    }
    css.push('}');
  }

  return css;
}

function generateFooterCSS(settings: CustomizerSettings): string[] {
  const css: string[] = [];
  const footer = (settings as any).footer;

  if (!footer) {
    return css;
  }

  // Footer widgets
  if (footer.widgets?.enabled) {
    css.push('.ast-footer-widgets {');
    if (footer.widgets.background) css.push(`  background: ${footer.widgets.background};`);
    if (footer.widgets.textColor) css.push(`  color: ${footer.widgets.textColor};`);
    if (footer.widgets.padding?.desktop) {
      css.push(`  padding-top: ${footer.widgets.padding.desktop.top || 40}px;`);
      css.push(`  padding-bottom: ${footer.widgets.padding.desktop.bottom || 40}px;`);
    }
    css.push('}');

    if (footer.widgets.linkColor) {
      css.push('.ast-footer-widgets a {');
      css.push(`  color: ${footer.widgets.linkColor.normal};`);
      css.push('}');
      css.push('.ast-footer-widgets a:hover {');
      css.push(`  color: ${footer.widgets.linkColor.hover || footer.widgets.linkColor.normal};`);
      css.push('}');
    }

    if (footer.widgets.columns?.desktop) {
      css.push('.ast-footer-widget-area {');
      css.push('  display: grid;');
      css.push(`  grid-template-columns: repeat(${footer.widgets.columns.desktop}, 1fr);`);
      css.push('  gap: 30px;');
      css.push('}');
    }
  }

  // Bottom bar
  if (footer.bottomBar?.enabled) {
    css.push('.ast-footer-bottom {');
    if (footer.bottomBar.background) css.push(`  background: ${footer.bottomBar.background};`);
    if (footer.bottomBar.textColor) css.push(`  color: ${footer.bottomBar.textColor};`);
    if (footer.bottomBar.padding?.desktop) {
      css.push(`  padding-top: ${footer.bottomBar.padding.desktop.top || 20}px;`);
      css.push(`  padding-bottom: ${footer.bottomBar.padding.desktop.bottom || 20}px;`);
    }
    css.push('}');

    if (footer.bottomBar.linkColor) {
      css.push('.ast-footer-bottom a {');
      css.push(`  color: ${footer.bottomBar.linkColor.normal};`);
      css.push('}');
      css.push('.ast-footer-bottom a:hover {');
      css.push(`  color: ${footer.bottomBar.linkColor.hover || footer.bottomBar.linkColor.normal};`);
      css.push('}');
    }
  }

  return css;
}

function generateContainerCSS(settings: CustomizerSettings): string[] {
  const css: string[] = [];
  const { container } = settings;

  if (!container) {
    return css;
  }

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

  if (container.padding?.desktop) {
    css.push(`  padding-left: ${container.padding.desktop.left}px;`);
    css.push(`  padding-right: ${container.padding.desktop.right}px;`);
  }
  css.push('}');

  // Responsive container
  css.push('@media (max-width: 992px) {');
  css.push('  .ast-container {');
  css.push(`    max-width: ${container.width.tablet}px;`);
  if (container.padding?.tablet) {
    css.push(`    padding-left: ${container.padding.tablet.left}px;`);
    css.push(`    padding-right: ${container.padding.tablet.right}px;`);
  }
  css.push('  }');
  css.push('}');

  css.push('@media (max-width: 576px) {');
  css.push('  .ast-container {');
  css.push(`    max-width: ${container.width.mobile}px;`);
  if (container.padding?.mobile) {
    css.push(`    padding-left: ${container.padding.mobile.left}px;`);
    css.push(`    padding-right: ${container.padding.mobile.right}px;`);
  }
  css.push('  }');
  css.push('}');

  return css;
}

/**
 * Generate blog-specific CSS
 */
function generateBlogCSS(settings: CustomizerSettings): string[] {
  const css: string[] = [];
  const blog = (settings as any).blog;

  // Safety check - if blog settings are incomplete, return empty CSS
  if (!blog?.archive?.styling) {
    return css;
  }

  const { archive } = blog;
  const { styling, meta } = archive;

  // CSS Variables for blog styling
  css.push('/* Blog Styling */');
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

    // Responsive columns
    const columns = archive.columns || { desktop: 3, tablet: 2, mobile: 1 };
    css.push('@media (min-width: 992px) {');
    css.push('  .blog-archive-grid .posts-container {');
    css.push(`    grid-template-columns: repeat(${columns.desktop}, 1fr);`);
    css.push('  }');
    css.push('}');
    css.push('@media (min-width: 576px) and (max-width: 991px) {');
    css.push('  .blog-archive-grid .posts-container {');
    css.push(`    grid-template-columns: repeat(${columns.tablet}, 1fr);`);
    css.push('  }');
    css.push('}');
    css.push('@media (max-width: 575px) {');
    css.push('  .blog-archive-grid .posts-container {');
    css.push(`    grid-template-columns: repeat(${columns.mobile}, 1fr);`);
    css.push('  }');
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

  // Blog Card Styles
  css.push('.blog-card {');
  css.push('  background: var(--blog-card-bg);');
  css.push('  border: 1px solid var(--blog-card-border);');
  css.push('  border-radius: var(--blog-card-border-radius);');
  css.push('  padding: var(--blog-card-padding);');
  css.push('  transition: transform 0.2s, box-shadow 0.2s;');
  css.push('}');

  // Card style variations
  if (archive.cardStyle === 'shadow') {
    css.push('.blog-card {');
    css.push('  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);');
    css.push('}');
    css.push('.blog-card:hover {');
    css.push('  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);');
    css.push('  transform: translateY(-2px);');
    css.push('}');
  }

  // Blog title
  css.push('.blog-card-title {');
  css.push('  color: var(--blog-title-color);');
  css.push('  font-size: var(--blog-title-size-desktop);');
  css.push('  font-weight: var(--blog-title-weight);');
  css.push('  margin-bottom: 12px;');
  css.push('}');
  css.push('.blog-card-title:hover {');
  css.push('  color: var(--blog-title-hover-color);');
  css.push('}');

  // Blog excerpt
  css.push('.blog-card-excerpt {');
  css.push('  color: var(--blog-excerpt-color);');
  css.push('  font-size: var(--blog-excerpt-size-desktop);');
  css.push('  line-height: 1.6;');
  css.push('}');

  // Blog meta
  css.push('.blog-card-meta {');
  css.push('  display: flex;');
  css.push('  flex-wrap: wrap;');
  css.push('  gap: 12px;');
  css.push('  color: var(--blog-meta-text-color);');
  css.push('  font-size: var(--blog-meta-size-desktop);');
  css.push('  margin-top: 12px;');
  css.push('}');
  css.push('.blog-card-meta a {');
  css.push('  color: var(--blog-meta-link-color);');
  css.push('}');

  // Responsive typography
  css.push('@media (max-width: 992px) {');
  css.push('  .blog-card-title { font-size: var(--blog-title-size-tablet); }');
  css.push('  .blog-card-excerpt { font-size: var(--blog-excerpt-size-tablet); }');
  css.push('  .blog-card-meta { font-size: var(--blog-meta-size-tablet); }');
  css.push('}');
  css.push('@media (max-width: 576px) {');
  css.push('  .blog-card-title { font-size: var(--blog-title-size-mobile); }');
  css.push('  .blog-card-excerpt { font-size: var(--blog-excerpt-size-mobile); }');
  css.push('  .blog-card-meta { font-size: var(--blog-meta-size-mobile); }');
  css.push('}');

  return css;
}

function generateButtonCSS(settings: CustomizerSettings): string[] {
  const css: string[] = [];
  const buttons = (settings as any).buttons;

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

  // Apply button styles using CSS variables
  css.push('.wp-element-button, .ast-button, button[type="submit"], .btn-primary {');
  css.push('  background-color: var(--button-primary-bg, var(--wp-color-primary-500));');
  css.push('  color: var(--button-primary-text, #ffffff);');
  css.push('  border-radius: var(--button-primary-border-radius, 4px);');
  css.push('  padding: var(--button-primary-padding-v, 12px) var(--button-primary-padding-h, 24px);');
  css.push('  border: none;');
  css.push('  transition: all 0.3s;');
  css.push('}');

  css.push('.wp-element-button:hover, .ast-button:hover, button[type="submit"]:hover, .btn-primary:hover {');
  css.push('  background-color: var(--button-primary-bg-hover, var(--button-primary-bg, var(--wp-color-primary-500)));');
  css.push('  opacity: 0.9;');
  css.push('}');

  // Link styling to use primary color
  css.push('a {');
  css.push('  color: var(--wp-link-color, var(--wp-color-primary-500));');
  css.push('}');

  css.push('a:hover {');
  css.push('  color: var(--wp-link-color-hover, var(--wp-link-color, var(--wp-color-primary-500)));');
  css.push('}');

  return css;
}

function generateBreadcrumbCSS(settings: CustomizerSettings): string[] {
  const css: string[] = [];
  const breadcrumbs = (settings as any).breadcrumbs;

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
  css.push('.ast-breadcrumbs, .breadcrumb, nav[aria-label="breadcrumb"] {');
  css.push('  color: var(--breadcrumb-text-color, #6c757d);');
  css.push('  font-size: var(--breadcrumb-font-size, 14px);');
  css.push('}');

  css.push('.ast-breadcrumbs a, .breadcrumb a, nav[aria-label="breadcrumb"] a {');
  css.push('  color: var(--breadcrumb-link-color, var(--wp-link-color));');
  css.push('  text-decoration: none;');
  css.push('}');

  css.push('.ast-breadcrumbs .separator, .breadcrumb-separator {');
  css.push('  color: var(--breadcrumb-separator-color, #6c757d);');
  css.push('  margin: 0 8px;');
  css.push('}');

  return css;
}

function generateScrollToTopCSS(settings: CustomizerSettings): string[] {
  const css: string[] = [];
  const scrollToTop = (settings as any).scrollToTop;

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
  css.push('  background-color: var(--scroll-top-bg, var(--wp-color-primary-500));');
  css.push('  color: var(--scroll-top-icon-color, #ffffff);');
  css.push('  width: var(--scroll-top-size, 40px);');
  css.push('  height: var(--scroll-top-size, 40px);');
  css.push('  border-radius: var(--scroll-top-border-radius, 4px);');
  css.push('  position: fixed;');
  css.push('  bottom: var(--scroll-top-position-bottom, 30px);');
  css.push('  right: var(--scroll-top-position-right, 30px);');
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
