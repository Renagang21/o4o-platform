# CHECK-O4O-KPA-QR-PAGE-CONTENT-E2E-SMOKE-V1

> WO-O4O-KPA-QR-PAGE-CONTENT-E2E-SMOKE-V1 실행 결과
> 실행일: 2026-06-24 · 대상: 프로덕션 `https://kpa-society.co.kr` (API `api.neture.co.kr`)
> 검증 방식: Playwright(chromium headless) + 프론트엔드와 동일한 인증 API 호출 (운영자·약국 토큰)

## 목적

운영자 콘텐츠 허브의 ready 콘텐츠가 QR 템플릿 → 매장 HUB → 매장 → 고객 `/qr/:slug` 까지 **page 타입 inline 본문**으로 렌더되는지 검증. (이전 smoke 에서 link 타입은 PASS, page 타입 미검증.)

## 결과 요약

| # | 단계 | 결과 | 근거 |
|---|------|:---:|------|
| 1 | 운영자 로그인 | ✅ | `/operator` 랜딩, 토큰 발급 |
| 2 | 콘텐츠 생성 (status=`ready`, body HTML) | ✅ PASS | `POST /api/v1/kpa/contents` → 201, status `ready` |
| 3 | QR 템플릿 생성 (`content_hub` picker 대상) | ✅ PASS | `POST /api/v1/kpa/operator/qr/templates` → 201 (targetType=content, kind=content_hub, ref=contentId) |
| 4 | 발행 → 매장 HUB 노출 | ✅ PASS | `PATCH …/templates/:id/publish` → 200 status=`published`; `GET /api/v1/hub/contents?serviceKey=kpa&sourceDomain=qr` 에 템플릿 노출 확인 |
| 5 | 매장 가져오기(import) | ❌ **403 FORBIDDEN** | `POST /api/v1/kpa/stores/:slug/qr/staff/import` → "Not the store owner" (아래 §원인) |
| 6 | page 타입 매장 QR 생성 | ✅ PASS | import 우회: `POST /api/v1/kpa/pharmacy/qr` (org 기반) → 201, landingType=`page`, landingTargetId=contentId (import 산출 row 와 동일 shape) |
| 7 | 고객 `/qr/:slug` inline page 본문 렌더 | ✅ PASS | 앱 셸 redirect 아님, 전용 랜딩 카드에 제목+요약+본문 heading+본문+marker inline 렌더 (육안·텍스트 동시 확인) |
| 8 | 테스트 데이터 정리 | ✅ | 콘텐츠/템플릿/매장 QR 전부 DELETE 200 |

### 7단계 렌더 결과 (실측)

```
[SMOKE] QR page content
smoke
스모크 본문 제목
QR page 타입 inline 렌더 검증용 본문입니다. QRPAGE-MARKER-<ts>
O4O Platform
```

- `finalUrl` 이 `/qr/:slug` 유지(redirect 없음), 고유 marker·본문 heading 모두 DOM 에서 확인. 콘솔/네트워크 QR 오류 0.
- 공개 랜딩 노출 게이트: `store-qr-landing.controller.ts` `EXPOSABLE_CONTENT_STATUS = ['ready','published']` → ready 콘텐츠 inline body 렌더 정상.

## 차단 이슈 (1건) — 매장 가져오기(import) 403

**현상**: 약국 계정으로 `getPharmacyInfo` 가 `storeSlug="네뚜레-약국"` 을 반환하고, 동일 계정으로 `/pharmacy/qr` CRUD(생성/삭제)는 정상 동작하나, **import 만 403 "Not the store owner"**.

**원인**: import 컨트롤러의 소유권 검증이 **`created_by_user_id` 일치**를 요구한다.

> `apps/api-server/src/routes/o4o-store/controllers/qr.controller.ts:96-98`
> `verifyOwner = (pharmacy, userId) => pharmacy.created_by_user_id === userId`

테스트 약국 계정(`renagang21`)은 매장 "네뚜레-약국" 의 **org 멤버**이지만 **`created_by_user_id` 가 아님**. 그래서:
- org 멤버십 기반인 `/pharmacy/qr` CRUD = 통과
- `created_by_user_id` 기반인 import = 403

즉 **소유권 판정 모델 불일치**(import 는 created_by, 나머지 매장 CRUD 는 org 멤버십). 동일 화면(`HubQrLibraryPage`)을 이 계정으로 실제 클릭해도 동일 403 발생.

**영향 범위**: 본 건은 **기존 hub-import 컨트롤러(qr.controller.ts)** 이슈이며, 이번 QR UX/출력 작업(StoreQRPage)과 무관.

**권고(별도 WO 후보)**: import `verifyOwner` 를 매장 CRUD 와 동일한 **org 멤버십 기반**으로 정렬하거나(권장), 검증용으로 `created_by_user_id` == 계정인 약국 계정을 SSOT 에 추가. POP/Blog/Video staff import 도 동일 `verifyOwner` 패턴이라 함께 점검 필요.

> import 자체의 **변환 매핑 정확성**은 컨트롤러 코드(106-108: `targetType='content' → landingType='page', landingTargetId=targetContentRef`)로 정적 확인되며, 6단계에서 동일 shape 의 page QR 을 직접 생성해 7단계 렌더로 등가 검증함.

## 완료 기준 대비

- 콘텐츠 picker 가 ready 콘텐츠를 찾는다 — ✅ (status=ready 생성·노출, picker 필터 `status=ready`)
- QR 템플릿 발행 후 매장 HUB 노출 — ✅
- 매장 가져오기 성공 — ⚠️ **차단(403, 계정 소유권 데이터)** — 직접 page QR 생성으로 등가 우회 검증
- store_qr_codes 에 page 타입 QR 생성 — ✅ (landingType=page, landingTargetId=contentId)
- `/qr/:slug` 에서 redirect 아닌 inline page body 렌더 — ✅
- 콘솔 오류/4xx/5xx 없음 — ✅ (운영자 화면 legal 문서 404는 QR 무관 기존 미시드)
- 테스트 데이터 정리 — ✅

## 결론

**page 타입 콘텐츠의 공개 QR inline 본문 렌더 = PASS.** 운영자 콘텐츠(ready) → QR 템플릿 → 발행 → 매장 HUB 노출까지 전부 동작. 유일한 잔여는 **import 소유권 판정 모델 불일치(403)** 로, 본 QR 콘텐츠/출력 축과 분리된 기존 컨트롤러 사안 → 별도 WO 권고.

> 이로써 QR 콘텐츠 **제작 → 발행 → (가져오기 매핑 정적확인) → 공개 page 렌더 → 출력(이전 CHECK V1)** 축은 운영 가능 상태. import 소유권 정렬만 후속.
