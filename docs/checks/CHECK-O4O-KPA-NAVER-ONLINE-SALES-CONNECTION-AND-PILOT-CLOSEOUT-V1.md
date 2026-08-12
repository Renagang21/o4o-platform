# CHECK-O4O-KPA-NAVER-ONLINE-SALES-CONNECTION-AND-PILOT-CLOSEOUT-V1

> **선행**: [`CHECK-O4O-KPA-NAVER-ONLINE-SALES-INTEGRATION-PILOT-V1`](CHECK-O4O-KPA-NAVER-ONLINE-SALES-INTEGRATION-PILOT-V1.md) (`5dd2a0636`)
> **상태**: **PARTIAL / 중지 보고** — 1~4 완료, **5(네이버 계정 credential 연동 준비)에서 중지**
> **중지 사유**: 네이버 판매자 계정 · 커머스 API센터 애플리케이션 미발급 (사용자 조치 선행)
> **작성일**: 2026-08-12

---

## 0. 요약

| # | 범위 | 상태 |
|---|---|---|
| 1 | `external_channels` 기존 구조 확인 | ✅ 완료 — **테이블 부재 확정** (§1) |
| 2 | `external_channel_product_links` 최종 schema 확정 | ✅ 완료 (§2) |
| 3 | migration 작성 | ✅ 작성 완료 · 프로덕션 스키마 대조 검증 (§3) |
| 4 | 판매 채널 / 판매 조건 입력 UI | ✅ 완료 (§4) |
| 5 | 네이버 계정 credential 연동 준비 | ⛔ **중지** — 자격정보 미발급 |
| 6~10 | Cloud NAT · IP 등록 · E2E · 동기화 · 실채널 차단 검증 | ⛔ 미착수 (5 선행) |

---

## 1. `external_channels` 실측 — **테이블이 존재하지 않는다**

승인 지시는 "가능하면 기존 `external_channels` FK, 기존 테이블 구조가 부적합할 때만 `channel_code`"
였다. 실측 결과는 "부적합"보다 강한 결론이다.

| 확인 축 | 결과 |
|---|---|
| 엔티티 파일 | `apps/api-server/src/entities/ExternalChannel.ts` 존재 (PD-9 잔재) |
| 생성 migration | 저장소 전체 **0건** |
| entity registry (`database/entities.ts`) | **미등록** |
| `connection.ts` synchronize | `false` — 런타임 자동 생성 없음 |
| 저장소 참조 | 엔티티 파일 자신 외 **0건** |
| **프로덕션 실조회** | `SELECT to_regclass('public.external_channels')` → **NULL** |

즉 **FK 로 참조할 채널 마스터가 실재하지 않는다.** `ExternalChannel` 은 배포된 적 없는
설계 스케치다.

**판단**: 이 WO 에서 `external_channels` 를 새로 만들고 seed 까지 넣는 것은,
검증된 적 없는 PD-9 설계를 되살리면서 채널 개념을 2곳으로 갈라놓는다. 그래서 **`channel_code`
(CHECK 제약)** 를 쓴다 — 승인 조건의 예외 조항에 해당한다.

**승격 경로는 파괴적이지 않다** (필요해지는 시점에 수행):

```text
external_channels 생성·seed → external_channel_id 컬럼 추가 → channel_code 로 backfill
→ FK + UNIQUE 교체 → CHK_ecpl_channel_code 제거
```

> **별도 판단 필요**: `ExternalChannel` 엔티티 자체를 **삭제**할지 활성화할지.
> 현재 상태(테이블 없는 dead entity)를 방치하면 다음 세션이 또 "기존 채널 마스터가 있다"고
> 오판한다. 본 WO 범위 밖이라 수정하지 않고 보고한다.

---

## 2. 최종 schema

승인안 대비 변경점은 **`external_channel_id` FK → `channel_code`** 하나뿐이며 사유는 §1 이다.
승인된 나머지(외부 ID 2개 저장 · `channel_input` jsonb · UNIQUE 축)는 그대로 유지했다.

| 컬럼 | 비고 |
|---|---|
| `organization_id` | FK `organizations` ON DELETE CASCADE |
| `master_id` | FK `product_masters` ON DELETE CASCADE |
| `listing_id` | FK `organization_product_listings` ON DELETE **SET NULL** (진열이 내려가도 외부 등록은 남을 수 있다) |
| `channel_code` | CHECK `IN ('NAVER','COUPANG')` |
| `external_origin_product_id` | 네이버 원상품번호 |
| `external_channel_product_id` | 네이버 채널상품번호 — **조회·수정 키** |
| `channel_input` | jsonb — 채널별 판매 조건 |
| `sync_status` | CHECK `IN ('NOT_LINKED','PENDING','LINKED','FAILED','UNLINKED')` |
| `last_synced_at` · `last_error` | |

