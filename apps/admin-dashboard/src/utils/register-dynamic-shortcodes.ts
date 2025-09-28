/**
 * Register Dynamic Shortcodes in Admin Dashboard
 */
import { globalRegistry } from '@o4o/shortcodes';
import { 
  CPTListShortcode,
  CPTFieldShortcode,
  ACFFieldShortcode,
  MetaFieldShortcode
} from '@o4o/shortcodes/dynamic';

export function registerDynamicShortcodes() {
  // Register CPT List Shortcode
  globalRegistry.register({
    name: 'cpt_list',
    component: CPTListShortcode,
    defaultAttributes: {
      type: 'post',
      count: 10,
      template: 'default',
    },
  });

  // Register CPT Field Shortcode
  globalRegistry.register({
    name: 'cpt_field',
    component: CPTFieldShortcode,
    defaultAttributes: {
      field: 'title',
    },
  });

  // Register ACF Field Shortcode
  globalRegistry.register({
    name: 'acf_field',
    component: ACFFieldShortcode,
    defaultAttributes: {
      format: 'formatted',
    },
  });

  // Register Meta Field Shortcode
  globalRegistry.register({
    name: 'meta_field',
    component: MetaFieldShortcode,
    defaultAttributes: {
      single: true,
    },
  });

  // Dynamic shortcodes registered successfully
}

// Call registration on import
registerDynamicShortcodes();