import { FC, ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import TemplatePartRenderer from '../TemplatePartRenderer';
import { getPageContext } from '../../utils/context-detector';

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

  return (
    <div className={`wordpress-theme-wrapper min-h-screen flex flex-col ${className}`}>
      {/* WordPress Header Template Part */}
      <TemplatePartRenderer
        area="header"
        context={enhancedContext}
      />

      {/* Main Content Area */}
      <main className="flex-1 main-content">
        {children}
      </main>

      {/* WordPress Footer Template Part */}
      <TemplatePartRenderer
        area="footer"
        context={enhancedContext}
      />
    </div>
  );
};

export default Layout;