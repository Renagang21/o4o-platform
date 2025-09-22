/**
 * Media Utilities
 * 미디어 파일 처리와 관련된 유틸리티 함수들
 */

import { MediaFile } from '@/types/content';
import { MediaItem } from '../types';

/**
 * MediaFile을 MediaItem으로 변환
 */
export const transformMediaFile = (file: MediaFile): MediaItem => ({
  id: file.id,
  url: file.url,
  type: file.type === 'image' ? 'image' : file.type === 'video' ? 'video' : 'image',
  title: file.name,
  alt: file.altText || file.name,
  width: file.dimensions?.width,
  height: file.dimensions?.height,
  fileSize: file.size,
  mimeType: file.mimeType,
  thumbnailUrl: file.thumbnailUrl,
  caption: file.caption,
  uploadedAt: file.uploadedAt
});

/**
 * MediaItem을 MediaFile 형식으로 변환 (역변환)
 */
export const transformToMediaFile = (item: MediaItem): Partial<MediaFile> => ({
  id: item.id,
  url: item.url,
  name: item.title,
  type: item.type,
  altText: item.alt,
  dimensions: item.width && item.height ? {
    width: item.width,
    height: item.height
  } : undefined,
  size: item.fileSize,
  mimeType: item.mimeType,
  thumbnailUrl: item.thumbnailUrl,
  caption: item.caption,
  uploadedAt: item.uploadedAt || new Date().toISOString()
});

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 파일 타입이 이미지인지 확인
 */
export const isImageFile = (mimeType?: string): boolean => {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
};

/**
 * 파일 타입이 비디오인지 확인
 */
export const isVideoFile = (mimeType?: string): boolean => {
  if (!mimeType) return false;
  return mimeType.startsWith('video/');
};

/**
 * 지원되는 이미지 형식 목록
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml'
];

/**
 * 지원되는 비디오 형식 목록
 */
export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/mov',
  'video/avi',
  'video/wmv'
];

/**
 * 파일 타입이 지원되는지 확인
 */
export const isSupportedFileType = (mimeType: string, acceptedTypes: ('image' | 'video')[]): boolean => {
  if (acceptedTypes.includes('image') && SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
    return true;
  }
  if (acceptedTypes.includes('video') && SUPPORTED_VIDEO_TYPES.includes(mimeType)) {
    return true;
  }
  return false;
};

/**
 * 파일에서 미디어 타입 추출
 */
export const getMediaTypeFromFile = (file: File): 'image' | 'video' | 'other' => {
  if (isImageFile(file.type)) return 'image';
  if (isVideoFile(file.type)) return 'video';
  return 'other';
};

/**
 * 업로드 가능한 파일 필터링
 */
export const filterUploadableFiles = (
  files: File[],
  acceptedTypes: ('image' | 'video')[],
  maxFileSize: number = 100 * 1024 * 1024 // 100MB
): { valid: File[]; invalid: Array<{ file: File; reason: string }> } => {
  const valid: File[] = [];
  const invalid: Array<{ file: File; reason: string }> = [];

  files.forEach(file => {
    if (file.size > maxFileSize) {
      invalid.push({
        file,
        reason: `파일 크기가 너무 큽니다. (최대 ${formatFileSize(maxFileSize)})`
      });
    } else if (!isSupportedFileType(file.type, acceptedTypes)) {
      invalid.push({
        file,
        reason: '지원하지 않는 파일 형식입니다.'
      });
    } else {
      valid.push(file);
    }
  });

  return { valid, invalid };
};

/**
 * 이미지 썸네일 생성
 */
export const generateImageThumbnail = (
  file: File,
  maxWidth: number = 300,
  maxHeight: number = 300,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate thumbnail dimensions
      let { width, height } = img;
      const ratio = Math.min(maxWidth / width, maxHeight / height);

      width *= ratio;
      height *= ratio;

      canvas.width = width;
      canvas.height = height;

      // Draw resized image
      ctx?.drawImage(img, 0, 0, width, height);

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for thumbnail generation'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * 비디오 썸네일 생성
 */
export const generateVideoThumbnail = (
  file: File,
  timeOffset: number = 1 // seconds
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const video = document.createElement('video');

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };

    video.onseeked = () => {
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataUrl);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video for thumbnail generation'));
    };

    video.src = URL.createObjectURL(file);
    video.currentTime = timeOffset;
  });
};

/**
 * 미디어 아이템을 다운로드
 */
export const downloadMediaItem = async (item: MediaItem): Promise<void> => {
  try {
    const response = await fetch(item.url);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = item.title || `media-${item.id}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error('파일 다운로드에 실패했습니다.');
  }
};

/**
 * 이미지 메타데이터 추출
 */
export const extractImageMetadata = (file: File): Promise<{
  width: number;
  height: number;
  aspectRatio: number;
}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image metadata'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * 미디어 아이템 정렬 함수들
 */
export const sortMediaItems = {
  byName: (a: MediaItem, b: MediaItem) => a.title.localeCompare(b.title),
  bySize: (a: MediaItem, b: MediaItem) => (b.fileSize || 0) - (a.fileSize || 0),
  byDate: (a: MediaItem, b: MediaItem) => {
    const dateA = new Date(a.uploadedAt || 0);
    const dateB = new Date(b.uploadedAt || 0);
    return dateB.getTime() - dateA.getTime();
  },
  byType: (a: MediaItem, b: MediaItem) => a.type.localeCompare(b.type)
};

/**
 * 미디어 아이템 필터링 함수들
 */
export const filterMediaItems = {
  byType: (items: MediaItem[], type: 'image' | 'video' | 'all') => {
    if (type === 'all') return items;
    return items.filter(item => item.type === type);
  },

  bySearch: (items: MediaItem[], searchTerm: string) => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      item.title.toLowerCase().includes(term) ||
      item.alt?.toLowerCase().includes(term) ||
      item.caption?.toLowerCase().includes(term)
    );
  },

  byDateRange: (items: MediaItem[], startDate?: Date, endDate?: Date) => {
    if (!startDate && !endDate) return items;

    return items.filter(item => {
      if (!item.uploadedAt) return false;
      const itemDate = new Date(item.uploadedAt);

      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;

      return true;
    });
  }
};

/**
 * 미디어 컬렉션 유틸리티
 */
export const createMediaCollection = (items: MediaItem[]) => ({
  items,

  filter: (predicate: (item: MediaItem) => boolean) =>
    createMediaCollection(items.filter(predicate)),

  sort: (compareFn: (a: MediaItem, b: MediaItem) => number) =>
    createMediaCollection([...items].sort(compareFn)),

  search: (term: string) =>
    createMediaCollection(filterMediaItems.bySearch(items, term)),

  ofType: (type: 'image' | 'video' | 'all') =>
    createMediaCollection(filterMediaItems.byType(items, type)),

  inDateRange: (startDate?: Date, endDate?: Date) =>
    createMediaCollection(filterMediaItems.byDateRange(items, startDate, endDate)),

  get count() { return items.length; },
  get isEmpty() { return items.length === 0; },
  get types() { return [...new Set(items.map(item => item.type))]; },
  get totalSize() { return items.reduce((sum, item) => sum + (item.fileSize || 0), 0); }
});