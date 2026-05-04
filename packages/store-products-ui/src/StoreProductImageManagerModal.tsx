/**
 * StoreProductImageManagerModal — 상품 이미지 관리
 *
 * WO-O4O-STORE-PRODUCT-IMAGE-REGISTRATION-PHASE2-V1
 * WO-O4O-STORE-PRODUCT-IMAGE-REGISTRATION-PHASE3-V1
 * WO-O4O-STORE-PRODUCTS-UI-CORE-EXTRACTION-V1: admin-dashboard에서 공통 패키지로 이전.
 *
 * 기능:
 *  - 상품 이미지 목록 표시 및 드래그 정렬
 *  - URL 붙여넣기 → GCS 임포트 등록
 *  - URL 드롭 (drag-and-drop text/uri-list) 지원
 *  - 대표 이미지 지정
 *  - 이미지 삭제
 *
 * 이미지 유형:
 *  - detail: 상세 이미지 (기본)
 *  - thumbnail: 썸네일 (master당 1개, 자동 교체)
 *  - content: 콘텐츠 이미지
 *
 * 흐름: URL 입력 → POST /master/:masterId/images/from-url → GCS 저장 → ProductImage 생성
 * 외부 URL은 저장하지 않는다.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  X, Star, Trash2, Upload, Link2, Image as ImageIcon, ChevronDown, GripVertical,
} from 'lucide-react';
import {
  getMasterImages,
  importImageFromUrl,
  setImagePrimary,
  deleteImage,
  reorderImages,
} from './api.js';
import type { ProductImageItem } from './types.js';

// ── 타입 ───────────────────────────────────────────────────────────────────────

type ImageType = 'thumbnail' | 'detail' | 'content';

interface Props {
  masterId: string;
  productName: string;
  onClose: () => void;
}

const TYPE_LABELS: Record<ImageType, string> = {
  thumbnail: '썸네일',
  detail: '상세',
  content: '콘텐츠',
};

// ── 유틸 ───────────────────────────────────────────────────────────────────────

function isImageUrl(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

export default function StoreProductImageManagerModal({ masterId, productName, onClose }: Props) {
  const [urlInput, setUrlInput] = useState('');
  const [selectedType, setSelectedType] = useState<ImageType>('detail');
  const [isDragOver, setIsDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  // 정렬용 로컬 상태 — 드래그 중에도 즉각 반영
  const [orderedImages, setOrderedImages] = useState<ProductImageItem[]>([]);
  const dragIndexRef = useRef<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const urlInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const queryKey = ['product-images', masterId];

  const { data: images = [], isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => getMasterImages(masterId),
  });

  // 서버 데이터 동기화 (드래그 중이 아닐 때만 덮어씀)
  useEffect(() => {
    if (dragIndexRef.current === null) {
      setOrderedImages(images);
    }
  }, [images]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['my-store-listings'] });
  }, [queryClient, queryKey]);

  // ── URL 임포트 ────────────────────────────────────────────────────────────

  const handleImport = useCallback(async (url: string, type: ImageType) => {
    const trimmed = url.trim();
    if (!isImageUrl(trimmed)) {
      toast.error('유효한 이미지 URL을 입력하세요. (http:// 또는 https://)');
      return;
    }

    setImporting(true);
    try {
      const res = await importImageFromUrl(masterId, trimmed, type);
      if (res.success) {
        toast.success(`${TYPE_LABELS[type]} 이미지가 등록되었습니다.`);
        setUrlInput('');
        invalidate();
      } else {
        const code = res.error?.code;
        if (code === 'FETCH_FAILED') {
          toast.error('이미지를 가져올 수 없습니다. URL이 공개 접근 가능한지 확인하세요.');
        } else if (code === 'INVALID_IMAGE_TYPE') {
          toast.error('지원하지 않는 이미지 형식입니다. (JPEG/PNG/WebP/GIF 허용)');
        } else {
          toast.error(res.error?.message ?? '등록 중 오류가 발생했습니다.');
        }
      }
    } catch {
      toast.error('등록 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.');
    } finally {
      setImporting(false);
    }
  }, [masterId, invalidate]);

  // ── 드래그앤드롭 (URL 텍스트 드롭) ───────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.some((t) => t === 'text/uri-list' || t === 'text/plain')) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const url =
      e.dataTransfer.getData('text/uri-list') ||
      e.dataTransfer.getData('text/plain');

    if (url && isImageUrl(url)) {
      await handleImport(url, selectedType);
    } else {
      toast.error('이미지 URL을 드롭하세요.');
    }
  };

  // ── 붙여넣기 처리 ─────────────────────────────────────────────────────────

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (isImageUrl(text)) {
      setUrlInput(text);
      e.preventDefault();
    }
  };

  // ── 이미지 드래그 정렬 ────────────────────────────────────────────────────

  const handleImageDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndexRef.current = index;
    // 빈 투명 고스트로 설정 (이미지 대신 그립 핸들 표시)
    const ghost = document.createElement('div');
    ghost.style.position = 'absolute';
    ghost.style.top = '-9999px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleImageDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === index) return;

    setOrderedImages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(index, 0, moved);
      dragIndexRef.current = index;
      return updated;
    });
  };

  const handleImageDragEnd = async () => {
    dragIndexRef.current = null;
    if (orderedImages.length === 0) return;

    setReordering(true);
    try {
      const items = orderedImages.map((img, idx) => ({ id: img.id, sortOrder: idx }));
      await reorderImages(items);
      invalidate();
    } catch {
      toast.error('순서 저장 중 오류가 발생했습니다.');
      // 실패 시 서버 데이터로 복구
      setOrderedImages(images);
    } finally {
      setReordering(false);
    }
  };

  // ── 대표 지정 ─────────────────────────────────────────────────────────────

  const handleSetPrimary = useMutation({
    mutationFn: async (imageId: string) => {
      setSettingPrimaryId(imageId);
      return setImagePrimary(imageId);
    },
    onSuccess: (res) => {
      if (res.success) { toast.success('대표 이미지가 변경되었습니다.'); invalidate(); }
    },
    onError: () => toast.error('대표 이미지 변경 중 오류가 발생했습니다.'),
    onSettled: () => setSettingPrimaryId(null),
  });

  // ── 삭제 ──────────────────────────────────────────────────────────────────

  const handleDelete = useMutation({
    mutationFn: async (imageId: string) => {
      setDeletingId(imageId);
      return deleteImage(imageId);
    },
    onSuccess: (res) => {
      if (res.success) { toast.success('이미지가 삭제되었습니다.'); invalidate(); }
    },
    onError: () => toast.error('이미지 삭제 중 오류가 발생했습니다.'),
    onSettled: () => setDeletingId(null),
  });

  // ── 렌더 ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">

        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">상품 이미지 관리</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[400px]">{productName}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* URL 등록 폼 */}
          <div
            className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
              isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex items-center gap-2 mb-3">
              <Upload size={16} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700">이미지 URL로 등록</span>
              <span className="text-xs text-gray-400">— URL 드롭 또는 붙여넣기</span>
            </div>

            {/* Google 이미지 사용법 안내 */}
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
              <Link2 size={13} className="mt-0.5 flex-shrink-0" />
              <span>
                Google 이미지 검색 또는 Google Lens에서 이미지 우클릭 → <b>"이미지 주소 복사"</b> 후 아래에 붙여넣으세요.
                이미지 파일만 GCS에 저장되고 원본 URL은 저장되지 않습니다.
              </span>
            </div>

            <div className="flex gap-2">
              <input
                ref={urlInputRef}
                type="url"
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => { if (e.key === 'Enter') handleImport(urlInput, selectedType); }}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
                disabled={importing}
              />

              {/* 이미지 유형 선택 */}
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as ImageType)}
                  className="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-7 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none cursor-pointer"
                  disabled={importing}
                >
                  <option value="detail">상세</option>
                  <option value="thumbnail">썸네일</option>
                  <option value="content">콘텐츠</option>
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>

              <button
                onClick={() => handleImport(urlInput, selectedType)}
                disabled={importing || !urlInput.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
              >
                {importing ? '등록 중...' : '등록'}
              </button>
            </div>

            {isDragOver && (
              <p className="mt-2 text-center text-xs font-medium text-blue-600">놓으면 이미지를 등록합니다</p>
            )}
          </div>

          {/* 이미지 목록 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon size={15} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">등록된 이미지</span>
              {!isLoading && (
                <span className="text-xs text-gray-400">({orderedImages.length}개)</span>
              )}
              {reordering && (
                <span className="text-xs text-blue-500 ml-1">순서 저장 중...</span>
              )}
              {orderedImages.length > 1 && !reordering && (
                <span className="text-xs text-gray-400 ml-auto">
                  <GripVertical size={12} className="inline mr-0.5" />
                  드래그로 순서 변경
                </span>
              )}
            </div>

            {isLoading ? (
              <p className="text-center text-xs text-gray-400 py-8">불러오는 중...</p>
            ) : isError ? (
              <p className="text-center text-xs text-red-500 py-8">이미지를 불러오는 중 오류가 발생했습니다.</p>
            ) : orderedImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-gray-200 bg-gray-50">
                <ImageIcon size={32} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">등록된 이미지가 없습니다.</p>
                <p className="text-xs text-gray-400 mt-1">위에서 URL을 입력하여 첫 이미지를 추가하세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {orderedImages.map((img, idx) => (
                  <ImageCard
                    key={img.id}
                    image={img}
                    index={idx}
                    isSettingPrimary={settingPrimaryId === img.id}
                    isDeleting={deletingId === img.id}
                    onSetPrimary={() => handleSetPrimary.mutate(img.id)}
                    onDelete={() => {
                      if (window.confirm('이미지를 삭제하시겠습니까?')) {
                        handleDelete.mutate(img.id);
                      }
                    }}
                    onDragStart={handleImageDragStart(idx)}
                    onDragOver={handleImageDragOver(idx)}
                    onDragEnd={handleImageDragEnd}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 이미지 유형 안내 */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-600">이미지 유형 안내</p>
            <p><b>썸네일</b>: 목록 카드 대표 이미지. 상품당 1개. 등록 시 기존 썸네일 교체.</p>
            <p><b>상세</b>: 상품 상세 페이지 이미지. 다수 등록 가능. 첫 등록 시 자동 대표 이미지.</p>
            <p><b>콘텐츠</b>: 상세 설명 본문용 이미지. 다수 등록 가능.</p>
          </div>
        </div>

        {/* 하단 */}
        <div className="border-t px-5 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 이미지 카드 ────────────────────────────────────────────────────────────────

function ImageCard({
  image,
  isSettingPrimary,
  isDeleting,
  onSetPrimary,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  image: ProductImageItem;
  index: number;
  isSettingPrimary: boolean;
  isDeleting: boolean;
  onSetPrimary: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`relative group rounded-lg overflow-hidden border cursor-grab active:cursor-grabbing ${
        image.isPrimary ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'
      } bg-gray-100`}
    >
      {/* 그립 핸들 */}
      <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical size={14} className="text-white drop-shadow" />
      </div>

      {/* 이미지 */}
      <div className="aspect-square">
        <img
          src={image.imageUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '';
            (e.target as HTMLImageElement).className = 'hidden';
          }}
        />
      </div>

      {/* 배지 */}
      <div className="absolute top-1 left-1 flex gap-1">
        <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {TYPE_LABELS[image.type]}
        </span>
        {image.isPrimary && (
          <span className="rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-medium text-white flex items-center gap-0.5">
            <Star size={9} className="fill-white" />
            대표
          </span>
        )}
      </div>

      {/* 호버 액션 */}
      <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
        {!image.isPrimary && (
          <button
            onClick={onSetPrimary}
            disabled={isSettingPrimary || isDeleting}
            title="대표 이미지로 설정"
            className="rounded-full bg-white p-1.5 hover:bg-blue-50 disabled:opacity-40"
          >
            <Star size={14} className="text-blue-600" />
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={isDeleting || isSettingPrimary}
          title="이미지 삭제"
          className="rounded-full bg-white p-1.5 hover:bg-red-50 disabled:opacity-40"
        >
          <Trash2 size={14} className="text-red-500" />
        </button>
      </div>

      {isDeleting && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
          <span className="text-xs text-gray-500">삭제 중...</span>
        </div>
      )}
    </div>
  );
}
