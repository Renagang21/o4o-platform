# CHECK-O4O-ADMIN-LMS-INSTRUCTOR-API-DOUBLE-PREFIX-FIX-V1

- **WO**: `WO-O4O-ADMIN-LMS-INSTRUCTOR-API-DOUBLE-PREFIX-FIX-V1`
- **작성일**: 2026-08-10
- **판정**: **PASS** — 실브라우저에서 `/api/v1/lms/instructor/courses` 200, 이중 접두 0건

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 시점 HEAD | `f2281fb782432dd51a9bfa1b5d21f2ee12df9599` |
| 브랜치 | `main` (작업 시작 시 worktree clean) |
| 수정 commit | `e0f196e8dcc43356919ca6322a845ae6c9fcbe35` |

---

## 2. 원인

이중 접두는 **두 값의 조합**에서 발생했다.

| 위치 | 값 |
|---|---|
| `apps/admin-dashboard/src/lib/api-client.ts:3` | `baseURL = import.meta.env.VITE_API_URL \|\| 'https://api.neture.co.kr'` |
| `.github/workflows/deploy-admin.yml:48,54` | `api_url=https://api.neture.co.kr/api` (production·development 동일) |
| `apps/admin-dashboard/src/lib/api/lmsInstructor.ts:9` (수정 전) | `const BASE_PATH = '/api/v1/lms/instructor';` |

프로덕션 빌드는 `VITE_API_URL` 이 **이미 `/api` 로 끝나는** 값으로 주입된다.
여기에 `BASE_PATH` 가 `/api/v1/...` 을 다시 붙여 최종 요청 경로에 `/api` 가 두 번 들어갔고,
백엔드에 해당 경로가 없어 404 로 실패했다.

추가로 확인한 사실:

- **`@o4o/lms-client` 는 이 경로에 관여하지 않는다.** `lmsInstructor.ts` 는 공용 client 를 쓰지 않는
  admin-dashboard 로컬 axios 래퍼다. 따라서 WO §5.1 의 공용 경로 계약(`/lms/instructor/courses`)은
  이번 수정으로 **변경되지 않았고**, "공용 계약 변경 필요" HOLD 조건도 발동하지 않았다.
- 백엔드 route 는 정상 존재한다 — `apps/api-server/src/modules/lms/routes/lms.routes.ts:245`
  (`GET /api/v1/lms/instructor/courses`). 즉 백엔드 결함이 아니라 프론트 경로 조립 결함이다.
- `apiClient` 소비처는 3개뿐이다 — `api/categoriesApi.ts`(`/api/categories` 사용 · 이번 범위 밖),
  `lib/api/lmsInstructor.ts`(이번 수정 대상), `lib/widgets/registerWidgets.ts`(`/admin/...` 등 사용).
  세 파일이 서로 다른 접두 관례를 쓰고 있어 `api-client.ts` 의 `baseURL` 자체를 건드리면
  범위 밖 화면의 URL 이 함께 바뀐다. 그래서 **`api-client.ts` 는 수정하지 않았다.**

---

## 3. 수정 파일

**1개 파일, 1개 상수만 수정했다.**

`apps/admin-dashboard/src/lib/api/lmsInstructor.ts`

```ts
const API_PREFIX = String(apiClient.defaults.baseURL ?? '').replace(/\/+$/, '').endsWith('/api')
  ? ''
  : '/api';

const BASE_PATH = `${API_PREFIX}/v1/lms/instructor`;
```

- `baseURL` 이 `/api` 로 끝나면(= 배포 빌드) `/v1` 부터 붙인다.
- `VITE_API_URL` 미주입 시 fallback `baseURL` 에는 `/api` 가 없으므로 기존 `/api/v1/...` 경로를 유지한다.
- `courses` · `enrollments` · `approve` · `reject` 4개 호출이 모두 같은 `BASE_PATH` 를 쓰므로 함께 교정된다.
- 대규모 normalize framework 는 만들지 않았다 (WO §6 마지막 항).

