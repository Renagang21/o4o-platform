import { FC } from 'react';
import { Code } from 'lucide-react';
import ShortcodeReference from '@/components/ShortcodeReference';

const Shortcodes: FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <Code className="w-6 h-6 mr-2 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">숏코드 도움말</h1>
        </div>
        <p className="text-gray-600">
          WordPress처럼 숏코드를 사용하여 페이지와 게시물에 동적 콘텐츠를 삽입할 수 있습니다.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Shortcode Reference */}
        <ShortcodeReference />

        {/* How to Use */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">숏코드 사용 방법</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">1. 페이지/게시물 편집기에서 사용</h3>
              <p className="text-gray-600 mb-2">
                페이지나 게시물을 편집할 때 텍스트 에디터에 직접 숏코드를 입력하세요.
              </p>
              <div className="bg-gray-100 p-3 rounded">
                <code className="text-sm">
                  안녕하세요! 오늘의 추천 상품을 확인해보세요:<br/>
                  [featured_products limit="3" columns="3"]
                </code>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">2. 블록 에디터에서 사용</h3>
              <p className="text-gray-600 mb-2">
                블록 에디터를 사용하는 경우, "숏코드 블록"을 추가하고 숏코드를 입력하세요.
              </p>
              <div className="bg-gray-100 p-3 rounded">
                <p className="text-sm text-gray-700">
                  1. + 버튼 클릭 → "숏코드" 블록 선택<br/>
                  2. 원하는 숏코드 입력<br/>
                  3. 미리보기에서 결과 확인
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">3. 위젯 영역에서 사용</h3>
              <p className="text-gray-600 mb-2">
                사이드바나 푸터 위젯에서도 숏코드를 사용할 수 있습니다.
              </p>
              <div className="bg-gray-100 p-3 rounded">
                <code className="text-sm">
                  [product_carousel category="best-sellers" limit="5"]
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">모범 사례</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">✅ 권장 사항</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• 필요한 파라미터만 사용하기</li>
                <li>• 카테고리 슬러그는 정확히 입력</li>
                <li>• 반응형을 고려하여 columns 설정</li>
                <li>• 성능을 위해 limit 값 적절히 설정</li>
              </ul>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">❌ 피해야 할 사항</h3>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• 한 페이지에 너무 많은 숏코드 사용</li>
                <li>• 중첩된 숏코드 사용</li>
                <li>• 잘못된 파라미터 타입 입력</li>
                <li>• 존재하지 않는 ID나 카테고리 참조</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Common Use Cases */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">일반적인 사용 사례</h2>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">홈페이지 구성</h3>
              <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                [product_carousel title="신상품" category="new-arrivals"]<br/>
                [featured_products title="추천 상품" limit="8" columns="4"]<br/>
                [product_categories columns="6"]
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">카테고리 페이지</h3>
              <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                [product_grid category="electronics" limit="20" orderby="price" order="asc"]
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">블로그 포스트 내 상품 소개</h3>
              <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                이 제품을 추천합니다!<br/>
                [product id="awesome-gadget" show_cart="true"]<br/>
                <br/>
                또는 간단한 구매 버튼만:<br/>
                [add_to_cart id="awesome-gadget" text="지금 구매하기"]
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shortcodes;