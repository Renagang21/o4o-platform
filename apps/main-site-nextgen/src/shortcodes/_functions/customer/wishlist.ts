import type { FunctionComponent } from '@/components/registry/function';

export const wishlist: FunctionComponent = (props, _context) => {
  const data = props.data || {};
  const items = data.items || [];

  return {
    type: 'WishlistList',
    props: {
      items: items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productTitle: item.productTitle,
        productImage: item.productImage,
        price: item.price,
        inStock: item.inStock,
        addedAt: item.addedAt,
      })),
      total: data.total || 0,
    },
  };
};
