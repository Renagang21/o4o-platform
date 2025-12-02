import type { FunctionComponent } from '@/components/registry/function';

/**
 * View List Function Component
 * Displays a list of views from the CMS
 */
export const viewList: FunctionComponent = (props, _context) => {
  const data = props.data || {};
  const views = data.data || [];
  const pagination = data.pagination || {};

  return {
    type: 'ViewList',
    props: {
      views: views.map((view: any) => ({
        id: view.id,
        viewId: view.viewId,
        title: view.title,
        description: view.description,
        url: view.url,
        status: view.status,
        category: view.category,
        updatedAt: view.updatedAt,
        author: view.author,
      })),
      pagination,
    },
  };
};
