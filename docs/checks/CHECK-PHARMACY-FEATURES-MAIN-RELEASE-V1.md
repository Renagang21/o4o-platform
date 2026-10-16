# 약국 협력사업·직원 지원 main 통합·배포

> 상태: 통합 검증 중
> 작성일: 2026-10-17 (한국시간)
> 승인: 사용자 `main으로 merge -> 배포`
> 대상: `wo/pharmacy-service-entitlements` (이전 HEAD `31493b9e4`)

## 통합 범위

관리자 약국 협력사업 제공 기능 설정, 경영자 회원 유료 원장과 내 매장 공통 판정, 태블릿·다국어 API 적용, megapharm 기본 사업 설정 및 직원 현장 지원을 함께 반영한다. 실제 신규 사업 등록·가입 승인·DNS/TLS 활성화·운영 회원 유료 자격 변경은 코드 배포와 별개다. #653과 #657의 타 세션 소유 작업은 이 PR에서 수정/병합하지 않는다.

개발 브랜치를 main `624764387` 기준으로 갱신했다. 충돌은 약국 API/내 매장 App의 import 추가 2곳이며 CarePharm과 직원 지원 import를 모두 보존한다. 기존 CarePharm 독립 가입·사업/매장별 자료 접근·엄격한 handoff alias 경계를 유지한다. 새 main에 회원 원장보다 먼저 추가된 migration은 없으므로 기존 prefix29 예상 fingerprint를 재검증한다.

## 배포 범위

- API·전체 관리자·내 매장·약국 공통 앱·Neture(공유 관리 화면 소비처) 등 actual serving→target diff를 Delivery가 판정한다.
- 신규 회원 원장 migration `CreateMemberPaidServiceEntitlements1792137600000`: `member_paid_service_entitlements` 빈 테이블 생성. user_id PK/CASCADE FK, active(기본 false), 선택 ends_at, updated_by SET NULL FK, updated_at. 기존 회원 유료 전환·결제·backfill·데이터 삭제 없음. down은 운영에서 실행하지 않는다.
- migration 포함 LEVEL 3이므로 일반 자동 배포는 차단되고 `promote.yml`의 고정 main SHA를 사용한다. 운영 DDL 실행 승인이 아직 이 구체적 범위로 확인되지 않았으면 promote 전에 확인한다(README 배포 규칙).
- 배포 freeze·CI·ref·owner 경계를 우회하지 않는다. 신규 API를 운영에 먼저 반영한 후 frontend verified rollout을 따른다.

## 검증·실행 기록

검증 및 실제 PR/배포 결과를 아래에 기록한다.
