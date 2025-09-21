import React, { useState } from 'react';
import { LayoutGrid, GalleryLayout, generateGridStyles, useResponsiveLayoutGrid } from '../LayoutGrid';
import '../LayoutGrid.css';

/**
 * Gallery Block에서 LayoutGrid를 사용하는 예제 컴포넌트
 */
export const GalleryBlockExample: React.FC = () => {
  const [layout, setLayout] = useState<GalleryLayout>({
    type: 'grid',
    columns: 3,
    gap: 16,
    aspectRatio: 'auto',
  });

  const { breakpoint, getResponsiveColumns, getResponsiveGap } = useResponsiveLayoutGrid();

  // 샘플 이미지 데이터
  const sampleImages = [
    {
      id: '1',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      title: 'Mountain Landscape',
    },
    {
      id: '2',
      url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=600&fit=crop',
      title: 'Forest Path',
    },
    {
      id: '3',
      url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=400&fit=crop',
      title: 'Ocean Waves',
    },
    {
      id: '4',
      url: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=400&h=500&fit=crop',
      title: 'City Skyline',
    },
    {
      id: '5',
      url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=300&fit=crop',
      title: 'Desert Dunes',
    },
    {
      id: '6',
      url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=350&fit=crop',
      title: 'Lake Reflection',
    },
    {
      id: '7',
      url: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400&h=450&fit=crop',
      title: 'Snow Mountains',
    },
    {
      id: '8',
      url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=300&fit=crop',
      title: 'Tropical Beach',
    },
  ];

  const handleLayoutChange = (newLayout: GalleryLayout) => {
    setLayout(newLayout);
  };

  const responsiveColumns = getResponsiveColumns(layout.columns);
  const responsiveGap = getResponsiveGap(layout.gap);

  const currentGridStyles = generateGridStyles({
    ...layout,
    columns: responsiveColumns,
    gap: responsiveGap,
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Gallery Block - Layout Grid 예제
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* 설정 패널 */}
          <div className="xl:col-span-1">
            <div className="sticky top-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  레이아웃 설정
                </h3>

                <LayoutGrid
                  mode="gallery-layout"
                  layoutType={layout.type}
                  columns={layout.columns}
                  gap={layout.gap}
                  aspectRatio={layout.aspectRatio as 'auto' | 'square' | '16:9' | '4:3' | '3:2'}
                  onLayoutChange={handleLayoutChange}
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  반응형 정보
                </h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-blue-600">현재 화면:</dt>
                    <dd className="font-medium text-blue-800">
                      {breakpoint.toUpperCase()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-blue-600">실제 열 수:</dt>
                    <dd className="font-medium text-blue-800">
                      {responsiveColumns}열
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-blue-600">실제 간격:</dt>
                    <dd className="font-medium text-blue-800">
                      {responsiveGap}px
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  생성된 CSS
                </h4>
                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
{Object.entries(currentGridStyles).map(([key, value]) =>
  `${key}: ${value};\n`
).join('')}
                </pre>
              </div>
            </div>
          </div>

          {/* 갤러리 미리보기 */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                갤러리 미리보기
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>레이아웃:</span>
                <span className="font-medium">
                  {layout.type === 'grid' && '그리드'}
                  {layout.type === 'masonry' && '메이슨리'}
                  {layout.type === 'slider' && '슬라이더'}
                </span>
              </div>
            </div>

            <div
              className={`
                gallery-container transition-all duration-300
                ${layout.type === 'slider' ? 'overflow-hidden' : ''}
              `}
              style={currentGridStyles}
              data-layout-type={layout.type}
              data-preview-container
            >
              {sampleImages.map((image, index) => (
                <div
                  key={image.id}
                  className={`
                    gallery-item group cursor-pointer transition-all duration-200
                    ${layout.type === 'masonry' ? 'break-inside-avoid mb-4' : ''}
                    ${layout.type === 'slider' ? 'flex-shrink-0' : ''}
                  `}
                  style={{
                    aspectRatio: layout.type === 'masonry' ? 'auto' :
                                layout.aspectRatio === 'auto' ? 'auto' :
                                layout.aspectRatio.replace(':', ' / '),
                    scrollSnapAlign: layout.type === 'slider' ? 'start' : undefined,
                    width: layout.type === 'slider' ?
                           `${Math.max(200, (800 - (layout.columns - 1) * layout.gap) / layout.columns)}px` :
                           undefined,
                  }}
                  data-preview-item
                >
                  <div className="relative w-full h-full overflow-hidden rounded-lg bg-gray-200">
                    <img
                      src={image.url}
                      alt={image.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <p className="text-white text-sm font-medium">
                        {image.title}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 레이아웃별 추가 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className={`p-3 rounded-lg ${layout.type === 'grid' ? 'bg-blue-100 border-blue-200' : 'bg-gray-100'}`}>
                <h4 className="font-medium text-gray-800 mb-1">그리드 레이아웃</h4>
                <p className="text-gray-600">균등한 크기의 격자 형태</p>
              </div>
              <div className={`p-3 rounded-lg ${layout.type === 'masonry' ? 'bg-blue-100 border-blue-200' : 'bg-gray-100'}`}>
                <h4 className="font-medium text-gray-800 mb-1">메이슨리 레이아웃</h4>
                <p className="text-gray-600">Pinterest 스타일의 벽돌 쌓기</p>
              </div>
              <div className={`p-3 rounded-lg ${layout.type === 'slider' ? 'bg-blue-100 border-blue-200' : 'bg-gray-100'}`}>
                <h4 className="font-medium text-gray-800 mb-1">슬라이더 레이아웃</h4>
                <p className="text-gray-600">가로 스크롤 캐러셀</p>
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
{`import {
  LayoutGrid,
  GalleryLayout,
  generateGridStyles,
  useResponsiveLayoutGrid
} from './shared';

const [layout, setLayout] = useState<GalleryLayout>({
  type: 'grid',
  columns: 3,
  gap: 16,
  aspectRatio: 'auto',
});

const { getResponsiveColumns, getResponsiveGap } = useResponsiveLayoutGrid();

<LayoutGrid
  mode="gallery-layout"
  layoutType={layout.type}
  columns={layout.columns}
  gap={layout.gap}
  aspectRatio={layout.aspectRatio}
  onLayoutChange={setLayout}
/>

<div style={generateGridStyles({
  ...layout,
  columns: getResponsiveColumns(layout.columns),
  gap: getResponsiveGap(layout.gap),
})}>
  {images.map(image => (
    <div key={image.id} className="gallery-item">
      <img src={image.url} alt={image.title} />
    </div>
  ))}
</div>`}
        </pre>
      </div>
    </div>
  );
};

export default GalleryBlockExample;