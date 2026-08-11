# CHECK-O4O-NETURE-SUPPLIER-PRODUCT-AND-STORE-DESCRIPTION-WORKFLOW-SMOKE-BATCH-V1

- **WO**: `WO-O4O-NETURE-SUPPLIER-PRODUCT-AND-STORE-DESCRIPTION-WORKFLOW-SMOKE-BATCH-V1`
- **작성일**: 2026-08-11
- **판정**: **PASS (부분 제약 명시)** — 필수 route 9개 blank 0 / console error 0 / API 4xx·5xx 0. 단, smoke 계정의 등록 상품이 0건이라 상품 상세 Drawer CTA 는 실데이터로 클릭 검증하지 못했다(§5-3).

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 HEAD | `63b629fff` (작업트리 clean) |
| 수정 commit | `eda5e182b` |
| CHECK commit | (아래 §7) |

작업 시작 시 `git status --short` 에 본 WO 범위 밖(api-server) 다른 세션 변경 2건이 있었으나
**접촉하지 않았고 stage 하지 않았다** (path-specific stage).

---

## 2. 공급자 workflow route 조사표

WO §2 중점 흐름 10단계 기준.

| # | 흐름 | canonical route | 화면 | 판정 |
|---|---|---|---|---|
| 1 | 공급자 상품 목록 | `/supplier/products` | SupplierProductsPage | OK |
| 2 | 상품 신규 등록 | `/supplier/products/register` → `/supplier/products/new` | SupplierProductRegisterEntryPage / SupplierProductCreatePage | OK |
| 3 | 상품 수정 | `/supplier/products` → ProductDetailDrawer (`editMode: b2c \| b2b`) | ProductDetailDrawer | OK |
| 4 | 이미지·상세 정보 입력 | 등록 폼 + Drawer 편집 (`productApi.uploadProductImage`) | 동상 | OK |
| 5 | 상품 → 매장용 설명서 이동 | (없었음) → **신설** `?masterId=` deep link | Drawer / 등록 완료 패널 | **수정함** |
| 6 | 설명서 draft 저장 | `/supplier/store-descriptions` → Drawer `save(submit:false)` | SupplierStoreDescriptionEditorDrawer | OK |
| 7 | 검수 요청 | 동상 `save(submit:true)` → `needs_review` | 동상 | OK |
| 8 | 수정 요청 상태 표시 | `revision_requested` 배지 + 사유 + 기한 | 목록/Drawer | OK |
| 9 | 수정 후 재요청 | Drawer 버튼 라벨 `다시 검수 요청` | 동상 | OK |
| 10 | 검수·게시 현황 | `/supplier/store-materials-status` | SupplierStoreMaterialsStatusPage | OK |

### WO §5 확인 7항목

| # | 확인 항목 | 결과 |
|---|---|---|
| 1 | 상품 등록 route ↔ live API 연결 | OK — `POST /api/v1/neture/supplier/*` (neture.routes.ts:79-90 mount 확인) |
| 2 | legacy/dead route 잔존 | 없음 — 공급자 화면 내부 링크 41개 전량 실재 route (`/account/supplier/*` 는 의도된 redirect, `/supplier/csv-import` 는 은퇴 redirect) |
| 3 | 상품 → 매장용 설명서 이동 | **결함 → 수정** (§3) |
| 4 | draft/검수요청/수정요청/재요청 연결 | OK — 4상태 모두 Drawer 에서 연결. 언어별(ko/en/zh/ja) 독립 작업행 |
| 5 | 검수·게시 현황 표기 | OK — 3소스 `Promise.allSettled` 영역별 격리, 게시 대상(약국/비약국)은 태블릿 화면 자료에만 표기 |
| 6 | API 실패의 empty 위장 | 대부분 OK(loadError 분리) — 사이니지 '연결 상품' 1건 **결함 → 수정** (§3) |
| 7 | 공급자의 QR·태블릿 직접 적용 UI | 없음 — `StoreMaterialUsageNote` 가 "적용은 매장이 수행" 을 명시. 백엔드도 차단(supplier-screen-set.controller.ts:33) |

### WO §8 route 명칭 정정

WO §8 의 2개 route 는 실제 저장소 route 와 이름이 다르다. **실재 route 로 대체 smoke** 했다.

