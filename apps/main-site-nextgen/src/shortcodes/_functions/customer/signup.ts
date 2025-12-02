import type { FunctionComponent } from '@/components/registry/function';

export const signup: FunctionComponent = (_props, _context) => {
  return {
    type: 'SignupForm',
    props: {},
  };
};
