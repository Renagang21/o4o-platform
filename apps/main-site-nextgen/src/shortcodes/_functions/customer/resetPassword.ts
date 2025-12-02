import type { FunctionComponent } from '@/components/registry/function';

export const resetPassword: FunctionComponent = (_props, _context) => {
  return {
    type: 'ResetPasswordForm',
    props: {},
  };
};
