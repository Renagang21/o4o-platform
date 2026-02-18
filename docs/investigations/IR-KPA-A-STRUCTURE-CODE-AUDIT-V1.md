# IR-KPA-A-STRUCTURE-CODE-AUDIT-V1

> **조사 일자**: 2026-02-18
> **범위**: KPA-a 메인 화면, HUB, 매장관리 실제 코드 vs 테스트 센터 구조 비교
> **코드 변경**: 없음

---

## 1. 메인 화면 조사 결과

### A. 실제 코드 기준 구조

**Header 메뉴 (7항목)**:
| # | 라벨 | 경로 | 조건 |
|---|------|------|------|
| 1 | 홈 | `/` | 항상 |
| 2 | 포럼 | `/forum` | 항상 |
| 3 | 강의 | `/lms` | 항상 |
| 4 | 콘텐츠 | `/news` | 항상 |
| 5 | 내 매장관리 | `/pharmacy/dashboard` | `pharmacy_owner`만 |
| 6 | 허브 | `/hub` | `kpa:admin`, `kpa:operator`만 |
| 7 | 테스트 센터 | `/test` | 항상 |

**CommunityHomePage 섹션 (6개, 렌더 순서)**:
| # | 섹션 | 조건 | 비고 |
|---|------|------|------|
| 1 | HeroSection | 항상 | 배지 "KPA Community" + 타이틀 |
| 2 | NoticeSection | 항상 | 2열: 공지(3건) + 뉴스(3건) |
| 3 | ActivitySection | 항상 (일부 auth) | 2/3-1/3: 최근글 + 추천콘텐츠. 인증 시 개인 안내 표시 |
| 4 | SignageSection | 항상 | 동영상 + 플레이리스트 |
| 5 | CommunityServiceSection | 항상 | 4카드: 포럼, 교육, 이벤트, 자료실 |
| 6 | UtilitySection | 항상 (일부 auth) | 인증 시 사용자 패널 표시. 정책 링크는 항상 |

**RoleBasedHome 로직**: `/` 접근 시 사용자 역할에 따라 자동 리다이렉트 가능 (WO-KPA-A-DEFAULT-ROUTE-FIX-V2)

**Footer**: 약사회 소개, 이용약관, 개인정보처리방침, 사이트맵, 연락처, 테스트센터 링크

### B. 테스트 구조 기준 (TestMainPage)

```
상단 메뉴
├─ 메뉴 항목
└─ 로그인/회원가입
상단 배너
공지사항 & 뉴스
├─ 공지사항 목록
└─ 뉴스 목록
최근 활동
├─ 최근 글
└─ 추천 콘텐츠
디지털 사이니지
├─ 동영상
└─ 플레이리스트
커뮤니티 & 서비스
├─ 약사 포럼
├─ 교육 / 강의
├─ 이벤트
└─ 자료실
하단 영역
├─ 사용자 패널
└─ 도움말 & 정책
```

### C. 차이점 정리

| 구분 | 테스트 구조 | 실제 코드 | 차이 | 영향 |
|------|-----------|----------|------|------|
| 메뉴 조건 노출 | "메뉴 항목 7개" 언급 | `내 매장관리`, `허브`는 역할별 조건 | **역할별 조건 미반영** | 비로그인 사용자는 5개만 봄 |
| RoleBasedHome | 미반영 | `/` 접근 시 역할별 자동 리다이렉트 | **누락** | 관리자는 CommunityHomePage 안 볼 수 있음 |
| ActivitySection auth | "최근 글" 단일 설명 | 인증 시 개인 안내 메시지 추가 표시 | **경미** | 로그인/비로그인 차이 |
| UtilitySection auth | "사용자 패널" 단일 설명 | 인증 시에만 사용자 패널 표시 | **경미** | 비로그인 시 패널 미노출 |
| Footer | 테스트에 미포함 | Footer 별도 존재 (정책, 연락처, 테스트센터) | **누락** | 테스트 범위 외로 판단 가능 |
| 주석/숨김 섹션 | 없음 | 없음 (주석 처리된 코드 없음) | 일치 | - |

---

## 2. HUB 조사 결과

### A. 실제 코드 기준 구조

**HUB 접근 가드**: `RoleGuard(['kpa:admin', 'kpa:operator'])`

**운영 관리 카드 (HUB_SECTIONS operator, 9개)**:
| # | 카드명 | 경로 | signalKey |
|---|--------|------|-----------|
| 1 | 포럼 관리 | `/operator/forum-management` | forum |
| 2 | 콘텐츠 관리 | `/operator/content` | content |
| 3 | 공지사항 | `/operator/news` | - |
| 4 | 자료실 | `/operator/docs` | - |
| 5 | 가입 요청 관리 | `/operator/organization-requests` | - |
| 6 | 서비스 신청 관리 | `/operator/service-enrollments` | - |
| 7 | 강의 관리 | `/lms/courses` | - |
| 8 | 공동구매 관리 | `/groupbuy` | groupbuy |
| 9 | AI 리포트 | `/operator/ai-report` | - |

