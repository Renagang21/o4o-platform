import type { FunctionComponent } from '@/components/registry/function';

export const myAccount: FunctionComponent = (props, _context) => {
  const data = props.data || {};

  return {
    type: 'CustomerOverview',
    props: {
      name: data.name || '',
      email: data.email || '',
      phone: data.phone,
      ordersCount: data.ordersCount || 0,
      wishlistCount: data.wishlistCount || 0,
      memberSince: data.memberSince || '',
      address: data.address,
    },
  };
};
