import React, { useState, useRef } from 'react';
import { ProductListBlockData } from '../types';
import { Product, recommendedProducts, newProducts, popularProducts } from '../sampleData';
import { Button, Card, CardContent, Badge } from '@o4o/shared/ui';
import { Edit2, Star, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductListBlockProps {
  data: ProductListBlockData;
  isEditing: boolean;
  onEdit?: (data: ProductListBlockData) => void;
}

export const ProductListBlock: React.FC<ProductListBlockProps> = ({
  data,
  isEditing,
  onEdit
}) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(data);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSave = () => {
    if (onEdit) {
      onEdit(formData);
    }
    setEditMode(false);
  };

  const handleCancel = () => {
    setFormData(data);
    setEditMode(false);
  };

  // Get products based on type
  const getProductList = () => {
    switch (data.productType) {
      case 'recommended':
        return recommendedProducts;
      case 'new':
        return newProducts;
      case 'popular':
        return popularProducts;
      default:
        return recommendedProducts;
    }
  };

  const products = data.productIds
    .map(id => getProductList().find(product => product.id === id))
    .filter(Boolean) as Product[];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320; // Card width + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const renderProductCard = (product: Product) => (
    <Card key={product.id} className="h-full hover:shadow-lg transition-shadow group">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.badges && product.badges.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {product.badges.map((badge, index) => (
              <Badge
                key={index}
                variant={badge.includes('할인') ? 'destructive' : badge.includes('NEW') ? 'default' : 'secondary'}
                className="text-xs"
              >
                {badge}
              </Badge>
            ))}
          </div>
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button size="sm" variant="secondary" className="bg-white text-black hover:bg-gray-100">
            <ShoppingCart className="w-4 h-4 mr-1" />
            장바구니
          </Button>
        </div>
      </div>
      
      <CardContent className="p-4">
        <p className="text-sm text-gray-500 mb-1">{product.brand}</p>
        <h3 className="font-medium mb-2 line-clamp-2">{product.name}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
        
        {data.showPrice && (
          <div className="mb-2">
            {product.discountPrice ? (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-red-600">
                  {product.discountPrice.toLocaleString()}원
                </span>
                <span className="text-sm text-gray-400 line-through">
                  {product.price.toLocaleString()}원
                </span>
              </div>
            ) : (
              <span className="text-lg font-bold">
                {product.price.toLocaleString()}원
              </span>
            )}
          </div>
        )}
        
        {data.showRating && (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{product.rating}</span>
            </div>
            <span className="text-gray-500">({product.reviewCount.toLocaleString()})</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isEditing && editMode) {
    const allProducts = [...recommendedProducts, ...newProducts, ...popularProducts];
    
    return (
      <div className="relative bg-gray-50 p-8 rounded-lg border-2 border-blue-500">
        <div className="absolute top-4 right-4 flex gap-2">
          <Button onClick={handleSave} size="sm" variant="default">
            저장
          </Button>
          <Button onClick={handleCancel} size="sm" variant="outline">
            취소
          </Button>
        </div>
        
        <h3 className="text-lg font-semibold mb-6">제품 리스트 편집</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">섹션 제목</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">제품 타입</label>
              <select
                value={formData.productType}
                onChange={(e) => setFormData({ ...formData, productType: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="recommended">추천 제품</option>
                <option value="new">신제품</option>
                <option value="popular">인기 제품</option>
                <option value="custom">직접 선택</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">부제목 (선택)</label>
            <input
              type="text"
              value={formData.subtitle || ''}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">레이아웃</label>
              <select
                value={formData.layout}
                onChange={(e) => setFormData({ ...formData, layout: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="grid">그리드</option>
                <option value="horizontal-scroll">가로 스크롤</option>
                <option value="list">리스트</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">컬럼 수 (그리드)</label>
              <input
                type="number"
                value={formData.columns}
                onChange={(e) => setFormData({ ...formData, columns: parseInt(e.target.value) })}
                min={2}
                max={6}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.showPrice}
                onChange={(e) => setFormData({ ...formData, showPrice: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium">가격 표시</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.showRating}
                onChange={(e) => setFormData({ ...formData, showRating: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium">평점 표시</span>
            </label>
          </div>
          
          {formData.productType === 'custom' && (
            <div>
              <label className="block text-sm font-medium mb-1">제품 선택</label>
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                {allProducts.map(product => (
                  <label key={product.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.productIds.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            productIds: [...formData.productIds, product.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            productIds: formData.productIds.filter(id => id !== product.id)
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{product.brand} - {product.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{data.title}</h2>
            {data.subtitle && (
              <p className="text-gray-600">{data.subtitle}</p>
            )}
          </div>
          
          {isEditing && (
            <Button
              onClick={() => setEditMode(true)}
              size="sm"
              variant="outline"
            >
              <Edit2 className="w-4 h-4 mr-1" />
              편집
            </Button>
          )}
        </div>
        
        {data.layout === 'grid' && (
          <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-${data.columns} gap-6`}>
            {products.map(renderProductCard)}
          </div>
        )}
        
        {data.layout === 'horizontal-scroll' && (
          <div className="relative">
            <div
              ref={scrollRef}
              className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {products.map(product => (
                <div key={product.id} className="flex-shrink-0 w-72">
                  {renderProductCard(product)}
                </div>
              ))}
            </div>
            
            <button
              onClick={() => scroll('left')}
              className="absolute -left-4 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="absolute -right-4 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
        
        {data.layout === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map(product => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <div className="flex">
                  <div className="w-1/3 aspect-square">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-l-lg"
                    />
                  </div>
                  <CardContent className="flex-1 p-4">
                    <p className="text-sm text-gray-500 mb-1">{product.brand}</p>
                    <h3 className="font-medium text-lg mb-2">{product.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                    
                    <div className="flex items-center justify-between">
                      {data.showPrice && (
                        <div>
                          {product.discountPrice ? (
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-bold text-red-600">
                                {product.discountPrice.toLocaleString()}원
                              </span>
                              <span className="text-sm text-gray-400 line-through">
                                {product.price.toLocaleString()}원
                              </span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold">
                              {product.price.toLocaleString()}원
                            </span>
                          )}
                        </div>
                      )}
                      
                      {data.showRating && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{product.rating}</span>
                          </div>
                          <span className="text-gray-500">({product.reviewCount})</span>
                        </div>
                      )}
                    </div>
                    
                    {product.badges && product.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {product.badges.map((badge, index) => (
                          <Badge
                            key={index}
                            variant={badge.includes('할인') ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};