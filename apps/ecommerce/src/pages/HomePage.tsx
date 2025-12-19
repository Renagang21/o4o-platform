import { Link } from 'react-router-dom';
import { Button } from '@o4o/ui';
import { ArrowRight } from 'lucide-react';
import { ProductCarousel } from '@/components/product';
import { Product } from '@o4o/types';

// Mock data: Cosmetic Images retained, but "concept" text minimized or removed from main layout logic where possible.
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Luminous Glow Serum',
    slug: 'luminous-glow-serum',
    sku: 'SERUM-001',
    description: 'Product Description Here',
    pricing: { customer: 45000, business: 40500, affiliate: 42750, retailer: { gold: 42750, premium: 41000, vip: 40500 } },
    inventory: { stockQuantity: 50, minOrderQuantity: 1, lowStockThreshold: 10, manageStock: true, allowBackorder: false, stockStatus: 'in_stock' },
    images: [{ id: '1', url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=600', alt: 'Product', sortOrder: 0, isFeatured: true }],
    categories: [],
    tags: [],
    isFeatured: true,
    status: 'active',
    approvalStatus: 'approved',
    supplierId: '1',
    supplierName: 'Supplier',
    viewCount: 0,
    salesCount: 0,
    rating: 0,
    reviewCount: 0,
    specifications: {},
    attributes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isVirtual: false,
    isDownloadable: false
  } as Product,
  {
    id: '2',
    name: 'Hydra Barrier Cream',
    sku: 'CREAM-001',
    pricing: { customer: 38000, business: 34200, affiliate: 36100, retailer: { gold: 36100, premium: 35000, vip: 34200 } },
    images: [{ id: '2', url: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&q=80&w=600', alt: 'Product', sortOrder: 0, isFeatured: true }],
    inventory: { stockQuantity: 100, minOrderQuantity: 1, lowStockThreshold: 10, manageStock: true, allowBackorder: false, stockStatus: 'in_stock' },
    isFeatured: true,
    status: 'active',
    approvalStatus: 'approved',
    supplierId: '1',
    supplierName: 'Supplier',
    tags: [],
    categories: [],
    viewCount: 0,
    salesCount: 0,
    rating: 0,
    reviewCount: 0,
    specifications: {},
    attributes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isVirtual: false,
    isDownloadable: false
  } as Product,
  {
    id: '3',
    name: 'Pure Calming Toner',
    sku: 'TONER-001',
    pricing: { customer: 28000, business: 25200, affiliate: 26600, retailer: { gold: 26600, premium: 25800, vip: 25200 } },
    images: [{ id: '3', url: 'https://images.unsplash.com/photo-1601049541289-9b3b7d5d7fb5?auto=format&fit=crop&q=80&w=600', alt: 'Product', sortOrder: 0, isFeatured: true }],
    inventory: { stockQuantity: 100, minOrderQuantity: 1, lowStockThreshold: 10, manageStock: true, allowBackorder: false, stockStatus: 'in_stock' },
    isFeatured: true,
    status: 'active',
    approvalStatus: 'approved',
    supplierId: '1',
    supplierName: 'Supplier',
    tags: [],
    categories: [],
    viewCount: 0,
    salesCount: 0,
    rating: 0,
    reviewCount: 0,
    specifications: {},
    attributes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isVirtual: false,
    isDownloadable: false
  } as Product,
  {
    id: '4',
    name: 'Revital Eye Care',
    sku: 'EYE-001',
    pricing: { customer: 52000, business: 46800, affiliate: 49400, retailer: { gold: 49400, premium: 47900, vip: 46800 } },
    images: [{ id: '4', url: 'https://images.unsplash.com/photo-1571781926291-28b46a832294?auto=format&fit=crop&q=80&w=600', alt: 'Product', sortOrder: 0, isFeatured: true }],
    inventory: { stockQuantity: 100, minOrderQuantity: 1, lowStockThreshold: 10, manageStock: true, allowBackorder: false, stockStatus: 'in_stock' },
    isFeatured: true,
    status: 'active',
    approvalStatus: 'approved',
    supplierId: '1',
    supplierName: 'Supplier',
    tags: [],
    categories: [],
    viewCount: 0,
    salesCount: 0,
    rating: 0,
    reviewCount: 0,
    specifications: {},
    attributes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isVirtual: false,
    isDownloadable: false
  } as Product
];

export function HomePage() {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section: Structure Maintenance. Clean visuals, generic/neutral text. */}
      <section className="relative text-center py-24 px-4 bg-muted/20">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
            Discover Our Collection
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Premium products for your daily routine.
          </p>
          <div className="pt-4">
            <Link to="/products">
              <Button size="lg" className="px-10 h-12">
                Shop Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products: Grid Structure Only */}
      <section className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Products</h2>
        </div>
        <ProductCarousel products={mockProducts} autoplay interval={4000} />
      </section>

      {/* Removed "Values/Features" Section entirely as per "Structure/Function/Policy" removal order. */}

      {/* CTA Section: Structure Maintenance */}
      <section className="container mx-auto px-4">
        <div className="bg-gray-100 rounded-2xl p-12 text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Join Membership
          </h2>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">
            Sign up to get the latest updates.
          </p>
          <Link to="/register">
            <Button size="lg" variant="default" className="px-8">
              Register
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}