# CHECK-O4O-PHARMACY-OPERATIONS-COMPLETION-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-16 · **최종 갱신**: 2026-10-16 (KST)
> **근거 WO/IR**: [단일 TODO](../work-orders/TODO-O4O-PHARMACY-OPERATIONS-COMPLETION-V1.md)

[My Home 정본](../baseline/O4O-MY-HOME-CANONICAL-V1.md)에 따른 표준 운영 완성의
로컬 검증·main 통합·운영 배포 증거다. 현재 특별 서비스는 NOT_APPLICABLE이며
실제 OAuth·현재 운영자 업무 접근은 USER_VERIFICATION_PENDING으로 구분한다.
공개 문서에는 실제 계정 식별자나 운영 응답 원문을 포함하지 않는다.

## 현재 검증 근거

- Node 22.18.0·pnpm 10.25.0 frozen/integrity install과 공통 빌드 PASS, manifest/lockfile 변경 없음.
- PostgreSQL 15 전용 loopback DB에서 canonical baseline·incremental 매 prefix fingerprint를
  확인한 뒤 기존 약국 commerce 24건과 supplier/store 4건 = 28 PASS / 0 SKIP.
  공급 제안 승인·복수 사업·비담당 거절·콘텐츠 게시/보관·가입 약국 원본·독립 사본·정지 차단을 포함한다.
  wrapper의 ownership marker 확인 후 DB count 0, 이번 전용 컨테이너/볼륨 삭제와 잔존 0을 확인했다.
- 신규 계정 전환 회귀는 Neture 2건·약국 웹 2건 PASS다.
- 약국 웹 전체 23 files / 166 tests, 공통 운영 UI 전체 18 files / 152 tests PASS다.
  KPA App의 기존 hook warning 2개는 그대로 유지했다.

브라우저 점검에서 공개 Neture의 `/operator/semi-franchises/*`는 최신 hostProfile 계약에 따라
약국 웹으로 handoff되는 호환 경로임을 확인했다. 공개 Neture에서 직접 운영 화면을 열어 보려던
첫 harness는 정상 handoff 뒤 목록을 기다려 timeout했다. 도메인/guard를 우회하지 않고
Neture 호환 handoff와 실제 약국 웹 운영 흐름으로 관측을 정정했다. 사용되지 않는 Neture 전용
홈/전시 버튼은 제거했고 Neture legacy wrapper의 계정 수명 분리만 유지한다.

## 1차 로컬 검증 (Sonar 보완 전)

- 최종 Neture 전체 110 files / 1,068 tests, 약국 웹 23 files / 166 tests,
  공통 운영 UI 18 files / 152 tests = 1,386 PASS. SQL 28건은 별도이며 중복 합산하지 않는다.
- 최종 두 앱 TypeScript 포함 production build PASS. 변경 파일 lint 0 errors / 0 warnings,
  KPA App의 기존 hook warning 2개만 유지한다. 민감정보·diff check PASS.
- Chromium PC1440/mobile390 각 7흐름 = 14 PASS, pageerror 0·가로 넘침 없음.
  공개 Neture의 canonical operator handoff → 약국 담당 사업 목록 → 기존 Hero/광고 편집 →
  공급 제안 확인/승인 → 콘텐츠 초안 저장/게시 → 가입자 공급/자료 표시 → 명시적 Store 선택
  handoff를 검증했다. 전부 합성 인증/API이며 운영 역할·콘텐츠·주문 데이터는 생성하지 않았다.
  첫 harness의 호환 도메인/모호한 선택자 문제를 바로잡았고 앱 guard·도메인 정책은 유지했다.
- 실제 계정의 현재 사업 담당/로그인·세션·업무 접근은 USER_VERIFICATION_PENDING이다.
  코드와 fixture 검증 및 과거 census 집계를 실제 OAuth·운영 계정 업무 확인으로 바꾸지 않는다.
  현재 표준 운영 범위의 특별 서비스는 NOT_APPLICABLE이다.

해당 단계 재실행: Neture는 사용되지 않는 전용 이동 컴포넌트를 제거한 뒤 전체 110 files / 1,068 PASS,
공통 운영 UI 152·약국 웹 166과 합해 1,386 PASS다. 두 앱 최종 build도 PASS다.
실제 공개 운영 소비처는 약국 웹이며 Neture legacy wrapper는 호환/개발 소비처로 유지한다.

## PR 검사 보완

PR #654의 첫 SonarCloud는 신규 중복률 62.2%와 운영 화면 함수 복잡도 18(허용 15)을 지적했다.
계정 전환 시나리오를 복제한 소비처별 테스트는 두 실제 wrapper를 실행하는 매개변수 테스트로
통합해 동일한 4개 소비처/시나리오 검증을 보존했다. 운영 navigation을 별도 표시 함수로 분리했다.
Sonar 제외/threshold·assertion·CI 설정은 변경하지 않았다.
최신 main #648의 테스트 계정 SSOT·운영 스크립트 정비를 merge했으며 웹 기능 충돌은 없다.
현재 테스트 계정 문서는 `docs/local/TEST-ACCOUNTS.local.md`다. 이 작업은 실제 자격증명을 사용하지 않는다.

