# H7-1: Frontend Service Readiness 조사 보고서

## 개요

| 항목 | 내용 |
|------|------|
| Work Order | H7-1 (조사) |
| 목적 | API Server Hard Cleanup v1 이후 프론트엔드 서비스 운영 가능성 판정 |
| 상태 | **완료** |
| 조사일 | 2026-01-03 (업데이트) |

---

## 1. 서비스별 요약 표

| 서비스 | API 정합성 | 화면 완성도 | 권한 흐름 | 운영 판정 |
|--------|-----------|------------|----------|----------|
| glycopharm-web | 정상 | 부분 완성 | 정상 | ⚠️ Alpha |
| glucoseview-web | 일부 불일치 | 부분 완성 | 정상 | ⚠️ Alpha |
| k-cosmetics-web | 정상 | 초기 수준 | 미구현 | ❌ Dev |
| kpa-society-web | 정상 | 부분 완성 | 미구현 | ⚠️ Alpha |
| neture-web | 정상 | 부분 완성 | 정상 | ⚠️ Alpha |

---

## 2. 서비스별 상세 조사

### 2.1 glycopharm-web

**위치**: `apps/glycopharm-web/`

#### A. API 정합성: 정상

| 호출 API | 서버 존재 | 상태 |
|----------|-----------|------|
| `/glycopharm/applications` | ✅ 존재 | 정상 |
| `/glycopharm/applications/mine` | ✅ 존재 | 정상 |
| `/glycopharm/pharmacies/me` | ✅ 존재 | 정상 |
| `/health` | ✅ 존재 | 정상 |

- API 서버에 glycopharm 라우트 완비 (`apps/api-server/src/routes/glycopharm/`)
- 엔티티: GlycopharmPharmacy, GlycopharmApplication, Display 관련 엔티티

#### B. 화면 완성도: 부분 완성

**구현된 화면**:
- 홈페이지 (랜딩)
- 로그인/회원가입/역할 선택
- 약국 신청 페이지
- 약국 대시보드 (Dashboard, Products, Orders, Patients, Settings)
- 파트너/공급자/운영자 대시보드 (기본)
- 스토어 프론트 (상품 목록, 상세, 장바구니)
- 포럼/교육 페이지

**미완성/Stub 요소**:
- Dashboard 내 데이터는 Mock (stats, recentOrders, topProducts)
- 스토어 실제 결제 흐름 미연결
- CGM 연동 미구현

#### C. 인증/권한 흐름: 정상

- `AuthContext` 구현 완료
- Mock 사용자 기반 로그인 (실제 API 연동 준비됨)
- Role 기반 라우트 보호 (`ProtectedRoute` with `allowedRoles`)
- 지원 역할: pharmacy, supplier, partner, operator, consumer

#### D. 운영 가능성 판정: ⚠️ Alpha

> "도메인 연결 후 노출 가능한가?" → **조건부 YES**

**판정 근거**:
- API 연동 준비 완료
- 화면 흐름은 작동하나 데이터가 Mock
- 실제 사용자 테스트 전 Mock → 실 데이터 전환 필요

---

### 2.2 glucoseview-web

**위치**: `apps/glucoseview-web/`

#### A. API 정합성: 일부 불일치

| 호출 API | 서버 존재 | 상태 |
|----------|-----------|------|
| `/api/v1/glucoseview/customers` | ✅ 존재 | 정상 |
| `/api/v1/glucoseview/customers/:id` | ✅ 존재 | 정상 |
| `/api/v1/glucoseview/customers/stats` | ✅ 존재 | 정상 |

- API 서버에 glucoseview 라우트 존재 (`apps/api-server/src/routes/glucoseview/`)
- **불일치 사항**: 프론트엔드 PatientsPage는 localStorage 기반 고객 관리 사용 (API 미연동)

#### B. 화면 완성도: 부분 완성

**구현된 화면**:
- 홈페이지 (랜딩)
- 회원가입/로그인
- 환자(고객) 관리 페이지 (검색, 등록, 수정)
- 인사이트 페이지
- 설정 페이지
- 관리자 페이지
- 마이페이지
- 승인 대기 페이지

**미완성/Stub 요소**:
- 환자 관리: localStorage 기반 (API 연동 안됨)
- CGM 데이터 연동: UI만 존재, 실제 연동 없음
- PlaceholderChart 컴포넌트 사용 (실제 차트 없음)
- AI 질문 기능: alert만 표시

#### C. 인증/권한 흐름: 정상

- `AuthContext` 구현 완료
- 테스트 계정 기반 로그인 (pharmacist, admin)
- 승인 상태 관리 (pending, approved, rejected)
- `ProtectedRoute`, `PendingRoute` 구현