**추가한 방어 3가지** (승인안에 없던 것 — 전부 무결성 방향)

1. `CHK_ecpl_linked_requires_external_id` — `sync_status='LINKED'` 인데 채널상품번호가 없으면 거부.
   "연동됐다"는 상태가 근거 없이 생기는 것을 막는다.
2. `UQ_ecpl_channel_external_product` (partial unique) — 같은 외부 상품을 두 링크가 소유하지 못한다.
3. `IDX_ecpl_sync_status` (partial, `PENDING`/`FAILED`) — 재동기화 대상 스캔용.

---

## 3. migration — 작성 + 프로덕션 스키마 대조 검증

**파일**: `apps/api-server/src/database/migrations/20270306000000-CreateExternalChannelProductLinks.ts`

적용은 **CI/CD 자동 실행**(main 배포 시)이다. 수동 apply 하지 않았다.

### 3-1. 검증 방법 — 트랜잭션 롤백

프로덕션 DB(Cloud SQL Auth Proxy 경유)에서 **BEGIN → DDL → 동작 probe → ROLLBACK** 으로
실제 스키마에 대해 검증했다. **커밋하지 않았고 잔존물 0**이다.

| probe | 결과 |
|---|---|
| 테이블·FK·인덱스 4종 생성 | ✅ 성공 (실제 `organizations` / `product_masters` / `organization_product_listings` 대상) |
| 실제 진열 row 로 INSERT | ✅ 성공 |
| `LINKED` + 외부 ID 없음 | ✅ **거부됨** (check_violation) |
| `channel_code='GMARKET'` | ✅ **거부됨** (check_violation) |
| `(org, master, channel)` 중복 | ✅ **거부됨** (unique_violation) |
| ROLLBACK 후 `to_regclass` | ✅ **NULL** (잔존 없음) |

### 3-2. entity 등록

`ExternalChannelProductLink` 엔티티를 신설하고 `database/entities.ts` registry 에 등록했다
(그 파일 주석의 "신규 entity 추가는 이 파일에서 한다" 규칙 준수). 등록 순서는 기존 블록 뒤에
추가해 metadata 안정성을 해치지 않는다.

---

## 4. 판매 채널 / 판매 조건 입력 UI

### 4-1. Backend

**mount**: `/api/v1/kpa/store-hub/external-sales` (KPA 한정 — GP/K-Cos 는 storefront 상태가 달라 범위 밖)

| Method · Path | 역할 |
|---|---|
| `GET /channels` | 채널별 연동 요약 + **자격정보 설정 여부** |
| `GET /:channelCode/candidates` | 연동 가능한 진열 상품 (의약품·유형 결측 제외) |
| `GET /:channelCode/links` | 연동 목록 + 판매 조건 결손 |
| `POST /:channelCode/links` | 연동 생성 |
| `PUT /:channelCode/links/:linkId` | 판매 조건 저장 + 전체 결손 실측 |
| `DELETE /:channelCode/links/:linkId` | 연동 해제 |

**가드 적용 2지점** (WO 계약대로 등록·동기화 양쪽):

- `POST .../links` → `EXTERNAL_PRODUCT_REGISTER` 축
- `PUT .../links/:linkId` → `EXTERNAL_PRODUCT_SYNC` 축 (**저장할 때마다 재판정** — 등록 후
  상품 유형이 바뀌었을 수 있다)

컨트롤러는 자체 의약품 규칙을 만들지 않는다. 목록 SQL 의 제외 조건은 편의 필터이고,
**계약은 가드**다(생성 시 가드가 다시 판정한다).

소유권은 `createRequireStoreOwner(dataSource, 'kpa')` 로 강제하고, 요청의 `masterId` 가
실제 그 매장 진열 상품인지 서버에서 재확인한다(요청값 신뢰 금지).

### 4-2. 발견하고 고친 실데이터 함정

`shared_product_descriptions` STORE canonical 은 **4개 언어로 존재**한다
(실측: ko 96,068 / en 63,216 / zh 41,324 / ja 32,270).
`language` 필터 없이 조회하면 국내 마켓인 네이버에 **일본어·중국어 설명이 실릴 수 있다.**
→ `language='ko' AND deleted_at IS NULL` 고정.

### 4-3. Frontend

`온라인 판매 > 판매 설정` 화면에 `ExternalSalesPanel` 을 붙였다. **신규 메뉴·신규 라우트 0건.**

- 판매 조건 10개 항목 입력 폼 (카테고리·재고·배송비·반품비·교환비·주소록 2종·A/S 2종)
- 저장 시 서버가 결손을 실측해 돌려주고, 화면은 "미입력 N건"을 그대로 보여준다
- **자격정보 미설정 배너** — 상태를 숨기지 않는다. 입력은 미리 가능하고 전송만 막힌다
- 쿠팡 탭은 `implemented=false` 로 비활성 (스키마만 준비된 상태를 정직하게 표시)

