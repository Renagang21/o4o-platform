/**
 * 숏코드 시스템 데모 페이지
 * 모든 숏코드가 백엔드 API와 완벽 연동되는지 검증
 */

import React, { useState, useEffect } from 'react';
import ShortcodeTiptapEditor from '../components/editor/ShortcodeTiptapEditor';
import { ShortcodeRenderer } from '../lib/shortcode/renderer';
import { defaultShortcodeApiClient } from '../lib/api/shortcode-client';

const ShortcodeDemo: React.FC = () => {
  const [content, setContent] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);

  useEffect(() => {
    // API 연결 테스트
    testApiConnection();
    
    // 데모 컨텐츠 로드
    setContent(getDemoContent());
  }, []);

  const testApiConnection = async () => {
    const connected = await defaultShortcodeApiClient.testConnection();
    setApiConnected(connected);
  };

  const getDemoContent = () => {
    return `
<h1>숏코드 시스템 데모 페이지</h1>

<p>이 페이지는 구현된 모든 숏코드가 백엔드 API와 완벽히 연동되어 작동하는지 검증합니다.</p>

<h2>🖼️ 미디어 숏코드</h2>

<h3>1. 이미지 숏코드</h3>
[image id="1" size="medium" alt="데모 이미지" caption="자동 최적화된 이미지"]

<h3>2. 이미지 갤러리</h3>
[image-gallery ids="1,2,3,4" columns="3" show_captions="true"]

<h2>🛍️ 전자상거래 숏코드</h2>

<h3>3. 상품 그리드</h3>
[product-grid category="featured" limit="6" columns="3" show_price="true" show_add_to_cart="true"]

<h2>🎯 레이아웃 숏코드</h2>

<h3>4. 히어로 섹션</h3>
[hero title="Welcome to Our Platform" subtitle="Experience the power of our shortcode system" cta_text="Get Started" cta_link="/signup" height="medium"]

<h3>5. 기능 그리드</h3>
[feature-grid features="speed,security,scalability" columns="3"]

<h2>📝 컨텐츠 숏코드</h2>

<h3>6. 최근 게시물</h3>
[recent-posts count="5" show_excerpt="true" show_author="true" show_date="true"]

<h3>7. 고객 후기</h3>
[testimonials count="3" layout="grid" show_images="true"]

<h2>📧 폼 숏코드</h2>

<h3>8. 연락처 폼</h3>
[contact-form fields="name*,email*,message*" title="Contact Us" submit_text="Send Message"]

<h2>💰 비즈니스 숏코드</h2>

<h3>9. 가격표</h3>
[pricing-table plans="basic,pro,enterprise" featured="pro" currency="₩"]

<h2>🚀 마케팅 숏코드</h2>

<h3>10. 액션 버튼</h3>
[call-to-action text="지금 시작하기" link="/signup" style="primary" title="Ready to get started?" description="Join thousands of satisfied customers"]

<h2>API 연결 상태</h2>
<p>백엔드 API 연결: <strong>${apiConnected ? '✅ 연결됨' : '❌ 연결 실패'}</strong></p>

<h2>테스트 가이드</h2>
<ul>
  <li>각 숏코드를 클릭하면 편집 모드로 진입할 수 있습니다</li>
  <li>+ 숏코드 버튼을 클릭하여 새로운 숏코드를 삽입할 수 있습니다</li>
  <li>모든 숏코드는 실제 백엔드 데이터를 사용합니다</li>
  <li>이미지는 자동으로 WebP/AVIF 형태로 최적화됩니다</li>
  <li>상품 정보는 실시간으로 API에서 가져옵니다</li>
</ul>
`;
  };

  const renderPreview = () => {
    return (
      <div className="shortcode-preview prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto p-6">
        <div dangerouslySetInnerHTML={{ 
          __html: ShortcodeRenderer.renderContent(content, {
            apiClient: defaultShortcodeApiClient,
            editorMode: false
          })
        }} />
      </div>
    );
  };

  return (
    <div className="shortcode-demo min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">숏코드 시스템 데모</h1>
              <p className="text-sm text-gray-500">WordPress 수준의 숏코드 시스템 검증</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* API 상태 */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  API {apiConnected ? '연결됨' : '연결 실패'}
                </span>
              </div>

              {/* 모드 전환 */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setPreviewMode(false)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    !previewMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  편집 모드
                </button>
                <button
                  onClick={() => setPreviewMode(true)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    previewMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  미리보기
                </button>
              </div>

              {/* 새로고침 */}
              <button
                onClick={testApiConnection}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="API 연결 재테스트"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {previewMode ? (
          /* Preview Mode */
          <div className="bg-white rounded-lg shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-medium text-gray-900">숏코드 렌더링 결과</h2>
              <p className="text-sm text-gray-600">모든 숏코드가 실제 API 데이터로 렌더링됩니다</p>
            </div>
            {renderPreview()}
          </div>
        ) : (
          /* Editor Mode */
          <div className="bg-white rounded-lg shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-medium text-gray-900">숏코드 에디터</h2>
              <p className="text-sm text-gray-600">숏코드를 편집하고 실시간으로 확인하세요</p>
            </div>
            
            <div className="p-6">
              <ShortcodeTiptapEditor
                content={content}
                onChange={setContent}
                apiClient={defaultShortcodeApiClient}
                placeholder="숏코드를 입력하거나 + 버튼을 클릭하여 삽입하세요..."
                className="min-h-[600px]"
              />
            </div>
          </div>
        )}

        {/* Debug Panel */}
        <div className="mt-6 bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-medium text-gray-900">디버그 정보</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 등록된 숏코드 */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">등록된 숏코드</h3>
                <div className="space-y-2">
                  {Object.entries(ShortcodeRenderer.getRegistry()).map(([name, info]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-blue-600">{name}</span>
                      <span className="text-gray-500">{info.category}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* API 엔드포인트 */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">API 엔드포인트</h3>
                <div className="space-y-2 text-sm">
                  <div>베이스 URL: <code className="text-blue-600">{defaultShortcodeApiClient.getBaseURL()}</code></div>
                  <div>미디어 API: <code className="text-blue-600">/admin/media</code></div>
                  <div>상품 API: <code className="text-blue-600">/ecommerce/products</code></div>
                  <div>페이지 API: <code className="text-blue-600">/admin/pages</code></div>
                  <div>연락처 API: <code className="text-blue-600">/contact/submit</code></div>
                </div>
              </div>
            </div>

            {/* 원시 HTML */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">원시 HTML 출력</h3>
              <textarea
                value={content}
                readOnly
                className="w-full h-32 text-xs font-mono bg-gray-50 border border-gray-300 rounded p-3"
                placeholder="에디터에서 변경된 내용이 여기 표시됩니다..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortcodeDemo;