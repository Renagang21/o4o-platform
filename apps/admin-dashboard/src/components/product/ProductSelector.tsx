import { FC, useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Package, X } from 'lucide-react';
import { authClient } from '@o4o/auth-client';

export interface Product {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  imageUrl?: string;
  status?: string;
}

interface ProductSelectorProps {
  value: string;
  onChange: (productId: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const ProductSelector: FC<ProductSelectorProps> = ({
  value,
  onChange,
  placeholder = '상품 선택',
  className = '',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load products when dropdown opens
    if (isOpen && products.length === 0) {
      fetchProducts();
    }
  }, [isOpen]);

  useEffect(() => {
    // Find selected product from value
    if (value && products.length > 0) {
      const product = products.find(p => p.id === value);
      if (product) {
        setSelectedProduct(product);
      }
    }
  }, [value, products]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProducts = async (search?: string) => {
    setLoading(true);

    try {
      // Try fetching from products API
      const params: any = { limit: 50 };
      if (search) params.search = search;

      const response = await authClient.api.get('/api/products', { params });

      if (response.data && Array.isArray(response.data)) {
        setProducts(response.data);
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        setProducts(response.data.data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      // Fallback: use empty array
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      fetchProducts(query);
    } else if (query.length === 0) {
      fetchProducts();
    }
  };

  const handleSelect = (product: Product) => {
    setSelectedProduct(product);
    onChange(product.id);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProduct(null);
    onChange('');
  };

  const filteredProducts = searchQuery
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  const formatPrice = (price?: number) => {
    if (!price) return '';
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selector Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between ${
          required && !value ? 'border-red-300' : ''
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedProduct ? (
            <>
              {selectedProduct.imageUrl && (
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-8 h-8 object-cover rounded"
                />
              )}
              {!selectedProduct.imageUrl && (
                <Package className="w-5 h-5 text-gray-400" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {selectedProduct.name}
                </div>
                {selectedProduct.sku && (
                  <div className="text-xs text-gray-500">
                    SKU: {selectedProduct.sku}
                  </div>
                )}
              </div>
              {selectedProduct.price && (
                <div className="text-sm text-gray-600">
                  {formatPrice(selectedProduct.price)}
                </div>
              )}
            </>
          ) : (
            <>
              <Package className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500">{placeholder}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedProduct && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="상품명 또는 SKU 검색..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Product List */}
          <div className="overflow-y-auto max-h-80">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full" />
                <div className="mt-2">상품 불러오는 중...</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery ? '검색 결과가 없습니다' : '등록된 상품이 없습니다'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelect(product)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-3 ${
                      selectedProduct?.id === product.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {product.name}
                      </div>
                      {product.sku && (
                        <div className="text-xs text-gray-500">
                          SKU: {product.sku}
                        </div>
                      )}
                    </div>
                    {product.price && (
                      <div className="text-sm text-gray-600 font-medium">
                        {formatPrice(product.price)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual ID Input */}
          <div className="p-2 border-t bg-gray-50">
            <div className="text-xs text-gray-600 mb-1">
              또는 직접 상품 ID 입력:
            </div>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="prod_xxx"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSelector;
