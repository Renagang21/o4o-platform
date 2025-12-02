import type { FunctionComponent } from '@/components/registry/function';

export const cart: FunctionComponent = (props, _context) => {
  const data = props.data || {};

  return {
    type: 'CartView',
    props: {
      items: (data.items || []).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productTitle: item.productTitle,
        productImage: item.productImage,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
      summary: {
        total: data.total || 0,
        itemCount: data.itemCount || 0,
        shipping: data.shipping || 0,
        discount: data.discount || 0,
        finalTotal: data.finalTotal || 0,
      },
    },
  };
};
