/**
 * WO-O4O-LEGACY-RESIDUAL-RUNTIME-AND-DEFERRED-FINAL-CLOSURE-V1
 *   — legacy 잔여 runtime 재등록 방지 계약 테스트
 *
 * 이 WO 는 6개 잔여 축을 current main 기준으로 전수 census 하고
 * 작은 residue 만 제거했다. 아래 3건이 api-server 에서 제거된 항목이다.
 *
 * A. `POST /admin/offers/bulk-approve` (neture admin.controller)
 *    판정 DEAD_DUPLICATE — operator `POST /operator/products/batch-approve` 가
 *    canonical 이고 두 경로는 같은 service 를 호출했다. frontend 소비처 0.
 *    → route + `netureService.approveProducts` + `offerService.approveProducts` 제거.
 *
 * C. `types/auth.ts` 의 `PricingResult` interface
 *    판정 DEAD — repo 전체 importer 0(dist 산출물 제외). `CacheService` 의
 *    `getCachedPricingResult`/`cachePricingResult` 는 이 타입을 쓰지 않는다.
 *
 * 이 테스트는 **재등록 방지 계약**이다. DB·네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');

const read = (...seg: string[]) => fs.readFileSync(path.join(SRC, ...seg), 'utf8');

describe('WO-O4O-LEGACY-RESIDUAL-RUNTIME-AND-DEFERRED-FINAL-CLOSURE-V1', () => {
  describe('Axis A — neture admin bulk-approve 는 되살아나지 않는다', () => {
    it('admin.controller 에 bulk-approve route 가 없다', () => {
      const src = read('modules', 'neture', 'controllers', 'admin.controller.ts');
      expect(src).not.toContain('bulk-approve');
    });

    it.each([
      ['modules/neture/neture.service.ts', ['modules', 'neture', 'neture.service.ts']],
      ['modules/neture/services/offer.service.ts', ['modules', 'neture', 'services', 'offer.service.ts']],
    ])('%s 에 approveProducts 가 없다', (_label, seg) => {
      expect(read(...(seg as string[]))).not.toContain('approveProducts');
    });

    it('canonical operator batch-approve 는 그대로 살아 있다', () => {
      const src = read('modules', 'neture', 'controllers', 'operator-product-approval.controller.ts');
      expect(src).toContain("'/products/batch-approve'");
    });
  });

  describe('Axis C — dead PricingResult 타입은 되살아나지 않는다', () => {
    it('types/auth.ts 에 PricingResult 가 없다', () => {
      expect(read('types', 'auth.ts')).not.toContain('PricingResult');
    });
  });
});
