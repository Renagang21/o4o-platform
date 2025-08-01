import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { transformWordPressRoute, wpAdminPatterns } from '@/config/wordpressRoutes';

/**
 * WordPress Router Component
 * Handles WordPress-style URL routing and redirects
 */
export function WordPressRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    
    // Check if it's a WordPress admin URL
    if (wpAdminPatterns.isAdminUrl(currentPath)) {
      // Transform to React route
      const reactPath = transformWordPressRoute(currentPath + location.search);
      
      if (reactPath !== currentPath) {
        // Redirect to React route
        navigate(reactPath, { replace: true });
      }
    }
  }, [location, navigate]);

  return null;
}

/**
 * Hook to navigate using WordPress URLs
 */
export function useWordPressNavigate() {
  const navigate = useNavigate();
  
  return (wpPath: string, options?: any) => {
    const reactPath = transformWordPressRoute(wpPath);
    navigate(reactPath, options);
  };
}