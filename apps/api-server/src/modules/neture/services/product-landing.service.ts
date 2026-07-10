/**
 * ProductLandingService — 제품 Landing(대표 QR 진입점) 발급/조회
 *
 * WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1 / Phase 2
 * Baseline: O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V2-AMENDMENT
 *
 * - mintForMaster: ProductMaster 당 Landing 1개 **idempotent** 발급(단건). 대량 발급 아님(후속 apply WO).
 * - getPublicLanding: 공개 read model — 제품 기본정보 + 설명(canonical, 없으면 "준비 중") + 노출 게이트.
 *   QR 이미지는 저장하지 않는다(공개 URL = /p/{public_key} 의 동적 인코딩).
 *
 * Freeze #6: ProductMaster 무변경(Landing→Master 단방향). Freeze #7: master 당 Landing 1개(UNIQUE).
 * 전부 parameterized SQL.
 */

import type { DataSource } from 'typeorm';
import { randomBytes } from 'crypto';
import { generateQrSvg } from '../../../services/qr-print.service.js';

const KEY_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // 혼동 문자(0,1,l,o) 제외
const KEY_LENGTH = 12;
const PLACEHOLDER_TEXT = '상세 설명을 준비 중입니다.';
/** 제품 Landing 공개 도메인 (전역 제품 자산 → neture.co.kr). */
const LANDING_ORIGIN = (process.env.NETURE_PUBLIC_ORIGIN || 'https://neture.co.kr').replace(/\/$/, '');
export function productLandingUrl(publicKey: string): string {
  return `${LANDING_ORIGIN}/p/${publicKey}`;
}

export interface ProductLandingRow {
  id: string;
  productMasterId: string;
  publicKey: string;
  status: string;
  exposureState: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProductLanding {
  publicKey: string;
  productMasterId: string;
  status: string;
  exposureState: string;
  blocked: boolean; // 노출 게이트 차단 여부
  product: {
    name: string | null;
    manufacturerName: string | null;
    barcode: string | null;
    regulatoryType: string | null;
    specification: string | null;
  } | null;
  description: {
    hasCanonical: boolean;
    descriptionType: string | null;
    content: string | null;
    summary: string | null;
  };
  placeholder: string | null; // 설명 없을 때 안내 문구
  languages: string[]; // 공개 가능한 언어(canonical STORE) — ko 우선 정렬
  resolvedLocale: string | null; // 실제 표시 중인 언어
}

export class ProductLandingService {
  constructor(private dataSource: DataSource) {}

  private generateKey(): string {
    const bytes = randomBytes(KEY_LENGTH);
    let out = '';
    for (let i = 0; i < KEY_LENGTH; i++) out += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
    return out;
  }

  private mapRow(r: any): ProductLandingRow {
    return {
      id: r.id,
      productMasterId: r.product_master_id,
      publicKey: r.public_key,
      status: r.status,
      exposureState: r.exposure_state,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async getByMaster(masterId: string): Promise<ProductLandingRow | null> {
    const rows = await this.dataSource.query(
      `SELECT * FROM product_landings WHERE product_master_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [masterId],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /** master 당 Landing 1개 idempotent 발급. 이미 있으면 그대로 반환. */
  async mintForMaster(masterId: string, source = 'manual'): Promise<{ landing: ProductLandingRow; created: boolean }> {
    const master = await this.dataSource.query(`SELECT id FROM product_masters WHERE id = $1 LIMIT 1`, [masterId]);
    if (!master[0]) throw new Error('MASTER_NOT_FOUND');

    const existing = await this.getByMaster(masterId);
    if (existing) return { landing: existing, created: false };

    // public_key 충돌 시 재시도. master 유니크(partial index) 충돌 시 재조회.
    for (let attempt = 0; attempt < 6; attempt++) {
      const publicKey = this.generateKey();
      try {
        const inserted = await this.dataSource.query(
          `INSERT INTO product_landings (product_master_id, public_key, metadata)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [masterId, publicKey, JSON.stringify({ source })],
        );
        return { landing: this.mapRow(inserted[0]), created: true };
      } catch (err: any) {
        const msg = String(err?.message ?? '');
        // master 유니크 충돌 → 동시 발급됨, 재조회
        if (msg.includes('uniq_product_landings_master')) {
          const now = await this.getByMaster(masterId);
          if (now) return { landing: now, created: false };
        }
        // public_key 충돌 → 다른 키로 재시도
        if (msg.includes('uniq_product_landings_public_key')) continue;
        throw err;
      }
    }
    throw new Error('PUBLIC_KEY_GENERATION_FAILED');
  }

