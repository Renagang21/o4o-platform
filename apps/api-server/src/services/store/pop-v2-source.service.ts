/**
 * POP V2 Source Resolver — 저작 대상(상품 / 일반 콘텐츠)에서 POP 기본 콘텐츠를 만든다.
 * WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 *
 * 정본 계약: docs/architecture/O4O-STORE-POP-V2-CANONICAL-MODEL-V1.md
 *
 * 불변식
 *   I2 원본 불변 — 이 서비스는 **읽기 전용**이다. 어떤 source 원장에도 write 하지 않는다.
 *   I4 상품 POP fallback chain
 *        1) product-linked store content (kpa_store_content_product_links)
 *        2) STORE canonical 설명서 (shared_product_descriptions, description_type='STORE')
 *        3) 상품 기본정보 (organization_product_listings → product_masters / store_local_products)
 *      **B2B / B2C 설명서로 자동 fallback 하지 않는다.** 매장 지면에 도매·소비자몰 문구가
 *      새어 들어가는 것을 막는다. STORE 가 없으면 2단계를 건너뛰고 3단계로 내려간다.
 */

import type { DataSource } from 'typeorm';
import { KpaStoreContent } from '../../routes/kpa/entities/kpa-store-content.entity.js';
import { KpaStoreContentProductLink } from '../../routes/kpa/entities/kpa-store-content-product-link.entity.js';
import { OrganizationProductListing } from '../../modules/store-core/entities/organization-product-listing.entity.js';
import { StoreLocalProduct } from '../../routes/platform/entities/store-local-product.entity.js';
import { SharedProductDescription } from '../../modules/neture/entities/SharedProductDescription.entity.js';
import { ProductMaster } from '../../modules/neture/entities/ProductMaster.entity.js';
import { StorePop } from '../../routes/o4o-store/entities/store-pop.entity.js';
import { StoreExecutionAsset } from '../../routes/platform/entities/store-execution-asset.entity.js';
import type {
  PopV2Fields,
  PopV2Source,
  PopV2SourceOrigin,
} from '../../routes/o4o-store/entities/store-pop-document.entity.js';

/** POP 지면 문구 상한 — 기존 POP_BODY_MAX_LEN(500) 과 같은 계약 */
const POP_BODY_MAX_LEN = 500;
const POP_BULLET_MAX = 5;

export function htmlToPlainText(html: string): string {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** HTML 의 li 항목을 POP bullet 로 옮긴다. 새 요약 알고리즘을 도입하지 않는다. */
export function extractBullets(html: string): string[] {
  const out: string[] = [];
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < POP_BULLET_MAX) {
    const t = htmlToPlainText(m[1]);
    if (t) out.push(t.slice(0, 80));
  }
  return out;
}

function clip(s: string, max = POP_BODY_MAX_LEN): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** content_json 등 느슨한 본문 컨테이너에서 HTML 본문을 꺼낸다 (기존 controller 와 같은 우선순위) */
export function extractHtml(contentJson: unknown): string {
  if (!contentJson) return '';
  if (typeof contentJson === 'string') return contentJson;
  const obj = contentJson as Record<string, unknown>;
  for (const key of ['html', 'body', 'text', 'content', 'description', 'summary']) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}

function firstImage(html: string): string | null {
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return m ? m[1] : null;
}

/** HTML 본문 + 제목 → POP 지면 필드 */
export function buildFieldsFromHtml(
  title: string,
  html: string,
  imageUrl?: string | null,
): PopV2Fields {
  const plain = htmlToPlainText(html);
  const bullets = extractBullets(html);
  return {
    title,
    bullets,
    shortText: clip(plain.slice(0, 120)),
    longText: clip(plain),
    imageUrl: imageUrl ?? firstImage(html),
  };
}

export type PopV2ProductSourceType = 'listing' | 'local';

export type PopV2ResolvedFrom =
  | 'product-linked-content'
  | 'store-canonical-description'
  | 'product-basic-info'
  | 'store-content';

export interface PopV2ResolvedSource {
  sources: PopV2Source[];
  fields: PopV2Fields;
  /** 어느 단계에서 왔는지 — 화면에 근거를 그대로 보여준다(추측 금지) */
  resolvedFrom: PopV2ResolvedFrom;
}

/**
 * 상품 기반 POP 기본 콘텐츠 해석 (I4).
 * 조직 경계(organizationId)를 모든 단계에 적용한다 — Boundary Guard Rule 3.
 */
export async function resolveProductPopSource(
  ds: DataSource,
  organizationId: string,
  productSourceType: PopV2ProductSourceType,
  productSourceId: string,
): Promise<PopV2ResolvedSource | null> {
  // ── 1단계: product-linked store content ────────────────────────────────
  const link = await ds.getRepository(KpaStoreContentProductLink).findOne({
    where: {
      organization_id: organizationId,
      product_source_type: productSourceType,
      product_source_id: productSourceId,
      link_type: 'product_description',
    },
    order: { updated_at: 'DESC' },
  });

  if (link) {
    const content = await ds.getRepository(KpaStoreContent).findOne({
      where: { id: link.content_id, organization_id: organizationId },
    });
    if (content) {
      const html = extractHtml(content.content_json);
      return {
        sources: [{ origin: 'direct', id: content.id, title: content.title }],
        fields: buildFieldsFromHtml(content.title, html),
        resolvedFrom: 'product-linked-content',
      };
    }
  }

  // 매장 경영활용 제품(local)에는 2단계가 없다 — master 가 없어 STORE canonical 을 찾을 대상이 없다.
  if (productSourceType === 'local') {
    const lp = await ds
      .getRepository(StoreLocalProduct)
      .findOne({ where: { id: productSourceId, organizationId } as any });
    if (!lp) return null;
    const raw = lp as any;
    const detail: string = raw.detailHtml ?? raw.detail_html ?? '';
    const summary: string = raw.summary ?? raw.description ?? '';
    const image: string | null = raw.thumbnailUrl ?? raw.thumbnail_url ?? null;
    const html = detail || (summary ? `<p>${summary}</p>` : '');
    const name: string = raw.name ?? 'POP';
    return {
      sources: [{ origin: 'local', id: raw.id, title: name }],
      fields: buildFieldsFromHtml(name, html, image),
      resolvedFrom: 'product-basic-info',
    };
  }

  const listing = await ds
    .getRepository(OrganizationProductListing)
    .findOne({ where: { id: productSourceId, organization_id: organizationId } as any });
  if (!listing) return null;

  const master = await ds
    .getRepository(ProductMaster)
    .findOne({ where: { id: (listing as any).master_id } as any });
  const productName: string =
    (master as any)?.name ?? (master as any)?.regulatoryName ?? 'POP';

  // ── 2단계: STORE canonical 설명서 ──────────────────────────────────────
  //    description_type='STORE' 만 조회한다. B2B / B2C 는 조회 대상 자체가 아니다 (I4).
  const spd = await ds.getRepository(SharedProductDescription).findOne({
    where: {
      masterId: (listing as any).master_id,
      descriptionType: 'STORE',
      status: 'canonical',
    } as any,
    order: { updatedAt: 'DESC' } as any,
  });

  if (spd) {
    return {
      sources: [{ origin: 'spd', id: spd.id, title: productName }],
      fields: buildFieldsFromHtml(productName, spd.content ?? '', null),
      resolvedFrom: 'store-canonical-description',
    };
  }

  // ── 3단계: 상품 기본정보 ──────────────────────────────────────────────
  if (!master) return null;
  const basic = [(master as any).brandName, (master as any).specification]
    .filter(Boolean)
    .join(' · ');

  return {
    sources: [{ origin: 'listing', id: (listing as any).id, title: productName }],
    fields: {
      title: productName,
      bullets: basic ? [basic] : [],
      shortText: basic,
      longText: basic,
      imageUrl: null,
    },
    resolvedFrom: 'product-basic-info',
  };
}

export interface PopV2ContentCandidate {
  origin: PopV2SourceOrigin;
  id: string;
  title: string;
  excerpt: string | null;
  updatedAt: string;
}

