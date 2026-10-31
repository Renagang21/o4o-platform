# 드럭스토어형 약국 전환 검증

> **상태**: COMPLETED — 구현·로컬 검증 범위 / main 병합·운영 적용 미실행
> **작성일**: 2026-10-31
> **작업**: [WO](../work-orders/WO-O4O-DRUGSTORE-BRAND-DOMAIN-TRANSITION-V1.md)

## 변경

공식 표시명·도메인과 사업 키·역할·경로·공통 extension·운영 전환 스크립트·문서를 현행 이름으로 통일했다. 기존 사업의 UUID·회원 FK·정지/반려/탈퇴 결정은 보존한다. 개인정보처리방침을 게시하거나 동의·약사 자격을 생성하지 않는다.

## 검증

- 약국 앱: 23 files / 172 tests PASS.
- 공통 공간 UI: 24 files / 222 tests PASS.
- 운영자 공통 UI: 35 files / 233 tests PASS.
- Store 관련 UI: 2 files / 24 tests PASS.
- Admin 운영자 지정·역할·사업 원장: 4 files / 45 tests PASS.
- 공통 서비스 전환: 1 file / 21 tests PASS.
- API 기존 인증·호스트·운영·health와 실제 PostgreSQL 전환: 6 suites / 83 tests PASS. 추가 순수 전환 테스트는 별도 기록하며 합산 중복을 주의한다.
- canonical PostgreSQL baseline과 incremental 53개 순차 적용 PASS. 전환 후 실제 schema fingerprint `aab4a2e779cbdcfe5948dbbcd2e71539d365ac05cad42902066a018ca105ca82` / 7410 lines. 사업 key 설명 comment 변경 포함.
- 운영 스크립트 Python 53 tests PASS. 실제 GCP/LB 변경을 실행한 검증이 아니다.
- Neture: 1493 tests PASS.
- 추가 전환 순수/PG 검증: 2 suites / 21 tests PASS(기존 API 기록의 PG 6개와 중복).
- PC 1440px·모바일 390px Pharmacy/드럭스토어형 약국 4개 합성 브라우저 흐름 PASS: 선택 약국 scope, 신청·승인 대기, 약국 전환·탈퇴, query/hash, pageerror 0·가로 넘침 0. 운영 로그인 검증은 아니다.
- API type-check, Pharmacy·Neture·Store·Admin production build PASS.
- 테스트는 일회성 로컬 PostgreSQL과 합성 계정/응답을 사용한다. 운영 원장 변경·실제 신규 승인·동의 기록 생성 없음.

PR 검증 결과는 [PR #911](https://github.com/Renagang21/o4o-platform/pull/911)의 최종 HEAD checks/review를 기준으로 한다. 초기 구현 HEAD `59b4d2b585`의 Codex 리뷰는 지적 없이 완료했다.

## 운영 확인과 배포

새 공식 호스트의 현재 환경 DNS 조회는 해석 실패, 정상 프록시 HTTPS 요청은 503이다. DNS 전파·LB 연결·TLS 완료를 확인하지 못했다. 해당 관측은 코드 회귀 테스트의 실패와 구분한다. DNS/IP 우회와 인증·IAM 변경은 하지 않는다.

`DEPLOYMENT = REQUIRED`: 새 migration 성공 후 API와 공통 패키지 소비 앱을 현재 Delivery 계획에 따라 배포하고 새 호스트 공개·로그인·사업 권한을 확인해야 한다. 아직 main 병합이나 배포 완료로 보고하지 않는다.

## 문서 정합

표시명·URL·내부 사업 키·문서 경로를 함께 정합했다. 과거 실행 기록은 이름 정규화 주석을 두며 새 도메인에서 재실행한 증거로 승격하지 않는다. 완료 상태를 단계별로 구분한다.

### 리뷰 보완 — 과거 관측 대상

PR #911의 P1 지적에 따라 과거 WO/CHECK/IR 84건의 본문에서 현재 호스트를 과거 관측 대상으로 표시하지 않도록 보완했다. 현재 이름·주소는 별도 현행 안내에만 두고, 과거 증적은 “당시 구명칭·구호스트”로 구분한다. 이전 이름·URL을 전부 제거하라는 사용자 지시를 따르면서 현재 도메인을 과거에 검증한 것으로 오인하지 않게 한다. 원문·실제 당시 호스트는 Git 이력에 보존되어 있으며 이력 재작성은 없다.

### 최신 main 공통 UI 통합

main `c7c5cd100c`(PR #907)을 작업 branch에 통합했다. 공통 서비스 목록 충돌은 main의 `serviceKey`·세션 복귀 기능을 유지하면서 드럭스토어형 약국의 새 키·표시명·주소를 적용했다. 새 `serviceReturnContext`와 API handoff 별칭도 새 키로 정렬했다. 추가 원장·권한 승인은 없다.

통합 후 API 인증/대표 진입 75 tests PASS, 별도 실제 로컬 PostgreSQL handoff 38 tests PASS(처음에는 해당 PG suite를 건너뛰었으며 전용 DB 준비 후 실제 실행했다). 약국 앱 172 tests·서비스 전환 21 tests·auth-utils 43 tests, Pharmacy/Neture production build·API type-check, PC/390px 합성 브라우저 4흐름을 재검증했다. 이전 커밋의 검증으로 최종 HEAD 성공을 대신하지 않으며 최종 CI/리뷰는 PR에서 확인한다.
