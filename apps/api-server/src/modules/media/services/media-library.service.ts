/**
 * MediaLibraryService — WO-O4O-COMMON-MEDIA-LIBRARY-FOUNDATION-V1
 *
 * 공용 미디어 라이브러리 업로드/조회 서비스.
 * GCS 업로드 + DB 메타데이터 저장.
 */

import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import type { DataSource, Repository } from 'typeorm';
import { MediaAsset } from '../entities/MediaAsset.entity.js';
import logger from '../../../utils/logger.js';

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export class MediaLibraryService {
  private storage: Storage;
  private bucketName: string;
  private repo: Repository<MediaAsset>;

  constructor(private dataSource: DataSource) {
    this.storage = new Storage();
    this.bucketName = process.env.GCS_MEDIA_LIBRARY_BUCKET || 'o4o-media-library';
    this.repo = dataSource.getRepository(MediaAsset);
  }

  /**
   * 공용 미디어 라이브러리에 파일 업로드.
   * 이미지인 경우 리사이즈 + WebP 변환.
   */
  async upload(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    userId: string,
    serviceKey?: string,
  ): Promise<MediaAsset> {
    const isImage = IMAGE_MIMES.includes(file.mimetype);
    let buffer = file.buffer;
    let mimeType = file.mimetype;
    let width: number | null = null;
    let height: number | null = null;

    // 이미지 처리: 리사이즈 + WebP 변환
    if (isImage) {
      const metadata = await sharp(file.buffer).metadata();
      const processed = await sharp(file.buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const processedMeta = await sharp(processed).metadata();
      buffer = processed;
      mimeType = 'image/webp';
      width = processedMeta.width || metadata.width || null;
      height = processedMeta.height || metadata.height || null;
    }

    // GCS 업로드
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const ext = isImage ? '.webp' : this.getExtension(file.mimetype, file.originalname);
    const fileName = `${randomUUID()}${ext}`;
    const gcsPath = `media/${yyyy}/${mm}/${fileName}`;

    const bucket = this.storage.bucket(this.bucketName);
    const gcsFile = bucket.file(gcsPath);

    await gcsFile.save(buffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
    });

    const url = `https://storage.googleapis.com/${this.bucketName}/${gcsPath}`;

    // DB 저장
    const asset = this.repo.create({
      url,
      gcsPath,
      fileName,
      originalName: file.originalname,
      mimeType,
      fileSize: buffer.length,
      assetType: isImage ? 'image' : this.classifyAssetType(file.mimetype),
      width,
      height,
      serviceKey: serviceKey || null,
      uploadedBy: userId,
      isLibraryPublic: true,
      consentedAt: now,
    });

    const saved = await this.repo.save(asset);
    logger.info(`[MediaLibrary] Uploaded: ${gcsPath} (${buffer.length} bytes) by ${userId}`);

    return saved;
  }

  /**
   * 공용 라이브러리 목록 조회 (공개 자산만).
   */
  async list(options: {
    page?: number;
    limit?: number;
    assetType?: string;
  }): Promise<{ data: MediaAsset[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('m')
      .where('m.is_library_public = true')
      .orderBy('m.created_at', 'DESC');

    if (options.assetType) {
      qb.andWhere('m.asset_type = :assetType', { assetType: options.assetType });
    }

    const [data, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * 단건 조회.
   */
  async getById(id: string): Promise<MediaAsset | null> {
    return this.repo.findOne({ where: { id } });
  }

  private getExtension(mimeType: string, originalName: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'application/pdf': '.pdf',
      'video/mp4': '.mp4',
    };
    if (mimeMap[mimeType]) return mimeMap[mimeType];
    const ext = originalName.split('.').pop();
    return ext ? `.${ext}` : '';
  }

  private classifyAssetType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }
}
