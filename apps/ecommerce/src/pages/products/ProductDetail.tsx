import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProduct, useAddToCart } from '@/hooks';
import { useWishlistStore } from '@/stores';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { StockStatus } from '@/components/common/StockStatus';
import { ProductReviewSection } from '@/components/review';
import { Button } from '@o4o/ui';
import { Badge } from '@o4o/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@o4o/ui';
import { Skeleton } from '@o4o/ui';
import { Alert, AlertDescription } from '@o4o/ui';
import { 
  ShoppingCart, 
  Heart, 
  Share2, 
  Package, 
  Shield, 
  Truck,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@o4o/utils';
import { useAuth } from '@o4o/auth-context';

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: product, isLoading, error } = useProduct(id!);
  const addToCart = useAddToCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlistStore();
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="container py-8">
        <Alert className="border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            상품을 불러오는 중 오류가 발생했습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const inWishlist = isInWishlist(product.id);
  const selectedImage = product.images[selectedImageIndex] || product.images[0];

  const handleAddToCart = () => {
    addToCart.mutate(
      { product, quantity },
      {
        onSuccess: () => {
          toast.success('장바구니에 추가되었습니다.');
        }
      }
    );
  };

  const handleWishlistToggle = () => {
    if (inWishlist) {
      removeFromWishlist(product.id);
      toast.success('위시리스트에서 제거되었습니다.');
    } else {
      addToWishlist(product);
      toast.success('위시리스트에 추가되었습니다.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.shortDescription,
          url: window.location.href
        });
      } catch (err: any) {
    // Error logging - use proper error handler
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 복사되었습니다.');
    }
  };

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
            <img
              src={selectedImage?.url || '/placeholder-product.png'}
              alt={selectedImage?.alt || product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    'aspect-square overflow-hidden rounded-md bg-gray-100 ring-2 ring-transparent hover:ring-gray-300',
                    selectedImageIndex === index && 'ring-primary'
                  )}
                >
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {product.brand && (
                <Badge variant="secondary">{product.brand}</Badge>
              )}
              {product.isFeatured && (
                <Badge variant="default">추천 상품</Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            {product.subtitle && (
              <p className="text-lg text-gray-700 mb-2">{product.subtitle}</p>
            )}
            {product.shortDescription && (
              <p className="text-gray-600">{product.shortDescription}</p>
            )}
          </div>

          {/* Price */}
          <div className="pb-6 border-b">
            <PriceDisplay
              price={product.pricing.customer}
              priceByRole={product.pricing}
              userRole={user?.role}
              size="lg"
              showSavings
            />
          </div>

          {/* Stock & SKU */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">재고 상태</span>
              <StockStatus 
                stockQuantity={product.inventory.stockQuantity}
                lowStockThreshold={product.inventory.lowStockThreshold}
                manageStock={product.inventory.manageStock}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">상품 코드</span>
              <span className="text-sm">{product.sku}</span>
            </div>
          </div>

          {/* Quantity & Actions */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">수량</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e: any) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center border rounded-md px-2 py-1"
                  min="1"
                  max={product.inventory.maxOrderQuantity || 999}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={quantity >= (product.inventory.maxOrderQuantity || 999)}
                >
                  +
                </Button>
              </div>
              {product.inventory.minOrderQuantity > 1 && (
                <p className="text-sm text-gray-600 mt-1">
                  최소 주문 수량: {product.inventory.minOrderQuantity}개
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                size="lg"
                onClick={handleAddToCart}
                disabled={
                  product.inventory.stockStatus === 'out_of_stock' ||
                  quantity < product.inventory.minOrderQuantity ||
                  addToCart.isPending
                }
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                장바구니 담기
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleWishlistToggle}
              >
                <Heart
                  className={cn(
                    'w-5 h-5',
                    inWishlist && 'fill-current text-red-500'
                  )}
                />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleShare}
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t">
            <div className="text-center">
              <Truck className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm">무료 배송</p>
              <p className="text-xs text-gray-500">5만원 이상</p>
            </div>
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm">품질 보증</p>
              <p className="text-xs text-gray-500">30일 환불</p>
            </div>
            <div className="text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm">안전 포장</p>
              <p className="text-xs text-gray-500">파손 보상</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="description" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="description">상품 설명</TabsTrigger>
          <TabsTrigger value="specs">상세 정보</TabsTrigger>
          <TabsTrigger value="product-info">상품 정보</TabsTrigger>
          <TabsTrigger value="usage">사용/주의</TabsTrigger>
          <TabsTrigger value="shipping">배송 정보</TabsTrigger>
          <TabsTrigger value="reviews">
            리뷰 ({product.reviewCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-6">
          <div 
            className="prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </TabsContent>

        <TabsContent value="specs" className="mt-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold mb-4">제품 사양</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="flex">
                  <dt className="font-medium text-gray-600 w-32">{key}</dt>
                  <dd className="text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="product-info" className="mt-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold mb-4">상품 정보</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.manufacturer && (
                <div className="flex">
                  <dt className="font-medium text-gray-600 w-32">제조사</dt>
                  <dd className="text-gray-900">{product.manufacturer}</dd>
                </div>
              )}
              {product.originCountry && (
                <div className="flex">
                  <dt className="font-medium text-gray-600 w-32">원산지</dt>
                  <dd className="text-gray-900">{product.originCountry}</dd>
                </div>
              )}
              {product.legalCategory && (
                <div className="flex">
                  <dt className="font-medium text-gray-600 w-32">법적 분류</dt>
                  <dd className="text-gray-900">{product.legalCategory}</dd>
                </div>
              )}
              {product.certificationIds && product.certificationIds.length > 0 && (
                <div className="flex">
                  <dt className="font-medium text-gray-600 w-32">인증/허가 번호</dt>
                  <dd className="text-gray-900">
                    <ul className="space-y-1">
                      {product.certificationIds.map((cert: string, index: number) => (
                        <li key={index}>{cert}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="mt-6">
          <div className="space-y-6">
            {product.usageInfo && (
              <div>
                <h3 className="font-semibold mb-2">사용 정보</h3>
                <div className="prose prose-gray max-w-none text-gray-600">
                  {product.usageInfo}
                </div>
              </div>
            )}
            {product.cautionInfo && (
              <div>
                <h3 className="font-semibold mb-2">주의사항</h3>
                <div className="prose prose-gray max-w-none text-gray-600">
                  {product.cautionInfo}
                </div>
              </div>
            )}
            {!product.usageInfo && !product.cautionInfo && (
              <p className="text-gray-500 text-center py-8">사용 및 주의 정보가 없습니다.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="shipping" className="mt-6">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">배송 정보</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• 주문 후 1-2일 내 발송</li>
                <li>• 평균 배송 기간: 2-3일</li>
                <li>• 제주/도서산간 지역 추가 요금 발생</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">반품/교환 안내</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• 상품 수령 후 7일 이내 가능</li>
                <li>• 단순 변심 시 왕복 배송비 고객 부담</li>
                <li>• 상품 하자 시 무료 반품/교환</li>
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <ProductReviewSection product={product} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="space-y-4">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i: any) => (
              <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-10 w-3/4 mb-2" />
            <Skeleton className="h-6 w-full" />
          </div>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}