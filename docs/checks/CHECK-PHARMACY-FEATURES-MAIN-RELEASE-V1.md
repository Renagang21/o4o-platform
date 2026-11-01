# 약국 협력사업·직원 지원 main 통합·배포

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

> 상태: 통합 검증 중
> 작성일: 2026-10-17 (한국시간)
> 승인: 사용자 `main으로 merge -> 배포`
> 대상: `wo/pharmacy-service-entitlements` (이전 HEAD `31493b9e4`)

## 통합 범위

관리자 약국 협력사업 제공 기능 설정, 경영자 회원 유료 원장과 내 매장 공통 판정, 태블릿·다국어 API 적용, drugstore 기본 사업 설정 및 직원 현장 지원을 함께 반영한다. 실제 신규 사업 등록·가입 승인·DNS/TLS 활성화·운영 회원 유료 자격 변경은 코드 배포와 별개다. #653과 #657의 타 세션 소유 작업은 이 PR에서 수정/병합하지 않는다.

개발 브랜치를 main `624764387` 기준으로 갱신했다. 충돌은 약국 API/내 매장 App의 import 추가 2곳이며 CarePharm과 직원 지원 import를 모두 보존한다. 기존 CarePharm 독립 가입·사업/매장별 자료 접근·엄격한 handoff alias 경계를 유지한다. 새 main에 회원 원장보다 먼저 추가된 migration은 없으므로 기존 prefix29 예상 fingerprint를 재검증한다.

## 배포 범위

- API·전체 관리자·내 매장·약국 공통 앱·Neture(공유 관리 화면 소비처) 등 actual serving→target diff를 Delivery가 판정한다.
- 신규 회원 원장 migration `CreateMemberPaidServiceEntitlements1792137600000`: `member_paid_service_entitlements` 빈 테이블 생성. user_id PK/CASCADE FK, active(기본 false), 선택 ends_at, updated_by SET NULL FK, updated_at. 기존 회원 유료 전환·결제·backfill·데이터 삭제 없음. down은 운영에서 실행하지 않는다.
- migration 포함 LEVEL 3이므로 일반 자동 배포는 차단되고 `promote.yml`의 고정 main SHA를 사용한다. 운영 DDL 실행 승인이 아직 이 구체적 범위로 확인되지 않았으면 promote 전에 확인한다(README 배포 규칙).
- 배포 freeze·CI·ref·owner 경계를 우회하지 않는다. 신규 API를 운영에 먼저 반영한 후 frontend verified rollout을 따른다.

## 검증·실행 기록

검증 및 실제 PR/배포 결과를 아래에 기록한다.


- PR: https://github.com/Renagang21/o4o-platform/pull/663
- 최신 main 기준 API·전체 관리자·내 매장·약국 공통 앱·Neture production build PASS.
- 실제 격리 PostgreSQL에서 baseline + 29 incremental 정상 적용 및 최종 fingerprint 검증 PASS. 운영 DB 조회/쓰기는 아직 하지 않았다.
- 판정·관리자/직원 HTTP·실행 차단·SQL·태블릿 runtime: 5 suites / 39 tests PASS.
- 공통 관리 UI 전체: 21 files / 159 tests PASS.
- 내 매장 hook/직원 지원/업무 그룹/CarePharm 회귀: 5 files / 39 tests PASS.
- migration contract 및 문서 민감정보 검사 PASS. 원장 생성은 빈 신규 테이블뿐이며 활성 회원 seed는 없다.
- 병합은 PR required CI Gate와 리뷰 blocker 확인 후 진행한다. 운영 migration 승인이 필요하면 해당 SHA와 적용 범위를 제시한다. 이 기록은 사전 검증 시점이며 병합/배포 완료를 뜻하지 않는다.

- PR 정적 분석 보완: 상태 메시지·버튼 접근성, 입력 kind 엄격 검사, 중첩 UI/분기 단순화. 권한 정책 변경 없음.
- CI shard 2 실패는 기존 태블릿 조직 테스트 stub의 새 이용권 SQL 오인 응답으로 재현. 조회별 고정 응답으로 구분 후 13 tests PASS; 실서비스 권한 guard 유지.
- 보완 후 API 판정·HTTP·격리 SQL 27 tests, SQL 입력 회귀 6 tests, 협력사업 화면 55 tests, 관련 관리/매장 화면 26 tests PASS. CI 재검증 후 병합·배포 예정.
- Codex P2: 직원 지원 메뉴를 공통 메뉴에서 약국 전용 메뉴로 이동. 비약국 메뉴/업무 그룹 미노출 및 약국 노출 회귀 포함 업무공간 27 tests PASS.
