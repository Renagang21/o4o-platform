/**
 * Track B — Resolver Injection (Service-level)
 * Track C — Service Logic
 *
 * WO-O4O-ASSET-COPY-CORE-TEST-HARDENING-V1
 */

import { AssetCopyService } from '../src/services/asset-copy.service.js';
import { DefaultPermissionChecker } from '../src/interfaces/permission-checker.interface.js';
import type { PermissionChecker } from '../src/interfaces/permission-checker.interface.js';
import type { ContentResolver, ResolvedContent } from '../src/interfaces/content-resolver.interface.js';

// ── Mock Setup ──────────────────────────────────────────

// WO-O4O-STORE-LIBRARY-SERVER-PAGINATION-V1: listByOrganization 가 createQueryBuilder + getManyAndCount 사용.
// fluent builder mock — getManyAndCount 결과만 미리 세팅하면 충분.
function createMockRepo() {
  const qbState: { result: [any[], number]; calls: any[] } = {
    result: [[], 0],
    calls: [],
  };
  const qb: any = {};
  ['where', 'andWhere', 'orderBy', 'skip', 'take'].forEach((m) => {
    qb[m] = jest.fn((...args: any[]) => {
      qbState.calls.push({ method: m, args });
      return qb;
    });
  });
  qb.getManyAndCount = jest.fn(() => Promise.resolve(qbState.result));

  return {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn((data: any) => ({ ...data, id: 'snap-uuid-1', createdAt: new Date() })),
    save: jest.fn((entity: any) => Promise.resolve(entity)),
    createQueryBuilder: jest.fn(() => qb),
    // 테스트 helpers
    __qb: qb,
    __qbState: qbState,
  };
}

function createMockDataSource(repo: any) {
  return {
    getRepository: jest.fn().mockReturnValue(repo),
  } as any;
}

function createMockResolver(resolveResult: ResolvedContent | null = null): ContentResolver {
  return {
    resolve: jest.fn().mockResolvedValue(resolveResult),
  };
}

const SAMPLE_RESOLVED: ResolvedContent = {
  title: 'Test Article',
  type: 'cms',
  contentJson: { body: '<p>Hello</p>', author: 'admin' },
  sourceService: 'kpa',
};

// ═══════════════════════════════════════════════════════════
// Track C — Service Logic
// ═══════════════════════════════════════════════════════════

