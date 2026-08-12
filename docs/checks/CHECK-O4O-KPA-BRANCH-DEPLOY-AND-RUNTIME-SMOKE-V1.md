# CHECK — WO-O4O-KPA-BRANCH-DEPLOY-AND-RUNTIME-SMOKE-V1

- **작업**: 약사회 분회 서비스 기반의 운영 배포 + 런타임 경계 검증 (기능 추가 없음)
- **일자**: 2026-08-12
- **선행**: `WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1` (`958f84542`)
- **상태**: PASS (완료 조건 8/8) · 잔여 = smoke fixture 정리 승인 대기

---

## 1. 배포된 Cloud Run service

| 항목 | 값 |
|---|---|
| 신규 web service | `kpa-branch-web` (asia-northeast3, project `netureyoutube`) |
| 리비전 | `kpa-branch-web-00001-whq` (Ready) |
| 접속 주소 | `https://kpa-branch-web-3e3aws7zqa-du.a.run.app` |
| backend | 기존 `o4o-core-api` (신규 backend 서비스 **생성 없음**) |
| 분회별 배포 | **없음** — 209 분회 모두 이 이미지 하나가 URL segment / Host 로 해석 |

배포 경로는 기존 `.github/workflows/deploy-web-services.yml` 에 additive 등록만 했다
(`detect-changes` 출력 + `deploy-kpa-branch` job + summary). 기존 5개 service 정의는 미변경.
workflow 파일만 바뀐 커밋은 `detect-changes` 가 전부 `false` 를 내므로 최초 배포는
`gh workflow run deploy-web-services.yml -f service=kpa-branch` 로 트리거했다
(run `31568139962` success, 다른 5개 job 은 skipped).

## 2. Migration 적용 결과 (프로덕션)

| Migration | 결과 |
|---|---|
| `AddKpaOrganizationSlug20270303000000` | 적용 · `kpa_organizations.slug` 209/209 backfill · slug 없는 분회 0 |
| `CreateBranchFoundationTables20270304000000` | 적용 · `branch_memberships` / `branch_sites` / `branch_domains` / `branch_posts` 4 테이블 생성 |
| `SeedKpaBranchServiceAndRoles20270305000000` | 적용 · `kpa-branch` 서비스 + role 3종 seed |

기존 테이블 변경은 `kpa_organizations.slug` **nullable 컬럼 추가 + 부분 UNIQUE** 뿐이며 데이터 삭제·대량 update 는 없다.

## 3. Branch Registry smoke

| 항목 | 결과 |
|---|---|
| `GET /api/v1/kpa-branch/service-info` | 200 |
| `GET /api/v1/kpa-branch/branches` | 209건, slug 누락 0 |
| slug resolve (`namgu`) | `ba1e90a6-…` |
| slug resolve (`donggu`) | `469e388a-…` |
| 없는 slug / 없는 host | 404 `BRANCH_NOT_FOUND` |
| 미공개 site | 404 `BRANCH_SITE_NOT_PUBLISHED` |

## 4. Tenant 경계 smoke

| 항목 | 결과 |
|---|---|
| A 분회 slug → A 조직 / B 분회 slug → B 조직 | PASS |
| A 분회 operator 가 `donggu` 의 members / site / posts 접근 | 3/3 403 `BRANCH_SCOPE_MISMATCH` |
| body 에 `organizationId=donggu` 를 넣어 글 생성 | 실제 저장은 `namgu` (DB 확인) — body 로 tenant 변경 불가 |

tenant 는 URL slug(또는 Host)에서만 해석되고 controller 는 항상 `req.branch.id` 를 쓴다.

## 5. 인증 · RBAC smoke

| 항목 | 결과 |
|---|---|
| 미로그인 + 공개 페이지(`/branches/:slug`, `/site`, `/posts`) | 200 |
| 미로그인 + operator 경로 | 401 `AUTH_REQUIRED` |
| member 계정 + operator 경로 | 403 FORBIDDEN (`Required scope: kpa-branch:operator`) |
| A분회 operator 가 B분회 회원 mutation | 403 `BRANCH_SCOPE_MISMATCH` |

**발견(별도 처리 필요)**: 신규 서비스는 `service_credentials` 행이 없어
`serviceKey:'kpa-branch'` 로그인이 `users.password` fallback 으로 떨어져 401 이 난다.
`serviceKey:'kpa-society'` 로그인 시 응답 user payload 에 `kpa-branch` membership/role 이 함께 실려
동작에는 문제가 없으나, **신규 서비스 credential 온보딩 절차가 비어 있다.** 후속 WO 로 분리한다.

## 6. 소속 이력 smoke

시나리오: A 가입 → A 전출 → B 가입 → B 전출 → A 재가입 → B 로 직접 전입(자동 전출).

| 항목 | 결과 |
|---|---|
| `branch_memberships` 이력 보존 | 4행 보존 (삭제 없음) |
| active 개수 | 1 (부분 UNIQUE `WHERE status='active'` 유효) |
| 직접 전입 시 이전 분회 | 자동 `left` 처리 |

