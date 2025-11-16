/**
 * Form Shortcode Component
 * Renders a Spectra form with customizable options
 *
 * Usage: [form id="form-id" name="Contact Form" theme="modern" layout="vertical"]
 */

import { ShortcodeDefinition } from '@o4o/shortcodes';
import { SpectraFormBlock } from '../TemplateRenderer/blocks/SpectraFormBlocks';

// Form shortcode definition
export const formShortcode: ShortcodeDefinition = {
  name: 'form',
  component: ({ attributes }) => {
    const { id, name, theme, layout, 'show-title': showTitle, 'show-description': showDescription } = attributes;

    return (
      <SpectraFormBlock
        formId={id as string}
        formName={name as string}
        showTitle={showTitle !== 'false'}
        showDescription={showDescription !== 'false'}
        theme={theme as any}
        layout={layout as any}
      />
    );
  }
};

export default formShortcode.component;
