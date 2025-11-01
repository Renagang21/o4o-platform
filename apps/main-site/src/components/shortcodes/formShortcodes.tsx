import { ShortcodeDefinition } from '@o4o/shortcodes';
import { SpectraFormBlock, SpectraViewBlock } from '../TemplateRenderer/blocks/SpectraFormBlocks';

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

export const formShortcodes = [formShortcode, viewShortcode];
