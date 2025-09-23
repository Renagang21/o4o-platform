/**
 * WordPress Page Wrapper
 * 
 * This wrapper ensures WordPress modules are loaded before rendering
 * any page that requires WordPress functionality.
 */

import { useState, useEffect, ReactNode } from 'react';
import { initializeWordPress } from '@/utils/wordpress-initializer';
// Using inline spinner as ui/spinner doesn't exist

interface WordPressPageWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function WordPressPageWrapper({ 
  children, 
  fallback 
}: WordPressPageWrapperProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    initializeWordPress()
      .then(() => setIsLoaded(true))
      .catch(err => setError(err));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Failed to load editor modules
          </h2>
          <p className="text-gray-600">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 mb-4 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-600">Loading editor modules...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}