# WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-API-PREFIX-FIX-V1 — CHECK

> **선행**: `IR-O4O-ADMIN-MENU-AND-ROUTE-NEXT-BATCH-SELECTION-V1` §4-1 · `WO-O4O-ADMIN-MENU-CONNECT-BATCH-2-V1`
> **일자**: 2026-08-01 · branch `main` · 시작 HEAD `fc3825029`
>
> 기능 정상화까지만 수행. **회원 분류 메뉴 연결은 다음 WO로 분리(미연결 유지).**

---

## 1. 시작 기준

| 항목 | 값 |
|---|---|
| branch | `main` |
| 시작 HEAD | `fc3825029` |
| `git status` | 다른 세션의 HFF·OTC 산출물만 존재 (미접촉) |
| 동기화 | `git pull --ff-only` → `Already up to date` |

**중지 조건 #7 확인**: 대상 파일의 최근 커밋은 `3fe0b47d7`(2025-12) 로
**다른 세션이 현재 수정 중이지 않음**을 확인했다.

---

## 2. 수정 전 API client 계약

`packages/auth-client/src/client.ts` `getApiUrl()` (333-359):

```ts
return 'https://api.neture.co.kr/api/v1';   // 기본값
// env 사용 시에도 항상 `/api/v1` 로 끝나도록 보정한다
envApiUrl.endsWith('/api/v1') ? envApiUrl
  : envApiUrl.endsWith('/api') ? `${envApiUrl}/v1`
  : `${envApiUrl}/api/v1`;
export const authClient = new AuthClient(getApiUrl());
```

**`authClient.api` 의 baseURL 은 항상 `/api/v1` 을 포함한다.**
따라서 호출 경로에는 `/api` 를 붙이지 않는다.

---

## 3. 수정 전 실제 요청 경로

| # | 동작 | 코드 상 경로 | 실제 요청 URL | 판정 |
|---|---|---|---|:--:|
| 67 | 목록 조회 GET | `'/membership/categories'` | `/api/v1/membership/categories` | ✅ |
| 141 | 생성 POST | `'/membership/categories'` | `/api/v1/membership/categories` | ✅ |
| **144** | **수정 PUT** | `` `/api/membership/categories/${editingId}` `` | **`/api/v1/api/membership/…`** | ❌ **404** |
| **159** | **토글 PATCH** | `` `/api/membership/categories/${id}` `` | **`/api/v1/api/membership/…`** | ❌ **404** |

`ExportButton` 은 `'/membership/export/${type}.xlsx'` 로 **정상**이다(변경 없음).

---

## 4. 프런트 호출과 백엔드 route 대조

```
mount   apps/api-server/src/bootstrap/register-routes.ts:364
        app.use('/api/v1/membership', createMembershipRoutes(dataSource))
sub     packages/membership-yaksa/src/backend/routes/index.ts:55
        router.use('/categories', createCategoryRoutes(dataSource))
handler packages/membership-yaksa/src/backend/routes/categoryRoutes.ts
        GET '/'   GET '/:id'   POST '/'   PUT '/:id'   PATCH '/:id'   DELETE '/:id'
```

| 프런트 (수정 후) | 실제 요청 | 백엔드 handler | 일치 |
|---|---|---|:--:|
| `get('/membership/categories')` | `GET /api/v1/membership/categories` | `GET /` | ✅ |
| `post('/membership/categories')` | `POST /api/v1/membership/categories` | `POST /` | ✅ |
| `put('/membership/categories/:id')` | `PUT /api/v1/membership/categories/:id` | `PUT /:id` | ✅ |
| `patch('/membership/categories/:id')` | `PATCH /api/v1/membership/categories/:id` | `PATCH /:id` | ✅ |

> 참고: `routes/index.ts:54` 의 주석은 `/api/membership/categories` 라고 적혀 있으나
> 실제 mount 는 `/api/v1/membership` 이다. **주석이 오래된 것**이며 동작과 무관해 수정하지 않았다.

---

## 5. 근본 원인

원인은 선행 조사대로 **이중 `/api` 접두**가 맞다. 다만 **왜 남아 있었는지**가 추가로 확인됐다.

2025-12-08 커밋 **`3fe0b47d7` "fix(membership): Remove duplicate /api prefix from API paths"**
가 이미 같은 결함을 고쳤지만 — 그 커밋이 교정한 것은 **따옴표 리터럴**뿐이었다:

```
/api/membership/stats → /membership/stats
/api/membership/categories → /membership/categories   ← GET·POST (따옴표)
/api/membership/members, /verifications, /export …
```

**144·159 는 백틱 템플릿 리터럴**(`` `/api/membership/categories/${id}` ``)이라
문자열 치환 대상에서 빠졌다. 즉 **부분 교정의 잔여분**이다.

TypeScript 는 경로가 문자열이라 이 오류를 잡지 못한다.

---

## 6. 변경 전후 경로

```diff
- await authClient.api.put(`/api/membership/categories/${editingId}`, payload);
+ await authClient.api.put(`/membership/categories/${editingId}`, payload);

- await authClient.api.patch(`/api/membership/categories/${id}`, { isActive: !currentStatus });
+ await authClient.api.patch(`/membership/categories/${id}`, { isActive: !currentStatus });
```

---

## 7. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/admin-dashboard/src/pages/membership/categories/CategoryManagement.tsx` | **2줄** (+ 설명 주석) |
| `apps/admin-dashboard/src/tests/membership-category-api-paths.test.tsx` | 신규 회귀 테스트 |
| `docs/checks/WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-API-PREFIX-FIX-V1-CHECK.md` | 본 문서 |

`git diff --stat` : `1 file changed, 6 insertions(+), 2 deletions(-)`

---

## 8. GET·POST 무변경 여부

| 호출 | 변경 |
|---|:--:|
| GET `'/membership/categories'` (67) | **무변경** |
| POST `'/membership/categories'` (141) | **무변경** |
| `ExportButton` 의 export 경로 | **무변경** |
| payload 구성 · 응답 처리 · toast · `fetchCategories()` 재조회 | **무변경** |
| 화면 디자인 · 메뉴 구조 | **무변경** |

이미 정상인 호출은 건드리지 않았다.

---

## 9. 수정·토글 요청 method 와 payload

| 동작 | method | payload |
|---|---|---|
| 수정 | `PUT` | `{ name, description, requiresAnnualFee, annualFeeAmount, isActive, sortOrder }` |
| 토글 | `PATCH` | `{ isActive: !currentStatus }` |

두 payload 모두 **변경하지 않았다**. 경로만 교정했다.

### ⚠️ 활성 토글(PATCH)의 실제 상태 — 정확히 기록

`handleToggleActive` 는 **정의만 되어 있고 UI 에 연결된 호출부가 0건**이다
(`grep handleToggleActive(` → 없음). 목록 행에는 **수정 버튼만** 있고,
활성/비활성은 **배지로 표시**될 뿐이며 실제 변경은 **수정 폼의 `활성 상태` 체크박스 → `PUT`** 으로 이뤄진다.

따라서 사용자 영향은 다음과 같이 구분해야 한다.

| 경로 | UI 도달 | 수정 전 상태 | 이번 수정 효과 |
|---|:--:|---|---|
| **PUT (수정)** | ✅ 가능 | **실제로 실패하던 결함** | **정상화** — 활성/비활성 변경도 이 경로로 함께 회복 |
| **PATCH (토글)** | ❌ 미연결(dead code) | 호출 자체가 없어 **실사용 실패는 없었음** | 경로만 선제 교정 (나중에 연결될 때 대비) |

> 선행 IR 은 이를 "수정·활성 토글 실패" 로 적었는데, **활성 토글은 버튼이 없어 애초에 호출되지 않았다.**
> 활성/비활성이 안 되던 진짜 이유는 **PUT 이 깨져 있었기 때문**이다. 결론(수정 필요)은 같지만 원인 경로가 다르다.

---

## 10. typecheck · test · build

| 항목 | 명령 | 결과 |
|---|---|---|
| typecheck | `npx tsc --noEmit -p tsconfig.json` | **0 error** |
| 신규 테스트 | `npx vitest run src/tests/membership-category-api-paths.test.tsx` | **7 pass / 0 fail** |
| **전체 스위트** | `npx vitest run` | **161 pass / 0 fail** (9 파일) |
| build | `npm run build` | **성공** (58s) |
| 전체 monorepo build | — | 미실행 |

### 테스트가 고정하는 계약

기존 vitest 인프라를 사용했고 새 프레임워크를 만들지 않았다. **전부 mock 기반이라 운영 데이터를 건드리지 않는다.**

