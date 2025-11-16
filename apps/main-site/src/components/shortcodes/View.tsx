/**
 * View Shortcode Component
 * Renders a Spectra view (data table/list) with customizable options
 *
 * Usage: [view id="view-id" name="Products" items-per-page="25" enable-search="true"]
 */

import { ShortcodeDefinition } from '@o4o/shortcodes';
import { SpectraViewBlock } from '../TemplateRenderer/blocks/SpectraFormBlocks';

// View shortcode definition
export const viewShortcode: ShortcodeDefinition = {
  name: 'view',
  component: ({ attributes }) => {
    const {
      id,
      name,
      'show-title': showTitle,
      'items-per-page': itemsPerPage,
      'enable-search': enableSearch,
      'enable-filters': enableFilters,
      'enable-export': enableExport
    } = attributes;

    return (
      <SpectraViewBlock
        viewId={id as string}
        viewName={name as string}
        showTitle={showTitle !== 'false'}
        itemsPerPage={itemsPerPage ? parseInt(itemsPerPage as string) : 25}
        enableSearch={enableSearch !== 'false'}
        enableFilters={enableFilters !== 'false'}
        enableExport={enableExport !== 'false'}
      />
    );
  }
};

export default viewShortcode.component;
