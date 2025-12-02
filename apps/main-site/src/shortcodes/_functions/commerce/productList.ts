import type { FunctionComponent } from '@/components/registry/function';

export const productList: FunctionComponent = (props, _context) => {
  const data = props.data || {};
  const products = data.products || [];

  return {
    type: 'ProductGrid',
    props: {
      items: products.map((product: any) => ({
        id: product.id,
        title: product.title,
        price: product.price,
        thumbnail: product.thumbnail,
        category: product.category,
      })),
      total: data.total || 0,
      page: data.page || 1,
      pageSize: data.pageSize || 20,
    },
  };
};
