import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupplierPublicProfile, useSupplierPublicProducts } from '@/hooks';
import { ProductGrid } from '@/components/product';
import { Button } from '@o4o/ui';
import { Card, CardContent, CardHeader } from '@o4o/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@o4o/ui';
import { Badge } from '@o4o/ui';
import { Skeleton } from '@o4o/ui';
import { Alert, AlertDescription } from '@o4o/ui';
import { 
  Store, 
  Package, 
  Truck, 
  Shield, 
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export function SupplierShop() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [productFilters, setProductFilters] = useState({
    limit: 12,
    page: 1
  });

  // Fetch supplier profile
  const { 
    data: supplier, 
    isLoading: supplierLoading, 
    error: supplierError 
  } = useSupplierPublicProfile(slug!);

  // Fetch supplier products
  const { 
    data: productsData, 
    isLoading: productsLoading 
  } = useSupplierPublicProducts(supplier?.id || '', productFilters);

  if (supplierLoading) {
    return <SupplierShopSkeleton />;
  }

  if (supplierError || !supplier) {
    return (
      <div className="container py-8">
        <Alert className="border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            매장을 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => navigate('/products')} 
          className="mt-4"
        >
          상품 목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Banner Section */}
      <div className="relative h-64 bg-gray-100">
        {supplier.banner ? (
          <img
            src={supplier.banner}
            alt={`${supplier.storeName} 배너`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600" />
        )}
        
        {/* Store Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
          <div className="container">
            <div className="flex items-end gap-6">
              {/* Logo */}
              <div className="relative -mb-12">
                {supplier.logo ? (
                  <img
                    src={supplier.logo}
                    alt={supplier.storeName}
                    className="w-24 h-24 rounded-lg border-4 border-white bg-white object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg border-4 border-white bg-white flex items-center justify-center">
                    <Store className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Store Name & Badges */}
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white">
                    {supplier.storeName}
                  </h1>
                  {supplier.isVerified && (
                    <Badge className="bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      인증 판매자
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8 mt-8">
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">
              상품 ({supplier.totalProducts || 0})
            </TabsTrigger>
            <TabsTrigger value="info">매장 정보</TabsTrigger>
            <TabsTrigger value="policies">정책</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-6">
            {productsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-80" />
                ))}
              </div>
            ) : productsData && productsData.products.length > 0 ? (
              <>
                <ProductGrid
                  products={productsData.products}
                  onAddToCart={() => {
                    // TODO: Implement add to cart
                  }}
                />
                
                {/* Pagination */}
                {productsData.pagination.totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {[...Array(productsData.pagination.totalPages)].map((_, i) => (
                      <Button
                        key={i}
                        variant={productFilters.page === i + 1 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setProductFilters({ ...productFilters, page: i + 1 })}
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">아직 등록된 상품이 없습니다.</p>
              </div>
            )}
          </TabsContent>

          {/* Store Info Tab */}
          <TabsContent value="info" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* About */}
              {supplier.description && (
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold">매장 소개</h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 whitespace-pre-line">
                      {supplier.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold">연락처</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  {supplier.businessHours && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">영업 시간</p>
                        <p className="text-gray-600 text-sm">{supplier.businessHours}</p>
                      </div>
                    </div>
                  )}
                  
                  {(supplier.city || supplier.state) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">위치</p>
                        <p className="text-gray-600 text-sm">
                          {[supplier.city, supplier.state].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Store Stats */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold">매장 정보</h3>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">등록 상품</dt>
                      <dd className="font-medium">{supplier.totalProducts || 0}개</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">운영 기간</dt>
                      <dd className="font-medium">
                        {new Date(supplier.createdAt).getFullYear()}년부터
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="mt-6">
            <div className="space-y-6">
              {/* Shipping Policy */}
              {supplier.shippingPolicy && (
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      배송 정책
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 whitespace-pre-line">
                      {supplier.shippingPolicy}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Return Policy */}
              {supplier.returnPolicy && (
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      반품/교환 정책
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 whitespace-pre-line">
                      {supplier.returnPolicy}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Warranty Policy */}
              {supplier.warrantyPolicy && (
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      보증 정책
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 whitespace-pre-line">
                      {supplier.warrantyPolicy}
                    </p>
                  </CardContent>
                </Card>
              )}

              {!supplier.shippingPolicy && !supplier.returnPolicy && !supplier.warrantyPolicy && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">정책 정보가 등록되지 않았습니다.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SupplierShopSkeleton() {
  return (
    <div className="min-h-screen">
      <Skeleton className="h-64 w-full" />
      <div className="container py-8 mt-8">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    </div>
  );
}