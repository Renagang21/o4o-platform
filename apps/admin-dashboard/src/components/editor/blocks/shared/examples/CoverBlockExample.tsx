import React, { useState } from 'react';
import { LayoutGrid, CoverPosition, getPositionClassName } from '../LayoutGrid';
import '../LayoutGrid.css';

/**
 * Cover Block에서 LayoutGrid를 사용하는 예제 컴포넌트
 */
export const CoverBlockExample: React.FC = () => {
  const [position, setPosition] = useState<CoverPosition>('center-center');
  const [showGrid, setShowGrid] = useState(true);
  const [backgroundImage, setBackgroundImage] = useState(
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
  );

  const handlePositionChange = (newPosition: CoverPosition) => {
    setPosition(newPosition);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Cover Block - Position Grid 예제
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 설정 패널 */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                레이아웃 설정
              </h3>

              <LayoutGrid
                mode="cover-position"
                currentPosition={position}
                onPositionChange={handlePositionChange}
                showGrid={showGrid}
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  그리드 가이드 표시
                </span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  배경 이미지 URL
                </label>
                <input
                  type="url"
                  value={backgroundImage}
                  onChange={(e) => setBackgroundImage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                현재 설정
              </h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">위치:</dt>
                  <dd className="font-medium">{position}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">CSS 클래스:</dt>
                  <dd className="font-mono text-xs bg-white px-2 py-1 rounded">
                    {getPositionClassName(position)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* 미리보기 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              미리보기
            </h3>

            <div
              className={`
                relative w-full h-64 bg-cover bg-center rounded-lg overflow-hidden
                ${getPositionClassName(position)}
                ${showGrid ? 'show-grid' : ''}
              `}
              style={{
                backgroundImage: `url(${backgroundImage})`,
              }}
            >
              {/* 그리드 오버레이 */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0">
                    {Array.from({ length: 9 }).map((_, index) => (
                      <div
                        key={index}
                        className="border border-white/30"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 컨텐츠 */}
              <div className="relative z-10 p-6 text-white">
                <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6 max-w-md">
                  <h3 className="text-2xl font-bold mb-2">
                    Cover Block 제목
                  </h3>
                  <p className="text-white/90 mb-4">
                    이 텍스트는 선택한 위치에 따라 배치됩니다.
                    왼쪽 패널에서 위치를 변경해보세요.
                  </p>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    자세히 보기
                  </button>
                </div>
              </div>
            </div>

            {/* 반응형 미리보기 */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                반응형 미리보기
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {['모바일', '태블릿', '데스크톱'].map((device, index) => {
                  const sizes = ['w-20 h-12', 'w-32 h-20', 'w-48 h-28'];
                  return (
                    <div key={device} className="text-center">
                      <div
                        className={`
                          ${sizes[index]} mx-auto bg-cover bg-center rounded border
                          ${getPositionClassName(position)}
                        `}
                        style={{
                          backgroundImage: `url(${backgroundImage})`,
                          backgroundSize: 'cover',
                        }}
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full opacity-80" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{device}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 코드 예제 */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          사용 코드 예제
        </h3>
        <pre className="text-green-400 text-sm overflow-x-auto">
{`import { LayoutGrid, CoverPosition, getPositionClassName } from './shared';

const [position, setPosition] = useState<CoverPosition>('center-center');

<LayoutGrid
  mode="cover-position"
  currentPosition={position}
  onPositionChange={setPosition}
  showGrid={true}
/>

<div className={\`cover-container \${getPositionClassName(position)}\`}>
  <div className="content">
    {/* 컨텐츠 */}
  </div>
</div>`}
        </pre>
      </div>
    </div>
  );
};

export default CoverBlockExample;