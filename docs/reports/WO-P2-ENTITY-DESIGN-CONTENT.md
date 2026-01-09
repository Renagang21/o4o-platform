# WO-P2-ENTITY-DESIGN-CONTENT 설계 문서

> **Work Order ID**: WO-P2-ENTITY-DESIGN-CONTENT
> **작성일**: 2026-01-09
> **상태**: Design Phase (설계 전용 - 구현 없음)
> **선행 작업**: WO-KPA-SOCIETY-DASHBOARD-P1-A (완료)

---

## 1. 설계 목표

**"가장 많은 Empty state를 가장 적은 Entity로 해소"**

### 1.1 현재 Empty State 분석

| 서비스 | 위치 | Empty 항목 | 영향 |
|--------|------|------------|------|
| glycopharm | OperatorDashboard | hero, featured, eventNotice | 콘텐츠 상태 표시 불가 |
| kpa-society | Intranet | heroSlides, notices, newsArticles | 인트라넷 홈 빈 화면 |
| kpa-society | AdminDashboard | recentPosts | 게시물 통계 불가 |
| glucoseview | HomePage | hero section | 홈페이지 배너 없음 |
| neture | HomePage | hero section | 홈페이지 배너 없음 |
| k-cosmetics | HomePage | hero section | 홈페이지 배너 없음 |
| signage | 채널 | 콘텐츠 편성 | 편성표 불가 |

**총 59개 파일**에서 Hero/Notice/News 등 콘텐츠를 참조 중 (대부분 하드코딩 또는 샘플 데이터)

### 1.2 기존 cms-core 분석

현재 cms-core 패키지에는 다음이 존재:
- **CmsCptType**: Custom Post Type 스키마 정의
- **CmsView**: 뷰 설정 (layout, query)
- **CmsTemplate**: 템플릿 정의
- **CmsMedia**: 미디어 파일 관리

**없는 것**: 실제 콘텐츠 항목(Post/Content) 저장 Entity

---

## 2. Entity 설계

### 2.1 CmsContent (핵심 Entity)

```typescript
@Entity('cms_contents')
export class CmsContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === Scope (누구의 콘텐츠인가) ===
  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null;  // null = 플랫폼 전역

  @Column({ type: 'varchar', length: 50, nullable: true })
  serviceKey: string | null;  // 'glycopharm', 'kpa', 'glucoseview', null = 전역

  // === Type (어떤 종류의 콘텐츠인가) ===
  @Column({ type: 'varchar', length: 50 })
  type: ContentType;  // 'hero' | 'notice' | 'news' | 'featured' | 'promo' | 'event'

  // === Content (내용) ===
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;  // 짧은 설명/서브타이틀

  @Column({ type: 'text', nullable: true })
  body: string | null;  // 본문 (필요시)

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;  // 대표 이미지

  @Column({ type: 'varchar', length: 500, nullable: true })
  linkUrl: string | null;  // 클릭 시 이동 URL

  @Column({ type: 'varchar', length: 100, nullable: true })
  linkText: string | null;  // 링크 버튼 텍스트

  // === Status (상태 관리) ===
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: ContentStatus;  // 'draft' | 'published' | 'archived'

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;  // 자동 비공개 일시

  // === Display (표시 설정) ===
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;  // 상단 고정

  @Column({ type: 'boolean', default: false })
  isOperatorPicked: boolean;  // 운영자 선택 (featured)

  // === Metadata ===
  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;  // 확장 데이터 (배경색, 아이콘 등)

  // === Audit ===
  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2.2 ContentType 정의

```typescript
type ContentType =
  | 'hero'      // 메인 배너/슬라이드
  | 'notice'    // 공지사항
  | 'news'      // 뉴스/소식
  | 'featured'  // 추천 콘텐츠
  | 'promo'     // 프로모션/광고
  | 'event';    // 이벤트 안내
```

### 2.3 ContentStatus 정의

```typescript
type ContentStatus =
  | 'draft'     // 작성 중
  | 'published' // 게시됨
  | 'archived'; // 보관됨
```

### 2.4 CmsContentSlot (배치/편성 Entity)

콘텐츠를 특정 위치에 배치하는 경우 사용 (예: 홈페이지 Hero 영역)

```typescript
@Entity('cms_content_slots')
export class CmsContentSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === Scope ===
  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  serviceKey: string | null;

  // === Slot Definition ===
  @Column({ type: 'varchar', length: 100 })
  slotKey: string;  // 'home-hero', 'dashboard-banner', 'intranet-promo'

  // === Content Reference ===
  @Column({ type: 'uuid' })
  contentId: string;

  // === Display Control ===
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startsAt: Date | null;  // 노출 시작일

  @Column({ type: 'timestamp', nullable: true })
  endsAt: Date | null;  // 노출 종료일

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## 3. 대시보드 매핑

