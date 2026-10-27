# 자동화 데이터 정비 진입·문맥 연결 검증 V1

2026-10-27 · 첫 최소 보완 WO · main 미병합

## 결과와 재사용

사용자 인계서의 첫 단계는 CONNECT로 선정했다. 대표 홈 O4OHomePage의 기존 입력창에 데이터 정비 진입을 추가하고 항목·대상·확인 내용 또는 질문을 기존 요청 문자열로 준비한다. 이미 입력한 내용은 함께 유지한다. 실행 중에는 정비 버튼·입력을 잠그며 계정 변경/로그아웃의 기존 초기화에 새 패널 상태를 포함했다.

현재 업무와 서버 질문 표시는 같은 run 재개 앵커가 있을 때만 제공한다. 이전에 끝난 업무의 문장을 새 작업 문맥으로 자동 채택하지 않는다. 기존 runId·원래 target·workScope·첨부·세대 보호·서버 인증/권한 계약은 그대로다. 합산 2,000자 제한을 넘으면 사용자 입력을 자르거나 실행하지 않는다.

정비 내용은 **요청 준비**이며, 실제 업무 데이터 저장 완료나 영구 개인화·공통 규칙 변경을 의미하지 않는다. 기존 실행기에 사용자가 요청한 내용으로 전달하며 결과·추가 확인은 기존 응답에서 확인한다. 새 UI가 임의 SQL·schema 변경·공용 상품 정본 자동 보정을 실행하는 경로는 없다.

## 짧은 census

- 입력/재개: services/web-neture/src/pages/O4OHomePage.tsx, lib/ai/unified-request.ts, lib/ai/work-agent.ts의 nextResumeAnchor.
- 질문/교정/Experience: apps/api-server/src/services/ai-tools/work-assistance.ts와 work-agent-runtime.ts, tools/o4o-local-agent/src/work-assistance.mjs/local-db.mjs. 형상·소유권·검증 경계를 변경하지 않았다.
- SQLite: local-db.mjs의 중앙 접근·Dataset/Mapping 및 local-data-cli.mjs import/export/bind, 기존 local runtime CHECK를 재사용한다. 이번에 테이블·설정·기억 저장소를 추가하지 않는다.
- 사이트 실행: 현재 browser-site-registry의 O4O 홈·약학정보원 두 대상과 DOM/UIA 기반 확인. 거래처 주문 사이트 Adapter가 완료됐다는 근거는 없다.
- 주문 준비: 기존 B2B 주문/매장 order-worktable을 외부 거래처 빈 주문 시트의 완성으로 확대하지 않는다. 후속 작업에서 Dataset/품목 매칭·포장단위의 재사용 가능 지점을 좁혀 확인한다.
- 구매전표/OCR: 기존 표 파일 구조 이해·mapping·정규화와 product OCR 자산이 있지만 사진 전표 전체 등록·중복 처리·구매 누적 완주는 미확인이다. 이번에 OCR/유료 AI를 호출하지 않았다.

## 검증

- 홈·패널·첨부·재개 Vitest: 5파일/37 PASS. 신규9개 포함, 기존28개 보존.
- PC/모바일 Chromium 합성 패널: 1440/390/320px 3 PASS. 기존 입력+확인 값 보존, pageerror0, 가로 넘침0. 실제 Tailwind 설정으로 생성한 패널 CSS를 적용한 최종 실행과 모바일 육안 확인을 포함한다.
- 실제 홈 연결 테스트는 자동 실행 없음, 같은 run/원래 대상/업무 범위/첨부 보존, 통신 오류 후 같은 run 재시도, 계정 변경 초기화, 비로그인 기존 로그인 gate를 확인했다.
- 초기 새 worktree의 offline install은 최신 main imapflow tarball 캐시 누락으로 실패하여 frozen lockfile을 유지한 정상 설치로 해결했다. package/lock 변경0.
- 최초 테스트·서비스 빌드는 account-ui 등 의존 package 빌드 이전 실행으로 실패했다. 공통 build:packages 완료 후 재실행하여 위 회귀를 확인했다. 신규 홈 테스트의 법정정보 비동기 mock 누락도 실제 계약대로 수정했다. 실패를 PASS로 계산하지 않는다.

최종 TypeScript PASS, 변경 ESLint 오류0·기존 O4OHomePage의 unused-disable 경고1(유지). Neture production build(tsc + Vite) 최종 PASS. 기존 Browserslist·큰 chunk 경고는 유지했다. 운영 로그인·AI 호출·외부 사이트 자동화·DB write·Windows 실기기 검증은 미실행이다.

## 영향과 인계

Home route `/` 한 소비처의 기존 composer를 확장한다. 다른 서비스·공유 package·권한 map·API/Core·SQLite schema·외부 AI 연결·상품 정본·주문 제출은 수정하지 않는다. 브라우저 fixture는 패널 단위이고 실제 홈 라우트 연결은 Vitest 경계 mock으로 검증했다. 실제 데이터 수정/주문/AI 품질을 검증했다고 주장하지 않는다.

문서 정합: 상위 자동화 진화 원칙·Assistant V2·Experience·AI Foundation 및 기존 CHECK를 재사용했고 canonical/Frozen 본문이나 색인 상태를 바꾸지 않았다. [WO](../work-orders/WO-O4O-AUTOMATION-DATA-MAINTENANCE-CONTEXT-V1.md)에 KEEP/CONNECT/후속 EXTEND를 구분했다. 이 개발의 종료는 전용 branch commit·push 인계다. PR CI/리뷰·main 병합·배포는 이 작업에서 실행하지 않는다.

최종 점검에서는 긴 이전 답변을 새 요청에 재귀적으로 복사하면 입력 한도 때문에 재개가 막힐 수 있는 경우를 보완했다. 업무 목표는 기존 run으로 유지하고 화면에 표시하며, 전송에는 현재 확인/질문과 사용자 작성 중 입력만 포함한다. 긴 이전 문맥에서도 입력 준비가 가능한 회귀1개를 추가했으며 최종37개와 타입·production build가 PASS다.