| WO 표기 | 실재 canonical route |
|---|---|
| `/supplier/screen-sets` | `/supplier/tablet-screen-sets` |
| `/supplier/review-status` | `/supplier/store-materials-status` |

---

## 3. 수정한 링크 / CTA / API 표시

commit `eda5e182b` — 4 files, +65/−7. **권한·API·schema·정책 변경 0.**

| # | 파일 | 내용 |
|---|---|---|
| 1 | `services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx` | `매장용 상품 설명서` Section 신설. B2C/B2B 설명과 축이 다름을 명시하고 `?masterId=` 로 이동 |
| 2 | `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx` | 등록 완료 '다음 작업' 에 `매장용 상품 설명서 작성` 추가(비의약품 한정 — 의약품은 노출 범위 미확정이라 기존 정책 유지). `registered` state 에 masterId 보관 |
| 3 | `services/web-neture/src/pages/supplier/SupplierStoreDescriptionsPage.tsx` | ① `?masterId=` 1회 소비 → 해당 상품 편집기 열고 query replace 제거 ② 낡은 안내 `"실제 작성·저장·QR·태블릿 기능은 후속 단계에서 제공됩니다"` → 현재 동작 + QR·태블릿은 매장 수행 경계 안내로 교체 ③ docblock `1차: 안내만` 범위 서술 정정 |
| 4 | `services/web-neture/src/pages/supplier/SupplierSignagePage.tsx` | 연결 상품 select 의 `getProducts().catch(() => {})` 를 `productsError` 로 분리 — 조회 실패가 '등록 상품 없음' 으로 위장되지 않게 안내 표시 |

이동선 보완이 **노출 범위 확대가 아닌 근거**: `/supplier/store-descriptions` 는 이전부터
`supplierApi.getProducts()` 전량을 나열해 왔다. deep link 는 그 목록 중 한 행을 선택해 열 뿐이다.

---

## 4. 수정하지 않은 HOLD 항목

| # | 항목 | 사유 |
|---|---|---|
| H1 | `SupplierDashboardPage` copilot 4종 `.catch(() => {})` (AI insight/성능/분포/트렌드) | AI 보조 표면의 확립된 fail-open 패턴. 핵심 workflow 아님 — 별도 WO |
| H2 | `ProductDetailDrawer:429` `getServicePrices().catch(() => {})` | 서비스별 공급가 — 본 WO 10단계 흐름 밖 |
| H3 | `ProductDetailDrawer` "전용 공급 방식 관리 화면은 준비 중입니다" | 안내 문구이며 클릭 가능한 dead CTA 아님. 화면 신설은 §7 중지 조건(정책) |
| H4 | `SupplierLibraryPage` "파일 업로드 기능은 추후 제공됩니다" | 자료함 — 본 WO 범위(상품/설명서) 밖 |
| H5 | 상품 목록 행의 `후속 작업` select 에 설명서 미포함 | 해당 select 는 **공급 활동** 축이고 의약품은 gate 로 차단된다. 설명서(매장 제공 자료)를 같은 select 에 넣으면 gate 축이 섞인다 → 상세 Drawer 진입선으로 해결 |

---

## 5. 실브라우저 smoke 결과

- **환경**: `https://neture.co.kr` (프로덕션), 배포 후
- **계정**: Neture 공급자2 (`docs/local/TEST-ACCOUNTS.local.md` — (주)네뚜레 공급자 테스트 / supplier owner). 자격증명은 본 문서에 기재하지 않는다.
- **방법**: route 별 이동 후 `main` 렌더 확인 + console `error` 수집 + `/api/` 응답 4xx·5xx 수집

### 5-1. 필수 route (WO §8)

