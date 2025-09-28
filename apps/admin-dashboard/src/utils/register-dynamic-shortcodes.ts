/**
 * Register Dynamic Shortcodes in Admin Dashboard
 */
import { 
  globalRegistry,
  CPTListShortcode,
  CPTFieldShortcode,
  ACFFieldShortcode,
  MetaFieldShortcode
} from '@o4o/shortcodes';

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

  console.log('Dynamic shortcodes registered successfully');
}

// Call registration on import
registerDynamicShortcodes();