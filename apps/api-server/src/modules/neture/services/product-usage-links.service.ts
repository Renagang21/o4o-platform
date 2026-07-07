/**
 * ProductUsageLinksService — ProductMaster 활용 연결 조회 (read-only)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-USAGE-LINKS-READONLY-V1
 *
 * 기본상품(ProductMaster)이 실제 서비스 데이터에 어떻게 연결돼 있는지 SELECT-only 로 조회한다.
 * 연결 축(확정):
 *   - organization_product_listings.master_id  (O4O 기반 조직 상품 연결, 직접 FK)
 *   - store_local_products.barcode = master.barcode  (매장 경영활용 제품, barcode loose 연결)
 *   - kpa_store_content_product_links.master_id → kpa_store_contents  (자료함 콘텐츠(QR/태블릿/POP/블로그) 연결)
 *
 * **read-only** — INSERT/UPDATE/DELETE 없음. 전부 parameterized SELECT. 각 목록 limit 상한.
 */

import type { DataSource } from 'typeorm';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface UsageOrganizationListing {
  id: string;
  organizationId: string;
  organizationName: string | null;
  serviceKey: string | null;
  status: string | null;
  sourceType: string | null;
  price: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UsageStoreLocalProduct {
  id: string;
  organizationId: string;
  organizationName: string | null;
  displayName: string | null;
  price: number | null;
  isActive: boolean | null;
  thumbnailUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UsageContentLink {
  linkId: string;
  productSourceType: string; // 'listing' | 'local'
  contentId: string;
  title: string | null;
  contentSourceType: string | null; // snapshot_edit | direct
  workspaceStatus: string | null;
  shareStatus: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProductUsageLinks {
  masterId: string;
  barcode: string | null;
  summary: {
    organizationListingCount: number;
    storeLocalProductCount: number;
    contentLinkCount: number;
  };
  organizationListings: UsageOrganizationListing[];
  storeLocalProducts: UsageStoreLocalProduct[];
  contentLinks: UsageContentLink[];
  /** 구조가 없거나 미매핑인 축 안내 */
  notMapped: string[];
}

export class ProductUsageLinksService {
  constructor(private dataSource: DataSource) {}

  /** master 없으면 null. */
  async getUsageLinks(masterId: string, limitRaw?: number): Promise<ProductUsageLinks | null> {
    const limit = Math.min(Math.max(limitRaw ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    const masterRows: { barcode: string | null }[] = await this.dataSource.query(
      `SELECT barcode FROM product_masters WHERE id = $1`,
      [masterId],
    );
    if (masterRows.length === 0) return null;
    const barcode = masterRows[0].barcode ?? '';

    // 카운트(전체) — 목록은 limit, 카운트는 total
    const [{ org_count, content_count }]: { org_count: string; content_count: string }[] =
      await this.dataSource.query(
        `SELECT
           (SELECT COUNT(*) FROM organization_product_listings WHERE master_id = $1) AS org_count,
           (SELECT COUNT(*) FROM kpa_store_content_product_links WHERE master_id = $1) AS content_count`,
        [masterId],
      );
    const [{ local_count }]: { local_count: string }[] = await this.dataSource.query(
      `SELECT COUNT(*) AS local_count FROM store_local_products
        WHERE barcode IS NOT NULL AND barcode <> '' AND barcode = $1`,
      [barcode],
    );

    const orgRows: Array<{
      id: string; organization_id: string; organization_name: string | null; service_key: string | null;
      status: string | null; source_type: string | null; price: string | null;
      created_at: string | null; updated_at: string | null;
    }> = await this.dataSource.query(
      `SELECT opl.id, opl.organization_id, o.name AS organization_name, opl.service_key,
              opl.status, opl.source_type, opl.price, opl.created_at, opl.updated_at
         FROM organization_product_listings opl
         LEFT JOIN organizations o ON o.id = opl.organization_id
        WHERE opl.master_id = $1
        ORDER BY opl.updated_at DESC NULLS LAST
        LIMIT ${limit}`,
      [masterId],
    );

    const localRows: Array<{
      id: string; organization_id: string; organization_name: string | null; display_name: string | null;
      price_display: string | null; is_active: boolean | null; thumbnail_url: string | null;
      created_at: string | null; updated_at: string | null;
    }> = barcode
      ? await this.dataSource.query(
          `SELECT slp.id, slp.organization_id, o.name AS organization_name, slp.name AS display_name,
                  slp.price_display, slp.is_active, slp.thumbnail_url, slp.created_at, slp.updated_at
             FROM store_local_products slp
             LEFT JOIN organizations o ON o.id = slp.organization_id
            WHERE slp.barcode = $1 AND slp.barcode <> ''
            ORDER BY slp.updated_at DESC NULLS LAST
            LIMIT ${limit}`,
          [barcode],
        )
      : [];

    const contentRows: Array<{
      link_id: string; product_source_type: string; content_id: string; title: string | null;
      content_source_type: string | null; workspace_status: string | null; share_status: string | null;
      created_at: string | null; updated_at: string | null;
    }> = await this.dataSource.query(
      `SELECT l.id AS link_id, l.product_source_type, l.content_id, c.title,
              c.source_type AS content_source_type, c.workspace_status, c.share_status,
              c.created_at, c.updated_at
         FROM kpa_store_content_product_links l
         JOIN kpa_store_contents c ON c.id = l.content_id
        WHERE l.master_id = $1
        ORDER BY c.updated_at DESC NULLS LAST
        LIMIT ${limit}`,
      [masterId],
    );

    return {
      masterId,
      barcode: barcode || null,
      summary: {
        organizationListingCount: Number(org_count),
        storeLocalProductCount: Number(local_count),
        contentLinkCount: Number(content_count),
      },
      organizationListings: orgRows.map((r) => ({
        id: r.id,
        organizationId: r.organization_id,
        organizationName: r.organization_name,
        serviceKey: r.service_key,
        status: r.status,
        sourceType: r.source_type,
        price: r.price != null ? Number(r.price) : null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      storeLocalProducts: localRows.map((r) => ({
        id: r.id,
        organizationId: r.organization_id,
        organizationName: r.organization_name,
        displayName: r.display_name,
        price: r.price_display != null ? Number(r.price_display) : null,
        isActive: r.is_active,
        thumbnailUrl: r.thumbnail_url,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      contentLinks: contentRows.map((r) => ({
        linkId: r.link_id,
        productSourceType: r.product_source_type,
        contentId: r.content_id,
        title: r.title,
        contentSourceType: r.content_source_type,
        workspaceStatus: r.workspace_status,
        shareStatus: r.share_status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      // QR/태블릿은 kpa_store_contents(자료함 콘텐츠)를 참조하는 downstream — master 직접 링크는
      // kpa_store_content_product_links 로 표현됨. 별도 QR/tablet↔master 직접 매핑 테이블은 없음.
      notMapped: ['qr_direct', 'tablet_direct'],
    };
  }
}