| # | route | 렌더 | console error | API 4xx/5xx | 비고 |
|:-:|---|:---:|:---:|:---:|---|
| 1 | `/supplier/dashboard` | OK | 0 | 0 | "매장용 콘텐츠" 블록에서 매장용 설명서·태블릿·사이니지 진입 |
| 2 | `/supplier/products` | OK | 0 | 0 | 이 계정 등록 상품 0건 → "등록된 제품이 없습니다" (empty, 오류 아님) |
| 3 | `/supplier/products/register` | OK | 0 | 0 | canonical 등록 화면 (의약품/비의약품 선택) |
| 4 | `/supplier/products/new` | OK | 0 | 0 | 별도 등록 화면. 정상 렌더 |
| 5 | `/supplier/products/import-assistant` | OK | 0 | 0 | Firstmall 관리자 HTML 보조 |
| 6 | `/supplier/store-descriptions` | OK | 0 | 0 | **이번 WO 수정 반영 확인** (§5-2) |
| 7 | `/supplier/recruitments` | OK | 0 | 0 | 노출 승인=운영자 안내 유지 |
| 8 | `/supplier/signage` | OK | 0 | 0 | 매장 활용 안내(read-only) 노출 |
| 9 | `/supplier/tablet-screen-sets` | OK | 0 | 0 | WO §8 의 `/supplier/screen-sets` 실제 route |
| 10 | `/supplier/store-materials-status` | OK | 0 | 0 | WO §8 의 `/supplier/review-status` 실제 route. 수정요청/검수대기/게시중/작성중 4 카운터 표시 |

- blank 화면 0 / legacy·dead CTA 0 (사이드바·본문 내부 링크 전수 대조 §2 참조)
- **QR·태블릿 직접 적용 UI 0** — `/supplier/signage`·`/supplier/tablet-screen-sets`·`/supplier/store-descriptions` 모두 "실제 적용 여부와 적용 위치는 매장 경영자가 선택합니다. 공급자가 특정 매장·QR·태블릿 코너에 직접 배포하지 않습니다." 안내만 노출

### 5-2. 이번 WO 수정 반영 확인 (프로덕션 렌더)

| 수정 | 확인 |
|---|---|
| `SupplierStoreDescriptionsPage` 안내 문구 교체 | 신규 문구 2줄 확인 — "작성·임시저장·검수요청·철회는 이 화면에서 상품별로 진행합니다…", "QR 생성·태블릿 코너 적용은 **매장이 수행**합니다…". 낡은 "후속 단계에서 제공됩니다" 문구 소멸 |
| `masterId` deep link 1회 소비 | `/supplier/store-descriptions?masterId=<uuid>` 접속 시 렌더 정상, console error 0, API 4xx 0. 상품 0건 계정이라 매칭 대상이 없어 조용히 무시됨(설계대로) |

### 5-3. 실데이터로 확인하지 못한 항목 (제약 명시)

| 항목 | 사유 |
|---|---|
| 상품 상세 Drawer 의 "이 상품의 매장용 설명서 작성" 버튼 클릭 | smoke 계정 등록 상품 **0건** → Drawer 자체를 열 수 없음. 다른 공급자 계정(쓰리라이프존)은 로그인 시 "이 계정은 Neture 서비스 이용 권한이 없습니다" 로 진입 불가 |
| 상품 등록 완료 패널의 "매장용 상품 설명서 작성" 버튼 | 실제 상품 등록은 **프로덕션 데이터 write** 라 smoke 목적으로 수행하지 않았다 |
| 6~9단계(draft 저장 / 검수요청 / 수정요청 표시 / 재요청) 실행 | 위와 같은 이유로 상품이 없어 편집기 Drawer 진입 불가. 코드 경로는 §2 에서 정적 확인 |

위 3건은 typecheck·build 로만 보증되며, **상품이 있는 공급자 계정 확보 시 재smoke 필요**하다.

---

## 6. typecheck / build / deploy

| 항목 | 결과 |
|---|---|
| `web-neture` `tsc --noEmit` | PASS (출력 없음) |
| `web-neture` build | PASS (`✓ built in 36.52s`) |
| api-server | **미변경 → typecheck/test/배포 모두 미실행** (WO §9) |
| 배포 | PASS — CI run `31470154470` (Deploy Web Services): `deploy-neture: success`, 나머지 4개 web 서비스 `skipped`. `deploy-api.yml` 미발화 (API 미변경) |

---

## 7. commit SHA

| 커밋 | 내용 |
|---|---|
| `eda5e182b` | 코드 수정 4건 (web-neture 공급자 화면) |
| (본 CHECK 커밋) | CHECK 문서 |

## 8. push 결과

- `63b629fff..eda5e182b  main -> main` 푸시 완료
- CHECK 문서는 path-specific stage 로 후속 커밋·푸시

---

## 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
