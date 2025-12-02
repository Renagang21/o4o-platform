import type { FunctionComponent } from '@/components/registry/function';

/**
 * View Editor Function Component
 * Renders an editor for editing an existing view
 */
export const viewEditor: FunctionComponent = (props, _context) => {
  const data = props.data || {};
  const view = data.data || {};

  return {
    type: 'ViewEditor',
    props: {
      view: {
        id: view.id,
        viewId: view.viewId,
        title: view.title,
        description: view.description,
        url: view.url,
        json: view.json,
        status: view.status,
        category: view.category,
        tags: view.tags,
        metadata: view.metadata,
        version: view.version,
        updatedAt: view.updatedAt,
      },
      onSave: props.onSave,
    },
  };
};
