import { FC, useMemo } from 'react';
import { useTemplateParts, TemplatePartBlock } from '../hooks/useTemplateParts';
import SiteHeader from './blocks/SiteHeader';
import SiteFooter from './blocks/SiteFooter';
import Navigation from './blocks/Navigation';
import SiteLogo from './blocks/SiteLogo';
import SiteTitle from './blocks/SiteTitle';
import SiteTagline from './blocks/SiteTagline';
import SocialLinks from './blocks/SocialLinks';
import SearchBlock from './blocks/SearchBlock';
import Group from './blocks/Group';
import Columns from './blocks/Columns';
import Column from './blocks/Column';

// Map block types to components
const blockComponents: Record<string, FC<any>> = {
  'core/site-logo': SiteLogo,
  'core/site-title': SiteTitle,
  'core/site-tagline': SiteTagline,
  'core/navigation': Navigation,
  'core/search': SearchBlock,
  'core/social-links': SocialLinks,
  'core/paragraph': ({ data }: any) => (
    <p 
      className={data.className}
      style={{ 
        color: data.textColor,
        textAlign: data.align 
      }}
      dangerouslySetInnerHTML={{ __html: data.content || '' }}
    />
  ),
  'core/heading': ({ data }: any) => {
    const Tag = `h${data.level || 2}` as keyof JSX.IntrinsicElements;
    return (
      <Tag 
        className={data.className}
        style={{ color: data.textColor }}
        dangerouslySetInnerHTML={{ __html: data.content || '' }}
      />
    );
  },
  'o4o/group': Group,
  'o4o/columns': Columns,
  'o4o/column': Column,
};

interface TemplatePartRendererProps {
  area: 'header' | 'footer' | 'sidebar' | 'general';
  context?: {
    pageId?: string;
    postType?: string;
    categories?: string[];
    userRole?: string;
  };
  fallback?: React.ReactNode;
}

const TemplatePartRenderer: FC<TemplatePartRendererProps> = ({
  area,
  context,
  fallback
}) => {
  const { templateParts, loading, error } = useTemplateParts({ area, context });

  // Debug logging for browser testing
  useMemo(() => {
    console.info('🎨 TemplatePartRenderer initialized:', {
      area,
      context,
      has_fallback: !!fallback,
      loading,
      error,
      template_parts_count: Array.isArray(templateParts) ? templateParts.length : 0
    });
  }, [area, context, fallback, loading, error, templateParts]);

  // Render blocks recursively
  const renderBlock = (block: TemplatePartBlock): React.ReactNode => {
    const BlockComponent = blockComponents[block.type];
    
    if (!BlockComponent) {
      console.warn('🧩 Unknown block type:', {
        type: block.type,
        id: block.id,
        available_types: Object.keys(blockComponents),
        block_data: block.data
      });
      return null;
    }

    // Filter out React reserved props and rename ref to menuRef for Navigation
    const { ref, ...safeData } = block.data || {};
    const { ref: attrRef, ...safeAttributes } = block.attributes || {};
    
    const blockProps = {
      ...safeData,
      ...safeAttributes,
      key: block.id,
      id: block.id,
      // Convert ref to menuRef for Navigation component
      ...(block.type === 'core/navigation' && (ref || attrRef) ? { menuRef: ref || attrRef } : {})
    };

    // Handle blocks with inner blocks
    if (block.innerBlocks && block.innerBlocks.length > 0) {
      return (
        <BlockComponent {...blockProps}>
          {block.innerBlocks.map(innerBlock => renderBlock(innerBlock))}
        </BlockComponent>
      );
    }

    return <BlockComponent {...blockProps} data={block.data} />;
  };

  // Render template part with its settings
  const renderTemplatePart = (templatePart: any) => {
    const { settings = {}, content } = templatePart;
    
    // Build container styles
    const containerStyles: React.CSSProperties = {
      backgroundColor: settings.backgroundColor,
      color: settings.textColor,
      paddingTop: settings.padding?.top,
      paddingBottom: settings.padding?.bottom,
      paddingLeft: settings.padding?.left,
      paddingRight: settings.padding?.right,
    };

    // Container width classes
    const widthClasses = {
      full: 'w-full',
      wide: 'max-w-7xl mx-auto',
      narrow: 'max-w-4xl mx-auto'
    };

    const containerClass = widthClasses[settings.containerWidth || 'wide'];

    return (
      <div 
        key={templatePart.id}
        className={`template-part template-part-${area}`}
        style={containerStyles}
      >
        {settings.customCss && (
          <style dangerouslySetInnerHTML={{ __html: settings.customCss }} />
        )}
        <div className={containerClass}>
          {Array.isArray(content) ? content.map((block: TemplatePartBlock) => renderBlock(block)) : null}
        </div>
      </div>
    );
  };

  // Show loading state
  if (loading) {
    if (area === 'header') {
      return <div className="h-16 bg-gray-100 animate-pulse" />;
    }
    if (area === 'footer') {
      return <div className="h-64 bg-gray-100 animate-pulse" />;
    }
    return <div className="h-32 bg-gray-100 animate-pulse" />;
  }

  // Show error or fallback
  if (error || templateParts.length === 0) {
    console.warn('🔄 Using fallback for template parts:', {
      area,
      error,
      template_parts_count: templateParts.length,
      fallback_type: fallback ? 'custom' : 'default',
      will_render: area === 'header' ? 'SiteHeader' : area === 'footer' ? 'SiteFooter' : 'null'
    });
    
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Default fallbacks
    if (area === 'header') {
      return <SiteHeader />;
    }
    if (area === 'footer') {
      return <SiteFooter />;
    }
    
    return null;
  }

  // Render all active template parts for the area
  console.info('✨ Rendering template parts:', {
    area,
    parts_to_render: templateParts.map(p => ({ id: p.id, name: p.name, content_blocks: p.content?.length || 0 }))
  });
  
  return (
    <>
      {Array.isArray(templateParts) ? templateParts.map(templatePart => renderTemplatePart(templatePart)) : null}
    </>
  );
};

export default TemplatePartRenderer;