---

## 4. 최종 요청 URL 변화

| | URL |
|---|---|
| 수정 전 | `https://api.neture.co.kr/api` + `/api/v1/lms/instructor/courses` → **`/api` 이중** → 404 |
| 수정 후 | `https://api.neture.co.kr/api/v1/lms/instructor/courses?page=1&limit=50` → **200** |

실측(브라우저 `performance.getEntriesByType('resource')`):

```
https://api.neture.co.kr/api/v1/lms/instructor/courses?page=1&limit=50
```

---

## 5. 재발 방지 확인

| 확인 | 결과 |
|---|---|
| `apps/admin-dashboard/src` 내 `/api/api/v1` 문자열 | **0건** (주석 포함 0 — 설명 문구도 리터럴을 쓰지 않도록 작성) |
| 프로덕션 빌드 산출물 `dist/assets` 내 `/api/api` | **0건** |
| 빌드 산출물 내 `/v1/lms/instructor` | 존재 (`dist/assets/index-CUBEcK2T.js`) |
| 실브라우저 세션 전체 요청 중 `/api/api` | **0건** (LMS·미디어·Operators 3화면 모두) |

---

## 6. smoke 결과 (실브라우저 · 프로덕션)

환경: `https://admin.neture.co.kr` · 계정 `sohae2100@gmail.com` · 배포 후 빌드 스탬프 `2026. 8. 10. 오후 2:56`

| # | 항목 | 결과 |
|---|---|---|
| 1 | 로그인 | **PASS** — `/home` 진입 |
| 2 | `/admin/lms-instructor` 렌더 | **PASS** — "강사 대시보드" 정상 렌더 |
| 3 | `GET /api/v1/lms/instructor/courses` | **PASS** — 200, 이중 접두 없음 |
| 4 | 목록 데이터 | **PASS** — 내 강좌 1개(`smoke 강의 [guide-test]`) 표시, "0건 위장" 아님 |
| 5 | 콘솔 에러 | **0건** |
| 6 | 오류 배너(`role="alert"`) | 미표시 (조회 성공이므로 정상) |

**403 여부**: 이번 smoke 에서는 403 이 발생하지 않았다. 200 + 실데이터 1건까지 확인되었으므로
"prefix 정상 / 권한·데이터 문제 별도" 로 분리 기록해야 할 사례는 없다.

---

## 7. 수강신청 모달 검증 여부

**미검증.** 사유는 다음과 같다.

- 모달 진입 버튼("신청 관리")은 `course.requiresApproval` 이 true 인 강좌 행에만 렌더된다
  (`apps/admin-dashboard/src/pages/lms-instructor/dashboard/index.tsx:247`).
- 프로덕션 계정이 보유한 강좌 1건은 **무료 · 승인 필요 "—"** 로 `requiresApproval = false` 이므로
  버튼 자체가 존재하지 않는다. 신청 대기도 0명이다.
- 승인 필요 강좌를 새로 만들거나 수강신청을 생성하는 것은 DB write 이므로 WO §8 금지 범위다.

**구조적 근거**: `getPendingEnrollments` · `approveEnrollment` · `rejectEnrollment` 는
`getMyCourses` 와 **동일한 `BASE_PATH` 상수**를 사용한다. `courses` 요청이 200 으로 확인된 이상
나머지 3개 경로도 같은 접두로 조립된다. 다만 실호출 관측은 하지 못했으므로 미검증으로 남긴다.

---

## 8. typecheck · build

| 항목 | 결과 |
|---|---|
| `pnpm run type-check` (admin-dashboard) | **PASS** — 오류 0 |
| `VITE_API_URL=https://api.neture.co.kr/api pnpm run build:prod` | **PASS** — `✓ built in 46.95s` |
| 공용 패키지 변경 | **없음** (admin-dashboard 파일 1개만 변경) |

---

## 9. 배포

