# WO-O4O-SUPPLIER-BUSINESS-PROPOSAL-DRAFTS-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-17 · **최종 갱신**: 2026-10-17
> **근거 WO/IR**: 사용자 협업체별 독립 공급 정책 및 동일 조건 입력 편의 기능 지시

## 목적과 사용자 결정

공급자는 협업체별로 공급 정책을 정한다. 같은 조건을 여러 협업체에 제공해도 요청·승인·변경·종료는 각각 독립한다. ‘모든 협업체’ 상시 적용 항목은 만들지 않는다. 여러 협업체를 명시적으로 선택해 조건을 복사하는 입력 편의는 제공한다.

## 조사 기준과 범위

기준 main: `3a575c074cebfef138d53e0000b4105668ed7def`.

- [commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md), [B2B 주문 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md), [약국 commerce 설계](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §3-4를 선행 확인했다.
- `supply_proposals`는 이미 `semi_franchise_id`별 개별 원장이다. 기존 생성 API는 한 협업체만 받고 담당 운영자가 독립 심사한다. 가격 수정은 종료 후 새 요청 방식이다.
- 기존 공급 제안 화면은 한 건씩만 입력한다. 이를 화면 내 복수 초안으로 보완한다. API·DB·권한·승인 상태 계약을 확장할 필요는 없다.
- 배송비는 여전히 공급자 공통 정책이다. 이 기능을 협업체별 배송조건 구현 완료로 보고하지 않는다.
- pharmacy 기본 공급의 기존 명시적 게시 경로는 유지한다. 다른 협업체로 기본 공급을 확대하지 않는다.

## 작업 목록

- [x] 최신 main·정본·기존 생성 및 심사 경계 조사
- [x] 공통 제품·단가·메모와 명시적 협업체 선택으로 개별 초안 생성
- [x] 협업체별 제품·단가·대상 약국·메모 확인 및 수정
- [x] 기존 제안에서 제품·단가·메모 복사 (대상 약국은 협업체 간 복사하지 않음)
- [x] 개별 제출 및 미제출 초안 묶음 제출, 성공 건 재전송 방지
- [x] 오류 건 개별 표시·초안 유지, 묶음 재전송 제외
- [x] focused 동작 검증·빌드·desktop/mobile 화면 검증
- [x] 검증 결과 기록
- [x] commit·push (commit SHA 및 원격 확인은 인계 보고 참조)

## 동작과 한계

초안은 브라우저 메모리에만 있으며 화면을 떠나면 사라진다는 안내를 제공한다. 공통 입력을 바꾸거나 조건을 다시 가져와도 이미 만든 초안을 덮어쓰지 않는다. 초안은 제출 전에 삭제할 수 있다. 완료된 요청은 비활성 상태로 남겨 재제출을 차단한다. 명시적인 완료 초안 정리 후 새 초안을 만들 수 있으며 기존 접수 이력은 목록에 유지한다.

묶음 제출은 기존 단일 요청 API를 순서대로 호출한다. 전체 원자적 거래가 아니며 부분 성공할 수 있다. 통신 오류는 서버 접수 후 응답 유실일 수 있어 자동 재시도하지 않는다. 오류 건은 목록에서 접수 여부를 확인한 다음 개별 재요청한다. 이번 변경으로 서버 멱등성을 새로 보장한다고 주장하지 않는다.

대상 약국 미지정은 선택한 협업체의 활성 회원 약국 전체를 뜻한다. 특정 조직의 실제 소속 검증 및 주문 자격 판정은 기존 서버 책임이다. 화면 문구를 서버 검증 강화의 증거로 삼지 않는다.

## 별도 후속 과제

- 협업체별 배송비·최소 주문 등 구조화된 조건, 승인 조건 스냅샷과 변경 재심사
- 운영자 제안 종료 시 원래 승인 주체·시각 보존
- 공급자 조직 소속을 고려한 자기 제안 승인 차단
- 제안 대상 약국의 해당 협업체 active 가입 검증
- 기존 미결제 주문 결제 시 제안 철회·가입 정지 재검증

상기 항목은 이번 입력 편의 작업에 포함되지 않는다. 후속 변경에서 최신 코드를 재조사하고 결제 계약 및 필요한 schema 영향도를 검토한다. 운영 migration 실행은 해당 변경에 대한 별도 명시 승인 대상이다.

## 문서 정합

이번 변경은 기존 §3-4의 협업체별 제안을 입력 편의로 구현한다. Frozen/baseline 본문·canonical index는 변경하지 않는다. 협업체별 구조화된 배송조건과 pharmacy 기본 공급 정책 정렬은 별도 정책 문서 작업이 필요하며, 완료로 간주하지 않는다.

## 검증 결과

Node 22.18.0 · pnpm 10.25.0, 저장소의 frozen lockfile로 설치했다. 새 작업공간에서 공통 패키지 dist가 없어 최초 테스트가 수집 전에 실패했고 최초 web 빌드도 누락된 모듈 때문에 실패했다. `pnpm --filter @o4o/web-neture^... -r --if-present run build` 완료 후 아래 검증은 모두 통과했다. 의존성·lockfile 변경은 없다.

- `pnpm exec vitest run --config services/web-neture/vitest.config.mjs services/web-neture/src/pages/supplier/__tests__/SupplierProposalDrafts.test.tsx services/web-neture/src/pages/supplier/__tests__/SupplierTaskNavigation.behavior.test.tsx`: 2 files · 31 tests 통과.
- `pnpm exec vitest run --config services/web-neture/vitest.config.mjs services/web-neture/src/pages/supplier/__tests__`: 10 files · 130 tests 통과 (위 31개 포함).
- `pnpm --filter @o4o/web-neture build`: TypeScript 및 Vite production build 통과. 기존 Browserslist 데이터·chunk 크기 경고는 남아 있다.
- production bundle을 격리 preview에서 실행, 가상 auth/API 응답으로 Chromium 1440px·390px 확인: 독립 단가 수정, 자동 제출 없음, 부분 실패, 실패 협업체만 개별 재요청, 성공 건 재전송 없음. 페이지 오류 0·문서 가로 넘침 0.
- browser 산출물: 저장소 밖 `/workspace/artifacts/supplier-business-proposal-drafts/`의 `browser-result.json`, 초안/접수 desktop·mobile 스크린샷. 운영 업무 데이터 생성 0이며 실제 계정·운영 API workflow 검증을 대체하지 않는다.
- `git diff --check`, `node scripts/check-doc-sensitive.mjs`: 통과.

## 인계 경계

개발 branch: `wo/supplier-business-proposal-drafts`. 요청 범위는 검증·commit·push 후 인계다. 이번 작업에서 PR CI·main 병합·배포·운영 승인 처리는 실행하지 않는다. DB migration 없음. worktree는 통합 전 후속 수정용으로 `KEEP`한다.
