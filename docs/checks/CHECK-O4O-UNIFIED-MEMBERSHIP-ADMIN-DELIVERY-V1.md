# CHECK-O4O-UNIFIED-MEMBERSHIP-ADMIN-DELIVERY-V1

> **상태**: ACTIVE · Partner 배포 보완 중
> **작성일**: 2026-10-28
> **대상**: [통합 구현 WO](../work-orders/WO-O4O-UNIFIED-MEMBERSHIP-ADMIN-REFACTOR-V1.md)의 후속 운영 반영 기록

## main 병합·최초 배포

- [PR #867](https://github.com/Renagang21/o4o-platform/pull/867)을 main `188da1423599b657d96d228224d6a0e805ad4932`로 병합했다. 개발 WO의 병합 전 기록은 당시 실행 범위로 보존한다.
- [main CI](https://github.com/Renagang21/o4o-platform/actions/runs/40657898086): CI Gate·API Jest 3개 shard·빌드·코드 품질 검사 통과. CodeQL도 통과했다. PR의 비필수 SonarCloud 신뢰성 등급 검사는 실패 상태이며 통과로 계산하지 않는다.
- [Promote](https://github.com/Renagang21/o4o-platform/actions/runs/40659462871): API·admin·Neture·KPA·강의·매장 반영 성공, Partner 실패로 전체 결과는 실패다.
- migration Job `o4o-api-migrations-hkzwn` 성공. API verified rollout 및 운영 readiness 통과. 실제 약사 자격 자동 승인·운영 회원 데이터 backfill은 수행하지 않았다.
- 비로그인 중앙 진입 및 본인 약사 자격 API는 각각 401을 반환했다. 실제 Google 로그인·위임 수락·자격 심사 수행을 검증한 것은 아니다.

## Partner 실패 원인·보완 범위

Partner 컨테이너가 `@o4o/operator-core-ui`를 포함하지 않아 TypeScript 모듈 해석에 실패했다. 로컬 전체 workspace 빌드와 달리 기존 Dockerfile은 인증 패키지만 선택 복사했다.

Partner Dockerfile에 해당 패키지와 workspace 의존 패키지의 manifest·source 복사를 추가하고, dist를 사용하는 UI·content-editor를 컨테이너 안에서 빌드한다. 공유 모듈 소스·API·권한·DB·배포 정책은 변경하지 않는다. 후속 보완 PR과 배포 결과는 GitHub Checks 및 production status에서 확인한다.

보완 Dockerfile은 별도 새 worktree에서 실제 이미지 빌드에 성공했다. 해당 nginx 이미지의 `/`와 `/operator` HTTP 200을 확인하고 검증 컨테이너를 제거했다. UI·인증 기능 변경은 없으며 HTTP 확인을 실제 SSO 검증으로 계산하지 않는다.

공통 약사 자격은 기존 면허 기입·약국 승인에서 자동 승격하지 않으므로, 기존 사용자도 중앙 담당자의 근거 확인과 수동 심사가 필요하다. 공통 상품 DB 위임 등 미결 사업 정책과 B2C AI 후속 과제는 기존 WO의 범위를 유지한다.
