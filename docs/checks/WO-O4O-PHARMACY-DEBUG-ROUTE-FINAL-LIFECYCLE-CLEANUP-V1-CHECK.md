# WO-O4O-PHARMACY-DEBUG-ROUTE-FINAL-LIFECYCLE-CLEANUP-V1 — CHECK

**일자:** 2026-08-08
**선행 체인:** `9bf1ed23f` 긴급 차단 → `32f97773f` debug 8건 판정(6 제거·1 DEV_ONLY·1 REVIEW) → `4971381fb` seed 2건 제거 → **본 커밋** REVIEW 1건 종결
**결과:** `/__debug__/pharmacy` router 전체 제거. **debug route 생명주기 정비 마감.**

---

## 1. route 별 최종 판정

| # | endpoint | 종류 | DB | 판정 |
|---|----------|------|-----|:---:|
| 1 | `GET /` | 약국 목록 SSR | read-only | **A 제거** |
| 2 | `GET /deactivate?id=` | 비활성화 확인 페이지 | read-only | **A 제거** |
| 3 | `POST /deactivate` | **상태 변경** | `UPDATE organizations SET "isActive"=false` + `UPDATE organization_service_enrollments SET status='inactive'` | **A 제거** |
| 4 | `GET /lookup?q=` | 약국 검색 실측 진단 | read-only | **A 제거** |
| 5 | `GET /appointment-trace` | 예약/연결 추적 진단 | read-only | **A 제거** |

**판정: router 전체 삭제.** WO 기본 판정("상태 변경 삭제, 읽기도 소비·사용 근거 없으면 router 전체 삭제")을 그대로 적용했다. 정식 ADMIN API 는 **신설하지 않았다**(WO 제외 항목).

---

## 2. 근거

### 2-1. 소비처 0

`/__debug__/pharmacy` 전 저장소 검색 결과, 외부 호출처가 **0건**이다. 히트는 전부 (a) 컨트롤러 자체의 내부 `<a href>` 링크, (b) `register-routes.ts` 등록, (c) 본 정비 체인의 문서다. 프런트·스크립트·테스트·CI·워크플로 호출 없음.

### 2-2. 프로덕션에 등록되지 않으므로 "기존 운영 절차" 일 수 없다

중지 조건 「삭제하면 기존 운영 절차가 사라짐」 검토 결과 **비해당**. `9bf1ed23f`(2026-08-08) 이후 이 router 는 `NODE_ENV !== 'production'` 게이트 안에만 있어 **프로덕션에서 접근 자체가 불가능**했다. 접근 불가 상태의 route 는 현행 운영 절차의 구성요소가 될 수 없다.

### 2-3. 목적 종료 — Git 이력이 보여주는 것

| 일자 | 커밋 | 성격 |
|------|------|------|
| 2026-03-31 | `55cd4e664` | 생성 (약국 목록 + 비활성화) |
| 2026-03-31 | `32ff2fcee` | 컬럼명 수정 |
| 2026-04-01 | `322be4584` | Care 데이터 진단 추가 |
| 2026-04-07 | `97aa5f81a` | `/lookup` 추가 — `WO-O4O-GLYCOPHARM-PHARMACY-SEARCH-DEBUG-MEASUREMENT-V1` |
| 2026-04-08 | `e3d03724e` · `45996daa7` | `/appointment-trace` 추가·수정 — `IR-O4O-GLYCOPHARM-APPOINTMENT-REQUEST-MISSING-IN-PHARMACY-V1` |
| 2026-05-02 | `bf51255ce` | **타 WO 잔재 정리** (glucoseview dead query 제거) |
| 2026-05-09 | `8a0416cd7` | **타 WO 잔재 정리** (Care 백엔드 정리) |
| 2026-08-05 | `4274982e5` | **타 WO 잔재 정리** (GlucoseView 전 계층 제거) |

**기능 목적의 마지막 변경은 2026-04-08 (4개월 전).** 이후 3회 변경은 전부 다른 정리 작업이 이 파일을 따라와야 했던 것으로, 기여가 아니라 **유지 부담**이다. 근거가 된 WO/IR 문서는 `docs/` 에 존재하지 않는다(일회성 실측, 종결).

### 2-4. `/appointment-trace` 는 이미 부분 작동 불능

`20260601000000-DropCareTables.ts` 로 `care_pharmacy_link_requests` · `care_appointments` 가 DROP 됐고, `8a0416cd7` 이 해당 쿼리를 제거했다. 그러나 렌더 코드는 `result.link_requests` · `result.appointments` 를 그대로 출력한다 — **대입이 어디에도 없어 항상 `undefined`**. 자동 진단 블록도 `Array.isArray(undefined)` 로 전부 skip 된다. 진단 대상이 사라진 진단 페이지다.

