/**
 * Store HUB Test Seed — VERIFICATION-STORE-HUB-STAGE-1
 *
 * Creates minimum test data for Store HUB verification across 3 services.
 * Protected by X-Admin-Secret header (= JWT_SECRET).
 * POST /api/v1/ops/seed-store-hub   — create
 * DELETE /api/v1/ops/seed-store-hub  — cleanup
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import bcrypt from 'bcrypt';

/* ─── Deterministic Test UUIDs (hex-safe) ─── */

const T = {
  // Users
  userOwner1:  'e0000000-ee01-4000-a000-000000000001',
  userOwner2:  'e0000000-ee01-4000-a000-000000000002',
  userOperator:'e0000000-ee01-4000-a000-000000000003',

  // Organizations
  orgKpa:      'e0000000-ee02-4000-a000-000000000001',
  orgGlyco:    'e0000000-ee02-4000-a000-000000000002',
  orgCosmetics:'e0000000-ee02-4000-a000-000000000003',

  // Channels (3 per org × 3 orgs = 9)
  chKpaB2c:    'e0000000-ee03-4000-a000-000000000001',
  chKpaTablet: 'e0000000-ee03-4000-a000-000000000002',
  chKpaSignage:'e0000000-ee03-4000-a000-000000000003',
  chGlycoB2c:  'e0000000-ee03-4000-a000-000000000004',
  chGlycoTablet:'e0000000-ee03-4000-a000-000000000005',
  chGlycoSignage:'e0000000-ee03-4000-a000-000000000006',
  chCosB2c:    'e0000000-ee03-4000-a000-000000000007',
  chCosTablet: 'e0000000-ee03-4000-a000-000000000008',
  chCosSignage:'e0000000-ee03-4000-a000-000000000009',

  // Product listings
  pl1:         'e0000000-ee04-4000-a000-000000000001',
  pl2:         'e0000000-ee04-4000-a000-000000000002',
  pl3:         'e0000000-ee04-4000-a000-000000000003',

  // Slugs
  slugKpa:     'e0000000-ee05-4000-a000-000000000001',
  slugGlyco:   'e0000000-ee05-4000-a000-000000000002',
  slugCos:     'e0000000-ee05-4000-a000-000000000003',
};

function verify(req: Request, res: Response): boolean {
  const secret = req.headers['x-admin-secret'] as string;
  const jwt = process.env.JWT_SECRET;
  if (secret && jwt && secret === jwt) return true;
  res.status(401).json({ success: false, error: 'Invalid admin secret', code: 'ADMIN_SECRET_REQUIRED' });
  return false;
}

async function insertIfNotExists(
  ds: DataSource,
  table: string,
  id: string,
  sql: string,
  params: any[],
  created: string[],
  skipped: string[],
  label: string,
) {
  const existing = await ds.query(`SELECT id FROM ${table} WHERE id = $1`, [id]);
  if (existing.length > 0) { skipped.push(label); return; }
  await ds.query(sql, params);
  created.push(label);
}

