/**
 * Global Style Injector
 * Injects customizer settings as CSS into the document head
 * This makes all customizer settings (colors, typography, header, footer, etc.) apply to the frontend
 */

import { useEffect } from 'react';
import { useCustomizerSettings } from '../hooks/useCustomizerSettings';
import { generateCSS } from '../utils/css-generator';

export function GlobalStyleInjector() {
  const { settings, isLoading } = useCustomizerSettings();

  useEffect(() => {
    // Wait for settings to load
    if (isLoading || !settings) {
      return;
    }

    try {
      // Generate CSS from customizer settings
      const css = generateCSS(settings);

      // Get or create style element
      let styleEl = document.getElementById('customizer-global-css') as HTMLStyleElement;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'customizer-global-css';
        styleEl.setAttribute('data-source', 'customizer');
        document.head.appendChild(styleEl);
      }

      // Inject CSS
      styleEl.textContent = css;
    } catch (error) {
      console.error('[GlobalStyleInjector] Failed to inject CSS:', error);
    }
  }, [settings, isLoading]);

  // This component doesn't render anything
  return null;
}
