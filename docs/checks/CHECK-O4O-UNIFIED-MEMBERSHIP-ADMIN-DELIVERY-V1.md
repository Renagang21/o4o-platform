# CHECK-O4O-UNIFIED-MEMBERSHIP-ADMIN-DELIVERY-V1

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

> **상태**: 운영 반영 완료 · 실제 Google 로그인·면허 심사 미검증
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


## 통합 운영자 UI·메뉴 위임 정비 — 2026-10-29 최종 반영

[운영자 정비 WO](../work-orders/WO-O4O-UNIFIED-OPERATIONS-WORKSPACE-V1.md)와 [운영 책임 정본 V2](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V2.md)의 후속 실행 결과다. 위의 최초 배포·Partner 실패·Sonar 실패는 당시 기록이며 삭제하거나 통과로 바꾸지 않는다.

- 구현 [PR #878](https://github.com/Renagang21/o4o-platform/pull/878), 통합 main `307e86ffe7b5901f27b375e1cbcebf3003cf15bb`. 직영 72개 native 업무, 전체 회원 표준 테이블·상태 탭·알림·선택 작업, 메뉴별 위임·회수와 URL/API 인가를 연결했다.
- PR HEAD `aa17ba2a23ee3ed737f5eabd95560af82fdb6f1f`의 [CI](https://github.com/Renagang21/o4o-platform/actions/runs/40826389724)·SonarCloud·CodeQL 통과. Sonar 지적은 코드·접근성·조사 도구를 보완해 해결했고 검사 기준을 낮추지 않았다. query 기반 메뉴 인가 우회와 공급자 상태 관리 사전 조회의 두 리뷰 지적은 실제 HTTP/DB 회귀 후 해결했다.
- [main CI](https://github.com/Renagang21/o4o-platform/actions/runs/40827719950)·[CodeQL](https://github.com/Renagang21/o4o-platform/actions/runs/40827719857) 통과. migration prefix 스키마 지문 검증과 초대·메뉴 위임·계정 제거 PostgreSQL 53건 PASS. 추가 접근/자격 PostgreSQL 29건, 공유 UI 221건, 중앙 UI 34건, PC/mobile 합성 브라우저 12개 시나리오 PASS. 별도 시점·범위의 테스트를 중복 합산하지 않는다.
- 사용자가 신규 메뉴 위임 설정 테이블 migration을 포함한 배포를 명시 승인했다. [최종 Promote](https://github.com/Renagang21/o4o-platform/actions/runs/40831099641)는 `dry_run=false`, 실제 실행으로 성공했다. migration Job `o4o-api-migrations-5t5hh` 완료 후 API readiness/전환·공개 검사에 성공하고 관리자·웹을 후속 배포했다. 신규 migration은 `CreateCentralOperationMenuGrants1793186241009`이며 기존 사용자·역할 데이터의 backfill은 없다.

최종 report는 아래 8개 대상 모두의 serving SHA가 위 main SHA와 일치하며 `production=DEPLOYED`임을 확인했다.

| 배포 키 | 최종 revision | 결과 |
|---|---|---|
| api | `o4o-core-api-04282-fon` | DEPLOYED |
| admin | `o4o-admin-dashboard-01646-wuw` | DEPLOYED |
| partner | `partner-web-00027-jud` | DEPLOYED |
| neture | `neture-web-02142-fip` | DEPLOYED |
| kpa-society | `pharmacy-business-web-00041-fip` | DEPLOYED |
| lecture | `lecture-web-00292-ruf` | DEPLOYED |
| store | `store-web-00380-hug` | DEPLOYED |
| kpa-branch | `kpa-branch-web-00373-raw` | DEPLOYED |

`kpa-society`는 현행 약국 협업체 웹의 배포 선택 키이며 퇴역한 옛 KPA Run을 복원하지 않았다. 독립 해당 협업체(당시 구명칭)·CarePharm·개별 조합/분회의 운영 권한과 데이터 범위를 중앙에 편입하지 않았다.

공개 read-only 확인은 관리자 `/operations` HTTP 200, API `/health/ready` HTTP 200, 비로그인 중앙 접근 API HTTP 401이다. 관리자 revision 직접 smoke와 traffic 100% 전환, API 전환 후 readiness도 기존 배포 workflow에서 통과했다. 이 결과는 실제 Google OAuth·실계정 위임 수락·면허 근거 확인 및 승인 조작의 검증을 대체하지 않는다.

사용자는 현재 계정·생성 데이터가 테스트 데이터이며 상품 DB가 주요 보존 대상이라고 설명했다. 이번 배포에는 기존 데이터 일괄 수정·초기화·삭제, 실제 계정 제거 또는 가짜 자격 승인을 포함하지 않았다. 중요 상품 DB 관리 권한을 새로 위임하지 않았다. 실제 데이터 정리와 B2C AI 규격 설명서는 후속 범위다.
