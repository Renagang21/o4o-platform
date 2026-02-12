/**
 * WordPress Editor Wrapper
 * Ensures WordPress is initialized before rendering any WordPress components
 */

import { useEffect, useState } from 'react';
import { initializeWordPress } from '@/utils/wordpress-initializer';
// Using inline spinner as ui/spinner doesn't exist
const Spinner = ({ className }: { className?: string }) => (
  <div className={`border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin ${className || 'w-8 h-8'}`} />
);

interface WordPressEditorWrapperProps {
  children?: React.ReactNode;
  // Optional props expected by callers; currently not used internally
  initialContent?: string;
  onChange?: (_content: string, _blocks: any[]) => void;
  showReusableBlocks?: boolean;
}

export default function WordPressEditorWrapper({ children }: WordPressEditorWrapperProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await initializeWordPress();
        if (mounted) {
          setIsReady(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize WordPress');
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading WordPress editor</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner className="w-8 h-8 mb-4" />
          <p className="text-gray-600">Loading WordPress editor...</p>
        </div>
      </div>
    );
  }

  return <>{children ?? null}</>;
}
