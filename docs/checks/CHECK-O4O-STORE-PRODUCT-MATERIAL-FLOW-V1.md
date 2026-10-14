# 매장 상품·자료 활용 흐름 정비 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거 WO/IR**: 사용자 요청 — 매장 상품 도입·제품 관리·자료 연결·QR·POP·태블릿 활용 흐름 정비

## 조사 기준과 범위

최신 `origin/main`의 `b696c5de0`에서 전용 worktree와 `wo/store-product-material-flow`를 생성했다.
실제 Store 서비스(`services/web-store`)를 대상으로 조사했다.

- [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)
- [매장 접근·회원 관계](../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md)
- [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)
- [공급자→매장 B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)
- [매장 자체 상품 경계](../baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md)
- [실행 자료 관리](../design/DESIGN-O4O-STORE-EXECUTION-MANAGEMENT-CANONICAL-V1.md)

| 경로 | 조사 결과 |
|---|---|
| 공급 상품 → 제품 관리 | B2B 공급·주문과 매장 제품 등록은 별도 흐름이다. 구매 이력이 제품 이용 자격을 대신하지 않는다. 표준 상품 등록은 ProductMaster 기반 listing이며 직접 등록은 별도 local 제품이다. |
| 제품 설명·이미지 | 직접 등록 제품 수정은 해당 매장 소유 제품 API를 사용한다. 매장용 설명서는 listing에 연결된 동일 ProductMaster의 STORE 설명서를 읽기 전용으로 조회한다. 상품 원장을 매장 수정 대상으로 바꾸지 않았다. |
| 제품 → 자료 | `pType`·`pId`·`pName`으로 콘텐츠 제작 문맥을 전달한다. 공급 자료 사본은 내 자료함으로 연결되며 원본 자동 동기화를 추가하지 않았다. |
| QR | listing 상품의 고정 대표 QR과 local 제품의 콘텐츠 QR은 별도다. 상품 QR 다운로드의 응답 순서 결함을 수정했다. |
| POP | `/store/marketing/pop-v2`가 현행 경로다. 상품·자료 source identity를 전달하는 기존 handoff 계약 15건을 검증했다. 은퇴한 ProductPopBuilder를 복구하지 않았다. |
| 진열·태블릿 | 매장 선택에 따라 화면을 다시 구성하고, 자료 생성과 실제 배치는 별도로 관리한다. 태블릿은 정보 안내 화면이며 checkout을 추가하지 않았다. 기존 설정·코너·화면 세트 보호 로직을 확인했다. |

## 확정 결함과 수정

1. 직접 등록 제품 조회가 늦게 끝나면 새 등록 양식 또는 다음 제품 수정 대상을 덮어썼다. 매장 변경 후 이전 실패 toast도 남았다.
   기존 `useLatestStoreRequest`로 마지막 양식 선택과 매장에 속한 결과만 반영한다. 새 등록·닫기에서도 이전 조회를 무효화한다.
2. QR 파일 요청 중 창을 닫거나 상품을 바꾸면 이전 파일이 내려왔고, 새 상품의 다운로드가 이전 busy 상태로 막혔다.
   열린 상품 identity에 요청을 연결하고 늦은 파일·오류·busy 해제를 무시한다. 같은 상품의 단순 props 재렌더는 진행 중 요청을 유지한다.
3. 직접 등록 제품 저장은 동기적인 요청 잠금으로 중복 제출과 저장 중 다른 등록 화면 진입을 막는다.
   매장 전환 이후 이전 저장의 성공 알림·목록 갱신을 무시한다. 이미 서버에 제출한 저장 요청을 취소하는 기능은 아니다.

API·role·route·DB schema·상품 원장·공통 모듈은 변경하지 않았다. PNG/SVG 파일명과 PDF의 실제 mm 크기 계약을 유지한다.

## 검증

- Node `22.18.0`, pnpm `10.25.0`; frozen lockfile 설치와 `pnpm run build:packages` 성공.
- 수정 전 focused 테스트: 24건 중 7건 실패로 위 결함을 재현. 수정 후 24건 모두 통과.
- 최종 Store 테스트: 18개 파일, 169건 PASS. 신규 QR 세션 테스트 7건과 제품 수정·저장 회귀 5건 포함.
- API 제품 소유 조직·목록 중복 제거·직접 제품 설명 테스트: 3개 suite, 43건 PASS.
- POP handoff 계약: 15건 PASS.
- `pnpm --filter store-web build` (TypeScript + Vite) PASS. 변경 파일 ESLint·`git diff --check`·문서 민감정보 검사 PASS.
- Chromium fixture: 1440px·390px에서 A 파일 요청 → 닫기 → B 파일 요청 → A 먼저 완료 → B 완료를 실행했다.
  A 파일은 내려오지 않고 B 파일만 올바른 이름으로 내려왔다. 이전 완료가 B 잠금을 풀지 않았다. 실행 오류·문서 전체 가로 넘침 0.
- 운영 read-only smoke: 경영자·직원 각각 1440px·390px에서 아래 5개 화면(총 20회) 정상 접근. API 오류·page error·문서 전체 가로 넘침 0.
  `/store/pharmacy/supply`, `/store/my-products`, `/store/library/contents`, `/store/marketing/pop-v2`, `/store/commerce/tablet-displays`.
  초기 검증 스크립트의 잘못된 heading 기대값은 현재 화면 제목으로 고쳐 재실행했다.

운영 상품 등록·이미지 업로드·자료 저장·배치 변경·다운로드·유료 AI 요청은 실행하지 않았다. 변경된 저장 동작은 격리된 mock 회귀 테스트로,
파일 다운로드 동작은 실제 컴포넌트와 fixture 응답을 사용하는 Chromium으로 검증했다. 운영자 승인은 사용자가 담당한다.
실계정·비밀번호·토큰·실제 사업자명·운영 응답 원문은 기록하지 않았다.

## 인계

개발 종료점은 commit·push·PR 생성이다. 병합·운영 배포는 통합 담당의 후속 작업이다.
병합 전 수정 대응을 위해 worktree를 보존한다(`KEEP`). 이번 작업의 문서 정합 변경은 해당 없음.
