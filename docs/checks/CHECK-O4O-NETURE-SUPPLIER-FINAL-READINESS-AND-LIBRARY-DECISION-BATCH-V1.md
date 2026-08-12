# CHECK-O4O-NETURE-SUPPLIER-FINAL-READINESS-AND-LIBRARY-DECISION-BATCH-V1

- **WO**: WO-O4O-NETURE-SUPPLIER-FINAL-READINESS-AND-LIBRARY-DECISION-BATCH-V1
- **일자**: 2026-08-12
- **범위**: Neture 공급자 영역 (`services/web-neture/src/pages/supplier/**`, 관련 문서)
- **전체 판정**: **PASS — 공급자 영역 CLOSED_READY**

---

## 1. 기준 commit

- 작업 시작 시점 `origin/main` = `9b602931b` (직전 WO 마감 배치)
- 본 배치 커밋 직전 HEAD = `177d3fb1f`
- 작업트리: 다른 세션의 KPA 분회 서비스 변경(`apps/api-server/**/kpa-branch/**`, `services/web-kpa-branch/`, migration 3건, IR 1건)이 dirty 상태로 존재. **경로가 겹치지 않아 접촉하지 않았고**, stage 는 path-specific 으로만 수행했다.

## 2. `/supplier/library` 조사 결과

| 항목 | 결과 |
|---|---|
| Frontend route | `App.tsx` 에 `/supplier/library` 살아 있음 (`SupplierLibraryPage`) |
| 화면 | 정상 렌더 (목록·등록 폼·GuideBlock) |
| Backend | `apps/api-server/src/modules/neture/neture-library.routes.ts` — `GET /library/public`(무인증), `GET/POST /library`(requireAuth + requireLinkedSupplier / requireActiveSupplier). 정상 mount |
| 진입점 | **0건** — 공급자 사이드바(`SupplierSpaceLayout`), 대시보드 Quick Link, 어떤 화면의 CTA 에도 링크 없음 |
| 공개 API 의 UI 소비자 | **0건** — `/neture/library/public/:id` 를 참조하는 코드는 `web-glycopharm/src/api/storeLibrary.ts`, `web-kpa-society/src/api/storeExecutionAssets.ts`, `web-kpa-society/src/api/storeLibrary.ts` 3개의 **API 클라이언트 함수뿐**이며, 이를 호출하는 화면 코드는 없다(KPA 쪽은 `@deprecated` 표기) |
| 프로덕션 데이터 | `GET https://api.neture.co.kr/api/v1/neture/library/public?limit=5` → `{"success":true,"data":{"items":[],"total":0}}` — **서비스 공개 자료 0건** |
| 백엔드 자체 선언 | 파일 헤더 주석 "독립 도메인 — HUB/Signage/CMS 연동 없음" |

## 3. legacy · active 판정이 갈린 이유

- `docs/checks/CHECK-O4O-NETURE-SUPPLIER-DASHBOARD-OPS-STATUS-V1.md` — **대시보드 Quick Link 관점**에서 `/supplier/library` 를 legacy 로 보고 링크를 제거(진입점 0건 근거).
- `docs/archive/investigations/IR-O4O-STORE-MATERIALS-AND-PRODUCTIONS-STATE-AUDIT-V1.md:43` — **route·backend 존재 관점**에서 active 로 기록.
- 즉 **"메뉴에서 은퇴"(legacy)** 와 **"코드·API 는 살아 있음"(active)** 을 서로 다른 축으로 기술한 것이며 사실 자체는 충돌하지 않는다. 두 기록 모두 참이고, 빠져 있던 것은 **정책 판정**이었다. 본 배치가 그 판정을 확정한다.

## 4. 최종 판정 — **KEEP_HIDDEN**

