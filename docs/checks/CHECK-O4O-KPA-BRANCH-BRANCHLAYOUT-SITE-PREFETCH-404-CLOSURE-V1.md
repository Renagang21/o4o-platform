# CHECK — WO-O4O-KPA-BRANCH-BRANCHLAYOUT-SITE-PREFETCH-404-CLOSURE-V1

kpa-branch 운영자/회원 화면 진입 시 `BranchLayout` 이 세션 복구(`canOperate` 판정) 전에 public
site 를 먼저 조회해 미게시 분회에서 `/branches/:slug/site` 404 를 만들던 동작을 제거한 기록이다.

- 상태: CLOSED (2026-09-09)
- 커밋: `588a37af7` (운영자 영역 가드) · `9a79857b4` (세션 복구 전체로 가드 확대)
- 변경 파일: `services/web-kpa-branch/src/layouts/BranchLayout.tsx` **1개** (backend 무변경)
- 판정 기준(사용자 확정): 불필요한 `/site` 요청 자체를 없애되, 공개 페이지의 미게시 분회 정책과
  `BRANCH_SITE_NOT_PUBLISHED` 의미는 절대 바꾸지 않는다.

---

## 1. 원인

`BranchLayout` 의 site 조회 effect 가 **세션 복구 완료 여부를 보지 않았다.**

```
mount → useAuth().user = null → roles = [] → canOperate = false
      → getPublicSite(slug)            … 미게시 분회면 404
GET /auth/me 완료 → user 반영 → canOperate = true
      → effect 재실행 → getOperatorSite(slug)   … 200
```

`AuthContext` 는 `isLoading` 을 이미 노출하고 있었으나 `BranchLayout` 이 이를 쓰지 않았다.
따라서 첫 조회는 **결과가 쓰이지 않고 버려지는 요청**이었고, 미게시 분회에서는 그 버려지는
요청이 그대로 404 로 남았다. 404 자체는 backend 의 정상 응답이며, 결함은 프론트의 조회 시점이다.

같은 뿌리로 비운영자 영역(회원 mypage · 공개 홈)에서도 auth 확정 전/후로 **동일한 public 조회가
2회** 나가고 있었다.

## 2. 수정

`BranchLayout` 의 조회 effect 앞에 세션 복구 대기 가드를 둔다.

```tsx
const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
...
if (isAuthLoading) return;                       // 세션 복구 전에는 조회하지 않는다
const load = isOperatorArea && canOperate ? getOperatorSite(slug) : getPublicSite(slug);
```

- 요청을 **미루는** 것이지 404 를 숨기거나 삼키는 것이 아니다. `catch` 분기(`BRANCH_NOT_FOUND` →
  `NotFoundPage`, 그 외 404 → 안내 문구)는 그대로다.
- 비로그인 방문자는 `useServiceAuth` 의 `isLoading` 초기값이 **토큰 유무**이므로 처음부터 `false`
  다 → 공개 조회 시점이 변하지 않는다(익명 접근 지연 0). 실측으로 확인했다.
- 1차(`588a37af7`)는 `isOperatorArea && isAuthLoading` 로 운영자 영역에만 걸었고, 실측에서 회원
  화면 중복이 남는 것을 확인해 2차(`9a79857b4`)에서 세션 복구 전체로 넓혔다(WO 범위 문장:
  "운영자·회원 화면에서 불필요한 public site fetch 방지").

## 3. 제거된 요청 (배포본 실측 · `namgu` = `branch_sites` 0행인 미게시 분회)

배포 `9a79857b4` / 번들 `index-BqW-mAQ0.js`. 모두 deep link 직접 진입 + 새로고침 기준.