#### D. 운영 가능성 판정: ⚠️ Alpha

> "도메인 연결 후 노출 가능한가?" → **조건부 YES**

**판정 근거**:
- 화면 구조는 완성
- 실제 데이터 연동이 localStorage 기반으로 비영속
- API 연동 전환 시 운영 가능

---

### 2.3 k-cosmetics-web

**위치**: `services/web-k-cosmetics/`

#### A. API 정합성: 정상

| 호출 API | 서버 존재 | 상태 |
|----------|-----------|------|
| `/health` | ✅ 존재 | 정상 |

- 현재 health check 외 API 호출 없음
- 랜딩 페이지 전용 서비스

#### B. 화면 완성도: 초기 수준

**구현된 화면**:
- 홈페이지만 존재

**화면 구성**:
- HeroSection
- CoreValueSection
- UsagePreviewSection
- CTASection

**미구현**:
- 라우팅 없음 (단일 페이지)
- 상품/매장/주문 관련 기능 전무
- 로그인/회원가입 없음

#### C. 인증/권한 흐름: 미구현

- 인증 시스템 없음
- 권한 분기 없음

#### D. 운영 가능성 판정: ❌ Dev

> "도메인 연결 후 노출 가능한가?" → **NO**

**판정 근거**:
- 랜딩 페이지만 존재
- 실제 서비스 기능 전무
- 마케팅/안내용 랜딩으로만 사용 가능

---

### 2.4 kpa-society-web

**위치**: `services/web-kpa-society/`

#### A. API 정합성: 정상

| 호출 API | 서버 존재 | 상태 |
|----------|-----------|------|
| `/api/v1/organizations` | ✅ 존재 | 정상 |
| `/api/v1/organizations/:id` | ✅ 존재 | 정상 |
| `/api/v1/organizations/tree` | ✅ 존재 | 정상 |
| `/api/v2/roles/apply` | ✅ 존재 | 정상 |
| `/api/v2/roles/applications/my` | ✅ 존재 | 정상 |
| `/health` | ✅ 존재 | 정상 |

- API 서버에 KPA 라우트 존재 (`apps/api-server/src/routes/kpa/`)

#### B. 화면 완성도: 부분 완성

**구현된 화면**:
- 홈페이지 (랜딩)
- 조직 목록/상세 페이지
- 회원 신청 페이지
- 내 신청 목록 페이지

**미구현**:
- 로그인 페이지 (Core Auth 연동 필요)
- 회원 전용 기능
- 관리자 기능

#### C. 인증/권한 흐름: 미구현

- 인증 컨텍스트 없음
- API 호출 시 401 처리 UI만 존재
- 실제 로그인 흐름 없음

#### D. 운영 가능성 판정: ⚠️ Alpha

> "도메인 연결 후 노출 가능한가?" → **조건부 YES**

**판정 근거**:
- 조직 조회, 회원 신청 흐름은 작동
- 로그인 없이 신청 시 401 에러 처리
- Core Auth 연동 시 운영 가능

---

### 2.5 neture-web

**위치**: `apps/neture-web/`

#### A. API 정합성: 정상

| 호출 API | 서버 존재 | 상태 |
|----------|-----------|------|
| `/api/v1/neture/products` | ✅ 존재 | 정상 |
| `/api/v1/neture/products/:id` | ✅ 존재 | 정상 |
| `/api/v1/neture/products/search` | ✅ 존재 | 정상 |
| `/api/v1/neture/partners` | ✅ 존재 | 정상 |
| `/api/v1/neture/orders` | ✅ 존재 | 정상 |
| `/api/v1/auth/login` | ✅ 존재 | 정상 |
| `/api/v1/auth/me` | ✅ 존재 | 정상 |

- API 서버에 neture 라우트 완비 (`apps/api-server/src/routes/neture/`)
- 엔티티: NetureProduct, NeturePartner, NetureOrder, NetureOrderItem

#### B. 화면 완성도: 부분 완성

**구현된 화면**:
- 홈페이지 (추천 상품, 카테고리)
- 상품 목록/상세 페이지
- 장바구니
- 체크아웃 (배송 정보 입력)
- 결제 페이지
- 결제 성공/실패 페이지
- 주문 목록
- 로그인 페이지

**미구현/Stub 요소**:
- 회원가입 페이지 없음
- 마이페이지 (프로필 수정 등) 없음
- 실제 PG 연동 확인 필요

#### C. 인증/권한 흐름: 정상

- `AuthContext` 구현 (Core API 연동)
- JWT 토큰 관리 (localStorage)
- 체크아웃 시 로그인 필수 리다이렉트
- `CartContext` 구현 (장바구니 상태 관리)

