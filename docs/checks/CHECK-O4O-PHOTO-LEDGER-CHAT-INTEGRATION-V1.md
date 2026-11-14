# 사진 거래장 저장 · O4O/ChatGPT 연결 검증

> **상태**: ACTIVE
> **작성일**: 2026-11-14 · **최종 갱신**: 2026-11-14
> **근거 WO**: [사진 거래장 입력](../work-orders/WO-O4O-PHOTO-TRANSACTION-LEDGER-V1.md)

## 판정과 범위

개발 구현·격리 검증 PASS, 운영 적용 PENDING. 실제 사용자 사진은 공개 저장소·테스트 DB에 넣지 않았다. 운영 DB 연결·migration 적용·PR 생성·배포·실 AI 호출을 하지 않았다. 이 기록은 실사용 완료나 실모델 인식 정확도의 근거가 아니다.

## 저장과 권한

- 실제 PostgreSQL 15를 임시 로컬 cluster에서 실행하고 canonical baseline부터 모든 incremental migration을 적용했다. 매 prefix의 fingerprint가 기존 기대값과 일치했으며 새 migration 상태를 측정해 manifest·expected state를 함께 등록했다. 빈 신규 테이블 down/up 후 이전 prefix와 새 상태를 각각 확인했다. baseline·과거 기대값은 바꾸지 않았다.
- 실제 SQL transaction으로 초안 저장/읽기, 수정 이력, 확정, 상품 후보 동시 전달, 재시도·동일 requestId의 다른 내용 거절, 오래된 version 거절, 원본 사진 바이트/해시, 매장 격리, 권한 철회, 서버 동의 철회, 동시 중복 확정, 사진/명세서번호 없는 내용 중복, 후보 전달 실패 롤백을 시험했다.
- StoreAdapter의 인증 resolver는 합성 권한으로 mock했다. 현재 서버 동의 행과 매장 조건·실 SQL 저장은 실제 처리했다. 실 OAuth 로그인부터 DB까지의 전체 실계정 시험으로 확대하지 않는다.
- 후보는 기존 관리자 목록에서 조회 가능한 `external_api`/`거래장 사진` pending이다. 후보에 금액·원본 사진을 넣지 않는다. 사진 자료를 약국 프로그램 원본으로 위장하지 않으며 기존 프로그램 테이블·상품 정본·주문·결제에 쓰지 않는다.
- 계정 attribution 분리·폐업 자료 분류를 등록했고, 신규 테이블을 포함해 폐업 writer fence 누락 0을 실제 DB에서 확인했다. 서버 보관 중단 시 자료·사진·이력·재시도와 미처리 후보를 정리한다.

## 채널과 UI

- ChatGPT는 별도 ledger scope·허용 store workspace·서버 보관 동의를 검사한다. 일반 문서 권한만으로 거래장 접근을 허용하지 않는다. 추가 도구는 준비/조회/목록 3개이며 확정은 없다. 연결 해제·만료와 상태 변경을 서버에서 재검사한다.
- O4O main은 거래장 요청을 별도 처리한다. 판독은 기존 공급자/사용량 계측을 통과하며 지원하지 않는 이미지 제공자는 실패한다. OpenAI vision 응답 중단은 부분 결과 저장으로 처리하지 않는다. 공급자 호출은 mock으로만 시험했고 품질/가격/과금 수치를 측정하지 않았다.
- 실제 검토 페이지 컴포넌트를 Vite harness에서 합성 API 응답으로 띄웠다. Chromium 1280px·390px에서 수량/금액 수정→저장→검토/원본 미보관 체크→반영이 동작했다. 수평 넘침/페이지 실행 오류 0. 원본 사진 추가·재조회, 비로그인, 서버 동의 없음도 확인했다. 모바일 캡처를 직접 열어 확인했다.
- 이 브라우저 시험은 컴포넌트와 fixture를 사용한다. 실 사이트 인증·전체 앱 layout·배포된 CSS 확인은 배포 후 Demo에서 진행한다. 사용자 첨부 파일을 받아 판독하는 실제 ChatGPT 앱 시험은 미실행이다.

## 자동 검증 결과

- 거래장 Jest: 6 suites / 49 tests (순수 검증·실 PostgreSQL·ChatGPT scope·O4O chat·mock native vision·first-party Origin).
- 기존 외부 AI 및 server-work/bridge Jest: 10 suites / 99 tests.
- web-neture Vitest: 4 files / 20 tests (검토 화면·동의·연결 카드·요청 예제).
- API·web-neture TypeScript·web-neture production build, 변경 파일 ESLint, migration contract, docs 민감정보, staged scope 검사 통과. 최종 실행 수치는 HANDOFF에서 교차 확인한다.

## 정리와 배포 후 확인

격리 시험 종료 후 신규 명세서·수정·사진·요청 업무 행 0을 확인했다. 테스트용 사용자·매장·후보는 해당 fixture ID로 정리했다. 운영 시험 데이터를 만들지 않았다.

통합 담당은 신규 영구 스키마/API/scope와 동의 문구를 검토하고 migration→API/웹 배포 순서를 따른다. 배포 후 Demo 경영자의 서버 보관 선택, 승인 직원의 검토, 타 매장/비로그인/철회 접근 차단, PC·모바일과 앱 재연결을 확인한다. 실제 파일은 사용자 검토를 거친 목적 있는 업무 기록으로 보관하며 임시 운영 데이터를 만들고 비활성화로 끝내지 않는다.

실제 명세서는 전체 행·공급자/문서 식별자·수량·단위·세금·할인·반품이 보이는 표본으로 인식 품질을 별도로 확인한다. 현재 제공된 가림·잘림 사진은 항목 설계 참고이며 확정 저장 증적이 아니다. 프로그램별 자동 대조와 관리자 범용 후보 정비 확장은 후속 범위다.
