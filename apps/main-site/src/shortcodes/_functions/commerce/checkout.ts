import type { FunctionComponent } from '@/components/registry/function';

export const checkout: FunctionComponent = (props, _context) => {
  const data = props.data || {};

  return {
    type: 'CheckoutForm',
    props: {
      items: data.items || [],
      subtotal: data.subtotal || 0,
      shipping: data.shipping || 0,
      tax: data.tax || 0,
      discount: data.discount || 0,
      total: data.total || 0,
      availablePaymentMethods: data.availablePaymentMethods || [],
      shippingAddress: data.shippingAddress,
    },
  };
};
