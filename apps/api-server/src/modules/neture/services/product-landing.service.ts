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
import logger from '../../../utils/logger.js';

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
  authRequired: boolean; // WO-...-AUTH-GATE: 비로그인 → true(본문 미포함, 로그인 게이트)
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
  // WO-O4O-SUPPLIER-PRODUCT-DESCRIPTION-AUTO-CREDIT-V1: 공급자 제작 설명서에만 채워지는 제작원.
  //   업체명·연락처는 공급자 조직 등록정보에서 렌더 시 조회(본문 HTML 미저장). null = 미표시.
  supplierCredit: { organizationName: string; contact: string | null } | null;
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
   * WO-O4O-SUPPLIER-PRODUCT-DESCRIPTION-AUTO-CREDIT-V1
   * 공급자 제작 설명서(source_type='supplier')의 제작원(업체명·공개 연락처)을 조직 등록정보에서 조회한다.
   * 링크 체인: source_ref_id → supplier_product_offers.id → supplier_id → neture_suppliers → organizations.
   * 원칙: 본문 HTML 미저장(렌더 시 조회) · **공개 허용 연락처만** · 깨진 체인/비활성 조직/이름 없음 → null(본문 영향 없음).
   * 주: organizations 는 SnakeNamingStrategy 미적용(camelCase 컬럼) — "isActive" 를 큰따옴표로 참조한다.
   */
  private async resolveSupplierCredit(
    sourceType: string | null,
    sourceRefId: string | null,
  ): Promise<{ organizationName: string; contact: string | null } | null> {
    if (sourceType !== 'supplier' || !sourceRefId) return null; // 공급자 제작이 아니면 미표시
    try {
      const rows = await this.dataSource.query(
        `SELECT o.name AS org_name, o."isActive" AS org_active,
                s.contact_phone AS phone, s.contact_email AS email,
                s.contact_phone_visibility AS phone_vis, s.contact_email_visibility AS email_vis
         FROM supplier_product_offers spo
         JOIN neture_suppliers s ON s.id = spo.supplier_id
         JOIN organizations o ON o.id = s.organization_id
         WHERE spo.id = $1
         LIMIT 1`,
        [sourceRefId],
      );
      const r = rows[0];
      if (!r) return null; // 깨진 체인(offer/supplier/org 부재)
      const orgName = (r.org_name ?? '').trim();
      if (!orgName || r.org_active === false) return null; // 이름 없음 또는 비활성 조직 → 미표시
      // 공개 허용 연락처만: 전화(공개) 우선 → 이메일(공개) → 둘 다 아니면 문의행 생략(null)
      const phone = r.phone_vis === 'public' && r.phone ? String(r.phone).trim() : '';
      const email = r.email_vis === 'public' && r.email ? String(r.email).trim() : '';
      return { organizationName: orgName, contact: phone || email || null };
    } catch (err) {
      logger.warn(`[product-landing] supplier credit resolve failed (offer=${sourceRefId}): ${String((err as any)?.message ?? err)}`);
      return null; // 조회 실패해도 본문은 정상, 제작원만 생략
    }
  }

  /**
   * 공개 Landing read model. 없으면 null. 노출 게이트 차단 시 blocked=true(콘텐츠 미포함).
   * WO-O4O-KPA-PRODUCT-QR-LANGUAGE-SELECTOR-REUSE-AND-ADAPT-V1: locale 지원 —
   *   languages = master 의 canonical STORE 언어(공개 가능), 요청 locale(없거나 미보유 시 ko→첫 언어) 본문 반환.
   *
   * WO-O4O-PRODUCT-DESCRIPTION-AUTH-GATE-AND-RETURNURL-V1 (Baseline V3-AMENDMENT / ADR-0002):
   *   설명서 본문은 유효한 O4O 로그인 세션(isAuthed=true)에만 응답한다. 비로그인(isAuthed=false)에는
   *   authRequired=true + 최소 상품 식별정보(제품명)만 반환하고 본문/summary/canonical 은 절대 미포함한다.
   *   접근 통제는 이 서버 read model 에서 강제한다(프론트 숨김 아님). 대상 없음(404)과 인증필요는 구분한다.
   */
  async getPublicLanding(publicKey: string, locale?: string, isAuthed = false): Promise<PublicProductLanding | null> {
    const rows = await this.dataSource.query(
      `SELECT * FROM product_landings WHERE public_key = $1 AND deleted_at IS NULL LIMIT 1`,
      [publicKey],
    );
    const landing = rows[0];
    if (!landing) return null;

    // AUTH GATE — 비로그인: 본문 미포함. 최소 상품 식별정보(제품명)만 노출하는 로그인 게이트 shell.
    //   존재 여부(404)와 인증필요(authRequired)는 구분하되, 비로그인엔 본문·summary·언어·노출상태 등을 과다 노출하지 않는다.
    if (!isAuthed) {
      const nameRows = await this.dataSource.query(
        `SELECT name FROM product_masters WHERE id = $1 LIMIT 1`,
        [landing.product_master_id],
      );
      return {
        publicKey: landing.public_key,
        productMasterId: landing.product_master_id,
        status: landing.status,
        exposureState: landing.exposure_state,
        blocked: false,
        authRequired: true,
        product: { name: nameRows[0]?.name ?? null, manufacturerName: null, barcode: null, regulatoryType: null, specification: null },
        description: { hasCanonical: false, descriptionType: null, content: null, summary: null },
        supplierCredit: null,
        placeholder: null,
        languages: [],
        resolvedLocale: null,
      };
    }

    const blocked = landing.status !== 'active' || landing.exposure_state !== 'ok';
    if (blocked) {
      return {
        publicKey: landing.public_key,
        productMasterId: landing.product_master_id,
        status: landing.status,
        exposureState: landing.exposure_state,
        blocked: true,
        authRequired: false,
        product: null,
        description: { hasCanonical: false, descriptionType: null, content: null, summary: null },
        supplierCredit: null,
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

    let spd: { content: string | null; summary: string | null; description_type: string | null; source_type: string | null; source_ref_id: string | null } | null = null;
    if (resolvedLocale) {
      const spdRows = await this.dataSource.query(
        `SELECT content, summary, description_type, source_type, source_ref_id
         FROM shared_product_descriptions
         WHERE master_id = $1 AND deleted_at IS NULL AND status = 'canonical' AND description_type = 'STORE'
           AND COALESCE(language, 'ko') = $2
         ORDER BY updated_at DESC LIMIT 1`,
        [landing.product_master_id, resolvedLocale],
      );
      spd = spdRows[0] ?? null;
    }

    // 공급자 제작 설명서(source_type='supplier')에만 제작원 자동 표시. O4O/매장 콘텐츠는 null.
    const supplierCredit = spd ? await this.resolveSupplierCredit(spd.source_type, spd.source_ref_id) : null;

    return {
      publicKey: landing.public_key,
      productMasterId: landing.product_master_id,
      status: landing.status,
      exposureState: landing.exposure_state,
      blocked: false,
      authRequired: false,
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
      supplierCredit,
      placeholder: spd ? null : PLACEHOLDER_TEXT,
      languages: available.length ? available : ['ko'],
      resolvedLocale,
    };
  }
}

/**
 * ProductMaster 생성 직후 Landing(대표 QR 진입점) 보장 — on-create coverage.
 *
 * WO-O4O-PRODUCT-LANDING-FULL-BACKFILL-AND-ON-CREATE-COVERAGE-CLOSURE-V1
 *
 * 새 QR 발급기를 만들지 않는다 — mintForMaster 를 그대로 재사용한다.
 *  - **master 생성 트랜잭션이 커밋된 뒤** 호출한다. 생성이 롤백되면 호출 자체가 없으므로 orphan Landing 이 남지 않는다.
 *  - 멱등: 이미 Landing 이 있으면 아무것도 하지 않는다(불변식 #7 · uniq_product_landings_master).
 *  - best-effort: 실패해도 호출자 흐름(상품 등록·승인·import)을 막지 않는다. 누락분은
 *    `scripts/productmaster-landing-bulk-apply.ts`(reconcile) 재실행으로 회수한다.
 *
 * @returns 이번 호출로 새로 발급했으면 true, 이미 있었거나 실패했으면 false.
 */
export async function ensureProductLandingForMaster(
  dataSource: DataSource,
  masterId: string,
  source = 'on-create',
): Promise<boolean> {
  try {
    const { created } = await new ProductLandingService(dataSource).mintForMaster(masterId, source);
    return created;
  } catch (err) {
    logger.warn(
      `[product-landing] on-create mint 실패 (master=${masterId}, source=${source}): ${String((err as any)?.message ?? err)} — reconcile 대상`,
    );
    return false;
  }
}

/** 여러 master 에 대한 on-create 보장(대량 import 커밋 후). 한 건 실패가 나머지를 막지 않는다. */
export async function ensureProductLandingsForMasters(
  dataSource: DataSource,
  masterIds: string[],
  source = 'on-create',
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;
  for (const masterId of [...new Set(masterIds.filter(Boolean))]) {
    if (await ensureProductLandingForMaster(dataSource, masterId, source)) created++;
    else skipped++;
  }
  return { created, skipped };
}

/**
 * 대량 생성 작업(배치 job·seed script) 종료 후 Landing 누락분 회수 — reconcile.
 *
 * WO-O4O-PRODUCT-LANDING-FULL-BACKFILL-AND-ON-CREATE-COVERAGE-CLOSURE-V1
 *
 * 대량 경로는 도메인마다 Landing 발급 코드를 복사하지 않고, 작업이 끝난 뒤 이 함수 하나를 호출한다.
 * 발급기는 동일(mintForMaster) — 새 QR 시스템이 아니다.
 * 대상이 `limit` 을 넘으면 남은 분은 `scripts/productmaster-landing-bulk-apply.ts` 재실행으로 처리한다
 * (그 스크립트가 대용량 reconcile 정본이며, 누락 0 이면 write 0 이다).
 */
export async function reconcileMissingProductLandings(
  dataSource: DataSource,
  opts: { limit?: number; source?: string } = {},
): Promise<{ scanned: number; created: number; skipped: number; remainingLikely: boolean }> {
  const limit = Math.min(Math.max(opts.limit ?? 20000, 1), 100000);
  const rows: Array<{ id: string }> = await dataSource.query(
    `SELECT pm.id FROM product_masters pm
     WHERE NOT EXISTS (SELECT 1 FROM product_landings l WHERE l.product_master_id = pm.id AND l.deleted_at IS NULL)
     LIMIT $1`,
    [limit],
  );
  const { created, skipped } = await ensureProductLandingsForMasters(
    dataSource,
    rows.map((r) => r.id),
    opts.source ?? 'bulk-reconcile',
  );
  const remainingLikely = rows.length >= limit;
  if (rows.length > 0) {
    logger.info(
      `[product-landing] reconcile: scanned ${rows.length}, created ${created}, skipped ${skipped}` +
        (remainingLikely ? ' — limit 도달, productmaster-landing-bulk-apply.ts 재실행 필요' : ''),
    );
  }
  return { scanned: rows.length, created, skipped, remainingLikely };
}
