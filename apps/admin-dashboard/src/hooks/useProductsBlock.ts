import { useState, useEffect } from 'react';
import { parseProductMeta } from '../utils/ecommerce';

interface ProductQuery {
  perPage?: number;
  page?: number;
  offset?: number;
  order?: 'asc' | 'desc';
  orderBy?: string;
  search?: string;
  categories?: number[];
  tags?: number[];
  featured?: boolean;
  onSale?: boolean;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

interface UseProductsResult {
  products: any[];
  isLoading: boolean;
  error: string | null;
  totalPages: number;
  totalProducts: number;
  refetch: () => void;
}

export function useProductsBlock(query: ProductQuery = {}): UseProductsResult {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (query.perPage) params.append('per_page', query.perPage.toString() as any);
      if (query.page) params.append('page', query.page.toString() as any);
      if (query.offset) params.append('offset', query.offset.toString() as any);
      if (query.order) params.append('order', query.order);
      if (query.orderBy) params.append('orderby', query.orderBy);
      if (query.search) params.append('search', query.search);
      if (query.categories?.length) params.append('categories', query.categories.join(','));
      if (query.tags?.length) params.append('tags', query.tags.join(','));
      if (query.featured !== undefined) params.append('featured', query.featured.toString() as any);
      if (query.onSale !== undefined) params.append('on_sale', query.onSale.toString() as any);
      if (query.inStock !== undefined) params.append('stock_status', 'instock');
      if (query.minPrice) params.append('min_price', query.minPrice.toString() as any);
      if (query.maxPrice) params.append('max_price', query.maxPrice.toString() as any);

      // TODO: Update to use correct API endpoint when backend is ready
      // const response = await fetch(`https://api.neture.co.kr/api/v1/ecommerce/products?${params.toString() as any}`);
      
      // Mock data for now to prevent 500 errors
      const data = {
        products: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        totalProducts: 0
      };
      
      // Original code - uncomment when API is working
      // const response = await fetch(`/api/ecommerce/products?${params.toString() as any}`);
      // if (!response.ok) {
      //   throw new Error('Failed to fetch products');
      // }
      // const data = await response.json();

      // Transform product data
      const transformedProducts = data.products.map((product: any) => {
        const meta = parseProductMeta(product.meta || {});
        
        return {
          id: product.id,
          title: product.title || product.name,
          slug: product.slug,
          link: product.link || `/products/${product.slug}`,
          type: product.type || 'simple',
          status: product.status,
          featured: product.featured || false,
          description: product.description,
          shortDescription: product.short_description || product.excerpt,
          sku: meta.sku || product.sku,
          price: meta.price || product.price,
          regularPrice: meta.regularPrice || product.regular_price,
          salePrice: meta.salePrice || product.sale_price,
          onSale: product.on_sale || (meta.salePrice && meta.salePrice < meta.regularPrice),
          stockStatus: meta.stockStatus || product.stock_status || 'in_stock',
          stockQuantity: meta.stockQuantity || product.stock_quantity,
          weight: meta.weight || product.weight,
          dimensions: meta.dimensions || product.dimensions,
          categories: product.categories || [],
          tags: product.tags || [],
          images: product.images || [],
          image: product.images?.[0] || product.featured_image || {
            thumbnail: '/placeholder-product.jpg',
            medium: '/placeholder-product.jpg',
            large: '/placeholder-product.jpg',
            full: '/placeholder-product.jpg'
          },
          attributes: product.attributes || [],
          variations: product.variations || [],
          averageRating: product.average_rating || 0,
          ratingCount: product.rating_count || 0,
          currency: 'KRW'
        };
      });

      setProducts(transformedProducts);
      setTotalPages(data.totalPages || 1);
      setTotalProducts(data.totalProducts || transformedProducts.length);
    } catch (err: any) {
      // Error will be displayed to user via error state
      setError(err instanceof Error ? err.message : 'Failed to load products');
      
      // Set mock data for development
      if (import.meta.env.DEV) {
        setProducts(getMockProducts());
        setTotalPages(1);
        setTotalProducts(6);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return {
    products,
    isLoading,
    error,
    totalPages,
    totalProducts,
    refetch: fetchProducts
  };
}

// Mock data for development
function getMockProducts() {
  return [
    {
      id: 1,
      title: '프리미엄 유기농 녹차',
      slug: 'premium-organic-green-tea',
      link: '/products/premium-organic-green-tea',
      type: 'simple',
      status: 'publish',
      featured: true,
      description: '제주도에서 재배한 프리미엄 유기농 녹차입니다.',
      shortDescription: '제주산 유기농 녹차',
      sku: 'TEA-001',
      price: 25000,
      regularPrice: 30000,
      salePrice: 25000,
      onSale: true,
      stockStatus: 'in_stock',
      stockQuantity: 50,
      categories: [{ id: 1, name: '차', slug: 'tea' }],
      image: {
        thumbnail: 'https://via.placeholder.com/150x150/4ade80/ffffff?text=Green+Tea',
        medium: 'https://via.placeholder.com/300x300/4ade80/ffffff?text=Green+Tea',
        large: 'https://via.placeholder.com/600x600/4ade80/ffffff?text=Green+Tea',
        full: 'https://via.placeholder.com/800x800/4ade80/ffffff?text=Green+Tea'
      },
      averageRating: 4.5,
      ratingCount: 23,
      currency: 'KRW'
    },
    {
      id: 2,
      title: '수제 꿀 세트',
      slug: 'handmade-honey-set',
      link: '/products/handmade-honey-set',
      type: 'simple',
      status: 'publish',
      featured: false,
      description: '국내산 아카시아꿀과 야생화꿀 세트',
      shortDescription: '국내산 수제 꿀',
      sku: 'HONEY-001',
      price: 45000,
      regularPrice: 45000,
      salePrice: null,
      onSale: false,
      stockStatus: 'in_stock',
      stockQuantity: 30,
      categories: [{ id: 2, name: '꿀', slug: 'honey' }],
      image: {
        thumbnail: 'https://via.placeholder.com/150x150/fbbf24/ffffff?text=Honey',
        medium: 'https://via.placeholder.com/300x300/fbbf24/ffffff?text=Honey',
        large: 'https://via.placeholder.com/600x600/fbbf24/ffffff?text=Honey',
        full: 'https://via.placeholder.com/800x800/fbbf24/ffffff?text=Honey'
      },
      averageRating: 5,
      ratingCount: 15,
      currency: 'KRW'
    },
    {
      id: 3,
      title: '유기농 올리브 오일',
      slug: 'organic-olive-oil',
      link: '/products/organic-olive-oil',
      type: 'simple',
      status: 'publish',
      featured: true,
      description: '스페인산 엑스트라 버진 올리브 오일',
      shortDescription: '프리미엄 올리브 오일',
      sku: 'OIL-001',
      price: 35000,
      regularPrice: 35000,
      salePrice: null,
      onSale: false,
      stockStatus: 'out_of_stock',
      stockQuantity: 0,
      categories: [{ id: 3, name: '오일', slug: 'oil' }],
      image: {
        thumbnail: 'https://via.placeholder.com/150x150/84cc16/ffffff?text=Olive+Oil',
        medium: 'https://via.placeholder.com/300x300/84cc16/ffffff?text=Olive+Oil',
        large: 'https://via.placeholder.com/600x600/84cc16/ffffff?text=Olive+Oil',
        full: 'https://via.placeholder.com/800x800/84cc16/ffffff?text=Olive+Oil'
      },
      averageRating: 4.8,
      ratingCount: 42,
      currency: 'KRW'
    },
    {
      id: 4,
      title: '프리미엄 커피 원두',
      slug: 'premium-coffee-beans',
      link: '/products/premium-coffee-beans',
      type: 'simple',
      status: 'publish',
      featured: false,
      description: '콜롬비아산 스페셜티 커피',
      shortDescription: '스페셜티 커피 원두',
      sku: 'COFFEE-001',
      price: 28000,
      regularPrice: 32000,
      salePrice: 28000,
      onSale: true,
      stockStatus: 'in_stock',
      stockQuantity: 100,
      categories: [{ id: 4, name: '커피', slug: 'coffee' }],
      image: {
        thumbnail: 'https://via.placeholder.com/150x150/92400e/ffffff?text=Coffee',
        medium: 'https://via.placeholder.com/300x300/92400e/ffffff?text=Coffee',
        large: 'https://via.placeholder.com/600x600/92400e/ffffff?text=Coffee',
        full: 'https://via.placeholder.com/800x800/92400e/ffffff?text=Coffee'
      },
      averageRating: 4.3,
      ratingCount: 67,
      currency: 'KRW'
    },
    {
      id: 5,
      title: '수제 잼 3종 세트',
      slug: 'handmade-jam-set',
      link: '/products/handmade-jam-set',
      type: 'simple',
      status: 'publish',
      featured: true,
      description: '딸기, 블루베리, 오렌지 수제 잼',
      shortDescription: '과일 수제 잼 세트',
      sku: 'JAM-001',
      price: 38000,
      regularPrice: 42000,
      salePrice: 38000,
      onSale: true,
      stockStatus: 'in_stock',
      stockQuantity: 25,
      categories: [{ id: 5, name: '잼', slug: 'jam' }],
      image: {
        thumbnail: 'https://via.placeholder.com/150x150/ef4444/ffffff?text=Jam',
        medium: 'https://via.placeholder.com/300x300/ef4444/ffffff?text=Jam',
        large: 'https://via.placeholder.com/600x600/ef4444/ffffff?text=Jam',
        full: 'https://via.placeholder.com/800x800/ef4444/ffffff?text=Jam'
      },
      averageRating: 4.7,
      ratingCount: 34,
      currency: 'KRW'
    },
    {
      id: 6,
      title: '유기농 현미',
      slug: 'organic-brown-rice',
      link: '/products/organic-brown-rice',
      type: 'simple',
      status: 'publish',
      featured: false,
      description: '친환경 인증 유기농 현미 5kg',
      shortDescription: '유기농 현미 5kg',
      sku: 'RICE-001',
      price: 22000,
      regularPrice: 22000,
      salePrice: null,
      onSale: false,
      stockStatus: 'in_stock',
      stockQuantity: 80,
      categories: [{ id: 6, name: '곡물', slug: 'grain' }],
      image: {
        thumbnail: 'https://via.placeholder.com/150x150/f59e0b/ffffff?text=Rice',
        medium: 'https://via.placeholder.com/300x300/f59e0b/ffffff?text=Rice',
        large: 'https://via.placeholder.com/600x600/f59e0b/ffffff?text=Rice',
        full: 'https://via.placeholder.com/800x800/f59e0b/ffffff?text=Rice'
      },
      averageRating: 4.2,
      ratingCount: 18,
      currency: 'KRW'
    }
  ];
}