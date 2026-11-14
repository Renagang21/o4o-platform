/**
 * GET /neture/products/:masterId/images 의 조회 — 삭제 이미지 제외 · 내부 필드 비노출
 * (로그인 사용자 누구나 부르는 공용 카탈로그 조회)
 */
import { IsNull } from 'typeorm';
import type { DataSource } from 'typeorm';
import { NetureCatalogService } from '../catalog.service.js';

describe('NetureCatalogService.getProductImages', () => {
  it('deleted_at 이 있는 이미지는 빼고, 공개 컬럼만 고른다', async () => {
    const find = jest.fn(async () => []);
    const ds = { getRepository: jest.fn(() => ({ find })) } as unknown as DataSource;
    await new NetureCatalogService(ds).getProductImages('master-1');
    const args = (find.mock.calls[0] as unknown[])[0] as any;
    expect(args.where).toEqual({ masterId: 'master-1', deletedAt: IsNull() });
    expect(Object.keys(args.select).sort()).toEqual(
      ['createdAt', 'id', 'imageUrl', 'isPrimary', 'masterId', 'sortOrder', 'type'],
    );
    for (const hidden of ['gcsPath', 'createdBy', 'updatedBy', 'deletedAt', 'deletedBy', 'source']) {
      expect(args.select[hidden]).toBeUndefined();
    }
  });
});
