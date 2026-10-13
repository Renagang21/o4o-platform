import { RichTextEditor } from '@o4o/content-editor';
import type { useSupplierCandidateForm } from './useSupplierCandidateForm';
import type { useSupplierCandidateMedia } from './useSupplierCandidateMedia';

export default function SupplierCandidateMediaFields({
  formState,
  media,
}: {
  formState: ReturnType<typeof useSupplierCandidateForm>;
  media: ReturnType<typeof useSupplierCandidateMedia>;
}) {
  const { form, consumerShortDesc, setConsumerShortDesc, handleChange } = formState;
  const {
    thumbnailSource,
    setShowThumbnailPicker,
    contentItems,
    setContentItems,
    setImagePickerTarget,
    setMediaPickerTarget,
    handleThumbnailSelect,
    removeThumbnail,
    handleMultiImageSelect,
    removeImageItem,
    editorImageUpload,
  } = media;
  return (
    <>
      {/* Images */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-semibold text-slate-800">상품 이미지</h3>

        {/* 1. 대표 이미지 (썸네일) — WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">대표 이미지 (썸네일)</span>
            <span className="text-xs text-slate-400">1000x1000 정사각형 권장, 최대 1장</span>
          </div>
          {thumbnailSource ? (
            <div className="relative group w-32 h-32 rounded-lg overflow-hidden border-2 border-emerald-300">
              <img
                src={
                  thumbnailSource.kind === 'file' ? thumbnailSource.preview : thumbnailSource.url
                }
                alt="썸네일 미리보기"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                대표
              </span>
              <button
                type="button"
                onClick={removeThumbnail}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                X
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <label className="block w-32 h-32 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors flex items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailSelect}
                  className="hidden"
                />
                <span className="text-slate-400 text-xs text-center">
                  클릭하여
                  <br />
                  추가
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowThumbnailPicker(true)}
                className="px-3 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
              >
                라이브러리에서
                <br />
                선택
              </button>
            </div>
          )}
        </div>

        {/* 2. 성분/라벨 이미지 (콘텐츠) — WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">성분/라벨 이미지</span>
            <span className="text-xs text-slate-400">
              성분표, 라벨, 인증마크 등 (AI 텍스트 추출 대상)
            </span>
          </div>
          {contentItems.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {contentItems.map((item, idx) => (
                <div
                  key={idx}
                  className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200"
                >
                  <img
                    src={item.kind === 'file' ? item.preview : item.url}
                    alt={`콘텐츠 ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {item.kind === 'library' && (
                    <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-[9px] px-1 py-0.5 rounded">
                      LIB
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImageItem(idx, contentItems, setContentItems)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <label className="flex-1 block border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleMultiImageSelect(e, setContentItems)}
                className="hidden"
              />
              <div className="text-slate-400 text-sm">
                <p className="font-medium">파일에서 추가</p>
                {contentItems.length > 0 && (
                  <p className="mt-1 text-xs text-emerald-600">{contentItems.length}장 선택됨</p>
                )}
              </div>
            </label>
            <button
              type="button"
              onClick={() => setImagePickerTarget('content')}
              className="px-4 py-3 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors whitespace-nowrap"
            >
              라이브러리에서
              <br />
              선택
            </button>
          </div>
        </div>
      </div>

      {/* Descriptions */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h3 className="text-lg font-semibold text-slate-800">소비자용 상품 설명</h3>
        <p className="text-xs text-slate-500">
          검토 요청과 함께 보관되며, 승격 후 Offer 연결 시 소비자용 설명 초안으로 사용됩니다.
        </p>

        {/* WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1: 에디터 이미지 기능 연결 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            소비자용 간이 설명
          </label>
          <RichTextEditor
            value={consumerShortDesc}
            onChange={(c) => setConsumerShortDesc(c.html)}
            placeholder="소비자에게 보이는 간이 설명을 입력하세요..."
            minHeight="120px"
            onImageUpload={editorImageUpload}
            onMediaLibraryPick={(insertMedia) => setMediaPickerTarget(() => insertMedia)}
          />
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">추가 정보 (선택)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">제품 규격</label>
            <input
              type="text"
              name="specification"
              value={form.specification}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="예: 500mg x 60정"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">원산지</label>
            <input
              type="text"
              name="originCountry"
              value={form.originCountry}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="예: 대한민국"
            />
          </div>
        </div>
      </div>
    </>
  );
}
