import type { FunctionComponent } from '@/components/registry/function';

export const login: FunctionComponent = (_props, _context) => {
  return {
    type: 'LoginForm',
    props: {},
  };
};
