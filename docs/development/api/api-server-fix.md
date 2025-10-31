# API 서버 긴급 수정 지시서
## O4O Platform API Server - 즉시 구현 필요 사항

---

## 🚨 Phase 1: 긴급 수정 (24시간 내 완료)

### 1. MediaController 버그 수정

#### 파일: `apps/api-server/src/controllers/MediaController.ts`

**문제점**: `folderRepository`가 초기화되지 않아 500 에러 발생

**수정 코드**:
```typescript
export class MediaController {
  private mediaRepository: Repository<MediaFile>;
  private folderRepository: Repository<MediaFolder>; // 추가
  
  constructor() {
    this.mediaRepository = AppDataSource.getRepository(MediaFile);
    this.folderRepository = AppDataSource.getRepository(MediaFolder); // 추가
  }
  
  // getFolders 메서드 수정
  getFolders = async (req: Request, res: Response) => {
    try {
      if (!this.folderRepository) {
        throw new Error('Folder repository not initialized');
      }
      
      const { parentId } = req.query;
      const queryBuilder = this.folderRepository.createQueryBuilder('folder');
      
      if (parentId) {
        queryBuilder.where('folder.parentId = :parentId', { parentId });
      } else {
        queryBuilder.where('folder.parentId IS NULL');
      }
      
      const folders = await queryBuilder
        .orderBy('folder.name', 'ASC')
        .getMany();
        
      res.json({
        success: true,
        data: folders,
        total: folders.length
      });
    } catch (error: any) {
      console.error('Get folders error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FOLDER_FETCH_ERROR',
          message: 'Failed to fetch folders',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  };
}
```

---

### 2. E-commerce Settings API 구현

#### 2.1 새 파일 생성: `apps/api-server/src/controllers/ecommerce/EcommerceSettingsController.ts`

```typescript
import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection';

interface EcommerceSettings {
  id?: string;
  currency: string;
  taxRate: number;
  shippingFee: number;
  freeShippingThreshold: number;
  enableCoupons: boolean;
  enableReviews: boolean;
  enableWishlist: boolean;
  stockManagement: boolean;
  lowStockThreshold: number;
  orderPrefix: string;
  orderNumberFormat: string;
  enableGuestCheckout: boolean;
  requirePhoneNumber: boolean;
  requireAddress: boolean;
  paymentMethods: string[];
  shippingMethods: string[];
  emailNotifications: {
    newOrder: boolean;
    orderStatusChange: boolean;
    lowStock: boolean;
    newReview: boolean;
  };
}

export class EcommerceSettingsController {
  private settingsKey = 'ecommerce_settings';
  
  async getSettings(req: Request, res: Response) {
    try {
      // 임시 구현 - 추후 Settings 엔티티 사용
      const defaultSettings = this.getDefaultSettings();
      
      res.json({
        success: true,
        data: defaultSettings
      });
    } catch (error: any) {
      console.error('Get settings error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SETTINGS_FETCH_ERROR',
          message: 'Failed to fetch e-commerce settings',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }
  
  async updateSettings(req: Request, res: Response) {
    try {
      const updatedSettings = {
        ...this.getDefaultSettings(),
        ...req.body,
        updatedAt: new Date()
      };
      
      // TODO: 실제 데이터베이스 저장 로직 구현
      
      res.json({
        success: true,
        data: updatedSettings,
        message: 'Settings updated successfully'
      });
    } catch (error: any) {
      console.error('Update settings error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SETTINGS_UPDATE_ERROR',
          message: 'Failed to update e-commerce settings',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }
  
  private getDefaultSettings(): EcommerceSettings {
    return {
      currency: 'KRW',
      taxRate: 0.1,
      shippingFee: 3000,
      freeShippingThreshold: 50000,
      enableCoupons: true,
      enableReviews: true,
      enableWishlist: true,
      stockManagement: true,
      lowStockThreshold: 10,
      orderPrefix: 'ORD',
      orderNumberFormat: 'ORD-{YYYY}{MM}{DD}-{####}',
      enableGuestCheckout: false,
      requirePhoneNumber: true,
      requireAddress: true,
      paymentMethods: ['card', 'bank_transfer', 'virtual_account'],
      shippingMethods: ['standard', 'express'],
      emailNotifications: {
        newOrder: true,
        orderStatusChange: true,
        lowStock: true,
        newReview: false
      }
    };
  }
}
```