**근거**
1. 매장 제공 canonical 경로는 3종(매장용 상품 설명서 / 태블릿 화면 자료 / 디지털 사이니지)이며 library 는 그 어느 축도 담당하지 않는다.
2. library 는 매장·HUB·QR·태블릿 어디에도 연결되지 않는다(백엔드 자체 선언 + 소비 UI 0건 + 공개 자료 0건). "서비스 공개"는 **매장 노출이 아니라 보관 분류값**이다.
3. 진입점 0건 유지가 현재 정책과 일치한다.

**RETIRE 하지 않은 이유**
- route 를 제거하면 비공개로 보관된 기존 자료에 접근 경로가 사라진다.
- §4 가 schema/migration 을 금지하므로 데이터는 남는다 → 화면만 없애면 유령 데이터가 된다.
- `/library/public` 을 glycopharm·kpa API 클라이언트가 아직 참조하므로 backend 은퇴는 별도 lockstep WO 가 필요하다.

**KEEP_HIDDEN 계약**
- 사이드바·대시보드·어떤 화면에도 **진입점을 추가하지 않는다**.
- route·backend 는 보존한다.
- 화면 문구는 "개인 보관함"임을 명시하고, 매장 공개·적용으로 오해될 표현을 두지 않는다.
- 부활(진입점 추가)·은퇴(route/backend 제거)는 모두 별도 WO 로만 한다.

## 5. 수정한 route · link · CTA · 문구

| 파일 | 변경 |
|---|---|
| `SupplierLibraryPage.tsx` | KEEP_HIDDEN 안내 배너 추가(개인 보관함 · 매장 자동 노출 없음 · canonical 3종 안내), GuideBlock 기본 설명·step 2 문구 교정, 필터 라벨 `서비스 공개` → `서비스 공개(보관 분류)`, 판정 주석 기록 |
| `SupplierDashboardPage.tsx` | 설명서 상태 라벨 canonical 통일(`검수 요청`→`검수 대기`, `게시됨`→`매장 노출`, `보관`→`만료`), 링크·빈 상태 문구 `매장용 설명서`→`매장용 상품 설명서` |
| `SupplierSupplyOffersPage.tsx` | stale 주석 제거 — "전용 오퍼 모드 선택 화면은 후속" → 이미 구현 완료 사실로 정정 |
| `SupplierStoreMaterialsStatusPage.tsx` | 요약 카드에 `숨김·보관·만료`(tone `closed`) 추가 — 4카드가 모두 0 인데 표에는 12행이 남던 혼선 해소 |

미변경: `StoreMaterialUsageNote.tsx`(경계 문구 이미 정확), backend 전부.

## 6. 실계정 · 실데이터 smoke 가능 여부

- 계정: `renagang21@gmail.com`(Neture 공급자, 실계정) 로그인 성공.
- 상품: **0건** (`/supplier/products` · `/supplier/store-descriptions` 모두 "등록된 상품이 없습니다").
- 자료: 매장용 상품 설명서 12행(전부 숨김/만료), 태블릿 화면 세트 2건(보관), 사이니지 0건.
- **운영 데이터 write smoke 미수행** — 대상 상품이 없고, 남은 설명서 행은 과거 운영 이력이라 훼손 위험이 있다(§9 단서 적용). read-only · 정적 · 브라우저 smoke 로 대체 완료. rollback 대상 변경 없음(write 0건).

## 7. 공급자 route 최종 smoke (프로덕션 실브라우저)

| route | 결과 |
|---|---|
| `/supplier/dashboard` | 정상 · blank 0 |
| `/supplier/products` | 정상 · 빈 목록 정상 표시 |
| `/supplier/products/new` | 정상 · 3-step 등록 폼 |
| `/supplier/products/bulk` | 정상 · 유형별 5 템플릿 |
| `/supplier/products/import-assistant` | 정상 · Firstmall 가져오기 안내 |
| `/supplier/store-descriptions` | 정상 · 경계 문구 노출 |
| `/supplier/store-materials-status` | 정상 · 3종 집계 |
| `/supplier/tablet-screen-sets` | 정상 · 보관 세트 2건 |
| `/supplier/signage` | 정상 · 빈 목록 |
| `/supplier/recruitments` | 정상 · 빈 목록 |
| `/supplier/library` | 정상 렌더 · 목록 0건 (배포 전 시점이라 신규 배너는 배포 후 반영) |

