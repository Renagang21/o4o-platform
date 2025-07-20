import { Link } from 'react-router-dom';
import { Button } from '@o4o/ui';
import { ArrowRight, Package, Shield, Truck } from 'lucide-react';
import { ProductCarousel } from '@/components/product';
import { Product } from '@o4o/types';

// Mock data for demo - replace with actual API call
const mockProducts: Product[] = [
  {
    id: '1',
    name: '프리미엄 무선 헤드폰',
    slug: 'premium-wireless-headphones',
    sku: 'WH-001',
    description: '고품질 무선 헤드폰',
    shortDescription: '프리미엄 사운드',
    pricing: {
      customer: 89000,
      business: 80100,
      affiliate: 84550,
      retailer: { gold: 84550, premium: 82000, vip: 80100 }
    },
    inventory: {
      stockQuantity: 15,
      minOrderQuantity: 1,
      lowStockThreshold: 5,
      manageStock: true,
      allowBackorder: false,
      stockStatus: 'in_stock' as const
    },
    images: [{ id: '1', url: 'https://via.placeholder.com/300x300', alt: '헤드폰', sortOrder: 0, isFeatured: true }],
    categories: [],
    tags: [],
    specifications: {},
    attributes: {},
    supplierId: '1',
    supplierName: '테크 서플라이',
    status: 'active' as const,
    approvalStatus: 'approved' as const,
    viewCount: 0,
    salesCount: 0,
    rating: 4.5,
    reviewCount: 128,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isFeatured: true,
    isVirtual: false,
    isDownloadable: false
  } as Product,
  {
    id: '2',
    name: '스마트 워치 프로',
    slug: 'smart-watch-pro',
    sku: 'SW-PRO-001',
    description: '첨단 기능의 스마트 워치',
    shortDescription: '프로급 스마트워치',
    pricing: {
      customer: 259000,
      business: 233100,
      affiliate: 246050,
      retailer: { gold: 246050, premium: 240000, vip: 233100 }
    },
    inventory: {
      stockQuantity: 8,
      minOrderQuantity: 1,
      lowStockThreshold: 3,
      manageStock: true,
      allowBackorder: false,
      stockStatus: 'in_stock' as const
    },
    images: [{ id: '2', url: 'https://via.placeholder.com/300x300', alt: '스마트워치', sortOrder: 0, isFeatured: true }],
    categories: [],
    tags: [],
    specifications: {},
    attributes: {},
    supplierId: '1',
    supplierName: '테크 서플라이',
    status: 'active' as const,
    approvalStatus: 'approved' as const,
    viewCount: 0,
    salesCount: 0,
    rating: 4.8,
    reviewCount: 89,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isFeatured: true,
    isVirtual: false,
    isDownloadable: false
  } as Product,
  {
    id: '3',
    name: '블루투스 키보드',
    slug: 'bluetooth-keyboard',
    sku: 'KB-BT-001',
    description: '무선 블루투스 키보드',
    shortDescription: '휴대용 키보드',
    pricing: {
      customer: 59000,
      business: 53100,
      affiliate: 56050,
      retailer: { gold: 56050, premium: 54280, vip: 53100 }
    },
    inventory: {
      stockQuantity: 25,
      minOrderQuantity: 1,
      lowStockThreshold: 5,
      manageStock: true,
      allowBackorder: false,
      stockStatus: 'in_stock' as const
    },
    images: [{ id: '3', url: 'https://via.placeholder.com/300x300', alt: '키보드', sortOrder: 0, isFeatured: true }],
    categories: [],
    tags: [],
    specifications: {},
    attributes: {},
    supplierId: '1',
    supplierName: '테크 서플라이',
    status: 'active' as const,
    approvalStatus: 'approved' as const,
    viewCount: 0,
    salesCount: 0,
    rating: 4.2,
    reviewCount: 45,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isFeatured: false,
    isVirtual: false,
    isDownloadable: false
  } as Product,
  {
    id: '4',
    name: '휴대용 충전기',
    slug: 'portable-charger',
    sku: 'PC-001',
    description: '대용량 휴대용 충전기',
    shortDescription: '10000mAh 보조배터리',
    pricing: {
      customer: 35000,
      business: 31500,
      affiliate: 33250,
      retailer: { gold: 33250, premium: 32200, vip: 31500 }
    },
    inventory: {
      stockQuantity: 0,
      minOrderQuantity: 1,
      lowStockThreshold: 5,
      manageStock: true,
      allowBackorder: false,
      stockStatus: 'out_of_stock' as const
    },
    images: [{ id: '4', url: 'https://via.placeholder.com/300x300', alt: '충전기', sortOrder: 0, isFeatured: true }],
    categories: [],
    tags: [],
    specifications: {},
    attributes: {},
    supplierId: '1',
    supplierName: '테크 서플라이',
    status: 'active' as const,
    approvalStatus: 'approved' as const,
    viewCount: 0,
    salesCount: 0,
    rating: 4.6,
    reviewCount: 234,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '1',
    isFeatured: false,
    isVirtual: false,
    isDownloadable: false
  } as Product
];

export function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-16">
        <h1 className="text-5xl font-bold mb-4">O4O 이커머스 플랫폼</h1>
        <p className="text-xl text-muted-foreground mb-8">
          최고의 상품을 최적의 가격으로 만나보세요
        </p>
        <Link to="/products">
          <Button size="lg" className="gap-2">
            쇼핑 시작하기 <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Featured Products */}
      <section>
        <h2 className="text-2xl font-bold mb-6">추천 상품</h2>
        <ProductCarousel products={mockProducts} autoplay interval={3000} />
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">다양한 상품</h3>
          <p className="text-muted-foreground">
            수천 개의 엄선된 상품을 만나보세요
          </p>
        </div>

        <div className="text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">안전한 거래</h3>
          <p className="text-muted-foreground">
            보안이 검증된 안전한 결제 시스템
          </p>
        </div>

        <div className="text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">빠른 배송</h3>
          <p className="text-muted-foreground">
            전국 어디서나 빠른 배송 서비스
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">
          지금 회원가입하고 특별 혜택을 받으세요!
        </h2>
        <p className="text-muted-foreground mb-6">
          첫 구매 시 10% 할인 쿠폰 증정
        </p>
        <Link to="/register">
          <Button size="lg">회원가입</Button>
        </Link>
      </section>
    </div>
  );
}