#### D. 운영 가능성 판정: ⚠️ Alpha

> "도메인 연결 후 노출 가능한가?" → **조건부 YES**

**판정 근거**:
- B2C 핵심 흐름 (상품 조회 → 장바구니 → 결제) 구현
- API 연동 완료
- 회원가입/마이페이지 등 보조 기능 필요

---

## 3. 서비스별 한 줄 판정

```
glycopharm-web   → ⚠️ Alpha (운영 UI 구현, Mock 데이터 전환 필요)
glucoseview-web  → ⚠️ Alpha (localStorage → API 연동 필요)
k-cosmetics-web  → ❌ Dev (랜딩 페이지만 존재, 기능 전무)
kpa-society-web  → ⚠️ Alpha (인증 연동 필요, 핵심 기능 작동)
neture-web       → ⚠️ Alpha (B2C 흐름 완성, 보조 기능 필요)
```

---

## 4. 공통 문제 유형 목록

### 4.1 인증 관련

| 서비스 | 문제 | 상태 |
|--------|------|------|
| glycopharm-web | Mock 사용자 기반 | API 연동 준비됨 |
| glucoseview-web | 테스트 계정 기반 | API 연동 준비됨 |
| k-cosmetics-web | 인증 없음 | 구현 필요 |
| kpa-society-web | 인증 없음 | Core Auth 연동 필요 |
| neture-web | Core API 연동 | ✅ 정상 |

### 4.2 데이터 저장소

| 서비스 | 현재 저장소 | 비고 |
|--------|------------|------|
| glycopharm-web | Mock 상수 | Dashboard 데이터 |
| glucoseview-web | localStorage | 고객 데이터 비영속 |
| k-cosmetics-web | 없음 | 기능 없음 |
| kpa-society-web | API | ✅ 정상 |
| neture-web | API + localStorage (장바구니) | ✅ 정상 |

### 4.3 UI 미완성 패턴

- **PlaceholderChart**: glucoseview-web에서 실제 차트 대신 사용
- **Mock 통계**: glycopharm-web 대시보드의 매출/주문 데이터
- **CGM 연동**: glycopharm, glucoseview 모두 UI만 존재

---

## 5. 결론

### 5.1 운영 가능 서비스

| 서비스 | 판정 | 조건 |
|--------|------|------|
| neture-web | ⚠️ Alpha | 회원가입/마이페이지 추가 시 운영 가능 |
| kpa-society-web | ⚠️ Alpha | Core Auth 연동 시 운영 가능 |
| glycopharm-web | ⚠️ Alpha | Mock → 실 데이터 전환 시 운영 가능 |
| glucoseview-web | ⚠️ Alpha | API 연동 시 운영 가능 |

### 5.2 추가 정비 필요 서비스

| 서비스 | 판정 | 필요 작업 |
|--------|------|-----------|
| k-cosmetics-web | ❌ Dev | 전체 기능 구현 필요 |

### 5.3 우선순위 제안 (정보 제공용)

1. **neture-web**: B2C 핵심 서비스, 가장 완성도 높음
2. **kpa-society-web**: 인증 연동만으로 운영 가능
3. **glycopharm-web**: 약국 대시보드 활용 가능
4. **glucoseview-web**: CGM 연동 전 기본 관리 가능
5. **k-cosmetics-web**: 추가 개발 필요

---

## 참고 파일

### glycopharm-web
- [App.tsx](apps/glycopharm-web/src/App.tsx)
- [api/glycopharm.ts](apps/glycopharm-web/src/api/glycopharm.ts)
- [contexts/AuthContext.tsx](apps/glycopharm-web/src/contexts/AuthContext.tsx)

### glucoseview-web
- [App.tsx](apps/glucoseview-web/src/App.tsx)
- [services/api.ts](apps/glucoseview-web/src/services/api.ts)
- [contexts/AuthContext.tsx](apps/glucoseview-web/src/contexts/AuthContext.tsx)

### k-cosmetics-web
- [App.tsx](services/web-k-cosmetics/src/App.tsx)
- [api/health.ts](services/web-k-cosmetics/src/api/health.ts)

### kpa-society-web
- [App.tsx](services/web-kpa-society/src/App.tsx)
- [api/kpa.ts](services/web-kpa-society/src/api/kpa.ts)

### neture-web
- [App.tsx](apps/neture-web/src/App.tsx)
- [api/neture.api.ts](apps/neture-web/src/api/neture.api.ts)
- [contexts/AuthContext.tsx](apps/neture-web/src/contexts/AuthContext.tsx)
- [router/NetureRouter.tsx](apps/neture-web/src/router/NetureRouter.tsx)

---

*Generated: 2026-01-03*
*Work Order: H7-1*
