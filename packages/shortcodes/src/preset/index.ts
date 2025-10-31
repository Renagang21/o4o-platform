import { PresetShortcode } from '../components/PresetShortcode.js';
import { registerShortcode } from '../registry.js';
import type { ShortcodeDefinition } from '../types.js';

/**
 * Preset shortcode definition
 */
export const presetShortcodeDefinition: ShortcodeDefinition = {
  name: 'preset',
  component: PresetShortcode,
  description: 'Render content based on CPT/ACF preset configuration',
  attributes: {
    id: {
      type: 'string',
      required: true
    },
    type: {
      type: 'string',
      required: false,
      default: 'view'
    }
  },
  validate: (attributes) => {
    if (!attributes.id || typeof attributes.id !== 'string') {
      console.error('[preset] shortcode requires "id" attribute');
      return false;
    }

    const validTypes = ['view', 'form', 'template'];
    const type = attributes.type || 'view';
    if (!validTypes.includes(String(type))) {
      console.error(`[preset] invalid type "${type}". Must be one of: ${validTypes.join(', ')}`);
      return false;
    }

    return true;
  }
};

/**
 * Register preset shortcode
 */
export function registerPresetShortcode(): void {
  registerShortcode(presetShortcodeDefinition);
}

export { PresetShortcode } from '../components/PresetShortcode.js';
