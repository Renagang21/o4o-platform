import type { FunctionComponent } from '@/components/registry/function';

export const orderDetail: FunctionComponent = (props, _context) => {
  const data = props.data || {};

  return {
    type: 'OrderDetailView',
    props: {
      id: data.id,
      orderNumber: data.orderNumber || '',
      date: data.date || '',
      status: data.status || 'pending',
      items: data.items || [],
      subtotal: data.subtotal || 0,
      shipping: data.shipping || 0,
      tax: data.tax || 0,
      discount: data.discount || 0,
      total: data.total || 0,
      shippingAddress: data.shippingAddress || {},
      paymentMethod: data.paymentMethod || '',
      trackingNumber: data.trackingNumber,
    },
  };
};