**빈 상태 처리**: 기존 화면은 legacy B2C 채널 row 가 없으면 조기 return 했다. KPA 는 자체몰
은퇴로 신규 매장에 B2C row 가 없으므로, 그대로 두면 **신규 매장은 외부 판매 진입로가 아예
없다.** 빈 상태에서도 패널을 노출하도록 고쳤다.

---

## 5. 검증 결과

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` api-server | ⚠️ 오류 1건 — **본 WO 무관** (§5-1) |
| `tsc --noEmit` web-kpa-society | ✅ **0 오류** |
| `external-sales-eligibility.spec.ts` | ✅ 33 passed |
| `naver-product-mapper.spec.ts` | ✅ 9 passed |
| migration DDL (프로덕션 스키마 대조) | ✅ probe 5/5 · 잔존 0 |
| 프로덕션 DB write | ✅ **0건** (롤백 검증만) |
| 기존 파일 수정 | 4건 — 전부 additive (§7) |

### 5-1. 범위 외 기존 오류 (지시대로 수정하지 않음)

```text
src/middleware/kpa-branch-scope.middleware.ts(44,3):
  error TS2322: Type '"kpa-branch"' is not assignable to type 'ServiceKey'.
```

커밋 `958f84542` 유래. 이번 트랙과 무관하므로 손대지 않았다. 별도 WO 대상.

### 5-2. 검증 gotcha

`web-kpa-society` 첫 typecheck 에서 `@o4o/ui` 미export 오류가 23건 났는데
**패키지 dist 미빌드로 인한 오진**이었다. `pnpm run build:packages` 후 0 오류.
(프런트 typecheck 전 패키지 빌드 선행 — 기존에도 알려진 함정)

---

## 6. 중지 지점 (5단계)

| 선행 조건 | 주체 | 상태 |
|---|---|---|
| 네이버 스마트스토어 판매자 계정 | **사용자** | ❌ 미발급 |
| 커머스 API센터 애플리케이션 (client_id/secret) | **사용자** | ❌ 미발급 |
| Cloud NAT 정적 egress IP | 인프라 (승인 필요) | ❌ 미구성 |
| API센터 IP 화이트리스트 등록 (최대 3개) | 사용자 | ❌ |

서버는 `NAVER_COMMERCE_CLIENT_ID` · `NAVER_COMMERCE_CLIENT_SECRET` 환경변수만 받으면
adapter 가 즉시 동작한다. 자격정보를 코드·문서·커밋에 넣지 않았다.

**6~10 (Cloud NAT · IP 등록 · E2E · 동기화 · 실채널 차단 검증) 은 미착수**다.

---

## 7. 산출물

**신규**

```text
apps/api-server/src/modules/external-sales/entities/external-channel-product-link.entity.ts
apps/api-server/src/database/migrations/20270306000000-CreateExternalChannelProductLinks.ts
apps/api-server/src/routes/o4o-store/controllers/store-external-sales.controller.ts
services/web-kpa-society/src/api/externalSales.ts
services/web-kpa-society/src/pages/pharmacy/sections/ExternalSalesPanel.tsx
docs/checks/CHECK-O4O-KPA-NAVER-ONLINE-SALES-CONNECTION-AND-PILOT-CLOSEOUT-V1.md
```

**수정 (전부 additive)**

```text
apps/api-server/src/database/entities.ts                  — entity registry 등록
apps/api-server/src/routes/kpa/kpa.routes.ts              — route mount 1줄
apps/api-server/src/modules/external-sales/channels/naver/naver-product.mapper.ts
                                                          — collectMissingChannelInput 추가
services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx
                                                          — 패널 mount + 빈 상태 처리
```

---

## 8. 남은 작업

| # | 작업 | 선행 |
|---|---|---|
| 1 | 네이버 판매자 계정 + API센터 앱 발급 | **사용자** |
| 2 | Cloud NAT 정적 egress IP 구성 + IP 등록 | 인프라 승인 |
| 3 | 상품 1건 E2E (등록→조회→수정→해제) | 1·2 |
| 4 | 의약품 실채널 차단 검증 | 1·2 |
| 5 | 주문 동기화 | 3 |
| 6 | `ExternalChannel` dead entity 처리 (삭제 vs 활성화) | 별도 판단 |
| 7 | `ServiceKey` union `'kpa-branch'` 누락 | 별도 WO |
| 8 | 쿠팡 adapter → 공통 Online Sales 모듈 추출 | 3 |

---

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (`ExternalChannel` dead entity · `ServiceKey` union)