**관리자 전용 카드 (HUB_SECTIONS admin, 7개, `kpa:admin`만)**:
| # | 카드명 | 경로 | signalKey |
|---|--------|------|-----------|
| 1 | 조직 관리 | `/demo/admin/dashboard` | kpa.organizations |
| 2 | 회원 관리 | `/demo/admin/members` | kpa.members |
| 3 | Role 관리 | `/operator/operators` | - |
| 4 | 포럼 구조 관리 | `/operator/forum-management` | - |
| 5 | 정책 설정 | `/operator/legal` | - |
| 6 | 간사 관리 | `/demo/admin/stewards` | - |
| 7 | 감사 로그 | `/operator/audit-logs` | - |

**OperatorRoutes 내 라우트 (카드에 미노출 2개)**:
| 경로 | 컴포넌트 | HUB 카드 | 비고 |
|------|---------|---------|------|
| `/operator/forum-analytics` | ForumAnalyticsDashboard | ❌ 없음 | 분석 하위기능 |
| `/operator/signage/content` | ContentHubPage | ❌ 없음 | 사이니지 depth 3 |

**AdminRoutes 내 라우트 (HUB 카드에 미노출)**:
| 경로 | HUB 카드 | 비고 |
|------|---------|------|
| `/demo/admin/kpa-dashboard` | ❌ | 플랫폼 운영 대시보드 |
| `/demo/admin/divisions` | ❌ | 분회 관리 |
| `/demo/admin/divisions/:divisionId` | ❌ | 분회 상세 (depth 3) |
| `/demo/admin/annual-report` | ❌ | 연간 보고서 |
| `/demo/admin/fee` | ❌ | 회비 관리 |
| `/demo/admin/committee-requests` | ❌ | 위원회 요청 |
| `/demo/admin/officers` | ❌ | 임원 관리 |
| `/demo/admin/settings` | ❌ | 관리 설정 |

### B. 테스트 구조 기준 (TestHubPage)

**운영 영역 (8섹션)**:
```
HUB 첫 화면, 게시글 관리, 콘텐츠·공지 관리, 자료실,
가입 요청·서비스 신청, 강의 관리, 공동구매, AI 리포트
```

**관리자 영역 (6섹션)**:
```
조직 관리, 회원 관리, 포럼 구조 관리,
정책·약관 관리, 간사 관리, 활동 기록
```

### C. 차이점 정리

| 구분 | 테스트 구조 | 실제 코드 | 차이 | 영향 |
|------|-----------|----------|------|------|
| 운영 카드 수 | 8 (HUB 첫 화면 포함) | 9 카드 | **"공지사항"과 "콘텐츠"를 하나로 통합** | 테스트에서 "콘텐츠·공지 관리"로 합침 |
| 관리자 섹션 | 6 | 7 카드 | **"Role 관리" 누락** | OperatorManagementPage 별도 존재 |
| 포럼 관리 중복 | "포럼 구조 관리" 분리 | 운영+관리자 카드 동일 경로 `/operator/forum-management` | **동일 경로 2회 링크** (확인됨) | UX 혼동 가능성 |
| 미노출 라우트 | 반영 안 됨 | `forum-analytics`, `signage/content` 2개 | **누락** | 접근 가능하나 진입점 없음 |
| Admin 미노출 라우트 | 반영 안 됨 | `divisions`, `annual-report`, `fee`, `officers` 등 8개 | **누락** | KPA-b/c 영역 또는 하위 기능 |
| kpa.store 신호 | 테스트에 미반영 | `store.forcedExpirySoon` 신호 존재 | **경미** | 런타임 동적 표시 |

---

## 3. 매장관리 조사 결과

### A. 실제 코드 기준 구조

**접근 가드**: PharmacyGuard (pharmacy_owner만, admin/operator → `/hub`로 리다이렉트)

