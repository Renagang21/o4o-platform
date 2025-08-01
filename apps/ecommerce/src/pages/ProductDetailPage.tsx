import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Card, Tabs, TabsContent, TabsList, TabsTrigger } from '@o4o/ui';
import { ShoppingCart, Heart, Share2, ChevronLeft, ChevronRight, Package, Truck, Shield, Star } from 'lucide-react';
import { Product } from '@o4o/types';
import { PriceDisplay, StockStatus } from '@/components/common';
import { ProductGrid } from '@/components/product';
import { ProductReviewSection } from '@/components/review';
import { useAuth } from '@o4o/auth-context';

// Mock data - replace with actual API call
const mockProduct: Product = {
  id: '1',
  name: '프리미엄 무선 헤드폰',
  slug: 'premium-wireless-headphones',
  sku: 'WH-001',
  description: '최고급 사운드와 노이즈 캔슬링 기능을 갖춘 프리미엄 헤드폰입니다. 장시간 착용해도 편안한 인체공학적 디자인과 함께 최대 30시간의 배터리 수명을 제공합니다.',
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
  tags: ['무선', '노이즈캔슬링', '블루투스'],
  images: [
    { 
      id: '1', 
      url: 'https://via.placeholder.com/600x600', 
      alt: '헤드폰 정면',
      sortOrder: 0,
      isFeatured: true
    },
    { 
      id: '2', 
      url: 'https://via.placeholder.com/600x600', 
      alt: '헤드폰 측면',
      sortOrder: 1,
      isFeatured: false
    },
    { 
      id: '3', 
      url: 'https://via.placeholder.com/600x600', 
      alt: '헤드폰 착용',
      sortOrder: 2,
      isFeatured: false
    }
  ],
  featuredImageUrl: 'https://via.placeholder.com/600x600',
  isFeatured: true,
  status: 'active' as const,
  approvalStatus: 'approved' as const,
  supplierId: '1',
  supplierName: '테크 서플라이',
  specifications: {
    '색상': '블랙',
    '연결방식': '블루투스 5.0',
    '배터리': '최대 30시간',
    '충전시간': '2시간'
  },
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
};

const relatedProducts: Product[] = [];

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  useAuth(); // for authentication check
  
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlist, setIsWishlist] = useState(false);

  // Fetch product details
  const { data: product = mockProduct, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      // TODO: Replace with actual API call
      // const response = await authClient.api.get(`/api/v1/products/${id}`);
      // return response.data;
      return mockProduct;
    }
  });

  const handleQuantityChange = (value: number) => {
    if (value >= 1 && value <= product.inventory.stockQuantity) {
      setQuantity(value);
    }
  };

  const handleAddToCart = () => {
    // TODO: Implement add to cart
    // TODO: Implement add to cart
    // addToCart(product.id, quantity);
  };

  const handleBuyNow = () => {
    // TODO: Add to cart and navigate to checkout
    handleAddToCart();
    navigate('/checkout');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: window.location.href
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">상품 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">상품을 찾을 수 없습니다.</p>
        <Button onClick={() => navigate('/products')} className="mt-4">
          상품 목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">홈</a>
        <span className="mx-2">/</span>
        <a href="/products" className="hover:text-foreground">상품</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      {/* Product Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            {product.images && product.images[selectedImage] ? (
              <img
                src={product.images[selectedImage].url}
                alt={product.images[selectedImage].alt}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="w-20 h-20 text-muted-foreground" />
              </div>
            )}
            
            {/* Image Navigation */}
            {product.images && product.images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImage(prev => prev > 0 ? prev - 1 : product.images!.length - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedImage(prev => prev < product.images!.length - 1 ? prev + 1 : 0)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
          
          {/* Thumbnail Images */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(index)}
                  className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? 'border-primary' : 'border-muted'
                  }`}
                >
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            
            {/* Rating */}
            {product.rating && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating!)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.rating} ({product.reviewCount || 0}개 리뷰)
                </span>
              </div>
            )}

            {/* Price */}
            <PriceDisplay
              price={product.pricing.customer}
              size="xl"
              showSavings
            />
          </div>

          {/* Stock Status */}
          <StockStatus
            stockQuantity={product.inventory.stockQuantity}
            manageStock={product.inventory.manageStock}
            showQuantity
          />

          {/* Options */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div className="space-y-4">
              {Object.entries(product.attributes).map(([key, value]) => (
                <div key={key}>
                  <label className="text-sm font-medium mb-1 block">{key}</label>
                  <div className="font-medium">{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity and Actions */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">수량</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(Number(e.target.value))}
                  className="w-20 text-center"
                  min={1}
                  max={product.inventory.stockQuantity}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= product.inventory.stockQuantity}
                >
                  +
                </Button>
                <span className="text-sm text-muted-foreground ml-2">
                  (재고: {product.inventory.stockQuantity}개)
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddToCart}
                disabled={product.inventory.stockQuantity === 0}
                className="flex-1"
                size="lg"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                장바구니 담기
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={product.inventory.stockQuantity === 0}
                variant="default"
                size="lg"
              >
                바로 구매
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsWishlist(!isWishlist)}
              >
                <Heart className={`w-5 h-5 ${isWishlist ? 'fill-current text-red-500' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 py-4 border-y">
            <div className="text-center">
              <Truck className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">무료배송</p>
              <p className="text-xs text-muted-foreground">5만원 이상</p>
            </div>
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">품질보증</p>
              <p className="text-xs text-muted-foreground">1년 보증</p>
            </div>
            <div className="text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">교환/반품</p>
              <p className="text-xs text-muted-foreground">14일 이내</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="description" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="description">상품 설명</TabsTrigger>
          <TabsTrigger value="specs">상품 사양</TabsTrigger>
          <TabsTrigger value="reviews">상품 리뷰</TabsTrigger>
        </TabsList>
        
        <TabsContent value="description" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">상품 설명</h3>
            <div className="prose max-w-none">
              <p>{product.description}</p>
              {product.description && (
                <div dangerouslySetInnerHTML={{ __html: product.description }} />
              )}
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="specs" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">상품 사양</h3>
            {product.attributes && Object.keys(product.attributes).length > 0 ? (
              <table className="w-full">
                <tbody>
                  {Object.entries(product.attributes).map(([key, value], index) => (
                    <tr key={key} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                      <td className="py-2 px-4 font-medium">{key}</td>
                      <td className="py-2 px-4">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted-foreground">상품 사양 정보가 없습니다.</p>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="reviews" className="mt-6">
          <ProductReviewSection product={product} />
        </TabsContent>
      </Tabs>

      {/* Related Products */}
      <div>
        <h2 className="text-2xl font-bold mb-6">관련 상품</h2>
        <ProductGrid
          products={relatedProducts}
          columns={4}
          onAddToCart={() => {
            // TODO: Implement add to cart
          }}
        />
      </div>
    </div>
  );
}