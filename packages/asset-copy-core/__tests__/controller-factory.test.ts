/**
 * Track D — Controller Factory
 *
 * WO-O4O-ASSET-COPY-CORE-TEST-HARDENING-V1
 *
 * Uses supertest + express to test the generated router.
 */

import express from 'express';
import request from 'supertest';
import { createAssetCopyController } from '../src/factory/create-asset-copy-controller.js';
import type { AssetCopyControllerConfig } from '../src/interfaces/controller-config.interface.js';
import type { ContentResolver, ResolvedContent } from '../src/interfaces/content-resolver.interface.js';
import type { PermissionChecker } from '../src/interfaces/permission-checker.interface.js';

// ── Mock Setup ──────────────────────────────────────────

function createMockRepo() {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    create: jest.fn((data: any) => ({ ...data, id: 'snap-uuid-1', createdAt: new Date() })),
    save: jest.fn((entity: any) => Promise.resolve(entity)),
  };
}

function createMockDataSource(repo: any) {
  return {
    getRepository: jest.fn().mockReturnValue(repo),
  } as any;
}

const SAMPLE_RESOLVED: ResolvedContent = {
  title: 'Test Content',
  type: 'cms',
  contentJson: { body: '<p>Test</p>' },
  sourceService: 'kpa',
};

function createMockResolver(): ContentResolver {
  return { resolve: jest.fn().mockResolvedValue(SAMPLE_RESOLVED) };
}

function mockAuth(user: any): express.RequestHandler {
  return (req: any, _res, next) => {
    req.user = user;
    next();
  };
}

function noAuth(): express.RequestHandler {
  return (_req, _res, next) => next();
}

function buildApp(
  config: Partial<AssetCopyControllerConfig> & { user?: any },
) {
  const repo = createMockRepo();
  const ds = createMockDataSource(repo);
  const resolver = createMockResolver();

  const fullConfig: AssetCopyControllerConfig = {
    allowedRoles: config.allowedRoles ?? ['kpa:admin', 'kpa:operator'],
    sourceService: config.sourceService ?? 'kpa',
    resolver: config.resolver ?? resolver,
    resolveOrgId: config.resolveOrgId ?? (async () => 'org-uuid-1'),
    noOrgErrorCode: config.noOrgErrorCode,
    noOrgMessage: config.noOrgMessage,
    permissionChecker: config.permissionChecker,
  };

  const authMiddleware = config.user ? mockAuth(config.user) : noAuth();
  const router = createAssetCopyController(ds, authMiddleware, fullConfig);

  const app = express();
  app.use(express.json());
  app.use('/assets', router);

  return { app, repo, resolver };
}

// ═══════════════════════════════════════════════════════════
// Track D — Controller Factory Tests
// ═══════════════════════════════════════════════════════════

