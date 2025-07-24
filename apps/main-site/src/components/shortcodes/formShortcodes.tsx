import React from 'react';
import { SpectraFormBlock, SpectraViewBlock } from '../TemplateRenderer/blocks/SpectraFormBlocks';

// Form shortcode handler
const formShortcode = {
  name: 'form',
  handler: (attrs: Record<string, string>) => {
    const { id, name, theme, layout, 'show-title': showTitle, 'show-description': showDescription } = attrs;
    
    return (
      <SpectraFormBlock
        formId={id}
        formName={name}
        showTitle={showTitle !== 'false'}
        showDescription={showDescription !== 'false'}
        theme={theme as any}
        layout={layout as any}
      />
    );
  }
};

// View shortcode handler
const viewShortcode = {
  name: 'view',
  handler: (attrs: Record<string, string>) => {
    const { 
      id, 
      name, 
      'show-title': showTitle,
      'items-per-page': itemsPerPage,
      'enable-search': enableSearch,
      'enable-filters': enableFilters,
      'enable-export': enableExport
    } = attrs;
    
    return (
      <SpectraViewBlock
        viewId={id}
        viewName={name}
        showTitle={showTitle !== 'false'}
        itemsPerPage={itemsPerPage ? parseInt(itemsPerPage) : 25}
        enableSearch={enableSearch !== 'false'}
        enableFilters={enableFilters !== 'false'}
        enableExport={enableExport !== 'false'}
      />
    );
  }
};

export const formShortcodes = [formShortcode, viewShortcode];