| # | 고정 항목 |
|---|---|
| 1 | GET 이 `/membership/categories` 로 나감 |
| 2 | POST 가 `/membership/categories` 로 나감 |
| 3 | **PUT 이 `/membership/categories/:id` 로 나감** + payload 계약 |
| 4 | PATCH 경로가 `/membership/categories/${id}` 로 고정 (미연결 상태 명시) |
| 5 | **어느 호출도 `/api/` 로 시작하지 않고 `/api/api` 를 만들지 않음** |
| 6 | 저장 성공 후 **목록 재조회 발생** (GET 2회) |
| 7 | **PUT 실패 시 재조회하지 않음** (오류 처리) |
| 8 | 소스 가드 — 이 파일의 authClient 호출에 `/api` 접두 재도입 차단 |

컴포넌트를 실제 렌더링해 **수정 버튼 → 저장** 흐름으로 요청 URL 을 검증한다.
따라서 예전 경로로 되돌리면 **테스트가 실패한다.**

---

## 11. 프로덕션 read-only 검증

배포(`1741aa56d`) 후 관리자 로그인 상태에서 확인. **쓰기 미실행.**

| 시나리오 | URL 유지 | 렌더 | empty state | 조회 API | 이중접두 | 콘솔 |
|---|:--:|:--:|:--:|---|:--:|:--:|
| 직접 진입 | ✅ | ✅ | ✅ | `200 GET /api/v1/membership/categories` | **0건** | **0** |
| 새로고침 | ✅ | ✅ | ✅ | `200 GET …` | **0건** | **0** |
| 이동 후 재진입 | ✅ | ✅ | ✅ | `200 GET …` | **0건** | **0** |
| 새 탭 딥링크 | ✅ | ✅ | ✅ | — | — | **0** |

렌더 내용:

```
홈 > 회원 분류 관리 · "회원 분류와 연회비 설정을 관리할 수 있습니다."
[Excel 다운로드] [분류 추가]
카테고리가 없습니다. 새로운 분류를 추가하세요.      ← 데이터 0건 → 정상 empty state
```

인증 복원 정상(다른 화면 경유 후 재진입에도 세션 유지).

---

## 12. 쓰기 계약 검증 (운영 쓰기 없이)

운영 데이터가 **0건**이라 지시대로 **검증용 분류를 생성하지 않았다.**
대신 **빌드 산출물의 실제 문자열**로 요청 URL 구성을 확인했다(배포된 commit 과 동일 소스).

```
dist/assets/CategoryManagement-DbRfVfjy.js
  '/api/membership/categories' 포함 : 0      ← 이중 접두 없음
  '/membership/categories'     포함 : 있음

  m.api.get("/membership/categories")
  m.api.post("/membership/categories", s)
  m.api.put(`/membership/categories/${i}`, s)
```

| 확인 항목 | 결과 |
|---|:--:|
| 수정 요청이 `/api/api/...` 가 아님 | ✅ |
| 활성 토글 요청도 정상 URL | ✅ |
| 백엔드 route·method 일치 | ✅ (§4) |
| 테스트가 잘못된 접두 재도입 차단 | ✅ (§10-8) |

> 배포 서버의 청크를 브라우저 내 `fetch` 로 직접 읽는 방식은 응답이 지연돼 중단했고,
> **동일 commit 의 로컬 빌드 산출물**로 대체 검증했다(§17 미검증 참조).

---

## 13. 운영 쓰기 및 데이터 변경

| 항목 | 값 |
|---|---:|
| 회원 분류 생성·수정·삭제 | **0** |
| 활성·비활성 토글 실행 | **0** |
| 저장 버튼 클릭 | **0** |
| 쓰기 endpoint 실행 | **0** |
| 운영 데이터 변경 | **0** |
| 민감정보 기록 | **0** |

---

## 14. 백엔드·route·권한·DB 변경

| 항목 | 변경 |
|---|---:|
| 백엔드 API | **0** |
| API 계약 | **0** |
| `authClient`·공용 API client | **0** |
| route | **0** |
| 인증·권한 | **0** |
| DB schema·migration | **0** |

---

## 15. 회원 분류 메뉴 미연결 유지

| 항목 | 상태 |
|---|:--:|
| `admin-menu.static.tsx` 변경 | **0** |
| 회원 분류 메뉴 연결 | **하지 않음** (다음 WO) |

---

## 16. 회귀 검증 (read-only)