describe('Controller Factory', () => {
  // ── D1: Config injection ──────────────────────────────

  describe('D1: config injection', () => {
    it('allowedRoles are enforced — permitted role passes', async () => {
      const { app } = buildApp({
        allowedRoles: ['kpa:admin'],
        user: { id: 'u1', roles: ['kpa:admin'] },
      });

      const res = await request(app)
        .post('/assets/copy')
        .send({ sourceAssetId: 'asset-1', assetType: 'cms' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('allowedRoles are enforced — forbidden role blocked', async () => {
      const { app } = buildApp({
        allowedRoles: ['kpa:admin'],
        user: { id: 'u1', roles: ['kpa:member'] },
      });

      const res = await request(app)
        .post('/assets/copy')
        .send({ sourceAssetId: 'asset-1', assetType: 'cms' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('custom permissionChecker is used', async () => {
      const alwaysAllow: PermissionChecker = {
        hasAnyRole: jest.fn().mockReturnValue(true),
      };

      const { app } = buildApp({
        allowedRoles: ['kpa:admin'],
        user: { id: 'u1', roles: ['random:role'] },
        permissionChecker: alwaysAllow,
      });

      const res = await request(app)
        .post('/assets/copy')
        .send({ sourceAssetId: 'asset-1', assetType: 'cms' });

      expect(res.status).toBe(201);
      expect(alwaysAllow.hasAnyRole).toHaveBeenCalled();
    });
  });

  // ── D2: Missing user/roles ────────────────────────────

  describe('D2: Missing user authentication', () => {
    it('no user → 401', async () => {
      const { app } = buildApp({}); // no user injected

      const res = await request(app)
        .post('/assets/copy')
        .send({ sourceAssetId: 'asset-1', assetType: 'cms' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('user with no roles → 403', async () => {
      const { app } = buildApp({
        user: { id: 'u1' }, // no roles property
      });

      const res = await request(app)
        .post('/assets/copy')
        .send({ sourceAssetId: 'asset-1', assetType: 'cms' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('user with empty roles array → 403', async () => {
      const { app } = buildApp({
        user: { id: 'u1', roles: [] },
      });

      const res = await request(app)
        .post('/assets/copy')
        .send({ sourceAssetId: 'asset-1', assetType: 'cms' });

      expect(res.status).toBe(403);
    });

    it('GET / no user → 401', async () => {
      const { app } = buildApp({}); // no user

      const res = await request(app).get('/assets');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET / user with wrong roles → 403', async () => {
      const { app } = buildApp({
        allowedRoles: ['kpa:admin'],
        user: { id: 'u1', roles: ['kpa:member'] },
      });

      const res = await request(app).get('/assets');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // ── D3: JSON response structure ───────────────────────

  describe('D3: Response structure', () => {
    it('POST /copy success returns { success: true, data: snapshot }', async () => {
      const { app } = buildApp({
        user: { id: 'u1', roles: ['kpa:admin'] },
      });

      const res = await request(app)
        .post('/assets/copy')
        .send({ sourceAssetId: 'asset-1', assetType: 'cms' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('sourceService', 'kpa');
    });

    it('GET / success returns { success: true, data: { items, total, page, limit } }', async () => {
      const { app } = buildApp({
        user: { id: 'u1', roles: ['kpa:admin'] },
      });

      const res = await request(app).get('/assets');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('limit');
    });

    it('error response has { success: false, error: { code, message } }', async () => {
      const { app } = buildApp({
        user: { id: 'u1', roles: ['kpa:member'] },
        allowedRoles: ['kpa:admin'],
      });

      const res = await request(app)
        .post('/assets/copy')
        .send({ sourceAssetId: 'a', assetType: 'cms' });

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
    });
  });

  // ── Validation ────────────────────────────────────────

  describe('Request validation', () => {
    it('missing sourceAssetId → 400 MISSING_FIELDS', async () => {
      const { app } = buildApp({
        user: { id: 'u1', roles: ['kpa:admin'] },
      });

      const res = await request(app)
        .post('/assets/copy')
        .send({ assetType: 'cms' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('missing assetType → 400 MISSING_FIELDS', async () => {
      const { app } = buildApp({
        user: { id: 'u1', roles: ['kpa:admin'] },
      });

      const res = await request(app)
        .post('/assets/copy')
        .send({ sourceAssetId: 'asset-1' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('invalid assetType → 400 INVALID_ASSET_TYPE', async () => {
      const { app } = buildApp({
        user: { id: 'u1', roles: ['kpa:admin'] },
      });

      const res = await request(app)
        .post('/assets/copy')
        .send({ sourceAssetId: 'asset-1', assetType: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ASSET_TYPE');
    });

    it('invalid type query param → 400 INVALID_ASSET_TYPE on GET', async () => {
      const { app } = buildApp({
        user: { id: 'u1', roles: ['kpa:admin'] },
      });

      const res = await request(app).get('/assets?type=invalid');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ASSET_TYPE');
    });
  });

  // ── Org resolution ────────────────────────────────────

  describe('Organization resolution', () => {
    it('resolveOrgId returns null → 403 with config error code', async () => {
      const { app } = buildApp({
        user: { id: 'u1', roles: ['kpa:admin'] },
        resolveOrgId: async () => null,
        noOrgErrorCode: 'NO_KPA_ORG',
        noOrgMessage: 'No KPA membership',
      });

      const res = await request(app)
        .post('/assets/copy')
        .send({ sourceAssetId: 'asset-1', assetType: 'cms' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NO_KPA_ORG');
      expect(res.body.error.message).toBe('No KPA membership');
    });

    it('resolveOrgId returns null on GET → 403', async () => {
      const { app } = buildApp({
        user: { id: 'u1', roles: ['kpa:admin'] },
        resolveOrgId: async () => null,
      });

      const res = await request(app).get('/assets');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NO_ORGANIZATION');
    });
  });

  // ── Error handling ────────────────────────────────────

  describe('Error handling', () => {
    it('SOURCE_NOT_FOUND → 404', async () => {
      const resolver: ContentResolver = {
        resolve: jest.fn().mockResolvedValue(null),
      };

      const { app } = buildApp({
        user: { id: 'u1', roles: ['kpa:admin'] },
        resolver,
      });

      const res = await request(app)
        .post('/assets/copy')
        .send({ sourceAssetId: 'bad', assetType: 'cms' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SOURCE_NOT_FOUND');
    });

    it('POST /copy internal error → 500', async () => {
      const resolver: ContentResolver = {
        resolve: jest.fn().mockRejectedValue(new Error('DB_DOWN')),
      };

      const { app } = buildApp({
        user: { id: 'u1', roles: ['kpa:admin'] },
        resolver,
      });

      const res = await request(app)
        .post('/assets/copy')
        .send({ sourceAssetId: 'asset-1', assetType: 'cms' });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('GET / internal error → 500', async () => {
      const { app } = buildApp({
        user: { id: 'u1', roles: ['kpa:admin'] },
        resolveOrgId: async () => { throw new Error('DB_DOWN'); },
      });

      const res = await request(app).get('/assets');

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('DUPLICATE_SNAPSHOT → 409', async () => {
      const repo = createMockRepo();
      repo.findOne.mockResolvedValue({ id: 'existing' }); // duplicate
      const ds = createMockDataSource(repo);

      const config: AssetCopyControllerConfig = {
        allowedRoles: ['kpa:admin'],
        sourceService: 'kpa',
        resolver: createMockResolver(),
        resolveOrgId: async () => 'org-1',
      };

      const app = express();
      app.use(express.json());
      app.use((req: any, _res, next) => {
        req.user = { id: 'u1', roles: ['kpa:admin'] };
        next();
      });
      app.use('/assets', createAssetCopyController(ds, noAuth(), config));

      const res = await request(app)
        .post('/assets/copy')
        .send({ sourceAssetId: 'asset-1', assetType: 'cms' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_SNAPSHOT');
    });
  });
});
