/**
 * PartnerService — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts
 *
 * Inline SQL operations for partner domain:
 * - Dashboard item content counts & primary content
 * - Content browsing (CMS)
 * - Content link batch-fetch details
 * - Partner affiliate product-pool & referral-links
 * - Partner settlements
 * - Admin partner monitoring & settlement management
 */
import type { DataSource } from 'typeorm';
import logger from '../../../utils/logger.js';

export class PartnerService {
  constructor(private dataSource: DataSource) {}

  // ─────────────────────────────────────────────
  // Dashboard Item Content Counts
  // ─────────────────────────────────────────────

  /**
   * Batch-fetch content link counts for dashboard items
   * WO-PARTNER-CONTENT-LINK-PHASE1-V1
   */
  async getDashboardItemContentCounts(itemIds: string[]): Promise<Map<string, number>> {
    const contentCountMap = new Map<string, number>();
    if (itemIds.length === 0) return contentCountMap;

    const countRows: Array<{ dashboard_item_id: string; cnt: string }> = await this.dataSource.query(
      `SELECT dashboard_item_id, COUNT(*)::text as cnt FROM neture_partner_dashboard_item_contents WHERE dashboard_item_id = ANY($1) GROUP BY dashboard_item_id`,
      [itemIds],
    );
    for (const row of countRows) {
      contentCountMap.set(row.dashboard_item_id, parseInt(row.cnt, 10));
    }
    return contentCountMap;
  }

  // ─────────────────────────────────────────────
  // Dashboard Item Primary Content
  // ─────────────────────────────────────────────

  /**
   * Batch-fetch primary content info for dashboard items
   * WO-PARTNER-CONTENT-PRESENTATION-PHASE3-V1
   */
  async getDashboardItemPrimaryContents(itemIds: string[]): Promise<Map<string, { contentId: string; contentSource: string; title: string; type: string }>> {
    const primaryContentMap = new Map<string, { contentId: string; contentSource: string; title: string; type: string }>();
    if (itemIds.length === 0) return primaryContentMap;

    const primaryLinks: Array<{ dashboard_item_id: string; content_id: string; content_source: string }> = await this.dataSource.query(
      `SELECT dashboard_item_id, content_id, content_source FROM neture_partner_dashboard_item_contents WHERE dashboard_item_id = ANY($1) AND is_primary = true`,
      [itemIds],
    );

    // Fetch titles for primary contents
    const cmsPrimaryIds = primaryLinks.filter((l) => l.content_source === 'cms').map((l) => l.content_id);
    const titleMap = new Map<string, { title: string; type: string }>();

    if (cmsPrimaryIds.length > 0) {
      const cmsRows: Array<{ id: string; title: string; type: string }> = await this.dataSource.query(
        `SELECT id, title, type FROM cms_contents WHERE id = ANY($1)`,
        [cmsPrimaryIds],
      );
      for (const row of cmsRows) {
        titleMap.set(`cms:${row.id}`, { title: row.title, type: row.type });
      }
    }

    for (const link of primaryLinks) {
      const detail = titleMap.get(`${link.content_source}:${link.content_id}`);
      if (detail) {
        primaryContentMap.set(link.dashboard_item_id, {
          contentId: link.content_id,
          contentSource: link.content_source,
          title: detail.title,
          type: detail.type,
        });
      }
    }

    return primaryContentMap;
  }

  // ─────────────────────────────────────────────
  // Content Browsing (CMS)
  // ─────────────────────────────────────────────

  /**
   * Browse available CMS content for partners
   * WO-PARTNER-CONTENT-LINK-PHASE1-V1
   */
  async browseCmsContents(): Promise<Array<{ id: string; title: string; summary: string | null; type: string; source: string; imageUrl: string | null; createdAt: string }>> {
    const results: Array<{ id: string; title: string; summary: string | null; type: string; source: string; imageUrl: string | null; createdAt: string }> = [];

    const cmsRows = await this.dataSource.query(
      `SELECT id, title, summary, type, image_url, created_at
       FROM cms_contents
       WHERE status = 'published'
         AND (service_key IN ('neture', 'glycopharm') OR service_key IS NULL)
       ORDER BY created_at DESC
       LIMIT 100`,
    );
    for (const row of cmsRows) {
      results.push({
        id: row.id,
        title: row.title,
        summary: row.summary,
        type: row.type,
        source: 'cms',
        imageUrl: row.image_url,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      });
    }

    return results;
  }

