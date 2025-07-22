import { useEffect } from 'react';
import { ShortcodeContent, ShortcodeProvider } from '@o4o/shortcodes';
import { registerAllShortcodes } from '@/lib/shortcodes/register';
import { useCartStore } from '@/stores/useCartStore';
import { Button } from '@o4o/ui';
import { Product } from '@o4o/types';

const shortcodeExamples = [
  {
    title: '상품 요약 (Product Summary)',
    content: '[product-summary]',
    description: '장바구니에 담긴 상품들을 요약해서 보여줍니다.'
  },
  {
    title: '상품 요약 - 이미지 없이',
    content: '[product-summary show-image="false"]',
    description: '이미지 없이 텍스트만 표시합니다.'
  },
  {
    title: '배송비 계산기 (Shipping Calculator)',
    content: '[shipping-calculator]',
    description: '배송 방법 선택과 배송비를 계산합니다.'
  },
  {
    title: '배송비 계산기 - 무료배송 기준 10만원',
    content: '[shipping-calculator free-threshold="100000"]',
    description: '10만원 이상 구매 시 무료배송'
  },
  {
    title: '결제 수단 (Payment Methods)',
    content: '[payment-methods]',
    description: '사용 가능한 결제 수단을 선택합니다.'
  },
  {
    title: '결제 수단 - 아이콘 없이',
    content: '[payment-methods show-icons="false" show-description="false"]',
    description: '심플한 결제 수단 선택 UI'
  },
  {
    title: '주문 요약 (Order Summary)',
    content: '[order-summary]',
    description: '전체 주문 내역을 요약해서 보여줍니다.'
  },
  {
    title: '복합 사용 예제',
    content: `
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div>
    <h3 class="text-lg font-semibold mb-4">장바구니 상품</h3>
    [product-summary show-total="false"]
  </div>
  <div>
    <h3 class="text-lg font-semibold mb-4">결제 정보</h3>
    [shipping-calculator]
    <div class="mt-6">
      [payment-methods default="kakao"]
    </div>
    <div class="mt-6">
      [order-summary]
    </div>
  </div>
</div>`,
    description: '여러 숏코드를 함께 사용하는 예제'
  }
];

export function ShortcodeDemo() {
  const { cart, addToCart } = useCartStore();
  
  useEffect(() => {
    // 숏코드 등록
    registerAllShortcodes();
  }, []);
  
  // 테스트용 상품
  const mockProduct: Product = {
    id: 'test-product-1',
    sku: 'TEST-001',
    name: '테스트 상품 1',
    slug: 'test-product-1',
    shortDescription: '이것은 테스트 상품입니다',
    description: '숏코드 시스템을 테스트하기 위한 상품입니다.',
    pricing: {
      customer: 30000,
      business: 25000,
      affiliate: 27000,
      retailer: {
        gold: 24000,
        premium: 23000,
        vip: 22000
      }
    },
    inventory: {
      stockQuantity: 100,
      minOrderQuantity: 1,
      maxOrderQuantity: 10,
      lowStockThreshold: 10,
      manageStock: true,
      allowBackorder: false,
      stockStatus: 'in_stock'
    },
    images: [],
    featuredImageUrl: 'https://via.placeholder.com/300',
    categories: [],
    tags: [],
    specifications: {},
    attributes: {},
    supplierId: 'test-supplier',
    supplierName: '테스트 공급업체',
    status: 'active',
    approvalStatus: 'approved',
    viewCount: 0,
    salesCount: 0,
    rating: 0,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
    isFeatured: false,
    isVirtual: false,
    isDownloadable: false
  };
  
  const mockProduct2: Product = {
    ...mockProduct,
    id: 'test-product-2',
    sku: 'TEST-002',
    name: '테스트 상품 2',
    slug: 'test-product-2',
    shortDescription: '두 번째 테스트 상품입니다',
    pricing: {
      customer: 50000,
      business: 45000,
      affiliate: 48000,
      retailer: {
        gold: 43000,
        premium: 42000,
        vip: 41000
      }
    },
    specifications: {},
    attributes: {}
  };
  
  const handleAddToCart = async (product: Product) => {
    try {
      await addToCart(product, 1);
    } catch (error) {
      console.error('장바구니 추가 실패:', error);
    }
  };

  return (
    <ShortcodeProvider>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">숏코드 시스템 데모</h1>
        <p className="text-gray-600 mb-4">
          O4O Platform의 숏코드 시스템을 테스트할 수 있는 데모 페이지입니다.
        </p>
        
        {/* 장바구니 테스트 섹션 */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">장바구니 테스트</h2>
          <p className="text-sm text-gray-600 mb-4">
            숏코드를 테스트하려면 먼저 장바구니에 상품을 추가하세요.
          </p>
          <div className="flex gap-4 mb-4">
            <Button onClick={() => handleAddToCart(mockProduct)}>
              테스트 상품 1 추가 (₩30,000)
            </Button>
            <Button onClick={() => handleAddToCart(mockProduct2)}>
              테스트 상품 2 추가 (₩50,000)
            </Button>
          </div>
          {cart && cart.items.length > 0 && (
            <p className="text-sm text-green-600">
              현재 장바구니에 {cart.items.length}개의 상품이 있습니다.
            </p>
          )}
        </div>

        <div className="space-y-12">
          {shortcodeExamples.map((example, index) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-4 border-b">
                <h2 className="text-xl font-semibold">{example.title}</h2>
                <p className="text-gray-600 text-sm mt-1">{example.description}</p>
              </div>
              
              <div className="p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">숏코드:</h3>
                  <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto">
                    <code>{example.content.trim()}</code>
                  </pre>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">결과:</h3>
                  <div className="border rounded p-4 bg-white">
                    <ShortcodeContent content={example.content} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">사용 방법</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>원하는 위치에 숏코드를 입력합니다</li>
            <li>속성을 통해 표시 옵션을 커스터마이징할 수 있습니다</li>
            <li>ShortcodeContent 컴포넌트로 감싸거나 renderShortcodes 함수를 사용합니다</li>
          </ol>
          
          <div className="mt-4 p-4 bg-white rounded">
            <pre className="text-sm">
{`import { ShortcodeContent } from '@o4o/shortcodes';

<ShortcodeContent content="[product-summary]" />`}
            </pre>
          </div>
        </div>
      </div>
    </ShortcodeProvider>
  );
}