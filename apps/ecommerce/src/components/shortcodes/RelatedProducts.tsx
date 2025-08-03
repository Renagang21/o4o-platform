import { FC } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '@o4o/types';
import { formatCurrency } from '@o4o/utils';
import type { ShortcodeProps, ShortcodeDefinition } from '@o4o/shortcodes';

interface RelatedProductsProps {
  productId?: string;
  category?: string;
  limit?: number;
  title?: string;
  layout?: 'grid' | 'carousel';
  showPrice?: boolean;
  showRating?: boolean;
}

const RelatedProductsComponent: FC<RelatedProductsProps> = ({
  productId,
  category: _category,  // In real app, this would be used to filter products
  limit = 4,
  title = 'You May Also Like',
  layout = 'grid',
  showPrice = true,
  showRating = true
}) => {
  // Mock related products - in real app, this would come from API based on productId or category
  const mockProducts: Product[] = [
    {
      id: '1',
      sku: 'PWH-001',
      name: 'Premium Wireless Headphones',
      slug: 'premium-wireless-headphones',
      shortDescription: 'Noise-cancelling wireless headphones',
      description: 'High-quality wireless headphones with noise cancellation',
      pricing: {
        customer: 299.99,
        business: 269.99,
        affiliate: 284.99,
        retailer: {
          gold: 254.99,
          premium: 239.99,
          vip: 224.99
        }
      },
      inventory: {
        stockQuantity: 50,
        minOrderQuantity: 1,
        maxOrderQuantity: 10,
        lowStockThreshold: 10,
        manageStock: true,
        allowBackorder: false,
        stockStatus: 'in_stock' as const
      },
      images: [{ id: '1', url: '/api/placeholder/300/300', alt: 'Premium Wireless Headphones', sortOrder: 0, isFeatured: true }],
      featuredImageUrl: '/api/placeholder/300/300',
      categories: ['electronics'],
      tags: [],
      specifications: {},
      attributes: {},
      supplierId: 'supplier-1',
      supplierName: 'Tech Supplier',
      status: 'active' as const,
      approvalStatus: 'approved' as const,
      viewCount: 1250,
      salesCount: 128,
      rating: 4.5,
      reviewCount: 128,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      isFeatured: true,
      isVirtual: false,
      isDownloadable: false
    },
    {
      id: '2',
      sku: 'SWP-001',
      name: 'Smart Watch Pro',
      slug: 'smart-watch-pro',
      shortDescription: 'Advanced fitness tracking smartwatch',
      description: 'Advanced fitness tracking and smartphone integration',
      pricing: {
        customer: 399.99,
        business: 359.99,
        affiliate: 379.99,
        retailer: {
          gold: 339.99,
          premium: 319.99,
          vip: 299.99
        }
      },
      inventory: {
        stockQuantity: 30,
        minOrderQuantity: 1,
        maxOrderQuantity: 5,
        lowStockThreshold: 10,
        manageStock: true,
        allowBackorder: false,
        stockStatus: 'in_stock' as const
      },
      images: [{ id: '2', url: '/api/placeholder/300/300', alt: 'Smart Watch Pro', sortOrder: 0, isFeatured: true }],
      featuredImageUrl: '/api/placeholder/300/300',
      categories: ['electronics'],
      tags: [],
      specifications: {},
      attributes: {},
      supplierId: 'supplier-1',
      supplierName: 'Tech Supplier',
      status: 'active' as const,
      approvalStatus: 'approved' as const,
      viewCount: 2340,
      salesCount: 256,
      rating: 4.8,
      reviewCount: 256,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      isFeatured: true,
      isVirtual: false,
      isDownloadable: false
    },
    {
      id: '3',
      sku: 'PBS-001',
      name: 'Portable Bluetooth Speaker',
      slug: 'portable-bluetooth-speaker',
      shortDescription: 'Waterproof Bluetooth speaker',
      description: 'Waterproof speaker with 360-degree sound',
      pricing: {
        customer: 79.99,
        business: 71.99,
        affiliate: 75.99,
        retailer: {
          gold: 67.99,
          premium: 63.99,
          vip: 59.99
        }
      },
      inventory: {
        stockQuantity: 100,
        minOrderQuantity: 1,
        maxOrderQuantity: 20,
        lowStockThreshold: 20,
        manageStock: true,
        allowBackorder: false,
        stockStatus: 'in_stock' as const
      },
      images: [{ id: '3', url: '/api/placeholder/300/300', alt: 'Portable Bluetooth Speaker', sortOrder: 0, isFeatured: true }],
      featuredImageUrl: '/api/placeholder/300/300',
      categories: ['electronics'],
      tags: [],
      specifications: {},
      attributes: {},
      supplierId: 'supplier-2',
      supplierName: 'Audio Tech',
      status: 'active' as const,
      approvalStatus: 'approved' as const,
      viewCount: 890,
      salesCount: 89,
      rating: 4.3,
      reviewCount: 89,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      isFeatured: false,
      isVirtual: false,
      isDownloadable: false
    },
    {
      id: '4',
      sku: 'UCH-001',
      name: 'USB-C Hub Adapter',
      slug: 'usb-c-hub-adapter',
      shortDescription: '7-in-1 USB-C Hub',
      description: '7-in-1 USB-C hub with HDMI, USB 3.0, and SD card reader',
      pricing: {
        customer: 49.99,
        business: 44.99,
        affiliate: 47.49,
        retailer: {
          gold: 42.49,
          premium: 39.99,
          vip: 37.49
        }
      },
      inventory: {
        stockQuantity: 200,
        minOrderQuantity: 1,
        maxOrderQuantity: 50,
        lowStockThreshold: 30,
        manageStock: true,
        allowBackorder: false,
        stockStatus: 'in_stock' as const
      },
      images: [{ id: '4', url: '/api/placeholder/300/300', alt: 'USB-C Hub Adapter', sortOrder: 0, isFeatured: true }],
      featuredImageUrl: '/api/placeholder/300/300',
      categories: ['electronics'],
      tags: [],
      specifications: {},
      attributes: {},
      supplierId: 'supplier-3',
      supplierName: 'Accessory Pro',
      status: 'active' as const,
      approvalStatus: 'approved' as const,
      viewCount: 450,
      salesCount: 45,
      rating: 4.6,
      reviewCount: 45,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      isFeatured: false,
      isVirtual: false,
      isDownloadable: false
    },
    {
      id: '5',
      sku: 'WCP-001',
      name: 'Wireless Charging Pad',
      slug: 'wireless-charging-pad',
      shortDescription: 'Fast wireless charger',
      description: 'Fast charging pad compatible with all Qi-enabled devices',
      pricing: {
        customer: 34.99,
        business: 31.49,
        affiliate: 33.24,
        retailer: {
          gold: 29.74,
          premium: 27.99,
          vip: 26.24
        }
      },
      inventory: {
        stockQuantity: 150,
        minOrderQuantity: 1,
        maxOrderQuantity: 30,
        lowStockThreshold: 25,
        manageStock: true,
        allowBackorder: false,
        stockStatus: 'in_stock' as const
      },
      images: [{ id: '5', url: '/api/placeholder/300/300', alt: 'Wireless Charging Pad', sortOrder: 0, isFeatured: true }],
      featuredImageUrl: '/api/placeholder/300/300',
      categories: ['electronics'],
      tags: [],
      specifications: {},
      attributes: {},
      supplierId: 'supplier-3',
      supplierName: 'Accessory Pro',
      status: 'active' as const,
      approvalStatus: 'approved' as const,
      viewCount: 670,
      salesCount: 67,
      rating: 4.2,
      reviewCount: 67,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      isFeatured: false,
      isVirtual: false,
      isDownloadable: false
    }
  ];

  // Filter out current product and limit results
  const relatedProducts = mockProducts
    .filter((p: any) => p.id !== productId)
    .slice(0, limit);

  if (relatedProducts.length === 0) {
    return null;
  }

  const ProductCard = ({ product }: { product: Product }) => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <Link to={`/products/${product.slug}`}>
        {product.images?.[0] && (
          <img
            src={typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url}
            alt={product.name}
            className="w-full h-48 object-cover"
          />
        )}
        <div className="p-4">
          <h4 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h4>
          
          {showPrice && (
            <div className="text-xl font-bold text-blue-600 mb-2">
              {formatCurrency(product.pricing.customer)}
            </div>
          )}
          
          {showRating && product.rating && (
            <div className="flex items-center">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(product.rating!) ? 'fill-current' : 'stroke-current'}`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <span className="ml-2 text-sm text-gray-600">
                ({product.reviewCount || 0})
              </span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );

  if (layout === 'carousel') {
    return (
      <div className="relative">
        {title && (
          <h3 className="text-2xl font-bold mb-6">{title}</h3>
        )}
        <div className="relative overflow-hidden">
          <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4">
            {relatedProducts.map((product: any) => (
              <div key={product.id} className="flex-none w-64">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h3 className="text-2xl font-bold mb-6">{title}</h3>
      )}
      <div className={`grid grid-cols-2 md:grid-cols-${Math.min(limit, 4)} gap-6`}>
        {relatedProducts.map((product: any) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

// Wrapper component that accepts ShortcodeProps
export const RelatedProducts: FC<ShortcodeProps> = ({ attributes }) => {
  const props: RelatedProductsProps = {
    productId: attributes.productId as string,
    category: attributes.category as string,
    limit: attributes.limit ? Number(attributes.limit) : undefined,
    title: attributes.title as string,
    layout: attributes.layout as 'grid' | 'carousel',
    showPrice: attributes.showPrice !== false,
    showRating: attributes.showRating !== false
  };

  return <RelatedProductsComponent {...props} />;
};

export const relatedProductsDefinition: ShortcodeDefinition = {
  name: 'related-products',
  component: RelatedProducts,
  attributes: {
    productId: { type: 'string' },
    category: { type: 'string' },
    limit: { type: 'number' },
    title: { type: 'string' },
    layout: { type: 'string' },
    showPrice: { type: 'boolean' },
    showRating: { type: 'boolean' }
  }
};