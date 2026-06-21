# CHECK-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-V1

> 모바일 상품 수집 앱 Shell 구현 검증 보고.
>
> WO: `WO-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-V1`
> 선행 IR: [`IR-O4O-MOBILE-PRODUCT-COLLECTION-APP-SCOPE-V1`](IR-O4O-MOBILE-PRODUCT-COLLECTION-APP-SCOPE-V1.md)
> Baseline: [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §8 (모바일 = 수집, 웹 = 확정)
> 작성일: 2026-06-21
> 상태: 구현 완료 · mobile type-check PASS · 라이브 e2e smoke PASS

---

## 1. Summary

`services/mobile-app` 에 상품 정보 **수집(draft) 흐름**을 추가했다. 기존 backend foundation(`/api/v1/mobile/product-drafts`, requireAuth, 본인 소유 경계)을 **그대로 소비**한다. backend / DB / migration / Product Core 엔티티 **무변경** (frontend-only + 문서).

- 홈에서 `상품 수집 시작` / `내 제출 목록` 진입, `이미지/바코드`는 "준비 중" 표시.
- 상품 기본 정보 입력 → draft 생성(`POST /`) + 제출(`POST /:id/submit`).
- 내 제출 목록(`GET /`) + 상세(`GET /:id`), 상세에서 `draft` 상태면 제출 가능.
- 모바일 UI 문구는 "확정 등록"이 아니라 "제출 / 후보" 기준.
- `convert-to-candidate` **미호출**.

검증: `pnpm -C services/mobile-app type-check` → **0 errors**. 프로덕션 API 대상 라이브 e2e(create→submit→list→detail→archive) **PASS**.

---

## 2. R1 로그인 점검 결과 (WO §4)

> **판정: Case B (불일치) — 클라이언트 측 보정으로 해소.** (auth backend 무변경)

라이브 확인(프로덕션 `o4o-core-api`):

| 시나리오 | 결과 |
|---|---|
| `POST /auth/login` (Origin 헤더 없음, 플래그 없음 — RN 기본) | body 에 토큰 **ABSENT** (set-cookie 만). → 기존 모바일 로그인 실패 구조 |
| `POST /auth/login` + `includeLegacyTokens: true` | HTTP 200, 토큰 = **`data.tokens.accessToken`** (len ~2252) |
| `GET /mobile/product-drafts` + `Authorization: Bearer <token>` | HTTP 200 `{items,total}` |
| `GET /mobile/product-drafts` (토큰 없음) | HTTP 401 |

근거(정적): `auth-login.controller.ts` — Phase 6-7 Cookie Auth Primary. body 토큰은 `includeLegacyTokens || isCrossOrigin` 일 때만 포함. `isCrossOriginRequest` 는 Origin 헤더 없으면 `false` → RN 요청은 플래그 없이는 토큰 미수신.

**보정(허용 범위 §4.3-B: client.ts + AuthContext.tsx 한정):**
- `loginApi` 가 `includeLegacyTokens: true` 를 body 에 전송.
- 토큰을 `data.tokens.accessToken` 에서 추출(레거시 `data.accessToken` fallback 유지).
- user 를 `data.user` 에서 추출.

> auth backend 변경 없음 / 쿠키 인증 전환 없음 / 새 login endpoint 없음 / 웹 authClient 이식 없음.

---

## 3. Files Changed

| 파일 | 변경 | 성격 |
|---|---|---|
| `services/mobile-app/src/api/client.ts` | 수정 | R1 보정: `includeLegacyTokens` 전송 + `LoginResponse`(`data.tokens.accessToken`) 정렬 |
| `services/mobile-app/src/contexts/AuthContext.tsx` | 수정 | 토큰 추출 위치 보정 + `User.displayName` 추가 |
| `services/mobile-app/src/api/mobileProductDrafts.ts` | 신규 | draft API client (create/list/get/submit) + 상태 라벨 |
| `services/mobile-app/app/(app)/_layout.tsx` | 수정 | Tabs → Stack 전환(수집 화면 push 동선) |
| `services/mobile-app/app/(app)/index.tsx` | 수정 | 홈 메뉴를 상품 수집 진입으로 정리 + 안내 문구 |
| `services/mobile-app/app/(app)/collect/index.tsx` | 신규 | 상품 수집 시작(안내 + 신규 제출 진입 + 준비중 표시) |
| `services/mobile-app/app/(app)/collect/new.tsx` | 신규 | 기본 정보 입력 + 임시 저장 / 제출 |
| `services/mobile-app/app/(app)/collect/done.tsx` | 신규 | 제출 완료 안내 |
| `services/mobile-app/app/(app)/drafts/index.tsx` | 신규 | 내 제출 목록 |
| `services/mobile-app/app/(app)/drafts/[id].tsx` | 신규 | 제출 상세 + draft 상태 제출 |
| `docs/investigations/CHECK-O4O-MOBILE-PRODUCT-COLLECTION-APP-SHELL-V1.md` | 신규 | 본 문서 |

> backend(api-server) · DB · migration · 엔티티 · `/operator/product-candidates` · admin 화면 **무변경**.

---

## 4. 화면 / Route

`(app)` 레이아웃을 `Tabs` → `Stack` 으로 전환(홈 → push 동선). Route(그룹 `(app)` 은 URL 미포함):

```text
/            (app)/index.tsx        홈 — 상품 수집 시작 / 내 제출 목록 / (준비중) 이미지·바코드
/collect     collect/index.tsx      수집 시작 안내 + 신규 제출 진입
/collect/new collect/new.tsx        상품 기본 정보 입력 → 임시저장 / 제출
/collect/done collect/done.tsx      제출 완료 안내
/drafts      drafts/index.tsx       내 제출 목록 (focus 시 새로고침, pull-to-refresh)
/drafts/[id] drafts/[id].tsx        제출 상세 + draft 상태면 제출
```

---

## 5. API Client (`src/api/mobileProductDrafts.ts`)

`apiClient`(Bearer 자동 주입) 기반. 봉투 `{ success, data }` 파싱.

| 함수 | endpoint | V1 |
|---|---|:---:|
| `createDraft(payload)` | POST `/api/v1/mobile/product-drafts` | ✅ |
| `listDrafts(params?)` | GET `/api/v1/mobile/product-drafts` | ✅ |
| `getDraft(id)` | GET `/api/v1/mobile/product-drafts/:id` | ✅ |
| `submitDraft(id)` | POST `/api/v1/mobile/product-drafts/:id/submit` (body `{}`) | ✅ |

> `updateDraft` / `archiveDraft` 는 V1 미구현(선택). `convert-to-candidate` **미구현(미호출)**.
> submit 은 Cloud Run POST body 요구사항 때문에 `{}` 를 전송한다.

---

## 6. 입력 / 데이터 매핑

입력 7종 → MobileProductDraft:

```text
상품명     → capturedName
바코드     → identifierType='barcode', identifierValue   (입력 시에만)
제조원     → capturedManufacturer
판매원     → rawPayload.seller
수입원     → rawPayload.importer
규격/용량  → capturedSpec
메모       → memo
(자동)     → sourceApp='mobile_app', rawPayload.mobileCollectionVersion='shell-v1'
```

필수 검증(프론트): **상품명 또는 바코드 중 하나 이상**. 판매원/수입원은 전용 컬럼이 없어 `rawPayload` 에 저장(엔티티 무변경 — IR §10 방침).

---

## 7. create / submit 동작

- **제출하기**: `createDraft` → `submitDraft(draft.id)` → 완료 화면(`/collect/done`). 실패 시 명확한 Alert + 목록 확인 유도.
- **임시 저장**: `createDraft` 만 → `draft` 상태로 저장 → 목록 이동. 이후 상세에서 제출 가능.
- 제출 완료 문구: **"상품 정보가 제출되었습니다. O4O 관리자가 확인 후 상품 자산에 반영합니다."** (금지 문구 "상품 등록 완료" 류 미사용).

---

## 8. 이미지 / convert 처리 (제외 확인)

- 이미지: `collect/new` 에 **placeholder 텍스트만**("다음 단계에서 지원"). `thumbnail_image_url`/`image_urls` **미전송**. `expo-camera`/`expo-image-picker` **미설치**.
- `convert-to-candidate`: 모바일 UI 에서 **미호출**. 모바일은 `submit` 까지만.

---

## 9. 권한 / 인증

- 기존 `requireAuth` + token user 기반만 사용. 역할 세분화·service role gate·관리자 기능 **추가 없음**.
- 모바일 API 인증 = `Authorization: Bearer <secure-store token>` (단일 기준).

---

## 10. Verification Results

| 항목 | 결과 |
|---|---|
| `pnpm -C services/mobile-app type-check` (`tsc --noEmit`) | ✅ **0 errors** |
| R1 로그인 라이브 (플래그 유/무, Bearer drafts, 401) | ✅ PASS (§2) |
| 라이브 e2e: POST create | ✅ 201, `draftStatus=draft`, `sourceApp=mobile_app` |
| 라이브 e2e: 상세 매핑(seller/importer/spec via rawPayload) | ✅ 일치 |
| 라이브 e2e: POST submit (`{}` body) | ✅ 200, `draftStatus=submitted`, `submittedAt` 기록 |
| 라이브 e2e: list `?status=submitted` 에 해당 row 노출 | ✅ present |
| 라이브 e2e: archive 정리 (disposable `[SMOKE]`) | ✅ `draftStatus=archived` |

> 계정: `sohae2100@gmail.com` (SSOT). disposable `[SMOKE]` draft 1건 생성→archive 로 정리. UI 육안(에뮬레이터) 검증은 후속 — 본 검증은 API 계약 e2e + tsc 기준.

---

## 11. What Was Not Changed

- ✅ ProductMaster / ProductIdentifier / ProductCandidate / MobileProductDraft 엔티티 무변경
- ✅ migration 추가 없음 / backend endpoint 추가 없음
- ✅ auth backend 무변경 (클라이언트 토큰 추출만 보정)
- ✅ `/operator/product-candidates` 무변경 / admin.neture.co.kr 화면 없음
- ✅ 이미지 업로드 / OCR / AI / 진열 위치 미구현
- ✅ native package 미추가 / `pnpm-lock.yaml` 무변경
- ✅ `convert-to-candidate` 미호출

---

## 12. Follow-ups

| # | 항목 | 비고 |
|---|---|---|
| F1 | 에뮬레이터/디바이스 UI 육안 smoke | 로그인→수집→제출→목록 화면 동작 |
| F2 | `WO-O4O-MOBILE-PRODUCT-IMAGE-UPLOAD-V1` | 카메라(native) + GCS 업로드 + 이미지 필드 연결 |
| F3 | 판매원/수입원 전용 컬럼 | 필요 시 별도 entity 변경 WO (현재 rawPayload) |
| F4 | submitted draft → candidate 전환 | 운영자/백엔드 자동화 — 별도 WO 판단(IR §8) |
| F5 | `WO-O4O-ADMIN-PRODUCT-ASSET-CANDIDATE-REVIEW-V1` | admin 상품 자산 후보 검토/병합/바코드 정비 |

---

**작성:** O4O Platform Team · 2026-06-21
**상태:** Shell 구현 완료 (type-check + 라이브 API e2e PASS). 다음 권장: UI 육안 smoke → `WO-O4O-MOBILE-PRODUCT-IMAGE-UPLOAD-V1`.