describe('AssetCopyService', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let ds: any;
  let service: AssetCopyService;

  beforeEach(() => {
    repo = createMockRepo();
    ds = createMockDataSource(repo);
    service = new AssetCopyService(ds);
  });

  // ── C1: 정상 복사 흐름 ────────────────────────────────

  describe('C1: Normal copy flow', () => {
    it('copyResolved succeeds with valid input', async () => {
      repo.findOne.mockResolvedValue(null); // no duplicate

      const result = await service.copyResolved({
        sourceService: 'kpa',
        sourceAssetId: 'asset-1',
        assetType: 'cms',
        targetOrganizationId: 'org-1',
        createdBy: 'user-1',
        title: 'Test',
        contentJson: { body: 'content' },
      });

      expect(result.snapshot).toBeDefined();
      expect(result.snapshot.sourceService).toBe('kpa');
      expect(result.snapshot.title).toBe('Test');
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('copyWithResolver succeeds end-to-end', async () => {
      const resolver = createMockResolver(SAMPLE_RESOLVED);
      repo.findOne.mockResolvedValue(null); // no duplicate

      const result = await service.copyWithResolver(
        {
          sourceService: 'kpa',
          sourceAssetId: 'asset-1',
          assetType: 'cms',
          targetOrganizationId: 'org-1',
          createdBy: 'user-1',
        },
        resolver,
      );

      expect(result.snapshot).toBeDefined();
      expect(result.snapshot.title).toBe('Test Article');
    });
  });

  // ── C2: Permission denied ─────────────────────────────

  describe('C2: Permission check', () => {
    it('checkPermission returns true when role matches', () => {
      expect(service.checkPermission(['kpa:admin'], ['kpa:admin', 'kpa:operator'])).toBe(true);
    });

    it('checkPermission returns false when no role matches', () => {
      expect(service.checkPermission(['neture:admin'], ['kpa:admin', 'kpa:operator'])).toBe(false);
    });

    it('checkPermission with empty userRoles returns false', () => {
      expect(service.checkPermission([], ['kpa:admin'])).toBe(false);
    });
  });

  // ── C3: resolve failure ───────────────────────────────

  describe('C3: Resolve failure', () => {
    it('copyWithResolver throws SOURCE_NOT_FOUND when resolver returns null', async () => {
      const resolver = createMockResolver(null);

      await expect(
        service.copyWithResolver(
          {
            sourceService: 'kpa',
            sourceAssetId: 'nonexistent',
            assetType: 'cms',
            targetOrganizationId: 'org-1',
            createdBy: 'user-1',
          },
          resolver,
        ),
      ).rejects.toThrow('SOURCE_NOT_FOUND');
    });

    it('resolver.resolve() is NOT called after SOURCE_NOT_FOUND', async () => {
      const resolver = createMockResolver(null);

      try {
        await service.copyWithResolver(
          {
            sourceService: 'kpa',
            sourceAssetId: 'bad-id',
            assetType: 'cms',
            targetOrganizationId: 'org-1',
            createdBy: 'user-1',
          },
          resolver,
        );
      } catch {
        // expected
      }

      // resolve was called, but save was NOT (short-circuited)
      expect(resolver.resolve).toHaveBeenCalledTimes(1);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // ── Independent copy semantics ────────────────────────
  // WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1: 동일 원본 중복 복사 허용.
  // 더 이상 DUPLICATE_SNAPSHOT 을 throw 하지 않으며, 매번 새 snapshot 이 생성된다.

  describe('Independent copy semantics', () => {
    it('creates a new snapshot even when an existing snapshot has the same source', async () => {
      // 기존에 동일 (org, sourceAssetId, assetType) 이 있어도 호출은 성공해야 한다.
      repo.findOne.mockResolvedValue({ id: 'existing-snap' });
      repo.create.mockReturnValue({ id: 'new-snap', sourceAssetId: 'asset-1' });
      repo.save.mockResolvedValue({ id: 'new-snap', sourceAssetId: 'asset-1' });

      const result = await service.copyResolved({
        sourceService: 'kpa',
        sourceAssetId: 'asset-1',
        assetType: 'cms',
        targetOrganizationId: 'org-1',
        createdBy: 'user-1',
        title: 'Test',
        contentJson: { body: 'content' },
      });

      expect(result.snapshot).toEqual({ id: 'new-snap', sourceAssetId: 'asset-1' });
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('rethrows DB errors', async () => {
      repo.save.mockRejectedValue(new Error('CONNECTION_LOST'));

      await expect(
        service.copyResolved({
          sourceService: 'kpa',
          sourceAssetId: 'asset-1',
          assetType: 'cms',
          targetOrganizationId: 'org-1',
          createdBy: 'user-1',
          title: 'Test',
          contentJson: { body: 'content' },
        }),
      ).rejects.toThrow('CONNECTION_LOST');
    });
  });

  // ── Invalid content ───────────────────────────────────

  describe('Invalid content validation', () => {
    it('throws INVALID_CONTENT for null contentJson', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.copyResolved({
          sourceService: 'kpa',
          sourceAssetId: 'asset-1',
          assetType: 'cms',
          targetOrganizationId: 'org-1',
          createdBy: 'user-1',
          title: 'Test',
          contentJson: null as any,
        }),
      ).rejects.toThrow('INVALID_CONTENT');
    });

    it('throws INVALID_CONTENT for array contentJson', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.copyResolved({
          sourceService: 'kpa',
          sourceAssetId: 'asset-1',
          assetType: 'cms',
          targetOrganizationId: 'org-1',
          createdBy: 'user-1',
          title: 'Test',
          contentJson: [1, 2, 3] as any,
        }),
      ).rejects.toThrow('INVALID_CONTENT');
    });
  });

  // ── Default title ─────────────────────────────────────

  describe('Default title', () => {
    it('uses "Untitled" when title is empty', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.copyResolved({
        sourceService: 'kpa',
        sourceAssetId: 'asset-1',
        assetType: 'cms',
        targetOrganizationId: 'org-1',
        createdBy: 'user-1',
        title: '',
        contentJson: { body: 'content' },
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Untitled' }),
      );
    });
  });

  // ── Pagination (listByOrganization) ───────────────────

  describe('listByOrganization', () => {
    it('returns paginated results with totalPages', async () => {
      const items = [{ id: 'snap-1' }, { id: 'snap-2' }];
      (repo as any).__qbState.result = [items, 10];

      const result = await service.listByOrganization('org-1', {
        page: 1,
        limit: 20,
      });

      expect(result.items).toEqual(items);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      // ceil(10/20) = 1
      expect(result.totalPages).toBe(1);
    });

    it('computes totalPages = ceil(total / limit)', async () => {
      (repo as any).__qbState.result = [[], 47];

      const result = await service.listByOrganization('org-1', {
        page: 1,
        limit: 20,
      });

      // ceil(47/20) = 3
      expect(result.totalPages).toBe(3);
    });

    it('returns totalPages = 1 even when total = 0', async () => {
      (repo as any).__qbState.result = [[], 0];

      const result = await service.listByOrganization('org-1', {
        page: 1,
        limit: 20,
      });

      expect(result.totalPages).toBe(1);
    });

    it('filters by assetType when provided', async () => {
      (repo as any).__qbState.result = [[], 0];

      await service.listByOrganization('org-1', {
        assetType: 'signage',
        page: 1,
        limit: 10,
      });

      const calls = (repo as any).__qbState.calls;
      expect(calls).toContainEqual({
        method: 'andWhere',
        args: ['s.assetType = :assetType', { assetType: 'signage' }],
      });
    });

    it('omits assetType filter when not provided', async () => {
      (repo as any).__qbState.result = [[], 0];

      await service.listByOrganization('org-1', {
        page: 2,
        limit: 5,
      });

      const calls = (repo as any).__qbState.calls;
      expect(calls.some((c: any) => c.method === 'andWhere' && c.args[0] === 's.assetType = :assetType')).toBe(false);
      // page 2, limit 5 → skip 5, take 5
      expect(calls).toContainEqual({ method: 'skip', args: [5] });
      expect(calls).toContainEqual({ method: 'take', args: [5] });
    });

    it('applies ILIKE search filter when search term provided', async () => {
      (repo as any).__qbState.result = [[], 0];

      await service.listByOrganization('org-1', {
        page: 1,
        limit: 20,
        search: '혈당',
      });

      const calls = (repo as any).__qbState.calls;
      expect(calls).toContainEqual({
        method: 'andWhere',
        args: ['s.title ILIKE :term', { term: '%혈당%' }],
      });
    });

    it('omits search filter when search is empty/whitespace', async () => {
      (repo as any).__qbState.result = [[], 0];

      await service.listByOrganization('org-1', {
        page: 1,
        limit: 20,
        search: '   ',
      });

      const calls = (repo as any).__qbState.calls;
      expect(calls.some((c: any) => c.method === 'andWhere' && c.args[0] === 's.title ILIKE :term')).toBe(false);
    });
  });

  // ── PermissionChecker injection ───────────────────────

  describe('PermissionChecker injection', () => {
    it('uses DefaultPermissionChecker when none provided', () => {
      const svc = new AssetCopyService(ds);
      // Default: exact match
      expect(svc.checkPermission(['kpa:admin'], ['kpa:admin'])).toBe(true);
      expect(svc.checkPermission(['kpa:admin'], ['kpa:operator'])).toBe(false);
    });

    it('uses injected custom PermissionChecker', () => {
      const custom: PermissionChecker = {
        hasAnyRole: jest.fn().mockReturnValue(true),
      };
      const svc = new AssetCopyService(ds, custom);

      const result = svc.checkPermission(['any'], ['any']);

      expect(result).toBe(true);
      expect(custom.hasAnyRole).toHaveBeenCalledWith(['any'], ['any']);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// Track B — Resolver Injection at Service Level
// ═══════════════════════════════════════════════════════════

describe('Track B: Resolver Injection via Service', () => {
  let repo: ReturnType<typeof createMockRepo>;
  let ds: any;
  let service: AssetCopyService;

  beforeEach(() => {
    repo = createMockRepo();
    ds = createMockDataSource(repo);
    service = new AssetCopyService(ds);
  });

  // ── B1: resolve() 호출 여부 ───────────────────────────

  it('B1: copyWithResolver calls resolver.resolve() exactly once', async () => {
    const resolver = createMockResolver(SAMPLE_RESOLVED);
    repo.findOne.mockResolvedValue(null);

    await service.copyWithResolver(
      {
        sourceService: 'kpa',
        sourceAssetId: 'asset-1',
        assetType: 'cms',
        targetOrganizationId: 'org-1',
        createdBy: 'user-1',
      },
      resolver,
    );

    expect(resolver.resolve).toHaveBeenCalledTimes(1);
    expect(resolver.resolve).toHaveBeenCalledWith('asset-1', 'cms');
  });

  // ── B2: resolve returns null ──────────────────────────

  it('B2: resolve returns null → SOURCE_NOT_FOUND, save never called', async () => {
    const resolver = createMockResolver(null);

    await expect(
      service.copyWithResolver(
        {
          sourceService: 'kpa',
          sourceAssetId: 'bad',
          assetType: 'cms',
          targetOrganizationId: 'org-1',
          createdBy: 'user-1',
        },
        resolver,
      ),
    ).rejects.toThrow('SOURCE_NOT_FOUND');

    expect(repo.save).not.toHaveBeenCalled();
  });

  // ── B3: Resolver 교체 ─────────────────────────────────

  it('B3: different resolvers produce different snapshots', async () => {
    repo.findOne.mockResolvedValue(null);

    const resolverA = createMockResolver({
      title: 'From A',
      type: 'cms',
      contentJson: { source: 'A' },
      sourceService: 'kpa',
    });

    const resolverB = createMockResolver({
      title: 'From B',
      type: 'signage',
      contentJson: { source: 'B' },
      sourceService: 'neture',
    });

    const resultA = await service.copyWithResolver(
      {
        sourceService: 'kpa',
        sourceAssetId: 'a1',
        assetType: 'cms',
        targetOrganizationId: 'org-1',
        createdBy: 'user-1',
      },
      resolverA,
    );

    // Reset for second call
    repo.findOne.mockResolvedValue(null);

    const resultB = await service.copyWithResolver(
      {
        sourceService: 'neture',
        sourceAssetId: 'b1',
        assetType: 'signage',
        targetOrganizationId: 'org-2',
        createdBy: 'user-2',
      },
      resolverB,
    );

    expect(resultA.snapshot.title).toBe('From A');
    expect(resultB.snapshot.title).toBe('From B');
  });
});
