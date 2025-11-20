/**
 * Global Style Injector (Admin Dashboard)
 * Injects appearance system CSS and Custom CSS into the preview
 * Ensures preview matches frontend appearance
 */

import { useEffect } from 'react';
import { useCustomizerSettings } from '../hooks/useCustomizerSettings';
import {
  defaultTokens,
  generateButtonCSS,
  generateBreadcrumbCSS,
  generateScrollToTopCSS,
  injectCSS,
  STYLE_IDS,
} from '@o4o/appearance-system';

export function GlobalStyleInjector() {
  const { settings, isLoading } = useCustomizerSettings();

  useEffect(() => {
    // Wait for settings to load
    if (isLoading || !settings) {
      return;
    }

    try {
      // Generate core component CSS using appearance-system
      const coreCSS = [
        generateButtonCSS(defaultTokens),
        generateBreadcrumbCSS(defaultTokens),
        generateScrollToTopCSS(defaultTokens),
      ].join('\n\n');

      // Inject core CSS
      injectCSS(coreCSS, STYLE_IDS.APPEARANCE_SYSTEM);

      // Inject Custom CSS if exists
      if (settings.customCSS) {
        let customStyleEl = document.getElementById('custom-css') as HTMLStyleElement;
        if (!customStyleEl) {
          customStyleEl = document.createElement('style');
          customStyleEl.id = 'custom-css';
          customStyleEl.setAttribute('data-source', 'custom-css');
          document.head.appendChild(customStyleEl);
        }
        customStyleEl.textContent = settings.customCSS;
      }

    } catch (error) {
      console.error('[GlobalStyleInjector] Failed to inject CSS:', error);
    }
  }, [settings, isLoading]);

  // This component doesn't render anything
  return null;
}
