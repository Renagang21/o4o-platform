# IR-O4O-MOBILE-PRODUCT-COLLECTION-APP-SCOPE-V1

> 모바일 상품 수집 앱(`services/mobile-app`)의 범위·경계·후속 WO 순서를 고정하기 위한 조사(IR).
>
> 성격: **조사 전용 (코드 변경 없음, 문서 산출).** 첫 구현 WO(`WO-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-V1`)의 범위 제안.
> Baseline: [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §8 (Mobile = 수집, Web = 확정)
> 선행: Phase 4 [`CHECK-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1`](CHECK-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1.md) · Phase 5 [`CHECK-O4O-OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1`](CHECK-O4O-OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1.md) · [`CHECK-O4O-MOBILE-CARE-LEGACY-ROOT-CLEANUP-V1`](CHECK-O4O-MOBILE-CARE-LEGACY-ROOT-CLEANUP-V1.md)
> 작성일: 2026-06-21
> 상태: 조사 완료 · 구현 미착수

---

## 1. 결론 요약 (Executive Summary)

| # | 판정 |
|---|---|
| 1 | **`services/mobile-app` 를 O4O 모바일 상품 수집 앱 canonical root 로 고정한다.** Expo Router 기반 클린 foundation, `tsc --noEmit` **PASS (0 errors)**. |
| 2 | 기존 `/api/v1/mobile/product-drafts` backend foundation 은 **route 에 활성 마운트**되어 있고 7개 endpoint 가 구현 완료 — V1 API foundation 으로 **그대로 사용 가능**. |
| 3 | 모바일 앱은 **상품 자산 후보 수집(draft)만** 담당한다. ProductMaster/ProductIdentifier 직접 생성 금지. 흐름: `모바일 draft → mobile_product_drafts → product_candidates → 운영자/관리자 검토`. |
| 4 | 이미지 업로드·OCR·AI 설명·진열 위치·관리자 정비 화면은 **모두 후속 WO 로 분리**. V1 은 이미지 **선택 A(placeholder 만)** 권장. |
| 5 | 첫 구현은 작은 Shell — `WO-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-V1`. 범위는 §17. |
| 6 | **중단 기준(§16) 어느 항목도 트리거되지 않음** — 구현 진행 가능. 단 R1(로그인 토큰 추출 방식) 은 Shell WO 착수 전 라이브 확인 필요. |

---

## 2. services/mobile-app 현재 상태

### 2.1 패키지 / 런타임

| 항목 | 값 |
|---|---|
| package name | `@o4o/mobile-app` (legacy 루트 삭제로 충돌 해소됨) |
| 프레임워크 | Expo SDK `~53.0.0` + `expo-router ~5.1.11` (typedRoutes) |
| RN / React | `react-native 0.79.6` / `react 19.0.0` |
| 토큰 저장 | `expo-secure-store ~14.2.4` (Native Keystore/Keychain) |
| 플랫폼 | **android 전용** (`app.json` `platforms: ["android"]`, package `com.o4o.mobileapp`) |
| 앱 표시명 | "O4O 운영앱" |
| type-check | `pnpm -C services/mobile-app type-check` → **PASS (exit 0, 0 errors)** ✅ |

### 2.2 라우트 / 화면 구조 (현재)

```text
app/_layout.tsx              RootLayout (AuthProvider + Stack: (auth) / (app))
app/(auth)/_layout.tsx       token 있으면 /(app) redirect
app/(auth)/login.tsx         이메일/비번 로그인 폼
app/(app)/_layout.tsx        token 없으면 /(auth)/login redirect · Tabs (홈 1개)
app/(app)/index.tsx          홈 — disabled placeholder 메뉴 4종
src/contexts/AuthContext.tsx 토큰 복원/로그인/로그아웃
src/api/client.ts            axios 인스턴스 + Bearer 주입 + loginApi
```

홈 화면 placeholder 메뉴(전부 `disabled` "준비 중"): **상품 관리 / 주문 현황 / 사이니지 / 카메라·업로드**.
→ 상품 수집 화면은 이 placeholder 자리를 실제 기능으로 대체하는 형태로 진입한다.

### 2.3 카메라/바코드 라이브러리

- **없음.** `expo-camera`, `expo-barcode-scanner`, `vision-camera` 등 미설치. 바코드/촬영은 native package 추가가 필요한 후속 WO.

### 2.4 선언되었으나 미사용인 의존성 (발견)

- `package.json` 에 `@o4o/types`, `@o4o/auth-utils` 가 `workspace:*` 로 선언되어 있으나 **`app/`·`src/` 어디에서도 import 되지 않는다.**
- 현재 앱은 웹의 `authClient` 가 아니라 **자체 raw axios client**(`src/api/client.ts`)를 사용한다. → 웹 authClient 재사용 구조가 아님(§9).

---

## 3. Backend `mobile_product_drafts` 상태

### 3.1 구현 완료 + route 활성

| 구성요소 | 파일 | 상태 |
|---|---|---|
| Entity | `modules/neture/entities/MobileProductDraft.entity.ts` | ✅ 단방향 nullable ManyToOne(ProductCandidate), ESM 규칙 준수 |
| Service | `modules/neture/services/mobile-product-draft.service.ts` | ✅ CRUD + submit + archive + convertDraftToCandidate |
| Controller | `modules/neture/controllers/mobile-product-draft.controller.ts` | ✅ requireAuth + 소유 경계 |
| Migration | `database/migrations/20260606020000-CreateMobileProductDrafts.ts` | ✅ additive 테이블 + index 8 |
| Route mount | `bootstrap/register-routes.ts:437-444` | ✅ **활성** — `app.use('/api/v1/mobile/product-drafts', …)` (additive, try/catch) |

> route 는 비활성(주석/disabled)이 아니라 **실제 마운트**되어 있음 (§16 중단 기준 해소).

### 3.2 API 엔드포인트 (마운트: `/api/v1/mobile/product-drafts`, guard: `requireAuth`, 소유 경계: `submittedBy = req.user.id`)

| Method | Path | V1 사용 | 비고 |
|---|---|:---:|---|
| POST | `/` | ✅ | draft 생성 (수집 항목 저장). 미지정 시 `sourceApp='mobile_app'` 기본 |
| GET | `/` | ✅ | 본인 draft 목록 (status/serviceKey/org/store/page/limit 필터) |
| GET | `/:id` | ✅ | 본인 draft 상세 |
| PATCH | `/:id` | ✅ | 수정 (`draft`/`submitted` 상태만, 아니면 409) |
| POST | `/:id/submit` | ✅ | 제출 (`draft`→`submitted`) |
| POST | `/:id/convert-to-candidate` | ⏸ V1 제외 | candidate 전환 — §8 방침대로 모바일 UI 비노출 |
| POST | `/:id/archive` | △ 선택 | 보관 (V1 선택 포함 가능) |

### 3.3 상태 전이 가드 (service)

- `draft → submitted` (submitDraft): `draft` 만 가능
- 수정(updateDraft): `draft`/`submitted` 만
- 전환(convertDraftToCandidate): `draft`/`submitted` 만, 이미 전환 시 idempotent
- `convertDraftToCandidate` 는 `ProductCandidateService.createCandidate` + best-effort `matchCandidate` 호출 — **ProductMaster/ProductIdentifier 직접 생성 없음, approveAsNewProductMaster 미호출**.

---

## 4. product_candidates 연결 상태

- `convertDraftToCandidate` 가 `source_type='mobile_draft'`, `source_id=draft.id` 로 `product_candidates` 후보를 생성 → 문서(Phase 4 CHECK)와 **일치**.
- 운영자 검토 UI 는 **이미 존재** — web-neture `/operator/product-candidates` (Phase 5, `CHECK-O4O-OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1`). 목록/상세/재매칭/수동매칭/반려/보관 액션 보유.
- 즉 `모바일 draft → candidate → 운영자 검토` 의 **백엔드·웹 검토 경로가 end-to-end 로 이미 갖춰져 있다.** 모바일 측 수집 UI 만 공백.

> §16 중단 기준 "draft↔candidate 연결이 문서와 다름" → **해당 없음 (일치 확인).**

---

## 5. Baseline §8 정렬 (기준 원칙)

`O4O-PRODUCT-CORE-BASELINE-V1.md §8 Mobile Registration Boundary` 직접 인용 정렬:

```text
§8.2 정책
- 모바일은 정식 등록이 아니라 수집이다. 웹은 검토·확정·활용 설정이다.
- 모바일은 바코드/상품명/이미지/가격수준을 "검토 필요" 상태로 수집(draft)만 한다.
- 확정(매칭/신규 Master 생성/매장 활용 전환)은 웹 검토 큐(product_candidates)에서 수행.
- 모바일 수집 데이터를 ProductMaster 에 직접 확정 저장하지 않는다 (SSOT 오염 방지).
```

본 IR 의 모든 범위 결정은 이 원칙에 종속된다.

---

## 6. 모바일 앱 V1 범위 (포함 / 제외)

### 6.1 V1 포함

```text
- 상품 수집 홈 (placeholder "카메라/업로드"를 실제 진입으로 대체)
- 상품 기본 정보 입력: 상품명 / 바코드(수동 입력) / 제조원 / 판매원 / (선택) 수입원·규격·용량·메모
- POST /api/v1/mobile/product-drafts (draft 생성)
- 내 제출 draft 목록 (GET /)
- draft 상세 (GET /:id)
- 제출 (POST /:id/submit) + 제출 완료 안내 화면
```

### 6.2 V1 제외 (후속 WO)

```text
이미지 GCS 업로드 · OCR · AI 이미지 분석 · AI 상품 설명 생성
진열 위치 등록/코드화 · 스마트 안경 검색
ProductMaster 직접 생성 · 공급자 상품 최종 매칭 · 바코드 정비 · 중복 병합
admin.neture.co.kr 관리자 화면 · POP/QR/블로그/사이니지 제작 연결
권한 세분화 · 품질 점수 체계 · 바코드 스캔(native camera)
```

### 6.3 이미지 처리 V1 기준 — **권장: 선택 A**

| 선택 | 내용 | 판정 |
|---|---|---|
| **A (권장)** | 이미지 UI placeholder 만, 실제 업로드는 후속 WO | ✅ **채택** |
| B | 로컬 촬영/선택 UI 까지, 서버 업로드 없음 | ❌ native camera package 추가 필요 → §14 금지("native package 추가 금지")와 충돌 |
| C | 임시 image URL 문자열 입력만 허용 | △ 가능하나 사용자 동선 부자연(현장에서 URL 없음) |

> 근거: 선택 B 는 `expo-camera`/`expo-image-picker` 등 native package 추가가 필요해 Shell WO 의 "작게 시작" 원칙·`pnpm-lock` 무변경 원칙과 충돌. 백엔드는 `thumbnail_image_url`/`image_urls` 를 이미 받지만, 모바일 V1 에서는 **이미지 필드를 보내지 않는다**(필수 아님 — §10). 이미지는 전용 후속 WO(`WO-O4O-MOBILE-PRODUCT-IMAGE-UPLOAD-V1`)에서 카메라+GCS 파이프라인과 함께 도입.

---

## 7. 화면 / Route 제안 (구현은 후속 WO)

`services/mobile-app` expo-router 기준 제안. **본 IR 에서 구현하지 않음.**

```text
app/(app)/index.tsx                홈 — "상품 수집" 진입 카드 활성화 + 최근 제출 요약
app/(app)/collect/index.tsx        상품 수집 시작 (바코드 수동 입력 / 신규 수집)
app/(app)/collect/new.tsx          상품 기본 정보 입력 → draft 생성/제출
app/(app)/drafts/index.tsx         내 제출 목록 (GET /)
app/(app)/drafts/[id].tsx          제출 상세 (GET /:id)
app/(app)/collect/done.tsx         제출 완료 안내 (또는 모달)
```

탭 구조: 현재 단일 "홈" 탭에 **"내 수집"** 탭 1개 추가 정도로 최소화 권장 (Shell 단계는 탭 추가 없이 홈→스택 push 만으로도 충분).

---

## 8. submit / convert-to-candidate 처리 방침

> **권장: 모바일 V1 은 draft 생성/수정/submit 까지만. candidate 전환은 모바일 UI 에서 직접 호출하지 않는다.**

- 모바일은 `POST /:id/submit` 으로 `submitted` 상태까지만 만든다.
- `convert-to-candidate` 는 운영자/백엔드 자동화/후속 흐름으로 분리(모바일 사용자가 "상품 확정"으로 오해 방지).
  - 후보: (a) 운영자 검토 화면에서 submitted draft 일괄 전환, 또는 (b) submit 시 백엔드 자동 전환 — **이 자동화 자체는 별도 WO 판단** (본 IR 범위 외, mobile_product_drafts/candidate 무변경 원칙).
- **모바일 UI 문구 규칙:**

```text
금지: "상품 등록 완료" / "상품이 등록되었습니다" / "O4O 상품으로 확정되었습니다"
권장: "상품 정보가 제출되었습니다. O4O 관리자가 확인 후 상품 자산에 반영합니다."
```

---

## 9. 인증 / 토큰 조사 결과

| 항목 | 현황 |
|---|---|
| 로그인 흐름 | 존재 — `(auth)/login.tsx` → `loginApi` → `POST /api/v1/auth/login` |
| 토큰 저장 | `expo-secure-store` (`o4o_mobile_access_token`) |
| API 인증 적용 | axios `defaults.headers.common['Authorization'] = 'Bearer <token>'` (`setAuthToken`) |
| `/api/v1/mobile/product-drafts` 호환 | ✅ 호환 — backend guard 는 `requireAuth`(Bearer 토큰). 모바일은 Bearer 헤더 전송 → **인증 방식 정합** |
| 웹 `authClient` 재사용 | ❌ 미사용 — 모바일은 자체 axios. `@o4o/auth-utils` 선언되어 있으나 import 없음(§2.4) |

> **모바일 API 호출 기준은 명확하다: `Authorization: Bearer <secure-store token>`.** 따라서 §16 "인증 구조 불명확" 중단 기준은 **트리거되지 않는다.**

### 9.1 ⚠️ 발견 — 로그인 토큰 추출 위치 불일치 (R1)

`src/api/client.ts` 의 `loginApi` 는 토큰을 **응답 body** 에서 읽는다 (`result.data.accessToken`).
그러나 운영 메모리 기록상 **프로덕션 `/api/v1/auth/login` 은 토큰을 `set-cookie` 헤더로 반환**(body 아님)하는 경우가 있다.

- 영향: 모바일 로그인이 프로덕션에서 body 토큰을 못 받으면 실패 가능.
- 본 IR 에서 라이브 로그인 검증은 수행하지 않음(코드 변경 금지·조사 범위).
- **조치: Shell WO 착수 전 또는 Shell WO 1번 작업으로 실제 디바이스/에뮬레이터 로그인 1회 라이브 확인.** body 미반환이면 `/auth/login` 응답 계약 확인 후 모바일 토큰 추출 로직 보정(또는 모바일 전용 토큰 반환 endpoint 검토). 이는 본 IR 범위 밖, Shell WO 의 선행 점검 항목.

---

## 10. 데이터 매핑안 (모바일 입력 → MobileProductDraft)

| 모바일 입력 | 컬럼 | V1 |
|---|---|:---:|
| serviceKey | `service_key` | 선택(앱 컨텍스트) |
| organizationId | `organization_id` | 선택 |
| storeId | `store_id` | 선택 |
| (자동) sourceApp | `source_app = 'mobile_app'` | **필수(자동)** |
| (자동) submittedBy | `submitted_by = auth user` | **필수(자동, 토큰 유래)** |
| identifierType / identifierValue | `identifier_type` / `identifier_value` | 바코드 시 |
| capturedName | `captured_name` | **필수 후보** |
| capturedManufacturer | `captured_manufacturer` | 선택 |
| capturedBrand / Category / Spec / Unit | 동명 컬럼 | 선택 |
| memo | `memo` | 선택 |
| (이미지) | `thumbnail_image_url` / `image_urls` | **V1 미전송** (선택 A) |

### 10.1 V1 필수값 (권장)

```text
- 상품명(captured_name) 또는 바코드(identifier_value) 중 하나 이상
- source_app = 'mobile_app'  (앱이 자동 세팅; controller 기본값도 mobile_app)
- submitted_by = 인증 사용자 (controller 가 토큰에서 주입)
```

- 이미지는 V1 필수 아님 — 업로드 파이프라인 준비(후속 WO) 후 필수 여부 재결정.
- 판매원/수입원: 현재 entity 에 전용 컬럼 없음(`captured_manufacturer`=제조원만 존재). 판매원/수입원은 V1 에서 `memo` 또는 `raw_payload` 에 담고, 전용 컬럼 필요 시 **별도 entity 변경 WO**(본 IR §14 entity 변경 금지).

---

## 11. admin.neture.co.kr 후속 범위 (구현 안 함 — 제안만)

현재 검토 화면은 web-neture `/operator/product-candidates` (operator 영역)에 존재.

후속 WO 제안:

```text
WO-O4O-ADMIN-PRODUCT-ASSET-CANDIDATE-REVIEW-V1
admin.neture.co.kr → 상품 자산 관리 → 후보 상품 검토
  → 유사 상품 확인 / 기존 ProductMaster 연결 / 신규 ProductMaster 생성 검토
  → 바코드 정비 / 공급자 상품 매칭 / 보류·반려
```

- 기존 `/operator/product-candidates` 는 **유지/이관/재사용 여부를 후속 WO 에서 별도 판단** (본 IR 에서 수정 금지).
- 정렬 주의: 후보 검토 API 는 F6 Boundary Policy 상 service-scoped(operator) / platform-admin all=true 분기 존재(Phase 5 CHECK §10.1). admin 이관 시 scope 모델 재정렬 필요.

---

## 12. 정적 검증 결과

| 항목 | 결과 |
|---|---|
| `pnpm -C services/mobile-app type-check` (`tsc --noEmit`) | ✅ **PASS (exit 0, 0 errors)** |
| backend `mobile_product_drafts` foundation | ✅ Phase 4 CHECK 기준 api-server `tsc --noEmit` 0 errors (본 IR 은 backend 무변경) |
| route 활성 마운트 | ✅ `register-routes.ts:437-444` |
| draft↔candidate 연결 ↔ 문서 일치 | ✅ |

> 본 IR 은 코드 변경 없음(문서 산출). api-server full type-check 는 본 IR 이 backend 를 건드리지 않으므로 재실행하지 않음 — Phase 4 CHECK 의 0-error 정적검증에 의존. (작업 시작 시 working tree 에 타 세션 WIP: `entities.ts`, `glycopharm.routes.ts`, `kpa.routes.ts` — **본 IR 무관, 미접촉**.)

---

## 13. 중단 기준(§16) 점검 — 전부 비트리거

| 중단 조건 | 상태 |
|---|---|
| mobile-app type-check 광범위 실패 | ❌ 비해당 (PASS) |
| `/api/v1/mobile/product-drafts` route 비활성 | ❌ 비해당 (활성 마운트) |
| draft↔candidate 연결이 문서와 다름 | ❌ 비해당 (일치) |
| 인증 구조 불명확 → API 호출 기준 불가 | ❌ 비해당 (Bearer 명확). 단 R1(로그인 토큰 추출) 라이브 점검 필요 |
| 타 세션 WIP 충돌 | ❌ 비해당 (WIP 3파일 무관·미접촉) |

→ **구현 진행 가능.**

---

## 14. 후속 WO 제안 (순서)

| 순서 | WO | 범위 요약 |
|:---:|---|---|
| 1 | `WO-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-V1` | 모바일 수집 홈 + 기본 정보 입력 + draft 생성/submit + 내 제출 목록/상세 + 제출 완료 문구. 이미지=선택 A(placeholder). **선행 점검: R1 로그인 라이브 1회.** |
| 2 | `WO-O4O-MOBILE-PRODUCT-IMAGE-UPLOAD-V1` | 카메라 촬영(native package) + GCS 업로드 파이프라인 + `thumbnail_image_url`/`image_urls` 연결 |
| 3 | `WO-O4O-ADMIN-PRODUCT-ASSET-CANDIDATE-REVIEW-V1` | admin.neture.co.kr 상품 자산 후보 검토/병합/바코드 정비/공급자 매칭 |

### 14.1 Shell WO(1번) 구현 제한 (고정)

```text
- ProductMaster / ProductIdentifier / ProductCandidate / MobileProductDraft entity 변경 금지
- 새 backend endpoint 추가 금지 (기존 7개 중 create/list/detail/patch/submit 만 소비)
- convert-to-candidate 를 모바일 UI 에서 호출 금지 (§8)
- native package 추가 금지 (이미지=placeholder)
- "상품 등록 완료" 류 확정 문구 금지 (§8 권장 문구 사용)
- 모바일 API 인증은 Bearer (secure-store token) 만
```

---

## 15. 기대 결론 (재확인)

```text
services/mobile-app = O4O 모바일 상품 수집 앱 canonical root (고정).
모바일 = 상품 자산 후보 수집(draft)만. 확정·병합·바코드 정비·매칭 = 웹/admin.
V1 API foundation = 기존 /api/v1/mobile/product-drafts (그대로 사용).
이미지·OCR·AI·진열위치·관리자 정비 = 후속 WO 분리.
첫 구현 = 작은 Shell (WO-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-V1).
```

---

**작성:** O4O Platform Team · 2026-06-21
**상태:** 조사 완료. 다음 권장: `WO-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-V1` (선행 R1 로그인 라이브 점검).
