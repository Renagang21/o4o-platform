# 내 매장 상담·상품 근거·채널 운영 통합 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-25 · **최종 갱신**: 2026-10-25
> **사용자 지시**: ‘남은 작업을 모두 한번에 진행한다’. 상담 사용성·매장 AI 데이터 범위·상품 근거에서 상담/고객 안내 연결·태블릿/사이니지/QR 운영을 한 개발 묶음으로 조사·보완·검증하여 push한다.
> **시작 main**: `b7d2cfd86edf4d26d19d1e954fa754f74faf8f7d`
> **의존 작업**: 선행 사용성·검토안 `03b9a127d4`, 기록 `963cb3df87`을 새 branch에 fast-forward로 포함. 이전 worktree는 수정하지 않음.
> **branch**: `wo/store-consultation-content-channel-completion`
> **종료점**: commit·push·검증/미확인 인계. PR·main 병합·배포·운영 업무 write 제외.

## TODO

- [x] 최신 origin/main·AGENTS·정본 색인·기존 branch/worktree를 확인하고 전용 작업공간에서 선행 개발 포함.
- [x] 상품 설명 목적/근거·상담 자료/API/Extension·매장 컨텐츠·태블릿/사이니지/QR 적용과 소비처를 조사하여 아래 구현 범위를 확정.
- [x] 상담 시작/언어·음성·역할/매장 전환·권한 거부·다음 고객·지연 결과의 남은 연결 문제를 수정.
- [x] 상품·근거 확인 → 전문 판단 지원/고객 설명 구분 → 담당자 확인 → 고객 안내의 연결을 기존 Core/Extension·권한·자료 소유권에 맞춰 개발.
- [x] 확인한 컨텐츠를 기존 태블릿/사이니지/QR의 미리보기·적용·수정/실행 확인으로 이어지게 하고 입력/선택·실패/빈 결과·재시도를 보완.
- [x] 매장 AI 데이터 범위를 기존 저장 자산과 대조해 정리. 사용자는 원문 장기 이력 없이 확인한 상품/컨텐츠·업무 결과 재사용을 선택. 기존 자산과 현재 상담 상태만 사용.
- [x] frozen 설치·변경 범위 테스트·타입/build·집중 lint·desktop/tablet/mobile 브라우저·권한/매장/늦은 응답 회귀 검증.
- [x] 실제 기기·마이크·언어 품질·유료 provider·직원 계정/해제의 실행 가능 범위를 확인하고 합성 검증과 구분. 미실행 범위는 CHECK에 명시.
- [ ] TODO/CHECK·정본 정합·민감정보·정확한 stage 확인 후 commit·named branch push·원격 일치/CI 상태/작업 트리 인계.

## 조사 기준과 안전 범위

- [선행 CHECK](../checks/CHECK-O4O-STORE-CONSULTATION-USABILITY-AND-DATA-CONTRACT-V1.md)의 Store 831·상담 56·브라우저 24는 이전 작업의 증거이며 이번 실행에 합산하지 않는다.
- [상품설명서 활용 원칙](../guides/products/O4O-PRODUCT-DESCRIPTION-PROFESSIONAL-USE-POLICY-V1.md)에 따라 상품 사실/전문 근거/판단 지원/소비자 설명을 구분한다. 전문 정보라는 이유로 일괄 제거하지 않는다. 기존 QR 설명서를 공식 지식 기반으로 자동 채택하지 않는다.
- 기존 Core/모델/회계·자료 원장·적용 API를 우선 사용한다. 공통 Core/이력 계약·DB schema·의존성·인프라 변경이 필요한 경우 필요성과 현재 승인 범위를 먼저 확인하며, 운영 DB/상태를 개발 검증에 사용하지 않는다.
- 현행 직원 Secret은 앞 검증에서 세션을 발급받지 못했다. 계정/비밀번호를 추측·재설정하거나 대신 권한을 발급하지 않는다. 실제 값·매장명·응답 원문을 공개 파일/로그에 남기지 않는다.
- 실제 마이크/현장 소음·실제 QR 인쇄/스캔·현장 사이니지/태블릿 기기가 이 환경에 없으면 미실행으로 인계한다. 새 테스트/합성 API 결과를 실제 운영 품질 검증으로 표시하지 않는다.

## 조사 후 보완

- [상품설명 전문 활용 원칙](../guides/products/O4O-PRODUCT-DESCRIPTION-PROFESSIONAL-USE-POLICY-V1.md), [약국 설계 §15-8-2](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md#15-8-2-전문-판단-초안확인한-자산-재사용-2026-10-25-개발-branch), 기존 guidance/source resolver·Core policy runtime·상품 설명 조회·MLC/QR·태블릿 apply/preview·사이니지 소비처를 대조했다.
- 문단 선택/번역에 전문 판단을 억지로 섞지 않고 동일 Core 위의 약사 전용 read/draft Extension을 추가했다. 근거/결과를 구분하고 현재 권한·자료를 재확인한다. 실제 게시·고객 공유·적용은 기존 도메인 실행을 유지한다.
- 원문 가져오기는 기존 편집기에 확인 후 추가만 하며 승인 원장을 복제하지 않는다. QR 그룹 GET에 publicKey가 없으므로 기존 발급 QR GET을 사용한다. 태블릿/사이니지 이동 query는 현행 `topic`을 사용한다. API 계약·schema를 추정해 확대하지 않았다.
- 현재 상담 만료 정리를 기존 테이블/연결 만료 기준 위에 구현했다. 기본 dry-run이며 운영 apply는 통합/배포 담당 인계다. 격리 PostgreSQL 15에서 동시 heartbeat·늦은 epoch·batch 경합 5건을 확인했다.
- 최종 Store 845·약국 API 186(기존 skip 187)·시작/QR 계약 91·브라우저 45 통과. 타입/build·집중 lint 통과. 실제 운영과 구분한 상세 증거·잔여 실행 조건은 [CHECK](../checks/CHECK-O4O-STORE-CONSULTATION-CONTENT-CHANNEL-COMPLETION-V1.md)에 있다.

문서 정합: 발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 2건 / 별도 WO 제안 0건. 상세는 CHECK를 따른다.
