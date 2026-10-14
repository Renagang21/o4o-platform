import { useState, useEffect, useCallback, useRef } from 'react';
import { productApi, type SupplierProduct, type ProductImage } from '../../../lib/api';
import type { MediaInsert } from '@o4o/content-editor';
import { toast } from '@o4o/error-handling';
import { imageErrorMessage } from './productDetailHelpers';

export function useSupplierProductImages(
  product: SupplierProduct | null,
  open: boolean,
  onSaved?: () => void,
) {
  // Image state
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'thumbnail' | 'detail' | 'content'>('detail');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WO-NETURE-DESCRIPTION-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1
  const [mediaPickerTarget, setMediaPickerTarget] = useState<((media: MediaInsert) => void) | null>(
    null,
  );
  // WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1
  const [showImagePicker, setShowImagePicker] = useState(false);

  // Load images when drawer opens
  useEffect(() => {
    if (product?.masterId && open) {
      setLoadingImages(true);
      productApi.getProductImages(product.masterId).then((data) => {
        setImages(data);
        setLoadingImages(false);
      });
    }
    if (!open) {
      setImages([]);
    }
  }, [product?.masterId, open]);

  // Image handlers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !product?.masterId) return;
    setUploading(true);
    const res = await productApi.uploadProductImage(product.masterId, file, uploadType);
    if (res.success) {
      const updated = await productApi.getProductImages(product.masterId);
      setImages(updated);
      onSaved?.();
    } else {
      // WO-O4O-NETURE-SUPPLIER-PRODUCT-AUTHORING-EXPANSION-CLOSEOUT-BATCH-V1: 이미지 실패 무음 금지
      toast.error(`이미지 업로드 실패: ${imageErrorMessage(res.error)}`);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Editor inline image upload — RichTextEditor onImageUpload callback
  const editorImageUpload = useCallback(
    async (file: File): Promise<string> => {
      if (!product?.masterId) throw new Error('No product');
      const res = await productApi.uploadProductImage(product.masterId, file, 'content');
      if (res.success && res.data) {
        // Refresh images list so existingImages stays in sync
        const updated = await productApi.getProductImages(product.masterId);
        setImages(updated);
        return res.data.imageUrl;
      }
      throw new Error(res.error || 'Upload failed');
    },
    [product?.masterId],
  );

  const handleImageDelete = async (imageId: string) => {
    if (!product?.masterId) return;
    const ok = await productApi.deleteProductImage(imageId, product.masterId);
    if (ok) {
      setImages((prev) => prev.filter((i) => i.id !== imageId));
      onSaved?.();
    } else {
      toast.error('이미지를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  // WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1: 라이브러리 이미지 선택 핸들러
  const handleMediaPickerSelect = async (asset: { url: string }) => {
    if (!product?.masterId) return;
    setShowImagePicker(false);
    setUploading(true);
    const res = await productApi.registerImageFromUrl(product.masterId, asset.url, uploadType);
    if (res.success) {
      const updated = await productApi.getProductImages(product.masterId);
      setImages(updated);
      onSaved?.();
    } else {
      toast.error(`이미지 등록 실패: ${imageErrorMessage(res.error)}`);
    }
    setUploading(false);
  };

  return {
    images,
    loadingImages,
    uploading,
    uploadType,
    setUploadType,
    fileInputRef,
    mediaPickerTarget,
    setMediaPickerTarget,
    showImagePicker,
    setShowImagePicker,
    handleImageUpload,
    editorImageUpload,
    handleImageDelete,
    handleMediaPickerSelect,
  };
}
