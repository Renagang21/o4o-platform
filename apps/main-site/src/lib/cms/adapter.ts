/**
 * CMS V2 to ViewRenderer Adapter
 *
 * Converts CMS V2 schema (version 2.0) to ViewRenderer ViewSchema format
 * Handles component mapping, props transformation, and layout configuration
 */

import type { ViewSchema, ViewComponentSchema } from '@/view/types';
import type { CMSView, CMSViewSchema, CMSComponent, CMSPage } from './client';

/**
 * Convert CMS View to ViewRenderer ViewSchema
 */
export function adaptCMSViewToViewSchema(cmsView: CMSView, page?: CMSPage): ViewSchema {
  const schema = cmsView.schema;

  // Validate version
  if (schema.version !== '2.0') {
    console.warn(`CMS View ${cmsView.id} uses unsupported version: ${schema.version}`);
  }

  return {
    viewId: cmsView.slug,
    meta: {
      ...cmsView.metadata,
      cmsViewId: cmsView.id,
      cmsViewName: cmsView.name,
      pageContent: page?.content,
      pageSEO: page?.seo,
    },
    layout: {
      type: extractLayoutType(schema),
      props: extractLayoutProps(schema),
    },
    components: adaptComponents(schema.components, page?.content),
  };
}

/**
 * Extract layout type from CMS schema
 * Falls back to DefaultLayout if not specified
 */
function extractLayoutType(schema: CMSViewSchema): string {
  // CMS can specify layout in multiple ways
  if (schema.type === 'layout') {
    // If the view itself is a layout
    return 'CMSCustomLayout';
  }

  // Check for explicit layout in styles or metadata
  if (schema.styles?.theme) {
    return `${schema.styles.theme}Layout`;
  }

  // Default layout
  return 'DefaultLayout';
}

/**
 * Extract layout props from CMS schema
 */
function extractLayoutProps(schema: CMSViewSchema): Record<string, any> {
  const props: Record<string, any> = {};

  // Add custom CSS if present
  if (schema.styles?.customCSS) {
    props.customCSS = schema.styles.customCSS;
  }

  // Add CSS variables
  if (schema.styles?.variables) {
    props.cssVariables = schema.styles.variables;
  }

  // Add SEO metadata
  if (schema.seo) {
    props.seo = schema.seo;
  }

  return props;
}

/**
 * Adapt CMS components to ViewRenderer components
 */
function adaptComponents(
  cmsComponents: CMSComponent[],
  pageContent?: Record<string, any>
): ViewComponentSchema[] {
  return cmsComponents.map((component) => adaptComponent(component, pageContent));
}

/**
 * Adapt a single CMS component to ViewRenderer component
 */
function adaptComponent(
  cmsComponent: CMSComponent,
  pageContent?: Record<string, any>
): ViewComponentSchema {
  const adaptedProps = adaptProps(cmsComponent.props, pageContent);

  return {
    type: cmsComponent.type,
    props: adaptedProps,
    // TODO: Handle if/loop conditions if CMS supports them
  };
}

/**
 * Adapt component props, resolving bindings and placeholders
 */
function adaptProps(
  props: Record<string, any>,
  pageContent?: Record<string, any>
): Record<string, any> {
  const adapted: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    adapted[key] = resolvePropValue(value, pageContent);
  }

  return adapted;
}

/**
 * Resolve a prop value, handling bindings and placeholders
 *
 * Supports:
 * - {{binding:page.fieldName}} → pageContent.fieldName
 * - {{binding:cpt.typeName.list}} → fetch from CMS API
 * - Regular values → pass through
 */
function resolvePropValue(value: any, pageContent?: Record<string, any>): any {
  // Handle string values with bindings
  if (typeof value === 'string') {
    // Check for page content binding: {{binding:page.fieldName}}
    const pageBindingMatch = value.match(/\{\{binding:page\.(\w+)\}\}/);
    if (pageBindingMatch && pageContent) {
      const fieldName = pageBindingMatch[1];
      return pageContent[fieldName] || value;
    }

    // Check for CPT binding: {{binding:cpt.typeName.action}}
    const cptBindingMatch = value.match(/\{\{binding:cpt\.(\w+)\.(\w+)\}\}/);
    if (cptBindingMatch) {
      const [, typeName, action] = cptBindingMatch;
      // Return fetch config for ViewRenderer's useFetch hook
      return {
        fetch: {
          queryKey: ['cpt', typeName, action],
          url: `/api/v1/cms/public/cpt/${typeName}/${action}`,
          method: 'GET',
        },
      };
    }

    // No binding, return as-is
    return value;
  }

  // Handle array values
  if (Array.isArray(value)) {
    return value.map((item) => resolvePropValue(item, pageContent));
  }

  // Handle object values
  if (typeof value === 'object' && value !== null) {
    const resolved: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      resolved[k] = resolvePropValue(v, pageContent);
    }
    return resolved;
  }

  // Primitive values
  return value;
}

/**
 * Helper: Check if a CMS View is compatible with ViewRenderer
 */
export function isViewRendererCompatible(cmsView: CMSView): boolean {
  const schema = cmsView.schema;

  if (schema.version !== '2.0') {
    return false;
  }

  if (!Array.isArray(schema.components) || schema.components.length === 0) {
    return false;
  }

  // Check if all components have required fields
  for (const component of schema.components) {
    if (!component.id || !component.type) {
      return false;
    }
  }

  return true;
}

/**
 * Helper: Extract page title for SEO
 */
export function extractPageTitle(page: CMSPage, cmsView: CMSView): string {
  // Priority: page.seo.title > page.title > view.name
  return page.seo?.title || page.title || cmsView.name;
}

/**
 * Helper: Extract page description for SEO
 */
export function extractPageDescription(page: CMSPage, cmsView: CMSView): string | undefined {
  return page.seo?.description || cmsView.description;
}

/**
 * Helper: Generate meta tags from page SEO
 */
export function generateMetaTags(page: CMSPage): Array<{ name: string; content: string }> {
  const metaTags: Array<{ name: string; content: string }> = [];

  if (page.seo) {
    if (page.seo.description) {
      metaTags.push({ name: 'description', content: page.seo.description });
    }

    if (page.seo.keywords && page.seo.keywords.length > 0) {
      metaTags.push({ name: 'keywords', content: page.seo.keywords.join(', ') });
    }

    if (page.seo.ogImage) {
      metaTags.push({ name: 'og:image', content: page.seo.ogImage });
    }

    if (page.seo.noIndex) {
      metaTags.push({ name: 'robots', content: 'noindex, nofollow' });
    }
  }

  return metaTags;
}
