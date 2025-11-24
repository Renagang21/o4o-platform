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

**조사 진행 상황**: 1단계 완료 (12.5%)
**다음 단계**: 2단계 - Shortcode Registry 조사

---

*이 문서는 2024-11-24 현재 시점의 o4o-platform 전체 구조를 기록한 것입니다.*
*향후 리팩토링 작업의 기준 문서로 사용됩니다.*
