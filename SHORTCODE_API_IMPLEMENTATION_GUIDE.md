# 📚 Shortcode 관리 시스템 - API 서버 구현 가이드

## 개요
이 문서는 O4O Platform의 Shortcode 관리 시스템을 위한 백엔드 API 구현 가이드입니다.
프론트엔드는 이미 구현되어 있으며, 이 문서를 참고하여 API 서버를 구현해주세요.

---

## 🗂️ Phase 1: 데이터베이스 설정

### 1.1 Entity 파일 생성
**위치**: `/apps/api-server/src/entities/Shortcode.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export enum ShortcodeCategory {
  CONTENT = 'content',
  MEDIA = 'media',
  SOCIAL = 'social',
  ECOMMERCE = 'ecommerce',
  FORM = 'form',
  LAYOUT = 'layout',
  WIDGET = 'widget',
  UTILITY = 'utility'
}

export enum ShortcodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated'
}

export interface ShortcodeAttribute {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'url';
  required: boolean;
  default?: any;
  description: string;
  options?: string[]; // for select type
}

export interface ShortcodeExample {
  title: string;
  code: string;
  description?: string;
  preview?: string;
}

@Entity('shortcodes')
@Index(['appId', 'status'])
@Index(['category', 'status'])
@Index(['name'])
export class Shortcode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  appId: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ShortcodeCategory,
    default: ShortcodeCategory.UTILITY
  })
  category: ShortcodeCategory;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string;

  @Column({ type: 'json', nullable: true })
  attributes: ShortcodeAttribute[];

  @Column({ type: 'json', nullable: true })
  examples: ShortcodeExample[];

  @Column({ type: 'text', nullable: true })
  defaultContent: string;

  @Column({ type: 'boolean', default: false })
  selfClosing: boolean;

  @Column({
    type: 'enum',
    enum: ShortcodeStatus,
    default: ShortcodeStatus.ACTIVE
  })
  status: ShortcodeStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  version: string;

  @Column({ type: 'text', nullable: true })
  documentation: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  renderFunction: string;

  @Column({ type: 'json', nullable: true })
  permissions: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 1.2 데이터베이스 연결 업데이트
**파일**: `/apps/api-server/src/database/connection.ts`

Entity import 추가:
```typescript
import { Shortcode } from '../entities/Shortcode';
```

entities 배열에 추가:
```typescript
entities: [
  // ... 기존 entities
  Shortcode
]
```

### 1.3 마이그레이션 생성 및 실행
```bash
cd apps/api-server
npx typeorm-ts-node-commonjs migration:generate src/migrations/CreateShortcodeTable -d src/database/data-source.ts
npm run migration:run
```

---

## 🔌 Phase 2: API 엔드포인트 구현

### 2.1 Shortcode Routes 생성
**위치**: `/apps/api-server/src/routes/v1/shortcodes.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { checkPermission } from '../../middleware/permissions';
import AppDataSource from '../../database/data-source';
import { Shortcode, ShortcodeStatus, ShortcodeCategory } from '../../entities/Shortcode';
import { Like, In } from 'typeorm';

const router: Router = Router();
const shortcodeRepository = AppDataSource.getRepository(Shortcode);

/**
 * @route   GET /api/v1/shortcodes
 * @desc    Get all shortcodes with filters
 * @access  Private
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      category, 
      appId, 
      status, 
      search,
      page = 1,
      limit = 50
    } = req.query;

    const where: any = {};
    
    if (category && category !== 'all') {
      where.category = category;
    }
    
    if (appId && appId !== 'all') {
      where.appId = appId;
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (search) {
      where.name = Like(`%${search}%`);
    }

    const [shortcodes, total] = await shortcodeRepository.findAndCount({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      order: {
        appId: 'ASC',
        name: 'ASC'
      }
    });

    res.json({
      success: true,
      data: shortcodes,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Error fetching shortcodes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shortcodes'
    });
  }
});

/**
 * @route   GET /api/v1/shortcodes/:id
 * @desc    Get shortcode by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const shortcode = await shortcodeRepository.findOne({
      where: { id }
    });
    
    if (!shortcode) {
      return res.status(404).json({
        success: false,
        error: 'Shortcode not found'
      });
    }

    // Increment usage count
    await shortcodeRepository.increment({ id }, 'usageCount', 1);
    
    res.json({
      success: true,
      data: shortcode
    });
  } catch (error) {
    console.error('Error fetching shortcode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shortcode'
    });
  }
});

/**
 * @route   POST /api/v1/shortcodes
 * @desc    Create new shortcode
 * @access  Private (Admin only)
 */
router.post('/', 
  authenticateToken,
  checkPermission('apps:manage'),
  async (req: Request, res: Response) => {
    try {
      const shortcodeData = req.body;
      
      // Check if shortcode name already exists
      const existing = await shortcodeRepository.findOne({
        where: { name: shortcodeData.name }
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Shortcode name already exists'
        });
      }
      
      const shortcode = shortcodeRepository.create(shortcodeData);
      await shortcodeRepository.save(shortcode);
      
      res.status(201).json({
        success: true,
        data: shortcode,
        message: 'Shortcode created successfully'
      });
    } catch (error) {
      console.error('Error creating shortcode:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create shortcode'
      });
    }
  }
);

/**
 * @route   PUT /api/v1/shortcodes/:id
 * @desc    Update shortcode
 * @access  Private (Admin only)
 */
router.put('/:id',
  authenticateToken,
  checkPermission('apps:manage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const shortcode = await shortcodeRepository.findOne({
        where: { id }
      });
      
      if (!shortcode) {
        return res.status(404).json({
          success: false,
          error: 'Shortcode not found'
        });
      }
      
      // Check if updating name to an existing one
      if (updateData.name && updateData.name !== shortcode.name) {
        const existing = await shortcodeRepository.findOne({
          where: { name: updateData.name }
        });
        
        if (existing) {
          return res.status(400).json({
            success: false,
            error: 'Shortcode name already exists'
          });
        }
      }
      
      await shortcodeRepository.update(id, updateData);
      
      const updated = await shortcodeRepository.findOne({
        where: { id }
      });
      
      res.json({
        success: true,
        data: updated,
        message: 'Shortcode updated successfully'
      });
    } catch (error) {
      console.error('Error updating shortcode:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update shortcode'
      });
    }
  }
);

/**
 * @route   DELETE /api/v1/shortcodes/:id
 * @desc    Delete shortcode
 * @access  Private (Admin only)
 */
router.delete('/:id',
  authenticateToken,
  checkPermission('apps:manage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const shortcode = await shortcodeRepository.findOne({
        where: { id }
      });
      
      if (!shortcode) {
        return res.status(404).json({
          success: false,
          error: 'Shortcode not found'
        });
      }
      
      await shortcodeRepository.delete(id);
      
      res.json({
        success: true,
        message: 'Shortcode deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting shortcode:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete shortcode'
      });
    }
  }
);

/**
 * @route   POST /api/v1/shortcodes/bulk-register
 * @desc    Bulk register shortcodes from app
 * @access  Private (System/Admin only)
 */
router.post('/bulk-register',
  authenticateToken,
  checkPermission('apps:manage'),
  async (req: Request, res: Response) => {
    try {
      const { appId, shortcodes } = req.body;
      
      if (!appId || !shortcodes || !Array.isArray(shortcodes)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data'
        });
      }
      
      const results = [];
      const errors = [];
      
      for (const sc of shortcodes) {
        try {
          // Check if exists
          const existing = await shortcodeRepository.findOne({
            where: { name: sc.name }
          });
          
          if (existing) {
            // Update existing
            await shortcodeRepository.update(existing.id, {
              ...sc,
              appId
            });
            results.push({ name: sc.name, action: 'updated' });
          } else {
            // Create new
            const shortcode = shortcodeRepository.create({
              ...sc,
              appId
            });
            await shortcodeRepository.save(shortcode);
            results.push({ name: sc.name, action: 'created' });
          }
        } catch (error) {
          errors.push({ name: sc.name, error: error.message });
        }
      }
      
      res.json({
        success: true,
        results,
        errors,
        message: `Processed ${results.length} shortcodes with ${errors.length} errors`
      });
    } catch (error) {
      console.error('Error bulk registering shortcodes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk register shortcodes'
      });
    }
  }
);