### 3.1 Glycopharm Operator Dashboard

| 대시보드 필드 | 쿼리 |
|--------------|------|
| `contentStatus.hero.total` | `COUNT(*) WHERE type='hero' AND serviceKey='glycopharm'` |
| `contentStatus.hero.active` | `COUNT(*) WHERE type='hero' AND serviceKey='glycopharm' AND status='published'` |
| `contentStatus.featured.total` | `COUNT(*) WHERE type='featured' AND serviceKey='glycopharm'` |
| `contentStatus.featured.operatorPicked` | `COUNT(*) WHERE type='featured' AND serviceKey='glycopharm' AND isOperatorPicked=true` |
| `contentStatus.eventNotice.total` | `COUNT(*) WHERE type IN ('event','notice') AND serviceKey='glycopharm'` |
| `contentStatus.eventNotice.active` | `COUNT(*) WHERE type IN ('event','notice') AND serviceKey='glycopharm' AND status='published'` |

### 3.2 KPA Society Dashboard

| 대시보드 필드 | 쿼리 |
|--------------|------|
| `recentPosts` | `COUNT(*) WHERE serviceKey='kpa' AND status='published' AND createdAt > NOW() - 7 days` |

### 3.3 KPA Intranet Home

| UI 영역 | 쿼리 |
|---------|------|
| Hero 슬라이드 | `SELECT * FROM cms_content_slots WHERE slotKey='intranet-hero' AND isActive=true ORDER BY sortOrder` |
| 최근 공지 | `SELECT * FROM cms_contents WHERE type='notice' AND organizationId=? AND status='published' ORDER BY isPinned DESC, createdAt DESC LIMIT 5` |
| 뉴스 | `SELECT * FROM cms_contents WHERE type='news' AND serviceKey='kpa' AND status='published' ORDER BY createdAt DESC LIMIT 4` |

### 3.4 HomePage (모든 서비스)

| 서비스 | 쿼리 |
|--------|------|
| glycopharm | `SELECT * FROM cms_content_slots WHERE slotKey='home-hero' AND serviceKey='glycopharm' AND isActive=true` |
| glucoseview | `SELECT * FROM cms_content_slots WHERE slotKey='home-hero' AND serviceKey='glucoseview' AND isActive=true` |
| neture | `SELECT * FROM cms_content_slots WHERE slotKey='home-hero' AND serviceKey='neture' AND isActive=true` |

---

## 4. Logical ERD