### 2-5. `POST /deactivate` 의 실제 위험

저장소 전체에서 **약국 조직을 비활성화하는 유일한 코드 경로**였다(그 외 `UPDATE organizations SET "isActive"` 는 전부 `= true` 복구 또는 일회성 repair migration). 즉 "정식 API 로 전환" 할 원본이 아니라, **설계 없이 만들어진 유일본**이다.

인증 없음 · 사유 없음 · 감사 로그 없음 · 재활성화 경로 없음 상태로 다음에 연쇄한다:

| 소비처 | 영향 |
|--------|------|
| `modules/glycopharm/resolve-pharmacy.ts:34` | 환자 검색 SoR 에서 약국 소멸 |
| `routes/glycopharm/pharmacy-context.middleware.ts:87` | enrollment `status='active'` 탈락 → 해당 약국 사용자의 약국 컨텍스트 상실 |
| `modules/platform/platform-hub.controller.ts:144` | `activePharmacies` KPI 감소 |
| `routes/glycopharm/services/operator-dashboard.service.ts` · `report.service.ts` | 운영자 대시보드·리포트 집계 제외 |
| `routes/platform/physical-store.service.ts` · `store-network.service.ts` | 매장 네트워크 조회 제외 |

한 번의 무인증 POST 가 위 전부를 되돌릴 절차 없이 바꿨다.

---

## 3. 삭제 / 유지 내역

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/debug/pharmacy-debug.controller.ts` | **삭제** (411줄) |
| `apps/api-server/src/bootstrap/register-routes.ts` | 등록 블록 제거, 게이트 주석 현행화 |
| `docs/platform/debug/DEBUG-SSR-TEST-PAGE-GUIDE-V1.md` | §8 표·제거 이력 현행화, 상태 변경 도구 금지 원칙 명시 |
| `docs/checks/WO-O4O-API-DEBUG-SEED-ROUTE-OPERATIONAL-BOUNDARY-CLEANUP-V1-CHECK.md` | 보류 1 종결 반영 |

**DEV_ONLY 유지: 없음.** 읽기 3종도 소비·사용 근거가 없어 전부 제거했다.
**남은 backend debug router: `/__debug__/user` 1개** (읽기 전용).

**API·권한·DB 영향:** 정식 API 계약 변경 0 / 권한·RBAC·membership 구조 변경 0 / DB schema·migration·운영 데이터 변경 0. 제거된 것은 프로덕션에 등록되지 않던 debug 표면뿐이다.

---

## 4. 검증 결과

| 항목 | 결과 |
|------|------|
| `pnpm install --frozen-lockfile` | ✅ exit 0 |
| `/__debug__/pharmacy` 등록·참조 재검색 | ✅ 소스 잔존 0 (설명 주석 제외) |
| **`__debug__` 상태 변경 route 잔존** | ✅ **0건** |
| 인증 없는 상태 변경 route 신규 증가 | ✅ 0 (이번 변경은 제거 전용) |
| `npx tsc --noEmit` (api-server) | ✅ exit 0, 오류 0 |
| `pnpm run type-check` (전 서비스) | ✅ `type-check: OK` |
| `pnpm run check:unsafe-routes` (CI 가드) | ✅ 통과 |
| `git diff --check` | ✅ exit 0 |
| dead import | ✅ 0 |

---

## 5. 후속 조건 — 정식 약국 비활성화 기능이 필요해질 경우

임시 debug route 재도입은 금지한다. 신설한다면 최소 다음을 갖춘다.

1. **권한** — `requireAuth` + 서비스 스코프 가드(`require{Service}Scope`). 무인증·시크릿 헤더 금지 (CLAUDE.md §11-1)
2. **사유 필수** — 비활성화 요청에 사유 문자열 필수, 저장
3. **감사 로그** — 누가·언제·무엇을·왜 (`action-log-core`)
4. **재활성화 경로** — 비활성화와 대칭인 복구 API. 단방향 금지
5. **영향 고지** — §2-5 의 6개 소비처 영향을 요청자에게 사전 표시
6. **원자성** — `organizations.isActive` 와 `organization_service_enrollments.status` 를 단일 트랜잭션으로 처리 (현재 제거된 코드는 두 UPDATE 가 분리되어 부분 실패 가능)
7. **경계 준수** — Store Ops 도메인이므로 `organizationId` 기준 (CLAUDE.md §7 Boundary Policy)

별도 WO 로 설계한다.