#### 2.2 새 파일 생성: `apps/api-server/src/routes/ecommerce/settingsRoutes.ts`

```typescript
import { Router } from 'express';
import { EcommerceSettingsController } from '../../controllers/ecommerce/EcommerceSettingsController';
import { authenticate as authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const settingsController = new EcommerceSettingsController();

// 인증 미들웨어 적용 (관리자만 접근 가능)
router.use(authMiddleware);

// Settings 엔드포인트
router.get('/settings', settingsController.getSettings.bind(settingsController));
router.put('/settings', settingsController.updateSettings.bind(settingsController));

export default router;
```

#### 2.3 라우트 등록: `apps/api-server/src/main.ts` 수정

```typescript
// 기존 import 문에 추가
import ecommerceSettingsRoutes from './routes/ecommerce/settingsRoutes';

// 라우트 등록 부분에 추가 (다른 ecommerce 라우트들과 함께)
app.use('/ecommerce', ecommerceSettingsRoutes);
```

---

### 3. API 경로 매핑 수정

#### 파일: `apps/api-server/src/main.ts`

**문제점**: 프론트엔드가 `/api/v1/media/folders`를 호출하지만 실제 경로는 `/admin/media/folders`

**수정 방법 1 - 경로 별칭 추가**:
```typescript
// Media 라우트에 v1 경로 추가
app.use('/api/v1/media', contentRoutes); // 기존 /admin/media 경로도 유지
app.use('/admin', contentRoutes); // 기존 경로 유지
```

**수정 방법 2 - 리다이렉트 미들웨어**:
```typescript
// API v1 호환성 미들웨어
app.use('/api/v1/media/*', (req, res, next) => {
  req.url = req.url.replace('/api/v1/media', '/admin/media');
  next();
});
```

---

## 🔧 Phase 2: 핵심 기능 구현 (3일 내 완료)

### 1. E-commerce 핵심 API 구현 목록

#### 1.1 쿠폰 시스템
```typescript
// apps/api-server/src/controllers/ecommerce/CouponController.ts
- GET /ecommerce/coupons - 쿠폰 목록 조회
- GET /ecommerce/coupons/:id - 쿠폰 상세 조회
- POST /ecommerce/coupons - 쿠폰 생성
- PUT /ecommerce/coupons/:id - 쿠폰 수정
- DELETE /ecommerce/coupons/:id - 쿠폰 삭제
- POST /ecommerce/coupons/validate - 쿠폰 유효성 검증
- POST /ecommerce/coupons/:id/apply - 쿠폰 적용
```

#### 1.2 재고 관리
```typescript
// apps/api-server/src/controllers/inventory/InventoryController.ts
- GET /ecommerce/inventory - 재고 목록 조회
- GET /ecommerce/inventory/:productId - 특정 상품 재고 조회
- PUT /ecommerce/inventory/:productId - 재고 수정
- POST /ecommerce/inventory/adjust - 재고 조정
- GET /ecommerce/inventory/movements - 재고 이동 내역
- GET /ecommerce/inventory/low-stock - 재고 부족 상품 조회
```

#### 1.3 환불 처리
```typescript
// apps/api-server/src/controllers/ecommerce/RefundController.ts
- POST /ecommerce/orders/:id/refund - 환불 요청
- GET /ecommerce/refunds - 환불 목록 조회
- GET /ecommerce/refunds/:id - 환불 상세 조회
- PUT /ecommerce/refunds/:id/approve - 환불 승인
- PUT /ecommerce/refunds/:id/reject - 환불 거절
```

