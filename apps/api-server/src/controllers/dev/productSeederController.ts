import { Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../../utils/logger';

/**
 * Development Controller for Seeding Test Data
 * 
 * 이 컨트롤러는 개발 환경에서만 사용되며,
 * 테스트용 상품 데이터를 WordPress CPT로 생성합니다.
 */
export class ProductSeederController {
  private wordpressApiUrl = process.env.WORDPRESS_API_URL || 'https://neture.co.kr/wp-json/wp/v2';
  private wordpressUser = process.env.WORDPRESS_USER || 'admin';
  private wordpressPassword = process.env.WORDPRESS_APPLICATION_PASSWORD || '';

  /**
   * 샘플 상품 데이터 생성기
   */
  private generateSampleProducts() {
    const categories = ['전자제품', '패션', '가전', '컴퓨터', '액세서리'];
    const suppliers = ['삼성전자', 'LG전자', '애플코리아', '나이키코리아', '아디다스'];
    const products = [
      // 전자제품
      { name: '갤럭시 S24 Ultra 256GB', category: '전자제품', basePrice: 1200000 },
      { name: '아이폰 15 Pro Max 512GB', category: '전자제품', basePrice: 1800000 },
      { name: '갤럭시 버즈3 프로', category: '전자제품', basePrice: 290000 },
      { name: '에어팟 프로 2세대', category: '전자제품', basePrice: 359000 },
      { name: '갤럭시 워치6 클래식', category: '전자제품', basePrice: 450000 },
      
      // 노트북/컴퓨터
      { name: 'LG 그램 17인치 2024', category: '컴퓨터', basePrice: 2100000 },
      { name: '맥북 프로 16인치 M3 Max', category: '컴퓨터', basePrice: 4500000 },
      { name: '삼성 갤럭시북4 프로', category: '컴퓨터', basePrice: 1900000 },
      { name: 'ASUS ROG 게이밍 노트북', category: '컴퓨터', basePrice: 2300000 },
      { name: 'Dell XPS 15', category: '컴퓨터', basePrice: 2800000 },
      
      // 가전제품
      { name: 'LG 디오스 양문형 냉장고', category: '가전', basePrice: 3200000 },
      { name: '삼성 비스포크 냉장고', category: '가전', basePrice: 2900000 },
      { name: 'LG 트롬 세탁기 21kg', category: '가전', basePrice: 1100000 },
      { name: '다이슨 에어랩 스타일러', category: '가전', basePrice: 690000 },
      { name: '발뮤다 토스터기', category: '가전', basePrice: 320000 },
      
      // 패션/의류
      { name: '나이키 에어맥스 2024', category: '패션', basePrice: 189000 },
      { name: '아디다스 울트라부스트', category: '패션', basePrice: 239000 },
      { name: '노스페이스 눕시 자켓', category: '패션', basePrice: 359000 },
      { name: '파타고니아 플리스 자켓', category: '패션', basePrice: 289000 },
      { name: '나이키 테크 플리스 후디', category: '패션', basePrice: 159000 },
      
      // TV/모니터
      { name: 'LG OLED TV 65인치', category: '가전', basePrice: 3500000 },
      { name: '삼성 Neo QLED 75인치', category: '가전', basePrice: 4200000 },
      { name: 'LG 울트라기어 게이밍모니터', category: '컴퓨터', basePrice: 890000 },
      { name: '삼성 오디세이 G9', category: '컴퓨터', basePrice: 1690000 },
      { name: 'Dell 4K 전문가용 모니터', category: '컴퓨터', basePrice: 1290000 },
      
      // 카메라/액세서리
      { name: '소니 A7R5 바디', category: '전자제품', basePrice: 4900000 },
      { name: '캐논 R5 Mark II', category: '전자제품', basePrice: 5200000 },
      { name: 'DJI 미니4 프로 드론', category: '전자제품', basePrice: 1390000 },
      { name: 'GoPro Hero12 Black', category: '전자제품', basePrice: 590000 },
      { name: '인스타360 X3', category: '전자제품', basePrice: 690000 },
      
      // 태블릿
      { name: '아이패드 프로 12.9 M2', category: '전자제품', basePrice: 1729000 },
      { name: '갤럭시 탭 S9 Ultra', category: '전자제품', basePrice: 1549000 },
      { name: '아이패드 에어 5세대', category: '전자제품', basePrice: 929000 },
      { name: '갤럭시 탭 S9 FE+', category: '전자제품', basePrice: 899000 },
      { name: '샤오미 패드6 프로', category: '전자제품', basePrice: 690000 },
      
      // 음향기기
      { name: '소니 WH-1000XM5', category: '전자제품', basePrice: 449000 },
      { name: 'Bose QuietComfort Ultra', category: '전자제품', basePrice: 529000 },
      { name: 'B&O Beoplay H95', category: '전자제품', basePrice: 1190000 },
      { name: 'Marshall Emberton II', category: '전자제품', basePrice: 219000 },
      { name: 'JBL PartyBox 310', category: '전자제품', basePrice: 690000 },
      
      // 생활가전
      { name: '다이슨 V15 무선청소기', category: '가전', basePrice: 990000 },
      { name: 'LG 코드제로 A9S', category: '가전', basePrice: 890000 },
      { name: '쿠쿠 전기압력밥솥 10인용', category: '가전', basePrice: 389000 },
      { name: '발뮤다 공기청정기', category: '가전', basePrice: 690000 },
      { name: '위닉스 제습기 24L', category: '가전', basePrice: 490000 },
      
      // 게임/콘솔
      { name: 'PlayStation 5 Pro', category: '전자제품', basePrice: 698000 },
      { name: 'Xbox Series X', category: '전자제품', basePrice: 598000 },
      { name: 'Nintendo Switch OLED', category: '전자제품', basePrice: 398000 },
      { name: 'Steam Deck OLED 1TB', category: '전자제품', basePrice: 890000 },
      { name: 'Meta Quest 3 512GB', category: '전자제품', basePrice: 790000 },
      
      // 스포츠/레저
      { name: '가민 Fenix 7X Pro', category: '전자제품', basePrice: 1290000 },
      { name: '애플워치 Ultra 2', category: '전자제품', basePrice: 1149000 },
      { name: '샤오미 전동킥보드 Pro 2', category: '전자제품', basePrice: 690000 }
    ];

    return products.map((product, index) => {
      const supplier = suppliers[index % suppliers.length];
      const costPrice = product.basePrice;
      const msrp = Math.floor(costPrice * 1.25); // MSRP는 공급가의 125%
      const partnerCommissionRate = 8 + (index % 7); // 8-14% 범위
      const marginRate = ((msrp - costPrice) / msrp * 100).toFixed(1);
      
      return {
        title: product.name,
        content: `${product.name}은(는) ${supplier}에서 공급하는 고품질 제품입니다. 
이 제품은 뛰어난 성능과 디자인으로 많은 고객들에게 사랑받고 있습니다.
주요 특징: 최신 기술 적용, 프리미엄 소재 사용, A/S 보증 포함`,
        status: 'publish',
        meta: {
          // 공급자 정보
          supplier: supplier,
          supplier_id: `supplier_${(index % suppliers.length) + 1}`,
          
          // 가격 정보 (법적 준수 - MSRP는 권장가격으로만)
          cost_price: costPrice.toString(),
          msrp: msrp.toString(),
          msrp_display: `권장소비자가격: ${msrp.toLocaleString('ko-KR')}원`,
          
          // 수수료 정보
          partner_commission_rate: partnerCommissionRate.toString(),
          platform_fee_rate: '3', // 플랫폼 수수료 3% 고정
          
          // 마진 정보
          margin_rate: marginRate,
          expected_profit: Math.floor((msrp - costPrice) * 0.1).toString(),
          
          // 재고 정보
          stock_quantity: (50 + Math.floor(Math.random() * 200)).toString(),
          stock_status: 'instock',
          
          // 배송 정보
          shipping_class: '일반배송',
          shipping_fee: costPrice > 50000 ? '0' : '3000',
          
          // 상품 속성
          sku: `SKU-${Date.now()}-${index}`,
          barcode: `880${Date.now()}${index}`,
          weight: (0.5 + Math.random() * 5).toFixed(1),
          
          // 법적 준수 플래그
          legal_compliance_check: 'true',
          price_autonomy_guaranteed: 'true',
          msrp_is_recommendation_only: 'true',
          
          // 카테고리
          product_category: product.category,
          
          // 상태
          approval_status: index < 5 ? 'pending' : 'approved',
          is_featured: index < 10 ? 'true' : 'false',
          
          // 추가 메타
          created_by: 'seeder',
          created_at: new Date().toISOString(),
          last_price_update: new Date().toISOString()
        },
        categories: [product.category],
        tags: [supplier, product.category, '드롭쉬핑']
      };
    });
  }

  /**
   * 단일 상품 생성
   * POST /api/v1/dev/seed-product
   */
  async seedSingleProduct(req: Request, res: Response) {
    try {
      // 개발 환경 체크
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          message: 'This endpoint is only available in development environment'
        });
      }

      const products = this.generateSampleProducts();
      const randomProduct = products[Math.floor(Math.random() * products.length)];

      // WordPress API로 상품 생성
      const response = await this.createWordPressProduct(randomProduct);

      res.json({
        success: true,
        message: '테스트 상품이 생성되었습니다',
        data: {
          id: response.id,
          title: randomProduct.title,
          meta: randomProduct.meta
        }
      });

    } catch (error) {
      console.error('Error seeding product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to seed product',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 다량의 상품 생성
   * POST /api/v1/dev/seed-products
   */
  async seedMultipleProducts(req: Request, res: Response) {
    try {
      // 개발 환경 체크
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          message: 'This endpoint is only available in development environment'
        });
      }

      const { count = 50 } = req.body;
      const products = this.generateSampleProducts();
      const results = [];
      const errors = [];

      // 요청된 수만큼 상품 생성
      for (let i = 0; i < Math.min(count, products.length); i++) {
        try {
          logger.info(`Creating product ${i + 1}/${count}: ${products[i].title}`);
          
          const response = await this.createWordPressProduct(products[i]);
          results.push({
            id: response.id,
            title: products[i].title,
            status: 'success'
          });

          // API 속도 제한을 위한 딜레이
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`Failed to create product: ${products[i].title}`, error);
          errors.push({
            title: products[i].title,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        message: `${results.length}개의 상품이 생성되었습니다`,
        data: {
          created: results,
          failed: errors,
          totalRequested: count,
          totalCreated: results.length,
          totalFailed: errors.length
        }
      });

    } catch (error) {
      console.error('Error seeding multiple products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to seed products',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * WordPress API를 통한 상품 생성
   */
  private async createWordPressProduct(productData: any) {
    const auth = Buffer.from(`${this.wordpressUser}:${this.wordpressPassword}`).toString('base64');
    
    const response = await axios.post(
      `${this.wordpressApiUrl}/ds_product`,
      {
        title: productData.title,
        content: productData.content,
        status: productData.status,
        acf: productData.meta // ACF 필드는 'acf' 키로 전송
      },
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }

  /**
   * 생성된 상품 목록 확인
   * GET /api/v1/dev/check-products
   */
  async checkProducts(req: Request, res: Response) {
    try {
      const auth = Buffer.from(`${this.wordpressUser}:${this.wordpressPassword}`).toString('base64');
      
      const response = await axios.get(
        `${this.wordpressApiUrl}/ds_product?per_page=100`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      const products = response.data.map((product: any) => ({
        id: product.id,
        title: product.title.rendered,
        status: product.status,
        created: product.date,
        meta: product.acf || product.meta
      }));

      res.json({
        success: true,
        message: `총 ${products.length}개의 상품이 확인되었습니다`,
        data: {
          total: products.length,
          products: products.slice(0, 10), // 처음 10개만 표시
          structure: products.length > 0 ? {
            hasACFFields: !!products[0].meta,
            sampleFields: products[0].meta ? Object.keys(products[0].meta) : []
          } : null
        }
      });

    } catch (error) {
      console.error('Error checking products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check products',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 모든 테스트 상품 삭제
   * DELETE /api/v1/dev/clear-products
   */
  async clearProducts(req: Request, res: Response) {
    try {
      // 개발 환경 체크
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          message: 'This endpoint is only available in development environment'
        });
      }

      const auth = Buffer.from(`${this.wordpressUser}:${this.wordpressPassword}`).toString('base64');
      
      // 모든 상품 가져오기
      const response = await axios.get(
        `${this.wordpressApiUrl}/ds_product?per_page=100`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      const products = response.data;
      const deleted = [];

      // 각 상품 삭제
      for (const product of products) {
        if (product.acf?.created_by === 'seeder') {
          try {
            await axios.delete(
              `${this.wordpressApiUrl}/ds_product/${product.id}`,
              {
                headers: {
                  'Authorization': `Basic ${auth}`
                }
              }
            );
            deleted.push(product.id);
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`Failed to delete product ${product.id}`);
          }
        }
      }

      res.json({
        success: true,
        message: `${deleted.length}개의 테스트 상품이 삭제되었습니다`,
        data: {
          deletedIds: deleted
        }
      });

    } catch (error) {
      console.error('Error clearing products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear products',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new ProductSeederController();