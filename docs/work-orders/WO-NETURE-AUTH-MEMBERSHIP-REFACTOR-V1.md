# Neture 인증과 가입 리팩토링

> **2026-10-10 용어 정비**: 현행 사업 명칭은 **약국 협력사업**이다. 내부 식별자·가입/승인·주문 계약과 과거 실행 결과는 유지한다. 대표 홈의 탐색 분류·준비 중 노출은 [서비스 탐색 정본](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md)을 따른다. 이 갱신은 화면 구현·배포 완료를 뜻하지 않는다.

> **상태**: ACTIVE
> **작성일**: 2026-10-07 · **최종 갱신**: 2026-10-07
> **근거**: 사용자 승인 — 공통 로그인, 메인 이메일 확인, 서비스별 가입, Store 약국 전용, 사업자 증빙, 전 서비스 Demo 버튼. 구현·검증·push·PR까지 승인, merge 제외.

## 정책

메인은 이메일 확인으로 가입을 완료한다. 연결 서비스 가입과 승인은 독립이다. Store는 약국 대상이고, 공급자와 약국은 사업자등록증 기재 정보와 사본을 제출한다. 약국은 약사 면허번호를 추가하며 면허증 사본은 요구하지 않는다. 약국 자격은 운영자가 오프라인으로 확인한다. 공통 개인 모바일 번호와 수정 가능한 커뮤니티 닉네임을 활용한다. 이미 등록한 정보는 서비스마다 재입력하지 않는다. 약국 협력사업 조건은 서비스 개설 시 운영자와 정한다. 유료화는 후속 테스트에서 결정한다.

## 변경 승인 범위

Auth·Membership·Approval·RBAC의 정책 연결, 로그인 게이트·handoff·서비스 권한 계약, 공통 로그인 UI와 소비처, 가입 입력·사업자 증빙 및 필요한 migration 파일을 포함한다. F10/F11의 이메일 확인과 서비스 가입 분리 변경은 현재 사용자 구현 지시로 승인된 범위다. 운영 DB 적용·삭제와 운영 설정 변경은 이 작업에서 실행하지 않는다. 검증 DB는 격리된 로컬 DB를 사용한다.

## TODO

- [x] 최신 origin/main 기준 전용 worktree 생성
- [x] 메인 이메일 확인 판정과 기존 회원 상태 처리 정렬
- [x] 업무 API 권한 조사 후 로그인·미가입 안내·handoff 분리
- [x] 모든 서비스 로그인 화면에 두 Demo 버튼 제공
- [x] 이름·모바일·닉네임 입력 및 자기 수정 정렬
- [x] 약국 사업자등록증 사본 제출·검토와 기재 정보 재사용
- [x] 공급자 가입 증빙 조건 점검·정렬
- [x] 약국 협력사업 개별 가입 조건 정렬
- [x] KPA 승인 시 중복 매장 생성 제거
- [x] 관련 canonical 문서 정합
- [x] focused test·typecheck·build
- [x] desktop·mobile browser smoke 및 실제 API 결과 확인
- [x] path-specific commit·push·PR 생성 (#359)
- [ ] 최신 HEAD의 required CI·자동 Codex review 결과 확인

## 검증 범위

구글·이메일 계정, 이메일 미확인, 미가입·대기·승인·반려·정지, 직접 URL과 배너 이동, 업무 API 직접 호출, 역할·사업자 연결, Demo 두 계정, 등록 정보 재사용, 로그아웃·handoff 회귀를 확인한다. 운영 외부 OAuth·메일·비공개 파일 저장소 검증이 불가능하면 해당 한계를 분리하여 보고한다.

## 작업 환경

Branch `wo/neture-auth-membership-refactor-v1`, base `f738b54efb`. 기준 checkout의 `work` branch는 변경하지 않는다. merge 전까지 worktree를 보존한다.

## 구현과 로컬 검증 결과

- 메인 이용 자격은 이메일 확인과 정상 계정에서 읽기 전용으로 계산한다. 로그인·refresh·auth/me·handoff의 membership snapshot도 동일하게 반영하며 원장을 생성하지 않는다.
- 실제 API smoke: 미확인 이메일 차단, 여섯 연결 서비스의 미가입 로그인, 메인 자격, 보호 약국 API 차단, 비공개 사본 업로드·본인 다운로드·타인 차단, 약국 신청과 정보 재사용, 운영자 서류 검토·약국 승인, 공급자 증빙 누락 차단·증빙 후 승인·서비스 한정 역할을 확인했다.
- 실제 세션 smoke: 가입 원장이 없는 이메일 확인 계정의 로그인·auth/me·handoff·refresh를 검증했다. handoff는 연결 서비스의 승인을 생성하지 않았다.
- Store 데스크톱·모바일에서 두 Demo 버튼과 매장 경영자 실제 로그인 통과. Neture·Pharmacy Hub·KPA Branch·KPA Society·Lecture의 데스크톱·모바일 10개 화면에서도 두 버튼과 브라우저 오류 0건을 확인했다.
- auth-react 148개, Neture 360개 테스트 통과. 격리 PostgreSQL의 약국·약국 협력사업 integration 19개 통과. API 관련 회귀와 추가 세션 projection·승인 서비스 회귀를 검증했다.
- API typecheck/bundle, 전체 frontend typecheck, Store·Neture·Lecture production build 통과. auth-client 추가 15개 테스트와 ESLint ratchet(기존 오류 baseline 46) 통과. unsafe route·entity registry·migration contract guard 통과.
- 파일 검증은 격리된 GCS emulator를 사용했다. 실제 Google OAuth·메일 발송·운영 비공개 bucket은 이번 로컬 smoke에서 검증하지 않았다. 운영 DB·설정은 변경하지 않았다.

## 문서 정합

새 인증·가입 정본을 canonical index에 등록하고, 이전 Identity·Store·Subdomain 문서에 대체 정책을 명시했다. 과거 실행 기록은 다시 쓰지 않았다. Demo 정본의 서비스별 역할과 공통 버튼 출처를 구현에 맞췄다.

## 자동 리뷰 반영

- 약국 운영자 서류 다운로드는 약국 신청의 신청자·조직·사업자 문서 연결을 추가 확인한다. 실제 API에서 약국 신청 서류 열람 200, 공급자 전용 서류와 미연결 문서 열람 404를 확인했다.
- Google 신규 가입은 이름과 개인 모바일을 필수로 받아 공통 프로필에 저장한다. 이름 누락·공백·길이 초과는 계정 생성 전에 차단한다. DTO·서비스·공통 UI 테스트를 보완했다.