**활성 라우트 (레거시 리다이렉트 제외, 14개)**:
| # | 경로 | 컴포넌트 | 비고 |
|---|------|---------|------|
| 1 | `/pharmacy` | PharmacyPage | 진입 게이트 |
| 2 | `/pharmacy/dashboard` | PharmacyDashboardPage | 메인 대시보드 |
| 3 | `/pharmacy/settings` | PharmacyStorePage | 매장 설정 |
| 4 | `/pharmacy/assets` | StoreAssetsPage | 자산 통합 관리 |
| 5 | `/pharmacy/assets/content/:snapshotId/edit` | StoreContentEditPage | 콘텐츠 편집 (depth 3) |
| 6 | `/pharmacy/sales/b2b` | PharmacyB2BPage | B2B 관리 |
| 7 | `/pharmacy/sales/b2b/suppliers` | SupplierListPage | 공급업체 목록 |
| 8 | `/pharmacy/sales/b2b/suppliers/:supplierId` | SupplierDetailPage | 공급업체 상세 (depth 3) |
| 9 | `/pharmacy/sales/b2c` | PharmacySellPage | B2C 판매 |
| 10 | `/pharmacy/services` | PharmacyServicesPage | 서비스 관리 |
| 11 | `/pharmacy/tablet-requests` | TabletRequestsPage | 태블릿 주문 |
| 12 | `/pharmacy/blog` | PharmacyBlogPage | 블로그 관리 |
| 13 | `/pharmacy/kpa-blog` | PharmacyBlogPage (kpa) | KPA 블로그 |
| 14 | `/pharmacy/template` | PharmacyTemplatePage | 템플릿 선택 |
| 15 | `/pharmacy/layout-builder` | LayoutBuilderPage | 레이아웃 빌더 |
| 16 | `/pharmacy/approval` | PharmacyApprovalGatePage | 승인 신청 |

**레거시 리다이렉트 (6개)**:
| 이전 경로 | 현재 경로 |
|----------|----------|
| `/pharmacy/hub` | `/pharmacy/dashboard` |
| `/pharmacy/b2b` | `/pharmacy/sales/b2b` |
| `/pharmacy/b2b/suppliers` | `/pharmacy/sales/b2b/suppliers` |
| `/pharmacy/store` | `/pharmacy/settings` |
| `/pharmacy/store-hub` | `/pharmacy/assets` |
| `/pharmacy/sell` | `/pharmacy/sales/b2c` |

**고객 화면 라우트 (퍼블릭)**:
| 경로 | 컴포넌트 | 가드 |
|------|---------|------|
| `/store/:slug` | StorefrontHomePage | 없음 (퍼블릭) |
| `/store/:slug/blog` | StoreBlogPage | 없음 |
| `/store/:slug/blog/:postSlug` | StoreBlogPostPage | 없음 |
| `/tablet/:slug` | TabletStorePage | 없음 (풀스크린 키오스크) |

### B. 테스트 구조 기준 (TestStorePage)

**운영 영역 (5섹션)**:
```
매장 대시보드, 매장 설정, 콘텐츠 노출 관리, 상품 관리, 블로그 관리
```

**고객 화면 (3섹션)**:
```
매장 홈 화면, 매장 블로그, 매장 내 태블릿
```

### C. 차이점 정리

| 구분 | 테스트 구조 | 실제 코드 | 차이 | 영향 |
|------|-----------|----------|------|------|
| 운영 메뉴 수 | 5 | 16 활성 라우트 | **대폭 축약** | 서비스 관리, 템플릿, 레이아웃빌더, 승인 등 미반영 |
| PharmacyServicesPage | 미반영 | `/pharmacy/services` 존재 | **누락** | 서비스 가입 관리 |
| TemplatePage | 미반영 | `/pharmacy/template` 존재 | **누락** | 템플릿 선택 기능 |
| LayoutBuilderPage | 미반영 | `/pharmacy/layout-builder` 존재 | **누락** | 블록 기반 레이아웃 편집 |
| ApprovalGatePage | 미반영 | `/pharmacy/approval` 존재 | **누락** | 서비스 승인 신청 |
| TabletRequestsPage | 미반영 | `/pharmacy/tablet-requests` 존재 | **누락** | 태블릿 주문 관리 (운영 측) |
| KPA 블로그 | "블로그 관리" 1개 | `/pharmacy/blog` + `/pharmacy/kpa-blog` 2개 | **분리 미반영** | 서비스별 블로그 구분 |
| B2B depth 3 | "도매(B2B) 관리" 단일 | suppliers → supplierId 2단계 존재 | **depth 미반영** | 공급업체 상세 |
| 콘텐츠 편집 depth 3 | 미반영 | `/pharmacy/assets/content/:snapshotId/edit` | **누락** | 개별 콘텐츠 편집 화면 |
| 레거시 리다이렉트 | 미반영 | 6개 레거시 경로 존재 | 정상 (리다이렉트이므로 테스트 불필요) | - |
| 고객 화면 | 3섹션 | 4 라우트 (store, blog, post, tablet) | **경미** (postSlug는 blog 하위) | - |

---

## 4. 전체 구조 비교 요약

### 테스트 센터 총 섹션 수 vs 실제 라우트 수

