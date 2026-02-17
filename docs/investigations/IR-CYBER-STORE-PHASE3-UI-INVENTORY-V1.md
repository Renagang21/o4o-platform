# IR-CYBER-STORE-PHASE3-UI-INVENTORY-V1

> **Phase 3: 프론트(UI/흐름) 조사 완료**
> **조사일**: 2026-02-17
> **목적**: 사용자 흐름, 신청 UI, 설정 UI 현황 확정

---

## 1. 신청 UI

### 1-1. PharmacyApplyPage (약국 참여 신청)

| 항목 | 값 |
|------|-----|
| **경로** | `/apply/pharmacy` |
| **파일** | `pages/apply/PharmacyApplyPage.tsx` |
| **권한** | 로그인 필요 |

**입력 필드:**
| 필드 | 타입 | 필수 | 비고 |
|------|------|------|------|
| organizationType | select | ✅ | 고정값: 'pharmacy' |
| organizationName | text | ✅ | 약국명 |
| businessNumber | text | - | 사업자번호 |
| serviceTypes | checkbox[] | ✅ | dropshipping, sample_sales, digital_signage |
| note | textarea | - | 추가 메모 |

**⚠️ slug 입력 필드: 없음**

---

### 1-2. MyApplicationsPage (내 신청 목록)

| 항목 | 값 |
|------|-----|
| **경로** | `/apply/my-applications` |
| **파일** | `pages/apply/MyApplicationsPage.tsx` |
| **기능** | 신청 상태 확인 (submitted/approved/rejected) |

---

## 2. 승인 UI (운영자용)

### 2-1. ApplicationsPage (신청 목록)

| 항목 | 값 |
|------|-----|
| **경로** | `/operator/applications` |
| **파일** | `pages/operator/ApplicationsPage.tsx` |
| **권한** | glycopharm:operator 또는 glycopharm:admin |

**기능:**
- 신청 목록 테이블 (약국명, 신청자, 서비스, 상태, 신청일)
- 필터: 상태, 서비스 타입, 조직 유형
- 페이지네이션

---

### 2-2. ApplicationDetailPage (신청 상세 + 승인/반려)

| 항목 | 값 |
|------|-----|
| **경로** | `/operator/applications/:id` |
| **파일** | `pages/operator/ApplicationDetailPage.tsx` |
| **기능** | 신청 상세 확인 + 승인/반려 처리 |

**처리 플로우:**
1. 신청자 정보 확인 (이름, 이메일, 사업자번호)
2. 신청 서비스 확인
3. **승인 버튼** → API 호출 → slug 자동 생성 → 목록으로 이동
4. **반려 버튼** → 반려 사유 입력 모달 → API 호출 → 목록으로 이동

**⚠️ 주의:**
- 승인 시 **slug 직접 지정 UI 없음**
- slug는 API에서 자동 생성됨 (organizationName 기반)

---

## 3. 설정 UI (약국용)

### 3-1. PharmacySettings (약국 설정)

| 항목 | 값 |
|------|-----|
| **경로** | `/pharmacy/settings` (또는 메뉴에서 진입) |
| **파일** | `pages/pharmacy/PharmacySettings.tsx` |
| **권한** | pharmacy 역할 |

**탭 구성:**
| 탭 | 기능 | 구현 상태 |
|----|------|----------|
| 매장 정보 | 약국명, slug, 소개, 연락처, 주소, 템플릿/테마 | ✅ 구현됨 |
| 키오스크/태블릿 | 채널 신청/설정 | ✅ UI 있음 (API TODO) |
| 알림 설정 | 주문/재고/리뷰 알림 토글 | ✅ UI 있음 |
| 결제 설정 | PG 연동 | ❌ "준비 중" |
| 배송 설정 | 배송 정책 | ❌ "준비 중" |
| 보안 | 비밀번호, 2FA, 로그인 기록 | ✅ UI 있음 |

