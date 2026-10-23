# 내 매장 일상 업무·대시보드 상태 보완 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-22 · **최종 갱신**: 2026-10-23 (한국시간)
> **근거**: 미흡점 조사 후 사용자 지시 — TODO 작성·문서/코드 대조·계획 보완·개발·검증·commit·push
> **종료점**: 최초 개발은 push 후 인계. 2026-10-23 사용자 후속 지시로 이 공간에서 PR·main 병합·배포와 결과 기록까지 진행.

## 기준과 범위

- 시작 main `3917a9522d`, branch `wo/store-workflow-status-completion`, 전용 worktree `/workspace/o4o-wt/store-workflow-status-completion`.
- 앞서 권장한 첫 개발 묶음: 상담 조작 단축, 컨텐츠 사용처의 부분 집계·실패 표시, 위치별 대상 수정, 대시보드 조회 상태 정합.
- 미반영 개발 `40a33194a5`를 최신 코드와 대조해 필요한 구현·회귀를 재사용한다. 이전 작업 트리·branch는 수정·삭제하지 않는다.
- 기존 공통/서비스 지정 URL·매장/계정 격리·직원 접근·capability·사본 출처·소비자 commerce 금지 경계를 유지한다.
- 공통 Core·DB·migration·의존성·workflow는 변경하지 않는다. 대시보드 API는 모든 소비처를 조사한 후 기존 경로·인증·업무 판정을 유지하는 최소 상태 보고 보완으로 한정한다.
- 가입 자격의 개인→약국 연결, 공급자 모집 공급가·실 PG·수취 주체, 사이니지 재생기 계약 변경, 매장별 AI 이력 계약은 후속이다. 실계정 로그인·운영 데이터 쓰기·실기기 테스트를 이번 로컬 검증에 포함하지 않는다.

## TODO

- [x] 최신 origin/main·AGENTS·전용 worktree·branch와 clean 기준선 확인.
- [x] 정본·최근 CHECK·기존 개발 diff·route와 역방향 소비처를 대조하고 아래 계획 보완.
- [x] 기존 세 업무 개선을 최신 협업체 필터/선택/이동 계약을 보존하며 적용.
- [x] 대시보드의 조회 실패·권한/매장 문맥 미확인·실제 0건을 구분. 공통 API 소비처와 영향 확인.
- [x] 업무 흐름의 상태·표시·선택 전달을 작은 기존 로컬 조각으로 정돈. 범위 밖 전면 리팩터링 제외.
- [x] 변경 범위 Store/API 회귀·타입/build·집중 lint, 실제 컴포넌트+합성 API의 desktop/mobile 검증.
- [x] CHECK에 실행 결과·미검증·후속 경계 기록. TODO 상태·문서 링크·민감정보·diff 확인.
- [x] path-specific stage/commit, named branch push, 원격 개발 HEAD 일치·작업 범위 미커밋 0 확인. 최종 문서 인계 결과는 CHECK와 완료 보고 참조.

## 조사 후 보완

- 역할/업무공간·Store 접근·소비자 commerce/B2B·약국 설계 §15-8·실행 관리·자료함 사본·문서 lifecycle 정본과 최근 협업체 CHECK를 대조했다. 상담은 양방향의 마지막 입력/번역만 화면 메모리에 유지하며 새 상담·언어/모드·계정/매장 변경·pagehide에서 폐기한다. 이력 저장·자동 번역을 추가하지 않는다.
- `40a33194a5`의 Store 구현과 회귀를 재사용하되 최신 `StoreContentsSelector`의 협업체 필터/불변 출처/상품 선택 복귀를 보존한다. 과거 TODO/CHECK를 완료로 다시 쓰거나 이전 worktree를 변경하지 않는다. 이번 branch는 해당 세 기능을 포함하므로 이전 개발 branch를 중복 통합하지 않는다.
- 사용처는 원본 갱신 사본의 기존 조회 범위를 유지한다. 부분 집계 0을 미사용으로 단정하지 않고 태블릿 블록/영상 미집계·POP 근사·조회 실패·재시도를 함께 표시한다.
- 위치 이동 state는 현재 매장/서비스 scope와 해당 mount의 `/execution` 복귀 URL만 허용한다. 목록에서 대상이 확인된 후 기존 QR/태블릿 패널을 연다. 선택 대상·전체 선택·출력 집계를 같은 범위로 맞춘다.
- 대시보드 역방향 소비처: 공통 `createStoreHubApi.fetchLiveSignals`, Store와 KPA의 wrapper, KPA 기존 홈, Store `homeOverview`다. 서버 controller의 현재 등록은 KPA namespace 한 곳이다. 공통 package/기존 응답 숫자·경로·인증을 유지하고 항목별 `availability`를 추가한다. 기존 wrapper/소비처는 추가 필드를 요구하지 않는다.
- 서버는 실제 조회 가능한 주문/상담과 출처가 없는 판매/설문을 구분한다. 매장 문맥 없음·DB 오류·잘못된 결과는 확인 실패이며 실제 0과 같지 않다. 주문 원장·금액·결제·수취 판정 SQL은 바꾸지 않는다.
- Store는 추가 상태가 없는 구버전 응답도 확인 실패로 취급하고, 항목별 가용 값만 표시한다. 실패/미지원 항목 때문에 확인된 다른 수치·빠른 업무가 사라지지 않게 한다. 기존 `sellerOrganizationId`에는 B2B 생성 시 약국 ID를 쓰므로 필드 이름을 이유로 주문 소유 판정을 변경하지 않는다.

