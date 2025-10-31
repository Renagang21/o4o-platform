import React from 'react';
import type {
  TemplatePreset,
  TemplateLayoutType,
  SlotConfig,
  BlockReference
} from '@o4o/types';

/**
 * Props for TemplateRenderer
 */
export interface TemplateRendererProps {
  preset: TemplatePreset;
  children?: React.ReactNode;
  content?: Record<string, any>;
  className?: string;
}

/**
 * Render blocks in a slot
 */
function renderSlot(
  slotConfig: SlotConfig | undefined,
  content: Record<string, any>
): React.ReactNode {
  if (!slotConfig || !slotConfig.blocks || slotConfig.blocks.length === 0) {
    return null;
  }

  const blocks = [...slotConfig.blocks].sort((a, b) => a.order - b.order);

  return (
    <div className="slot-content space-y-4">
      {blocks.map((block: BlockReference, index: number) => (
        <div key={`${block.blockName}-${index}`} className="block-wrapper">
          {/* Placeholder for block rendering */}
          {/* In a real implementation, this would use a block registry */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-sm text-gray-600">
              Block: {block.blockName}
              {block.presetId && ` (Preset: ${block.presetId})`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Get layout classes based on layout type
 */
function getLayoutClasses(layoutType: TemplateLayoutType): {
  container: string;
  main: string;
  sidebar: string;
} {
  switch (layoutType) {
    case '2-column-left':
      return {
        container: 'grid grid-cols-1 lg:grid-cols-4 gap-6',
        main: 'lg:col-span-3 order-2 lg:order-1',
        sidebar: 'lg:col-span-1 order-1 lg:order-2'
      };
    case '2-column-right':
      return {
        container: 'grid grid-cols-1 lg:grid-cols-4 gap-6',
        main: 'lg:col-span-3 order-1',
        sidebar: 'lg:col-span-1 order-2'
      };
    case '3-column':
      return {
        container: 'grid grid-cols-1 lg:grid-cols-12 gap-6',
        main: 'lg:col-span-8 order-2',
        sidebar: 'lg:col-span-2 order-1 lg:order-3'
      };
    case '1-column':
    default:
      return {
        container: 'max-w-4xl mx-auto',
        main: '',
        sidebar: ''
      };
  }
}

/**
 * Generate SEO metadata component
 */
function SEOMetaComponent({
  preset,
  content
}: {
  preset: TemplatePreset;
  content: Record<string, any>;
}): React.ReactElement {
  const { seoMeta } = preset.config;

  // Replace template variables in title
  const title = seoMeta.titleTemplate.replace(/{(\w+)}/g, (match, key) => {
    return content[key] || match;
  });

  // Get description from field or default
  const description = seoMeta.descriptionField
    ? content[seoMeta.descriptionField]
    : '';

  // Get OG image from field
  const ogImage = seoMeta.ogImageField ? content[seoMeta.ogImageField] : '';

  // Get keywords
  const keywords = [
    ...(seoMeta.keywords || []),
    ...(seoMeta.keywordsField && content[seoMeta.keywordsField]
      ? content[seoMeta.keywordsField].split(',').map((k: string) => k.trim())
      : [])
  ].join(', ');

  // Note: In a real implementation, this would use react-helmet-async
  // For now, we'll render meta tags as data attributes for testing
  return (
    <div
      className="seo-meta hidden"
      data-title={title}
      data-description={description}
      data-og-image={ogImage}
      data-keywords={keywords}
    />
  );
}

/**
 * Generate Schema.org markup
 */
function SchemaOrgComponent({
  preset,
  content
}: {
  preset: TemplatePreset;
  content: Record<string, any>;
}): React.ReactElement | null {
  if (!preset.config.schemaOrg) return null;

  const { type, fieldMapping } = preset.config.schemaOrg;

  // Build schema object from field mapping
  const schemaData: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': type
  };

  Object.entries(fieldMapping).forEach(([schemaKey, fieldKey]) => {
    if (content[fieldKey as string]) {
      schemaData[schemaKey] = content[fieldKey as string];
    }
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData, null, 2) }}
    />
  );
}

/**
 * TemplateRenderer Component
 *
 * Renders page templates based on TemplatePreset configuration
 */
export function TemplateRenderer({
  preset,
  children,
  content = {},
  className = ''
}: TemplateRendererProps): React.ReactElement {
  const { layout } = preset.config;
  const layoutClasses = getLayoutClasses(layout.type);

  return (
    <div className={`template-renderer ${className}`}>
      {/* SEO Meta Tags */}
      <SEOMetaComponent preset={preset} content={content} />

      {/* Schema.org Markup */}
      <SchemaOrgComponent preset={preset} content={content} />

      {/* Header Zone */}
      {layout.header && (
        <header className="template-header mb-6">
          {renderSlot(layout.header, content)}
        </header>
      )}

      {/* Main Content Area */}
      <div className={layoutClasses.container}>
        {/* Sidebar (Left) - for 2-column-left and 3-column */}
        {(layout.type === '2-column-left' || layout.type === '3-column') &&
          layout.sidebar && (
            <aside className={`template-sidebar ${layoutClasses.sidebar}`}>
              {renderSlot(layout.sidebar, content)}
            </aside>
          )}

        {/* Main Zone */}
        <main className={`template-main ${layoutClasses.main}`}>
          {layout.main && renderSlot(layout.main, content)}
          {children}
        </main>

        {/* Sidebar (Right) - for 2-column-right */}
        {layout.type === '2-column-right' && layout.sidebar && (
          <aside className={`template-sidebar ${layoutClasses.sidebar}`}>
            {renderSlot(layout.sidebar, content)}
          </aside>
        )}
      </div>

      {/* Footer Zone */}
      {layout.footer && (
        <footer className="template-footer mt-6">
          {renderSlot(layout.footer, content)}
        </footer>
      )}
    </div>
  );
}

/**
 * Simple Layout Wrapper
 * For use without full preset configuration
 */
export interface SimpleLayoutProps {
  layoutType: TemplateLayoutType;
  header?: React.ReactNode;
  main?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function SimpleLayout({
  layoutType,
  header,
  main,
  sidebar,
  footer,
  children,
  className = ''
}: SimpleLayoutProps): React.ReactElement {
  const layoutClasses = getLayoutClasses(layoutType);

  return (
    <div className={`simple-layout ${className}`}>
      {header && <header className="mb-6">{header}</header>}

      <div className={layoutClasses.container}>
        {(layoutType === '2-column-left' || layoutType === '3-column') && sidebar && (
          <aside className={layoutClasses.sidebar}>{sidebar}</aside>
        )}

        <main className={layoutClasses.main}>
          {main}
          {children}
        </main>

        {layoutType === '2-column-right' && sidebar && (
          <aside className={layoutClasses.sidebar}>{sidebar}</aside>
        )}
      </div>

      {footer && <footer className="mt-6">{footer}</footer>}
    </div>
  );
}
