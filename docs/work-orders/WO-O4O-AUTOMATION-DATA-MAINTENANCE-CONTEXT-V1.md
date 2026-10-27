# 자동화 데이터 정비 진입·업무 문맥 연결 V1

2026-10-27 · IMPLEMENTED — 검증·push 인계 · main 2b8fc3b23d · 사용자 인계서 HANDOFF-O4O-AUTOMATION-EVOLUTION-AND-PHARMACY-OPERATIONS-V1 §13

## 짧은 재대조

| 대상 | 확인·판정 |
|---|---|
| 기존 입력창 | O4OHomePage → sendUnifiedRequest, 서버 unified-request/Work Agent. KEEP |
| 질문·교정·재개 | WorkAgent neededInput·nextResumeAnchor(runId/원래 target), local work-assistance와 local.db assistance/context/Experience. KEEP, 새 질문 엔진 없음 |
| 데이터 정비 진입 | 홈에 없음. 항목·대상·확인 내용/질문을 기존 입력·같은 run에 연결. CONNECT |
| 주문 시트·주문 사이트 | 기존 B2B 주문/매장 order-worktable과 브라우저 Work Agent는 서로 다른 축이다. 이번 짧은 대조에서 빈 외부사이트 주문 시트의 동등 구현은 확인하지 못했다. browser-site-registry의 현재 대상은 O4O 홈·약학정보원 두 곳이며 거래처 주문 사이트 Adapter는 확인되지 않음. DOM/UIA 기반은 KEEP, 외부 주문 사이트 연결은 후속 EXTEND로 두고 신규 주문 제출 코드는 추가하지 않음 |
| 구매전표·OCR | file-understanding의 표 구조·mapping·정규화와 기존 product OCR 자산 확인. 구매전표 사진→검토→중복 방지→SQLite 구매이력의 완주 근거는 미확인. 후속 EXTEND 판정 대상 |
| Local SQLite | local-db 단일 접근·Dataset/Mapping, local-data-cli import/export/bind·백업/마이그레이션 재사용. KEEP |
| 환경 개선 | Experience·correction·Workflow Candidate 기존 원장·개인화 경계 유지. 이번 입력을 공유 규칙이나 영구 설정으로 자동 저장하지 않음 |

## 최소 보완

대표 홈의 단일 입력창 아래 데이터 정비 패널을 추가한다. 상품 식별정보/포장단위/거래처/재고/업무 실행 조건을 선택하고 대상을 명시한다. 사용자의 기존 입력·현재 업무·서버 질문을 표시하고 확인 내용 또는 질문을 입력창에 준비한다. 실제 실행은 기존 요청 실행 버튼이다. 같은 runId/대상/workScope·첨부·인증·서버 권한 재검사를 그대로 사용한다.

이 패널은 정비 요청 준비이며 데이터 직접 저장 완료가 아니다. AI 제안·데이터 반영 결과는 기존 실행 응답으로 확인한다. 새 범용 편집 엔진·API·DB/SQLite schema·새 기억 저장소·유료 API·외부 전송 경로 없음. 조제량·구매전표·추정재고·주문 제출은 이번 구현에 포함하지 않는다.

공통 영향: O4OHomePage의 route 소비처와 홈 회귀, 통합 입력/재개 회귀를 확인한다. 공유 package·Core·sidebar·권한 map은 수정하지 않는다. Attachment 전송과 동일한 기존 서버 계약을 사용한다. 운영 데이터·외부 사이트·실계정·AI 비용 발생 테스트는 하지 않는다.

- [x] 기존 정본·선행 CHECK·코드 재사용 대조
- [x] 패널·입력 준비·같은 업무 문맥 연결
- [x] 홈 인증/로그아웃·재개·오류·길이·첨부 보존 회귀
- [x] 타입·lint·production build·브라우저 합성 검증
- [x] CHECK·commit·push·인계

새 개발 WO의 종료는 개발 branch push까지다. 이 공간의 이전 상품 관리 배포 승인으로 신규 자동화 WO의 PR/운영 배포를 자동 실행하지 않는다. 통합·배포는 별도 사용자 지시/통합 담당 단계로 남긴다.

## 후속 보완 순서 (이번에 전부 구현하지 않음)

| 순서 | 업무 가치·재사용 | 판정 전 확인 |
|---|---|---|
| 1 이번 WO | 정비 요청 준비 → 기존 질문·같은 업무 재개 | 새 질문/저장 엔진 없음 |
| 2 주문 준비 묶음 | 빈 시트·품목/수량/거래처 편집, 이전 입력·포장단위 교정 재사용. 기존 Dataset/Mapping·개인/매장 범위 활용 | B2B 주문 원장과 외부 주문 준비를 구분하고 기존 저장 계약으로 표현 가능한지 확인. 실제 주문 제출은 기존 승인 정책 유지 |
| 3 외부 실행·자료 누적 | 준비한 시트로 거래처별 검색·입력을 연결. 전표 사진/표 자료의 검토·단위 환산·중복 검사와 상품/사용량 누적을 기존 정규화에 연결 | 대상 사이트/프로그램 실환경·허용 범위 확인, 환자 자료 제외, 새 schema·외부 전송·유료 API는 별도 결정 |
| 4 반복 개선 | 실제 실행·질문·교정·시간·AI 호출 기록으로 재사용 후보를 찾음 | 개인 교정→Shared Candidate 자동 승격 금지. 이용 빈도와 근거 없이 전수 AI 분석/대시보드 추가하지 않음 |

2~4는 후속 판단·개발 방향이며 구현/배포 완료가 아니다. 재고 정확도는 확인/프로그램 기록/추정/미확인으로 구분할 후속 계약이며 정확한 재고가 없다는 이유로 빈 주문 시트를 막지 않는다.

최종 검증: [CHECK](../checks/CHECK-O4O-AUTOMATION-DATA-MAINTENANCE-CONTEXT-V1.md). Vitest37개·PC/모바일3개·타입·production build PASS, lint 오류0(기존경고1). 운영·AI 호출·main 통합은 미실행.