  // ─────────────────────────────────────────────
  // Content Link Batch Details
  // ─────────────────────────────────────────────

  /**
   * Batch-fetch CMS content details by IDs
   * WO-PARTNER-CONTENT-LINK-PHASE1-V1
   */
  async getCmsContentDetails(cmsIds: string[]): Promise<Map<string, { title: string; summary: string | null; type: string; imageUrl: string | null; createdAt: string }>> {
    const contentMap = new Map<string, { title: string; summary: string | null; type: string; imageUrl: string | null; createdAt: string }>();
    if (cmsIds.length === 0) return contentMap;

    const cmsRows = await this.dataSource.query(
      `SELECT id, title, summary, type, image_url, created_at FROM cms_contents WHERE id = ANY($1)`,
      [cmsIds],
    );
    for (const row of cmsRows) {
      contentMap.set(`cms:${row.id}`, {
        title: row.title,
        summary: row.summary,
        type: row.type,
        imageUrl: row.image_url,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      });
    }

    return contentMap;
  }

  // ─────────────────────────────────────────────
  // Partner Affiliate — Product Pool
  // ─────────────────────────────────────────────

  /**
   * Get products with commission policies (partner-promotable products)
   * WO-O4O-PARTNER-HUB-CORE-V1
   */
  async getProductPool(): Promise<any[]> {
    const rows = await this.dataSource.query(`
      SELECT
        spo.id AS product_id,
        spo.slug AS product_slug,
        ns.slug AS store_slug,
        COALESCE(pm.name, 'Unknown') AS product_name,
        supplier_org.name AS supplier_name,
        spc.commission_per_unit,
        spc.start_date AS commission_start_date,
        spo.consumer_reference_price,
        spo.price_general,
        (SELECT pi.image_url FROM product_images pi WHERE pi.master_id = spo.master_id AND pi.is_primary = true LIMIT 1) AS image_url
      FROM supplier_partner_commissions spc
      JOIN supplier_product_offers spo ON spo.id = spc.supplier_product_id
      JOIN neture_suppliers ns ON ns.id = spo.supplier_id
      LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
      LEFT JOIN product_masters pm ON pm.id = spo.master_id
      WHERE spc.start_date <= CURRENT_DATE
        AND (spc.end_date IS NULL OR spc.end_date >= CURRENT_DATE)
        AND spo.is_active = true AND spo.approval_status = 'APPROVED'
      ORDER BY spc.start_date DESC
    `);
    return rows;
  }

  // ─────────────────────────────────────────────
  // Partner Affiliate — Referral Links
  // ─────────────────────────────────────────────

  /**
   * Resolve offer for referral link creation
   * WO-O4O-PARTNER-HUB-CORE-V1
   */
  async resolveOfferForReferral(productId: string): Promise<{ id: string; product_slug: string; supplier_id: string; store_slug: string } | null> {
    const [offer] = await this.dataSource.query(
      `SELECT spo.id, spo.slug AS product_slug, spo.supplier_id, ns.slug AS store_slug
       FROM supplier_product_offers spo
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       WHERE spo.id = $1`,
      [productId],
    );
    return offer || null;
  }

  /**
   * Check existing referral for (partner, product)
   */
  async findExistingReferral(partnerId: string, productId: string): Promise<{ id: string; referral_token: string } | null> {
    const [existing] = await this.dataSource.query(
      `SELECT id, referral_token FROM partner_referrals WHERE partner_id = $1 AND product_id = $2`,
      [partnerId, productId],
    );
    return existing || null;
  }

