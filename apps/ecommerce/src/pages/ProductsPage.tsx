import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Input, Button, Select, Card } from '@o4o/ui';
import { Search, Filter, Grid, List, X } from 'lucide-react';
import { Product } from '@o4o/types';
import { ProductGrid } from '@/components/product';

// Mock data: Cosmetic visual assets retained, but strictly neutral metadata.
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Luminous Glow Serum',
    slug: 'luminous-glow-serum',
    pricing: { customer: 45000, business: 40500, affiliate: 42750, retailer: { gold: 42750, premium: 41000, vip: 40500 } },
    images: [{ id: '1', url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=400', alt: 'Product', sortOrder: 0, isFeatured: true }],
    inventory: { stockQuantity: 50, minOrderQuantity: 1, lowStockThreshold: 10, manageStock: true, allowBackorder: false, stockStatus: 'in_stock' },
    status: 'active',
    categories: ['category-1'],
    sku: 'P001',
    supplierId: '1',
    supplierName: 'Supplier',
    specifications: {},
    attributes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isFeatured: true,
    isVirtual: false,
    isDownloadable: false,
    viewCount: 0,
    salesCount: 0,
    rating: 0,
    reviewCount: 0
  } as Product,
  {
    id: '2',
    name: 'Hydra Barrier Cream',
    slug: 'hydra-barrier-cream',
    pricing: { customer: 38000, business: 34200, affiliate: 36100, retailer: { gold: 36100, premium: 35000, vip: 34200 } },
    images: [{ id: '2', url: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&q=80&w=400', alt: 'Product', sortOrder: 0, isFeatured: true }],
    inventory: { stockQuantity: 100, minOrderQuantity: 1, lowStockThreshold: 10, manageStock: true, allowBackorder: false, stockStatus: 'in_stock' },
    status: 'active',
    categories: ['category-1'],
    sku: 'P002',
    supplierId: '1',
    supplierName: 'Supplier',
    specifications: {},
    attributes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isFeatured: true,
    isVirtual: false,
    isDownloadable: false,
    viewCount: 0,
    salesCount: 0,
    rating: 0,
    reviewCount: 0
  } as Product,
  {
    id: '3',
    name: 'Pure Calming Toner',
    slug: 'pure-calming-toner',
    pricing: { customer: 28000, business: 25200, affiliate: 26600, retailer: { gold: 26600, premium: 25800, vip: 25200 } },
    images: [{ id: '3', url: 'https://images.unsplash.com/photo-1601049541289-9b3b7d5d7fb5?auto=format&fit=crop&q=80&w=400', alt: 'Product', sortOrder: 0, isFeatured: true }],
    inventory: { stockQuantity: 80, minOrderQuantity: 1, lowStockThreshold: 10, manageStock: true, allowBackorder: false, stockStatus: 'in_stock' },
    status: 'active',
    categories: ['category-2'],
    sku: 'P003',
    supplierId: '1',
    supplierName: 'Supplier',
    specifications: {},
    attributes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isFeatured: true,
    isVirtual: false,
    isDownloadable: false,
    viewCount: 0,
    salesCount: 0,
    rating: 0,
    reviewCount: 0
  } as Product,
  {
    id: '4',
    name: 'Revital Eye Care',
    slug: 'revital-eye-care',
    pricing: { customer: 52000, business: 46800, affiliate: 49400, retailer: { gold: 49400, premium: 47900, vip: 46800 } },
    images: [{ id: '4', url: 'https://images.unsplash.com/photo-1571781926291-28b46a832294?auto=format&fit=crop&q=80&w=400', alt: 'Product', sortOrder: 0, isFeatured: true }],
    inventory: { stockQuantity: 0, minOrderQuantity: 1, lowStockThreshold: 5, manageStock: true, allowBackorder: false, stockStatus: 'out_of_stock' },
    status: 'active',
    categories: ['category-2'],
    sku: 'P004',
    supplierId: '1',
    supplierName: 'Supplier',
    specifications: {},
    attributes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isFeatured: true,
    isVirtual: false,
    isDownloadable: false,
    viewCount: 0,
    salesCount: 0,
    rating: 0,
    reviewCount: 0
  } as Product,
  {
    id: '5',
    name: 'Daily Mild Cleanser',
    slug: 'daily-mild-cleanser',
    pricing: { customer: 18000, business: 16200, affiliate: 17100, retailer: { gold: 17100, premium: 16500, vip: 16200 } },
    images: [{ id: '5', url: 'https://images.unsplash.com/photo-1556228720-1987ba83dd20?auto=format&fit=crop&q=80&w=400', alt: 'Product', sortOrder: 0, isFeatured: true }],
    inventory: { stockQuantity: 150, minOrderQuantity: 1, lowStockThreshold: 20, manageStock: true, allowBackorder: false, stockStatus: 'in_stock' },
    status: 'active',
    categories: ['category-3'],
    sku: 'P005',
    supplierId: '1',
    supplierName: 'Supplier',
    specifications: {},
    attributes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isFeatured: true,
    isVirtual: false,
    isDownloadable: false,
    viewCount: 0,
    salesCount: 0,
    rating: 0,
    reviewCount: 0
  } as Product,
  {
    id: '6',
    name: 'UV Defense Suncream',
    slug: 'uv-defense-suncream',
    pricing: { customer: 26000, business: 23400, affiliate: 24700, retailer: { gold: 24700, premium: 23900, vip: 23400 } },
    images: [{ id: '6', url: 'https://images.unsplash.com/photo-1529940467776-59698d248b61?auto=format&fit=crop&q=80&w=400', alt: 'Product', sortOrder: 0, isFeatured: true }],
    inventory: { stockQuantity: 200, minOrderQuantity: 1, lowStockThreshold: 15, manageStock: true, allowBackorder: false, stockStatus: 'in_stock' },
    status: 'active',
    categories: ['category-3'],
    sku: 'P006',
    supplierId: '1',
    supplierName: 'Supplier',
    specifications: {},
    attributes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isFeatured: true,
    isVirtual: false,
    isDownloadable: false,
    viewCount: 0,
    salesCount: 0,
    rating: 0,
    reviewCount: 0
  } as Product,
  {
    id: '7',
    name: 'Intensive Body Lotion',
    slug: 'intensive-body-lotion',
    pricing: { customer: 32000, business: 28800, affiliate: 30400, retailer: { gold: 30400, premium: 29400, vip: 28800 } },
    images: [{ id: '7', url: 'https://images.unsplash.com/photo-1608248596669-89a2eb2d3663?auto=format&fit=crop&q=80&w=400', alt: 'Product', sortOrder: 0, isFeatured: true }],
    inventory: { stockQuantity: 60, minOrderQuantity: 1, lowStockThreshold: 5, manageStock: true, allowBackorder: false, stockStatus: 'in_stock' },
    status: 'active',
    categories: ['category-4'],
    sku: 'P007',
    supplierId: '1',
    supplierName: 'Supplier',
    specifications: {},
    attributes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isFeatured: true,
    isVirtual: false,
    isDownloadable: false,
    viewCount: 0,
    salesCount: 0,
    rating: 0,
    reviewCount: 0
  } as Product,
  {
    id: '8',
    name: 'Aroma Healing Oil',
    slug: 'aroma-healing-oil',
    pricing: { customer: 48000, business: 43200, affiliate: 45600, retailer: { gold: 45600, premium: 44100, vip: 43200 } },
    images: [{ id: '8', url: 'https://images.unsplash.com/photo-1615396899839-099912130ce9?auto=format&fit=crop&q=80&w=400', alt: 'Product', sortOrder: 0, isFeatured: true }],
    inventory: { stockQuantity: 40, minOrderQuantity: 1, lowStockThreshold: 5, manageStock: true, allowBackorder: false, stockStatus: 'in_stock' },
    status: 'active',
    categories: ['category-4'],
    sku: 'P008',
    supplierId: '1',
    supplierName: 'Supplier',
    specifications: {},
    attributes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isFeatured: true,
    isVirtual: false,
    isDownloadable: false,
    viewCount: 0,
    salesCount: 0,
    rating: 0,
    reviewCount: 0
  } as Product
];

// Reverted categories to generic/less specific structure
const categories = [
  { value: '', label: 'All Products' },
  { value: 'category-1', label: 'Category 1' },
  { value: 'category-2', label: 'Category 2' },
  { value: 'category-3', label: 'Category 3' },
  { value: 'category-4', label: 'Category 4' }
];

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' }
];

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (sortBy) params.set('sort', sortBy);
    setSearchParams(params);
  }, [search, category, sortBy, setSearchParams]);

  const { data: products = mockProducts, isLoading } = useQuery({
    queryKey: ['products', { search, category, sortBy }],
    queryFn: async () => {
      let filtered = [...mockProducts];
      if (search) {
        filtered = filtered.filter((p: any) =>
          p.name.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (category) {
        filtered = filtered.filter((p: any) => p.categories.includes(category));
      }
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'price-asc': return a.pricing.customer - b.pricing.customer;
          case 'price-desc': return b.pricing.customer - a.pricing.customer;
          default: return 0;
        }
      });
      return filtered;
    }
  });

  const handleAddToCart = () => { };
  const handleSearch = (e: FormEvent) => { e.preventDefault(); };
  const clearFilters = () => { setSearch(''); setCategory(''); setSortBy('newest'); };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Shop</h1>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              className="pl-10"
            />
          </form>
          <Button
            type="button"
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>

        {showFilters && (
          <Card className="p-6 bg-gray-50 border-none">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-sm">Filters</h3>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                Reset <X className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="bg-white"
                >
                  {categories.map((cat: any) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort By</label>
                <Select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-white"
                >
                  {sortOptions.map((option: any) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>
        )}

        <div className="flex justify-end items-center">
          <div className="flex items-center border rounded-md p-1 bg-gray-50">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7 rounded-sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7 rounded-sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-24">Loading...</div>
      ) : products.length > 0 ? (
        <ProductGrid
          products={products}
          columns={viewMode === 'grid' ? 4 : 1}
          onAddToCart={handleAddToCart}
        />
      ) : (
        <div className="text-center py-24 bg-gray-50 rounded-xl">
          <p className="text-lg font-medium text-gray-900 mb-1">No products found.</p>
          <Button variant="link" onClick={clearFilters} className="mt-2 text-primary">
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
}