# 퇴역 서비스 CMS·옛 slug 경계 재검증

> **상태**: ACTIVE — 한정 범위 로컬 검증 기록, #610 전체 완료 아님
> **작성일**: 2026-10-24 (UTC)
> **기준**: main `12565e2b2f` · `wo/retirement-backlog-revalidation-20261024`
> **사용자 지시**: 보류 #610·#641·#615의 최신 main 대조 및 필요한 작업 진행

## 범위

[PharmacyHub 폐기 정책](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md)과 최신 main을 대조했다. [#610](https://github.com/Renagang21/o4o-platform/pull/610)의 원본 116경로 전체를 병합하지 않고, 현재 실패를 재현한 CMS·slug 변경만 분리했다. 닫힌 PR과 원본 브랜치는 보존한다. 본 변경은 schema/migration·데이터 삭제·외부 AI 호출·계정/권한 발급을 포함하지 않는다.

## 재현과 변경

- CMS slot: serviceKey만 변경하거나 동일 contentId를 다시 보내면 기존 콘텐츠의 서비스와 맞지 않아도 저장됐다. 퇴역 콘텐츠의 메타데이터 변경·삭제도 허용됐다. 기존 코드에서 회귀 테스트 **6실패/5성공**을 확인했다.
- 저장된 콘텐츠·slot의 서비스 조합을 공개 조회/단건 배치/수정/일괄 교체에서 검사한다. PH 퇴역 참조는 410, 서로 다른 명시 서비스는 400이며 쓰지 않는다. KPA alias와 platform 콘텐츠는 기존 계약을 보존한다. 빈 일괄 교체도 기존 PH 참조를 우회해 삭제하지 못한다.
- CMS 콘텐츠의 수정·상태 전이와 조회수·추천 쓰기는 저장된 PH 참조를 410으로 거부한다. 예약 홈 콘텐츠의 기존 보호를 유지한다.
- 옛 slug: history의 service_key를 잃은 채 활성 서비스의 현재 slug로 redirect되는 경로를 재현했다. 기존 공개 resolver 테스트 **4실패/3성공**을 확인했다. API의 모든 `findOldSlugRedirect` 소비처(공개 매장, 정책, slug resolve)에서 현재 대상과 최근 history의 퇴역 여부를 검사한다. 정상 서비스 redirect와 query string을 보존한다. 공통 platform-core의 API·schema는 변경하지 않는다.

## 검증

- frozen lockfile/offline 설치, API dependency build 실행. dependency/lockfile 변경 없음.
- CMS·예약 홈·slug·소유권 영향 **11 suites / 172 tests PASS**.
- 이후 저장된 타 서비스/연결 없는 PH slot fixture 보완 후 CMS slot·공개/정책 slug **2 suites / 23 tests PASS**.
- API 타입 검사·production build PASS. 변경 runtime·신규 slug test lint 0 errors / 기존 unused 변수 warning 1. 문서 링크·민감정보·diff 검사 PASS. PR CI·리뷰·main 통합·배포 결과는 PR의 최신 실행 결과로 판정한다.
- HTTP 테스트는 Express/Supertest와 합성 repository이며 운영 DB·실계정·실메일·브라우저 smoke를 실행한 결과가 아니다.

## 남은 범위

- #610의 조직/QR/초대/device fallback SQL 경계는 별도다. 공유 조직·활성 Neture 멤버십 보존을 실제 격리 PostgreSQL에서 검증한 뒤 필요한 변경만 추려야 한다. 이번 CMS/slug 성공으로 해당 범위를 완료 처리하지 않는다.
- PH primary/media purge는 10월 17일 성공 기록이 있다. snapshot second-pass의 현재 완료 여부는 미확인이다. purge를 재실행하지 않았고 운영 데이터 0건을 새로 실측하지 않았다.
- #641의 초대 보존·파기 정책 결정과 신규 migration 승인은 별도다. 이번 변경으로 승인하거나 구현 완료 처리하지 않는다.
- 과거 CHECK·정본 본문을 현재 결과로 덮어쓰지 않는다. 개발 worktree는 후속 검증에 필요해 KEEP.
