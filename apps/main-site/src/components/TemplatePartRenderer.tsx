import { FC } from 'react';
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

  // Note: removed a no-op useMemo to satisfy lint rules

  // Render blocks recursively
  const renderBlock = (block: TemplatePartBlock, menuData?: any[]): React.ReactNode => {
    const BlockComponent = blockComponents[block.type];
    
    if (!BlockComponent) {
      // Unknown block type - skip rendering
      return null;
    }

    // Filter out React reserved props and rename ref to menuRef for Navigation
    const { ref, ...safeData } = block.data || {};
    const { ref: attrRef, ...safeAttributes } = block.attributes || {};
    
    let blockProps = {
      ...safeData,
      ...safeAttributes,
      key: block.id,
      id: block.id,
      // Convert ref to menuRef for Navigation component
      ...(block.type === 'core/navigation' && (ref || attrRef) ? { menuRef: ref || attrRef } : {})
    };

    // Add specific props based on block type
    if (block.type === 'core/site-logo') {
      blockProps = {
        ...blockProps,
        logoUrl: block.data?.logoUrl,
        width: block.data?.width,
        isLink: block.data?.isLink,
        linkTarget: block.data?.linkTarget,
        data: block.data
      };
    } else if (block.type === 'core/navigation') {
      blockProps = {
        ...blockProps,
        menuRef: block.data?.menuRef || ref || attrRef,
        orientation: block.data?.orientation,
        showSubmenuIcon: block.data?.showSubmenuIcon,
        menuItems: menuData || [],
        data: block.data
      };
    }

    // Handle blocks with inner blocks
    if (block.innerBlocks && block.innerBlocks.length > 0) {
      return (
        <BlockComponent {...blockProps}>
          {block.innerBlocks.map(innerBlock => renderBlock(innerBlock, menuData))}
        </BlockComponent>
      );
    }

    return <BlockComponent {...blockProps} data={block.data} />;
  };

  // Render template part with its settings
  const renderTemplatePart = (templatePart: any) => {
    const { settings = {}, content } = templatePart;
    
    // Extract menu data from the template part blocks for navigation
    const menuData = extractMenuDataFromBlocks(content);
    
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
          {Array.isArray(content) ? content.map((block: TemplatePartBlock) => renderBlock(block, menuData)) : null}
        </div>
      </div>
    );
  };

  // Extract menu data from blocks (could be enhanced to fetch from API based on menuRef)
  const extractMenuDataFromBlocks = (blocks: TemplatePartBlock[]): any[] => {
    // For now, return default menu items
    // In the future, this could fetch menu data based on menuRef found in navigation blocks
    return [
      { id: '1', title: '홈', url: '/', target: '_self' },
      { id: '2', title: '로그인', url: '/login', target: '_self' },
      { id: '3', title: '쇼핑', url: '/shop', target: '_self' },
      { id: '4', title: '블로그', url: '/posts', target: '_self' }
    ];
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

  // Show error state
  if (error) {
    // If there's an error fetching template parts, use fallback
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Only show default fallbacks if explicitly configured or error occurred
    // Don't show anything if template parts are intentionally empty
    return null;
  }
  
  // If no template parts configured, don't show anything
  if (templateParts.length === 0) {
    return null;
  }

  // Render all active template parts for the area
  
  return (
    <>
      {Array.isArray(templateParts) ? templateParts.map(templatePart => renderTemplatePart(templatePart)) : null}
    </>
  );
};

export default TemplatePartRenderer;
