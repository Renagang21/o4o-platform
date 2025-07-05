import React, { useState } from 'react';
import TheDANGHomeEditor from '@shared/components/editor/TheDANGHomeEditor';

const TheDANGStyleEditorPage: React.FC = () => {
  const [savedContent, setSavedContent] = useState<string>('');

  // Initial content structure for the homepage
  const initialContent = `
    <div data-tiptap-editable="hero-section" class="py-20 bg-white">
      <div class="max-w-[1200px] mx-auto px-4 text-center">
        <h1 data-tiptap-field="hero-title" class="text-5xl md:text-6xl font-light text-gray-900 mb-6 tracking-tight">
          통합 비즈니스<br><span class="text-[#5787c5]">플랫폼</span>
        </h1>
        <p data-tiptap-field="hero-description" class="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
          하나의 플랫폼에서 모든 비즈니스 기회를 발견하고 성장시키세요.<br>
          e-commerce부터 크라우드펀딩까지, 통합된 서비스로 더 큰 성공을 이루어보세요.
        </p>
      </div>
    </div>

    <div data-tiptap-editable="services-banner" class="py-16 bg-[#ecf0f3]">
      <div class="max-w-[1200px] mx-auto px-4">
        <div data-tiptap-section="banner-header" class="text-center mb-12">
          <h2 data-tiptap-field="services-title" class="text-3xl md:text-4xl font-light text-gray-900 mb-4 tracking-tight">
            개발된 서비스들
          </h2>
          <p data-tiptap-field="services-description" class="text-lg text-gray-600 font-light max-w-2xl mx-auto">
            현재 이용 가능한 서비스와 곧 출시될 새로운 기능들을 확인해보세요
          </p>
        </div>
        
        <div data-tiptap-section="services-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div data-tiptap-component="service-card" class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
            <div class="h-2 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <div class="p-6">
              <div class="text-3xl mb-4">🛍️</div>
              <h3 data-tiptap-field="service-title" class="text-xl font-medium text-gray-900 mb-2">E-commerce</h3>
              <p data-tiptap-field="service-description" class="text-gray-600 text-sm mb-4 leading-relaxed">
                통합 전자상거래 플랫폼
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div data-tiptap-editable="features-section" class="py-20 bg-white">
      <div class="max-w-[1200px] mx-auto px-4">
        <div data-tiptap-section="features-header" class="text-center mb-16">
          <h2 data-tiptap-field="features-title" class="text-3xl md:text-4xl font-light text-gray-900 mb-4 tracking-tight">
            왜 o4o-Platform을 선택해야 할까요?
          </h2>
          <p data-tiptap-field="features-description" class="text-lg text-gray-600 font-light max-w-2xl mx-auto">
            통합된 플랫폼의 강력한 기능들을 경험해보세요
          </p>
        </div>
      </div>
    </div>
  `;

  const handleContentUpdate = (content: string) => {
    setSavedContent(content);
  };

  const handleSave = async () => {
    try {
      // Here you would typically save to your API
      console.log('Saving content:', savedContent);
      
      // For now, just show a success message
      alert('Content saved successfully!');
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Error saving content. Please try again.');
    }
  };

  const handleExport = () => {
    const blob = new Blob([savedContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thedang-homepage-content.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Editor Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                TheDANG Style Homepage Editor
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Edit your homepage content with TipTap editor
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={handleExport}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
              >
                Export HTML
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">
            편집 가이드
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>Edit Content</strong> 버튼을 클릭하여 편집 모드를 활성화하세요</li>
            <li>• <strong>파란색 점선</strong>: 편집 가능한 섹션 (data-tiptap-editable)</li>
            <li>• <strong>초록색 점선</strong>: 섹션 영역 (data-tiptap-section)</li>
            <li>• <strong>주황색 점선</strong>: 컴포넌트 영역 (data-tiptap-component)</li>
            <li>• <strong>분홍색 점선</strong>: 개별 필드 (data-tiptap-field)</li>
            <li>• 텍스트를 선택하고 툴바를 사용하여 스타일을 변경하세요</li>
          </ul>
        </div>

        {/* Editor */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* <TheDANGHomeEditor
            initialContent={initialContent}
            onUpdate={handleContentUpdate}
            editable={true}
          /> */}
          <div className="p-6 text-center text-gray-500">
            Editor temporarily disabled for production build
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {savedContent && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              실시간 미리보기
            </h3>
            <div 
              className="thedang-theme border border-gray-200 rounded"
              dangerouslySetInnerHTML={{ __html: savedContent }}
            />
          </div>
        </div>
      )}

      {/* Code Preview */}
      {savedContent && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              생성된 HTML 코드
            </h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              <code>{savedContent}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default TheDANGStyleEditorPage;
