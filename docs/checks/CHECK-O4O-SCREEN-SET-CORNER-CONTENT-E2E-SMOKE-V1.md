# CHECK-O4O-SCREEN-SET-CORNER-CONTENT-E2E-SMOKE-V1

> WO: `WO-O4O-SCREEN-SET-CORNER-CONTENT-E2E-SMOKE-V1`
> 목표: 코너 콘텐츠 제작 → 미리보기 → 실제 태블릿 → QR 모바일까지 **배포 환경 실브라우저**로 전 구간 검증.
> 신규 기능 추가 없음 / DB 구조·migration 변경 없음 / 발견한 실제 결함만 최소 수정.

---

## 1. 검증 환경

| 항목 | 값 |
|------|------|
| 계정 | 약국 경영자(store-owner) 테스트 계정 — 식별자·자격증명 모두 `docs/local/TEST-ACCOUNTS.local.md`(git-ignored) |
| 매장 | 테스트 약국 매장 (`slug = 네뚜레-약국`, org `9c87f46b-57a1-4afe-80bd-60782c49ce96`) |
| 코너 | 구강관리 코너 (`tabletId = c86863d8-c792-476c-b4b1-3aa1169a4395`) |
| Screen Set | **E2E 스모크 코너** `dd81cf73-5cbf-4449-b1c1-fe2820336023` · 템플릿 `corner_information_basic_v1` · 블록 5 · `public_qr_slug = e2e-2` |
| 선택 상품 | p1 케어가글액 8,500 / p2 비판텐연고 12,000 / p3 후시딘연고 6,500 |
| 상품 QR | p1 `3db59f3e-…`(종합비타민 골드, slug `qr-mqypu1b4`, active) · p2 `59b1a52d-…`(역노화 피부관리 3종 세트, slug `3`, active) · p3 **미지정** |
| 공개 URL | 태블릿 `https://kpa-society.co.kr/tablet/네뚜레-약국?tabletId=…` · 모바일 `https://kpa-society.co.kr/qr/e2e-2` |
| API | `https://api.neture.co.kr` (`o4o-core-api`) |
| DB 검증 | cloud-sql-proxy(:15432) + psql **read-only SELECT 전용** |

## 2. 시나리오별 결과

| # | WO §범위 항목 | 결과 | 근거 |
|---|---------------|:----:|------|
| 1 | 코너 콘텐츠 신규 생성 | **PASS** | 제작기에서 신규 세트 생성 → 블록 5 저장 |
| 2 | HTML·이미지 적용 | **PASS** | 제목/문단/목록 2항목 + 이미지가 태블릿 실화면에 그대로 렌더 |
| 3 | 상품 선택·순서 변경 | **PASS** | 저장 순서 p1→p2→p3 이 미리보기·태블릿 동일 |
| 4 | 상품별 QR 선택·변경·해제 | **PASS** | p1·p2 QR 표시, p3(미지정) QR 없음 |
| 5 | 저장 직후 코너 QR 생성 | **PASS** | 저장 시 `store_qr_codes` 60 → 61, slug `e2e-2` 확보 |
| 6 | 제작기 미리보기 | **PASS** | `POST /screen-sets/preview` 가 `product_list` 섹션 반환, 골격이 선택을 가리지 않음(0502a7afb) |
| 7 | 태블릿 대기 화면 QR | **PASS** | idle 화면 코너 QR 노출 |
| 8 | 태블릿 메인 화면 코너 QR·상품 QR | **PASS** | 우상단 "모바일로 더 보기" + 상품 카드 QR |
| 9 | QR 모바일 화면 parity | **PASS** | `/qr/e2e-2` 상품·순서·QR 동일 |
| 10 | 노출 게이트 제외 수 안내 | **PASS** | `offer_id IS NULL` 상품 추가 시 "선택한 상품 중 1개는 …" 배너, 해제 시 소멸 |
| 11 | archive → 410 | **PASS** | 코너 연결 해제 후 보관 → `GET /api/v1/kpa/qr/public/e2e-2` = **410 `SCREEN_SET_INACTIVE`** (직전 200) |
| 12 | restore → 동일 slug | **FAIL → 수정 후 PASS** | §3-B · **배포 후 재검증 §4-A** |
| 13 | 복원 후 모바일 parity 재확인 | **PASS** | 재개통된 `/qr/e2e-2` 상품 3건 순서(p1→p2→p3)·p1·p2 QR·HTML/이미지 모두 보관 전과 동일 |
| 14 | 재보관 → 다시 410 | **PASS** | 검증 종료 후 다시 보관 → 410 `SCREEN_SET_INACTIVE`. 전체 사이클 **410 → 200 → 410** |

