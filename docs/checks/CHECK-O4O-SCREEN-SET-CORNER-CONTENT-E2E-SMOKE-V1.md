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
| 12 | restore → 동일 slug | **FAIL → 수정 후 PASS** | §3-B 참조 |

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

### B. 보관한 콘텐츠를 복원할 수 없음 (커밋 `4673d2fa6`) — 이번 스모크에서 확정

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
| `TabletContentLibraryList` | 보관 행에 '보관 해제' 액션 추가(핸들러 미주입 소비처에서는 미노출), 보관 행의 '수정' 액션 숨김 |
| `TabletScreenSetManager` | `handleRestore` — 확인 후 `updateScreenSet(id, {status:'active'})` + reload |

공개 경로 및 다른 `deleted_at` 소비처는 무변경.

### C. 결함 아님으로 확인한 항목

- **보관 409 시 사용자 안내 없음** → 안내는 정상 동작. 코너 연결 해제 시 토스트 "✅ 코너에서 연결을 해제했습니다." 렌더 확인. 앞선 관측 실패는 토스트 3초 자동 소멸로 인한 타이밍 문제였다.
- **비활성 QR 미표시** → 매장 QR UI 에 활성/비활성 토글이 없어(제목·slug·상담 CTA 만) 무단 DB UPDATE 없이 직접 재현 불가. archive 흐름(`setScreenSetQrActive(false)`)으로 대체 검증 — §2-11.

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

- Deploy API Server (Cloud Run) / Deploy Web Services (Cloud Run) / Deploy Admin Dashboard / CodeQL — success.
- **CI Pipeline 실패는 범위 밖**: `apps/api-server/src/services/cart/__tests__/pharmacy-hub-cart-checkout.test.ts` 1건(1,236 통과). 최종 변경은 `6acd48a00 feat(pharmacy-hub): add buyer cart and order (Phase 1)`(타 트랙)이며 본 트랙 커밋 이전부터 계속 실패 중.
  - *(추기)* 해당 실패는 `6f70a21b5` 에서 해소됨 — Phase 2(`b8ddda3b7`)가 `metadata.phase='buyer-order-only'` 마커를 `paymentGroupId` 로 대체하면서 테스트만 갱신되지 않은 낡은 단언이었다. 소스 변경 0.

## 6. 후속

- 스모크용 **E2E 스모크 코너** 세트는 검증 종료 후 보관 상태로 남긴다(운영 데이터 최소 영향). 필요 시 '보관 해제' 로 복구 가능 — §3-B 수정으로 복구 경로가 실제로 동작한다.
- 매장 QR 활성/비활성 토글 UI 부재는 별도 판단 사항(본 WO 범위 밖). 현재 비활성 전이는 screen_set archive 경로로만 발생한다.
