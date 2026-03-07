/**
 * ImageStorageService — GCS 상품 이미지 업로드/삭제
 *
 * WO-O4O-NETURE-PRODUCT-IMAGE-STRUCTURE-V1
 *
 * Cloud Run ADC (Application Default Credentials) 사용
 */

import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import logger from '../../../utils/logger.js';

export class ImageStorageService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    this.storage = new Storage();
    this.bucketName = process.env.GCS_PRODUCT_IMAGE_BUCKET || 'o4o-neture-product-images';
  }

  /**
   * 이미지 업로드
   * @returns { url: public URL, gcsPath: GCS 경로 }
   */
  async uploadImage(
    masterId: string,
    buffer: Buffer,
    mimeType: string,
    originalName: string
  ): Promise<{ url: string; gcsPath: string }> {
    const ext = this.getExtension(mimeType, originalName);
    const gcsPath = `products/${masterId}/${randomUUID()}${ext}`;

    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(gcsPath);

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
    });

    const url = `https://storage.googleapis.com/${this.bucketName}/${gcsPath}`;

    logger.info(`[ImageStorage] Uploaded image: ${gcsPath} (${buffer.length} bytes)`);

    return { url, gcsPath };
  }

  /**
   * 이미지 삭제
   */
  async deleteImage(gcsPath: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      await bucket.file(gcsPath).delete();
      logger.info(`[ImageStorage] Deleted image: ${gcsPath}`);
    } catch (error) {
      logger.warn(`[ImageStorage] Failed to delete image from GCS: ${gcsPath}`, error);
      // GCS 삭제 실패는 치명적이지 않음 — DB 레코드는 삭제 진행
    }
  }

  private getExtension(mimeType: string, originalName: string): string {
    const mimeExtMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };

    if (mimeExtMap[mimeType]) return mimeExtMap[mimeType];

    const lastDot = originalName.lastIndexOf('.');
    if (lastDot !== -1) return originalName.substring(lastDot).toLowerCase();

    return '.jpg';
  }
}