export default router;
```

### 2.2 메인 라우터에 추가
**파일**: `/apps/api-server/src/main.ts`

Import 추가:
```typescript
import shortcodesV1Routes from './routes/v1/shortcodes.routes';
```

라우트 등록:
```typescript
app.use('/api/v1/shortcodes', shortcodesV1Routes);
```

---

## 📦 Phase 3: 앱별 Shortcode 등록

### 3.1 Shortcode 등록 서비스
**위치**: `/apps/api-server/src/services/shortcodeRegistry.ts`

```typescript
import AppDataSource from '../database/data-source';
import { Shortcode } from '../entities/Shortcode';

export interface ShortcodeDefinition {
  name: string;
  displayName: string;
  description: string;
  category: string;
  attributes?: any[];
  examples?: any[];
  selfClosing?: boolean;
  version?: string;
  documentation?: string;
  tags?: string[];
}

class ShortcodeRegistry {
  private shortcodes: Map<string, ShortcodeDefinition[]> = new Map();
  
  /**
   * 앱에서 shortcode 등록
   */
  register(appId: string, shortcodes: ShortcodeDefinition[]) {
    this.shortcodes.set(appId, shortcodes);
  }
  
  /**
   * 모든 등록된 shortcode를 DB에 동기화
   */
  async syncToDatabase() {
    const repository = AppDataSource.getRepository(Shortcode);
    
    for (const [appId, definitions] of this.shortcodes.entries()) {
      for (const def of definitions) {
        try {
          const existing = await repository.findOne({
            where: { name: def.name }
          });
          
          if (existing) {
            await repository.update(existing.id, {
              ...def,
              appId,
              updatedAt: new Date()
            });
          } else {
            const shortcode = repository.create({
              ...def,
              appId,
              status: 'active'
            });
            await repository.save(shortcode);
          }
        } catch (error) {
          console.error(`Failed to sync shortcode ${def.name}:`, error);
        }
      }
    }
  }
  
  /**
   * 앱별 shortcode 가져오기
   */
  getByApp(appId: string): ShortcodeDefinition[] {
    return this.shortcodes.get(appId) || [];
  }
  
  /**
   * 모든 shortcode 가져오기
   */
  getAll(): Record<string, ShortcodeDefinition[]> {
    return Object.fromEntries(this.shortcodes);
  }
}

export const shortcodeRegistry = new ShortcodeRegistry();
```

### 3.2 각 앱의 Shortcode 정의 예시
**위치**: `/apps/api-server/src/apps/ecommerce/shortcodes.ts`

```typescript
import { shortcodeRegistry } from '../../services/shortcodeRegistry';

// E-commerce 앱의 shortcodes 정의
const ecommerceShortcodes = [
  {
    name: 'product',
    displayName: '상품 표시',
    description: '특정 상품을 표시합니다',
    category: 'ecommerce',
    attributes: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: '상품 ID'
      },
      {
        name: 'show_price',
        type: 'boolean',
        required: false,
        default: true,
        description: '가격 표시 여부'
      },
      {
        name: 'show_image',
        type: 'boolean',
        required: false,
        default: true,
        description: '이미지 표시 여부'
      }
    ],
    examples: [
      {
        title: '기본 사용',
        code: '[product id="12345"]',
        description: '상품 ID 12345를 표시합니다'
      },
      {
        title: '가격 숨기기',
        code: '[product id="12345" show_price="false"]',
        description: '가격을 숨기고 상품을 표시합니다'
      }
    ],
    selfClosing: true,
    version: '1.0.0',
    tags: ['product', 'shop', 'ecommerce']
  },
  {
    name: 'product_list',
    displayName: '상품 목록',
    description: '상품 목록을 그리드로 표시합니다',
    category: 'ecommerce',
    attributes: [
      {
        name: 'category',
        type: 'string',
        required: false,
        description: '카테고리 ID 또는 slug'
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        default: 12,
        description: '표시할 상품 수'
      },
      {
        name: 'columns',
        type: 'select',
        required: false,
        default: '4',
        options: ['2', '3', '4', '6'],
        description: '열 개수'
      },
      {
        name: 'orderby',
        type: 'select',
        required: false,
        default: 'date',
        options: ['date', 'price', 'title', 'popularity'],
        description: '정렬 기준'
      }
    ],
    examples: [
      {
        title: '최신 상품 12개',
        code: '[product_list limit="12" orderby="date"]',
        description: '최신 상품 12개를 날짜순으로 표시'
      },
      {
        title: '카테고리별 상품',
        code: '[product_list category="electronics" columns="3"]',
        description: '전자제품 카테고리의 상품을 3열로 표시'
      }
    ],
    selfClosing: true,
    version: '1.0.0',
    tags: ['products', 'grid', 'shop']
  },
  {
    name: 'add_to_cart',
    displayName: '장바구니 담기 버튼',
    description: '장바구니 담기 버튼을 표시합니다',
    category: 'ecommerce',
    attributes: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: '상품 ID'
      },
      {
        name: 'text',
        type: 'string',
        required: false,
        default: '장바구니 담기',
        description: '버튼 텍스트'
      },
      {
        name: 'class',
        type: 'string',
        required: false,
        description: '추가 CSS 클래스'
      }
    ],
    selfClosing: true,
    version: '1.0.0',
    tags: ['cart', 'button', 'shop']
  },
  {
    name: 'cart',
    displayName: '장바구니',
    description: '장바구니 내용을 표시합니다',
    category: 'ecommerce',
    selfClosing: true,
    version: '1.0.0',
    tags: ['cart', 'checkout']
  },
  {
    name: 'checkout',
    displayName: '결제 페이지',
    description: '결제 폼을 표시합니다',
    category: 'ecommerce',
    selfClosing: true,
    version: '1.0.0',
    tags: ['checkout', 'payment']
  }
];