```
┌─────────────────────────────────────────────────────────────────┐
│                        CmsContent                                │
├─────────────────────────────────────────────────────────────────┤
│ id: uuid (PK)                                                   │
│ organizationId: uuid (nullable) ─────────────────────┐          │
│ serviceKey: varchar(50) (nullable)                   │          │
│ type: varchar(50)                                    │          │
│ title: varchar(255)                                  │          │
│ summary: text (nullable)                             │          │
│ body: text (nullable)                                │          │
│ imageUrl: varchar(500) (nullable)                    │          │
│ linkUrl: varchar(500) (nullable)                     │          │
│ linkText: varchar(100) (nullable)                    │          │
│ status: varchar(20) ['draft','published','archived'] │          │
│ publishedAt: timestamp (nullable)                    │          │
│ expiresAt: timestamp (nullable)                      │          │
│ sortOrder: int                                       │          │
│ isPinned: boolean                                    │          │
│ isOperatorPicked: boolean                            │          │
│ metadata: jsonb                                      │          │
│ createdBy: uuid (nullable)                           │          │
│ createdAt: timestamp                                 │          │
│ updatedAt: timestamp                                 │          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CmsContentSlot                              │
├─────────────────────────────────────────────────────────────────┤
│ id: uuid (PK)                                                   │
│ organizationId: uuid (nullable)                                 │
│ serviceKey: varchar(50) (nullable)                              │
│ slotKey: varchar(100) ['home-hero','intranet-promo',...]        │
│ contentId: uuid (FK → CmsContent.id)                            │
│ sortOrder: int                                                  │
│ isActive: boolean                                               │
│ startsAt: timestamp (nullable)                                  │
│ endsAt: timestamp (nullable)                                    │
│ createdAt: timestamp                                            │
│ updatedAt: timestamp                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Scope 설계 (계층 구조)

콘텐츠의 가시 범위는 3단계로 구분:

| Scope | organizationId | serviceKey | 의미 |
|-------|----------------|------------|------|
| **Global** | null | null | 플랫폼 전역 (모든 서비스에 표시) |
| **Service** | null | 'glycopharm' | 특정 서비스 전체 |
| **Organization** | 'org-uuid' | null or 'kpa' | 특정 조직 (지부/분회) |

### 5.1 사용 예시

| 콘텐츠 | organizationId | serviceKey | 설명 |
|--------|----------------|------------|------|
| 플랫폼 공지 | null | null | 모든 서비스에 표시 |
| Glycopharm 이벤트 | null | 'glycopharm' | Glycopharm만 표시 |
| 서울지부 공지 | 'seoul-branch-id' | 'kpa' | 해당 지부만 표시 |
| 약국 프로모션 | 'pharmacy-org-id' | 'glycopharm' | 해당 약국만 표시 |

---

## 6. P2 vs P3 경계

### P2에서 다루는 것 (Dashboard-first)

- [x] CmsContent Entity 정의
- [x] CmsContentSlot Entity 정의
- [x] 기본 status lifecycle (draft/published/archived)
- [x] 대시보드 통계 쿼리 가능
- [x] 서비스/조직 scope 구분

### P3 이후로 미루는 것 (CMS 완성)

- [ ] Rich text editor
- [ ] 버전 관리 (revision history)
- [ ] 예약 게시 (scheduled publishing)
- [ ] 미디어 업로드 연동
- [ ] SEO 필드 (meta title, description)
- [ ] 권한 매트릭스 (who can edit what)
- [ ] 다국어 지원

---

## 7. 구현 시 고려사항

### 7.1 인덱스 설계

```sql
-- 주요 쿼리 최적화용 인덱스
CREATE INDEX idx_cms_contents_scope ON cms_contents(service_key, organization_id, status);
CREATE INDEX idx_cms_contents_type ON cms_contents(type, status);
CREATE INDEX idx_cms_contents_published ON cms_contents(status, published_at);
CREATE INDEX idx_cms_content_slots_lookup ON cms_content_slots(slot_key, service_key, is_active);
```

### 7.2 cms-core 통합

- 이 Entity들은 `packages/cms-core/src/entities/`에 추가
- 기존 CmsCptType과 함께 사용 가능 (CptType은 스키마 정의, Content는 실제 데이터)

### 7.3 API 엔드포인트 (참고용)

```
# 콘텐츠 CRUD (P3에서 구현)
GET    /api/v1/cms/contents
POST   /api/v1/cms/contents
GET    /api/v1/cms/contents/:id
PATCH  /api/v1/cms/contents/:id
DELETE /api/v1/cms/contents/:id

# 슬롯 관리 (P3에서 구현)
GET    /api/v1/cms/slots/:slotKey
PUT    /api/v1/cms/slots/:slotKey/contents

# 대시보드 통계 (P2에서 구현 가능)
GET    /api/v1/cms/stats?serviceKey=glycopharm
```

---

## 8. Definition of Done 체크리스트

- [x] CmsContent Entity 필드 정의 완료
- [x] CmsContentSlot Entity 필드 정의 완료
- [x] ContentType, ContentStatus 타입 정의
- [x] 대시보드 매핑 (어떤 필드가 어떤 쿼리를 사용하는지)
- [x] Logical ERD 작성
- [x] P2/P3 경계 명확화
- [ ] (P3) 마이그레이션 실행
- [ ] (P3) API 구현
- [ ] (P3) 프론트엔드 연동

---

## 9. Empty State 해소 예상

이 Entity가 구현되면 다음 Empty state가 해소됨:

| 서비스 | Empty → Real |
|--------|--------------|
| glycopharm | contentStatus.hero ✅ |
| glycopharm | contentStatus.featured ✅ |
| glycopharm | contentStatus.eventNotice ✅ |
| kpa-society | recentPosts ✅ |
| kpa-society | intranet heroSlides ✅ |
| kpa-society | intranet notices ✅ |
| all services | HomePage hero ✅ |

**잔여 Empty state** (다른 Entity 필요):
- glycopharm: channelStatus (Channel Entity 필요)
- kpa-society: activeGroupbuys (Groupbuy Entity 필요)
- glycopharm: trialStatus (Trial Entity 필요)

---

**문서 상태**: Design Complete
**다음 단계**: 사용자 승인 후 P2-IMPLEMENT (Migration + Basic API)