Sonar 보완 후 재검증: 매개변수 테스트의 두 소비처 4건, 공통 운영 UI 전체 152건,
Neture 전체 1,070건·약국 웹 전체 164건 = 동일한 총 1,386건 PASS다.
두 앱 TypeScript 포함 build·변경 lint·PC/mobile Chromium 14흐름도 다시 PASS했다.
검사 제외나 기준 완화 없이 중복 테스트 코드를 제거하고 navigation 표시 책임만 분리했다.

## 통합 확인

PR [#654](https://github.com/Renagang21/o4o-platform/pull/654)는 최종 source HEAD
`0b7fb55db86d9fb8492f74eb55aaf3d2f3e2154a`의 CI Gate·API 3 shard·빌드·CodeQL·Codex
확인 후 main `9a86fcf0fbb45418ab5de2f96501f1764c4c1321`로 정상 통합했다.
SonarCloud 재검사는 SUCCESS / 신규 중복률 0%다. 다만 기존 운영 화면 함수의 복잡도 18
(권고 15)와 새 navigation의 readonly/optional/template 표현 관련 4개, 총 5개 정적 분석
annotation은 남아 있다. 함수 분리만으로 복잡도 권고까지 해결됐다고 판정하지 않는다.
이는 통과한 quality gate와 구분해 기록하며 검사 제외·threshold 완화는 없다.
GitHub ruleset은 PR·CI Gate를 요구하며 Codex 최신 HEAD 완료·미해결 스레드 0이었다.

공통 패키지 의존성 closure에 해당하는 전체 관리자·Store·강의 production build도 PASS다.
최초 Store/강의 filter는 실제 package name과 달라 대상 0이었고,
`--fail-if-no-match --filter store-web`·`lecture-web`로 바로잡아 실제 빌드를 확인했다.
배포 전 공식 5 origin HTML/entry JS와 API readiness가 정상이었고, 약국 entry에는
이번 홈 연결·전체 관리자 지정 안내 문구가 없었다. 실제 OAuth 확인과는 별도다.

이 문서의 후속 검증 기록은 동일 WO의 source PR 통합 후 완료 근거를 추가하는 예외다.
소스 수정용 중복 PR을 만들지 않고 기존 작업 branch에서 배포 결과를 기록한다.

## 운영 배포 및 최종 판정

- main 통합 후 [CI #38857868003](https://github.com/Renagang21/o4o-platform/actions/runs/38857868003) SUCCESS.
- [Delivery #38858740803](https://github.com/Renagang21/o4o-platform/actions/runs/38858740803)는
  관리자·Neture·약국·강의·Store 5개를 자동 배포했다. API·분회·병원 약국은 변경 대상이 아니다.
- 각 5개 배포의 신규 revision smoke·트래픽 전환·Verify deployment SUCCESS.
  최종 serving SHA 대조 결과 main source `9a86fcf0fbb45418ab5de2f96501f1764c4c1321`의
  `production` 상태가 SUCCESS / `DEPLOYED`임을 확인했다. 빈 skip run 성공으로 대체하지 않았다.
- 배포 후 공식 5 origin HTML/entry JS가 모두 HTTP 200, API readiness는 HTTP 200 / ready였다.
  약국 entry가 `/assets/index-DrRuVfP9.js`로 바뀌었고 새 사업 홈 연결과 전체 관리자 지정 안내
  문구가 모두 포함됐다. Neture entry도 바뀌었다. 나머지 3개 entry는 미사용 코드 제거로 동일하며
  실제 서비스 배포 여부는 Delivery의 serving 판정과 함께 확인했다. API 신규 배포를 뜻하지 않는다.
- 설치·공통 빌드·5개 소비 앱 production build, 최종 UI 1,386건·SQL 28건·PC/mobile 14흐름 PASS.
  이후 source 변경은 없다. 임시 DB·컨테이너·볼륨 잔존 0, 운영 권한/계정/DB 변경 없음.

**완료**: 조사→단일 TODO→코드/문서 대조→구현/검증→commit/push/PR→main 통합→운영 배포 검증.
현재 특별 서비스는 NOT_APPLICABLE이다. 실제 Google·카카오 계정 선택과 현재 지정된
사업의 운영 업무 접근은 USER_VERIFICATION_PENDING이며 사용자가 확인한다.
과거 화면 표시 계정 census의 TARGET_NOT_FOUND는 실제 OAuth 세션 불일치의 확정 증거가 아니다.
분회 지정 보류와 복사 모델을 유지한다. Sonar gate 통과와 잔여 정적 분석 5개도 별도로 기록했다.

문서 정합: My Home 기준·인증 후속 TODO·이 단일 완료 TODO가 현재 범위와 확인 경계를 공유한다.
