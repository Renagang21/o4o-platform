import type { FunctionComponent } from '@/components/registry/function';

/**
 * View Form Function Component
 * Renders a form for creating a new view
 */
export const viewForm: FunctionComponent = (props, _context) => {
  return {
    type: 'ViewForm',
    props: {
      mode: 'create',
      onSubmit: props.onSubmit,
    },
  };
};
