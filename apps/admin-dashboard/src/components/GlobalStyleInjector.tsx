/**
 * Global Style Injector (Admin Dashboard)
 * Injects appearance system CSS and Custom CSS into the preview
 * Ensures preview matches frontend appearance
 */

import { useEffect } from 'react';
import { useCustomizerSettings } from '../hooks/useCustomizerSettings';
import { useThemeSettings } from '../hooks/useThemeSettings';
import {
  generateCSSVariables,
  generateButtonCSS,
  generateBreadcrumbCSS,
  generateScrollToTopCSS,
  injectCSS,
  STYLE_IDS,
} from '@o4o/appearance-system';

export function GlobalStyleInjector() {
  const { settings, isLoading: customizerLoading } = useCustomizerSettings();
  const { designTokens, isLoading: themeLoading } = useThemeSettings();

  useEffect(() => {
    // Wait for all settings to load
    if (customizerLoading || themeLoading || !settings) {
      return;
    }

    try {
      // 1. Inject CSS Variables (Design Tokens) first
      const cssVariables = generateCSSVariables(designTokens);
      injectCSS(cssVariables, 'o4o-css-variables');

      // 2. Generate core component CSS using loaded design tokens
      const coreCSS = [
        generateButtonCSS(designTokens),
        generateBreadcrumbCSS(designTokens),
        generateScrollToTopCSS(designTokens),
      ].join('\n\n');

      // Inject core CSS
      injectCSS(coreCSS, STYLE_IDS.APPEARANCE_SYSTEM);

      // 3. Inject Custom CSS if exists
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
  }, [settings, customizerLoading, themeLoading, designTokens]);

  // This component doesn't render anything
  return null;
}