export function createSeedStoreHubRouter(dataSource: DataSource): Router {
  const router = Router();

  /* ─── POST: Create seed data ─── */
  router.post('/', async (req: Request, res: Response) => {
    if (!verify(req, res)) return;

    const created: string[] = [];
    const skipped: string[] = [];

    try {
      const passwordHash = await bcrypt.hash('Test1234!', 10);

      // 1. Users
      // WO-O4O-LEGACY-RBAC-SEED-FIX-V1: users.roles column was DROPPED (RBAC SSOT = role_assignments)
      const users = [
        { id: T.userOwner1, email: 'store.owner1@test.com', name: '테스트약국1' },
        { id: T.userOwner2, email: 'store.owner2@test.com', name: '테스트약국2' },
        { id: T.userOperator, email: 'operator@test.com', name: '운영자' },
      ];
      for (const u of users) {
        await insertIfNotExists(dataSource, 'users', u.id,
          `INSERT INTO users (id, email, password, name, "isActive", "isEmailVerified", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, true, true, NOW(), NOW())`,
          [u.id, u.email, passwordHash, u.name],
          created, skipped, `user:${u.email}`,
        );
      }

      // 2. Organizations
      const orgs = [
        { id: T.orgKpa, name: '[TEST] KPA 테스트 약국', code: 'TEST-KPA-001', type: 'pharmacy', meta: { serviceKey: 'kpa' } },
        { id: T.orgGlyco, name: '[TEST] GlycoPharm 테스트 약국', code: 'TEST-GLYCO-001', type: 'pharmacy', meta: { serviceKey: 'glycopharm' } },
        { id: T.orgCosmetics, name: '[TEST] Cosmetics 테스트 스토어', code: 'TEST-COS-001', type: 'store', meta: { serviceKey: 'cosmetics' } },
      ];
      for (const o of orgs) {
        await insertIfNotExists(dataSource, 'organizations', o.id,
          `INSERT INTO organizations (id, name, code, type, level, path, "isActive", metadata, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, 0, $5, true, $6::jsonb, NOW(), NOW())`,
          [o.id, o.name, o.code, o.type, '/' + o.code, JSON.stringify(o.meta)],
          created, skipped, `org:${o.code}`,
        );
      }

      // 3. Organization members (owner1 → KPA+GlycoPharm, owner2 → Cosmetics)
      const members = [
        { orgId: T.orgKpa, userId: T.userOwner1, role: 'owner' },
        { orgId: T.orgGlyco, userId: T.userOwner1, role: 'owner' },
        { orgId: T.orgCosmetics, userId: T.userOwner2, role: 'owner' },
      ];
      for (const m of members) {
        const exists = await dataSource.query(
          `SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2`,
          [m.orgId, m.userId],
        );
        if (exists.length > 0) { skipped.push(`member:${m.role}@${m.orgId.slice(-1)}`); continue; }
        await dataSource.query(
          `INSERT INTO organization_members (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, false, NOW(), NOW(), NOW())`,
          [m.orgId, m.userId, m.role],
        );
        created.push(`member:${m.role}@${m.orgId.slice(-1)}`);
      }

      // 4. Store slugs
      const slugs = [
        { id: T.slugKpa, slug: 'kpa-test-pharmacy', storeId: T.orgKpa, serviceKey: 'kpa' },
        { id: T.slugGlyco, slug: 'glycopharm-test-pharmacy', storeId: T.orgGlyco, serviceKey: 'glycopharm' },
        { id: T.slugCos, slug: 'cosmetics-test-store', storeId: T.orgCosmetics, serviceKey: 'cosmetics' },
      ];
      for (const s of slugs) {
        await insertIfNotExists(dataSource, 'platform_store_slugs', s.id,
          `INSERT INTO platform_store_slugs (id, slug, store_id, service_key, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
          [s.id, s.slug, s.storeId, s.serviceKey],
          created, skipped, `slug:${s.slug}`,
        );
      }

      // 5. Store channels (B2C, TABLET, SIGNAGE per org)
      // Table: organization_channels (ENUM types for channel_type and status)
      const channels = [
        { id: T.chKpaB2c, orgId: T.orgKpa, type: 'B2C' },
        { id: T.chKpaTablet, orgId: T.orgKpa, type: 'TABLET' },
        { id: T.chKpaSignage, orgId: T.orgKpa, type: 'SIGNAGE' },
        { id: T.chGlycoB2c, orgId: T.orgGlyco, type: 'B2C' },
        { id: T.chGlycoTablet, orgId: T.orgGlyco, type: 'TABLET' },
        { id: T.chGlycoSignage, orgId: T.orgGlyco, type: 'SIGNAGE' },
        { id: T.chCosB2c, orgId: T.orgCosmetics, type: 'B2C' },
        { id: T.chCosTablet, orgId: T.orgCosmetics, type: 'TABLET' },
        { id: T.chCosSignage, orgId: T.orgCosmetics, type: 'SIGNAGE' },
      ];
      for (const ch of channels) {
        await insertIfNotExists(dataSource, 'organization_channels', ch.id,
          `INSERT INTO organization_channels (id, organization_id, channel_type, status, approved_at, created_at, updated_at)
           VALUES ($1, $2, $3::organization_channel_type, 'APPROVED'::organization_channel_status, NOW(), NOW(), NOW())`,
          [ch.id, ch.orgId, ch.type],
          created, skipped, `channel:${ch.type}@${ch.orgId.slice(-1)}`,
        );
      }

      // 6. Product listings (basic test products)
      // Table: organization_product_listings (has external_product_id NOT NULL)
      const products = [
        { id: T.pl1, orgId: T.orgKpa, name: '테스트 비타민C 1000', price: 15000, serviceKey: 'kpa' },
        { id: T.pl2, orgId: T.orgKpa, name: '테스트 혈당 측정기', price: 45000, serviceKey: 'kpa' },
        { id: T.pl3, orgId: T.orgCosmetics, name: '테스트 마스크팩', price: 3000, serviceKey: 'cosmetics' },
      ];
      for (const p of products) {
        await insertIfNotExists(dataSource, 'organization_product_listings', p.id,
          `INSERT INTO organization_product_listings (id, organization_id, external_product_id, product_name, product_metadata, retail_price, service_key, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, '{}'::jsonb, $5, $6, true, NOW(), NOW())`,
          [p.id, p.orgId, 'test-' + p.id, p.name, p.price, p.serviceKey],
          created, skipped, `product:${p.name}`,
        );
      }

      // 7. Channel products (map products to B2C channel)
      const channelProducts = [
        { channelId: T.chKpaB2c, plId: T.pl1, order: 0 },
        { channelId: T.chKpaTablet, plId: T.pl2, order: 0 },
      ];
      for (const cp of channelProducts) {
        const exists = await dataSource.query(
          `SELECT id FROM organization_product_channels WHERE channel_id = $1 AND product_listing_id = $2`,
          [cp.channelId, cp.plId],
        );
        if (exists.length > 0) { skipped.push(`ch-product:${cp.plId.slice(-1)}@${cp.channelId.slice(-1)}`); continue; }
        await dataSource.query(
          `INSERT INTO organization_product_channels (id, channel_id, product_listing_id, is_active, display_order, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, true, $3, NOW(), NOW())`,
          [cp.channelId, cp.plId, cp.order],
        );
        created.push(`ch-product:${cp.plId.slice(-1)}@${cp.channelId.slice(-1)}`);
      }

      res.json({
        success: true,
        data: { created: created.length, skipped: skipped.length, details: { created, skipped } },
      });
    } catch (error: any) {
      console.error('[SeedStoreHub] Error:', error);
      res.status(500).json({ success: false, error: error.message, created, skipped });
    }
  });

  /* ─── DELETE: Cleanup seed data ─── */
  router.delete('/', async (req: Request, res: Response) => {
    if (!verify(req, res)) return;

    const deleted: string[] = [];
    try {
      // Reverse dependency order
      const cleanups = [
        { table: 'organization_product_channels', col: 'channel_id', pattern: 'e0000000-ee03-4000' },
        { table: 'organization_product_listings', col: 'id', pattern: 'e0000000-ee04-4000' },
        { table: 'organization_channels', col: 'id', pattern: 'e0000000-ee03-4000' },
        { table: 'platform_store_slugs', col: 'id', pattern: 'e0000000-ee05-4000' },
        { table: 'organization_members', col: 'organization_id', pattern: 'e0000000-ee02-4000' },
        { table: 'organizations', col: 'id', pattern: 'e0000000-ee02-4000' },
        { table: 'users', col: 'id', pattern: 'e0000000-ee01-4000' },
      ];

      for (const c of cleanups) {
        try {
          const result = await dataSource.query(
            `DELETE FROM ${c.table} WHERE ${c.col}::text LIKE $1`,
            [`${c.pattern}%`],
          );
          deleted.push(`${c.table}: ${result[1]} rows`);
        } catch (e: any) {
          deleted.push(`${c.table}: skip (${e.message?.substring(0, 60)})`);
        }
      }

      res.json({ success: true, data: { deleted } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
