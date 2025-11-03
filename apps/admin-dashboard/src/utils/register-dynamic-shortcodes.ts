/**
 * Register Dynamic Shortcodes in Admin Dashboard
 * Uses the registerDynamicShortcodes function from @o4o/shortcodes
 */
import { globalRegistry, registerPresetShortcode, registerDynamicShortcodes as registerDynamic } from '@o4o/shortcodes';

export function registerDynamicShortcodes() {
  // Register all dynamic shortcodes using the built-in function
  registerDynamic(globalRegistry);

  // Register Preset Shortcode
  registerPresetShortcode();

  // Dynamic shortcodes registered successfully
}

// Call registration on import
registerDynamicShortcodes();