## 3. 발견·수정한 결함

### A. 취급 상품이 "(이름 없음)" 으로 표시 (커밋 `0502a7afb`)

`GET /tablets/:id/product-pool` · `GET /product-pool` 두 핸들러가 상품명을 **offer 경유로만** 해석해,
`offer_id IS NULL` 인 진열(취급 상품)은 이름이 비어 보였다.

```sql
LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
LEFT JOIN product_masters pm ON pm.id = COALESCE(spo.master_id, opl.master_id)
```

- 컬럼·테이블 추가 없음(기존 NOT NULL 컬럼 사용), 반환 shape 불변.
- **라이브 확인**: `GET /store/product-pool` 응답의 `offer_id: null` 항목들이 실제 `product_name` 반환.

### B. 보관한 콘텐츠를 복원할 수 없음 (커밋 `4673d2fa6` + `e9cd1691f`) — 이번 스모크에서 확정

보관(`DELETE /screen-sets/:id`)은 `deleted_at = NOW()` **와** `status='archived'` 를 함께 남긴다. 그런데

1. `GET /screen-sets` 는 `s.deleted_at IS NULL` 을 **무조건** 걸어 `includeArchived=true` 여도 보관 항목이 0건.
   → UI '보관' 필터 상시 빈 목록. 보관 확인 문구("‘보관’ 필터에서 다시 확인할 수 있습니다")가 사실과 불일치.
2. `PATCH /screen-sets/:id` 도 `deleted_at IS NULL` 만 매칭 → **복원이 구조적으로 불가능**.
   `WO-O4O-SCREEN-SET-QR-LIFECYCLE-SYNC-V1` 의 QR 재활성 분기 `setScreenSetQrActive(…, true)` 는 도달 불가 dead code 였다.

즉 매장 경영자가 보관을 누르면 콘텐츠와 코너 QR 이 **영구 복구 불가**가 된다.

**최소 수정 (DB 구조·migration 0):**

| 지점 | 변경 |
|------|------|
| `GET /screen-sets` | `deleted_at` 필터를 `includeArchived` 스위치와 같은 축으로 연결. 미지정 시 기존과 동일(`status <> 'archived' AND deleted_at IS NULL`), `true` 면 `(deleted_at IS NULL OR status='archived')`. **이 목록 한 곳만** |
| `PATCH /screen-sets/:id` | status 를 archived 아닌 값으로 되돌리는 요청에 한해 보관 row 매칭 + `deleted_at = NULL`. slug·row 불변 → 같은 slug 로 QR 재개통 |
| `PATCH /screen-sets/:id` **소유권 사전 확인** (`e9cd1691f`) | 위 UPDATE 앞의 `SELECT … deleted_at IS NULL` 소유권 조회가 그대로 남아 있어, 복원 요청이 UPDATE 에 닿기 전에 404 로 끊겼다. 같은 `isRestore` 조건을 사전 확인에도 적용(`OR status='archived'`). `isRestore` 판정을 `statusChange` 계산 앞으로 끌어올린 것 외 로직 변경 없음 |
| `TabletContentLibraryList` | 보관 행에 '보관 해제' 액션 추가(핸들러 미주입 소비처에서는 미노출), 보관 행의 '수정' 액션 숨김 |
| `TabletScreenSetManager` | `handleRestore` — 확인 후 `updateScreenSet(id, {status:'active'})` + reload |

공개 경로 및 다른 `deleted_at` 소비처는 무변경.

### C. 결함 아님으로 확인한 항목

- **보관 409 시 사용자 안내 없음** → 안내는 정상 동작. 코너 연결 해제 시 토스트 "✅ 코너에서 연결을 해제했습니다." 렌더 확인. 앞선 관측 실패는 토스트 3초 자동 소멸로 인한 타이밍 문제였다.
- **비활성 QR 미표시** → 매장 QR UI 에 활성/비활성 토글이 없어(제목·slug·상담 CTA 만) 무단 DB UPDATE 없이 직접 재현 불가. archive 흐름(`setScreenSetQrActive(false)`)으로 대체 검증 — §2-11.

## 4-A. 배포 후 복원 경로 재검증 (2026-08-03, revision `o4o-core-api-03129-87k`)

§2-12 의 최초 PASS 는 `e9cd1691f` 리비전이 **서빙되기 전** 시점에 기록됐다
(문서 커밋 08:17:48Z vs 리비전 Ready 08:27:25Z). 최종 배포본에 대해 다시 실행한 결과:

