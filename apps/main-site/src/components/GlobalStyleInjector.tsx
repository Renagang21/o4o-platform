/**
 * Global Style Injector
 * Injects customizer settings as CSS into the document head
 * This makes all customizer settings (colors, typography, header, footer, etc.) apply to the frontend
 *
 * Phase 3: Now uses @o4o/appearance-system for standardized CSS generation and injection
 */

import { useEffect } from 'react';
import { useCustomizerSettings } from '../hooks/useCustomizerSettings';
import { generateCSS } from '../utils/css-generator';
import {
  defaultTokens,
  generateButtonCSS,
  generateBreadcrumbCSS,
  generateScrollToTopCSS,
  injectCSS,
  STYLE_IDS,
  type DesignTokens,
} from '@o4o/appearance-system';

export function GlobalStyleInjector() {
  const { settings, isLoading } = useCustomizerSettings();

  useEffect(() => {
    // Wait for settings to load
    if (isLoading || !settings) {
      console.log('[GlobalStyleInjector] Waiting for settings...', { isLoading, hasSettings: !!settings });
      return;
    }

    console.log('[GlobalStyleInjector] Settings loaded:', settings);
    console.log('[GlobalStyleInjector] Colors from settings:', (settings as any).colors);

    try {
      // Legacy: Generate full CSS from customizer settings (Phase 2.5 generators)
      const legacyCSS = generateCSS(settings);
      console.log('[GlobalStyleInjector] Generated legacy CSS (first 500 chars):', legacyCSS.substring(0, 500));

      // Phase 3: Generate core component CSS using appearance-system
      // Map customizer settings to design tokens (A-4: Essential mappings added)
      const tokens: DesignTokens = {
        ...defaultTokens,
        colors: {
          ...defaultTokens.colors,
          // Map from customizer settings if available
          primary: (settings as any).colors?.primaryColor || defaultTokens.colors.primary,
          primaryHover: (settings as any).colors?.primaryHover || defaultTokens.colors.primaryHover,
          primaryActive: (settings as any).colors?.primaryActive || defaultTokens.colors.primaryActive,
          buttonBg: (settings as any).buttons?.primary?.backgroundColor || defaultTokens.colors.buttonBg,
          buttonText: (settings as any).buttons?.primary?.textColor || defaultTokens.colors.buttonText,
          buttonBorder: (settings as any).buttons?.primary?.backgroundColor || defaultTokens.colors.buttonBorder,
          breadcrumbText: (settings as any).breadcrumbs?.styling?.textColor || defaultTokens.colors.breadcrumbText,
          breadcrumbLink: (settings as any).breadcrumbs?.styling?.linkColor || defaultTokens.colors.breadcrumbLink,
          breadcrumbSeparator: (settings as any).breadcrumbs?.styling?.separatorColor || defaultTokens.colors.breadcrumbSeparator,
        },
        typography: {
          ...defaultTokens.typography,
          // A-4: Map body font from customizer
          fontFamily: (settings as any).typography?.bodyFont?.fontFamily || defaultTokens.typography.fontFamily,
        },
      };

      // Generate core component CSS (Phase 2 generators)
      const coreCSS = [
        generateButtonCSS(tokens),
        generateBreadcrumbCSS(tokens),
        generateScrollToTopCSS(tokens),
      ].join('\n\n');

      // INJECTION ORDER GUARANTEE: Legacy first, then appearance-system
      // This ensures --o4o-* variables can override legacy --wp-* variables

      // Step 1: Inject legacy CSS (backward compatibility)
      // Creates/updates <style id="customizer-global-css"> with header, footer, typography, blog CSS
      let legacyStyleEl = document.getElementById('customizer-global-css') as HTMLStyleElement;
      if (!legacyStyleEl) {
        legacyStyleEl = document.createElement('style');
        legacyStyleEl.id = 'customizer-global-css';
        legacyStyleEl.setAttribute('data-source', 'customizer-legacy');
        // Ensure legacy is inserted BEFORE appearance-system
        const appearanceEl = document.getElementById(STYLE_IDS.APPEARANCE_SYSTEM);
        if (appearanceEl) {
          document.head.insertBefore(legacyStyleEl, appearanceEl);
        } else {
          document.head.appendChild(legacyStyleEl);
        }
      }
      legacyStyleEl.textContent = legacyCSS;
      console.log('[GlobalStyleInjector] ✅ Legacy CSS injected into <style id="customizer-global-css">');

      // Step 2: Inject core CSS using appearance-system (Phase 3 standard path)
      // Creates/updates <style id="o4o-appearance-system"> with button, breadcrumb, scroll-to-top CSS
      // This MUST come after legacy to ensure proper cascade
      injectCSS(coreCSS, STYLE_IDS.APPEARANCE_SYSTEM);
      console.log('[GlobalStyleInjector] ✅ Core CSS injected via appearance-system');

    } catch (error) {
      console.error('[GlobalStyleInjector] ❌ Failed to inject CSS:', error);
    }
  }, [settings, isLoading]);

  // This component doesn't render anything
  return null;
}
