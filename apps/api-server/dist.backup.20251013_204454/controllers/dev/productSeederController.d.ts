import { Request, Response } from 'express';
/**
 * Development Controller for Seeding Test Data
 *
 * 이 컨트롤러는 개발 환경에서만 사용되며,
 * 테스트용 상품 데이터를 WordPress CPT로 생성합니다.
 */
export declare class ProductSeederController {
    private wordpressApiUrl;
    private wordpressUser;
    private wordpressPassword;
    /**
     * 샘플 상품 데이터 생성기
     */
    private generateSampleProducts;
    /**
     * 단일 상품 생성
     * POST /api/v1/dev/seed-product
     */
    seedSingleProduct(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * 다량의 상품 생성
     * POST /api/v1/dev/seed-products
     */
    seedMultipleProducts(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * WordPress API를 통한 상품 생성
     */
    private createWordPressProduct;
    /**
     * 생성된 상품 목록 확인
     * GET /api/v1/dev/check-products
     */
    checkProducts(req: Request, res: Response): Promise<void>;
    /**
     * 모든 테스트 상품 삭제
     * DELETE /api/v1/dev/clear-products
     */
    clearProducts(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
declare const _default: ProductSeederController;
export default _default;
//# sourceMappingURL=productSeederController.d.ts.map