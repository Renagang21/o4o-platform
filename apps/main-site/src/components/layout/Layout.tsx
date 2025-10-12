import { FC, ReactNode } from 'react';
import { useLocation } from 'react-router';
import TemplatePartRenderer from '../TemplatePartRenderer';
import { getPageContext } from '../../utils/context-detector';
import { useCustomizerSettings } from '../../hooks/useCustomizerSettings';
import ScrollToTop from '../common/ScrollToTop';
import { useScrollToTopSettings } from '../../hooks/useScrollToTopSettings';
import ButtonStyleProvider from '../common/ButtonStyleProvider';
import { useButtonSettings } from '../../hooks/useButtonSettings';
import Breadcrumbs from '../common/Breadcrumbs';
import { useBreadcrumbsSettings } from '../../hooks/useBreadcrumbsSettings';
import { generateBreadcrumbs } from '../../utils/breadcrumb-generator';

interface LayoutProps {
  children: ReactNode;
  context?: {
    pageId?: string;
    postType?: string;
    categories?: string[];
    userRole?: string;
  };
  className?: string;
}

/**
 * WordPress Theme Layout Component
 * Provides consistent header/footer using TemplatePartRenderer
 */
const Layout: FC<LayoutProps> = ({
  children,
  context = {},
  className = ''
}) => {
  const location = useLocation();
  const { currentWidth, currentPadding } = useCustomizerSettings();
  const { settings: scrollSettings } = useScrollToTopSettings();
  const { settings: buttonSettings } = useButtonSettings();
  const { settings: breadcrumbsSettings } = useBreadcrumbsSettings();

  // Enhanced context with page context info
  const enhancedContext = {
    ...context,
    ...getPageContext(location.pathname)
  };

  // Generate breadcrumb items
  const breadcrumbItems = generateBreadcrumbs({
    settings: breadcrumbsSettings,
    context: enhancedContext,
    location: window.location
  });

  return (
    <>
      {/* Button Styles Provider */}
      <ButtonStyleProvider settings={buttonSettings} />
      
      <div className={`wordpress-theme-wrapper min-h-screen flex flex-col ${className}`}>
        {/* WordPress Header Template Part */}
        <TemplatePartRenderer
          area="header"
          context={enhancedContext}
        />

        {/* Breadcrumbs - Below Header */}
        {breadcrumbsSettings.position === 'below-header' && (
          <div className="breadcrumbs-container" style={{
            maxWidth: `${currentWidth}px`,
            paddingLeft: `${currentPadding.left}px`,
            paddingRight: `${currentPadding.right}px`,
            margin: '0 auto'
          }}>
            <Breadcrumbs
              settings={breadcrumbsSettings}
              items={breadcrumbItems}
            />
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 main-content mx-auto" style={{
          maxWidth: `${currentWidth}px`,
          paddingLeft: `${currentPadding.left}px`,
          paddingRight: `${currentPadding.right}px`,
        }}>
          {/* Breadcrumbs - Above Content */}
          {breadcrumbsSettings.position === 'above-content' && (
            <Breadcrumbs
              settings={breadcrumbsSettings}
              items={breadcrumbItems}
            />
          )}
          
          {children}
        </main>

        {/* WordPress Footer Template Part */}
        <TemplatePartRenderer
          area="footer"
          context={enhancedContext}
        />
        
        {/* Scroll to Top Button */}
        <ScrollToTop
          enabled={scrollSettings.enabled}
          displayType={scrollSettings.displayType}
          threshold={scrollSettings.threshold}
          backgroundColor={scrollSettings.backgroundColor}
          iconColor={scrollSettings.iconColor}
          position={scrollSettings.position}
        />
      </div>
    </>
  );
};

export default Layout;