  /**
   * master 의 Landing QR(SVG) + 공개 URL. Landing 없으면 idempotent 발급(모든 master 커버 보장).
   * QR 이미지는 저장하지 않고 런타임 동적 생성(F12 #4).
   */
  async getLandingQr(masterId: string, size = 320): Promise<{ publicKey: string; url: string; svg: string; created: boolean }> {
    const { landing, created } = await this.mintForMaster(masterId, 'admin-qr-view');
    const url = productLandingUrl(landing.publicKey);
    const svg = await generateQrSvg(url, size);
    return { publicKey: landing.publicKey, url, svg, created };
  }

  /**
   * 공개 Landing read model. 없으면 null. 노출 게이트 차단 시 blocked=true(콘텐츠 미포함).
   * WO-O4O-KPA-PRODUCT-QR-LANGUAGE-SELECTOR-REUSE-AND-ADAPT-V1: locale 지원 —
   *   languages = master 의 canonical STORE 언어(공개 가능), 요청 locale(없거나 미보유 시 ko→첫 언어) 본문 반환.
   */
  async getPublicLanding(publicKey: string, locale?: string): Promise<PublicProductLanding | null> {
    const rows = await this.dataSource.query(
      `SELECT * FROM product_landings WHERE public_key = $1 AND deleted_at IS NULL LIMIT 1`,
      [publicKey],
    );
    const landing = rows[0];
    if (!landing) return null;

    const blocked = landing.status !== 'active' || landing.exposure_state !== 'ok';
    if (blocked) {
      return {
        publicKey: landing.public_key,
        productMasterId: landing.product_master_id,
        status: landing.status,
        exposureState: landing.exposure_state,
        blocked: true,
        product: null,
        description: { hasCanonical: false, descriptionType: null, content: null, summary: null },
        placeholder: null,
        languages: ['ko'],
        resolvedLocale: null,
      };
    }

    const pmRows = await this.dataSource.query(
      `SELECT name, manufacturer_name, barcode, regulatory_type, specification
       FROM product_masters WHERE id = $1 LIMIT 1`,
      [landing.product_master_id],
    );
    const pm = pmRows[0] ?? null;

    // WO-O4O-KPA-PRODUCT-QR-LANGUAGE-SELECTOR-REUSE-AND-ADAPT-V1:
    //   공개 가능한 언어(canonical STORE) 목록 + 요청 locale 본문(없으면 ko→첫 언어 fallback).
    const langRows: Array<{ lang: string }> = await this.dataSource.query(
      `SELECT DISTINCT COALESCE(language, 'ko') AS lang
       FROM shared_product_descriptions
       WHERE master_id = $1 AND deleted_at IS NULL AND status = 'canonical' AND description_type = 'STORE'`,
      [landing.product_master_id],
    );
    const available = langRows
      .map((r) => (r.lang || 'ko').toLowerCase())
      .sort((a, b) => (a === 'ko' ? -1 : b === 'ko' ? 1 : a.localeCompare(b)));

    const reqLoc = (locale || '').toLowerCase();
    const resolvedLocale = available.includes(reqLoc)
      ? reqLoc
      : available.includes('ko')
        ? 'ko'
        : available[0] ?? null;

    let spd: { content: string | null; summary: string | null; description_type: string | null } | null = null;
    if (resolvedLocale) {
      const spdRows = await this.dataSource.query(
        `SELECT content, summary, description_type
         FROM shared_product_descriptions
         WHERE master_id = $1 AND deleted_at IS NULL AND status = 'canonical' AND description_type = 'STORE'
           AND COALESCE(language, 'ko') = $2
         ORDER BY updated_at DESC LIMIT 1`,
        [landing.product_master_id, resolvedLocale],
      );
      spd = spdRows[0] ?? null;
    }

    return {
      publicKey: landing.public_key,
      productMasterId: landing.product_master_id,
      status: landing.status,
      exposureState: landing.exposure_state,
      blocked: false,
      product: pm
        ? {
            name: pm.name,
            manufacturerName: pm.manufacturer_name,
            barcode: pm.barcode,
            regulatoryType: pm.regulatory_type,
            specification: pm.specification,
          }
        : null,
      description: {
        hasCanonical: !!spd,
        descriptionType: spd?.description_type ?? null,
        content: spd?.content ?? null,
        summary: spd?.summary ?? null,
      },
      placeholder: spd ? null : PLACEHOLDER_TEXT,
      languages: available.length ? available : ['ko'],
      resolvedLocale,
    };
  }
}
