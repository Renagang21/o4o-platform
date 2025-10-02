import { FC, ReactNode } from 'react';
import TemplatePartRenderer from '../TemplatePartRenderer';

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
 * All pages should use this layout for theme consistency
 */
const Layout: FC<LayoutProps> = ({ 
  children, 
  context = {},
  className = '' 
}) => {
  return (
    <div className={`wordpress-theme-wrapper min-h-screen flex flex-col ${className}`}>
      {/* WordPress Header Template Part */}
      <TemplatePartRenderer 
        area="header" 
        context={context}
      />
      
      {/* Main Content Area */}
      <main className="flex-1 main-content">
        {children}
      </main>
      
      {/* WordPress Footer Template Part */}
      <TemplatePartRenderer 
        area="footer" 
        context={context}
      />
    </div>
  );
};

export default Layout;