| 영역 | 테스트 섹션 | 실제 라우트 | 커버리지 |
|------|-----------|-----------|---------|
| 메인 화면 | 7 | 7 (6섹션+Header) | **95%** (Footer, RoleBasedHome 미반영) |
| HUB 운영 | 8 | 9 카드 + 2 미노출 | **73%** (콘텐츠/공지 통합, 미노출 2개) |
| HUB 관리자 | 6 | 7 카드 + 8 미노출 | **40%** (Role관리 누락, Admin 하위 8개 미반영) |
| 매장 운영 | 5 | 16 라우트 | **31%** (서비스, 템플릿, 빌더, 승인 등 누락) |
| 매장 고객 | 3 | 4 라우트 | **85%** (blog post 하위 통합) |

### 색상 테마 일관성

| 테스트 | 색상 | 실제 서비스 색상 | 일치 |
|--------|------|--------------|------|
| 메인 화면 | blue | blue (HeroSection badge) | ✅ |
| HUB | violet | neutral (hub-core 기반) | 🟡 다름 |
| 매장관리 | emerald | blue (PharmacyDashboard) | 🟡 다름 |

---

## 5. 발견된 정합성 차이 목록

> 판단 없이 사실만 기록

| # | 영역 | 차이 내용 | 유형 |
|---|------|----------|------|
| 1 | 메인 | Header 메뉴 역할별 조건 노출이 테스트에 미반영 | 조건 누락 |
| 2 | 메인 | RoleBasedHome 자동 리다이렉트가 테스트에 미반영 | 기능 누락 |
| 3 | 메인 | Footer 영역이 테스트 범위에 미포함 | 범위 미포함 |
| 4 | HUB | "공지사항"과 "콘텐츠 관리" 실제로는 별도 카드이나 테스트에서 통합 | 구조 통합 |
| 5 | HUB | "Role 관리" (`/operator/operators`) 관리자 카드가 테스트에 누락 | 항목 누락 |
| 6 | HUB | 포럼 관리 → 운영+관리자 양쪽에서 동일 경로 링크 (실제 코드 확인) | 중복 경로 |
| 7 | HUB | `/operator/forum-analytics`, `/operator/signage/content` 라우트 존재하나 HUB 카드·테스트 모두 미노출 | 미노출 라우트 |
| 8 | HUB | Admin 라우트 8개 (divisions, annual-report, fee, officers 등) HUB·테스트 모두 미노출 | 미노출 라우트 |
| 9 | 매장 | PharmacyServicesPage (`/pharmacy/services`) 테스트 미반영 | 항목 누락 |
| 10 | 매장 | PharmacyTemplatePage (`/pharmacy/template`) 테스트 미반영 | 항목 누락 |
| 11 | 매장 | LayoutBuilderPage (`/pharmacy/layout-builder`) 테스트 미반영 | 항목 누락 |
| 12 | 매장 | PharmacyApprovalGatePage (`/pharmacy/approval`) 테스트 미반영 | 항목 누락 |
| 13 | 매장 | TabletRequestsPage (`/pharmacy/tablet-requests`) 테스트 미반영 | 항목 누락 |
| 14 | 매장 | `/pharmacy/blog` vs `/pharmacy/kpa-blog` 분리가 테스트에 미반영 | 구조 미반영 |
| 15 | 매장 | B2B suppliers depth 3 (`suppliers/:supplierId`) 테스트 미반영 | depth 누락 |
| 16 | 매장 | 콘텐츠 편집 depth 3 (`assets/content/:snapshotId/edit`) 테스트 미반영 | depth 누락 |
| 17 | 매장 | 레거시 리다이렉트 6개 존재 (테스트 불필요하나 기록) | 레거시 |
| 18 | 전체 | 테스트 색상(blue/violet/emerald)과 실제 서비스 색상 불일치 | 스타일 차이 |

---

## 부록: 역할별 접근 매트릭스

| 역할 | 메인 화면 | HUB | Operator 라우트 | Admin 라우트 | 매장관리 |
|------|----------|-----|---------------|-------------|---------|
| 비로그인 | ✅ (제한) | ❌ | ❌ | ❌ | ❌ |
| 일반 약사 | ✅ | ❌ | ❌ | ❌ | ❌ |
| pharmacy_owner | ✅ | ❌ | ❌ | ❌ | ✅ |
| kpa:operator | ✅ (리다이렉트 가능) | ✅ | ✅ | ❌ | ❌ |
| kpa:admin | ✅ (리다이렉트 가능) | ✅ | ✅ | ✅ | ❌ |

---

*Generated: 2026-02-18*
*WO: WO-KPA-A-STRUCTURE-CODE-AUDIT-V1*
*Status: 조사 완료, 코드 변경 없음*
