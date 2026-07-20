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

## 6. 실행 7 — 프로덕션 검증 — ⏳ 배포 후 갱신

- [ ] 매장 목록 = 매장 소유만 / 상세·수정·블록 저장·삭제 정상
- [ ] 미존재 ID GET/PATCH/DELETE 404
- [ ] 타 매장 ID GET/PATCH/DELETE 404
- [ ] 운영자 원본 매장 GET/PATCH/DELETE 404
- [ ] 공급자 조합(트랜잭션 fixture) 404
- [ ] 운영자 원본 코너 적용 거부 / 매장 사본 적용 정상
- [ ] 공개 타블렛 `idle_media` 포함 / Screen Set QR `idle_media` 제외
- [ ] QR archive 410 · restore 후 동일 slug 200
- [ ] 보호 샘플(구강/피부)·current 불변, console/pageerror/API 오류 0

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