// 앱 초기화 시 shortcode 등록
export function registerEcommerceShortcodes() {
  shortcodeRegistry.register('ecommerce', ecommerceShortcodes);
}
```

### 3.3 Affiliate Marketing 앱 Shortcodes
**위치**: `/apps/api-server/src/apps/affiliate/shortcodes.ts`

```typescript
const affiliateShortcodes = [
  {
    name: 'affiliate_link',
    displayName: '제휴 링크',
    description: '제휴 추적 링크를 생성합니다',
    category: 'social',
    attributes: [
      {
        name: 'url',
        type: 'url',
        required: true,
        description: '대상 URL'
      },
      {
        name: 'text',
        type: 'string',
        required: false,
        description: '링크 텍스트'
      },
      {
        name: 'campaign',
        type: 'string',
        required: false,
        description: '캠페인 ID'
      }
    ],
    selfClosing: false,
    version: '1.0.0',
    tags: ['affiliate', 'link', 'tracking']
  },
  {
    name: 'affiliate_banner',
    displayName: '제휴 배너',
    description: '제휴 배너를 표시합니다',
    category: 'social',
    attributes: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: '배너 ID'
      },
      {
        name: 'size',
        type: 'select',
        required: false,
        default: 'medium',
        options: ['small', 'medium', 'large', 'custom'],
        description: '배너 크기'
      }
    ],
    selfClosing: true,
    version: '1.0.0',
    tags: ['affiliate', 'banner', 'ad']
  },
  {
    name: 'referral_stats',
    displayName: '추천 통계',
    description: '추천 실적 통계를 표시합니다',
    category: 'widget',
    selfClosing: true,
    version: '1.0.0',
    tags: ['stats', 'referral', 'dashboard']
  }
];
```

### 3.4 Digital Signage 앱 Shortcodes
```typescript
const signageShortcodes = [
  {
    name: 'signage_display',
    displayName: '디지털 사이니지 디스플레이',
    description: '사이니지 콘텐츠를 표시합니다',
    category: 'media',
    attributes: [
      {
        name: 'screen_id',
        type: 'string',
        required: true,
        description: '스크린 ID'
      },
      {
        name: 'playlist',
        type: 'string',
        required: false,
        description: '재생목록 ID'
      }
    ],
    selfClosing: true,
    version: '1.0.0',
    tags: ['signage', 'display', 'screen']
  },
  {
    name: 'signage_schedule',
    displayName: '사이니지 스케줄',
    description: '스케줄된 콘텐츠를 표시합니다',
    category: 'media',
    attributes: [
      {
        name: 'location',
        type: 'string',
        required: true,
        description: '위치 ID'
      }
    ],
    selfClosing: true,
    version: '1.0.0',
    tags: ['signage', 'schedule']
  }
];
```

---

## 🚀 Phase 4: 앱 초기화 시 Shortcode 등록

### 4.1 앱 초기화 코드 수정
**파일**: `/apps/api-server/src/main.ts`

```typescript
import { shortcodeRegistry } from './services/shortcodeRegistry';
import { registerEcommerceShortcodes } from './apps/ecommerce/shortcodes';
import { registerAffiliateShortcodes } from './apps/affiliate/shortcodes';
import { registerSignageShortcodes } from './apps/signage/shortcodes';
// ... 다른 앱 shortcode imports

