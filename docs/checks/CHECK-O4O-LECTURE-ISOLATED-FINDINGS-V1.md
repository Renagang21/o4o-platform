# Lecture 격리 검증 결함 수정 확인

> **상태**: ACTIVE
> **작성일**: 2026-10-25 · **최종 갱신**: 2026-10-25
> **근거 WO/IR**: [WO-O4O-LECTURE-ISOLATED-FINDINGS-V1](../work-orders/WO-O4O-LECTURE-ISOLATED-FINDINGS-V1.md)

## 변경과 검증

| 항목 | 수정·검증 | 결과 |
|---|---|---|
| 승인 전 진도·수료 | pending/rejected/cancelled/expired/상태 없음, 반복 완료 요청 403·완료 체인 호출 0; approved/in_progress/completed 통과; 타 서비스 404 | PASS (합성 HTTP) |
| 비동기 guard 오류 | lesson/course/quiz/assignment DB 오류가 Express 오류 처리기로 전달되고 후속 health 응답; UUID 변환 오류 400 | PASS (합성 HTTP) |
| optionalAuth memberships | requireAuth와 같은 검증된 JWT snapshot, claim 없으면 빈 배열, 서비스 토큰은 인증 안 됨 | PASS (단위) |
| 태그 누락·공백·길이 초과 | 저장 없이 400 COURSE_VALIDATION_ERROR, 예상하지 못한 DB 오류는 500 | PASS (controller/service) |
| 합성 검증 runner | web-lecture Vitest 83/83, API Jest 13 suites 309/309 | PASS |
| 추가 공통 보안 회귀 | service-token-boundary, authentication.retirement, lecture-scope-guard 23/23 | PASS |
| API type-check | pnpm --filter @o4o/api-server type-check | PASS |
| 브라우저 합성 | ffmpeg 절대 경로로 영상 생성, 자막 로드·편집, 비로그인 미리보기 503/retry, 신청→운영 검토 fixture, 390px·1440px | PASS |
| Sonar 원인 | API에서 PR809 미해결 vulnerability 1건 javascript:S4036, browser-captions-smoke.mjs의 PATH 기반 ffmpeg 실행 확인·제거 | 수정 완료, 새 HEAD 원격 분석 대기 |

## Shared Module Change Verification

### Changed shared module

- Module: common/middleware/auth/authentication.middleware.ts의 optionalAuth. LMS requireEnrollment 및 controller/service는 기존 Lecture runtime의 경계를 유지한다.
- Direct consumers: common/middleware/auth.middleware.ts → middleware/auth.middleware.ts 재노출. symbol 검색과 파일 경로 리터럴 소비처 검사를 함께 수행.
- Indirect consumers: Lecture, KPA, Neture, K-Cosmetics 연계 CMS·forum/community·survey·market-trial·상품 landing 등의 공개/개인화 경로. 별개 optionalStoreAuth 및 주입형 같은 이름 함수는 직접 변경 대상이 아니다.

### Consumer impact matrix

| 소비처 | 사용·변경 영향 | route/role/capability 영향 | 검증 방식·결과 |
|---|---|---|---|
| Lecture | optionalAuth로 초안·회원 전용 강의 읽을 때 snapshot 복구 | 기존 소유 강사/운영 역할 + active 회원 판정 유지 | 인증 parity·기존 merge-gate/access 계약·scope guard PASS |
| Neture | 공통 optionalAuth 소비, 검증된 memberships 추가 | 역할·공개 route·Google 경계 변경 없음 | Neture membership parity·공통 service-token HTTP 회귀 PASS |
| KPA-Society | CMS/news/community 공개 경로 소비 | scope·조직 판정 변경 없음 | KPA membership parity·공통 세션 경계 PASS |
| K-Cosmetics | 공통 인증·콘텐츠 route 소비 | 서비스 membership 우회 추가 없음 | K-Cosmetics membership parity PASS |
| admin/operator | 공통 인증 재노출 소비 | fresh DB roles·Google-positive 경계 유지 | passwordSessionBoundary 전체·retirement PASS |
| store/forum/store-hub/My Home | 공통 공개/개인화 경로를 통한 간접 소비 | 메뉴·layout·capability 변경 없음 | token boundary·기존 restricted/session 경계 PASS; 실계정 화면 smoke 미실행 |

### Route / role / capability check

라우트 신설·삭제, 역할 부여, membership DB 변경, capability 변경은 없다. memberships는 기존 requireAuth와 동일한 서명 검증된 JWT snapshot이며 권한을 새로 만들어 넣지 않는다. 공개 route의 비로그인 허용과 부적격 세션의 비로그인 처리는 유지한다. 공통 UI의 empty group/block 변경은 없다.

### Smoke result와 한계

KPA·K-Cosmetics·Neture는 합성 인증 소비처 검증이며 실계정 브라우저 smoke가 아니다. Lecture 390px/1440px는 로컬 fixture를 쓰는 브라우저 smoke다. 실제 로그인·운영 DB·실제 외부 영상·PostgreSQL 15/17 로그인 흐름은 이번 수정 세션에서 미실행이다. 사용자 제공 PostgreSQL 17.9 API 검증 PASS를 이 수정 HEAD의 PASS로 승격하지 않는다. 기존 SiteShell 합성 테스트의 중복 key 경고는 이번 변경과 무관하며 테스트는 통과했다.

## 운영·Git 경계

새 migration·schema 변경·보정 SQL·운영 데이터 생성은 없다. PR #809에는 기존 instructor profile migration이 포함돼 있으므로 기존 배포 절차는 유지한다. 원격 gate·병합·실제 serving SHA는 실행 시점에 확인해야 한다. 다른 PC의 worktree와 종료 클러스터 폴더는 이 환경에서 변경하지 않았다.
