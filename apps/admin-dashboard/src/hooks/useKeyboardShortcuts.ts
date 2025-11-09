import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * P1 Phase D-3: Keyboard shortcuts hook
 *
 * Global shortcuts:
 * - G + D: Go to dashboard
 * - G + E: Go to enrollments
 * - G + O: Go to orders
 * - G + P: Go to products
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    let lastKey = '';
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Handle 'G' key combinations
      if (e.key.toLowerCase() === 'g') {
        lastKey = 'g';
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          lastKey = '';
        }, 1000);
        return;
      }

      if (lastKey === 'g') {
        switch (e.key.toLowerCase()) {
          case 'd':
            navigate('/admin');
            break;
          case 'e':
            navigate('/admin/enrollments');
            break;
          case 'o':
            navigate('/admin/orders');
            break;
          case 'p':
            navigate('/admin/products');
            break;
        }
        lastKey = '';
      }

      // ESC to close modals/deselect
      if (e.key === 'Escape') {
        const event = new CustomEvent('keyboard-escape');
        window.dispatchEvent(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [navigate]);
}