// 서버 시작 함수 내에 추가
const startServer = async () => {
  try {
    // ... 기존 코드
    
    // Shortcode 등록
    console.log('Registering shortcodes...');
    registerEcommerceShortcodes();
    registerAffiliateShortcodes();
    registerSignageShortcodes();
    // ... 다른 앱 shortcode 등록
    
    // DB에 동기화
    await shortcodeRegistry.syncToDatabase();
    console.log('Shortcodes synchronized to database');
    
    // ... 나머지 서버 시작 코드
  } catch (error) {
    console.error('Server startup error:', error);
  }
};
```

---

## 📊 Phase 5: 통계 및 모니터링

### 5.1 사용 통계 API
```typescript
/**
 * @route   GET /api/v1/shortcodes/stats
 * @desc    Get shortcode usage statistics
 * @access  Private (Admin only)
 */
router.get('/stats', 
  authenticateToken,
  checkPermission('apps:manage'),
  async (req: Request, res: Response) => {
    try {
      const stats = await shortcodeRepository
        .createQueryBuilder('shortcode')
        .select('shortcode.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(shortcode.usageCount)', 'totalUsage')
        .groupBy('shortcode.category')
        .getRawMany();
      
      const topUsed = await shortcodeRepository.find({
        order: { usageCount: 'DESC' },
        take: 10
      });
      
      res.json({
        success: true,
        data: {
          byCategory: stats,
          topUsed,
          total: await shortcodeRepository.count()
        }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics'
      });
    }
  }
);
```

---

## 🧪 테스트

### API 엔드포인트 테스트

1. **Shortcode 목록 조회**
```bash
GET /api/v1/shortcodes?category=ecommerce&status=active
```

2. **Shortcode 상세 조회**
```bash
GET /api/v1/shortcodes/{id}
```

3. **Shortcode 생성** (Admin only)
```bash
POST /api/v1/shortcodes
{
  "appId": "custom",
  "name": "custom_shortcode",
  "displayName": "Custom Shortcode",
  "description": "A custom shortcode",
  "category": "utility",
  "selfClosing": true
}
```

4. **대량 등록** (System/Admin only)
```bash
POST /api/v1/shortcodes/bulk-register
{
  "appId": "myapp",
  "shortcodes": [...]
}
```

---

## 🔒 보안 고려사항

1. **권한 체크**
   - 조회: 인증된 사용자
   - 생성/수정/삭제: Admin 권한 필요
   - 대량 등록: System 또는 Admin 권한

2. **입력 검증**
   - Shortcode 이름 중복 체크
   - 카테고리 enum 검증
   - JSON 필드 구조 검증

3. **Rate Limiting**
   - 통계 API에 rate limiting 적용
   - 대량 등록 API 제한

---

## 📈 향후 개선사항

1. **실시간 프리뷰**
   - Shortcode 렌더링 엔진 구현
   - 샌드박스 환경에서 안전한 실행

2. **버전 관리**
   - Shortcode 버전 히스토리
   - 이전 버전과의 호환성 관리

3. **사용자 정의 Shortcode**
   - 사용자가 직접 shortcode 생성
   - 템플릿 기반 shortcode 빌더

4. **분석 및 최적화**
   - 사용 패턴 분석
   - 성능 최적화 제안
   - 사용되지 않는 shortcode 정리

---

## 완료 체크리스트

- [ ] Entity 파일 생성
- [ ] 데이터베이스 마이그레이션 실행
- [ ] API 라우트 구현
- [ ] 메인 라우터에 추가
- [ ] Shortcode 등록 서비스 구현
- [ ] 각 앱의 shortcode 정의
- [ ] 앱 초기화 시 등록 코드 추가
- [ ] API 테스트
- [ ] 권한 및 보안 설정 확인
- [ ] PM2 재시작으로 변경사항 적용

---

이 가이드를 따라 구현하시면 프론트엔드와 완벽하게 연동되는 Shortcode 관리 시스템이 완성됩니다.