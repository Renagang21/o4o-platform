import { Request, Response } from 'express';
import { AuthRequest } from '../types/auth';
export declare class ProductVariationController {
    private productRepository;
    private attributeRepository;
    private attributeValueRepository;
    private variationRepository;
    /**
     * 상품 속성 추가
     */
    addProductAttribute: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * 상품 변형 생성
     */
    createProductVariation: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * 변형 자동 생성 (모든 속성 조합)
     */
    generateVariations: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * 속성 조합 생성 헬퍼
     */
    private generateAttributeCombinations;
    /**
     * 상품 변형 목록 조회
     */
    getProductVariations: (req: Request, res: Response) => Promise<void>;
    /**
     * 변형 재고 업데이트
     */
    updateVariationStock: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * 변형 가격 일괄 업데이트
     */
    bulkUpdateVariationPrices: (req: AuthRequest, res: Response) => Promise<void>;
}
//# sourceMappingURL=productVariationController.d.ts.map