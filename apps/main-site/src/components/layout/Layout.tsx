import { FC, ReactNode, useEffect, useState } from 'react';
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

interface MenuItem {
  id: string;
  title: string;
  url: string;
  type: string;
  target: string;
  children?: MenuItem[];
}

interface MenuData {
  id: string;
  name: string;
  slug: string;
  location: string;
  metadata?: {
    theme?: string;
    logo_url?: string;
    subdomain?: string;
    path_prefix?: string;
  };
  items: MenuItem[];
}

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
 * Fetches menu data from Backend API and applies theme automatically
 */
const Layout: FC<LayoutProps> = ({
  children,
  context = {},
  className = ''
}) => {
  const location = useLocation();
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [menuLoading, setMenuLoading] = useState(true);
  const { currentWidth, currentPadding } = useCustomizerSettings();
  const { settings: scrollSettings } = useScrollToTopSettings();
  const { settings: buttonSettings } = useButtonSettings();
  const { settings: breadcrumbsSettings } = useBreadcrumbsSettings();

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setMenuLoading(true);

        // Get current page context (subdomain, path)
        const pageContext = getPageContext(location.pathname);

        // Build API URL with query parameters
        const apiUrl = process.env.VITE_API_URL || 'https://api.neture.co.kr';
        const params = new URLSearchParams();

        if (pageContext.subdomain) {
          params.set('subdomain', pageContext.subdomain);
        }
        if (pageContext.path) {
          params.set('path', pageContext.path);
        }

        const url = `${apiUrl}/api/v1/menus/location/primary${params.toString() ? `?${params.toString()}` : ''}`;

        const response = await fetch(url);
        const result = await response.json();

        if (result.success && result.data) {
          setMenuData(result.data);

          // Apply theme if specified in metadata
          if (result.data.metadata?.theme) {
            const themeClass = `theme-${result.data.metadata.theme}`;
            document.documentElement.className = themeClass;
          }
        }
      } catch (error) {
        console.error('Failed to fetch menu data:', error);
      } finally {
        setMenuLoading(false);
      }
    };

    fetchMenuData();
  }, [location.pathname]);

  // Enhanced context with page context info
  const enhancedContext = {
    ...context,
    ...getPageContext(location.pathname),
    menuData,
    menuLoading,
    logoUrl: menuData?.metadata?.logo_url
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