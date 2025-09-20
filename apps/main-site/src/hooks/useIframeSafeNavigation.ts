import { useNavigate } from 'react-router-dom';
import { isInIframe, safeNavigate } from '../utils/iframe-context';

/**
 * Hook that provides iframe-safe navigation
 * Automatically handles the difference between iframe and standalone contexts
 */
export const useIframeSafeNavigation = () => {
  const navigate = useNavigate();
  const inIframe = isInIframe();

  const safeNavigateFunction = (to: string | number, options?: { replace?: boolean }) => {
    if (inIframe) {
      // In iframe context, use location-based navigation
      if (typeof to === 'string') {
        safeNavigate(to);
      } else {
        // Handle numeric navigation (back/forward)
        // Navigation with numeric value skipped in iframe context
      }
    } else {
      // In standalone context, use normal React Router navigation
      navigate(to, options);
    }
  };

  return {
    navigate: safeNavigateFunction,
    isInIframe: inIframe
  };
};