| # | 요청 (프로덕션 `api.neture.co.kr`) | 결과 |
|---|-----------------------------------|------|
| 1 | `GET /kpa/qr/public/{slug}` (보관 상태) | **410** `SCREEN_SET_INACTIVE` |
| 2 | `GET /store/screen-sets/:id` (보관 상태) | **404** — 상세는 미변경이 설계대로(§3-B "이 목록 한 곳만") |
| 3 | `PATCH /store/screen-sets/:id {status:'active'}` | **200** — `status='active'`, `publicQrSlug` **동일**, row id 동일 |
| 4 | `GET /kpa/qr/public/{slug}` (복원 직후) | **200** — 같은 slug 로 QR 재개통 |
| 5 | `GET /store/screen-sets` (필터 없음) | 복원 세트 1건 노출 |
| 6 | `DELETE /store/screen-sets/:id` (원상 복구) | **200** → 공개 QR 다시 **410** |

- 대상: `4ec1c148-…` `[TEST] media-guard smoke` (slug `test-media-guard-smoke`, 코너 미연결).
  §1 의 `dd81cf73-…`(`e2e-2`) 는 org `9c87f46b` 소속인데 이번 재검증 세션 계정의 매장 스코프가
  org `c9beb4a2` 로 달라 직접 대상이 되지 못했다. 같은 `PATCH` 코드 경로·같은 archived 전제이므로 대체 검증으로 충분하다.
  (`e2e-2` 는 별도로 **410** 재확인 — §6 의 보관 상태가 지금도 유지됨.)
- **검증 전후 상태 동일**: archived 2건 / active 0건, slug 2개 불변. 신규 row·삭제 없음.

## 4-B. §1 정본 대상(`e2e-2`) 실브라우저 복원 재검증 (2026-08-04)

§4-A 는 계정 스코프 문제로 대체 세트를 썼다. 원 스코프(테스트 약국 매장, org `9c87f46b`)로 로그인돼 있던
브라우저 세션을 그대로 이어받아 **§1 의 정본 대상 `dd81cf73-…` / slug `e2e-2`** 를 UI 만으로 처음부터 끝까지 재실행했다.
(§6 마지막 항목의 자격증명 불일치는 이 세션에서 재확인하지 않았다 — 기존 세션 재사용이라 로그인 자체를 거치지 않았다.)

| 단계 | 조작 (실브라우저) | 결과 |
|---|---|---|
| 1 | '보관' 필터 | **17건** 표시 (수정 전에는 0건) — E2E 스모크 코너 포함 |
| 2 | 보관 행 더보기 | **미리보기 / 보관 해제** 2개만 노출 (수정·태블렛 적용·QR 은 숨김) |
| 3 | 사전 baseline `GET /kpa/qr/public/e2e-2` | **410** `SCREEN_SET_INACTIVE` |
| 4 | '보관 해제' → 확인 | 성공. 목록 '사용 가능' 13건으로 복귀, 상태 `사용 가능` |
| 5 | `GET /kpa/qr/public/e2e-2` | **200** — slug `e2e-2`, QR row `3b94e67f-…` **동일**, `isActive: true` |
| 6 | `/qr/e2e-2` 모바일 화면 | 상품 3건 순서 p1→p2→p3, p1·p2 QR, p3 QR 없음, HTML·이미지 — **보관 전과 동일** |
| 7 | 복원된 행 더보기 | 미리보기 / 태블렛에 적용 / QR 보기·출력 / 수정 / 보관 — 정상 5종 복귀('보관 해제' 숨김) |
| 8 | 다시 '보관' (원상 복구) | **410** 재확인 — 전체 사이클 **410 → 200 → 410** |

- **DB (read-only SELECT, 사이클 종료 후)**: `store_qr_codes` **61 불변** / `e2e-2` `is_active=false` (row·slug 보존)
  / 세트 `status='archived'`, `deleted_at IS NOT NULL`, `public_qr_slug='e2e-2'`.
  복원 중간 시점에도 count **61**, `is_active=true`, `deleted_at IS NULL` 로 확인 — **신규 row 생성·삭제 0**.
- 테스트 세트는 §6 대로 다시 **보관 상태**로 남겨 두었다.

## 4. DB 불변 검증 (read-only SELECT)