## 7. Site · Domain resolver smoke

| 항목 | 결과 |
|---|---|
| 분회별 site 조회 | `namgu` 공개 200 (자기 콘텐츠) |
| 타 분회 미노출 | `donggu` 404 + posts 0건 |
| classic 템플릿 렌더 | 홈 / 공지 / 자료실 / 연락처 렌더 확인 |
| 도메인 등록 → pending 상태 resolve | 404 (active 아닌 도메인은 해석 불가) |
| admin 활성화 후 host resolve | 200 `{ slug: "namgu", source: "domain" }` |
| 다른 host | 404 |
| 도메인 삭제 후 | 404 |

실제 분회 자체 도메인은 붙이지 않았다 (WO 범위 밖). `branch_domains` 계약만 검증했다.

## 8. 브라우저 smoke (Cloud Run URL)

| 경로 | 결과 |
|---|---|
| `/` (분회 디렉터리) | 209 분회 목록 렌더 |
| `/namgu` | classic 템플릿 + 소개 + 공지 1건 + 연락처 렌더 |
| `/namgu/notices` | 공지 목록 렌더 |
| `/login` | 200 |
| console error | 0건 |

**중간 결함 1건 발견 후 수정**: 최초 브라우저 smoke 에서 `/site`·`/posts` 가 CORS 로 차단돼
"분회 정보를 불러오지 못했습니다." 가 노출됐다 (console error 8건).
원인은 `apps/api-server/src/bootstrap/setup-middlewares.ts` `getAllowedOrigins()` 정적 allowlist 에
분회 web origin 이 없던 것. 두 origin 추가로 해결(`6f82fe617`), 재검증 시 `access-control-allow-origin` 정상.
이때 프론트가 빈 화면 대신 실패를 그대로 노출한 것은 load-error 계약이 의도대로 동작한 결과다.

> **후속 필요**: 209 분회가 각자 도메인을 붙이면 정적 allowlist 로는 확장되지 않는다.
> custom-domain onboarding 시 `branch_domains(status='active')` 기반 **동적 origin 판정**을 별도 WO 로 도입한다.

## 9. 회귀

| 항목 | 결과 |
|---|---|
| deploy-web-services run | `deploy-kpa-branch` 만 실행, 나머지 5개 skipped |
| Cloud Run 리비전 | 기존 web service 리비전 변동 없음 (`kpa-branch-web` 만 신규 00001) |
| 기존 서비스 접속 | neture 200 / kpa-society 200 / glycopharm 200 |
| api-server | `o4o-core-api-03305-cdb` Ready · 기존 서비스 CORS·API 정상 |

## 10. smoke fixture 현황 (정리 승인 대기)

프로덕션에 남아 있는 smoke fixture. **삭제는 DB write 라 승인이 필요하여 수행하지 않았다.**

| 테이블 | 잔여 |
|---|---|
| `service_memberships` (`service_key='kpa-branch'`) | 2행 (`operator_notes='WO-KPA-BRANCH-SMOKE fixture'`) |
| `role_assignments` (`role LIKE 'kpa-branch:%'`) | 4행 |
| `branch_memberships` | 6행 |
| `branch_sites` | 1행 (namgu, 게시 상태) |
| `branch_posts` | 1행 (namgu 공지) |
| `branch_domains` | 0행 (smoke 중 삭제 완료) |

`branch_*` 4 테이블의 행은 **전부 이번 smoke 산출물**이므로 전체 삭제가 안전하다.
`branch_sites`/`branch_posts` 의 본문은 curl 인코딩 문제로 한글이 깨져 있어 그대로 두면 안 된다.

정리 SQL(승인 시 실행):

```sql
BEGIN;
DELETE FROM branch_posts;
DELETE FROM branch_sites;
DELETE FROM branch_memberships;
DELETE FROM role_assignments WHERE role LIKE 'kpa-branch:%';
DELETE FROM service_memberships WHERE service_key='kpa-branch';
COMMIT;
```

## 11. 미결 / 후속 WO 후보

1. 신규 서비스 `service_credentials` 온보딩 부재 (§5)
2. 분회 자체 도메인용 **동적 CORS origin 판정** (§8)
3. 공용 도메인(`branch.kpa-society.co.kr`) 실제 매핑 — 현재는 Cloud Run URL 로만 접속
4. custom-domain onboarding(도메인 매핑·인증서) 절차
5. smoke fixture 정리 (§10)

## 12. Git

| 커밋 | 내용 |
|---|---|
| `958f84542` | foundation 구현 (선행 WO, 53 files) |
| `931f6465e` | `deploy-web-services.yml` 에 `kpa-branch` 등록 |
| `6f82fe617` | 분회 web origin CORS 허용 |
| (본 문서) | CHECK 문서 |

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건 (§11 1~4)