| 항목 | 값 |
|---|---|
| 대상 | Admin Dashboard 만 (백엔드 변경 없음 → API 배포 없음) |
| workflow | `deploy-admin.yml` |
| run id | `31360009456` |
| headSha | `e0f196e8dcc43356919ca6322a845ae6c9fcbe35` |
| 결과 | **success** |

---

## 10. 제외 범위 준수

| 금지 항목 | 준수 |
|---|---|
| 백엔드 LMS route 변경 | ✅ 변경 0 |
| LMS 권한 정책 변경 | ✅ 변경 0 |
| `@o4o/lms-client` 경로 계약 변경 | ✅ 해당 패키지 미참조·미변경 |
| 다른 서비스 LMS 호출부 대량 수정 | ✅ 변경 0 |
| `content/categories` 수정 | ✅ `categoriesApi.ts` 읽기만, 변경 0 |
| `pharmacy/qr/source/products` 수정 | ✅ 변경 0 |
| `UserForm` 수정 | ✅ 변경 0 |
| DB write · migration | ✅ 0 |
| 무관한 dirty 파일 · lockfile 스테이징 | ✅ path-specific commit (`-- apps/admin-dashboard/src/lib/api/lmsInstructor.ts`) |

### 회귀 확인

| 대상 | 결과 |
|---|---|
| 로그인 | **PASS** |
| `/admin/lms-instructor` 렌더 | **PASS** |
| `/operators` (OperatorsPage) | **PASS** — 403 시 오류 배너 + "다시 시도" 유지, 직전 WO 동작과 동일 |
| `/content-resource/media-assets` (직전 WO 수정 8화면 중 1) | **PASS** — 총 35건 정상 로드, 배너 미표시 |
| 다른 서비스 LMS client 계약 | **불변** — 변경 파일이 admin-dashboard 로컬 모듈 1개뿐 |

> 직전 WO 에서 수정한 8화면 중 sellerops/supplierops(AppRouteGuard 차단) ·
> `/users`(platform:super_admin 필요) · StoreRequestReviewModal(검수 대상 0건) 은
> 이번에도 동일 사유로 접근 불가하여 회귀 관측 대상에서 제외했다. 이번 변경과 코드 경로가 겹치지 않는다.

---

## 11. commit SHA

| commit | 내용 |
|---|---|
| `e0f196e8dcc43356919ca6322a845ae6c9fcbe35` | fix(admin): LMS instructor client `/api` 이중 접두 제거 |
| (본 문서) | docs(check): 결과 기록 |

---

## 12. push

- `f2281fb78..e0f196e8d  main -> main` **완료**
- 본 CHECK 문서 commit 후 동일 브랜치에 push
- 작업 중 다른 세션(`WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1`)이 `696799195` 를 main 에 추가했으나
  파일 경로가 겹치지 않아 충돌 없음

---

## 13. 후속 (이번 작업에서 처리하지 않음)

WO §12 그대로 유지한다.

1. `IR-O4O-ADMIN-CONTENT-CATEGORIES-LEGACY-ROUTE-AUDIT-V1`
   — `categoriesApi.ts` 는 `/api/categories` 를 쓰며, 같은 `baseURL` 조합에서 역시 `/api` 가 중복된다.
   legacy route 여부 판단이 선행되어야 하므로 이번 범위에서 제외했다.
2. `IR-O4O-ADMIN-QR-SOURCE-PRODUCTS-LEGACY-ROUTE-AUDIT-V1`
3. `WO-O4O-USERFORM-EDIT-PASSWORD-FIELD-REMOVE-IDENTITY-V2-ALIGNMENT-V1`

추가 관찰(수정하지 않음): `lib/widgets/registerWidgets.ts` 는 `/admin/...` · `/orders` 등
`/v1` 없는 경로를 쓴다. 위 1번 IR 과 같은 성격의 접두 관례 불일치로 보이나 이번 범위 밖이다.
