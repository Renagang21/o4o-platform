# CHECK-O4O-STORE-SCREEN-SET-ORIGIN-ISOLATION-HARDENING-V1

> WO: `WO-O4O-STORE-SCREEN-SET-ORIGIN-ISOLATION-HARDENING-V1`
> 설계: `ADR-O4O-SCREEN-SET-OWNER-SCOPE-MODEL-V1` §D5 (후속 구현 WO #3 — 매장 API 격리 명시화)
> 선행: `WO-O4O-SCREEN-SET-OWNER-SCOPE-SCHEMA-MIGRATION-V1`(스키마) · `WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1`(운영자 원본)
> Date: 2026-07-20
> 성격: 방어적 격리 강화(behavior hardening). **신규 테이블·컬럼·migration·백필 0.**

---

## 0. 결론

매장 Screen Set 의 **모든 접근 경로**(매장 API · 코너 적용/연결 · 공개 타블렛 · Screen Set QR)에 `origin = 'store'` 를 명시 적용했다. 기존에는 `organization_id = $storeOrg` 등가비교만으로 운영자·공급자 원본(org NULL)이 **암묵적으로** 제외되던 것을, 소유 주체 축으로 **명시 격리**한다.

추가로 UPDATE 계열의 **404 판정 결함**을 수정했다: TypeORM `query()` 의 `UPDATE ... RETURNING` 은 `[rows, affectedCount]` 를 반환하는데 빈 배열도 truthy 라, 존재하지 않는 ID 의 DELETE 가 `200 {deleted:true}` 를 반환하고 PATCH 는 `data` 를 배열로 반환하며 404 를 놓쳤다.

---

## 1. 실행 1·2 — 전수 조사 및 누락 지점

`store_tablet_screen_sets` 를 조회/변경하는 코드 소비처 전수(migration 제외):

| # | 경로 | 파일:라인(변경 전) | 기존 소유권 조건 | 누락 |
|---|------|------|------|:---:|
| 1 | 목록 | store-tablet.routes 1209 | `organization_id` + `deleted_at` | origin |
| 2 | 상세 | store-tablet.routes 1235 | `id` + `organization_id` + `deleted_at` | origin |
| 3 | 생성 | store-tablet.routes 1274 | `origin='store'` 리터럴 | supplier_id 명시 |
| 4 | 수정(소유확인) | store-tablet.routes 1291 | `id` + `organization_id` + `deleted_at` | origin |
| 5 | 수정(UPDATE) | store-tablet.routes 1336 | 동상 | origin + **404 판정** |
| 6 | 삭제/보관(UPDATE) | store-tablet.routes 1393 | 동상 | origin + **404 판정** |
| 7 | 블록 저장(소유확인) | store-tablet.routes 1414 | 동상 | origin |
| 8 | 코너 적용(current) | store-tablet.routes 1584 | `organization_id`+`deleted_at`(+status='active') | origin |
| 9 | 코너 연결 목록(JOIN) | store-tablet.routes 1638 | `cc.organization_id` + `s.deleted_at` | origin |
| 10 | 코너 연결 추가 | store-tablet.routes 1658 | `organization_id`+`deleted_at`(+status≠archived) | origin |
| 11 | 공개 resolver(타블렛+QR 공용) | store-public-screen-set-resolve 127 | `organization_id`+`deleted_at`+status≠archived | origin |
| 12 | 공개 /idle 대기영상 블록(JOIN) | store-public-tablet.handler 405 | `s.deleted_at` | origin |
| 13 | QR ensure(자동 발급) | store-screen-set-qr.service 89 | `organization_id`+`deleted_at`+status≠archived | origin |
| 14 | QR 생성 API(screen_set landing) | store-qr-landing.controller 876 | `organization_id`+`deleted_at`+status≠archived | origin |

**범위 제외(의도적)**: `media-library.service.ts:382` 의 `JOIN store_tablet_screen_sets` — 이는 **역방향 미디어 사용처 카운트**(해당 미디어를 참조하는 블록이 있으면 삭제 차단)이며 소유권 접근 경로가 아니다. 여기에 `origin='store'` 를 넣으면 **운영자 원본이 쓰는 미디어를 삭제 허용**하게 되어 오히려 해롭다 → 전 origin 대상 유지.

**draft preview**(`POST /screen-sets/preview`)는 screen set row 를 로드하지 않고 body.blocks 를 즉석 resolve 하므로 격리 대상 row 가 없다(org 스코프만). 변경 없음.

## 2. 실행 3 — `origin='store'` 적용 (14 지점)

위 표 1·2·4·5·6·7·8·9·10·11·12·13·14 에 `AND origin = 'store'`(JOIN 은 `AND s.origin = 'store'`) 추가. 3(생성)은 `supplier_id` 컬럼을 **명시 NULL** 로 추가해 계약을 코드에 고정:

```sql
INSERT INTO store_tablet_screen_sets
  (organization_id, service_key, supplier_id, tablet_id, name, origin, status, template_key, created_by_user_id)
VALUES ($1, NULL, NULL, $2, $3, 'store', $4, $5, $6)
```
→ 매장 생성 계약: `organization_id=현재 매장 · origin='store' · supplier_id=NULL`(status 는 기존대로 draft|active, UI 기본 active).

**공개 채널은 resolver 1곳(11)이 타블렛·QR 공용**이므로 두 채널이 동시에 격리된다(store-qr-landing 은 이 resolver 를 호출 — 직접 쿼리 없음).

## 3. 실행 4 — UPDATE/DELETE 404 판정 수정

`firstReturnedRow(result)` 헬퍼 추가(store-tablet.routes 모듈 스코프):
```ts
// UPDATE ... RETURNING → [rows, affectedCount] / INSERT ... RETURNING → rows
const rows = Array.isArray(result[0]) ? result[0] : result;
return rows[0] ?? null;
```
- **DELETE**: `if (!del?.[0]) return` → `if (!firstReturnedRow(del)) return` → 0-row 이면 `deleted=false` → **404**.
- **PATCH**: `updated = upd[0]`(=rows 배열) → `updated = firstReturnedRow(upd)`(=객체) → 0-row 이면 **404**, 응답 `data` 는 객체.

이로써 **미존재 / 타 매장 / 운영자 원본 / 공급자 원본 / 이미 제거됨** 5 케이스가 모두 404 로 수렴한다(기존 DELETE 는 전부 200 `{deleted:true}` 오응답).

## 4. QR lifecycle 계약 유지

- archive → `setScreenSetQrActive(false)` → 공개 랜딩 **410 Gone**(slug 유지), restore → 재활성 **200**: 이 로직은 `store_qr_codes.is_active` 기반이며 **미변경**.
- 운영자·공급자 원본은 QR row 자체가 없어(13·14 게이트로 발급 차단) 이 경로에 도달하지 않는다.
- QR 은 기존 계약대로 `idle_media` 제외, 타블렛은 포함 — resolver 출력 구조 **무변경**.

## 5. 실행 6 — typecheck·build

- `tsc --noEmit`(변경 파일 5): **0 error**. `tsc -p tsconfig.build.json`(배포 빌드 구성): **0 error**.
- jest 는 이 환경에서 OOM(런너 자원 한계) — 해당 유닛 테스트(resolveTemplateKey/shapeStaticBlock/content_list mock)는 **SQL origin 필터·404 정규화를 커버하지 않으므로** 신호가 아니다. 실제 검증은 §6 프로덕션 실측.

## 6. 실행 7 — 프로덕션 검증 — ✅ PASS (배포 af35b1809, 2026-07-20)

**API 실측**(매장 owner renagang21 / 운영자 sohae2100):

| 검증 | 결과 |
|------|------|
| 매장 목록 = 매장 소유만 | ✅ 12건, 전량 `origin='store'`·org non-null·`supplier_id` NULL |
| 미존재 ID GET/PATCH/DELETE | ✅ **404 / 404 / 404** (기존 DELETE 는 200 `{deleted:true}` 오응답 → 수정됨) |
| 운영자 원본 매장 GET/PATCH/DELETE/PUT blocks | ✅ **전부 404**, 운영자 원본은 사후 생존(operator GET 200) |
| 운영자 원본 코너 **적용**(current) | ✅ **404 `SCREEN_SET_NOT_FOUND`** |
| 운영자 원본 코너 **연결**(link) | ✅ **404 `SCREEN_SET_NOT_FOUND`** |
| 매장 소유 CRUD | ✅ 생성(origin=store·supplier NULL·status=active·QR slug 발급) → GET 200 → PATCH **data=객체**(배열 아님) → PUT blocks 200 → 코너 적용 200 |
| 이미 제거된 세트 재삭제 | ✅ 404 |

**공개 채널**(보호 샘플 구강 코너, 실측):
- 공개 타블렛 `GET /stores/{slug}/tablet/screen?tabletId=` → `mode=screen_set`, sections `[idle_media, corner_description, content_list, product_list, qr_guide]` → **`idle_media` 포함 ✅**
- Screen Set QR `GET /kpa/qr/public/tablet-corner-5` → sections `[corner_description, content_list, product_list, qr_guide]` → **`idle_media` 제외 ✅**, content_list **5 카드**(SEAM CHECK §6 문서값과 일치 = 회귀 0)

**QR lifecycle**(미연결 신규 세트로 격리 테스트):
- active 200 → `status=archived` → **410 Gone** → `status=active` 복원 → **동일 slug 200** ✅ (계약 유지)

**공급자/운영자 origin fixture — 트랜잭션(BEGIN…ROLLBACK, 영구 write 0)**:
`CHK_stss_owner_scope` 를 만족하는 supplier row(org NULL·supplier_id·service_key) + operator row 를 INSERT 후 **하드닝된 실제 predicate** 로 조회:

| predicate | supplier | operator |
|---|:---:|:---:|
| 매장 목록(`org=$storeOrg AND origin='store'`) | 0 | 0 |
| 매장 상세/수정/삭제(`id AND org AND origin='store'`) | **0** | **0** |
| 공개 resolver(`+ status<>'archived'`) | **0** | — |
| QR ensure(`+ status<>'archived'`) | **0** | — |
| **대조군**: 실제 매장 세트 가시성 | **12건 정상 노출**(과차단 0) | |

ROLLBACK 후 fixture row 0 — **영구 데이터 write 0**.

**보호 샘플·current**: 검증 중 테스트 세트를 피부관리 코너에 적용했다가 **원상 복구 완료** — 피부 `current=8c6eb9fe`(피부관리 기본 화면 세트, isCurrent=true) + 원래 5개 연결 유지, 구강 `current=6f10d68e` + 5개 연결 **무변경**. 테스트 산출물(ISO/QRLC/operator fixture) 전량 삭제.

## 7. 변경 파일

```
apps/api-server/src/routes/platform/store-tablet.routes.ts                       (origin 10지점 + firstReturnedRow 404 판정)
apps/api-server/src/routes/platform/store-public/store-public-screen-set-resolve.ts (공개 resolver origin — 타블렛+QR 공용)
apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts     (/idle 대기영상 JOIN origin)
apps/api-server/src/routes/platform/store-screen-set-qr.service.ts                  (QR ensure origin)
apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts     (QR 생성 screen_set origin)
docs/checks/CHECK-O4O-STORE-SCREEN-SET-ORIGIN-ISOLATION-HARDENING-V1.md             (본 CHECK)
```
- **DB migration 0 · 백필 0 · 데이터 write 0**(코드 격리만). resolver 출력 구조·템플릿·제작기 UI **무변경**.

## 8. 중지 조건 점검

| 조건 | 발생? |
|------|:-----:|
| `origin='store'` 가 기존 매장 데이터 접근 차단 | ❌ (기존 22 row 전량 origin='store' — 스키마 migration CHECK §3 실측) |
| 공개 resolver 가 운영자 원본 공개에 의존 | ❌ (운영자 원본은 공개 URL·QR 미발급 — 도달 경로 없음) |
| QR lifecycle 유지에 스키마 변경 필요 | ❌ (is_active 기반 로직 무변경) |
| 매장/운영자 API 미분리로 라우터 재설계 필요 | ❌ (운영자 API 는 선행 WO 에서 별도 라우터로 분리 완료) |

---

## 완료 보고

```
WO-O4O-STORE-SCREEN-SET-ORIGIN-ISOLATION-HARDENING-V1 완료

1. 조사한 경로: 매장 API 7 + 코너 적용/연결/목록 3 + 공개(resolver·/idle) 2 + QR(ensure·생성) 2 = 14 지점
   (+ media-library 역방향 사용처 JOIN 은 의도적 제외 — 운영자 원본 미디어 삭제 오허용 방지)
2. origin='store' 추가: 위 14 지점 전부. 생성은 supplier_id 명시 NULL + origin='store' 계약 고정.
3. 404 판정: firstReturnedRow() 로 실제 반환 row 기준 → 미존재/타매장/운영자/공급자/이미제거 5케이스 모두 404
   (기존 DELETE 는 전 케이스 200 {deleted:true} 오응답). PATCH data 도 배열→객체 정상화.
4. 코너 적용 차단: 운영자 원본 적용(current) 404 / 연결(link) 404. 매장 사본 적용 200 정상.
5. 채널 검증: 공개 타블렛 idle_media 포함(5 sections) / Screen Set QR idle_media 제외(4 sections, content_list 5 카드).
6. QR 회귀: active 200 → archive 410 → restore 동일 slug 200. 계약 유지.
7. 보호 샘플: 검증 중 변경분 원상 복구 완료(피부 current=8c6eb9fe+5연결, 구강 current=6f10d68e+5연결 무변경).
8. DB: migration 0 · 백필 0 · 영구 데이터 write 0(fixture 는 BEGIN…ROLLBACK).
9. typecheck 0(변경파일) / tsconfig.build.json 0 / 프로덕션 API·트랜잭션 fixture 검증 PASS.
   (jest 는 본 환경 OOM — 해당 유닛테스트는 SQL predicate·404 정규화 미커버라 신호 아님)
10. commit af35b1809 + CHECK 갱신 push, Deploy API Server success.
```
