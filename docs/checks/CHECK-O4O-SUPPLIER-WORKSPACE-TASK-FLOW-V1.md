# CHECK-O4O-SUPPLIER-WORKSPACE-TASK-FLOW-V1

> 상태: COMPLETED · 검증일: 2026-10-15 (Asia/Seoul)
> 범위: [업무 동선 재배치 WO·TODO](../work-orders/WO-O4O-SUPPLIER-WORKSPACE-TASK-FLOW-V1.md)
> 기준 코드: `352df65dd`. 최종 fetch의 `origin/main=7c53af8ca` 추가 2커밋은 이번 수정 경로와 겹치지 않는다.

## 1. 결과

- 상품 추가에서 기존 제품 공급 연결과 신규 검토 요청을 구분한다. 대량·소스 입력은 그 안에서 선택하며 기존 URL은 보존한다.
- 홈은 직접 처리할 일과 승인·정산 처리를 기다리는 일을 구분한다. 주문 처리·배송 목록이 대표 진입이고 통합 현황도 계속 접근할 수 있다.
- 상품·주문 목록의 검색·상태·페이지와 선택 상품을 URL로 이어 간다. 복귀 경로는 허용된 공급자 업무 화면만 받는다.
- 설명서는 master·언어·자료 ID를, 태블릿·사이니지는 자료 ID를 지정해 기존 편집기를 연다. 대상이 없거나 조회가 실패하면 다른 자료를 대신 열지 않는다.
- 상품 상세에서 자료 제작·승인 상품의 세미프랜차이즈 활동으로 연결한다. 선택 상품은 공급 가능한 본인 상품 목록과 대조한다.
- 등록 폼 안에서 소스 도우미를 열므로 기존 필드·규제 구분·선택 파일을 유지한다. 결과 적용은 빈 필드·이미지 보완이며 저장·검토 요청은 사용자 동작으로 남는다. 새로운 영구 초안 저장소를 만들지 않았다.
- Supplier Domain §2.1의 메뉴 예시를 코드와 맞췄다. DB·API·권한·주문 상태 전이·프로그램 원장·공용 packages는 변경하지 않았다.

## 2. 코드·소비처 점검

| 소비처 | 영향·검증 |
|---|---|
| Neture SupplierSpaceLayout | App의 공급자 route 트리에서 사용. desktop/mobile 같은 메뉴 렌더를 유지하고 활성 그룹 자동 열기를 보완 |
| SupplierProductsPage / ProductDetailDrawer | 공급자 호출자의 복귀 문맥이 있을 때만 후속 작업 표시 |
| OperatorProductApprovalPage / 같은 Drawer | 운영자도 소비한다. 복귀 문맥 없는 호출에는 공급자 작업 비노출, 기존 편집·승인 행동 회귀 통과 |
| account 폴더의 주문 목록·상세 | canonical 공급자 URL에서 재사용. legacy redirect 및 API 보존 |
| 자료별 기존 편집기 | 저장·검수·게시 원장 불변. 상태 목록은 탐색·필터·복귀만 담당 |
| `supplier-domain-boundary.spec.ts` | raw-source 소비처 조사 및 41건 통과 |
| 다른 서비스·공용 UI / Auth / WorkScope | 수정 없음 |

## 3. 실행 검증

Node/pnpm은 저장소 고정 버전 22.18.0 / 10.25.0을 사용했다. 새 worktree에서 frozen-lockfile 설치를 완료했다.
공통 패키지는 이전 검증 작업 공간과 `packages` 소스 diff가 없음을 확인하고 해당 로컬 빌드 산출물을 재사용했다.

| 명령·검증 | 결과 |
|---|---|
| `pnpm exec vitest run --config services/web-neture/vitest.config.mjs --maxWorkers=3` | **1,004/1,004 PASS**, 실패·보류 0 |
| `pnpm exec jest --config apps/api-server/jest.config.cjs --runInBand --runTestsByPath apps/api-server/src/__tests__/supplier-domain-boundary.spec.ts` | **41/41 PASS** |
| `pnpm --filter @o4o/web-neture build` (tsc + Vite) | **PASS**. 기존 chunk 크기 경고는 남아 있음 |
| `node scripts/check-doc-sensitive.mjs` / `git diff --check` | **PASS** |
| literal 소비처 점검 | runtime App·raw-source 계약 식별, 기존 기록 문서는 이력으로 보존 |

행동 회귀에는 입력 왕복 시 파일·가격·규제 구분 유지, 적용 후 미제출, 주문 상세의 검색·상태·페이지 복귀,
상품 필터 초기화, 같은 언어의 과거 자료와 요청 ID 구분, 없는 자료·언어·상품의 대체 금지,
승인 상품의 활동 생성 prefill과 운영자 소비처 경계를 포함한다.

## 4. 로컬 브라우저

Chromium + Playwright, desktop 1440×1000 / mobile 390×1000에서 같은 절차를 실행했다.
기존 Vite 실행에 `VITE_HOST_CUTOVER_SUPPLIER=false`, `VITE_HOST_CUTOVER_FUNDING=false`를 명령 단위로 적용해
로컬 화면이 운영 서브도메인으로 이동하지 않도록 했다. 배포 플래그·저장소 설정은 변경하지 않았다.

API는 브라우저 route fixture로 격리했고 외부 요청은 차단했다. 실제 계정·운영 DB 검증 결과가 아니다.

| 시나리오 | desktop | mobile |
|---|---|---|
| 홈 실행/대기 구분, 메뉴에서 상품 추가 도달 | PASS | PASS |
| 기존 제품 연결·대량·소스 입력 선택지 접근 | PASS | PASS |
| 등록 폼 → 소스 도우미 → 취소 후 입력 유지 | PASS | PASS |
| 주문 목록(검색·준비중·2페이지) → 상세 → 같은 목록 | PASS | PASS |
| 수정 요청 목록 → EN 설명서 → 같은 상태 목록 | PASS | PASS |
| 태블릿·사이니지 ID 직접 진입 | PASS | PASS |
| 선택 상품 상세 → KO 설명서 → 검색·상품 선택 복귀 | PASS | PASS |
| 페이지 오류 / 홈·태블릿 화면 전체 가로 넘침 | 0 / 없음 | 0 / 없음 |

업무 상태 변경 요청은 0건이다(기존 태블릿 읽기 전용 preview POST는 제외).
테스트 업무 데이터는 브라우저 메모리 fixture뿐이며 컨텍스트를 닫았다. 운영 데이터 생성·정리 작업은 없다.
운영 실계정 write, 실제 저장·검수·배송·정산, AI 호출, 배포 후 smoke는 이번 검증 범위가 아니다.

## 5. 인계

개발 종료점은 branch push·PR 생성이며 병합·배포는 수행하지 않는다.
작업 공간은 PR의 후속 검토·수정을 위해 보존한다(`KEEP`).
[PR #629](https://github.com/Renagang21/o4o-platform/pull/629)의 CI 상태는 PR checks와 완료 보고를 기준으로 확인한다.
