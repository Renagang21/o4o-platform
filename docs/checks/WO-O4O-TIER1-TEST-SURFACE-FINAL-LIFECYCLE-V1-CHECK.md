# WO-O4O-TIER1-TEST-SURFACE-FINAL-LIFECYCLE-V1 — CHECK

**일자:** 2026-08-08
**판정:** **제거** — API 5개 + 프런트 `Tier1TestPage` 를 함께 삭제.
**의의:** 코드 차원의 debug·test·internal 위험 surface 정비 **마감**.

---

## 1. endpoint / 화면별 실제 기능

### 1-1. `/api/v1/neture/__test__/tier1/*` (5)

| endpoint | 실제 동작 | 성격 |
|----------|----------|------|
| `POST /create` | `netureService.createSupplierOffer()` — **실제 PUBLIC offer 생성** | 상태 변경 |
| `POST /approve/:offerId` | 승인 + auto-expand 검증 — **실제 승인** | 상태 변경 |
| `GET /listings/:offerId` | listing 상태 조회 | read |
| `POST /supplier-deactivate/:supplierId` | `netureService.deactivateSupplier()` — **실제 공급자 비활성화 + cascade** | 상태 변경 |
| `GET /hub-kpi/:offerId` | Hub KPI 스냅샷 | read |

**fixture 가 아니다.** 결정적 UUID·테스트 prefix 없이 정식 서비스 메서드를 그대로 호출해 **운영 데이터**를 만든다.

### 1-2. `Tier1TestPage` (`/__debug__/neture-tier1`, 670줄)

파일 헤더: *"로그인 없이 독립 실행. 페이지 내 자체 로그인 or Bearer 토큰 직접 입력. raw fetch 사용(authClient 의존 없음). 접근: 공개 라우트"*. 5-step JSON 검증 콘솔이며 기본 API base 는 `https://api.neture.co.kr` (프로덕션).

---

## 2. 소비처 · 접근 주체 · production 노출

| 축 | 결과 |
|----|------|
| **백엔드 등록 조건** | **환경 게이트 없음** — `neture.routes.ts` 에서 무조건 등록 → 프로덕션 활성 |
| **프런트 라우트** | `public.routes.tsx` **공개 라우트**, 환경 게이트 없음 |
| **admin-dashboard 배포** | `deploy-admin.yml` → Cloud Run `o4o-admin-dashboard` → **프로덕션 배포됨** |
| **메뉴·링크 노출** | **0건** — 어떤 sidebar/menu/링크에서도 참조 없음. URL 직접 입력만 |
| **코드 호출처** | 백엔드 `neture.routes.ts` 등록 1곳, 프런트 `public.routes.tsx` 1곳. 그 외 **0** |
| **문서 참조** | archive IR 3건(목록 나열)뿐. 운영 절차 문서 **0** |
| **프로덕션 호출 로그** | **30일간 0건** (§2-1) |

### 2-1. 프로덕션 로그 실측

```
gcloud logging read 'resource.type=cloud_run_revision
  AND resource.labels.service_name="o4o-core-api"
  AND (httpRequest.requestUrl:"__test__/tier1" OR textPayload:"Tier1Test")'
  --freshness=30d
→ 결과 0건
```

**대조군 검증 완료** — 동일 조건에서 `httpRequest.requestUrl:"/api/v1/"` 는 정상적으로 최근 로그를 반환했다(2026-08-08 트래픽 확인). 따라서 0건은 쿼리 오류가 아닌 **진짜 미호출**이다.

> 문서에서 검색되는 "Tier1" 대부분은 **admin surface tier**(`neture:admin` 가드 등급) 라는 **별개 개념**이며 본 테스트 화면과 무관하다.

---

## 3. 인증 · 권한 · DB 영향

| 항목 | 내용 |
|------|------|
| 인증 | 전 endpoint `requireAuth` + `requireNetureScope('neture:admin')` — **인증 자체는 정상** |
| 문제 | 헤더에 **"NOT for production use"** 라고 적힌 채 프로덕션에 등록돼 있었다 |
| DB 쓰기 | `supplier_product_offers` 생성/승인, `neture_suppliers` 비활성화 + listing cascade (F8 Distribution Engine 계약 대상) |
| 감사 | `logger.info` 뿐. 정식 경로가 갖춘 ActionLog 감사(`neture.admin.supplier_deactivate`) 없음 |
| UX 계약 우회 | `WO-O4O-NETURE-SUPPLIER-APPROVAL-CONSOLE-AND-ADMIN-GOVERNANCE-SEPARATION-V1` 이 비활성화에 **사유 필수 + ConfirmActionDialog** 를 도입했으나, 이 endpoint 는 `'Tier1 cascade test deactivation'` 이라는 **하드코딩 사유를 자동 주입**해 우회했다 |

---

## 4. 최종 판정 — 제거

WO 판정 원칙 "운영·개발 어느 쪽에서도 사용 근거가 없으면 페이지와 API를 함께 제거한다" 를 적용했다.

