/**
 * Usage Examples for MediaSelector Components
 * MediaSelector 컴포넌트들의 사용 예시
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MediaSelector,
  CompactMediaSelector,
  InlineMediaBrowser,
  MediaItem
} from '../index';

const UsageExamples: React.FC = () => {
  // State for different examples
  const [showMainSelector, setShowMainSelector] = useState(false);
  const [selectedMainMedia, setSelectedMainMedia] = useState<MediaItem[]>([]);

  const [selectedCompactMedia, setSelectedCompactMedia] = useState<MediaItem | null>(null);

  const [selectedInlineMedia, setSelectedInlineMedia] = useState<MediaItem[]>([]);

  const [coverMedia, setCoverMedia] = useState<MediaItem | null>(null);
  const [galleryMedia, setGalleryMedia] = useState<MediaItem[]>([]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          MediaSelector Components Usage Examples
        </h1>
        <p className="text-lg text-gray-600">
          Cover Block과 Gallery Block에서 사용할 수 있는 미디어 선택 컴포넌트들의 예시입니다.
        </p>
      </div>

      {/* Main MediaSelector Example */}
      <Card>
        <CardHeader>
          <CardTitle>1. 기본 MediaSelector (모달형)</CardTitle>
          <p className="text-sm text-gray-600">
            전체 화면 모달로 열리는 기본 미디어 선택기입니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={() => setShowMainSelector(true)}>
              미디어 선택하기
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedMainMedia([])}
              disabled={selectedMainMedia.length === 0}
            >
              선택 초기화
            </Button>
          </div>

          {selectedMainMedia.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">선택된 미디어 ({selectedMainMedia.length}개):</h4>
              <div className="grid grid-cols-4 gap-2">
                {selectedMainMedia.map((item) => (
                  <div key={item.id} className="aspect-square rounded overflow-hidden">
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt={item.alt || item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <MediaSelector
            isOpen={showMainSelector}
            onClose={() => setShowMainSelector(false)}
            onSelect={(media) => {
              setSelectedMainMedia(Array.isArray(media) ? media : [media]);
            }}
            multiple={true}
            acceptedTypes={['image', 'video']}
            maxSelection={10}
            title="여러 미디어 선택"
            selectedItems={selectedMainMedia}
          />
        </CardContent>
      </Card>

      {/* Compact MediaSelector Example */}
      <Card>
        <CardHeader>
          <CardTitle>2. CompactMediaSelector (컴팩트형)</CardTitle>
          <p className="text-sm text-gray-600">
            작은 공간에서 사용할 수 있는 컴팩트한 미디어 선택기입니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <CompactMediaSelector
              onSelect={(media) => {
                setSelectedCompactMedia(Array.isArray(media) ? media[0] : media);
              }}
              multiple={false}
              acceptedTypes={['image']}
              title="이미지 선택"
              variant="compact"
              height={300}
            />

            {selectedCompactMedia && (
              <div className="w-32 h-32 rounded overflow-hidden border">
                <img
                  src={selectedCompactMedia.thumbnailUrl || selectedCompactMedia.url}
                  alt={selectedCompactMedia.alt || selectedCompactMedia.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {selectedCompactMedia && (
            <div className="text-sm text-gray-600">
              선택된 이미지: {selectedCompactMedia.title}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inline MediaBrowser Example */}
      <Card>
        <CardHeader>
          <CardTitle>3. InlineMediaBrowser (인라인형)</CardTitle>
          <p className="text-sm text-gray-600">
            페이지에 직접 임베드되는 인라인 미디어 브라우저입니다.
          </p>
        </CardHeader>
        <CardContent>
          <InlineMediaBrowser
            selectedItems={selectedInlineMedia}
            onSelectionChange={setSelectedInlineMedia}
            multiple={true}
            acceptedTypes={['image', 'video']}
            maxSelection={5}
            height={400}
            showToolbar={true}
          />

          {selectedInlineMedia.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-sm font-medium mb-2">
                선택된 미디어: {selectedInlineMedia.length}개
              </p>
              <div className="flex gap-2 flex-wrap">
                {selectedInlineMedia.map((item) => (
                  <div key={item.id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {item.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cover Block Example */}
      <Card>
        <CardHeader>
          <CardTitle>4. Cover Block 사용 예시</CardTitle>
          <p className="text-sm text-gray-600">
            Cover Block에서 배경 이미지 선택에 사용하는 예시입니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={() => setShowMainSelector(true)}>
              배경 이미지 선택
            </Button>
            {coverMedia && (
              <Button
                variant="outline"
                onClick={() => setCoverMedia(null)}
              >
                이미지 제거
              </Button>
            )}
          </div>

          {/* Cover Preview */}
          <div
            className="relative h-64 rounded-lg overflow-hidden flex items-center justify-center"
            style={{
              backgroundImage: coverMedia ? `url(${coverMedia.url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: coverMedia ? undefined : '#f3f4f6'
            }}
          >
            {coverMedia && (
              <div className="absolute inset-0 bg-black bg-opacity-40" />
            )}
            <div className="relative z-10 text-center text-white">
              <h2 className="text-2xl font-bold mb-2">Cover Block Title</h2>
              <p className="text-lg opacity-90">Subtitle text here</p>
            </div>
            {!coverMedia && (
              <div className="text-gray-500 text-center">
                <div className="text-6xl mb-2">🖼️</div>
                <p>배경 이미지를 선택하세요</p>
              </div>
            )}
          </div>

          <MediaSelector
            isOpen={showMainSelector}
            onClose={() => setShowMainSelector(false)}
            onSelect={(media) => {
              setCoverMedia(Array.isArray(media) ? media[0] : media);
            }}
            multiple={false}
            acceptedTypes={['image']}
            title="Cover 배경 이미지 선택"
          />
        </CardContent>
      </Card>

      {/* Gallery Block Example */}
      <Card>
        <CardHeader>
          <CardTitle>5. Gallery Block 사용 예시</CardTitle>
          <p className="text-sm text-gray-600">
            Gallery Block에서 여러 이미지 선택에 사용하는 예시입니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={() => setShowMainSelector(true)}>
              갤러리 이미지 추가
            </Button>
            {galleryMedia.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setGalleryMedia([])}
              >
                전체 삭제
              </Button>
            )}
          </div>

          {/* Gallery Preview */}
          {galleryMedia.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {galleryMedia.map((item) => (
                <div key={item.id} className="aspect-square rounded overflow-hidden">
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt={item.alt || item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">🖼️</div>
                <p>갤러리 이미지를 추가하세요</p>
              </div>
            </div>
          )}

          <MediaSelector
            isOpen={showMainSelector}
            onClose={() => setShowMainSelector(false)}
            onSelect={(media) => {
              const newMedia = Array.isArray(media) ? media : [media];
              setGalleryMedia([...galleryMedia, ...newMedia]);
            }}
            multiple={true}
            acceptedTypes={['image', 'video']}
            maxSelection={20}
            title="갤러리 미디어 선택"
          />
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>6. 코드 예시</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">기본 사용법:</h4>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`import { MediaSelector } from '@/components/editor/blocks/shared';

<MediaSelector
  isOpen={showSelector}
  onClose={() => setShowSelector(false)}
  onSelect={(media) => handleSelect(media)}
  multiple={true}
  acceptedTypes={['image', 'video']}
  maxSelection={10}
  title="미디어 선택"
/>`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">Hook 사용법:</h4>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`import { useMediaSelector } from '@/components/editor/blocks/shared';

const {
  state,
  actions,
  computed,
  allFiles
} = useMediaSelector({
  multiple: true,
  maxSelection: 10,
  acceptedTypes: ['image', 'video']
});

// 파일 선택
actions.selectFile(fileId);

// 검색 필터 적용
actions.updateFilter('searchTerm', 'landscape');`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageExamples;