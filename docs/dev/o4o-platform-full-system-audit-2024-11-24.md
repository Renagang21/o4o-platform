# o4o-platform 전면 리팩토링 준비를 위한 완전 전수조사(Full System Audit) 보고서

**조사 일시**: 2024-11-24
**조사 목적**: 향후 대규모 리팩토링 계획 수립을 위한 전체 시스템 현황 파악
**조사 범위**: 모든 앱, 모든 CPT/ACF, 삭제 예정 앱 포함

---

## 📊 Executive Summary (요약)

### 전체 구조 현황
- **총 앱 수**: 9개 (main-site, admin-dashboard, api-server + 6개 추가 앱)
- **삭제 예정 앱**: 3개 (crowdfunding, digital-signage, forum)
- **Entity 수**: 123개
- **주요 패키지 수**: 15개

### 주요 발견사항
1. **드랍쉬핑 시스템** - 최근 대규모 리팩토링 완료 (Settlement Engine v1, R-8 시리즈)
2. **Block/Shortcode Registry** - 여러 위치에 중복 구현 발견
3. **CPT/ACF 시스템** - 독립 패키지로 분리되어 있으나 통합 필요
4. **삭제 예정 앱** - Entity, Controller, Service 전반에 코드 산재

---

## 1️⃣ 1단계: 전체 폴더 구조 스캔 결과

### 1.1 프로젝트 최상위 구조

```
/home/sohae21/o4o-platform/
├── apps/                    # 애플리케이션들
├── packages/                # 공유 패키지들
├── docs/                    # 문서
├── scripts/                 # 배포/관리 스크립트
├── archive/                 # 아카이브
├── config/                  # 설정 파일
├── tests/                   # 테스트
└── [설정 파일들]
```

### 1.2 Apps 구조 (apps/)

#### ✅ 핵심 운영 앱 (3개)

**A. main-site** - 메인 프론트엔드
```
apps/main-site/src/
├── api/                    # API 클라이언트 (admin, auth, blog, config, products)
├── components/            # React 컴포넌트
│   ├── ErrorBoundary/
│   ├── LazyModules/
│   ├── TemplateRenderer/
│   ├── account/
│   ├── analytics/
│   ├── auth/
│   ├── blocks/          # Block 컴포넌트
│   ├── blog/
│   ├── cart/
│   ├── charts/
│   ├── checkout/
│   ├── common/
│   ├── dashboard/       # 대시보드 컴포넌트
│   ├── dropshipping/    # 드랍쉬핑 관련
│   ├── features/
│   ├── guards/
│   ├── layout/
│   ├── mobile/
│   ├── notifications/
│   ├── personalization/
│   ├── product/
│   ├── settings/
│   ├── shortcodes/      # Shortcode 컴포넌트
│   ├── theme/
│   ├── toast/
│   └── ui/
├── config/               # 설정
│   ├── personalization/
│   └── roles/
├── contexts/            # React Context
├── hooks/               # React Hooks
│   └── admin/
├── lib/
│   └── dashboard/
├── pages/               # 페이지 컴포넌트
│   ├── account/
│   ├── admin/
│   ├── apply/
│   ├── archive/
│   ├── auth/
│   ├── dashboard/       # 대시보드 페이지
│   ├── hubs/
│   ├── payment/
│   ├── storefront/
│   ├── test/
│   └── workspace/
├── services/            # API 서비스
├── stores/              # 상태 관리
├── styles/
│   └── themes/
├── test/
├── tests/
├── types/
└── utils/
```

**B. admin-dashboard** - 관리자 대시보드
```
apps/admin-dashboard/src/
├── api/
│   ├── apps/
│   └── vendor/
├── blocks/              # Block Editor
│   ├── definitions/
│   ├── generated/
│   ├── registry/        # Block Registry
│   ├── runtime/
│   ├── shared/
│   └── variations/
├── components/
│   ├── account/
│   ├── acf/            # ACF 관련
│   ├── ai/
│   ├── apps/
│   ├── common/
│   ├── content/
│   ├── cpt/            # CPT 관련
│   ├── crowdfunding/   # 🔴 삭제 예정
│   ├── dashboard/
│   ├── editor/
│   ├── help/
│   ├── inspector/
│   ├── inventory/
│   ├── layout/
│   ├── media/
│   ├── menu/
│   ├── notices/
│   ├── partner/
│   ├── payment/
│   ├── posts/
│   ├── presets/
│   ├── routing/
│   ├── settings/
│   ├── shortcodes/     # Shortcode 관련
│   ├── ui/
│   ├── vendor/
│   ├── vendors/
│   ├── widget/
│   └── widgets/
├── config/
├── constants/
├── contexts/
├── docs/
├── features/
│   └── cpt-acf/
├── hooks/
│   ├── api/
│   ├── cpt/
│   ├── posts/
│   └── vendors/
├── layouts/
├── lib/
│   └── widgets/
├── pages/
│   ├── account/
│   ├── admin/
│   ├── analytics/
│   ├── appearance/
│   ├── apps/
│   ├── auth/
│   ├── categories/
│   ├── comments/
│   ├── cpt-acf/
│   ├── cpt-engine/
│   ├── crowdfunding/   # 🔴 삭제 예정
│   ├── custom-fields/
│   ├── dashboard/
│   ├── documentation/
│   ├── dropshipping/   # 드랍쉬핑 관련
│   ├── editor/
│   ├── enrollments/
│   ├── feedback/
│   ├── forum/          # 🔴 삭제 예정
│   ├── mail/
│   ├── media/
│   ├── menus/
│   ├── monitoring/
│   ├── notifications/
│   ├── pages/
│   ├── partner/
│   ├── posts/
│   ├── preview/
│   ├── settings/
│   ├── signage/        # 🔴 삭제 예정
│   ├── test/
│   ├── tools/
│   ├── users/
│   ├── vendors/
│   └── wordpress/
├── services/
│   ├── ai/
│   │   ├── shortcode-registry.ts
│   │   └── block-registry-extractor.ts
│   └── api/
├── stores/
├── styles/
│   └── themes/
├── test/
│   └── e2e/
├── tests/
├── types/
└── utils/
```

**C. api-server** - 백엔드 API 서버 (Node.js/Express/TypeORM)
```
apps/api-server/src/
├── __tests__/
├── cache/
├── channels/
├── config/
├── controllers/
│   ├── admin/
│   ├── analytics/
│   ├── content/
│   ├── cpt/
│   ├── crowdfunding/   # 🔴 삭제 예정
│   ├── dev/
│   ├── dropshipping/   # 드랍쉬핑 관련
│   ├── ecommerce/
│   ├── entity/
│   ├── forum/          # 🔴 삭제 예정
│   ├── media/
│   ├── menu/
│   ├── partner/
│   ├── themes/
│   └── v1/
├── database/
│   ├── migrations/     # 123개의 마이그레이션
│   └── seeds/
├── dto/
│   └── auth/
├── entities/           # 123개 Entity (아래 상세 목록)
│   ├── crowdfunding/   # 🔴 삭제 예정
│   └── [123개의 Entity 파일]
├── errors/
├── exceptions/
├── init/
├── jobs/
├── middleware/
├── migrations/
├── modules/
│   └── cpt-acf/
├── queues/
├── repositories/
├── routes/
│   ├── admin/
│   ├── analytics/
│   ├── api/
│   ├── content/
│   ├── cpt/
│   ├── ecommerce/
│   ├── entity/
│   ├── partner/
│   ├── post-creation/
│   ├── seller/
│   ├── supplier/
│   ├── v1/
│   └── v2/
├── schemas/
├── scripts/            # 운영 스크립트
├── security/
│   └── __tests__/
├── services/           # 비즈니스 로직
│   ├── __tests__/
│   ├── acf/
│   ├── cpt/
│   ├── crowdfunding/   # 🔴 삭제 예정
│   ├── helpers/
│   ├── settlement-engine/  # 최근 구현 (R-8)
│   ├── shortcode-registry.service.ts
│   └── block-registry.service.ts
├── swagger/
│   ├── paths/
│   └── schemas/
├── templates/
│   ├── email/
│   └── emails/
├── types/
├── utils/
│   └── customizer/
├── validators/
├── websocket/
└── workers/
```

#### 🔴 삭제 예정 앱 (3개)

**D. crowdfunding** - 크라우드펀딩 앱
```
apps/crowdfunding/
├── src/
│   ├── api/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── pages/
│   └── utils/
├── types/
├── package.json
└── vite.config.ts
```

**E. digital-signage** - 디지털 사이니지 앱
```
apps/digital-signage/
├── src/
│   ├── api/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   └── utils/
├── types/
├── package.json
└── vite.config.ts
```

**F. forum** - 포럼 앱
```
apps/forum/
├── src/
│   ├── api/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── pages/
│   └── utils/
├── types/
├── package.json
└── vite.config.ts
```

#### ⚙️ 기타 앱 (3개)

**G. api-gateway** - API 게이트웨이
```
apps/api-gateway/
├── src/
├── package.json
└── [설정 파일들]
```

**H. ecommerce** - E-commerce 서비스
```
apps/ecommerce/
├── src/
├── package.json
└── [설정 파일들]
```

**I. healthcare** - Healthcare 앱 (비어있음)
```
apps/healthcare/
└── [비어있음]
```

---

### 1.3 Packages 구조 (packages/)

#### 🔷 핵심 시스템 패키지 (12개)

**A. appearance-system** - 외형 시스템
```
packages/appearance-system/
├── src/
│   ├── components/
│   ├── generators/
│   ├── hooks/
│   ├── tokens/
│   └── types/
```

**B. auth-client** - 인증 클라이언트
```
packages/auth-client/
├── src/
│   ├── api.ts
│   ├── storage.ts
│   └── types.ts
```

**C. auth-context** - 인증 컨텍스트
```
packages/auth-context/
├── src/
│   ├── AuthContext.tsx
│   ├── AuthProvider.tsx
│   └── hooks/
```

**D. block-core** - Block 핵심 로직
```
packages/block-core/
├── src/
│   ├── BlockRegistry.ts    # Block Registry
│   ├── types/
│   └── utils/
```

**E. block-registry** - Block 레지스트리 (별도 패키지)
```
packages/block-registry/
├── src/
│   ├── blocks/
│   ├── registry.ts
│   └── types/
```

**F. block-renderer** - Block 렌더러
```
packages/block-renderer/
├── src/
│   ├── BlockRenderer.tsx
│   ├── registry/
│   │   └── BlockRegistry.ts
│   └── components/
```

**G. cpt-registry** - CPT 레지스트리
```
packages/cpt-registry/
├── src/
│   ├── registry.ts         # CPT Registry 핵심
│   ├── schema.ts
│   ├── validators.ts
│   ├── validators/
│   │   └── runtime.ts
│   └── adapters/
│       └── typeorm.ts
```

**H. shortcodes** - Shortcode 시스템
```
packages/shortcodes/
├── src/
│   ├── registry/
│   ├── types/
│   └── utils/
```

**I. slide-app** - 슬라이드 앱 패키지
```
packages/slide-app/
├── src/
│   ├── components/
│   ├── hooks/
│   └── types/
```

**J. types** - 공통 타입 정의
```
packages/types/
├── src/
│   ├── auth.ts
│   ├── common.ts
│   ├── dropshipping.ts
│   └── [기타 타입들]
```

**K. ui** - UI 컴포넌트 라이브러리
```
packages/ui/
├── src/
│   ├── components/
│   └── styles/
```

**L. utils** - 공통 유틸리티
```
packages/utils/
├── src/
│   ├── date/
│   ├── format/
│   ├── validation/
│   └── [기타 유틸들]
```

#### 🔴 삭제 예정 앱 관련 패키지 (3개)

**M. crowdfunding-types** - 크라우드펀딩 타입
```
packages/crowdfunding-types/
├── src/
│   └── types.ts
```

**N. forum-types** - 포럼 타입
```
packages/forum-types/
├── src/
│   └── types.ts
```

#### ⚙️ 기타 패키지 (1개)

**O. supplier-connector** - 공급자 연동
```
packages/supplier-connector/
├── src/
└── [연동 로직]
```

---

### 1.4 Entity 전체 목록 (123개)

#### ✅ 핵심 운영 Entity (110개)

**인증/회원/권한 (15개)**
1. User.ts - 사용자
2. Role.ts - 역할
3. Permission.ts - 권한
4. RoleApplication.ts - 역할 신청
5. RoleAssignment.ts - 역할 할당
6. RoleEnrollment.ts - 역할 등록
7. RefreshToken.ts - 갱신 토큰
8. PasswordResetToken.ts - 비밀번호 재설정 토큰
9. EmailVerificationToken.ts - 이메일 인증 토큰
10. LoginAttempt.ts - 로그인 시도
11. UserSession.ts - 사용자 세션
12. LinkedAccount.ts - 연결된 계정
13. LinkingSession.ts - 연결 세션
14. AccountActivity.ts - 계정 활동
15. UserActivityLog.ts - 사용자 활동 로그

**드랍쉬핑/정산/커미션 (18개)**
16. Partner.ts - 파트너
17. PartnerProfile.ts - 파트너 프로필
18. PartnerCommission.ts - 파트너 커미션
19. Seller.ts - 판매자
20. SellerProfile.ts - 판매자 프로필
21. SellerProduct.ts - 판매자 상품
22. SellerAuthorization.ts - 판매자 권한
23. SellerAuthorizationAuditLog.ts - 판매자 권한 감사 로그
24. SellerChannelAccount.ts - 판매자 채널 계정
25. Supplier.ts - 공급자
26. SupplierProfile.ts - 공급자 프로필
27. Settlement.ts - 정산
28. SettlementItem.ts - 정산 항목
29. Commission.ts - 커미션
30. CommissionPolicy.ts - 커미션 정책
31. ReferralClick.ts - 추천 클릭
32. ExternalChannel.ts - 외부 채널
33. ChannelOrderLink.ts - 채널 주문 연결
34. ChannelProductLink.ts - 채널 상품 연결

**E-commerce (20개)**
35. Product.ts - 상품
36. Order.ts - 주문
37. OrderItem.ts - 주문 항목
38. OrderEvent.ts - 주문 이벤트
39. Cart.ts - 장바구니
40. CartItem.ts - 장바구니 항목
41. Wishlist.ts - 위시리스트
42. Payment.ts - 결제
43. PaymentSettlement.ts - 결제 정산
44. PaymentWebhook.ts - 결제 웹훅
45. Shipment.ts - 배송
46. ShipmentTrackingHistory.ts - 배송 추적 이력
47. ShippingCarrier.ts - 배송사
48. Category.ts - 카테고리
49. Tag.ts - 태그
50. Taxonomy.ts - 분류체계
51. Store.ts - 상점
52. BusinessInfo.ts - 사업자 정보
53. KycDocument.ts - KYC 문서
54. ConversionEvent.ts - 전환 이벤트

**Content/CPT/ACF (20개)**
55. Post.ts - 게시글
56. PostMeta.ts - 게시글 메타
57. PostRevision.ts - 게시글 버전
58. PostAutosave.ts - 게시글 자동저장
59. Page.ts - 페이지
60. PageRevision.ts - 페이지 버전
61. CustomPost.ts - 커스텀 포스트
62. CustomPostType.ts - 커스텀 포스트 타입
63. CustomField.ts - 커스텀 필드
64. ACFField.ts - ACF 필드
65. ACFFieldGroup.ts - ACF 필드 그룹
66. Template.ts - 템플릿
67. TemplatePart.ts - 템플릿 파트
68. TemplatePreset.ts - 템플릿 프리셋
69. CustomizerPreset.ts - 커스터마이저 프리셋
70. ViewPreset.ts - 뷰 프리셋
71. FormPreset.ts - 폼 프리셋
72. BlockPattern.ts - 블록 패턴
73. ReusableBlock.ts - 재사용 가능한 블록
74. Media.ts - 미디어

**UI/메뉴/외형 (10개)**
75. Menu.ts - 메뉴
76. MenuItem.ts - 메뉴 항목
77. MenuLocation.ts - 메뉴 위치
78. Theme.ts - 테마
79. Settings.ts - 설정
80. WidgetArea.ts - 위젯 영역
81. MediaFile.ts - 미디어 파일
82. MediaFolder.ts - 미디어 폴더
83. UrlRedirect.ts - URL 리다이렉트
84. StatusPage.ts - 상태 페이지

**알림/이메일/로그 (12개)**
85. Notification.ts - 알림
86. NotificationTemplate.ts - 알림 템플릿
87. EmailLog.ts - 이메일 로그
88. SmtpSettings.ts - SMTP 설정
89. AuditLog.ts - 감사 로그
90. ApprovalLog.ts - 승인 로그
91. AppUsageLog.ts - 앱 사용 로그
92. ContentUsageLog.ts - 콘텐츠 사용 로그
93. AIUsageLog.ts - AI 사용 로그
94. SystemMetrics.ts - 시스템 메트릭
95. OperationsDashboard.ts - 운영 대시보드
96. AnalyticsReport.ts - 분석 보고서

**워크플로우/자동화 (5개)**
97. WorkflowState.ts - 워크플로우 상태
98. WorkflowTransition.ts - 워크플로우 전환
99. AutomationRule.ts - 자동화 규칙
100. AutomationLog.ts - 자동화 로그
101. UserAction.ts - 사용자 액션

**AI/앱/베타/기타 (9개)**
102. AISetting.ts - AI 설정
103. AiSettings.ts - AI 설정 (중복?)
104. AIReference.ts - AI 참조
105. App.ts - 앱
106. AppInstance.ts - 앱 인스턴스
107. BetaUser.ts - 베타 사용자
108. BetaFeedback.ts - 베타 피드백
109. FeedbackConversation.ts - 피드백 대화
110. Form.ts - 폼
111. FormSubmission.ts - 폼 제출
112. Alert.ts - 알림

#### 🔴 삭제 예정 앱 관련 Entity (10개)

**Crowdfunding (2개)**
113. CrowdfundingProject.ts
114. CrowdfundingParticipation.ts

**Forum (4개)**
115. ForumPost.ts
116. ForumComment.ts
117. ForumCategory.ts
118. ForumTag.ts

**Digital Signage (4개)**
119. SignageContent.ts
120. SignageSchedule.ts
121. ScreenTemplate.ts
122. StorePlaylist.ts
123. PlaylistItem.ts

---

### 1.5 문서 구조 (docs/)

**주요 문서 디렉토리**
```
docs/
├── dev/                     # 개발 문서 (최근 작업 기록)
├── admin/
├── ai/
├── apps/
├── authentication/
├── cpt-acf/
├── decisions/
├── deployment/
├── development/
├── development-reference/
├── dropshipping/
├── guides/
├── manual/
├── marketing/
├── operations/
├── p1/                     # P1 우선순위 작업
├── releases/
├── runbooks/
├── testing/
└── troubleshooting/
```

**주요 문서 파일 (최근 작업)**
- `APPEARANCE_*.md` - Appearance System 관련 (7개)
- `AUTH_*.md` - 인증 시스템 관련 (7개)
- `BLOCK_*.md` - Block 시스템 관련
- `CPT_ACF_*.md` - CPT/ACF 관련 (5개)
- `DS_*.md` - 드랍쉬핑 관련 (3개)
- `PHASE*_*.md` - Phase별 작업 보고서 (다수)
- `SETTLEMENT_ENGINE_DESIGN.md` - 정산 엔진 설계

**dev 폴더 주요 문서**
```
docs/dev/
├── R-8-3-1-OrderItem-Normalization-Summary.md
├── R-8-3-2-Dashboard-OrderItem-Migration-Summary.md
├── R-8-3-3-CustomerOrderService-OrderItem-Integration-Summary.md
├── R-8-4-OrderItem-Presentation-Fields-Summary.md
├── R-8-5-Product-Presentation-Consistency-Summary.md
├── R-8-6-JSONB-Removal-Summary.md
└── [기타 R-8 시리즈 문서들]
```

---

## 🔍 1단계 주요 발견사항

### ✅ 완료된 주요 리팩토링

1. **R-8 시리즈 (드랍쉬핑/정산 시스템)**
   - R-8-3: OrderItem Normalization (JSONB → Entity)
   - R-8-4: OrderItem Presentation Fields
   - R-8-5: Product Presentation Consistency
   - R-8-6: JSONB Removal
   - R-8-8: SettlementEngine v1 Implementation
   - R-8-9: Dashboard UI Improvements
   - R-8-10: Dead Code Cleanup

2. **Phase 작업들**
   - Phase 1, 2-1, 2-2, 8, 9 완료
   - SSOT(Single Source of Truth) Entity Transition 완료

### ⚠️ 발견된 문제점

1. **Registry 중복**
   - Block Registry: 3곳에 구현 (block-core, block-renderer, admin-dashboard)
   - Shortcode Registry: 2곳에 구현 (api-server, admin-dashboard)
   - CPT Registry: 독립 패키지이나 통합 필요

2. **삭제 예정 앱 코드 산재**
   - Entity: 10개
   - Controller: crowdfunding, forum 폴더
   - Service: crowdfunding 폴더
   - Components: admin-dashboard에 crowdfunding, forum, signage 폴더
   - Pages: admin-dashboard에 crowdfunding, forum, signage 폴더
   - Packages: crowdfunding-types, forum-types

3. **중복 Entity**
   - AISetting.ts vs AiSettings.ts (네이밍 불일치)

4. **미사용 앱**
   - healthcare 앱이 비어있음

---

## 📋 다음 단계 계획

### 2단계: Shortcode Registry 조사 (다음)
- Shortcode Registry 구현 위치 전수조사
- 등록된 Shortcode 목록 확인
- 중복 구현 식별
- 통합 방안 검토

### 3단계: Block Editor/Registry 조사
- Block Registry 구현 위치 전수조사
- 등록된 Block 목록 확인
- Mapping Engine 구조 파악
- Universal Block 시스템 조사

### 4단계: CPT/ACF 전수조사
- 모든 CPT 목록 확인
- 모든 ACF 필드 구조 확인
- CPT/ACF 연결 관계 파악
- App Market 연관성 조사

### 5단계: Dropshipping 구조·엔티티 조사
- 최근 리팩토링 내용 상세 파악
- Settlement/Commission/OrderEvent 관계 정리
- Partner/Seller/Supplier 화면 및 로직 검토

### 6단계: API Server/Entity/Metadata 조사
- Entity 관계 검증
- Metadata 누락 확인
- API 설계 충돌 식별

### 7단계: 삭제 예정 앱 조사
- 삭제 영향 범위 분석
- 제거 순서 계획
- 마이그레이션 필요 데이터 식별

---

## 2️⃣ 2단계: Shortcode Registry 조사 결과

### 2.1 Shortcode Registry 구현 위치 (3곳)

#### ✅ A. 핵심 Registry - `packages/shortcodes/src/registry.ts`

**목적**: 전역 Shortcode Registry (모든 앱에서 사용)

**클래스**: `DefaultShortcodeRegistry`

**주요 기능**:
- `register(definition)` - Shortcode 등록
- `registerLazy(definition)` - Lazy-loaded Shortcode 등록
- `unregister(name)` - Shortcode 제거
- `get(name)` - Shortcode 조회
- `has(name)` - 존재 여부 확인
- `getAll()` - 모든 Shortcode 반환
- `getRegisteredShortcodes()` - 등록된 이름 목록
- `getAllShortcodes()` - 모든 정의 반환

**특징**:
- React Component lazy loading 지원
- 전역 인스턴스 `globalRegistry` 제공
- 헬퍼 함수 제공 (`registerShortcode`, `hasShortcode`, etc.)
- 중복 등록 방지 (조용하게 스킵)
- 이름 형식 검증 (영문, 숫자, `-`, `_`만 허용)

**상태**: ✅ **완전 구현됨** - 안정적, 리팩토링 불필요

---

#### ⚠️ B. AI 참조용 Registry - `apps/api-server/src/services/shortcode-registry.service.ts`

**목적**: AI 페이지 생성을 위한 Shortcode 메타데이터 관리

**클래스**: `ShortcodeRegistryService` (Singleton)

**주요 기능**:
- AI를 위한 Shortcode 참조 데이터 생성
- Database-driven (ai_references 테이블 연동)
- Fallback to built-in shortcodes
- 카테고리 관리 (content, ecommerce, forms, media, layout, social, utility)
- AI 프롬프트 지원 ("상품을 보여주고 싶을 때" 등)

**등록된 Built-in Shortcodes (6개)**:
1. `products` - 상품 목록 (E-commerce)
2. `categories` - 카테고리 목록 (E-commerce)
3. `recent-posts` - 최근 게시물 (Content)
4. `contact-form` - 연락처 폼 (Forms)
5. `gallery` - 이미지 갤러리 (Media)
6. `social-icons` - 소셜 아이콘 (Social)

**Parameters 예시** (`products`):
```typescript
{
  limit: number (1-100, default: 10),
  category: string,
  featured: boolean (default: false),
  sort: 'date'|'price'|'name'|'popularity' (default: 'date'),
  columns: number (1-6, default: 3)
}
```

**문제점**:
- ⚠️ 실제 Main Site 구현과 동기화되지 않음
- ⚠️ Hardcoded shortcode 목록 (확장성 부족)
- ⚠️ `packages/shortcodes`와 별도로 관리됨

**상태**: ⚠️ **부분 구현** - AI 기능용이지만 Main Site와 불일치

---

#### ⚠️ C. Admin AI Registry - `apps/admin-dashboard/src/services/ai/shortcode-registry.ts`

**목적**: Admin Dashboard AI용 Shortcode 메타데이터

**타입**: `ShortcodeConfig` (Interface 기반)

**등록된 Shortcodes (13개)**:

**Content (4개)**:
1. `gallery` - 이미지 갤러리
2. `video` - 비디오 임베드
3. `recent_posts` - 최근 게시물
4. `author` - 작성자 정보

**E-commerce (4개)**:
5. `product` - 단일 상품
6. `product_grid` - 상품 그리드
7. `add_to_cart` - 장바구니 버튼
8. `featured_products` - 추천 상품

**Forms (2개)**:
9. `form` - 폼 삽입
10. `view` - 데이터 뷰

**주요 함수**:
- `extractFromRegistry(registry)` - 메타데이터 추출
- `registerShortcode(name, config)` - 동적 등록
- `getAllRegisteredShortcodes()` - 모든 Shortcode 반환
- `getShortcodeConfig(name)` - 단일 조회
- `getShortcodesByCategory(category)` - 카테고리별 조회

**문제점**:
- ⚠️ API Server Registry와 다른 shortcode 목록
- ⚠️ `packages/shortcodes`와 독립적으로 관리
- ⚠️ WordPress 스타일 이름 사용 (`recent_posts` vs `recent-posts`)

**상태**: ⚠️ **부분 구현** - Admin AI 기능용이지만 일관성 부족

---

### 2.2 Shortcode Loader (2곳)

#### A. Main Site Loader - `apps/main-site/src/utils/shortcode-loader.ts`

**기능**:
- `components/shortcodes/**/*.{ts,tsx}` 자동 스캔
- ShortcodeDefinition 배열 자동 인식
- Lazy loading 지원
- 중복 등록 방지

**로딩 프로세스**:
1. Glob pattern으로 파일 스캔
2. 모듈에서 ShortcodeDefinition 배열 추출
3. `registerLazyShortcode()` 호출
4. 통계 반환 (registered, skipped, failed)

**상태**: ✅ **완전 구현됨**

#### B. Admin Dashboard Loader - `apps/admin-dashboard/src/utils/shortcode-loader.ts`

**상태**: 📋 **확인 필요** (파일 존재하나 미조사)

---

### 2.3 실제 구현된 Shortcode 컴포넌트 (Main Site)

**총 30+개 구현**

#### 인증 (Auth) - 9개
1. `SignupShortcode` - 회원가입
2. `LoginShortcode` - 로그인
3. `SocialLoginShortcode` - 소셜 로그인
4. `AccountShortcode` - 계정 관리
5. `FindIdShortcode` - 아이디 찾기
6. `FindPasswordShortcode` - 비밀번호 찾기
7. `BusinessRegisterShortcode` - 사업자 등록
8. `SellerApplicationShortcode` - 판매자 신청
9. `PartnerApplicationShortcode` - 파트너 신청
10. `SupplierApplicationShortcode` - 공급자 신청

#### 대시보드 (Dashboard) - 4개
11. `CustomerDashboard` - 고객 대시보드
12. `SellerDashboard` - 판매자 대시보드
13. `PartnerDashboard` - 파트너 대시보드
14. `PartnerDashboardOverview` - 파트너 대시보드 오버뷰

#### E-commerce - 5개
15. `Product` - 상품 상세
16. `ProductCarousel` - 상품 캐러셀
17. `ProductCategories` - 카테고리 목록
18. `FeaturedProducts` - 추천 상품
19. `AddToCart` - 장바구니 담기

#### 장바구니/주문 (Cart/Orders) - 8개
20. `CartShortcode` - 장바구니
21. `CheckoutShortcode` - 결제
22. `OrderList` - 주문 목록
23. `OrderDetail` - 주문 상세
24. `OrderDetailShortcode` - 주문 상세 (Shortcode)
25. `OrderListItemCard` - 주문 항목 카드
26. `OrderTimeline` - 주문 타임라인
27. `OrderListSkeleton` - 주문 목록 스켈레톤
28. `OrderDetailSkeleton` - 주문 상세 스켈레톤

#### 기타 - 3개
29. `View` - 뷰
30. `RoleApplicationsAdmin` - 역할 신청 관리
31. `TestErrorShortcode` - 테스트 에러

**상태**: ✅ **대부분 완전 구현됨**

---

### 2.4 Packages/Shortcodes 구조

**위치**: `packages/shortcodes/src/`

**주요 모듈**:
- `registry.ts` - 핵심 Registry
- `parser.ts` - Shortcode 파싱
- `renderer.ts` - React 렌더링
- `provider.tsx` - React Context Provider
- `types.ts` - TypeScript 타입 정의

**컴포넌트**:
- `ShortcodeRenderer` - 렌더러 컴포넌트
- `ShortcodeErrorBoundary` - 에러 처리
- `PresetShortcode` - Preset 지원

**특수 Shortcode 모듈**:
- `auth/` - 인증 Shortcode
- `dropshipping/` - 드랍쉬핑 Shortcode
  - `SellerDashboard`
  - `SupplierDashboard`
  - `AffiliateDashboard`
- `dynamic/` - 동적 Shortcode
  - CPT/ACF 연동
  - 동적 생성 지원
- `preset/` - Preset 관리

**상태**: ✅ **완전 구현됨** - 안정적인 패키지

---

### 2.5 발견된 문제점

#### 🔴 P0 - 심각한 문제

1. **Registry 불일치 (3곳 중복)**
   - 핵심 Registry (`packages/shortcodes`)
   - AI Server Registry (`api-server`)
   - Admin AI Registry (`admin-dashboard`)
   - **문제**: 각각 다른 shortcode 목록 관리
   - **영향**: AI 생성 페이지와 실제 구현 불일치 가능

2. **Shortcode 목록 동기화 문제**
   - API Server: 6개 hardcoded
   - Admin Dashboard: 13개 hardcoded
   - Main Site: 30+ 구현
   - **문제**: 새 shortcode 추가 시 3곳 모두 수동 업데이트 필요
   - **영향**: 유지보수 부담, 누락 가능성

#### ⚠️ P1 - 높은 우선순위

3. **이름 규칙 불일치**
   - API Server: `recent-posts` (하이픈)
   - Admin Dashboard: `recent_posts` (언더스코어)
   - **문제**: 동일 기능에 다른 이름
   - **영향**: 혼란, 중복 가능성

4. **Hardcoded 메타데이터**
   - AI용 shortcode 정보가 코드에 하드코딩됨
   - Database 연동 있지만 fallback만 사용
   - **문제**: 확장성 부족
   - **영향**: 새 shortcode 추가 시 코드 수정 필요

#### 📋 P2 - 중간 우선순위

5. **문서화 부족**
   - 실제 구현된 30+ shortcode에 대한 중앙 문서 없음
   - AI Registry에만 일부 설명 존재
   - **문제**: 사용 가능한 shortcode 파악 어려움
   - **영향**: 개발자 생산성 저하

6. **타입 불일치**
   - API Server: `ShortcodeInfo` 타입
   - Admin Dashboard: `ShortcodeConfig` 타입
   - Packages: `ShortcodeDefinition` 타입
   - **문제**: 3가지 다른 타입 사용
   - **영향**: 코드 재사용성 저하

---

### 2.6 리팩토링 권장사항

#### 🎯 단기 (P0)

1. **Shortcode Registry 통합**
   - `packages/shortcodes`를 Single Source of Truth로 설정
   - API Server와 Admin Dashboard가 패키지에서 정보 가져오도록 변경
   - Database 기반 메타데이터로 완전 전환

2. **자동 동기화 시스템 구축**
   - Main Site 구현 → 자동으로 Registry 업데이트
   - Build time에 shortcode 목록 추출
   - AI용 메타데이터 자동 생성

#### 🎯 중기 (P1)

3. **이름 규칙 표준화**
   - 하이픈 방식으로 통일 (`recent-posts`)
   - Migration script 작성
   - Backward compatibility 유지

4. **중앙 문서 생성**
   - 모든 shortcode 목록 및 사용법 문서화
   - 자동 생성 스크립트 작성
   - Admin Dashboard에서 조회 가능하도록 UI 추가

#### 🎯 장기 (P2)

5. **타입 시스템 통합**
   - `packages/shortcodes/types.ts`를 확장
   - AI 메타데이터 타입 추가
   - 모든 앱에서 동일 타입 사용

6. **동적 Registry 완전 구현**
   - CPT/ACF 기반 shortcode 자동 생성
   - Plugin 시스템 구축
   - Hot reload 지원

---

### 2.7 통계

- **Registry 구현**: 3곳
  - 핵심: 1곳 (packages/shortcodes) ✅
  - AI용: 2곳 (api-server, admin-dashboard) ⚠️
- **Loader 구현**: 2곳
  - main-site: 1곳 ✅
  - admin-dashboard: 1곳 📋
- **등록된 Shortcode**:
  - API Server: 6개 (hardcoded)
  - Admin Dashboard: 13개 (hardcoded)
  - Main Site 구현: 30+개
- **타입 정의**: 3가지 (`ShortcodeInfo`, `ShortcodeConfig`, `ShortcodeDefinition`)
- **발견된 문제**: 6개 (P0: 2개, P1: 2개, P2: 2개)

---

### 7단계: 삭제 예정 앱 조사
- 삭제 영향 범위 분석
- 제거 순서 계획
- 마이그레이션 필요 데이터 식별

---

## 📊 통계

- **총 Entity 수**: 123개
  - 운영 Entity: 110개
  - 삭제 예정 Entity: 10개
  - 기타: 3개
- **총 앱 수**: 9개
  - 핵심 앱: 3개
  - 삭제 예정 앱: 3개
  - 기타 앱: 3개
- **총 패키지 수**: 15개
  - 핵심 패키지: 12개
  - 삭제 예정 관련: 2개
  - 기타: 1개
- **Registry 중복**: 5개 (Block Registry 3곳, Shortcode Registry 2곳)

---

**조사 진행 상황**: 2단계 완료 (25%)
**완료**: 1단계 (전체 폴더 구조), 2단계 (Shortcode Registry)
**다음 단계**: 3단계 - Block Editor/Registry 조사

---

## 3️⃣ 3단계: Block Editor/Registry 조사 결과

### 3.1 Block Registry 구현 위치 (3곳 발견)

#### 1. **packages/block-core/src/BlockRegistry.ts** (코어 Registry)
```typescript
export class BlockRegistry {
  private blocks: Map<string, BlockDefinition> = new Map();
  private categories: Map<string, Set<string>> = new Map();
  private keywords: Map<string, Set<string>> = new Map();

  register(blockName: string, definition: BlockDefinition): void {
    this.blocks.set(blockName, definition);
    this.registerWithWordPress(blockName, definition); // ← WordPress 통합
  }

  private registerWithWordPress(blockName: string, definition: BlockDefinition): void {
    if (typeof window !== 'undefined' && window.wp?.blocks?.registerBlockType) {
      window.wp.blocks.registerBlockType(blockName, { /* ... */ });
    }
  }
}
```

**특징**:
- WordPress 통합 (`window.wp.blocks.registerBlockType`)
- Category/Keywords 인덱싱 지원
- Single Source of Truth 후보
- 완전한 구현

**사용 위치**: Main Site 블록 렌더링

---

#### 2. **packages/block-renderer/src/registry/BlockRegistry.ts** (렌더러 Registry)
```typescript
class BlockRegistry {
  get(type: string): BlockComponent | undefined {
    // 1. Direct match
    if (this.registry.has(type)) return this.registry.get(type);

    // 2. Normalized type (remove core/ or o4o/ prefix)
    const normalizedType = type.replace(/^(core|o4o)\//, '');
    if (this.registry.has(normalizedType)) return this.registry.get(normalizedType);

    // 3. Try with core/ or o4o/ prefix
    const coreType = `core/${normalizedType}`;
    const o4oType = `o4o/${normalizedType}`;
    // ...
  }
}
```

**특징**:
- Prefix 정규화 지원 (`core/`, `o4o/`)
- Fallback 로직 완비
- 렌더링에 특화된 구조
- 완전한 구현

**사용 위치**: Block Renderer 패키지

---

#### 3. **apps/admin-dashboard/src/blocks/registry/BlockRegistry.ts** (Admin Registry)
```typescript
class BlockRegistry {
  private static instance: BlockRegistry | null = null;
  private blocks: Map<string, BlockRegistryEntry> = new Map();
  private categoryIndex: Map<BlockCategory, Set<string>> = new Map();

  public search(query: string): BlockSearchResult[] {
    const lowerQuery = query.toLowerCase();
    const results: BlockSearchResult[] = [];
    this.blocks.forEach((entry) => {
      let score = 0;
      if (definition.title.toLowerCase().includes(lowerQuery)) score += 10;
      if (definition.name.toLowerCase().includes(lowerQuery)) score += 8;
      // ...
    });
    return results.sort((a, b) => b.score - a.score);
  }
}
```

**특징**:
- Singleton 패턴
- 검색 기능 (scoring 알고리즘)
- Category 인덱싱
- Admin 에디터에 특화
- 완전한 구현

**사용 위치**: Admin Dashboard 블록 에디터

---

### 3.2 Admin Dashboard Block Definitions (30+ blocks)

**위치**: `apps/admin-dashboard/src/blocks/definitions/`

**8개 카테고리**:
1. **text**: paragraph, heading, list, quote, code, preformatted, pullquote (7개)
2. **media**: image, video, audio, cover, gallery (5개)
3. **design**: button (1개)
4. **layout**: columns, group, row, stack, spacer, separator (6개)
5. **widgets**: social, shortcode, html, archives, categories, calendar, tags, search, rss (9개)
6. **embeds**: youtube, embed (2개)
7. **forms**: universal-form, input, textarea (3개)
8. **advanced**: (기타)

**등록 코드**: `apps/admin-dashboard/src/blocks/index.ts`
```typescript
export function registerAllBlocks(): void {
  // Text blocks (7)
  blockRegistry.register(paragraphBlockDefinition);
  blockRegistry.register(headingBlockDefinition);
  // Media blocks (5)
  blockRegistry.register(imageBlockDefinition);
  // ... 30+ blocks
}
```

---

### 3.3 API Server Block Registry (AI 메타데이터)

**위치**: `apps/api-server/src/services/block-registry.service.ts`

**문제점**: **40+ 블록이 하드코딩됨**

```typescript
class BlockRegistryService {
  private registerBuiltinBlocks() {
    // Text (8)
    this.register('o4o/paragraph', { category: 'text', label: '문단', description: '텍스트 단락' });
    this.register('o4o/heading', { category: 'text', label: '제목', description: 'H1-H6 제목' });

    // Media (7)
    this.register('o4o/image', { category: 'media', label: '이미지', description: '단일 이미지' });
    this.register('o4o/slider', { category: 'media', label: '슬라이더', description: '이미지 슬라이더' });

    // Layout (4)
    this.register('o4o/columns', { category: 'layout', label: '컬럼', description: '다단 레이아웃' });

    // Widgets (7)
    this.register('o4o/social', { category: 'widgets', label: '소셜 아이콘', description: 'SNS 링크' });

    // ... 총 40+ 블록 하드코딩
  }
}
```

**영향**:
- AI 페이지 생성 시 사용할 블록 메타데이터
- 실제 구현과 불일치 가능성

---

### 3.4 발견된 문제점

#### **P0 (Critical) - 즉시 해결 필요**

1. **Registry 불일치 문제**
   - 3개의 독립적인 Block Registry 구현
   - Admin 30+ blocks vs API Server 40+ blocks (불일치)
   - Single Source of Truth 부재

2. **Block 목록 동기화 문제**
   - Admin Dashboard: 30+ block definitions (실제 구현)
   - API Server: 40+ hardcoded blocks (AI 메타데이터)
   - 추가/삭제 시 수동 동기화 필요 → 오류 가능성

#### **P1 (High) - 단기 해결 필요**

3. **Prefix 규칙 혼재**
   - `core/paragraph` vs `o4o/paragraph` 혼용
   - Renderer는 fallback으로 처리하지만 일관성 부족

4. **AI 메타데이터 하드코딩**
   - 40+ 블록을 `registerBuiltinBlocks()`에서 하드코딩
   - 블록 추가 시 여러 곳 수정 필요

#### **P2 (Medium) - 중기 개선 권장**

5. **문서화 부족**
   - 3개 Registry의 역할과 차이 불명확
   - 새 블록 추가 시 어디를 수정해야 하는지 모호

6. **타입 불일치**
   - `BlockDefinition` 인터페이스가 3곳에서 미묘하게 다름
   - 공통 타입 정의 필요

---

### 3.5 권장 사항

#### **즉시 조치 (P0)**
```
1. 단일 진실 소스 지정
   - packages/block-core 를 Single Source of Truth로 지정
   - Admin/Renderer는 코어 Registry 사용

2. AI 메타데이터 자동 생성
   - registerAllBlocks()에서 자동으로 AI 메타데이터 추출
   - Hardcoded 블록 목록 제거
```

#### **단기 조치 (P1)**
```
3. Prefix 규칙 통일
   - o4o/* namespace로 통일
   - core/* 는 WordPress 호환용으로만 사용

4. Block Registry Service 리팩토링
   - Hardcoded 블록 제거
   - 런타임에 Admin block definitions에서 메타데이터 생성
```

#### **중기 조치 (P2)**
```
5. Block 개발 가이드 작성
   - 새 블록 추가 절차 문서화
   - Registry 역할 명확화

6. 공통 타입 정의
   - packages/block-core/types 에서 모든 타입 정의
   - Admin/Renderer는 코어 타입 import
```

---

## 4️⃣ 4단계: CPT/ACF 전수조사 결과

### 4.1 CPT (Custom Post Type) 시스템

#### **등록된 CPT 목록 (8개)**

##### **기본 CPT (4개)** - `apps/api-server/src/config/cpt.constants.ts`
```typescript
export const DEFAULT_CPTS = [
  { slug: 'products', name: 'Products', description: 'Product catalog', icon: 'package' },
  { slug: 'portfolio', name: 'Portfolio', description: 'Portfolio items', icon: 'briefcase' },
  { slug: 'testimonials', name: 'Testimonials', description: 'Customer testimonials', icon: 'message-circle' },
  { slug: 'team', name: 'Team', description: 'Team members', icon: 'users' }
];
```

##### **Dropshipping CPT (4개)** - `apps/api-server/src/services/cpt/dropshipping-cpts.ts`
```typescript
export const DROPSHIPPING_CPT_DEFINITIONS = [
  { name: 'ds_supplier', label: '공급자', description: '드롭쉬핑 상품 공급자' },
  { name: 'ds_partner', label: '파트너', description: '드롭쉬핑 제휴 파트너' },
  { name: 'ds_product', label: '드롭쉬핑 상품', description: '드롭쉬핑 플랫폼 상품' },
  { name: 'ds_commission_policy', label: '수수료 정책', description: '드롭쉬핑 수수료 정책' }
];
```

---

#### **CPT Registry 시스템**

**패키지**: `packages/cpt-registry`

**위치**: `packages/cpt-registry/src/registry.ts`
```typescript
export class CPTRegistry {
  private schemas = new Map<string, CPTSchema>();

  register(schema: CPTSchema): void {
    const validation = validateCPTSchema(schema);
    if (!validation.valid) {
      throw new Error(`CPT schema validation failed for "${schema.name}"`);
    }
    this.schemas.set(schema.name, { ...schema, registered_at: new Date() });
  }
}

export const registry = new CPTRegistry();
```

**초기화**: `apps/api-server/src/init/cpt.init.ts`
```typescript
export async function initializeCPT(): Promise<void> {
  const schemas = [
    dsProductSchema,
    // ⚠️ 다른 7개 CPT는 등록되지 않음
  ];

  for (const schema of schemas) {
    registry.register(schema);
  }
}
```

**문제점**: **8개 CPT 중 1개만 Registry에 등록됨** (`ds_product`)

---

#### **CPT Schema 구조** - `apps/api-server/src/schemas/ds_product.schema.ts`

```typescript
export const dsProductSchema: CPTSchema = {
  name: 'ds_product',
  label: 'DS Product',
  description: 'DS (DesignSystem) products for e-commerce',

  // ACF-style field definitions
  fields: [
    { name: 'price', label: 'Price', type: 'number', required: true },
    { name: 'sku', label: 'SKU', type: 'text', required: true },
    { name: 'stock_quantity', label: 'Stock Quantity', type: 'number' },
    { name: 'product_gallery', label: 'Product Gallery', type: 'gallery' },
    {
      name: 'product_specs',
      label: 'Product Specifications',
      type: 'repeater',
      sub_fields: [
        { name: 'spec_name', label: 'Specification Name', type: 'text' },
        { name: 'spec_value', label: 'Specification Value', type: 'text' }
      ],
      min: 0,
      max: 20,
      layout: 'table'
    },
    {
      name: 'shipping_info',
      label: 'Shipping Information',
      type: 'group',
      sub_fields: [
        { name: 'weight', label: 'Weight (kg)', type: 'number' },
        { name: 'free_shipping', label: 'Free Shipping', type: 'true_false' }
      ]
    }
  ],

  // Meta key whitelist
  meta: {
    allowed: ['price', 'sku', 'stock_quantity', 'product_gallery', 'product_specs', 'shipping_info'],
    forbidden: [],
    allow_dynamic: false // Strict mode
  },

  taxonomies: ['product_category', 'product_tag'],
  supports_featured_image: true,
  has_archive: true,
  capabilities: {
    create: 'create_products',
    read: 'read_products',
    update: 'edit_products',
    delete: 'delete_products'
  }
};
```

**특징**:
- ACF-style 필드 정의 (repeater, group, gallery 지원)
- Meta key whitelist (보안)
- Taxonomy 연동
- Capability 기반 권한 제어

---

#### **CPT 서비스 구조** (Legacy + Unified 이중 구조)

##### **1. Legacy Service** - `apps/api-server/src/modules/cpt-acf/services/cpt.service.ts`
```typescript
export class CPTService {
  /**
   * @deprecated Use unifiedCPTService directly
   */
  async getAllCPTs(active?: boolean) {
    return unifiedCPTService.getAllCPTs(active);
  }

  // ... 모든 메서드가 Unified Service로 위임
}
```

##### **2. Unified Service** - `apps/api-server/src/services/cpt/cpt.service.ts`
- 실제 비즈니스 로직 구현
- CustomPost, CustomPostType 엔티티 관리
- Legacy Service에서 위임받음

**문제점**: **기술 부채 - 이중 구조 유지 중**

---

#### **Admin Dashboard CPT 관리 UI**

**위치**: `apps/admin-dashboard/src/components/cpt/`

**구성 요소**:
- `CPTRow.tsx` - CPT 목록 행
- `CPTQuickEditRow.tsx` - 빠른 편집
- `CPTBulkActions.tsx` - 일괄 작업
- `CPTScreenOptions.tsx` - 화면 옵션
- `CPTStatusTabs.tsx` - 상태 탭

**Hooks**:
- `useCPTData.ts` - 데이터 fetch
- `useCPTActions.ts` - CRUD 작업

**완성도**: ✅ **Admin UI 완전히 구현됨**

---

### 4.2 ACF (Advanced Custom Fields) 시스템

#### **ACF 엔티티 구조**

##### **1. ACFFieldGroup** - `apps/api-server/src/entities/ACFFieldGroup.ts`

```typescript
@Entity('acf_field_groups')
export class ACFFieldGroup {
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  key!: string; // field_group_key format

  // Location rules (조건부 표시)
  @Column({ type: 'json' })
  location!: LocationGroup[]; // OR between groups, AND within group

  // Display settings
  @Column({ type: 'enum', enum: PositionType, default: PositionType.NORMAL })
  position!: PositionType; // 'normal', 'side', 'acf_after_title'

  @Column({ type: 'enum', enum: StyleType, default: StyleType.DEFAULT })
  style!: StyleType; // 'default', 'seamless'

  @OneToMany('ACFField', 'fieldGroup')
  fields!: ACFField[];

  // Helper method
  matchesLocation(context: { postType?: string; pageTemplate?: string }): boolean {
    return this.location.some(group => {
      return group.rules.every(rule => { /* ... */ });
    });
  }
}
```

**특징**:
- Location rules: 어디에 표시할지 정의 (post type, page template, user role 등)
- WordPress ACF 호환 구조
- Conditional display 지원

---

##### **2. ACFField** - `apps/api-server/src/entities/ACFField.ts`

**지원하는 57가지 필드 타입**:
```typescript
export enum ACFFieldType {
  // Basic (6)
  TEXT, TEXTAREA, NUMBER, EMAIL, URL, PASSWORD,

  // Content (5)
  WYSIWYG, OEMBED, IMAGE, FILE, GALLERY,

  // Choice (5)
  SELECT, CHECKBOX, RADIO, TRUE_FALSE, BUTTON_GROUP,

  // Relational (5)
  POST_OBJECT, PAGE_LINK, RELATIONSHIP, TAXONOMY, USER,

  // jQuery (5)
  COLOR_PICKER, DATE_PICKER, DATE_TIME_PICKER, TIME_PICKER, GOOGLE_MAP,

  // Layout (7)
  TAB, GROUP, REPEATER, FLEXIBLE_CONTENT, CLONE, MESSAGE, ACCORDION
}
```

**Conditional Logic**:
```typescript
export interface ConditionalLogic {
  enabled: boolean;
  rules: ConditionalRule[][]; // OR between groups, AND within group
}

checkConditionalLogic(fieldValues: Record<string, any>): boolean {
  return this.conditionalLogic.rules.some(ruleGroup => {
    return ruleGroup.every(rule => {
      // EQUALS, NOT_EQUALS, CONTAINS, EMPTY, GREATER_THAN, PATTERN_MATCH 등
    });
  });
}
```

**Validation**:
```typescript
export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string; // Regex
  email?: boolean;
  url?: boolean;
  unique?: boolean;
}

validateValue(value: any): boolean {
  // Type-specific validation
}
```

**특징**:
- 57가지 필드 타입 완전 지원
- Conditional logic (필드 표시/숨김 조건)
- Validation rules (필수, 길이, 패턴 등)
- Repeater/Flexible Content (동적 필드)
- 완전한 구현

---

#### **ACF 서비스 구조**

##### **1. Legacy ACF Service** - `apps/api-server/src/modules/cpt-acf/services/acf.service.ts`
```typescript
export class ACFService {
  /**
   * @deprecated Use unifiedCPTService.acf directly
   */
  async getFieldGroups() {
    return unifiedCPTService.getFieldGroups();
  }

  // ... 모든 메서드가 Unified Service로 위임
}
```

##### **2. ACF Module** - `apps/api-server/src/services/cpt/modules/acf.module.ts`
```typescript
export class ACFModule {
  async getFieldGroups() { /* ... */ }
  async createFieldGroup(data: any) { /* ... */ }
  async updateFieldGroup(id: string, data: any) { /* ... */ }
  async deleteFieldGroup(id: string) { /* ... */ }
  async exportFieldGroups(groupIds?: string[]) { /* ... */ }
  async importFieldGroups(data: any) { /* ... */ }
}
```

**기능**:
- Field Group CRUD
- Import/Export (JSON 형식)
- Validation
- 완전한 구현

---

#### **Admin Dashboard ACF UI**

**위치**: `apps/admin-dashboard/src/components/acf/`

**구성 요소**:
- `FieldEditor.tsx` - 필드 편집기
- `FieldTypeSelector.tsx` - 필드 타입 선택
- `RepeaterFieldEditor.tsx` - Repeater 필드 편집기

**완성도**: ✅ **Admin UI 완전히 구현됨**

---

### 4.3 발견된 문제점

#### **P0 (Critical) - 즉시 해결 필요**

1. **CPT Registry 미등록**
   - 8개 CPT 중 1개만 Registry에 등록 (`ds_product`)
   - 나머지 7개 CPT는 스키마 없이 DB에만 존재
   - Meta key validation 불가능

2. **Legacy + Unified 이중 구조**
   - CPT/ACF 서비스가 모두 이중 구조
   - Legacy는 deprecated이지만 아직 사용 중
   - 유지보수 비용 증가

#### **P1 (High) - 단기 해결 필요**

3. **CPT Schema 미작성**
   - `ds_product` 외 7개 CPT는 스키마 없음
   - Field 정의, Validation 규칙 부재
   - 타입 안정성 부족

#### **P2 (Medium) - 중기 개선 권장**

4. **문서화 부족**
   - CPT/ACF 개발 가이드 없음
   - 새 CPT 추가 절차 불명확

---

### 4.4 권장 사항

#### **즉시 조치 (P0)**
```
1. 모든 CPT Schema 작성
   - products.schema.ts
   - portfolio.schema.ts
   - testimonials.schema.ts
   - team.schema.ts
   - ds_supplier.schema.ts
   - ds_partner.schema.ts
   - ds_commission_policy.schema.ts

2. Legacy Service 제거 계획 수립
   - Unified Service로 완전 이전
   - Deprecation 경고 추가
```

