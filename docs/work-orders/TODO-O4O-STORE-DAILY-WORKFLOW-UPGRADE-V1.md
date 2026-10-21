# 내 매장 일상 업무 흐름 개선 TODO

> **상태**: COMPLETED
> **작성일**: 2026-10-21 · **최종 갱신**: 2026-10-21
> **근거**: 사용자 지시 — TODO 작성 → 코드·문서 대조·보완 → 개발·검증 → push

## 기준과 범위

최신 origin/main `c9d9760aba`에서 전용 branch `wo/store-daily-workflow-upgrade`, worktree `/workspace/o4o-wt/store-daily-workflow-upgrade`로 시작한다. 앞선 조사 worktree와 다른 세션의 checkout은 수정하지 않는다.

사용자가 확정한 첫 개발 묶음 ① 상담 반복 조작 ② 컨텐츠 사용처 표시 ③ 위치별 수정 동선을 함께 정비한다. 매장별 AI 이력·직원 접근 해제 계약과 업무 AI 연결은 후속 작업이다. 실제 기기 반영 응답·대시보드 확장·새 상품/상담 API·Core·DB·의존성·권한·소비자 commerce 변경은 포함하지 않는다. 종료점은 commit·명시 branch push이며 PR·병합·배포는 수행하지 않는다.

## TODO — 조사 후 보완

- [x] 최신 main·AGENTS·canonical index·역할별 업무공간·commerce/B2B·공통 모듈 변경 절차 확인.
- [x] 상담·자료함·위치 현황의 실제 소비처와 회귀/브라우저 기록 대조.
- [x] 상담 중 방향별 입력·번역을 화면 메모리에서 유지하고 고객용 화면에서 답변 입력으로 바로 연결. 새 상담·언어/모드·계정/매장 변경·pagehide·unmount는 전체 초기화. 직원의 고정 안내·전문인 이용 판정·명시적 번역·지연 응답/음성 격리를 유지.
- [x] 사용처의 확인된 수·미집계·근사를 구분하고 부분 집계의 0을 ‘사용 중 아님’으로 단정하지 않도록 수정. 조회 실패 재시도는 자료 선택을 보존하며 기존 사본·재가져오기·게시/QR 연결은 유지.
- [x] 위치 현황에서 선택한 태블릿 위치·QR을 기존 관리 화면에 전달. 같은 매장·기존 조회 결과에 있는 대상만 선택하며 잘못된 대상·전환·실패는 구분. 저장 후 현황 복귀는 기존 URL·query/hash/state를 보존.
- [x] 수정하는 흐름의 상태/표시만 작은 Store 로컬 helper/hook으로 정리하고 공통 Core·새 엔진을 만들지 않음.
- [x] 관련 회귀·Store 전체 테스트·TypeScript/Vite build·변경 파일 집중 lint.
- [x] 실제 화면 + 합성 API의 PC/모바일 브라우저에서 연속 상담·부분 사용처·위치/QR 진입·저장/복귀·실패/전환 확인.
- [x] 검증 결과·미검증 범위 기록, diff·문서 민감정보·staged scope 검사, commit·named branch push.

## 조사 근거

- [역할별 업무공간 정본](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) — 내 매장은 매장 소유 공간이며 협력사업의 가입/승인·출처 조건은 유지.
- [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md), [B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md).
- [상담·음성 CHECK](../checks/CHECK-O4O-PHARMACY-CONSULTATION-MAIN-INTEGRATION-V1.md), [업무 중심 UI CHECK](../checks/CHECK-O4O-STORE-TASK-FOCUSED-UI-V1.md), [기기 흐름 CHECK](../checks/CHECK-O4O-STORE-DEVICE-WORKFLOW-COHESION-V1.md), [상품 안내 CHECK](../checks/CHECK-O4O-STORE-PRODUCT-GUIDANCE-FLOW-V1.md).
- 착수 시 상담은 방향/언어 변경에서 같은 `clear()`를 호출하며 고객 dialog는 읽어주기·직원 화면 복귀만 제공했다. 방향별 메모리와 답변 진입을 추가하고 초기화 경계는 유지했다.
- 자료함 사용처는 원본 갱신 사본에 한해 조회한다. 서버 coverage는 태블릿 블록 `not_counted`, 영상 `no_link`, POP `approximate`를 반환한다. 조회 범위를 늘리지 않고 표시·실패 재시도를 수정했다.
- 위치 현황의 기존 링크는 위치/QR 식별을 전달하지 않았다. 같은 위치에 여러 대상이 있으면 먼저 하나를 선택한다. history state는 식별·매장/서비스 범위·안전한 현황 복귀 정보만 전달하며 기존 제작 state를 목적지로 복사하지 않는다.
- QR은 현황과 같은 최대 200건 조회에서 대상을 확인한다. 누락은 현재 조회에서 확인하지 못한 것으로 표시하며 삭제로 단정하지 않는다. 선택 QR 보기의 집계·전체 선택도 해당 대상에 한정하고 ‘전체 QR 보기’로 해제한다.

## 개발 검증과 인계

[검증 기록](../checks/CHECK-O4O-STORE-DAILY-WORKFLOW-UPGRADE-V1.md): Store 62개 파일·754개 테스트, TypeScript/Vite build, 변경 TS/TSX 16개 집중 lint 통과. PC 1440px·모바일 390px × 공통/서비스 진입 경로의 합성 API 브라우저 32개 시나리오 통과.

push 전 확인한 `origin/main`은 `5c6150a6b0`이다. 기준 이후 변경은 약국 관리자 설정 검증 문서 2개뿐이며 작업 경로와 겹치지 않아 자동 merge/rebase하지 않았다. PR·CI 운영·main 병합·배포는 통합 담당에게 인계한다. AI 이력 계약은 이번 완료 조건에 포함하지 않는다.

## 검증 경계

운영 업무 데이터 변경·유료 번역/AI·실제 마이크·QR 인쇄/스캔·기기 연결/재생은 수행하지 않는다. 합성 API 결과를 실사용 완료로 기록하지 않는다. 계정·비밀번호·실제 매장 정보는 문서·로그·스크린샷에 남기지 않는다. `WORKTREE_DISPOSITION = KEEP` — push 후 통합 검토·검증 재현용.
