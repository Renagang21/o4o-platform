/**
 * View Shortcode Component
 * Renders a Spectra view (data table/list) with customizable options
 *
 * Usage: [view id="view-id" name="Products" items-per-page="25" enable-search="true"]
 */

import { FC } from 'react';
import { ShortcodeComponentProps } from '@o4o/shortcodes';
import { SpectraViewBlock } from '../TemplateRenderer/blocks/SpectraFormBlocks';

// Main Component (will be registered as [view])
const ViewShortcode: FC<ShortcodeComponentProps> = ({ attributes }) => {
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
};

export default ViewShortcode;