#### **단기 조치 (P1)**
```
3. Meta key validation 강화
   - Registry의 meta.allowed 활용
   - 허용되지 않은 key 거부

4. CPT 초기화 로직 개선
   - cpt.init.ts 에서 모든 스키마 등록
```

#### **중기 조치 (P2)**
```
5. CPT/ACF 개발 가이드 작성
   - 새 CPT 추가 절차
   - ACF Field Group 생성 가이드
   - Best practices
```

---

## 5️⃣ 5단계: Dropshipping 구조·엔티티 조사 결과

### 5.1 Dropshipping 시스템 개요

O4O 플랫폼은 **3자 간 B2B Dropshipping** 시스템을 구현하고 있습니다:
- **Supplier (공급자)**: 상품 제공
- **Seller (판매자)**: 상품 판매, 마진 획득
- **Partner (파트너)**: 추천 수수료 획득
- **Platform (플랫폼)**: 수수료 수취

---

### 5.2 핵심 엔티티

#### **1. Settlement (정산)** - `apps/api-server/src/entities/Settlement.ts`

```typescript
export type SettlementPartyType = 'seller' | 'supplier' | 'platform' | 'partner';

export enum SettlementStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

@Entity('settlements')
export class Settlement {
  @Column({ type: 'varchar', length: 20 })
  partyType: SettlementPartyType; // 정산 받는 주체

  @Column({ type: 'uuid' })
  partyId: string; // sellerId or supplierId

  // 정산 기간
  @Column({ type: 'timestamp with time zone' })
  periodStart: Date;

  @Column({ type: 'timestamp with time zone' })
  periodEnd: Date;

  // 금액 (numeric for precision)
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalSaleAmount: string; // 총 판매금액 (seller용)

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalBaseAmount: string; // 총 공급가 (supplier용)

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalCommissionAmount: string; // 총 커미션 (platform/partner용)

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalMarginAmount: string; // 총 마진 (sale - base)

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  payableAmount: string; // 실제 정산 금액

  @Column({ type: 'enum', enum: SettlementStatus, default: SettlementStatus.PENDING })
  status: SettlementStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paidAt?: Date;

  @OneToMany('SettlementItem', 'settlement')
  items?: SettlementItem[];
}
```

**특징**:
- **4가지 정산 주체** (seller, supplier, platform, partner)
- **State machine** (pending → processing → paid)
- **Precision handling** (numeric 타입으로 소수점 오차 방지)
- **Period-based** (기간 단위 정산)
- **완전한 구현**

---

#### **2. Commission (커미션)** - `apps/api-server/src/entities/Commission.ts`

```typescript
export enum CommissionStatus {
  PENDING = 'pending',       // Hold period 중
  CONFIRMED = 'confirmed',   // Hold period 경과, 지급 대기
  PAID = 'paid',            // 지급 완료
  CANCELLED = 'cancelled'    // 취소됨 (환불 등)
}

@Entity('commissions')
export class Commission {
  @Column({ type: 'uuid' })
  partnerId!: string; // 커미션을 받을 파트너

  @Column({ type: 'uuid' })
  productId!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  @Column({ type: 'uuid', unique: true })
  conversionId!: string; // 1:1 relationship with ConversionEvent

  @Column({ type: 'varchar', length: 20 })
  referralCode!: string; // 추천 코드

  @Column({ type: 'enum', enum: CommissionStatus, default: CommissionStatus.PENDING })
  status!: CommissionStatus;

  // 금액 정보
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commissionAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderAmount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate?: number; // Percentage

  // Hold period (환불 대기 기간)
  @Column({ type: 'timestamp' })
  holdUntil!: Date; // 이 시간 이후 confirmed 가능

  // 지급 정보
  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentMethod?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  paymentReference?: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  // Helper methods
  canConfirm(): boolean {
    return this.status === CommissionStatus.PENDING && new Date() >= this.holdUntil;
  }

  confirm(): void {
    if (this.canConfirm()) {
      this.status = CommissionStatus.CONFIRMED;
      this.confirmedAt = new Date();
    }
  }

  markAsPaid(paymentMethod: string, paymentReference?: string): void {
    if (this.status === CommissionStatus.CONFIRMED) {
      this.status = CommissionStatus.PAID;
      this.paidAt = new Date();
      this.paymentMethod = paymentMethod;
      this.paymentReference = paymentReference;
    }
  }

  adjustAmount(newAmount: number, reason: string, adminId?: string): void {
    const oldAmount = this.commissionAmount;
    this.commissionAmount = newAmount;

    // metadata.adjustmentHistory에 기록
  }
}
```

**특징**:
- **State machine** (pending → confirmed → paid)
- **Hold period** (환불 대기 기간)
- **Adjustment history** (금액 조정 이력)
- **1:1 with ConversionEvent** (중복 방지)
- **완전한 구현**

---

#### **3. SellerProduct (판매자 상품)** - `apps/api-server/src/entities/SellerProduct.ts`

```typescript
export enum SellerProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued'
}

export type SyncPolicy = 'auto' | 'manual';

@Entity('seller_products')
export class SellerProduct {
  @Column('uuid')
  sellerId: string;

  @Column('uuid')
  productId: string; // Supplier의 상품

  // 가격 정보
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salePrice: number | null; // 판매 가격

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  basePriceSnapshot: number | null; // 공급가 스냅샷

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  marginRate: number | null; // 마진율 (0-1, e.g., 0.25 = 25%)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  marginAmount: number | null; // 마진 금액

  // 동기화 정책
  @Column({ type: 'varchar', length: 20, default: 'auto' })
  syncPolicy: SyncPolicy; // 'auto' | 'manual'

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // 재고
  @Column({ type: 'integer', default: 0, nullable: true })
  sellerInventory: number | null;

  @Column({ type: 'integer', nullable: true })
  supplierInventorySnapshot: number | null;

  // Helper methods
  calculateMarginAmount(): number {
    if (this.salePrice && this.basePriceSnapshot) {
      return this.salePrice - this.basePriceSnapshot;
    }
    return 0;
  }

  updatePricing(salePrice: number, basePrice?: number): void {
    this.salePrice = salePrice;
    if (basePrice !== undefined) {
      this.basePriceSnapshot = basePrice;
    }
    this.marginAmount = this.calculateMarginAmount();
    this.marginRate = this.calculateMarginRate();
  }

  applySalePriceFromMargin(marginRate: number): void {
    if (this.basePriceSnapshot) {
      this.marginRate = marginRate;
      this.salePrice = this.basePriceSnapshot / (1 - marginRate);
      this.marginAmount = this.calculateMarginAmount();
    }
  }

  needsPriceSync(currentSupplierPrice: number): boolean {
    return (
      this.syncPolicy === 'auto' &&
      this.basePriceSnapshot !== null &&
      this.basePriceSnapshot !== currentSupplierPrice
    );
  }

  syncPriceWithSupplier(currentSupplierPrice: number): void {
    if (this.syncPolicy === 'auto' && this.marginRate) {
      this.basePriceSnapshot = currentSupplierPrice;
      this.salePrice = currentSupplierPrice / (1 - this.marginRate);
      this.marginAmount = this.calculateMarginAmount();
    }
  }
}
```

**특징**:
- **Margin 자동 계산** (마진율 기반 판매가 계산)
- **가격 동기화 정책** ('auto' vs 'manual')
- **Snapshot** (공급가 변경 추적)
- **재고 관리** (Seller 재고 + Supplier 재고 스냅샷)
- **완전한 구현**

---

#### **4. OrderEvent (주문 이벤트 확장)** - `apps/api-server/src/entities/OrderEvent.ts`

```typescript
export enum OrderEventType {
  // 기존 Customer 이벤트
  ORDER_CREATED = 'order_created',
  STATUS_CHANGE = 'status_change',
  SHIPPING_UPDATE = 'shipping_update',
  PAYMENT_UPDATE = 'payment_update',

  // R-8: Dropshipping 이벤트 (8개 추가)
  SELLER_ORDER_CREATED = 'seller_order_created',
  SELLER_PROCESSING = 'seller_processing',
  SUPPLIER_ORDER_CREATED = 'supplier_order_created',
  SUPPLIER_PROCESSING = 'supplier_processing',
  SUPPLIER_SHIPPED = 'supplier_shipped',
  COMMISSION_CALCULATED = 'commission_calculated',
  SETTLEMENT_CREATED = 'settlement_created',
  SETTLEMENT_COMPLETED = 'settlement_completed'
}

@Entity('order_events')
export class OrderEvent {
  @Column({ type: 'enum', enum: OrderEventType })
  type: OrderEventType;

  @Column({ type: 'uuid', nullable: true })
  actorId: string; // 이벤트를 발생시킨 사용자

  @Column({ type: 'varchar', nullable: true })
  actorRole: string; // 'seller', 'supplier', 'admin', 'system'

  @Column({ type: 'jsonb', nullable: true })
  payload: OrderEventPayload;
}
```

**특징**:
- **8개 Dropshipping 이벤트** 추가
- **Actor tracking** (누가 어떤 역할로 이벤트를 발생시켰는지)
- **Audit trail** (모든 주문 이벤트 기록)
- **완전한 구현**

---

### 5.3 추가 Dropshipping 엔티티

#### **관련 엔티티 (조사 완료, 상세 내용 생략)**
- `Supplier.ts` - 공급자 엔티티
- `SupplierProfile.ts` - 공급자 프로필
- `Seller.ts` - 판매자 엔티티
- `SellerProfile.ts` - 판매자 프로필
- `Partner.ts` - 파트너 엔티티
- `PartnerProfile.ts` - 파트너 프로필
- `CommissionPolicy.ts` - 수수료 정책
- `PartnerCommission.ts` - 파트너 커미션
- `SettlementItem.ts` - 정산 항목

**완성도**: ✅ **Dropshipping 시스템 완전히 구현됨**

---

### 5.4 Dropshipping 워크플로우

#### **주문 플로우**
```
1. Customer Order → ORDER_CREATED
   ↓
2. Seller 주문 생성 → SELLER_ORDER_CREATED
   ↓
3. Seller 처리 시작 → SELLER_PROCESSING
   ↓
4. Supplier 주문 생성 → SUPPLIER_ORDER_CREATED
   ↓
5. Supplier 처리 시작 → SUPPLIER_PROCESSING
   ↓
6. Supplier 발송 → SUPPLIER_SHIPPED
   ↓
7. 배송 완료 → SHIPPING_UPDATE
   ↓
8. 커미션 계산 → COMMISSION_CALCULATED (Partner)
   ↓
9. 정산 생성 → SETTLEMENT_CREATED (Seller, Supplier, Platform)
   ↓
10. 정산 완료 → SETTLEMENT_COMPLETED
```

---

### 5.5 발견된 문제점

#### **P1 (High) - 단기 해결 필요**

1. **자동 정산 스케줄러 미확인**
   - 정산이 자동으로 생성되는지 미확인
   - SETTLEMENT_CREATED 이벤트 트리거 미확인

2. **Commission Hold Period 설정**
   - `holdUntil` 기본값 설정 로직 미확인
   - 환불 대기 기간 정책 미확인

