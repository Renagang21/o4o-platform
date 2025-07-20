import { Link } from 'react-router-dom';
import { Button } from '@o4o/ui';
import { ArrowRight, Package, Shield, Truck } from 'lucide-react';
import { ProductCarousel } from '@/components/product';
import { Product } from '@o4o/types/ecommerce';

// Mock data for demo - replace with actual API call
const mockProducts: Product[] = [
  {
    id: '1',
    name: '프리미엄 무선 헤드폰',
    slug: 'premium-wireless-headphones',
    price: 89000,
    compareAtPrice: 129000,
    stockQuantity: 15,
    images: [{ id: '1', url: 'https://via.placeholder.com/300x300', alt: '헤드폰' }],
    featured: true,
    status: 'published',
    manageStock: true,
    rating: 4.5,
    reviewCount: 128
  },
  {
    id: '2',
    name: '스마트 워치 프로',
    slug: 'smart-watch-pro',
    price: 259000,
    compareAtPrice: 299000,
    stockQuantity: 8,
    images: [{ id: '2', url: 'https://via.placeholder.com/300x300', alt: '스마트워치' }],
    featured: true,
    status: 'published',
    manageStock: true,
    rating: 4.8,
    reviewCount: 89
  },
  {
    id: '3',
    name: '블루투스 키보드',
    slug: 'bluetooth-keyboard',
    price: 59000,
    stockQuantity: 25,
    images: [{ id: '3', url: 'https://via.placeholder.com/300x300', alt: '키보드' }],
    status: 'published',
    manageStock: true,
    rating: 4.2,
    reviewCount: 45
  },
  {
    id: '4',
    name: '휴대용 충전기',
    slug: 'portable-charger',
    price: 35000,
    compareAtPrice: 45000,
    stockQuantity: 0,
    images: [{ id: '4', url: 'https://via.placeholder.com/300x300', alt: '충전기' }],
    status: 'published',
    manageStock: true,
    rating: 4.6,
    reviewCount: 234
  }
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