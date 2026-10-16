# WO-O4O-STORE-GUIDANCE-SIMPLIFICATION-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-16 · **최종 갱신**: 2026-10-16
> **목적**: 고객이 이해하기 쉬운 안내 화면과 매장 운영자의 제작·수정·적용 흐름을 함께 단순화한다.

## 1. 사용자 지시와 종료점

- 조사 제안에 따라 TODO를 먼저 만들고 코드·문서를 점검한 뒤 TODO를 수정하며 구현한다.
- AI 도입 전 수동 흐름을 정돈한다. 코드 복잡성을 피하고 작은 작업을 빠르고 확실하게 완료한다.
- 종료점은 검증 → commit → push다. **PR 생성·main 병합·자동 병합·배포는 하지 않는다.**
- 최신 `origin/main` `04ff6b829cc087c676c663ef688153497895889c`에서 전용 branch `wo/store-guidance-simplification`과 worktree를 만들었다. 기존 작업공간은 수정하지 않는다.

## 2. 초기 TODO 후보 — 코드·문서 대조 전 (실행 상태는 §3)

- 정본·현재 producer/consumer·기존 검사·공유 모듈 영향도를 대조한다.
- 고객용 태블릿의 정보 우선순위와 터치 동작, QR 휴대전화의 즉시 읽기 흐름을 정돈한다.
- 실제 결과와 맞는 기본 배치를 제공하고 불필요한 템플릿 선택·입력을 줄인다.
- 안내 제작 → 저장 → 적용, 사용 중인 안내 → 동일 대상 편집 → 결과 확인을 연결한다.
- 사이니지·QR의 기존 기능 중 함께 단순화할 범위를 확인하고 적용한다.
- 비동기·실패·재시도·매장 전환·중복 실행과 기존 URL·권한·데이터를 보존한다.
- 적절한 테스트·build·집중 lint·desktop/mobile browser를 실행하고 문서와 TODO를 정합시킨다.
- 최종 diff·문서·Git 상태를 검토하고 commit·push한다. PR은 만들지 않는다.

## 3. 점검 후 범위와 수정한 TODO

### 대조 결과

- 현재 제작기는 단계 마법사가 아니라 한 화면의 편집 영역이다. 선택 사항까지 모두 펼쳐 보이는 부담을 줄인다. 새 단계 엔진을 만들지 않는다.
- 새 비교 전용 모델 대신 기존 `corner_information_basic_v1`·`product_focus`·`corner_overview_qr`의 세 기본 배치를 사용한다. 기존 `product_grid_qr`·`idle_touch_video`는 읽기·편집·저장 호환을 보존하고 새 제작의 기본 선택에서 제외한다.
- 상품 이미지를 쓰지 않는 현행 고객 표시 정책을 유지한다. 선택용 그림도 실제 텍스트 카드·안내 배치와 맞춘다.
- 공용 편집기 소비처는 Store·KPA 매장·KPA 운영자·Neture 공급자다. 고객 뷰어와 미리보기는 Store·KPA·Neture 제작기 및 KPA 공개 태블릿/QR에서 소비한다. 역할별 API/출처 주입은 유지한다.
- 공통 내 매장과 KPA 지정 매장은 같은 Store child route를 쓴다. 직접 수정은 제작 화면으로 연결하고 운영 화면에 편집기를 복제하지 않는다.
- QR 모바일은 대기 영상을 제외하는 기존 계약을 유지한다. 휴대전화에서 상품 QR을 다시 스캔하는 대신 연결된 안내를 직접 열도록 한다.
- 사이니지의 게시된 재생목록·스케줄·실제 기기 재생은 서로 다르다. 기존 일정 폼의 기본/상세 입력과 결과 표기를 개선하며 새 즉시 송출 엔진·원장 통합은 하지 않는다.

### 수정한 실행 TODO

- [x] 최신 main·정본·공유 UI와 raw-source 소비처·기존 검사를 조사한다.
- [x] 공용 고객 화면: 제목/QR 배치, 한 방향 스크롤, 읽기 위계, 첫 제품 강조, 키보드/터치 상세 진입·닫기를 개선한다.
- [x] 제작기: 세 기본 배치·실제와 맞는 그림, 추가 자료/대기 영상/배치/관리 상세의 선택적 펼침, 입력 보존과 중복 저장 방지를 적용한다.
- [x] Store: 수정 영향 위치 안내, 저장한 안내의 즉시 적용 진입과 실패 재시도, 사용 중 안내의 직접 수정 진입을 연결한다.
- [x] QR 모바일의 정보 순서·상세 보기·연결 안내 직접 열기와 기존 URL/자료 보존을 검증한다.
- [x] 사이니지 일정의 기본/상세 입력을 정돈하고 일정 설정을 실제 재생 완료로 표시하지 않는다.
- [x] 공유 소비처 회귀·Store 전체 테스트·영향 앱 build·집중 lint·desktop/mobile 합성 API browser를 실행한다.
- [x] 설계·CHECK·TODO를 실제 결과와 맞추고 최종 diff·인계 내용을 검토한다. Git 종료점은 §1의 commit·push이며 PR은 만들지 않는다.

## 4. 경계

- 소비자 정보 제공·상담 지원 범위와 공급자→매장 B2B 경계를 유지한다. 소비자 cart/checkout/결제는 추가하지 않는다.
- 기존 ScreenSet·블록·제품/자료 연결·독립 사본·QR URL·매장 소유권을 유지한다.
- AI 대화창·생성·학습, 새 편집/재생 엔진, API/DB/권한/route 계약·의존성·CI 변경은 포함하지 않는다.
- `store_playlists`와 `signage_playlists`를 통합하거나 dual-write하지 않는다.
- 실제 로그인·운영 데이터 변경·실제 기기 연결/재생·인쇄/스캔은 별도 현장 검증이다.

## 5. 참고 기준

- [정본 지도](../CANONICAL-INDEX.md)
- [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)
- [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) · [B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)
- [공통 모듈 변경](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)
- [매장 실행 관리](../design/DESIGN-O4O-STORE-EXECUTION-MANAGEMENT-CANONICAL-V1.md)
- [사이니지 모델 경계](../baseline/O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1.md) · [태블릿 영상 재생 경로](../baseline/O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md)
- [기존 화면 배치 설계](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md)

## 6. 문서 정합

사용자 지시로 초기 TODO를 작성하고 실제 코드·정본 대조 후 실행 TODO를 수정했다. 현재 설계 문서의 2026-10-16 절과 관련 CHECK에 변경·검증 결과를 반영한다. 과거 WO/CHECK의 당시 결과는 다시 쓰지 않는다.

## 7. 검증·인계

- Store 48 files / 590 tests, 기존 계약 5 suites / 111 tests, Store·KPA·Neture build, 집중 lint, desktop/mobile browser 42개 시나리오와 문서 검사가 통과했다.
- 세부 결과·공유 소비처·실계정/기기 미확인 범위는 [CHECK](../checks/CHECK-O4O-STORE-GUIDANCE-SIMPLIFICATION-V1.md)에 기록했다.
- 최종 main `daad0563c`의 개발 push-only 인계 정책을 확인했다. 이번 구현과 파일 충돌은 없으며 시작 기준 commit은 유지한다.
- 개발 인계 branch는 `wo/store-guidance-simplification`이다. PR CI·main 병합·배포와 현장 실사용 검증은 완료로 표시하지 않는다.
