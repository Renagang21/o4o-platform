import { FC } from 'react';
import { useTemplateParts, TemplatePartBlock } from '../hooks/useTemplateParts';
import SiteHeader from './blocks/SiteHeader';
import StickyHeader from './common/StickyHeader';
import { useStickyHeaderSettings } from '../hooks/useStickyHeaderSettings';
import ResponsiveHeader from './common/ResponsiveHeader';
import { useMobileHeaderSettings } from '../hooks/useMobileHeaderSettings';
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
import { AccountModule } from './blocks/AccountModule';
import { CartModule } from './blocks/CartModule';
import RoleSwitcher from './blocks/RoleSwitcher';
import Button from './blocks/Button';
import ConditionalBlock from './blocks/ConditionalBlock';
import { TextWidget } from './blocks/footer/TextWidget';
import { HTMLWidget } from './blocks/footer/HTMLWidget';
import { MenuWidget } from './blocks/footer/MenuWidget';
import { SocialWidget } from './blocks/footer/SocialWidget';
import { ContactWidget } from './blocks/footer/ContactWidget';
import { CopyrightWidget } from './blocks/footer/CopyrightWidget';
import { RecentPostsWidget } from './blocks/footer/RecentPostsWidget';
import { NewsletterWidget } from './blocks/footer/NewsletterWidget';
import HTMLBlock from './blocks/HTMLBlock';
import WidgetAreaBlock from './blocks/WidgetAreaBlock';
import './blocks/footer/FooterWidgets.css';

// Map block types to components
// Note: Some blocks use o4o/ namespace in DB but are rendered by core/ components
const blockComponents: Record<string, FC<any>> = {
  'core/site-logo': SiteLogo,
  'o4o/site-logo': SiteLogo, // Alias for DB compatibility
  'core/site-title': SiteTitle,
  'core/site-tagline': SiteTagline,
  'core/navigation': Navigation,
  'o4o/navigation': Navigation, // Alias for DB compatibility
  'core/search': SearchBlock,
  'core/social-links': SocialLinks, // Backend converter uses core/ namespace
  'o4o/social-links': SocialLinks,
  'o4o/account-menu': AccountModule,
  'o4o/cart-icon': CartModule,
  'o4o/role-switcher': RoleSwitcher,
  'o4o/button': Button,
  'o4o/conditional': ConditionalBlock,
  'o4o/html': HTMLBlock, // HTML block for headers/general areas
  'o4o/text-widget': TextWidget,
  'o4o/html-widget': HTMLWidget, // HTML widget for footers
  'core/widget-area': WidgetAreaBlock,
  'o4o/menu-widget': MenuWidget,
  'o4o/social-widget': SocialWidget,
  'o4o/contact-widget': ContactWidget,
  'o4o/copyright-widget': CopyrightWidget,
  'o4o/recent-posts-widget': RecentPostsWidget,
  'o4o/newsletter-widget': NewsletterWidget,
  'core/latest-posts': RecentPostsWidget,
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
    subdomain?: string | null;
    path?: string;
    pathPrefix?: string | null;
    menuData?: any;
    menuLoading?: boolean;
    logoUrl?: string;
  };
  fallback?: React.ReactNode;
}

const TemplatePartRenderer: FC<TemplatePartRendererProps> = ({
  area,
  context,
  fallback
}) => {
  const { templateParts, loading, error } = useTemplateParts({ area, context });
  const { settings: stickySettings } = useStickyHeaderSettings();
  const { settings: mobileSettings } = useMobileHeaderSettings();

  // Note: removed a no-op useMemo to satisfy lint rules

  // Render blocks recursively
  const renderBlock = (block: TemplatePartBlock): React.ReactNode => {
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
        // Use logo from context (menu metadata) if available, otherwise use block data
        logoUrl: context?.logoUrl || block.data?.logoUrl,
        width: block.data?.width,
        isLink: block.data?.isLink,
        linkTarget: block.data?.linkTarget,
        data: block.data
      };
    } else if (block.type === 'core/navigation') {
      blockProps = {
        ...blockProps,
        menuRef: block.data?.menuRef || block.data?.menuLocation || ref || attrRef || 'primary',
        orientation: block.data?.orientation,
        showSubmenuIcon: block.data?.showSubmenuIcon,
        subdomain: context?.subdomain,
        path: context?.path,
        data: block.data
      };
    }

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

    // Wrap header sections with StickyHeader if enabled
    const renderContent = () => (
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

    // Apply sticky header wrapper for header areas
    if (area === 'header' && stickySettings.enabled) {
      // Determine which section this is (above, primary, below)
      let currentSection: 'above' | 'primary' | 'below' = 'primary';
      
      // Check template part name or ID to determine section
      if (templatePart.slug?.includes('above') || templatePart.title?.toLowerCase().includes('above')) {
        currentSection = 'above';
      } else if (templatePart.slug?.includes('below') || templatePart.title?.toLowerCase().includes('below')) {
        currentSection = 'below';
      }
      
      return (
        <StickyHeader
          enabled={stickySettings.enabled}
          triggerHeight={stickySettings.triggerHeight}
          shrinkEffect={stickySettings.shrinkEffect}
          shrinkHeight={stickySettings.shrinkHeight}
          backgroundColor={stickySettings.backgroundColor}
          backgroundOpacity={stickySettings.backgroundOpacity}
          boxShadow={stickySettings.boxShadow}
          shadowIntensity={stickySettings.shadowIntensity}
          animationDuration={stickySettings.animationDuration}
          hideOnScrollDown={stickySettings.hideOnScrollDown}
          zIndex={stickySettings.zIndex}
          stickyOn={stickySettings.stickyOn}
          currentSection={currentSection}
        >
          {renderContent()}
        </StickyHeader>
      );
    }
    
    return renderContent();
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
  
  // Wrap header with ResponsiveHeader for mobile support
  if (area === 'header') {
    const siteName = context?.logoUrl ? '' : 'Site'; // Use default site name if no logo

    return (
      <ResponsiveHeader
        mobileSettings={mobileSettings}
        menuItems={[]} // Mobile menu will be handled by HamburgerMenu component
        siteName={siteName}
      >
        {/* Render only the highest priority template (first in sorted array) */}
        {Array.isArray(templateParts) && templateParts.length > 0 ? renderTemplatePart(templateParts[0]) : null}
      </ResponsiveHeader>
    );
  }

  return (
    <>
      {/* Render only the highest priority template (first in sorted array) */}
      {Array.isArray(templateParts) && templateParts.length > 0 ? renderTemplatePart(templateParts[0]) : null}
    </>
  );
};

export default TemplatePartRenderer;
