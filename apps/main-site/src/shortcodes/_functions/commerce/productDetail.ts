import type { FunctionComponent } from '@/components/registry/function';

export const productDetail: FunctionComponent = (props, _context) => {
  const data = props.data || {};

  return {
    type: 'ProductDetailView',
    props: {
      id: data.id,
      title: data.title || '',
      price: data.price || 0,
      description: data.description || '',
      image: data.image || '',
      images: data.images || [],
      category: data.category || '',
      stock: data.stock || 0,
      specifications: data.specifications || {},
      reviews: data.reviews || { rating: 0, count: 0 },
    },
  };
};
