# CHECK-O4O-KPA-STORE-MANAGEMENT-PRODUCT-TERM-DEPLOY-VERIFY-V1

> `매장 취급제품` → `매장 경영활용 제품` 용어 변경의 배포·운영 검증 결과
> WO: WO-O4O-KPA-STORE-MANAGEMENT-PRODUCT-TERM-DEPLOY-VERIFY-V1 · 검증일: 2026-06-27

## 결론: **PASS** (코드 무수정 — 배포·검증만 수행)

## 1. 저장소 상태

| 항목 | 결과 |
|------|------|
| 병합 커밋 | `43aa0ce1e214790d9a5b87180de7db19cefb740c` "fix(kpa): 매장 경영활용 제품 용어 정합" |
| origin/main 포함 | ✅ 포함 확인 |
| 작업 트리 | clean (pnpm-lock 만 install 부산물 — 본 작업과 무관, 미커밋·미변경 유지) |
| 동시 작업자 변경 | 수정/되돌림 없음 |

## 2. 변경 범위 (5 파일, route·API·DB·권한 무변경)

```
packages/store-ui-core/src/config/storeMenuConfig.ts            | 6 +++---
services/web-kpa-society/src/App.tsx                            | 6 +++---
.../pages/pharmacy/CreateContentFromResourcesModal.tsx          | 4 ++--
.../pages/pharmacy/ImportB2cDescriptionModal.tsx                | 2 +-
.../pages/pharmacy/StoreHandledProductsPage.tsx                 | 16 ++++++++--------
```
- `handled-products` route/key 유지, API/DB 변경 없음 확인.
- GP/KCos 사용자 문구 변경 없음(메뉴 config 의 KPA 항목만 수정).

## 3. 구용어 잔존 검사 (사용자 노출 0건)

`rg "매장 취급제품|매장 취급 제품"` (store-ui-core + web-kpa-society 실행 코드):
- **UI 노출 문구: 0건.**
- 잔존 4건은 전부 **내부 주석/JSDoc** (handledProducts.ts, assetSnapshot.ts, LinkedContentsDrawer.tsx, StoreLibraryContentsPage.tsx) — WO 기준에 따라 기계적 변경하지 않음(UI 미노출).
- `취급`, `O4O 제품 취급 신청` 등 다른 의미 표현은 미변경.

## 4. 정적 검증

| 항목 | 결과 |
|------|------|
| `web-kpa-society` tsc --noEmit | ✅ EXIT 0 (에러 0) |
| (`@o4o/web-kpa-society` 에 typecheck 스크립트 부재 → tsc 직접 실행) | — |

## 5. 배포 확인

| 항목 | 결과 |
|------|------|
| Workflow | Deploy Web Services (Cloud Run) |
| Run | `28288367671` — headSha `43aa0ce1e`, conclusion **success** |
| `deploy-kpa-society` job | ✅ **success** (skip 아님) |
| 동반 배포 | neture/k-cosmetics/glycopharm 도 success — `store-ui-core` 공유 변경으로 4개 서비스 배포(예상된 동작, 불필요 수동 재배포 없음) |
| 수동 재배포 | 불필요 (자동 배포 정상 트리거·성공) |

## 6. 운영 검증 (배포 아티팩트 전수 스캔 — 로그인 불필요)

운영 사이트 `https://kpa-society.co.kr` 의 배포 번들 **250개 청크 전체** 다운로드 후 스캔:

| 검사 | 결과 |
|------|------|
| 구용어 "매장 취급제품" (전 250 청크) | ✅ **0건** |
| 신용어 메뉴 라벨 "매장 경영활용 제품" (index 번들) | ✅ 2건 |
| "관련 매장 경영활용 제품" | ✅ `StoreLibraryContentsPage` 청크에 배포됨 |
| "매장 경영활용 제품 목록으로" | ✅ `StoreHandledProductsPage` 청크에 배포됨 |

→ 배포된 운영 산출물이 신용어를 반영하고 구용어가 전무함을 확인(단일 화면 육안 확인보다 포괄적).

### 잔여(선택): 시각적 로그인 smoke
- `/store/handled-products` 로그인 후 화면 육안 확인은 **미수행**(공유 브라우저 점유). 단, 텍스트 리터럴 변경 + 타입체크 PASS + 배포 success + 250청크 아티팩트 검증으로 잔여 리스크 매우 낮음.
- 텍스트 전용 diff 라 탭·검색·페이지 이동 등 로직 회귀 가능성 없음(route/handler 무변경).

## 7. 메타

- 테스트 데이터 변경: **없음** (read-only 검증).
- 코드 수정: **없음** (배포·검증 전용 WO).
- 기준 커밋: `43aa0ce1e` / 배포 run: `28288367671` / 검증: 2026-06-27.

## 완료 기준 점검

- [x] origin/main 에 변경 포함
- [x] KPA 웹 배포 성공 (deploy-kpa-society success)
- [x] 운영 산출물 검증 PASS (구용어 0건, 신용어 배포 확인)
- [x] 사용자 노출 구용어 0건
- [x] 기능·라우트·API·DB 회귀 없음 (텍스트 전용 변경)
- [~] 시각적 로그인 smoke — 공유 브라우저 점유로 보류(아티팩트 검증으로 갈음, 잔여 리스크 낮음)
