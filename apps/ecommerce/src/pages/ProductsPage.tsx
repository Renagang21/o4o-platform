import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Input, Button, Select, Card } from '@o4o/ui';
import { Search, Filter, Grid, List } from 'lucide-react';
import { Product } from '@o4o/types';
import { ProductGrid } from '@/components/product';

// Mock data - replace with actual API call
const mockProducts: Product[] = [
  {
    id: '1',
    name: '프리미엄 무선 헤드폰',
    slug: 'premium-wireless-headphones',
    sku: 'WH-001',
    description: '최고급 사운드와 노이즈 캔슬링 기능을 갖춘 프리미엄 헤드폰',
    shortDescription: '프리미엄 무선 헤드폰',
    pricing: {
      customer: 89000,
      business: 80100,
      affiliate: 84550,
      retailer: {
        gold: 84550,
        premium: 82000,
        vip: 80100
      }
    },
    inventory: {
      stockQuantity: 15,
      minOrderQuantity: 1,
      lowStockThreshold: 5,
      manageStock: true,
      allowBackorder: false,
      stockStatus: 'in_stock' as const
    },
    categories: ['1'], // category IDs
    tags: [],
    images: [{
      id: '1',
      url: 'https://via.placeholder.com/400x400',
      alt: '헤드폰',
      sortOrder: 0,
      isFeatured: true
    }],
    featuredImageUrl: 'https://via.placeholder.com/400x400',
    isFeatured: true,
    status: 'active' as const,
    approvalStatus: 'approved' as const,
    supplierId: '1',
    supplierName: '테크 서플라이',
    specifications: {},
    attributes: {},
    viewCount: 0,
    salesCount: 0,
    rating: 4.5,
    reviewCount: 128,
    isVirtual: false,
    isDownloadable: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin'
  },
  {
    id: '2',
    name: '스마트 워치 프로',
    slug: 'smart-watch-pro',
    sku: 'SW-PRO-001',
    description: '건강 관리와 피트니스 추적을 위한 스마트 워치',
    shortDescription: '스마트 워치',
    pricing: {
      customer: 259000,
      business: 233100,
      affiliate: 246050,
      retailer: {
        gold: 246050,
        premium: 238780,
        vip: 233100
      }
    },
    inventory: {
      stockQuantity: 8,
      minOrderQuantity: 1,
      lowStockThreshold: 3,
      manageStock: true,
      allowBackorder: false,
      stockStatus: 'in_stock' as const
    },
    categories: ['1'], // category IDs
    tags: [],
    images: [{
      id: '2',
      url: 'https://via.placeholder.com/400x400',
      alt: '스마트워치',
      sortOrder: 0,
      isFeatured: true
    }],
    featuredImageUrl: 'https://via.placeholder.com/400x400',
    isFeatured: true,
    status: 'active' as const,
    approvalStatus: 'approved' as const,
    supplierId: '1',
    supplierName: '테크 서플라이',
    specifications: {},
    attributes: {},
    viewCount: 0,
    salesCount: 0,
    rating: 4.8,
    reviewCount: 89,
    isVirtual: false,
    isDownloadable: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin'
  },
  {
    id: '3',
    name: '블루투스 키보드',
    slug: 'bluetooth-keyboard',
    sku: 'KB-BT-001',
    description: '편안한 타이핑을 위한 인체공학적 블루투스 키보드',
    shortDescription: '블루투스 키보드',
    pricing: {
      customer: 59000,
      business: 53100,
      affiliate: 56050,
      retailer: {
        gold: 56050,
        premium: 54280,
        vip: 53100
      }
    },
    inventory: {
      stockQuantity: 25,
      minOrderQuantity: 1,
      lowStockThreshold: 5,
      manageStock: true,
      allowBackorder: false,
      stockStatus: 'in_stock' as const
    },
    categories: ['2'], // category IDs
    tags: [],
    images: [{
      id: '3',
      url: 'https://via.placeholder.com/400x400',
      alt: '키보드',
      sortOrder: 0,
      isFeatured: true
    }],
    featuredImageUrl: 'https://via.placeholder.com/400x400',
    isFeatured: false,
    status: 'active' as const,
    approvalStatus: 'approved' as const,
    supplierId: '1',
    supplierName: '테크 서플라이',
    specifications: {},
    attributes: {},
    viewCount: 0,
    salesCount: 0,
    rating: 4.2,
    reviewCount: 45,
    isVirtual: false,
    isDownloadable: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin'
  }
];

const categories = [
  { value: '', label: '모든 카테고리' },
  { value: 'electronics', label: '전자제품' },
  { value: 'computer-accessories', label: '컴퓨터 액세서리' },
  { value: 'home-appliances', label: '가전제품' },
  { value: 'fashion', label: '패션' }
];

const sortOptions = [
  { value: 'newest', label: '최신순' },
  { value: 'price-asc', label: '가격 낮은순' },
  { value: 'price-desc', label: '가격 높은순' },
  { value: 'rating', label: '평점순' },
  { value: 'popular', label: '인기순' }
];

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Filter states
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // Price range
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (sortBy) params.set('sort', sortBy);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    setSearchParams(params);
  }, [search, category, sortBy, minPrice, maxPrice, setSearchParams]);

  // Fetch products
  const { data: products = mockProducts, isLoading } = useQuery({
    queryKey: ['products', { search, category, sortBy, minPrice, maxPrice }],
    queryFn: async () => {
      // TODO: Replace with actual API call
      // const response = await authClient.api.get('/api/v1/products', {
      //   params: { search, category, sortBy, minPrice, maxPrice }
      // });
      // return response.data;
      
      // Mock filtering and sorting
      let filtered = [...mockProducts];
      
      if (search) {
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description?.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      if (category) {
        // For now, just check if category '1' is electronics, '2' is computer-accessories
        const categoryMap: Record<string, string> = {
          'electronics': '1',
          'computer-accessories': '2'
        };
        const categoryId = categoryMap[category];
        if (categoryId) {
          filtered = filtered.filter(p => p.categories.includes(categoryId));
        }
      }
      
      if (minPrice) {
        filtered = filtered.filter(p => p.pricing.customer >= Number(minPrice));
      }
      
      if (maxPrice) {
        filtered = filtered.filter(p => p.pricing.customer <= Number(maxPrice));
      }
      
      // Sort
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'price-asc':
            return a.pricing.customer - b.pricing.customer;
          case 'price-desc':
            return b.pricing.customer - a.pricing.customer;
          case 'rating':
            return (b.rating || 0) - (a.rating || 0);
          default:
            return 0;
        }
      });
      
      return filtered;
    }
  });

  const handleAddToCart = () => {
    // TODO: Implement add to cart
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already handled by useEffect
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setSortBy('newest');
    setMinPrice('');
    setMaxPrice('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">상품 목록</h1>
        <p className="text-muted-foreground">
          {products.length}개의 상품이 있습니다.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="상품 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">검색</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            필터
          </Button>
        </form>

        {/* Filter Panel */}
        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">카테고리</label>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">최소 가격</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">최대 가격</label>
                <Input
                  type="number"
                  placeholder="999999"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
              
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  필터 초기화
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Sort and View Mode */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">정렬:</label>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-40"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Products */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">상품을 불러오는 중...</p>
        </div>
      ) : (
        <ProductGrid
          products={products}
          columns={viewMode === 'grid' ? 4 : 1}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
}