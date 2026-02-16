/**
 * Track B — Resolver Injection (BaseResolver)
 *
 * WO-O4O-ASSET-COPY-CORE-TEST-HARDENING-V1
 */

import { BaseResolver } from '../src/resolver/base-resolver.js';
import type { ResolvedContent } from '../src/interfaces/content-resolver.interface.js';

// ── Mock Resolvers ──────────────────────────────────────

class MockResolverA extends BaseResolver {
  protected async resolveByType(
    sourceAssetId: string,
    assetType: string,
  ): Promise<ResolvedContent | null> {
    if (assetType === 'cms') {
      return {
        title: 'CMS Content A',
        type: 'cms',
        contentJson: { body: 'content from resolver A' },
        sourceService: 'kpa',
      };
    }
    return null;
  }
}

class MockResolverB extends BaseResolver {
  protected async resolveByType(
    sourceAssetId: string,
    assetType: string,
  ): Promise<ResolvedContent | null> {
    if (assetType === 'signage') {
      return {
        title: 'Signage Content B',
        type: 'signage',
        contentJson: { slides: [1, 2, 3] },
        sourceService: 'neture',
      };
    }
    return null;
  }
}

describe('BaseResolver', () => {
  const mockDataSource = {} as any;

  // ── B3: Resolver 교체 가능성 ──────────────────────────

  describe('B3: Resolver replacement', () => {
    it('MockResolverA resolves cms type', async () => {
      const resolver = new MockResolverA(mockDataSource);
      const result = await resolver.resolve('asset-1', 'cms');
      expect(result).not.toBeNull();
      expect(result!.title).toBe('CMS Content A');
      expect(result!.sourceService).toBe('kpa');
    });

    it('MockResolverA returns null for signage type', async () => {
      const resolver = new MockResolverA(mockDataSource);
      const result = await resolver.resolve('asset-1', 'signage');
      expect(result).toBeNull();
    });

    it('MockResolverB resolves signage type', async () => {
      const resolver = new MockResolverB(mockDataSource);
      const result = await resolver.resolve('asset-2', 'signage');
      expect(result).not.toBeNull();
      expect(result!.title).toBe('Signage Content B');
      expect(result!.sourceService).toBe('neture');
    });

    it('MockResolverB returns null for cms type', async () => {
      const resolver = new MockResolverB(mockDataSource);
      const result = await resolver.resolve('asset-2', 'cms');
      expect(result).toBeNull();
    });
  });

  describe('resolve() delegates to resolveByType()', () => {
    it('passes sourceAssetId and assetType correctly', async () => {
      const resolver = new MockResolverA(mockDataSource);
      const spy = jest.spyOn(resolver as any, 'resolveByType');
      await resolver.resolve('test-id-123', 'cms');
      expect(spy).toHaveBeenCalledWith('test-id-123', 'cms');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('DataSource injection', () => {
    it('stores dataSource as protected property', () => {
      const ds = { name: 'test-ds' } as any;
      const resolver = new MockResolverA(ds);
      expect((resolver as any).dataSource).toBe(ds);
    });
  });
});
