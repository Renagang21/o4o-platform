# API Server 작업 태스크 리스트

## 📋 Overview
이 문서는 API 서버에서 구현해야 할 모든 백엔드 작업을 정리한 것입니다.
각 시스템별 구현 가이드를 기반으로 실제 작업 순서와 우선순위를 정리했습니다.

## 🎯 작업 우선순위

### Phase 1: 데이터베이스 기반 구축 (1주차)

#### 1.1 Entity 생성 (총 19개)
```bash
# 작업 위치: apps/api-server/src/entities/

# Vendor/Supplier System (4개)
✅ VendorInfo.ts - 이미 존재
□ Supplier.ts
□ VendorCommission.ts  
□ CommissionSettlement.ts

# E-commerce System (4개)
□ Inventory.ts
□ StockMovement.ts
□ ReorderRule.ts
□ InventoryAlert.ts

# Crowdfunding System (3개)
□ CrowdfundingReward.ts
□ CrowdfundingBacker.ts
□ BackerShipment.ts

# Digital Signage System (4개)
□ SignageDevice.ts
□ SignageContent.ts
□ SignagePlaylist.ts
□ PlaybackLog.ts

# Forum System (4개)
□ ForumReport.ts
□ ForumLike.ts
□ ForumBookmark.ts
□ ForumNotification.ts
```

#### 1.2 Database Migration 생성
```bash
cd apps/api-server

# 각 시스템별 마이그레이션 생성
npm run migration:generate -- -n AddSupplierSystem
npm run migration:generate -- -n AddInventorySystem  
npm run migration:generate -- -n AddCrowdfundingExtensions
npm run migration:generate -- -n AddSignageSystem
npm run migration:generate -- -n AddForumExtensions

# 마이그레이션 실행
npm run migration:run
```

### Phase 2: Service Layer 구현 (2주차)

#### 2.1 Core Services (우선순위: 높음)
```typescript
// apps/api-server/src/services/

□ commissionService.ts - 수수료 정산 자동화
□ inventoryService.ts - 재고 관리 및 예측
□ notificationService.ts - 알림 발송 시스템
□ emailService.ts - 이메일 템플릿 및 발송
□ mediaUploadService.ts - S3 파일 업로드
```

#### 2.2 Business Logic Services
```typescript
□ reorderService.ts - 자동 재주문 시스템
□ crowdfundingService.ts - 크라우드펀딩 마감 처리
□ signageSocketService.ts - WebSocket 실시간 동기화
□ forumModerationService.ts - 포럼 자동 모더레이션
```

### Phase 3: Controller 구현 (3주차)

#### 3.1 Express Controllers
```typescript
// apps/api-server/src/controllers/

□ supplierController.ts (12 endpoints)
□ inventoryController.ts (12 endpoints)
□ crowdfundingRewardController.ts (8 endpoints)
□ crowdfundingBackerController.ts (10 endpoints)
□ signageController.ts (15 endpoints)
□ forumReportsController.ts (4 endpoints)
□ forumLikesController.ts (6 endpoints)
□ forumBookmarksController.ts (5 endpoints)
□ forumNotificationsController.ts (4 endpoints)
```

### Phase 4: WebSocket 구현 (4주차)

#### 4.1 Socket.IO Server Setup
```typescript
// apps/api-server/src/websocket/

□ signageSocket.ts - 디지털 사이니지 실시간 동기화
□ forumSocket.ts - 포럼 실시간 알림
□ inventorySocket.ts - 재고 변동 실시간 알림
```

#### 4.2 WebSocket Events
```typescript
// Signage Events
- 'device-register'
- 'content-update'
- 'playlist-change'
- 'playback-status'
- 'emergency-broadcast'

// Forum Events
- 'notification'
- 'typing'
- 'new-comment'
- 'user-online'

// Inventory Events
- 'stock-alert'
- 'reorder-triggered'
- 'low-stock-warning'
```

### Phase 5: Scheduled Jobs (5주차)

#### 5.1 Cron Jobs 설정
```typescript
// apps/api-server/src/jobs/

□ commissionSettlement.job.ts - 월별 정산 (매월 1일)
□ inventoryCheck.job.ts - 재고 확인 (매시간)
□ crowdfundingDeadline.job.ts - 마감 처리 (매일 자정)
□ signageHealthCheck.job.ts - 디바이스 상태 확인 (5분마다)
□ notificationCleanup.job.ts - 오래된 알림 정리 (매주)
```

## 📁 파일 생성 체크리스트

### Entities (19개)
```bash
apps/api-server/src/entities/
├── vendor/
│   ├── □ Supplier.ts
│   ├── □ VendorCommission.ts
│   └── □ CommissionSettlement.ts
├── e-commerce/
│   ├── □ Inventory.ts
│   ├── □ StockMovement.ts
│   ├── □ ReorderRule.ts
│   └── □ InventoryAlert.ts
├── crowdfunding/
│   ├── □ CrowdfundingReward.ts
│   ├── □ CrowdfundingBacker.ts
│   └── □ BackerShipment.ts
├── signage/
│   ├── □ SignageDevice.ts
│   ├── □ SignageContent.ts
│   ├── □ SignagePlaylist.ts
│   └── □ PlaybackLog.ts
└── forum/
    ├── □ ForumReport.ts
    ├── □ ForumLike.ts
    ├── □ ForumBookmark.ts
    └── □ ForumNotification.ts
```

### Controllers (9개)
```bash
apps/api-server/src/controllers/
├── □ supplierController.ts
├── □ inventoryController.ts
├── □ crowdfundingRewardController.ts
├── □ crowdfundingBackerController.ts
├── □ signageController.ts
├── □ forumReportsController.ts
├── □ forumLikesController.ts
├── □ forumBookmarksController.ts
└── □ forumNotificationsController.ts
```

