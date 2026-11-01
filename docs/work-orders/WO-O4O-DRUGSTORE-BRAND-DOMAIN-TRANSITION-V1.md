# 드럭스토어형 약국 이름·도메인·사업 키 전환

> **상태**: ACTIVE — main·운영 데이터·7개 서비스·Pharmcoop 완료 / 호스트·약국 공통 앱 보류
> **작성일**: 2026-10-31
> **근거**: 사용자의 O4O 전체 협업체 이름·주소 변경 지시 및 개발 데이터 상태 설명

## 목표와 범위

공식 이름은 **드럭스토어형 약국**, 공식 호스트는 `drugstore.neture.co.kr`, 사업 키는 `drugstore`다. 화면·공통 extension·서비스 전환·Admin 역할·문의·알림·AI 목적지·CORS·인증 호스트·운영 전환 스크립트와 문서를 함께 정렬한다. 약국 조직 단위 가입은 유지하며 Pharmcoop 개인 조합원 가입과 합치지 않는다.

## TODO와 보완

- [x] 전체 추적 파일에서 이전 표기·주소·기술 식별자 소비처 조사
- [x] 공통 config, 사업 extension, 메뉴·공개 안내·로그인·가입·문의·알림·목적지 정합
- [x] `neture:drugstore_admin` / `neture:drugstore_operator`와 원장 조회 키 정합
- [x] 기존 사업 UUID·회원 결정·관련 FK를 유지하는 전환 migration 준비
- [x] 양쪽 사업이 이미 존재하거나 고유 scope/JSON key 충돌이면 중단·롤백
- [x] 문서 파일·디렉터리·상호 링크 및 과거 기록의 이름 정규화 주석
- [x] 로컬 PostgreSQL·회귀 테스트·소비 앱 빌드·PC/모바일 합성 브라우저 검증
- PR 검증 게이트: [PR #911](https://github.com/Renagang21/o4o-platform/pull/911)의 **최종 HEAD** required CI·자동 리뷰·미해결 스레드를 기준으로 한다. 초기 구현 HEAD의 자동 리뷰는 지적 없이 완료했다. 이후 HEAD도 같은 게이트를 통과해야 병합 준비 완료다.
- [ ] 통합 시점에 main 포함 및 migration→API→소비 웹 배포 검증
- [ ] 새 도메인의 실제 DNS·TLS·HTML·JS와 운영 권한/회원 상태 확인

## 데이터·배포 경계

새 migration은 기존 사업과 운영 조직을 갱신하며 회원 상태를 승인하거나 다른 협업체 역할을 부여하지 않는다. 명시된 live routing/config 테이블에서 키·역할·문의 scope·중첩 metadata의 기존 식별자와 목적지를 변환한다. 법정 동의·재무·보안·업무 감사 로그와 과거 snapshot은 개작하지 않는다. 이전 문자열은 전환 migration과 해당 전환 테스트의 입력에서만 필요하다. `down`으로 이름만 되돌려 새 데이터 연결을 손상시키지 않도록 forward-only다.

이번 checkout은 기존에 준비된 격리 클라우드 checkout이며 새 작업 branch를 최신 main에서 시작했다. 별도 worktree 중복 생성 없이 사용하고 작업 로그는 저장소 밖 비공개 영역에 보존한다.

## 문서 정합

사용자 명시 지시에 따라 과거 WO/CHECK/IR도 표시명과 문서 참조를 정규화했다. 과거 기록에 명칭 정규화 주석을 붙였으며 당시 성공·실패는 새 호스트의 검증 증거가 아니다. 요구사항 문서와 extension 파일도 현행 이름으로 이동했다. 개발 완료와 통합·배포·운영 확인 상태는 구분한다.

[검증 기록](../checks/CHECK-O4O-DRUGSTORE-BRAND-DOMAIN-TRANSITION-V1.md)

### 리뷰 보완 — 과거 관측 대상

PR #911의 P1 지적에 따라 과거 WO/CHECK/IR 84건의 본문에서 현재 호스트를 과거 관측 대상으로 표시하지 않도록 보완했다. 현재 이름·주소는 별도 현행 안내에만 두고, 과거 증적은 “당시 구명칭·구호스트”로 구분한다. 이전 이름·URL을 전부 제거하라는 사용자 지시를 따르면서 현재 도메인을 과거에 검증한 것으로 오인하지 않게 한다. 원문·실제 당시 호스트는 Git 이력에 보존되어 있으며 이력 재작성은 없다.

### 최신 main 공통 UI 통합

main `c7c5cd100c`(PR #907)을 작업 branch에 통합했다. 공통 서비스 목록 충돌은 main의 `serviceKey`·세션 복귀 기능을 유지하면서 드럭스토어형 약국의 새 키·표시명·주소를 적용했다. 새 `serviceReturnContext`와 API handoff 별칭도 새 키로 정렬했다. 추가 원장·권한 승인은 없다.

통합 후 API 인증/대표 진입 75 tests PASS, 별도 실제 로컬 PostgreSQL handoff 38 tests PASS(처음에는 해당 PG suite를 건너뛰었으며 전용 DB 준비 후 실제 실행했다). 약국 앱 172 tests·서비스 전환 21 tests·auth-utils 43 tests, Pharmacy/Neture production build·API type-check, PC/390px 합성 브라우저 4흐름을 재검증했다. 이전 커밋의 검증으로 최종 HEAD 성공을 대신하지 않으며 최종 CI/리뷰는 PR에서 확인한다.

## 2026-11-01 배포 단계 보완

사용자가 main 병합·배포·운영 데이터 전환을 승인했다. PR #911 병합과 main CI는 완료됐으나 기존 URL map의 호스트 범위 불일치를 WIF plan에서 발견했다. 후속 branch는 같은 이름·주소 전환 WO의 운영 보완이며, 기존 prepared cloud checkout에서 별도 branch로 진행한다. 공용 backend·다른 호스트·IAM·DB를 바꾸지 않는 고정 호스트 plan/apply와 필요 시 단일 호스트 관리형 TLS 자원 준비를 추가한다. 보호된 main·owner·CI·freeze·정확한 plan digest·production idle 검사는 유지한다. 승인 이후에도 실제 운영 성공·실패와 남은 일을 CHECK에 구분한다.

## 현재 종료 경계 — 2026-11-01

PR #911·#912는 main에 반영됐고 최종 main `948855d408` CI가 통과했다. 선택 Promote의 API·Admin·Partner·Neture·Lecture·Store·KPA Branch 7개와 별도 Pharmcoop 프런트엔드 배포가 성공했다. 운영 사업 키·이름 변경과 기존 business identity 유지도 실제 읽기로 확인했다.

약국 공통 앱과 새 호스트 연결은 GCP 조회 403 때문에 미완료다. 준비한 plan/apply 경로·테스트 완료와 실제 권한·TLS·라우팅·약국 앱 배포 완료를 구분하여 이 WO는 ACTIVE를 유지한다. 소유자의 [호스트/TLS 권한 준비](../guides/DRUGSTORE-HOST-TLS-OPERATIONS-V1.md) 후 동일 WO로 이어가며, 실제 결과·검증 한계는 CHECK의 「현재 통합·배포 판정」이 기준이다.