**매장 정보 탭 상세:**
| 필드 | 편집 가능 | 비고 |
|------|----------|------|
| 약국명 | ✅ | text input |
| 매장 URL (slug) | ⚠️ 표시됨 | input 있으나 저장 API 없음 |
| 매장 소개 | ✅ | textarea |
| 연락처/주소/사업자번호 | ✅ | text inputs |
| 레이아웃 템플릿 | ✅ | select (franchise-standard만) |
| 색상 테마 | ✅ | select (neutral/clean/modern/professional) |

**저장:** `storeApi.updateStorefrontConfig(slug, { theme, template })`

---

### 3-2. 키오스크/태블릿 채널 설정

**현재 상태:**
- UI: ✅ 구현됨
- API: ❌ TODO 표시됨 (실제 동작 안함)

**플로우 (설계):**
1. 웹 몰 판매 승인 완료 → 채널 신청 가능
2. 키오스크/태블릿 신청 버튼
3. 운영자 승인 대기
4. 승인 후 URL/PIN/설정 관리

---

## 4. 운영자 콘텐츠 관리

### 4-1. StoreTemplateManagerPage (스토어 템플릿 관리)

| 항목 | 값 |
|------|-----|
| **경로** | `/operator/store-template` |
| **파일** | `pages/operator/store-template/StoreTemplateManagerPage.tsx` |
| **권한** | operator |

**탭 구성:**
| 탭 | 기능 | 구현 상태 |
|----|------|----------|
| Hero 배너 | 운영자 Hero 콘텐츠 관리 | ✅ HeroManagerTab |
| Featured 상품 | 추천 상품 지정 | ✅ FeaturedProductsTab |
| 공지/이벤트 | 스토어 공지 관리 | ✅ EventNoticeTab |

**규칙:**
- 운영자 콘텐츠는 모든 약국 스토어에 최우선 적용
- 약국 콘텐츠보다 운영자 콘텐츠가 항상 우선

---

## 5. 공개 스토어 UI

### 5-1. StoreFront (스토어 메인)

| 항목 | 값 |
|------|-----|
| **경로** | `/store/:slug` |
| **파일** | `pages/store/StoreFront.tsx` |
| **권한** | Public |

**섹션 구성:**
1. Hero 배너 (운영자 > 약국 > 기본)
2. Featured Products
3. 카테고리별 상품
4. 매장 정보

---

## 6. Phase 3 핵심 결론

### 6-1. 신청 UI에서 slug 입력 필드 존재 여부

**❌ 없음**

- PharmacyApplyPage에 slug 입력 필드 없음
- 신청 시 서브디렉토리 지정 불가

### 6-2. 승인 UI에서 slug 수정 기능 존재 여부

**❌ 없음**

- ApplicationDetailPage에 slug 지정 UI 없음
- 승인 버튼 클릭 시 API가 자동 생성

### 6-3. storefront_config 설정 UI 연결 여부

**✅ 연결됨**

- PharmacySettings → 매장 정보 탭
- template, theme 선택 가능
- 저장 시 `updateStorefrontConfig` API 호출

### 6-4. 템플릿 선택/미리보기 UI 존재 여부

**⚠️ 부분 구현**

- 템플릿 선택: ✅ dropdown (franchise-standard만)
- 테마 선택: ✅ dropdown + 색상 미리보기
- 전체 페이지 미리보기: ❌ 없음

---

## 7. 사용자 플로우 요약

### 7-1. 약국 개설 플로우 (현재)

```
1. 로그인
2. /apply/pharmacy → 신청서 작성 (slug 입력 없음)
3. 운영자 승인 대기
4. 승인 시 → slug 자동 생성 (organizationName 기반)
5. /pharmacy/settings → 테마/템플릿 설정
6. /store/:slug → 스토어 공개
```

### 7-2. 채널 확장 플로우 (설계만, API 미구현)

```
1. /pharmacy/settings → 키오스크/태블릿 탭
2. 활성화 신청 버튼
3. 운영자 승인 대기
4. 승인 후 설정 (URL, PIN, 리셋 시간)
5. /store/:slug/kiosk 또는 /tablet 접속
```

---

*Phase 3 완료 - Phase 4(GAP 표 작성)로 진행*
