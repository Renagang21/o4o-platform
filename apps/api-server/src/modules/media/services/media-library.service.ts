/**
 * MediaLibraryService — WO-O4O-COMMON-MEDIA-LIBRARY-FOUNDATION-V1
 *
 * 공용 미디어 라이브러리 업로드/조회 서비스.
 * GCS 업로드 + DB 메타데이터 저장.
 */

import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { parse as parseHtml } from 'node-html-parser';
import type { DataSource, Repository } from 'typeorm';
import { MediaAsset } from '../entities/MediaAsset.entity.js';
import logger from '../../../utils/logger.js';

/**
 * WO-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1:
 *   HTML 안에서 img/video/source 태그의 src 가 resourceUrl 과 실제 일치하는지 판정.
 *   iframe 제외(YouTube=Resource 아님). 본문 텍스트에 URL 이 언급된 경우는 사용으로 보지 않음.
 */
function htmlReferencesResourceUrl(html: string | null | undefined, resourceUrl: string): boolean {
  if (!html || !resourceUrl) return false;
  try {
    const root = parseHtml(html);
    const els = root.querySelectorAll('img, video, source');
    return els.some((el) => (el.getAttribute('src') || '').trim() === resourceUrl.trim());
  } catch {
    return false;
  }
}

export interface MediaAssetUsage {
  /** 사용 표면(usage_type): pop/qr/signage/banner/notice */
  surface: string | null;
  usageType: string | null;
  title: string | null;
  organizationId: string | null;
  updatedAt: Date | null;
  resourceUrl: string;
  /** store_execution_asset id */
  assetId: string;
}

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// preserveOriginal 안전 상한 (상세설명 등 원본 보존 업로드) — 초과 시에만 고품질 축소
const PRESERVE_MAX_WIDTH = 2000;
const PRESERVE_MAX_HEIGHT = 30000;
const PRESERVE_MAX_PIXELS = 40_000_000; // 40MP
const PRESERVE_MAX_BYTES = 8 * 1024 * 1024; // 8MB

/**
 * 한글 파일명 보정 (WO-O4O-KPA-RESOURCES-CREATE-MODAL-UX-V1)
 *
 * multer/busboy 가 multipart filename 을 latin1 로 파싱하면
 * UTF-8 한글 바이트열이 깨진 문자열로 저장된다.
 * - 이미 올바른 유니코드(한글 포함) → 그대로 반환
 * - 비ASCII 고바이트 문자 포함 → latin1 → utf8 재해석 후
 *   결과에 한글이 있으면 보정 값 사용
 * - ASCII만 포함된 파일명 → 그대로 반환
 */