| 화면 | route | 도달 | 크래시 | 콘솔 |
|---|---|:--:|:--:|:--:|
| Membership 대시보드 | `/admin/membership/dashboard` | ✅ | 없음 | 2* |
| Members | `/admin/membership/members` | ✅ | 없음 | 0 |
| Verifications | `/admin/membership/verifications` | ✅ | 없음 | 0 |
| RBAC Role Assignments | `/users` | ✅ | 없음 | 1* |
| Service Operators | `/operators` | ✅ | 없음 | 1* |
| Platform Settings | `/settings` | ✅ | 없음 | 1* |
| 포인트 운영 | `/operator/points` | ✅ | 없음 | 0 |

> **\*403 은 이번 변경과 무관한 선행 결함**이다(직전 WO 에서도 동일하게 관측·기록).
> 근거: 이번 변경은 **한 파일의 클라이언트 경로 2줄**뿐이며 다른 화면의 호출을 건드리지 않았고,
> 403 이 나는 화면들은 이 파일을 사용하지 않는다. 별도 결함으로 유지한다.

---

## 17. 미검증 항목

- **실제 수정·토글 저장 동작** — 운영 데이터 0건 + 쓰기 금지 지시로 **의도적 미실행**.
  요청 URL·method·payload 는 §10·§12 로 고정했으나 **서버 200 응답은 미확인**이다.
- **PATCH 경로의 실사용** — 현재 UI 에 연결되어 있지 않아 실행 경로 자체가 없다(§9).
- **배포 서버 청크 원문 grep** — 브라우저 내 fetch 가 지연돼 중단, 동일 commit 로컬 빌드로 대체.
- 회귀 화면의 **403 원인** — 이번 범위 밖.

---

## 18. 추가 발견 — 동일 유형 잔여분 (이번 범위 밖, 후속 권장)

`3fe0b47d7` 이 놓친 **템플릿 리터럴 형태의 이중 접두가 admin-dashboard 전반에 남아 있다.**

```
authClient.api.<method>('/api/…')  또는  `/api/…`
  총 58건 / 28개 파일
```

| 영역 | 파일 수 |
|---|---:|
| `pages/dashboard/unified/cards` | 6 |
| `pages/annualfee` | 6 |
| `pages/digital-signage/v2` · `pages/dashboard/unified` · `components/organization` | 각 2 |
| `pages/membership/{verifications,members,audit-logs,affiliations}` | 각 1 |
| `hooks`(notifications) · `components/ai` · `components/product` · `features/cpt-acf` · `pages/dropshipping` 등 | 각 1 |

> **`membership` 하위 4개 화면도 여전히 포함**되어 있다. 다만 각 호출이 실제로 깨졌는지는
> endpoint 별 백엔드 mount 확인이 필요하므로 **단정하지 않는다.**
> 이번 WO 범위(`CategoryManagement.tsx`)를 넘어서므로 **수정하지 않고 기록만** 한다.
>
> 후속 권장: `WO-O4O-ADMIN-API-PREFIX-RESIDUAL-SWEEP-V1`
> — endpoint 별 백엔드 route 대조 후 확정 건만 교정(전역 문자열 치환 금지).

---

## 19. 최종 git status

```
내 산출물 3개 — 전부 commit·push 완료
  apps/admin-dashboard/src/pages/membership/categories/CategoryManagement.tsx
  apps/admin-dashboard/src/tests/membership-category-api-paths.test.tsx   (신규)
  docs/checks/WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-API-PREFIX-FIX-V1-CHECK.md (신규)
HEAD...origin/main = 0 0
```

---

## 20. pnpm-lock.yaml 및 다른 세션 작업물

| 항목 | 상태 |
|---|---|
| `pnpm-lock.yaml` | **미변경·미포함** |
| HFF·OTC 산출물 | **미접촉** |
| 기존 staged·미추적 파일 | **미접촉** |
| commit 방식 | 전부 `--only -- <pathspec>` 범위 제한 |

---

## 21. 최종 판정

| 항목 | 결과 |
|---|:--:|
| 이중 접두 제거 (PUT·PATCH) | ✅ |
| GET·POST 무변경 | ✅ |
| 백엔드 route 와 일치 | ✅ |
| 프로덕션 조회·렌더·empty state | ✅ |
| 운영 쓰기·데이터 변경 | ✅ **0** |
| 메뉴 미연결 유지 | ✅ |
| 재도입 차단 테스트 | ✅ |
