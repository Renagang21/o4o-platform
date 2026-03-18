/**
 * KPA Community Hub Service
 *
 * WO-KPA-A-COMMUNITY-HUB-IMPLEMENTATION-V1
 * Ads/Sponsors CRUD + Public Read for Community Hub
 *
 * Raw SQL + parameter binding (Boundary Policy)
 * service_code filter on all queries (Guard Rule #3)
 */

import type { DataSource } from 'typeorm';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CommunityHubService {
  constructor(private ds: DataSource) {}

  // ==================== Public Read ====================

  async getActiveAds(serviceCode: string, type: 'hero' | 'page') {
    const rows = await this.ds.query(
      `SELECT id, type, title, image_url AS "imageUrl", link_url AS "linkUrl", display_order AS "displayOrder"
       FROM community_ads
       WHERE service_code = $1
         AND type = $2
         AND is_active = true
         AND (start_date IS NULL OR start_date <= CURRENT_DATE)
         AND (end_date IS NULL OR end_date >= CURRENT_DATE)
       ORDER BY display_order ASC, created_at DESC`,
      [serviceCode, type],
    );
    return rows;
  }

  async getActiveSponsors(serviceCode: string) {
    const rows = await this.ds.query(
      `SELECT id, name, logo_url AS "logoUrl", link_url AS "linkUrl", display_order AS "displayOrder"
       FROM community_sponsors
       WHERE service_code = $1 AND is_active = true
       ORDER BY display_order ASC, created_at DESC`,
      [serviceCode],
    );
    return rows;
  }

  // ==================== Operator: Ads CRUD ====================

  async listAds(serviceCode: string, type?: string) {
    const params: unknown[] = [serviceCode];
    let sql = `SELECT id, type, title, image_url AS "imageUrl", link_url AS "linkUrl",
                      start_date AS "startDate", end_date AS "endDate",
                      display_order AS "displayOrder", is_active AS "isActive",
                      created_at AS "createdAt", updated_at AS "updatedAt"
               FROM community_ads
               WHERE service_code = $1`;
    if (type) {
      sql += ` AND type = $2`;
      params.push(type);
    }
    sql += ` ORDER BY type ASC, display_order ASC, created_at DESC`;
    try {
      return await this.ds.query(sql, params);
    } catch (err: any) {
      // safeQuery: community_ads 테이블 미존재 시 빈 배열 반환
      console.warn('[CommunityHub] community_ads table may not exist:', err.message);
      return [];
    }
  }

  async createAd(data: {
    serviceCode: string;
    type: string;
    title: string;
    imageUrl: string;
    linkUrl?: string;
    startDate?: string;
    endDate?: string;
    displayOrder?: number;
    isActive?: boolean;
  }) {
    const [row] = await this.ds.query(
      `INSERT INTO community_ads (service_code, type, title, image_url, link_url, start_date, end_date, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, type, title, image_url AS "imageUrl", link_url AS "linkUrl",
                 start_date AS "startDate", end_date AS "endDate",
                 display_order AS "displayOrder", is_active AS "isActive",
                 created_at AS "createdAt"`,
      [
        data.serviceCode,
        data.type,
        data.title,
        data.imageUrl,
        data.linkUrl ?? null,
        data.startDate ?? null,
        data.endDate ?? null,
        data.displayOrder ?? 0,
        data.isActive !== false,
      ],
    );
    return row;
  }

  async updateAd(id: string, serviceCode: string, data: Record<string, unknown>) {
    if (!UUID_RE.test(id)) return null;

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      type: 'type',
      title: 'title',
      imageUrl: 'image_url',
      linkUrl: 'link_url',
      startDate: 'start_date',
      endDate: 'end_date',
      displayOrder: 'display_order',
      isActive: 'is_active',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        sets.push(`"${col}" = $${idx}`);
        params.push(data[key]);
        idx++;
      }
    }

    if (sets.length === 0) return null;

    sets.push(`"updated_at" = now()`);
    params.push(id, serviceCode);

    const [row] = await this.ds.query(
      `UPDATE community_ads SET ${sets.join(', ')}
       WHERE id = $${idx} AND service_code = $${idx + 1}
       RETURNING id, type, title, image_url AS "imageUrl", link_url AS "linkUrl",
                 start_date AS "startDate", end_date AS "endDate",
                 display_order AS "displayOrder", is_active AS "isActive",
                 updated_at AS "updatedAt"`,
      params,
    );
    return row ?? null;
  }

  async deleteAd(id: string, serviceCode: string) {
    if (!UUID_RE.test(id)) return false;
    const result = await this.ds.query(
      `DELETE FROM community_ads WHERE id = $1 AND service_code = $2`,
      [id, serviceCode],
    );
    return (result as any)?.[1] > 0;
  }

  // ==================== Operator: Sponsors CRUD ====================

  async listSponsors(serviceCode: string) {
    return this.ds.query(
      `SELECT id, name, logo_url AS "logoUrl", link_url AS "linkUrl",
              display_order AS "displayOrder", is_active AS "isActive",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM community_sponsors
       WHERE service_code = $1
       ORDER BY display_order ASC, created_at DESC`,
      [serviceCode],
    );
  }

  async createSponsor(data: {
    serviceCode: string;
    name: string;
    logoUrl: string;
    linkUrl?: string;
    displayOrder?: number;
    isActive?: boolean;
  }) {
    const [row] = await this.ds.query(
      `INSERT INTO community_sponsors (service_code, name, logo_url, link_url, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, logo_url AS "logoUrl", link_url AS "linkUrl",
                 display_order AS "displayOrder", is_active AS "isActive",
                 created_at AS "createdAt"`,
      [
        data.serviceCode,
        data.name,
        data.logoUrl,
        data.linkUrl ?? null,
        data.displayOrder ?? 0,
        data.isActive !== false,
      ],
    );
    return row;
  }

  async updateSponsor(id: string, serviceCode: string, data: Record<string, unknown>) {
    if (!UUID_RE.test(id)) return null;

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      logoUrl: 'logo_url',
      linkUrl: 'link_url',
      displayOrder: 'display_order',
      isActive: 'is_active',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        sets.push(`"${col}" = $${idx}`);
        params.push(data[key]);
        idx++;
      }
    }

    if (sets.length === 0) return null;

    sets.push(`"updated_at" = now()`);
    params.push(id, serviceCode);

    const [row] = await this.ds.query(
      `UPDATE community_sponsors SET ${sets.join(', ')}
       WHERE id = $${idx} AND service_code = $${idx + 1}
       RETURNING id, name, logo_url AS "logoUrl", link_url AS "linkUrl",
                 display_order AS "displayOrder", is_active AS "isActive",
                 updated_at AS "updatedAt"`,
      params,
    );
    return row ?? null;
  }

  async deleteSponsor(id: string, serviceCode: string) {
    if (!UUID_RE.test(id)) return false;
    const result = await this.ds.query(
      `DELETE FROM community_sponsors WHERE id = $1 AND service_code = $2`,
      [id, serviceCode],
    );
    return (result as any)?.[1] > 0;
  }
}