| 화면 | 수정 전 public `/branches/namgu/site` | 수정 후 |
|---|---|---|
| 운영자 회원 콘솔 `/operator/members` | 1건 (404, 버려짐) | **0건** |
| 운영자 신상신고 `/operator/annual-reports` | 1건 (404) | **0건** |
| 운영자 회비 `/operator/fees` | 1건 (404) | **0건** |
| 운영자 연수교육 `/operator/education` | 1건 (404) | **0건** |
| 회원 `/mypage/fees` (로그인) | 2건 | 1건 |
| 공개 홈 `/kpa/namgu` (로그인) | 3건 | 2건 |
| 공개 홈 `/kpa/namgu` (익명) | 2건 | 2건 (불변) |

- 운영자 4화면은 `/branches/namgu/operator/site` 200 이 1건씩만 나가고 console 오류 0건이다.
- 회원 화면에 남은 1건은 회원에게 유일한 site 소스이며, 그 404 는 실제 미게시 상태를 뜻한다.
- 공개 홈에 남은 2건은 `BranchLayout` 1건 + `BranchHomePage` 자체 조회 1건이다(§7).

## 4. 공개 페이지 회귀 (정책 불변)

- `/kpa/namgu` (미게시): public `/site` 조회 **유지** → 404 `BRANCH_SITE_NOT_PUBLISHED` → 셸 +
  "아직 공개되지 않은 분회 홈페이지입니다." 안내. 익명·로그인 모두 동일.
- `/kpa/no-such-branch-xyz`: `BRANCH_NOT_FOUND` → 셸 없이 `NotFoundPage`. 두 404 의 구분 불변.
- backend `BranchSiteController` 는 한 줄도 바꾸지 않았다. 404 를 200 으로 바꾸지 않았고, 미게시
  분회가 공개 경로에서 노출되지도 않는다.

## 5. 회귀

| 축 | 결과 |
|---|---|
| kpa-society `/kpa/*` routing | 불변 (basename `/kpa` 로 위 모든 경로 정상 진입) |
| custom domain resolver (`src/lib/tenant`) | 파일 무변경 |
| tenant / branch guard (`requireKpaBranchScope` · `resolveBranch`) | 파일 무변경 |
| 서비스 축(`service_memberships` · `service_credentials`) | 무변경 |
| 배포 | `Deploy Web Services (Cloud Run)` 두 커밋 모두 success |

## 6. 검증 fixture (생성 → 원복)

운영자 화면 브라우저 smoke 를 위해 `namgu` 운영자 1명분 최소 4행만 만들고 검증 후 삭제했다
(프로덕션 데이터 변경은 이 4행 생성·삭제뿐이며 사용자 승인 범위 안이다).

| 테이블 | row id | 내용 |
|---|---|---|
| `service_memberships` | `f9000000-0000-4000-8000-000000000001` | 검증용 계정 / `kpa-branch` / active |
| `service_credentials` | `f9000000-0000-4000-8000-000000000002` | 같은 사용자의 `kpa-society` 행에서 `password_hash` 를 SELECT 복사 (비밀번호를 직접 다루지 않음) |
| `role_assignments` | `f9000000-0000-4000-8000-000000000003` | `kpa-branch:operator` / `is_active=true` |
| `branch_memberships` | `f9000000-0000-4000-8000-000000000004` | namgu / active |

- 원복 후 재실측: `branch_memberships=0` · `kpa-branch service_memberships=0` ·
  `service_credentials=0` · `role_assignments(kpa-branch%)=0` — 생성 전 baseline 과 동일.
- 해당 계정의 기존 4개 서비스 credential 해시(neture / k-cosmetics / pharmacy-hub /
  kpa-society)는 fixture 전후 md5 prefix 가 동일하다 → 타 서비스 데이터 불변.

## 7. 범위 밖 (고치지 않음)

- 공개 홈에서 `BranchLayout` 과 `BranchHomePage` 가 각각 public site 를 1건씩 조회한다(합 2건).
  공개 페이지의 기존 조회이므로 WO 의 "공개 분회 홈페이지에서는 기존 site 조회 유지" 에 따라 두었다.
- 회원 화면의 public site 조회 1건(§3)은 제거 대상이 아니다.
- `fee.exemptionType` 보강은 이번 WO 에 섞지 않았다(다음 작업).

## 8. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