  /**
   * Create a new referral link
   */
  async createReferral(partnerId: string, storeId: string, productId: string, referralToken: string): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO partner_referrals (partner_id, store_id, product_id, referral_token) VALUES ($1, $2, $3, $4)`,
      [partnerId, storeId, productId, referralToken],
    );
  }

  /**
   * Get partner's referral links
   * WO-O4O-PARTNER-HUB-CORE-V1
   */
  async getReferralLinks(partnerId: string): Promise<any[]> {
    const rows = await this.dataSource.query(`
      SELECT
        pr.id, pr.referral_token, pr.product_id, pr.store_id, pr.created_at,
        spo.slug AS product_slug,
        ns.slug AS store_slug,
        supplier_org.name AS store_name,
        COALESCE(pm.name, 'Unknown') AS product_name,
        spo.price_general,
        spc.commission_per_unit
      FROM partner_referrals pr
      JOIN supplier_product_offers spo ON spo.id = pr.product_id
      JOIN neture_suppliers ns ON ns.id = spo.supplier_id
      LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
      LEFT JOIN product_masters pm ON pm.id = spo.master_id
      LEFT JOIN supplier_partner_commissions spc ON spc.supplier_product_id = pr.product_id
        AND spc.start_date <= CURRENT_DATE
        AND (spc.end_date IS NULL OR spc.end_date >= CURRENT_DATE)
      WHERE pr.partner_id = $1
      ORDER BY pr.created_at DESC
    `, [partnerId]);

    // Build referral_url for each link
    return rows.map((r: any) => ({
      ...r,
      referral_url: `/store/${r.store_slug}/product/${r.product_slug}?ref=${r.referral_token}`,
    }));
  }

  // ─────────────────────────────────────────────
  // Partner Settlements (partner-facing)
  // ─────────────────────────────────────────────

  /**
   * Get partner's own settlement list (paginated)
   * WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1
   */
  async getPartnerSettlements(partnerId: string, page: number, limit: number): Promise<{ settlements: any[]; total: number }> {
    const offset = (page - 1) * limit;

    const [settlements, countResult] = await Promise.all([
      this.dataSource.query(
        `SELECT * FROM partner_settlements
         WHERE partner_id = $1
         ORDER BY created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        [partnerId],
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM partner_settlements WHERE partner_id = $1`,
        [partnerId],
      ),
    ]);

    const total = Number(countResult[0]?.total || 0);
    return { settlements, total };
  }

  /**
   * Get partner's settlement detail with items
   * WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1
   */
  async getPartnerSettlementDetail(settlementId: string, partnerId: string): Promise<{ settlement: any; items: any[] } | null> {
    const [settlement] = await this.dataSource.query(
      `SELECT * FROM partner_settlements WHERE id = $1 AND partner_id = $2`,
      [settlementId, partnerId],
    );

    if (!settlement) return null;

    const items = await this.dataSource.query(
      `SELECT psi.commission_amount, pc.order_number, pc.order_amount,
              pc.commission_rate, pc.supplier_id, supplier_org.name AS supplier_name,
              pc.created_at AS commission_date
       FROM partner_settlement_items psi
       JOIN partner_commissions pc ON pc.id = psi.commission_id
       LEFT JOIN neture_suppliers ns ON ns.id = pc.supplier_id
       LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
       WHERE psi.settlement_id = $1
       ORDER BY pc.created_at`,
      [settlementId],
    );

    return { settlement, items };
  }

  // ─────────────────────────────────────────────
  // Admin Partner Monitoring
  // ─────────────────────────────────────────────

  /**
   * Admin: Get partner list with stats (paginated + search)
   * WO-O4O-ADMIN-PARTNER-MONITORING-V1
   */
  async getAdminPartnerList(page: number, limit: number, search: string): Promise<{ partners: any[]; total: number; kpi: any }> {
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let searchClause = '';
    if (search) {
      params.push(`%${search}%`);
      searchClause = `WHERE (u."displayName" ILIKE $1 OR u.email ILIKE $1)`;
    }

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    params.push(limit, offset);

    // WO-O4O-USER-DOMAIN-ALIGNMENT-V1: service_memberships JOIN for service boundary
    const [partners, countResult] = await Promise.all([
      this.dataSource.query(
        `SELECT
           u.id AS partner_id,
           u."displayName" AS name,
           u.email,
           COUNT(pc.id)::int AS orders,
           COALESCE(SUM(pc.commission_amount), 0)::int AS commission,
           COALESCE(SUM(CASE WHEN pc.status = 'approved' THEN pc.commission_amount ELSE 0 END), 0)::int AS payable,
           COALESCE(SUM(CASE WHEN pc.status = 'paid' THEN pc.commission_amount ELSE 0 END), 0)::int AS paid,
           MIN(pc.created_at) AS first_commission_at
         FROM partner_commissions pc
         JOIN users u ON u.id = pc.partner_id
         JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = 'neture'
         ${searchClause}
         GROUP BY u.id, u."displayName", u.email
         ORDER BY commission DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params,
      ),
      this.dataSource.query(
        `SELECT COUNT(DISTINCT pc.partner_id)::int AS total
         FROM partner_commissions pc
         JOIN users u ON u.id = pc.partner_id
         JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = 'neture'
         ${searchClause}`,
        search ? [params[0]] : [],
      ),
    ]);

    const total = Number(countResult[0]?.total || 0);

    // KPI totals
    const [kpi] = await this.dataSource.query(
      `SELECT
         COUNT(DISTINCT pc.partner_id)::int AS total_partners,
         COALESCE(SUM(pc.commission_amount), 0)::int AS total_commission,
         COALESCE(SUM(CASE WHEN pc.status = 'approved' THEN pc.commission_amount ELSE 0 END), 0)::int AS total_payable,
         COALESCE(SUM(CASE WHEN pc.status = 'paid' THEN pc.commission_amount ELSE 0 END), 0)::int AS total_paid
       FROM partner_commissions pc`,
    );

    return {
      partners,
      total,
      kpi: kpi || { total_partners: 0, total_commission: 0, total_payable: 0, total_paid: 0 },
    };
  }

  /**
   * Admin: Get partner detail + recent commissions
   * WO-O4O-ADMIN-PARTNER-MONITORING-V1
   */
  async getAdminPartnerDetail(partnerId: string): Promise<{ summary: any; commissions: any[] } | null> {
    // Partner summary — WO-O4O-USER-DOMAIN-ALIGNMENT-V1: service boundary
    const [summary] = await this.dataSource.query(
      `SELECT
         u.id AS partner_id,
         u."displayName" AS name,
         u.email,
         COUNT(pc.id)::int AS orders,
         COALESCE(SUM(pc.commission_amount), 0)::int AS commission,
         COALESCE(SUM(CASE WHEN pc.status = 'approved' THEN pc.commission_amount ELSE 0 END), 0)::int AS payable,
         COALESCE(SUM(CASE WHEN pc.status = 'paid' THEN pc.commission_amount ELSE 0 END), 0)::int AS paid
       FROM partner_commissions pc
       JOIN users u ON u.id = pc.partner_id
       JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = 'neture'
       WHERE pc.partner_id = $1
       GROUP BY u.id, u."displayName", u.email`,
      [partnerId],
    );

    if (!summary) return null;

    // Recent commissions (20)
    const commissions = await this.dataSource.query(
      `SELECT pc.id, pc.order_id, pc.order_number,
              pm.name AS product_name,
              os.name AS store_name,
              pc.commission_amount, pc.status, pc.created_at
       FROM partner_commissions pc
       LEFT JOIN supplier_product_offers spo ON spo.id = pc.product_id
       LEFT JOIN product_masters pm ON pm.id = spo.master_id
       LEFT JOIN organization_stores os ON os.id = pc.store_id
       WHERE pc.partner_id = $1
       ORDER BY pc.created_at DESC
       LIMIT 20`,
      [partnerId],
    );

    return { summary, commissions };
  }

  // ─────────────────────────────────────────────
  // Admin Partner Settlements
  // ─────────────────────────────────────────────

  /**
   * Admin: Create settlement batch from approved commissions
   * WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1
   */
  async createAdminSettlement(partnerId: string): Promise<{ settlement: any; itemCount: number }> {
    // approved 상태이고 아직 정산에 포함되지 않은 커미션 조회
    const payableCommissions = await this.dataSource.query(
      `SELECT pc.id, pc.commission_amount
       FROM partner_commissions pc
       WHERE pc.partner_id = $1
         AND pc.status = 'approved'
         AND NOT EXISTS (
           SELECT 1 FROM partner_settlement_items psi WHERE psi.commission_id = pc.id
         )
       ORDER BY pc.created_at`,
      [partnerId],
    );

    if (payableCommissions.length === 0) {
      throw new Error('NO_PAYABLE');
    }

    const totalCommission = payableCommissions.reduce((sum: number, c: { commission_amount: number }) => sum + Number(c.commission_amount), 0);

    // settlement 생성
    const [settlement] = await this.dataSource.query(
      `INSERT INTO partner_settlements (partner_id, total_commission, commission_count, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [partnerId, totalCommission, payableCommissions.length],
    );

    // settlement items 생성
    for (const c of payableCommissions) {
      await this.dataSource.query(
        `INSERT INTO partner_settlement_items (settlement_id, commission_id, commission_amount)
         VALUES ($1, $2, $3)`,
        [settlement.id, c.id, c.commission_amount],
      );
    }

    logger.info(`[Partner Settlement] Created settlement ${settlement.id} for partner ${partnerId}: ${payableCommissions.length} commissions, total ${totalCommission}`);

    return { settlement, itemCount: payableCommissions.length };
  }

  /**
   * Admin: Mark settlement as paid (with transaction)
   * WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1
   */
  async payAdminSettlement(settlementId: string): Promise<{ id: string; status: string; paid_at: string }> {
    // settlement 상태 확인
    const [settlement] = await this.dataSource.query(
      `SELECT * FROM partner_settlements WHERE id = $1`,
      [settlementId],
    );

    if (!settlement) {
      throw new Error('NOT_FOUND');
    }

    if (settlement.status === 'paid') {
      throw new Error('ALREADY_PAID');
    }

    // 트랜잭션: settlement paid + commissions paid
    await this.dataSource.query(`BEGIN`);

    try {
      // settlement 상태 → paid
      await this.dataSource.query(
        `UPDATE partner_settlements SET status = 'paid', paid_at = NOW() WHERE id = $1`,
        [settlementId],
      );

      // 포함된 커미션 → paid
      await this.dataSource.query(
        `UPDATE partner_commissions
         SET status = 'paid', paid_at = NOW(), updated_at = NOW()
         WHERE id IN (
           SELECT commission_id FROM partner_settlement_items WHERE settlement_id = $1
         )`,
        [settlementId],
      );

      await this.dataSource.query(`COMMIT`);
    } catch (txError) {
      await this.dataSource.query(`ROLLBACK`);
      throw txError;
    }

    logger.info(`[Partner Settlement] Settlement ${settlementId} paid`);

    return { id: settlementId, status: 'paid', paid_at: new Date().toISOString() };
  }

  /**
   * Admin: Get partner settlement list (paginated + status filter)
   * WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1
   */
  async getAdminSettlementList(page: number, limit: number, status?: string): Promise<{ settlements: any[]; total: number }> {
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let statusClause = '';
    if (status && ['pending', 'processing', 'paid'].includes(status)) {
      statusClause = `WHERE ps.status = $1`;
      params.push(status);
    }

    const [settlements, countResult] = await Promise.all([
      // WO-O4O-USER-DOMAIN-ALIGNMENT-V1: service boundary on user JOIN
      this.dataSource.query(
        `SELECT ps.*,
                u."displayName" AS partner_name,
                u.email AS partner_email
         FROM partner_settlements ps
         LEFT JOIN users u ON u.id = ps.partner_id
           AND EXISTS (SELECT 1 FROM service_memberships sm WHERE sm.user_id = u.id AND sm.service_key = 'neture')
         ${statusClause}
         ORDER BY ps.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM partner_settlements ps ${statusClause}`,
        params,
      ),
    ]);

    const total = Number(countResult[0]?.total || 0);
    return { settlements, total };
  }

  /**
   * Admin: Get partner settlement detail with items
   * WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1
   */
  async getAdminSettlementDetail(settlementId: string): Promise<{ settlement: any; items: any[] } | null> {
    // WO-O4O-USER-DOMAIN-ALIGNMENT-V1: service boundary on user JOIN
    const [settlement] = await this.dataSource.query(
      `SELECT ps.*,
              u."displayName" AS partner_name,
              u.email AS partner_email
       FROM partner_settlements ps
       LEFT JOIN users u ON u.id = ps.partner_id
         AND EXISTS (SELECT 1 FROM service_memberships sm WHERE sm.user_id = u.id AND sm.service_key = 'neture')
       WHERE ps.id = $1`,
      [settlementId],
    );

    if (!settlement) return null;

    // 포함된 커미션 목록
    const items = await this.dataSource.query(
      `SELECT psi.*, pc.order_number, pc.order_amount, pc.commission_rate,
              pc.supplier_id, supplier_org.name AS supplier_name,
              pc.status AS commission_status
       FROM partner_settlement_items psi
       JOIN partner_commissions pc ON pc.id = psi.commission_id
       LEFT JOIN neture_suppliers ns ON ns.id = pc.supplier_id
       LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
       WHERE psi.settlement_id = $1
       ORDER BY pc.created_at`,
      [settlementId],
    );

    return { settlement, items };
  }
}