function toIso(v: unknown): string {
  const d = v as Date | null | undefined;
  return d && typeof (d as Date).toISOString === 'function' ? (d as Date).toISOString() : '';
}

/**
 * 일반 "내 매장 콘텐츠" 후보 목록 (Step 8).
 * 신규 원장을 만들지 않고 **이미 있는 원장**만 읽는다.
 */
export async function listStoreContentSources(
  ds: DataSource,
  organizationId: string,
  opts: { storeId?: string | null; limit?: number } = {},
): Promise<PopV2ContentCandidate[]> {
  const limit = opts.limit ?? 100;
  const out: PopV2ContentCandidate[] = [];

  const contents = await ds.getRepository(KpaStoreContent).find({
    where: { organization_id: organizationId },
    order: { updated_at: 'DESC' },
    take: limit,
  });
  for (const c of contents) {
    const plain = htmlToPlainText(extractHtml(c.content_json));
    out.push({
      origin: 'direct',
      id: c.id,
      title: c.title,
      excerpt: plain ? plain.slice(0, 120) : null,
      updatedAt: toIso(c.updated_at ?? c.created_at),
    });
  }

  // 매장 소유 제작 자료(과거 POP 산출물 포함) — 재료로 다시 쓸 수 있다.
  const assets = await ds.getRepository(StoreExecutionAsset).find({
    where: { organizationId, isActive: true },
    order: { updatedAt: 'DESC' },
    take: limit,
  });
  for (const a of assets) {
    out.push({
      origin: 'library',
      id: a.id,
      title: a.title,
      excerpt: a.description ? htmlToPlainText(a.description).slice(0, 120) : null,
      updatedAt: toIso(a.updatedAt),
    });
  }

  // 콘텐츠 축 store_pops — V2 의 source 로만 쓴다(원장 재사용이 아니다).
  if (opts.storeId) {
    const pops = await ds.getRepository(StorePop).find({
      where: { storeId: opts.storeId, status: 'published' } as any,
      order: { updatedAt: 'DESC' } as any,
      take: limit,
    });
    for (const p of pops) {
      out.push({
        origin: 'store_pop',
        id: p.id,
        title: p.title,
        excerpt: p.excerpt || htmlToPlainText(p.content ?? '').slice(0, 120) || null,
        updatedAt: toIso((p as any).updatedAt),
      });
    }
  }

  return out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, limit);
}

/** 선택한 일반 콘텐츠 1건 → POP 기본 필드 (Step 8) */
export async function resolveContentPopSource(
  ds: DataSource,
  organizationId: string,
  origin: PopV2SourceOrigin,
  id: string,
  storeId?: string | null,
): Promise<PopV2ResolvedSource | null> {
  if (origin === 'direct') {
    const c = await ds
      .getRepository(KpaStoreContent)
      .findOne({ where: { id, organization_id: organizationId } });
    if (!c) return null;
    return {
      sources: [{ origin, id: c.id, title: c.title }],
      fields: buildFieldsFromHtml(c.title, extractHtml(c.content_json)),
      resolvedFrom: 'store-content',
    };
  }

  if (origin === 'library') {
    const a = await ds
      .getRepository(StoreExecutionAsset)
      .findOne({ where: { id, organizationId } });
    if (!a) return null;
    const html = a.htmlContent || (a.description ? `<p>${a.description}</p>` : '');
    return {
      sources: [{ origin, id: a.id, title: a.title }],
      fields: buildFieldsFromHtml(a.title, html, a.fileUrl ?? null),
      resolvedFrom: 'store-content',
    };
  }

  if (origin === 'store_pop') {
    if (!storeId) return null;
    const p = await ds.getRepository(StorePop).findOne({ where: { id, storeId } as any });
    if (!p) return null;
    return {
      sources: [{ origin, id: p.id, title: p.title }],
      fields: buildFieldsFromHtml(p.title, p.content ?? ''),
      resolvedFrom: 'store-content',
    };
  }

  return null;
}