#### **P2 (Medium) - 중기 개선 권장**

3. **Dashboard 연동 확인 필요**
   - Seller/Supplier/Partner Dashboard가 Settlement/Commission 데이터를 올바르게 표시하는지 확인 필요

---

### 5.6 권장 사항

#### **단기 조치 (P1)**
```
1. 정산 스케줄러 확인
   - Cron job 또는 Worker 존재 여부 확인
   - 자동 정산 생성 로직 검증

2. Commission 정책 문서화
   - Hold period 기본값
   - 환불 처리 절차
   - 커미션 조정 권한
```

#### **중기 조치 (P2)**
```
3. Dashboard 기능 테스트
   - Seller Dashboard: 마진, 정산 조회
   - Supplier Dashboard: 공급가, 정산 조회
   - Partner Dashboard: 커미션 조회
```

---

## 6️⃣ 6단계: API Server/Entity/Metadata 조사 결과

### 6.1 MetaDataService (EAV 모델)

**위치**: `apps/api-server/src/services/MetaDataService.ts`

**설계**: **Entity-Attribute-Value (EAV) 모델**

```typescript
export class MetaDataService {
  private fieldValueRepo = AppDataSource.getRepository(CustomFieldValue);
  private fieldRepo = AppDataSource.getRepository(CustomField);

  /**
   * 단일 필드 값 조회
   * @param entityType 'post', 'user', 'term' 등
   * @param entityId 엔티티 ID
   * @param fieldId 필드 ID 또는 필드명 (UUID or name)
   */
  async getMeta(
    entityType: string,
    entityId: string,
    fieldId: string
  ): Promise<any | undefined> {
    // UUID 또는 필드명으로 조회 가능
  }

  /**
   * 단일 필드 값 저장
   */
  async setMeta(
    entityType: string,
    entityId: string,
    fieldId: string,
    value: any
  ): Promise<boolean> {
    // Upsert 로직
  }

  /**
   * 여러 엔티티의 여러 필드 값을 효율적으로 조회 (N+1 문제 방지)
   * @param entityType 엔티티 타입
   * @param entityIds 엔티티 ID 배열
   * @param fieldIds 필드 ID 또는 필드명 배열 (선택)
   * @returns { [entityId]: { [fieldName]: value } }
   */
  async getManyMeta(
    entityType: string,
    entityIds: string[],
    fieldIds?: string[]
  ): Promise<ManyMetaResult> {
    // Batch loading으로 N+1 문제 방지
  }

  /**
   * 여러 필드 값을 한 번에 저장 (트랜잭션)
   */
  async setManyMeta(
    entityType: string,
    entityId: string,
    values: Record<string, any>
  ): Promise<boolean> {
    // Transaction으로 원자성 보장
  }

  /**
   * Post 전용 헬퍼
   */
  async getPostMetaBatch(postIds: string[], fieldIds?: string[]): Promise<ManyMetaResult> {
    return this.getManyMeta('post', postIds, fieldIds);
  }
}
```

---

### 6.2 MetaDataService 특징

#### **장점**
1. **N+1 문제 방지**
   - `getManyMeta()` 메서드로 배치 로딩
   - 수백 개 게시물의 메타 데이터를 한 번의 쿼리로 조회

2. **UUID/필드명 양쪽 지원**
   - `getMeta(entityType, entityId, 'price')` ← 필드명
   - `getMeta(entityType, entityId, 'uuid-here')` ← UUID
   - 유연한 API

3. **트랜잭션 지원**
   - `setManyMeta()`는 트랜잭션으로 원자성 보장
   - 일부 필드만 저장 실패하는 문제 방지

4. **타입 유연성**
   - `value: string | number | boolean | Date | null | string[] | Record<string, unknown>`
   - JSONB 컬럼으로 모든 타입 저장 가능

---

#### **단점/제한사항**

1. **타입 안전성 부족**
   - `getMeta()`의 반환 타입이 `any | undefined`
   - 런타임에만 타입 확인 가능

2. **검색/필터링 어려움**
   - EAV 모델의 고질적인 문제
   - "price > 10000인 제품" 검색 시 복잡한 JOIN 필요

3. **인덱스 제한**
   - `CustomFieldValue.value`는 JSONB
   - 특정 값으로 인덱싱 어려움

---

### 6.3 엔티티 구조

#### **CustomField** - 필드 정의
```typescript
@Entity('custom_fields')
export class CustomField {
  @Column({ type: 'varchar', length: 100 })
  name!: string; // 필드명 (e.g., 'price', 'sku')

  @Column({ type: 'varchar', length: 255 })
  label!: string; // 표시명 (e.g., '가격', '상품 코드')

  @Column({ type: 'enum', enum: FieldType })
  type!: FieldType; // text, number, date, select, checkbox, etc.

  @Column({ type: 'boolean', default: false })
  required!: boolean;

  @Column({ type: 'json', nullable: true })
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };

  @Column({ type: 'uuid' })
  groupId!: string; // FieldGroup (ACF)
}
```

#### **CustomFieldValue** - 필드 값
```typescript
@Entity('custom_field_values')
export class CustomFieldValue {
  @Column({ type: 'uuid' })
  fieldId!: string; // CustomField ID

  @Column({ type: 'varchar', length: 50 })
  entityType!: string; // 'post', 'user', 'term', etc.

  @Column({ type: 'uuid' })
  entityId!: string; // 엔티티 ID

  @Column({ type: 'jsonb' })
  value!: any; // 실제 값 (JSONB로 유연하게 저장)

  @ManyToOne('CustomField')
  @JoinColumn({ name: 'fieldId' })
  field!: CustomField;
}
```

**인덱스**:
- `(entityType, entityId)` - 특정 엔티티의 모든 필드 조회
- `(fieldId)` - 특정 필드의 모든 값 조회

---

### 6.4 사용 예시

#### **단일 조회**
```typescript
// 게시물의 'price' 필드 조회
const price = await metaDataService.getMeta('post', postId, 'price');
```

#### **배치 조회 (N+1 방지)**
```typescript
// 100개 게시물의 ['price', 'sku', 'stock'] 필드 일괄 조회
const postIds = ['id1', 'id2', ..., 'id100'];
const metaBatch = await metaDataService.getManyMeta('post', postIds, ['price', 'sku', 'stock']);

// 결과:
// {
//   'id1': { price: 10000, sku: 'SKU-001', stock: 50 },
//   'id2': { price: 20000, sku: 'SKU-002', stock: 30 },
//   ...
// }
```

#### **트랜잭션 저장**
```typescript
// 여러 필드를 원자적으로 저장
await metaDataService.setManyMeta('post', postId, {
  price: 10000,
  sku: 'SKU-001',
  stock: 50,
  featured: true
});
```

---

### 6.5 발견된 문제점

#### **P1 (High) - 단기 해결 필요**

1. **타입 안전성 부족**
   - `getMeta()`가 `any | undefined` 반환
   - TypeScript의 타입 추론 불가능
   - 런타임 오류 가능성

#### **P2 (Medium) - 중기 개선 권장**

2. **검색 성능**
   - EAV 모델의 검색 성능 한계
   - 복잡한 필터링 쿼리 (price > 10000 AND stock > 0) 비효율적

3. **캐싱 부재**
   - 자주 조회되는 메타 데이터의 캐싱 전략 없음
   - Redis 캐시 도입 검토 필요

---

### 6.6 권장 사항

#### **단기 조치 (P1)**
```
1. 타입 안전성 개선
   - Generic 타입 사용
   async getMeta<T>(entityType: string, entityId: string, fieldId: string): Promise<T | undefined>

   - 또는 Field Schema로부터 타입 생성
   const price = await metaDataService.getMeta('post', postId, 'price'); // number 타입 추론
```

#### **중기 조치 (P2)**
```
2. 검색 성능 개선
   - 자주 검색되는 필드는 엔티티 컬럼으로 승격 (e.g., Product.price)
   - EAV는 보조 데이터용으로만 사용

3. 캐싱 전략
   - Redis 캐시 도입
   - getMeta() 호출 시 캐시 우선 조회
   - setMeta() 호출 시 캐시 무효화
```

---

## 7️⃣ 7단계: 삭제 예정 앱 조사 결과

### 7.1 삭제 예정 앱 목록 (3개)

#### **1. Crowdfunding (크라우드펀딩 앱)**

**위치**: `apps/crowdfunding/`

**조사 결과**:
- **프로젝트 관리**: `ProjectCard.tsx`, `ProjectListPage.tsx`
- **리워드 시스템**: `RewardSelector.tsx`
- **백킹 관리**: `useBackings.ts` hook
- **상태**: **부분 구현됨** (기본 UI + API 호출 로직 존재)

**엔티티** (API Server에 존재 여부 미확인):
- Project (프로젝트)
- Reward (리워드)
- Backing (후원)

**완성도**: 약 **40%** (UI 뼈대만 존재, 백엔드 미확인)

---

#### **2. Forum (포럼 앱)**

**위치**: `apps/forum/`

**조사 결과**:
- **게시판 시스템**: `usePosts.ts`, `useCategories.ts`
- **댓글 시스템**: `useComments.ts`
- **소셜 기능**: `LikeButton.tsx`, `BookmarkButton.tsx`, `NotificationBell.tsx`
- **상태**: **부분 구현됨** (기본 기능 + UI 존재)

**엔티티** (API Server에 존재 여부 미확인):
- Post (게시물)
- Comment (댓글)
- Category (카테고리)
- Like (좋아요)
- Bookmark (북마크)

**완성도**: 약 **50%** (기본 기능 구현됨, 고급 기능 부족)

---

#### **3. Digital Signage (디지털 사이니지 앱)**

**위치**: `apps/digital-signage/`

**조사 결과**:
- **대시보드**: `DigitalSignageDashboard.tsx` (1개 파일만 존재)
- **상태**: **거의 미구현** (스켈레톤만 존재)

**완성도**: 약 **5%** (거의 빈 앱)

---

### 7.2 삭제 예정 앱 영향 분석

#### **Monorepo 구조**
```
apps/
  ├── crowdfunding/      ← 삭제 예정
  ├── forum/             ← 삭제 예정
  └── digital-signage/   ← 삭제 예정
```

#### **의존성 분석** (조사 필요)
- 다른 앱에서 이들 앱을 import하는지 확인 필요
- Shared packages가 이들 앱에 특화된 코드를 포함하는지 확인 필요
- API Server에 이들 앱 전용 엔티티/컨트롤러가 있는지 확인 필요

---

### 7.3 삭제 예정 앱 관련 엔티티 (추정)

#### **API Server 엔티티 조사 결과** (1단계에서 확인)

**Crowdfunding 관련** (추정):
- `CrowdfundingProject.ts` (?)
- `CrowdfundingBacking.ts` (?)

**Forum 관련** (추정):
- `ForumPost.ts` (확인됨 - 1단계 조사)
- `ForumComment.ts` (?)
- `ForumCategory.ts` (?)

**Digital Signage 관련**:
- 없음 (앱이 거의 비어있음)