## 검증 경계

합성 API/인증/매장 검사는 실계정 업무 검증을 뜻하지 않는다. 실제 결제·배송·직원 승인/해제·물리 기기·외부 AI 비용 검증은 실행하지 않는다. 이번 작업 전용 로컬 서버·브라우저와 fixture는 종료 후 정리하고 증적은 저장소 밖에 보존한다.

## 개발 종료

개발 commit `709f10a03d`을 전용 branch에 push하고 원격 HEAD 일치를 확인했다. Store 전체 781/API 관련 35/합성 브라우저 40 PASS, Store/API build·타입·집중 lint 통과다. 결과 기록 보완도 같은 branch에 push하며 PR·main 병합·배포는 통합 담당 범위로 남긴다.

## 동일 WO 후속 — 최신 main 결합 검증

사용자가 기존 세 개선의 최신 main 결합·재검증까지 요청하여 같은 전용 branch에서 이어간다. 앞선 개발 종료 기록은 시작 main `3917a9522d` 기준이며, 이번 후속은 main `7dc02646da`를 포함한 결과를 검증한다. PR·main 병합·배포는 계속 제외한다.

- [x] 최신 main 명시 fetch, 원격 개발 HEAD `addc51af69`·clean·진행 중 Git operation 없음 확인.
- [x] main 변경 371개 경로와 개발 26개 경로의 겹침 0, 정본/지침·의존성·workflow 변경 없음 확인.
- [x] clean 상태에서 `origin/main`을 같은 개발 branch에 일반 merge. 이력 재작성 없음. 결합 commit `8bbe9f1778`.
- [x] 결합 상태의 frozen 설치·Store 전체 회귀/build·관련 API 회귀/타입/build·집중 lint 실행.
- [x] 실제 컴포넌트+합성 API의 desktop/mobile 주요 흐름 재검증, 전용 서버/브라우저 종료 확인.
- [x] 최신 코드와 CHECK의 소비처/검증 기준을 맞추고 결과·미검증 경계 기록.
- [x] 문서 정합·민감정보·정확한 stage 범위 점검 후 같은 branch push, 원격 HEAD 일치·clean 확인 (`0b0fa24eb2`). 완료 상태 기록도 같은 branch에 push하며 최종 HEAD는 완료 보고에서 인계.

## 통합·배포 후속 — 2026-10-23

사용자의 ‘main 병합, 배포’ 지시로 같은 WO의 통합 담당 역할을 이 공간에서 수행한다. 검증한 개발 HEAD는 `46a6dec358`이며 이전 개발 종료점 기록을 보존한다. 실제 계정 업무·운영 데이터 쓰기·AI 이력 계약을 추가하지 않는다.

- [x] 개발 원격 HEAD·clean·현행 ruleset·기존 PR 없음·진행 중 배포 없음 확인.
- [x] 최신 main `cd091bc221`의 260개 변경 경로 대조. 겹침은 QR 안내 링크 제거와 설계 문서 2곳이며 일반 merge `eb9a77b3bb`로 양쪽 변경 보존.
- [x] 최신 결합 상태 frozen 설치·Store 785/API 90·Store/API build·타입·집중 lint·PC/모바일 합성 40 PASS. CI의 음성 콜백 검사 대기 보완 후 Store 전체 재통과.
- [ ] 개발 branch push 후 PR 생성, 정확한 HEAD의 필수 CI 및 Codex 지적/스레드 확인·처리.
- [ ] main 재확인·검증 HEAD 고정 PR merge·post-merge CI 확인.
- [ ] 현행 Delivery 판정·API/Store 운영 반영 확인, 로그인 없는 읽기 검증.
- [ ] CHECK·TODO 결과 기록, 문서 정합, 자기 작업공간의 정리 가능 여부 확인 및 종료.
