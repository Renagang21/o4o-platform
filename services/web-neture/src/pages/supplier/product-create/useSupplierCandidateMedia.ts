import { useState, useCallback } from 'react';
import type { MediaInsert } from '@o4o/content-editor';
import { mediaApi } from '../../../lib/api/media';
import type { ImportDraft } from '../../../lib/product-import/types';

export function useSupplierCandidateMedia(importDraft: ImportDraft | null) {
  // Images — WO-NETURE-IMAGE-ASSET-STRUCTURE-V1: 3구역 분리
  // WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1: 라이브러리 선택 지원
  // WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1: 상세/성분도 라이브러리 지원
  type ThumbnailSource =
    | { kind: 'file'; file: File; preview: string }
    | { kind: 'library'; url: string }
    | null;
  type ImageItem = { kind: 'file'; file: File; preview: string } | { kind: 'library'; url: string };

  function dataUrlToFile(dataUrl: string, filename: string): File {
    const [header, b64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)![1];
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new File([arr], filename, { type: mime });
  }

  // WO-O4O-PRODUCT-IMPORT-ASSISTANT-V1: draft 이미지 URL → library 항목으로 초기화
  // WO-NETURE-PRODUCT-IMPORT-ASSISTANT-USABILITY-FIX-V1: 보정 data URL 지원
  const [thumbnailSource, setThumbnailSource] = useState<ThumbnailSource>(() => {
    if (importDraft?.thumbnailCorrectedDataUrl) {
      const file = dataUrlToFile(importDraft.thumbnailCorrectedDataUrl, 'thumbnail-corrected.jpg');
      return { kind: 'file', file, preview: importDraft.thumbnailCorrectedDataUrl };
    }
    return importDraft?.thumbnailUrl ? { kind: 'library', url: importDraft.thumbnailUrl } : null;
  });
  const [showThumbnailPicker, setShowThumbnailPicker] = useState(false);
  const [contentItems, setContentItems] = useState<ImageItem[]>(
    // Import copies gallery images into detailImageUrls; Candidate accepts both as contentImageUrls.
    [
      ...new Set([
        ...(importDraft?.detailImageUrls ?? []),
        ...(importDraft?.contentImageUrls ?? []),
      ]),
    ].map((url) => ({ kind: 'library' as const, url })),
  );
  // content 라이브러리 선택 대상
  const [imagePickerTarget, setImagePickerTarget] = useState<'content' | null>(null);
  // 에디터 인라인 이미지 라이브러리 선택 콜백
  const [mediaPickerTarget, setMediaPickerTarget] = useState<((media: MediaInsert) => void) | null>(
    null,
  );

  // Image handlers — WO-NETURE-IMAGE-ASSET-STRUCTURE-V1
  // WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1: 파일/라이브러리 통합
  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (thumbnailSource?.kind === 'file') URL.revokeObjectURL(thumbnailSource.preview);
    setThumbnailSource({ kind: 'file', file, preview: URL.createObjectURL(file) });
    e.target.value = '';
  };

  const handleThumbnailFromLibrary = (asset: { url: string }) => {
    if (thumbnailSource?.kind === 'file') URL.revokeObjectURL(thumbnailSource.preview);
    setThumbnailSource({ kind: 'library', url: asset.url });
    setShowThumbnailPicker(false);
  };

  const removeThumbnail = () => {
    if (thumbnailSource?.kind === 'file') URL.revokeObjectURL(thumbnailSource.preview);
    setThumbnailSource(null);
  };

  // WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1: ImageItem 기반 핸들러
  const handleMultiImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setItems: React.Dispatch<React.SetStateAction<ImageItem[]>>,
  ) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (newFiles.length === 0) return;
    const newItems: ImageItem[] = newFiles.map((f) => ({
      kind: 'file' as const,
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setItems((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removeImageItem = (
    idx: number,
    items: ImageItem[],
    setItems: React.Dispatch<React.SetStateAction<ImageItem[]>>,
  ) => {
    const item = items[idx];
    if (item.kind === 'file') URL.revokeObjectURL(item.preview);
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // 에디터 인라인 이미지: masterId 없으므로 미디어 라이브러리에 업로드
  const editorImageUpload = useCallback(async (file: File): Promise<string> => {
    const res = await mediaApi.upload(file, true, undefined, 'description');
    if (res.success && res.data) return res.data.url;
    throw new Error(res.error || '이미지 업로드 실패');
  }, []);

  return {
    thumbnailSource,
    setThumbnailSource,
    showThumbnailPicker,
    setShowThumbnailPicker,
    contentItems,
    setContentItems,
    imagePickerTarget,
    setImagePickerTarget,
    mediaPickerTarget,
    setMediaPickerTarget,
    handleThumbnailSelect,
    handleThumbnailFromLibrary,
    removeThumbnail,
    handleMultiImageSelect,
    removeImageItem,
    editorImageUpload,
  };
}
