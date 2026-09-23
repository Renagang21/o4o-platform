/**
 * SupplierImageSection — 공급자 상품 이미지 관리 섹션
 *
 * WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §A (2026-09-23)
 *   ProductDetailDrawer 분해. 이미지는 공급자가 자기 업로드분만 관리한다 —
 *   backend supplier-product-image.controller 가 source='supplier_upload' + created_by 로 강제하고,
 *   다른 출처의 대표 이미지는 교체되지 않는다(409). 이 컴포넌트는 표시·조작만 담당한다.
 *
 * 순수 표현 컴포넌트 — state 와 API 호출은 Drawer 가 소유한다.
 */
import type { RefObject } from 'react';
import { Trash2, ImagePlus, Loader2 } from 'lucide-react';
import { Section } from '@o4o/operator-ux-core';
import type { ProductImage } from '../../../lib/api';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

export interface SupplierImageSectionProps {
  images: ProductImage[];
  loadingImages: boolean;
  isEditing: boolean;
  uploading: boolean;
  uploadType: 'thumbnail' | 'detail' | 'content';
  setUploadType: (t: 'thumbnail' | 'detail' | 'content') => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageDelete: (imageId: string) => void;
  setShowImagePicker: (open: boolean) => void;
}

export default function SupplierImageSection({
  images,
  loadingImages,
  isEditing,
  uploading,
  uploadType,
  setUploadType,
  fileInputRef,
  handleImageUpload,
  handleImageDelete,
  setShowImagePicker,
}: SupplierImageSectionProps) {
  const thumbnail = images.find((i) => i.type === 'thumbnail');
  const detailImages = images.filter((i) => i.type === 'detail');
  const contentImages = images.filter((i) => i.type === 'content');

  return (
      <Section title="이미지">
        {loadingImages ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={20} className="animate-spin text-slate-400" />
          </div>
        ) : images.length === 0 && !isEditing ? (
          <p className="text-sm text-slate-400">등록된 이미지가 없습니다</p>
        ) : (
          <div className="space-y-3">
            {/* 썸네일 */}
            {thumbnail && (
              <div className="relative group">
                <img
                  src={thumbnail.imageUrl}
                  alt="대표 이미지"
                  className="w-full rounded-lg object-cover max-h-[240px]"
                />
                <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/50 text-white text-[10px] font-medium rounded">
                  대표
                </span>
                {isEditing && (
                  <button
                    onClick={() => handleImageDelete(thumbnail.id)}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="삭제"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )}

            {/* 상세 이미지 */}
            {detailImages.length > 0 && (
              <div>
                <span className="text-xs text-slate-400 block mb-1.5">상세 이미지</span>
                <div className="grid grid-cols-3 gap-2">
                  {detailImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.imageUrl}
                        alt="상세"
                        className="rounded-lg aspect-square object-cover w-full"
                      />
                      {isEditing && (
                        <button
                          onClick={() => handleImageDelete(img.id)}
                          className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="삭제"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 콘텐츠 이미지 */}
            {contentImages.length > 0 && (
              <div>
                <span className="text-xs text-slate-400 block mb-1.5">콘텐츠 이미지</span>
                <div className="grid grid-cols-3 gap-2">
                  {contentImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.imageUrl}
                        alt="콘텐츠"
                        className="rounded-lg aspect-square object-cover w-full"
                      />
                      {isEditing && (
                        <button
                          onClick={() => handleImageDelete(img.id)}
                          className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="삭제"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 수정 모드: 이미지 추가 */}
        {isEditing && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as 'thumbnail' | 'detail' | 'content')}
                className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                disabled={uploading}
              >
                <option value="thumbnail">대표 이미지</option>
                <option value="detail">상세 이미지</option>
                <option value="content">콘텐츠 이미지</option>
              </select>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <ImagePlus size={12} />
                )}
                {uploading ? '업로드 중...' : '추가'}
              </button>
              <button
                onClick={() => setShowImagePicker(true)}
                disabled={uploading}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded disabled:opacity-50"
              >
                <ImagePlus size={12} />
                라이브러리
              </button>
            </div>
            {uploadType === 'thumbnail' && thumbnail && (
              <p className="text-[11px] text-amber-600">기존 대표 이미지가 교체됩니다</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        )}
      </Section>
  );
}