function decodeOriginalName(name: string): string {
  // 이미 유니코드 한글(AC00-D7AF, 1100-11FF, 3130-318F)이 포함돼 있으면 올바른 상태
  if (/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(name)) return name;
  // 비ASCII 바이트가 있을 때만 재해석 시도
  if (/[^\x00-\x7F]/.test(name)) {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    if (/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(decoded)) return decoded;
  }
  return name;
}

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
    folder = 'general',
    opts?: { imageMode?: 'thumbnail-1000' | 'preserve-original' },
  ): Promise<MediaAsset> {
    const isImage = IMAGE_MIMES.includes(file.mimetype);
    let buffer = file.buffer;
    let mimeType = file.mimetype;
    let width: number | null = null;
    let height: number | null = null;

    // 이미지 처리
    if (isImage) {
      const metadata = await sharp(file.buffer).metadata();
      const ow = metadata.width ?? 0;
      const oh = metadata.height ?? 0;

      // WO-O4O-NETURE-OWN-ADMIN-IMPORT-THUMBNAIL-1000-RESTORE-V1:
      //   대표 썸네일은 서버에서 정확히 1000x1000 표준화(브라우저 canvas 금지).
      //   상품 전체가 잘리지 않도록 fit:contain(잘림 없음) + 흰 배경. EXIF orientation 반영(rotate).
      if (opts?.imageMode === 'thumbnail-1000') {
        const processed = await sharp(file.buffer)
          .rotate()
          .resize(1000, 1000, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .webp({ quality: 90 })
          .toBuffer();
        const pm = await sharp(processed).metadata();
        buffer = processed;
        mimeType = 'image/webp';
        width = pm.width || 1000;
        height = pm.height || 1000;
      }
      // WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1 (품질):
      //   상세설명 이미지는 원본 픽셀/비율 보존(폭 기준 처리). 1000x1000 표준화를 적용하지 않는다.
      else if (opts?.imageMode === 'preserve-original') {
        // 상세설명 이미지는 **폭 기준**으로만 처리한다. 높이/용량 제한을 맞추려고
        // fit:inside 로 전체를 줄여 가로폭까지 축소하면 안 된다(흐림 재발 방지).
        //  - 높이 초과 또는 총 픽셀 초과: 폭 축소로 해결 불가 → 명확히 거부
        //  - 폭만 초과: 폭=2000 으로 비율 축소(높이 자동)
        //  - 용량만 초과: 해상도 유지하고 고품질 재압축
        //  - 그 외: 원본 바이트+MIME 그대로 (재인코딩 0)
        if (oh > PRESERVE_MAX_HEIGHT || ow * oh > PRESERVE_MAX_PIXELS) {
          throw new Error(`IMAGE_TOO_TALL: ${ow}x${oh} exceeds height(${PRESERVE_MAX_HEIGHT})/pixel(${PRESERVE_MAX_PIXELS}) limit`);
        }
        const needWidthResize = ow > PRESERVE_MAX_WIDTH;
        const needRecompress = file.buffer.length > PRESERVE_MAX_BYTES;
        if (!needWidthResize && !needRecompress) {
          // 원본 바이트 + MIME 그대로 저장 (텍스트 선명도 손실 0, EXIF orientation 보존)
          buffer = file.buffer;
          mimeType = file.mimetype;
          width = ow || null;
          height = oh || null;
        } else {
          // 폭만 2000 으로 축소(높이 자동 비율) 또는 동일 해상도 고품질 재압축.
          // 높이/용량 때문에 폭을 강제로 줄이지 않는다(width-only).
          let pipeline = sharp(file.buffer).rotate();
          if (needWidthResize) {
            pipeline = pipeline.resize({ width: PRESERVE_MAX_WIDTH, withoutEnlargement: true });
          }
          const processed = await pipeline.webp({ quality: 90 }).toBuffer();
          const pm = await sharp(processed).metadata();
          buffer = processed;
          mimeType = 'image/webp';
          width = pm.width || ow || null;
          height = pm.height || oh || null;
        }
      } else {
        // 표준 정책: 1200x1200 fit-inside + WebP(85) (대표/썸네일/일반 업로드)
        const processed = await sharp(file.buffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
        const processedMeta = await sharp(processed).metadata();
        buffer = processed;
        mimeType = 'image/webp';
        width = processedMeta.width || ow || null;
        height = processedMeta.height || oh || null;
      }
    }

    // GCS 업로드
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    // 저장된 실제 mimeType 기준 확장자 (preserve 시 원본 mime, 그 외 webp)
    const ext = isImage ? this.getExtension(mimeType, file.originalname) : this.getExtension(file.mimetype, file.originalname);
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
      originalName: decodeOriginalName(file.originalname),
      mimeType,
      fileSize: buffer.length,
      assetType: isImage ? 'image' : this.classifyAssetType(file.mimetype),
      width,
      height,
      folder,
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
    folder?: string;
    // WO-O4O-CONTENT-RESOURCE-UNIFIED-SEARCH-V1: Metadata 기반 검색/필터 (AND 결합)
    q?: string;
    language?: string;
    source?: string;
    usageType?: string;
    status?: string;
  }): Promise<{ data: MediaAsset[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('m')
      .where('m.is_library_public = true')
      .orderBy('m.created_at', 'DESC');

    // Type(asset_type) — 파일 종류 필터
    if (options.assetType) {
      qb.andWhere('m.asset_type = :assetType', { assetType: options.assetType });
    }

    if (options.folder) {
      qb.andWhere('m.folder = :folder', { folder: options.folder });
    }

    // WO-O4O-CONTENT-RESOURCE-UNIFIED-SEARCH-V1 — Metadata 정확 필터 (AND).
    //   url/gcs_path/file_name(파일 속성)은 검색 대상이 아니다(§5.5).
    if (options.language) qb.andWhere('m.language = :language', { language: options.language });
    if (options.source) qb.andWhere('m.source = :source', { source: options.source });
    if (options.usageType) qb.andWhere('m.usage_type = :usageType', { usageType: options.usageType });
    if (options.status) qb.andWhere('m.status = :status', { status: options.status });

    // 검색어(q) — title/description/memo(ILIKE 부분) + keywords/tags(jsonb::text ILIKE). (§9)
    const q = options.q?.trim();
    if (q) {
      qb.andWhere(
        '(m.title ILIKE :q OR m.description ILIKE :q OR m.memo ILIKE :q OR m.keywords::text ILIKE :q OR m.tags::text ILIKE :q)',
        { q: `%${q}%` },
      );
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

  /**
   * WO-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1: 사용처 조회(read-only).
   *   asset.url 기준으로 store_execution_assets.html_content 후보(ILIKE)를 좁힌 뒤,
   *   HTML 파싱으로 img/video/source src 에 url 이 실제 존재하는 것만 사용처로 확정(iframe 제외).
   *   media_assets 는 서비스/조직 무관 공용 자산 → org 필터 없이 전 사용처 반환(각 항목 organizationId 표기).
   *   데이터 변경 없음.
   */
  async getUsage(assetId: string): Promise<{ resourceUrl: string; usages: MediaAssetUsage[] }> {
    const asset = await this.repo.findOne({ where: { id: assetId } });
    if (!asset) throw new Error('Asset not found');
    const url = asset.url;
    if (!url) return { resourceUrl: '', usages: [] };

    // coarse 후보: html_content 에 url 문자열이 포함된 execution asset (소규모 → 인덱스 불필요)
    const rows: Array<{
      id: string; organization_id: string | null; title: string | null;
      usage_type: string | null; updated_at: Date | null; html_content: string | null;
    }> = await this.dataSource.query(
      `SELECT id, organization_id, title, usage_type, updated_at, html_content
         FROM store_execution_assets
        WHERE html_content IS NOT NULL AND html_content ILIKE $1
        ORDER BY updated_at DESC`,
      [`%${url}%`],
    );

    // 정밀 확정: img/video/source src 실제 일치만 (본문 텍스트 언급 제외)
    const usages: MediaAssetUsage[] = rows
      .filter((r) => htmlReferencesResourceUrl(r.html_content, url))
      .map((r) => ({
        surface: r.usage_type,
        usageType: r.usage_type,
        title: r.title,
        organizationId: r.organization_id,
        updatedAt: r.updated_at,
        resourceUrl: url,
        assetId: r.id,
      }));

    return { resourceUrl: url, usages };
  }

  /**
   * 폴더 이동.
   */
  async moveToFolder(assetId: string, folder: string): Promise<MediaAsset> {
    const asset = await this.repo.findOne({ where: { id: assetId } });
    if (!asset) throw new Error('Asset not found');
    asset.folder = folder;
    return this.repo.save(asset);
  }

  /**
   * Content Resource Metadata 수정 — WO-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1.
   *   서술 메타데이터만 수정한다. 파일 속성(url/gcs_path/file_name/original_name/mime_type/file_size/
   *   width/height)은 절대 변경하지 않는다(URL 불변). 파일 재업로드 없이 metadata 갱신.
   */
  async updateMetadata(
    assetId: string,
    patch: {
      title?: string | null;
      description?: string | null;
      tags?: string[] | null;
      keywords?: string[] | null;
      language?: string | null;
      source?: string | null;
      usageType?: string | null;
      status?: string | null;
      memo?: string | null;
      isLibraryPublic?: boolean;
    },
    userId?: string | null,
  ): Promise<MediaAsset> {
    const asset = await this.repo.findOne({ where: { id: assetId } });
    if (!asset) throw new Error('Asset not found');

    // 화이트리스트 필드만 반영(파일 속성은 절대 미변경)
    if (patch.title !== undefined) asset.title = patch.title;
    if (patch.description !== undefined) asset.description = patch.description;
    if (patch.tags !== undefined) asset.tags = patch.tags;
    if (patch.keywords !== undefined) asset.keywords = patch.keywords;
    if (patch.language !== undefined) asset.language = patch.language;
    if (patch.source !== undefined) asset.source = patch.source;
    if (patch.usageType !== undefined) asset.usageType = patch.usageType;
    if (patch.status !== undefined) asset.status = patch.status;
    if (patch.memo !== undefined) asset.memo = patch.memo;
    if (patch.isLibraryPublic !== undefined) asset.isLibraryPublic = patch.isLibraryPublic;
    asset.updatedBy = userId ?? asset.updatedBy;

    return this.repo.save(asset);
  }

  /**
   * 자산 삭제 (DB + GCS).
   */
  async deleteAsset(assetId: string): Promise<void> {
    const asset = await this.repo.findOne({ where: { id: assetId } });
    if (!asset) throw new Error('Asset not found');

    // GCS 삭제 (gcsPath가 있는 경우만)
    if (asset.gcsPath) {
      try {
        const bucket = this.storage.bucket(this.bucketName);
        await bucket.file(asset.gcsPath).delete();
        logger.info(`[MediaLibrary] GCS deleted: ${asset.gcsPath}`);
      } catch (err) {
        logger.warn(`[MediaLibrary] GCS delete failed (continuing): ${asset.gcsPath}`, err);
      }
    }

    await this.repo.remove(asset);
    logger.info(`[MediaLibrary] Deleted asset: ${assetId}`);
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