### Services (9개)
```bash
apps/api-server/src/services/
├── □ commissionService.ts
├── □ inventoryService.ts
├── □ reorderService.ts
├── □ crowdfundingService.ts
├── □ notificationService.ts
├── □ emailService.ts
├── □ mediaUploadService.ts
├── □ signageSocketService.ts
└── □ forumModerationService.ts
```

### Routes (5개)
```bash
apps/api-server/src/routes/
├── □ supplier.routes.ts
├── □ inventory.routes.ts
├── □ crowdfunding.routes.ts
├── □ signage.routes.ts
└── □ forum-extended.routes.ts
```

## 🔧 환경 변수 추가

```env
# apps/api-server/.env

# AWS S3 (Media Upload)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-northeast-2
S3_BUCKET_NAME=o4o-media

# Redis (Cache & Session)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# WebSocket
WEBSOCKET_PORT=3002
WEBSOCKET_CORS_ORIGIN=http://localhost:5173,http://localhost:5174

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=O4O Platform <noreply@o4o.com>

# Toss Payments
TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
TOSS_WEBHOOK_SECRET=

# FFmpeg (Video Processing)
FFMPEG_PATH=/usr/bin/ffmpeg

# Commission Settings
COMMISSION_RATE=0.1
SETTLEMENT_DAY=1
```

## 📦 NPM 패키지 설치

```bash
cd apps/api-server

# 필수 패키지 설치
pnpm install socket.io
pnpm install @socket.io/redis-adapter
pnpm install redis
pnpm install ioredis
pnpm install node-cron
pnpm install nodemailer
pnpm install @aws-sdk/client-s3
pnpm install multer
pnpm install multer-s3
pnpm install sharp
pnpm install fluent-ffmpeg
pnpm install bull
pnpm install @types/multer --save-dev
pnpm install @types/nodemailer --save-dev
pnpm install @types/fluent-ffmpeg --save-dev
```

## 🚀 구현 순서 (권장)

### Week 1: Database Foundation
1. 모든 Entity 파일 생성
2. Migration 생성 및 실행
3. 기본 CRUD repository 패턴 구현

### Week 2: Core Services
1. Email Service 구현 (다른 서비스에서 사용)
2. Notification Service 구현
3. Media Upload Service 구현 (S3)
4. Commission Service 구현

### Week 3: Business Logic
1. Inventory Management 완성
2. Crowdfunding 로직 구현
3. Forum Moderation 시스템 구현

### Week 4: Real-time Features
1. Socket.IO 서버 설정
2. Signage WebSocket 구현
3. Forum 실시간 알림 구현

### Week 5: Automation & Testing
1. Cron Jobs 설정
2. 통합 테스트 작성
3. API 문서화 (Swagger)

## 📊 API Endpoints Summary

### Total: 76 Endpoints

| System | Endpoints | Priority |
|--------|-----------|----------|
| Vendor/Supplier | 27 | High |
| E-commerce Inventory | 12 | High |
| Crowdfunding | 18 | Medium |
| Digital Signage | 15 | Medium |
| Forum Extensions | 19 | Low |

## ✅ 작업 완료 체크리스트

### Database
- [ ] 19개 Entity 생성 완료
- [ ] 5개 Migration 실행 완료
- [ ] Foreign Key 관계 설정 완료
- [ ] Index 최적화 완료

### API Implementation
- [ ] 76개 Endpoint 구현 완료
- [ ] Request/Response DTO 생성 완료
- [ ] Validation 미들웨어 추가 완료
- [ ] Error Handling 구현 완료

### WebSocket
- [ ] Socket.IO 서버 구동 확인
- [ ] 3개 시스템 실시간 동기화 완료
- [ ] Redis Adapter 설정 완료
- [ ] Connection 인증 구현 완료

### Scheduled Jobs
- [ ] Cron Job 스케줄러 설정 완료
- [ ] 5개 정기 작업 등록 완료
- [ ] Job Queue (Bull) 설정 완료
- [ ] 실패 재시도 로직 구현 완료

### Testing
- [ ] Unit Test 작성 완료 (80% coverage)
- [ ] Integration Test 완료
- [ ] Load Testing 완료
- [ ] Security Testing 완료

### Documentation
- [ ] API 문서 (Swagger) 생성 완료
- [ ] WebSocket Event 문서화 완료
- [ ] Database Schema 문서화 완료
- [ ] Deployment Guide 작성 완료

## 🔍 테스트 시나리오

### Vendor/Supplier System
1. 공급업체 등록 및 승인
2. 월별 수수료 자동 정산
3. 정산 내역 조회 및 다운로드

### Inventory System
1. 재고 부족 자동 알림
2. 재주문점 도달 시 자동 재주문
3. 데드스톡 식별 및 리포트

### Crowdfunding System
1. 리워드 티어 생성 및 수량 관리
2. 후원자 결제 및 배송 관리
3. 프로젝트 마감 자동 처리

### Digital Signage System
1. 디바이스 등록 및 인증
2. 실시간 콘텐츠 동기화
3. 긴급 방송 즉시 전달

### Forum System
1. 신고 접수 및 우선순위 자동 설정
2. 좋아요/북마크 동시성 처리
3. 실시간 알림 전달 확인

## 📝 Notes

- 모든 구현 가이드는 프로젝트 루트의 `*_API_IMPLEMENTATION.md` 파일 참조
- 기존 VendorController 패턴과 일관성 유지
- JWT 인증 및 역할 기반 권한 시스템 활용
- 모든 API는 표준 응답 형식 사용: `{ success: boolean, data: any, message?: string }`

---

**작성일**: 2025년 1월
**담당자**: API Server Team
**문의**: api-team@o4o.com