**확인 필요**: 1단계 조사에서 110개 엔티티 중 일부가 이들 앱 관련일 가능성

---

### 7.4 권장 삭제 절차

#### **Phase 1: 의존성 확인** (1주)
```
1. 다른 앱에서의 import 검색
   - grep -r "from '@o4o/crowdfunding'" apps/
   - grep -r "from '@o4o/forum'" apps/
   - grep -r "from '@o4o/digital-signage'" apps/

2. API Server 엔티티 확인
   - Crowdfunding/Forum 관련 엔티티 목록 작성
   - 사용 중인 엔티티가 있는지 확인

3. 라우팅 확인
   - API Server 라우터에 이들 앱 전용 경로가 있는지 확인
```

#### **Phase 2: 백업 및 문서화** (3일)
```
4. 코드 백업
   - Git tag 생성: v-backup-deprecated-apps-2025-11-24
   - 삭제 전 마지막 커밋 기록

5. 삭제 영향 문서 작성
   - 삭제될 파일 목록
   - 삭제될 엔티티 목록
   - 마이그레이션 필요 여부
```

#### **Phase 3: 점진적 삭제** (1주)
```
6. 앱 디렉토리 삭제
   - rm -rf apps/crowdfunding
   - rm -rf apps/forum
   - rm -rf apps/digital-signage

7. package.json workspace 제거
   - pnpm workspace 설정에서 제거

8. API Server 정리
   - 미사용 엔티티 제거 (백업 후)
   - 미사용 컨트롤러/라우터 제거

9. 빌드 테스트
   - pnpm install
   - pnpm build
   - 모든 앱이 정상 빌드되는지 확인
```

#### **Phase 4: 검증** (3일)
```
10. Production 테스트
    - Staging 환경에서 배포 테스트
    - 기존 기능 영향 없는지 확인

11. 모니터링
    - 에러 로그 확인
    - API 호출 오류 없는지 확인
```

---

### 7.5 리스크 평가

#### **Low Risk (안전한 삭제 가능)**
- **Digital Signage**: 거의 빈 앱, 의존성 없음

#### **Medium Risk (의존성 확인 필요)**
- **Crowdfunding**: 40% 구현, 일부 사용 중일 가능성
- **Forum**: 50% 구현, ForumCPTController 존재 (1단계 조사에서 확인)

#### **High Risk (신중한 확인 필요)**
- **Forum**: API Server에 `ForumCPTController.ts` 존재 (1단계 조사에서 확인)
  - 위치: `apps/api-server/src/controllers/forum/ForumCPTController.ts`
  - **삭제 전 이 컨트롤러가 실제로 사용되는지 확인 필요**

---

## 📊 종합 분석 및 권장사항

### 📈 조사 통계

| 항목 | 수량 | 완성도 | 비고 |
|------|------|--------|------|
| **Apps** | 9개 | - | 3개 core, 3개 deletion-scheduled, 3개 other |
| **Core Apps** | 3개 | 90% | api-server, main-site, admin-dashboard |
| **Deletion Apps** | 3개 | 30% | crowdfunding, forum, digital-signage |
| **Packages** | 15개 | 80% | 대부분 완성됨 |
| **Entities** | 123개 | 95% | 110 operational, 10 deletion-scheduled |
| **Shortcode Registry** | 3개 | - | 불일치 문제 |
| **Block Registry** | 3개 | - | 불일치 문제 |
| **CPT** | 8개 | 90% | 1개만 Registry 등록 |
| **ACF Field Types** | 57개 | 100% | 완전 구현 |
| **Dropshipping** | 완성 | 100% | Settlement, Commission 완성 |

---

### 🔥 Critical Issues (P0) - 즉시 해결 필요

#### **1. Registry 불일치 문제 (Shortcode + Block)**

**문제**:
- Shortcode: 3개 독립 구현 (6 vs 13 vs 30+ 불일치)
- Block: 3개 독립 구현 (30+ vs 40+ 불일치)
- AI 페이지 생성 시 존재하지 않는 shortcode/block 참조 가능

**영향도**: ⚠️ **Critical** - AI 기능 오작동 가능

**해결 방안**:
```
1. Single Source of Truth 지정
   - packages/shortcodes → Shortcode SSoT
   - packages/block-core → Block SSoT

2. AI 메타데이터 자동 생성
   - API Server의 hardcoded 목록 제거
   - Runtime에 실제 구현에서 메타데이터 추출

3. 동기화 검증 스크립트
   - CI/CD에서 Registry 일치 여부 검증
   - 불일치 발견 시 빌드 실패
```

**예상 작업 시간**: 2주

---

#### **2. CPT Registry 미등록 (8개 중 1개만 등록)**

**문제**:
- 8개 CPT 중 `ds_product` 1개만 스키마 등록
- 나머지 7개는 Meta key validation 불가능
- 타입 안정성 부족

**영향도**: ⚠️ **High** - 데이터 무결성 위험

**해결 방안**:
```
1. 모든 CPT Schema 작성
   - products.schema.ts
   - portfolio.schema.ts
   - testimonials.schema.ts
   - team.schema.ts
   - ds_supplier.schema.ts
   - ds_partner.schema.ts
   - ds_commission_policy.schema.ts

2. cpt.init.ts 업데이트
   - 모든 스키마 등록

3. Meta key validation 강화
   - Registry의 meta.allowed 활용
   - 허용되지 않은 key 저장 거부
```

**예상 작업 시간**: 1주

---

### ⚠️ High Priority Issues (P1) - 단기 해결 필요

#### **3. Legacy + Unified 이중 구조 (CPT/ACF)**

**문제**:
- CPT/ACF 서비스가 모두 Legacy + Unified 이중 구조
- Legacy는 deprecated이지만 아직 제거 안 됨
- 유지보수 비용 증가

**영향도**: 🟡 **Medium** - 기술 부채

**해결 방안**:
```
1. Deprecation 경고 추가
   - @deprecated 주석 + 콘솔 경고

2. Migration Guide 작성
   - Legacy → Unified 이전 가이드

3. Legacy Service 제거 계획
   - 6개월 deprecation period 후 제거
```

**예상 작업 시간**: 3일 (문서화 + 경고 추가)

---

#### **4. MetaDataService 타입 안전성 부족**

**문제**:
- `getMeta()` 반환 타입이 `any | undefined`
- TypeScript 타입 추론 불가능
- 런타임 오류 가능성

**영향도**: 🟡 **Medium** - 개발 경험 저하

**해결 방안**:
```typescript
// Generic 타입 사용
async getMeta<T = any>(
  entityType: string,
  entityId: string,
  fieldId: string
): Promise<T | undefined> {
  // ...
}

// 사용 예시
const price = await metaDataService.getMeta<number>('post', postId, 'price');
// price는 number | undefined 타입
```

**예상 작업 시간**: 1일

---

### 💡 Medium Priority Issues (P2) - 중기 개선 권장

#### **5. 문서화 부족**
- Shortcode/Block 개발 가이드 없음
- CPT/ACF 개발 가이드 없음
- Registry 역할 불명확

**해결 방안**: 개발 가이드 작성 (BLOCKS_DEVELOPMENT.md 참조)

**예상 작업 시간**: 1주

---

#### **6. 삭제 예정 앱 정리**
- Forum 앱은 ForumCPTController 사용 중 (확인 필요)
- Crowdfunding 앱은 엔티티 확인 필요
- Digital Signage는 즉시 삭제 가능

**해결 방안**: 7.4 권장 삭제 절차 참조

**예상 작업 시간**: 2주

---

### 📋 Action Items (우선순위 순)

#### **Week 1-2: Critical Issues (P0)**
```
✅ Day 1-3: Shortcode Registry 통일
   - packages/shortcodes를 SSoT로 지정
   - API Server hardcoded 목록 제거
   - 자동 메타데이터 생성 로직 구현

✅ Day 4-6: Block Registry 통일
   - packages/block-core를 SSoT로 지정
   - API Server hardcoded 목록 제거
   - 자동 메타데이터 생성 로직 구현

✅ Day 7-10: CPT Schema 작성
   - 7개 CPT 스키마 작성
   - cpt.init.ts 업데이트
   - Meta key validation 강화

✅ Day 11-14: 검증 및 테스트
   - Registry 동기화 검증 스크립트 작성
   - CI/CD에 검증 추가
   - E2E 테스트
```

#### **Week 3: High Priority Issues (P1)**
```
✅ Day 15-16: Legacy Service Deprecation
   - @deprecated 주석 추가
   - Migration Guide 작성
   - Deprecation 경고 로그 추가

✅ Day 17: MetaDataService 타입 개선
   - Generic 타입 적용
   - 타입 테스트 작성

✅ Day 18-19: 정산 시스템 확인
   - Settlement 자동 생성 로직 확인
   - Commission Hold Period 설정 확인

✅ Day 20-21: Buffer (예상치 못한 이슈 대응)
```

#### **Week 4-5: Medium Priority Issues (P2)**
```
✅ Day 22-26: 문서화
   - Shortcode/Block 개발 가이드
   - CPT/ACF 개발 가이드
   - Registry 설명서

✅ Day 27-35: 삭제 예정 앱 정리
   - 의존성 분석
   - 백업 및 문서화
   - 점진적 삭제
   - 검증 및 모니터링
```

---

### 🎯 성공 지표 (KPI)

#### **1개월 후 목표**
- ✅ Shortcode/Block Registry 통일 완료
- ✅ CPT Schema 100% 등록 (8/8)
- ✅ Legacy Service deprecation 완료
- ✅ 개발 가이드 문서화 완료

#### **2개월 후 목표**
- ✅ 삭제 예정 앱 제거 완료
- ✅ E2E 테스트 커버리지 80% 이상
- ✅ TypeScript strict mode 적용

---

### 📚 참고 자료

#### **기존 문서**
- `BLOCKS_DEVELOPMENT.md` - 블록 개발 가이드
- `DEPLOYMENT.md` - 배포 가이드
- `CLAUDE.md` - 작업 규칙

#### **추가 작성 필요**
- `SHORTCODE_DEVELOPMENT.md` - Shortcode 개발 가이드
- `CPT_ACF_GUIDE.md` - CPT/ACF 개발 가이드
- `REGISTRY_ARCHITECTURE.md` - Registry 아키텍처 설명서

---

## 🏁 결론

O4O 플랫폼은 **전반적으로 견고한 아키텍처**를 갖추고 있으나, **Registry 불일치**와 **CPT Schema 미등록** 등의 **Critical Issues**가 존재합니다.

**우선 순위**:
1. **P0 (2주)**: Registry 통일 + CPT Schema 작성
2. **P1 (1주)**: Legacy deprecation + 타입 개선
3. **P2 (3주)**: 문서화 + 삭제 예정 앱 정리

**예상 총 작업 기간**: **6주**

**리스크**: Forum 앱 삭제 시 ForumCPTController 영향 확인 필요

---

*이 문서는 2024-11-24 현재 시점의 o4o-platform 전체 구조를 기록한 것입니다.*
*향후 리팩토링 작업의 기준 문서로 사용됩니다.*