| 항목 | 결과 |
|------|------|
| 공개 태블릿 GET 전후 `store_qr_codes` row 수 | **61 불변** (저장 시 60→61 이후 공개 경로 write 0) |
| 보관 후 QR row | `slug='e2e-2'`, `is_active = f` — **row·slug 보존**, 삭제 아님 |
| 보관 후 Screen Set | `status='archived'`, `deleted_at IS NOT NULL`, `public_qr_slug='e2e-2'` 보존 |
| 신규 저장 실패 시 부분 저장 | 없음 — 저장/QR 확보가 동일 트랜잭션 |
| 운영자·공급자 편집기 회귀 | 없음 — 변경은 매장 목록 1개 쿼리 + PATCH 복원 분기 + 매장 리스트 UI 로 한정 |

## 5. 배포 · 커밋

| 커밋 | 내용 |
|------|------|
| `0502a7afb` | 미리보기 선택 상품 표시 + product-pool 이름 master_id 경유 해석 |
| `4673d2fa6` | 보관 목록/복원 결함 수정 (§3-B) |
| `6f70a21b5` | pharmacy-hub 카트 테스트의 낡은 Phase 1 마커 단언 제거 (타 트랙 CI 적색 해소, 소스 변경 0) |
| `e9cd1691f` | PATCH 소유권 사전 확인이 보관 row 를 매칭하도록 수정 — 복원 경로 실동작화 (§3-B) |

- Deploy API Server (Cloud Run) / Deploy Web Services (Cloud Run) / Deploy Admin Dashboard / CodeQL — success.
  최종 배포본 = **`o4o-core-api-03129-87k`** (`e9cd1691f` 포함, Ready 2026-08-03T08:27:25Z) — 100% 트래픽. §4-A 는 이 리비전 대상.
- **CI Pipeline 은 HEAD(`9efba8fca`)에서도 여전히 적색이며, 원인은 본 트랙과 무관하다.**
  - `apps/api-server` Jest 실패(`pharmacy-hub-cart-checkout.test.ts`)는 `6f70a21b5` 로 **해소됨** — Phase 2(`b8ddda3b7`)가 `metadata.phase='buyer-order-only'` 마커를 `paymentGroupId` 로 대체하면서 테스트만 갱신되지 않은 낡은 단언이었다.
  - 그 단계가 통과하자 **그동안 가려져 있던 다음 실패가 드러났다**: `Run tests (admin-dashboard Vitest)` 에서 3개 스위트가 `Failed to resolve entry for package "@o4o/auth-client"` 로 collect 실패
    (`hub-notice-contract` / `membership-category-api-paths` / `membership-category-menu-route`, 7 passed / 3 failed).
    `@o4o/auth-client` 는 `main: ./dist/index.js` 인데 `ci-pipeline.yml` 의 Code Quality Check job 은 `@o4o/types` **만** 빌드한다(`pnpm --filter=@o4o/types run build`). job 이 `-e` 라 이전까지는 api-server 단계에서 먼저 멈춰 노출되지 않았을 뿐, 사전 존재하는 CI 빌드 순서 결함이다.
  - 본 트랙이 건드린 파일은 `store-tablet.routes.ts` · `TabletKioskPage.tsx` · KPA 매장 화면 2개 · 문서뿐으로 `apps/admin-dashboard` · `packages/auth-client` 무접촉. **본 WO 범위 밖으로 두고 별도 처리 대상**으로 남긴다.

## 6. 후속

- 스모크용 **E2E 스모크 코너** 세트는 검증 종료 후 보관 상태로 남긴다(운영 데이터 최소 영향). 필요 시 '보관 해제' 로 복구 가능 — §3-B 수정으로 복구 경로가 실제로 동작한다.
- 매장 QR 활성/비활성 토글 UI 부재는 별도 판단 사항(본 WO 범위 밖). 현재 비활성 전이는 screen_set archive 경로로만 발생한다.
- **문구 불일치(경미, 미수정)**: 보관 확인 대화상자는 "‘리스트에서 제거됨’ 필터에서 다시 확인할 수 있습니다" 라고 안내하지만 실제 필터 라벨은 **'보관'** 이다. 기능 결함은 아니고(§3-B 수정으로 목록은 실제로 채워진다) 문구만 어긋난다. 카피 정리는 별도 사항으로 남긴다.
- **CI Pipeline `@o4o/auth-client` 해소 실패**(§5) — Code Quality Check job 이 소비 패키지를 빌드하지 않는 구조 문제. 별도 WO 필요.
- `docs/local/TEST-ACCOUNTS.local.md` 의 약국 경영자 계정(19행) 비밀번호는 프로덕션과 불일치(`INVALID_CREDENTIALS`)한다. 매장 스코프 검증은 KPA 운영자 계정(`kpa:store_owner` 겸유, org `c9beb4a2`)으로 수행했다. 문서 갱신은 별도 사항.