**정식 대체가 전부 존재한다:**

| test endpoint | 정식 경로 |
|---------------|-----------|
| `create` | `supplier-product.controller.ts:84` — 공급자 본인 offer 등록 |
| `approve` | `admin.controller.ts` 승인 route |
| `supplier-deactivate` | `admin.controller.ts:173` — 사유 필수 · tx+FOR UPDATE · 주문/정산 재검증 → 409 `SUPPLIER_DEACTIVATION_BLOCKED` · ActionLog 감사 · `ConfirmActionDialog` |
| `listings` · `hub-kpi` | 정식 admin 화면 + Cloud SQL Proxy 조회 |

**Git 이력이 보여주는 것** — 생성 2026-02-27, 기능 목적 마지막 변경 2026-03-01. 이후 유일한 변경 `cb4dbf9d7`(2026-07-29)은 타 WO 의 "사유 필수" 계약에 **끌려간 incidental patch** 였다. 기여가 아니라 유지 부담이다.

**중지 조건 검토:** 「운영자가 사용하는 유일한 진단·복구 절차가 사라짐」 → 위 표대로 대체 전부 존재하므로 **비해당**. 「production 소비 여부를 판정할 수 없음」 → 로그 실측 + 대조군으로 **판정됨(0건)**.

---

## 5. 변경 내역

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/modules/neture/controllers/neture-tier1-test.controller.ts` | **삭제** (271줄) |
| `apps/admin-dashboard/src/pages/neture/Tier1TestPage.tsx` | **삭제** (670줄) |
| `apps/api-server/src/modules/neture/neture.routes.ts` | import + 등록 제거 |
| `apps/admin-dashboard/src/routes/public.routes.tsx` | lazy import + `/__debug__/neture-tier1` route 제거 |
| `docs/platform/debug/DEBUG-SSR-TEST-PAGE-GUIDE-V1.md` | 프런트 라우트 목록·제거 이력 현행화 |
| 선행 CHECK 2건 | 보류 항목 종결 반영 |

**API·권한·DB 영향:** 정식 API 계약 변경 0 / 권한·스코프 변경 0 / DB schema·migration·운영 데이터 변경 0. `NetureService`(`createSupplierOffer`·`deactivateSupplier`)는 정식 컨트롤러가 계속 사용하므로 무변경.

---

## 6. 검증 결과

| 항목 | 결과 |
|------|------|
| `pnpm install --frozen-lockfile` | ✅ exit 0 |
| `__test__/tier1` · `Tier1TestPage` · `neture-tier1` 참조 잔존 | ✅ **0** (설명 주석 제외) |
| `npx tsc --noEmit` (api-server) | ✅ exit 0 |
| admin-dashboard typecheck | ✅ 통과 |
| `pnpm run type-check` (전 서비스) | ✅ OK |
| `pnpm run check:unsafe-routes` | ✅ 위반 0 |
| jest guard spec 3종 | ✅ PASS |
| `git diff --check` | ✅ exit 0 |

---

## 7. 정비 마감 상태

**코드 차원의 debug·test·internal 실행 경로 정비가 마감됐다.**

| 항목 | 상태 |
|------|------|
| 위험한 `/__debug__/**` 6개 | 제거 (`32f97773f`) |
| `user-debug` 상태 변경 | 제거 (`32f97773f`) |
| `pharmacy-debug` 전체 | 제거 (`abf6c8a0e`) |
| 운영 seed route 2개 | 제거 (`4971381fb`) |
| `product-policy-v2` internal 9개 | 제거 (`824ffe54c`) |
| `JWT_SECRET` 관리키 재사용 | 소멸 |
| `__test__/tier1/*` + `Tier1TestPage` | **제거 (본 커밋)** |
| `/__debug__/user` | 읽기 전용 1개 잔존 (프로덕션 미등록) |
| 재발 방지 | `check:unsafe-routes` CI, 위반 0 |

**남은 후속:** 과거 seed fixture(`e0000000%` · `f0000000%`) **운영 DB 읽기 전용 조사** — 코드가 아닌 데이터 정리 트랙.

---

## 8. 후속 정식 기능이 필요해질 경우의 최소 조건

Tier1 승인 흐름(생성 → 승인 → auto-expand → listing → cascade)의 **회귀 검증**이 다시 필요해지면, 프로덕션 데이터를 만드는 HTTP 테스트 콘솔로 되살리지 않는다.

1. **통합 테스트로 구현** — jest + 테스트 DB. 프로덕션 데이터를 만들지 않는다
2. 운영 진단이 목적이면 **읽기 전용**으로 한정하고 정식 admin route·권한·감사·메뉴를 갖춘다
3. 상태 변경이 필요하면 정식 admin API 를 쓴다 (`admin.controller` 의 사유·가드·감사 계약을 우회하지 않는다)
4. `__test__` · `__debug__` 명칭의 상태 변경 경로는 신설 금지 — `check:unsafe-routes` R3 가 강제한다