### 2. 대량 작업 API 구현

#### 2.1 상품 대량 작업
```typescript
// ProductController에 추가
- POST /ecommerce/products/bulk - 대량 생성/수정
- DELETE /ecommerce/products/bulk - 대량 삭제
- POST /ecommerce/products/bulk/update-prices - 가격 일괄 수정
- POST /ecommerce/products/bulk/update-stock - 재고 일괄 수정
```

#### 2.2 주문 대량 작업
```typescript
// OrderController에 추가
- PUT /ecommerce/orders/bulk/status - 상태 일괄 변경
- POST /ecommerce/orders/bulk/export - 대량 내보내기
```

---

## 📝 구현 체크리스트

### 즉시 구현 (Phase 1)
- [ ] MediaController folderRepository 초기화
- [ ] EcommerceSettingsController 생성
- [ ] E-commerce settings 라우트 등록
- [ ] API 경로 매핑 수정 (v1 호환성)
- [ ] 에러 응답 표준화

### 3일 내 구현 (Phase 2)
- [ ] 쿠폰 시스템 Controller 및 Service
- [ ] 재고 관리 Controller 및 Service
- [ ] 환불 처리 Controller 및 Service
- [ ] 대량 작업 엔드포인트
- [ ] 고객 관리 API

### 1주일 내 구현 (Phase 3)
- [ ] 페이지 관리 시스템
- [ ] 템플릿 관리 시스템
- [ ] 메뉴 관리 시스템
- [ ] 커스텀 필드 그룹 관리
- [ ] 설정 내보내기/가져오기

---

## 🔒 보안 고려사항

### 1. 인증 및 권한
```typescript
// 모든 관리자 API에 적용
router.use(authMiddleware);
router.use(checkRole(['admin', 'super_admin']));
```

### 2. 입력 검증
```typescript
// Joi 또는 class-validator 사용
import { body, validationResult } from 'express-validator';

router.post('/settings', 
  [
    body('currency').isString().isLength({ min: 3, max: 3 }),
    body('taxRate').isFloat({ min: 0, max: 1 }),
    body('shippingFee').isInt({ min: 0 })
  ],
  settingsController.updateSettings
);
```

### 3. Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100 // 최대 100개 요청
});

app.use('/api/', apiLimiter);
```

---

## 🧪 테스트 시나리오

### Phase 1 테스트
1. **MediaController 테스트**
   - GET /api/v1/media/folders 호출
   - 200 응답 및 폴더 목록 확인
   - 에러 처리 확인

2. **Settings API 테스트**
   - GET /ecommerce/settings 호출
   - 기본 설정 값 확인
   - PUT /ecommerce/settings로 업데이트
   - 변경사항 확인

### Phase 2 테스트
1. **쿠폰 시스템**
   - 쿠폰 CRUD 작업
   - 쿠폰 적용 및 검증

2. **재고 관리**
   - 재고 조회 및 수정
   - 재고 부족 알림

3. **환불 처리**
   - 환불 요청 및 승인
   - 환불 상태 추적

---

## 🚀 배포 전 체크리스트

1. [ ] TypeScript 컴파일 에러 0개
2. [ ] ESLint 경고 0개
3. [ ] 모든 API 엔드포인트 Postman 테스트 통과
4. [ ] 에러 로깅 구현
5. [ ] API 문서 업데이트
6. [ ] 데이터베이스 마이그레이션 준비
7. [ ] 환경 변수 설정 확인
8. [ ] 보안 미들웨어 적용
9. [ ] Rate limiting 설정
10. [ ] Health check 엔드포인트 정상 작동

---

## 📞 지원 및 문의

문제 발생 시:
1. 에러 로그 확인: `pm2 logs o4o-api`
2. 데이터베이스 연결 상태 확인
3. 환경 변수 설정 확인
4. GitHub Issues에 문제 보고

---

*작성일: 2025년 9월 1일*  
*작성자: Claude Code Assistant*  
*대상: O4O Platform API Server Development Team*