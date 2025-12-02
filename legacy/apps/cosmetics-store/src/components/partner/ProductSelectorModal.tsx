import { useState, useEffect } from 'react';
import { fetchProducts } from '../../services/api';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  metadata?: {
    cosmetics?: {
      skinType?: string[];
      concerns?: string[];
      productCategory?: string;
    };
  };
}

interface ProductSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
}

export default function ProductSelectorModal({ isOpen, onClose, onSelect }: ProductSelectorModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [skinType, setSkinType] = useState<string[]>([]);
  const [concerns, setConcerns] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen, search, category, skinType, concerns]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetchProducts({
        search,
        category,
        skinType,
        concerns,
        limit: 20,
      });
      setProducts(response.data?.products || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (product: Product) => {
    onSelect(product);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">제품 선택</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="제품명 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 카테고리</option>
              <option value="skincare">스킨케어</option>
              <option value="cleansing">클렌징</option>
              <option value="makeup">메이크업</option>
              <option value="suncare">선케어</option>
              <option value="mask">마스크팩</option>
              <option value="bodycare">바디케어</option>
              <option value="haircare">헤어케어</option>
            </select>

            <select
              onChange={(e) => {
                const value = e.target.value;
                if (value && !skinType.includes(value)) {
                  setSkinType([...skinType, value]);
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">피부타입 추가</option>
              <option value="dry">건성</option>
              <option value="oily">지성</option>
              <option value="combination">복합성</option>
              <option value="sensitive">민감성</option>
              <option value="normal">중성</option>
            </select>

            <select
              onChange={(e) => {
                const value = e.target.value;
                if (value && !concerns.includes(value)) {
                  setConcerns([...concerns, value]);
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">피부고민 추가</option>
              <option value="acne">여드름</option>
              <option value="whitening">미백</option>
              <option value="wrinkle">주름</option>
              <option value="pore">모공</option>
              <option value="soothing">진정</option>
              <option value="moisturizing">보습</option>
              <option value="elasticity">탄력</option>
              <option value="trouble">트러블</option>
            </select>
          </div>

          {/* Active Filters */}
          {(skinType.length > 0 || concerns.length > 0) && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {skinType.map((type) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                >
                  {type}
                  <button
                    onClick={() => setSkinType(skinType.filter((t) => t !== type))}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
              {concerns.map((concern) => (
                <span
                  key={concern}
                  className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm"
                >
                  {concern}
                  <button
                    onClick={() => setConcerns(concerns.filter((c) => c !== concern))}
                    className="hover:text-orange-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">로딩 중...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">검색 결과가 없습니다</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleSelect(product)}
                >
                  <div className="flex gap-4">
                    {product.images?.[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                      <div className="text-sm text-gray-500">
                        {product.metadata?.cosmetics?.productCategory && (
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs mr-2">
                            {product.metadata.cosmetics.productCategory}
                          </span>
                        )}
                        <span className="font-semibold text-blue-600">
                          ₩{product.price?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(product);
                    }}
                    className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
                  >
                    루틴에 추가
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