- console error **0건**, API 404 **0건**, dead CTA **0건**, legacy 문구 **0건**.
- 상품 → 매장용 설명서 이동 가능(설명서 화면에 `내 상품 관리` 링크 존재).
- 검수·게시 현황에서 3종 상태 확인 가능.

## 8. QR · 태블릿 직접 적용 UI 부재 확인

- 공급자 화면 어디에도 QR 발행 · 태블릿 코너 배치 · 특정 매장 지정 UI 없음.
- 3개 자료 화면 모두 `StoreMaterialUsageNote` 로 "실제 적용 여부와 적용 위치는 매장 경영자가 선택합니다. 공급자가 특정 매장·QR·태블릿 코너에 직접 배포하지 않습니다." 를 노출.
- 태블릿·사이니지는 "매장이 가져가면 독립 사본" 을 명시. Backend 차단(`supplier-screen-set.controller.ts`)도 유지.

## 9. 남은 공급자 특수 케이스

1. **설명서 12행 vs 상품 0건** — `store-materials-status` 의 설명서는 `listMine()`(공급자 기준 SPD) 이고 상품 목록과 독립이다. 상품이 없어도 과거 설명서 행이 남는다. 결함 아님, 표시 축이 다름.
2. **동일 (master, KO) hidden 행 4중 중복** — 운영자 교체로 강등된 과거 버전이 그대로 조회된다(문서화된 조건). 목록 노이즈이며 데이터 오류는 아니다.
3. **태블릿 보관 세트 2건** — 검증용 임시 세트("HUB흐름 검증 세트(임시)" 등)가 운영 계정에 남아 있다. 정리는 계정 소유자 판단 사항.
4. **공급자 프로필 미완료 배너** — 담당자명·연락처 미입력 상태 안내. 실계정 데이터 이슈.
5. **`/library/public` 타 서비스 API 클라이언트 잔존** — glycopharm 1 · kpa 2(deprecated). backend 은퇴 시 lockstep 필요.

## 10. 공급자 영역 CLOSED 가능 여부 — **CLOSED_READY**

- P0/P1 결함 0건, dead CTA 0, API 404 0, legacy 문구 0.
- 미해결 판정 대상이던 `/supplier/library` 가 KEEP_HIDDEN 으로 확정됨.
- 남은 항목은 모두 데이터·운영 정리 또는 타 서비스 lockstep 이며 신규 개발이 아니다.
- 이후는 실운영 중 발견 대응으로 넘긴다.

## 11. build · deploy 결과

- `npx tsc --noEmit` — 통과(에러 0)
- `pnpm build` (web-neture) — ✓ built in 15.93s
- api-server 변경 없음 → **API 배포하지 않음** (§11 준수)
- web-neture 만 배포 대상
- GitHub Actions `Deploy Web Services (Cloud Run)` — **success** (`dca00a532`)

### 배포 후 재검증 (프로덕션)

- `/supplier/library` — KEEP_HIDDEN 배너 노출 확인, GuideBlock 문구·`서비스 공개(보관 분류)` 라벨 반영 확인, 목록 0건.
- `/supplier/store-materials-status` — `숨김·보관·만료 12` 카드 반영 확인(이전 4카드 전부 0 + 표 12행 혼선 해소).
- console error 0건.

## 12. commit SHA

- `dca00a532` — fix(neture): 공급자 자료실 KEEP_HIDDEN 판정 반영 + 상태 어휘 canonical 정렬

## 13. push 결과

- `origin/main` push 완료 (`177d3fb1f..dca00a532`) · `HEAD == origin/main`
