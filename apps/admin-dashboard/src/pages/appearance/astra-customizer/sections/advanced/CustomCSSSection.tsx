/**
 * Custom CSS Section Component
 * 사용자 정의 CSS 섹션 - Astra Additional CSS 모방
 */

import React from 'react';
import { useCustomizer } from '../../context/CustomizerContext';
import { AlertCircle } from 'lucide-react';

export const CustomCSSSection: React.FC = () => {
  const { state, setSettings } = useCustomizer();

  const handleCSSChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCSS = e.target.value;
    setSettings({
      ...state.settings,
      customCSS: newCSS
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">사용자 정의 CSS</p>
            <p className="text-blue-700">
              여기에 입력한 CSS는 사이트 전체에 적용됩니다.
              미리보기에서 즉시 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional CSS
        </label>
        <textarea
          value={state.settings.customCSS || ''}
          onChange={handleCSSChange}
          placeholder="/* 여기에 CSS 코드를 입력하세요 */&#10;.my-custom-class {&#10;  color: #333;&#10;  font-size: 16px;&#10;}"
          className="w-full h-[400px] px-3 py-2 font-mono text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          style={{
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, source-code-pro, monospace',
            tabSize: 2,
            lineHeight: '1.5'
          }}
          spellCheck={false}
        />
        <p className="mt-2 text-xs text-gray-500">
          팁: CSS 선택자를 사용하여 특정 요소의 스타일을 변경할 수 있습니다.
        </p>
      </div>

      {/* CSS 예제 힌트 */}
      <details className="bg-gray-50 rounded-lg p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 select-none">
          CSS 예제 보기
        </summary>
        <div className="mt-3 space-y-2 text-xs text-gray-600 font-mono">
          <div className="bg-white p-2 rounded border">
            <div className="text-gray-500 mb-1">/* 헤더 배경색 변경 */</div>
            <div>header {'{ background: #1a1a1a; }'}</div>
          </div>
          <div className="bg-white p-2 rounded border">
            <div className="text-gray-500 mb-1">/* 본문 글꼴 크기 */</div>
            <div>body {'{ font-size: 18px; }'}</div>
          </div>
          <div className="bg-white p-2 rounded border">
            <div className="text-gray-500 mb-1">/* 링크 색상 */</div>
            <div>a {'{ color: #0066cc; }'}</div>
          </div>
        </div>
      </details>
    </div>
  );
};
