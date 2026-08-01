# WO-O4O-ADMIN-HUB-NOTICES-CRASH-FIX-V1 — CHECK

> **선행**: `IR-O4O-ADMIN-MENU-AND-ROUTE-NEXT-BATCH-SELECTION-V1` · `WO-O4O-ADMIN-AUTH-STATUS-ENVELOPE-FIX-V1`
> **일자**: 2026-08-01 · branch `main` · 시작 HEAD `22d78034e`

---

## 1. 수정 전 재현 결과

프로덕션 `admin.neture.co.kr/operator/hub-notices` 에 관리자 로그인 상태로 직접 진입.

| 항목 | 결과 |
|---|---|
| 화면 | **ErrorBoundary 대체 화면** — "문제가 발생했습니다 / 예기치 않은 오류가 발생했습니다" |
| 목록 표시 | **전혀 렌더되지 않음** |
| 조회 API | **200 정상** |
| 재현율 | **100%** (직접 진입·새로고침 모두) |

> **조회가 실패해서 깨진 것이 아니다. 조회가 성공했기 때문에 깨졌다.**

---

## 2. 정확한 TypeError 와 stack trace

```
TypeError: Cannot read properties of undefined (reading 'totalPages')
    at X (https://admin.neture.co.kr/assets/HubNoticeListPage-BswfvkZf.js:1:7341)
    at gj (vendor-react-DTyQ2sX_.js:48:48180)
    at $j (vendor-react-DTyQ2sX_.js:48:70947)
    at QK (vendor-react-DTyQ2sX_.js:48:81259)

ErrorBoundary caught an error: TypeError: Cannot read properties of undefined (reading 'totalPages')
Component stack:
    at X (HubNoticeListPage-BswfvkZf.js:1:4913)
    at Suspense
```

**발생 위치**: `apps/admin-dashboard/src/pages/kpa/HubNoticeListPage.tsx:400` (수정 전)

```tsx
{data && data.pagination.totalPages > 1 && (   // ← data.pagination 이 undefined
```

**실패 상태**: loading·empty·error 가 아니라 **success(정상 조회 성공) 렌더 단계**.

---

## 3. 근본 원인

**형제 화면의 응답 형태를 다른 계약의 endpoint 에 그대로 옮겨 쓴 것**이다.

| 화면 | endpoint | 실제 응답 계약 | 화면 가정 | 결과 |
|---|---|---|---|---|
| `HubContentsPage` | `/hub/contents` | **중첩형** `pagination:{…}` | 중첩형 | ✅ 정상 |
| **`HubNoticeListPage`** | `/kpa/news/admin/list` | **평면형** | **중첩형** | ❌ **크래시** |

두 endpoint 는 백엔드에서 서로 다른 형태로 응답한다 (양쪽 모두 코드로 확인):

```ts
// apps/api-server/src/routes/kpa/kpa.routes.ts:1230   ← 이 화면이 쓰는 것 (평면형)
res.json({ success: true, data: enrichedData, total, page, limit, totalPages: Math.ceil(total / limit) });

// apps/api-server/src/modules/hub-content/hub-content.service.ts:184   ← 형제 화면 (중첩형)
return { success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
```

`HubNoticeListPage` 의 `ListResponse` 타입이 존재하지 않는 `pagination` 을 선언하고 있었기 때문에
**TypeScript 도 이 오류를 잡지 못했다**(타입은 통과, 런타임에서만 실패).

> 따라서 이 화면은 **작성된 시점부터 조회에 성공할 때마다 항상 크래시**했다.
> 공지 데이터 유무와 무관하다 — 0건이어도 `totalPages` 접근에서 동일하게 깨진다.

**분류**: 렌더링 오류(응답 봉투 해석 불일치). API 오류 아님. 백엔드 결함 아님.

### 3-B. ⚠️ 1차 수정 후 드러난 **2차 크래시** (가려져 있던 결함)

1차 수정 배포 후 프로덕션에서 재검증하자 **다른 TypeError 가 새로 나타났다.**

```
TypeError: Cannot read properties of null (reading 'expiresAt')
    at Object.render (HubNoticeListPage-BFmYC7Iw.js:1:6575)
```

`totalPages` 크래시가 **행 렌더링 이전 단계에서 먼저 터져** 이 결함을 가리고 있었다.
1차 수정으로 렌더가 진행되면서 비로소 드러난 것이다.

**원인**: `BaseTable` 의 컬럼 render 호출 규약을 잘못 사용했다.

```ts
// packages/ui/src/components/table/BaseTable.tsx:623
const content = col.render ? col.render(value, row, rowIndex) : …
// packages/ui/src/components/table/types.ts:23
render?: (value: any, row: T, index: number) => ReactNode;
```

첫 인자는 **셀 값**인데 기존 코드는 `render: (row) => …` 로 받아 **값을 row 처럼** 다뤘다.

| 컬럼 | 첫 인자에 실제로 들어온 값 | 결과 |
|---|---|---|
| `title` | `"공지사항 테스트"` (문자열) | 크래시 없음. **제목이 빈 칸으로 렌더** (조용한 오작동) |
| `status` | `"published"` | 크래시 없음. 항상 `draft` 배지로 폴백 |
| **`expiresAt`** | **`null`** | **`null.expiresAt` → 크래시** |

`value` 가 `any` 로 선언돼 있어 **TypeScript 가 이 실수를 잡지 못한다**.
정상 동작하는 형제 화면은 `render: (_value, row)` 로 올바르게 쓰고 있었다(`HubContentsPage.tsx:154`).

> 즉 이 화면에는 **같은 뿌리(형제 화면에서 옮겨오며 계약을 맞추지 않음)의 결함이 2개** 있었고,
> 하나가 다른 하나를 가리고 있었다. 두 번째 수정으로 **제목이 정상 표시**되는 것도 함께 회복됐다.

---

## 4. 실제 API 응답 vs 프런트 기대 구조

**실제 응답** (프로덕션 실측, `GET /kpa/news/admin/list?serviceKey=kpa-society&type=notice&page=1&limit=20` → **200**):

```json
{ "success": true,
  "data": [ { "id": "90d0a2c9-…", "title": "공지사항 테스트", "status": "published", … } ],
  "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
```

**프런트가 기대한 구조** (수정 전):

```ts
{ success: boolean; data: NoticeItem[]; pagination: { page; limit; total; totalPages } }
//                                      ^^^^^^^^^^ 서버가 보내지 않는 키
```

`total`·`page`·`limit`·`totalPages` 는 **최상위**에 평면으로 온다.

---

## 5. 수정 파일과 핵심 변경

**수정 파일 1개 · 신규 테스트 1개.** 백엔드·route·메뉴·권한·DB 변경 0.

`apps/admin-dashboard/src/pages/kpa/HubNoticeListPage.tsx`

### 5-1. 타입을 실제 계약에 맞춤

```ts
interface ListResponse {
  success: boolean;
  data: NoticeItem[];
  total: number; page: number; limit: number; totalPages: number;   // 평면형
}
```

### 5-2. 응답 계약 검증 (빈 목록 위장 금지)

```ts
if (!body || !Array.isArray(body.data)) {
  throw new NoticeContractError('공지 목록 응답 구조가 예상과 다릅니다.');
}
```

배열이 아닌 값을 `[]` 로 바꾸지 않는다. **오류를 "공지 0건" 으로 위장하면 원인이 숨는다.**

### 5-3. totalPages 산출 (표시 전용 · 데이터 위조 아님)

```ts
export function resolveTotalPages(body) {
  if (typeof body.totalPages === 'number' && … > 0) return body.totalPages;  // 1) 계약대로
  if (total/limit 산출 가능) return Math.max(1, Math.ceil(total / limit));    // 2) 보정
  return 1;                                                                  // 3) UI 숨김
}
```

### 5-4. 크래시 지점 제거

```diff
- {data && data.pagination.totalPages > 1 && (
+ {!isError && totalPages > 1 && (
```

### 5-5. 선택 필드 렌더 안전성

```ts
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ko-KR');
}
```

`createdAt` 이 누락되면 기존에는 `Invalid Date` 가 그대로 노출됐다.

### 5-6. 컬럼 render 호출 규약 교정 (2차 크래시)

5개 컬럼 전부를 `(_value, row)` 로 교정하고, **회귀 테스트가 실제 호출 규약으로 직접 호출**할 수 있도록
컬럼 정의를 `createNoticeColumns({ onEdit, onArchive })` factory 로 분리했다.

```diff
- render: (row) => <span>{formatDate(row.expiresAt)}</span>
+ render: (_value, row) => <span>{formatDate(row.expiresAt)}</span>
```

factory 분리는 테스트 가능성 확보 목적이며 **렌더 결과·동작은 동일**하다.

### 5-7. 변경하지 않은 것

- 공지 **생성·수정·비공개(archive) 계약** — 무변경
- 백엔드 응답 계약 · route · 권한 · 메뉴 · DB — 무변경
- **`HubContentsPage`** — 자기 endpoint 기준으로 **정상이므로 손대지 않았다**
- 공용 API client · 인증 · ErrorBoundary — 무변경
- 하드코딩 샘플·mock 으로 감추지 않음

---

## 6. loading · success · empty · error 처리

| 상태 | 조건 | 화면 |
|---|---|---|
| **loading** | `isLoading` | "불러오는 중..." |
| **정상 목록** | 배열 1건 이상 | `BaseTable` 목록 |
| **데이터 0건** | 배열 0건 | **empty state** — "등록된 공지가 없습니다." (오류 아님) |
| **API 오류** | 요청 실패 | 오류 박스 — "데이터를 불러오는 중 오류가 발생했습니다." + **다시 시도** |
| **비정상 응답** | `data` 가 배열 아님 | 오류 박스 — "공지 목록 응답이 예상한 형식과 달라 표시할 수 없습니다." + **다시 시도** |

**정상 빈 목록과 API 실패·계약 위반이 화면에서 서로 다르게 보인다.** 기존에는 구분 자체가 불가능했다
(성공하면 크래시, 실패하면 단일 오류 문구).

---

## 7. null/undefined 및 비정상 응답 처리

| 입력 | 처리 |
|---|---|
| `data` 가 배열이 아님 / 키 없음 / 본문 `null` | `NoticeContractError` → **error state** |
| `totalPages` 누락 | `total`/`limit` 로 보정, 불가 시 1 |
| `totalPages` 가 0·음수 | 1 (페이지네이션 숨김) |
| **중첩형 `pagination` 이 오는 경우** | 크래시 없이 1 로 처리 (계약 변경 대비) |
| `summary`·`expiresAt`·`createdAt` null/undefined | `—` 표시 |
| 파싱 불가 날짜 | `—` (Invalid Date 노출 안 함) |
| `status` 미정의 값 | `draft` 배지로 폴백 (기존 유지) |

---

## 8. typecheck · test · build 결과

| 항목 | 명령 | 결과 |
|---|---|---|
| typecheck | `npx tsc --noEmit -p tsconfig.json` | **0 error** |
| 신규 회귀 테스트 | `npx vitest run src/tests/hub-notice-contract.test.ts` | **17 pass / 0 fail** |
| **전체 스위트 회귀** | `npx vitest run` | **141 pass / 0 fail** (7 파일) |
| build | `npm run build` | **성공** |
| 전체 monorepo build | — | 미실행 (앱 단독 변경) |

기존 vitest 인프라가 있어 **새 프레임워크를 만들지 않고 기존 규약(`src/tests/*.test.ts`)에 회귀 테스트를 추가**했다.

`apps/admin-dashboard/src/tests/hub-notice-contract.test.ts` — **17 케이스**

| 그룹 | 케이스 |
|---|---|
| 응답 계약 | 실제 평면형 응답 / 정상 빈 목록 / `data` 비배열 / `data` 키 없음 / 본문 `null` / 오류 분류 |
| `totalPages` | 평면 우선 / total·limit 보정 / **중첩형이 와도 크래시 없음** / 산출 불가 |
| **컬럼 render 규약** | **전 컬럼 예외 없음 / `expiresAt=null` 크래시 없음 / 전 필드 null 안전 / 셀 값이 아닌 row 사용** |
| `formatDate` | null·undefined·빈 문자열 / 파싱 불가 / 정상 |

컬럼 테스트는 `col.render(value, row, index)` 라는 **BaseTable 의 실제 호출 규약 그대로** 호출한다.
따라서 잘못된 시그니처로 되돌리면 **테스트가 실패한다** — 2차 크래시의 재발을 막는다.

> **테스트 1건 조정**: API 오류 전파를 rejected-promise 로 검증하려 했으나 harness 가 이를
> unhandled 로 처리해 실패했다. `fetchNotices` 에는 `try/catch` 가 없어 axios 오류가 가공 없이
> 전파되는 것이 코드상 자명하므로, 해당 케이스는 **오류 분류(계약 위반 ≠ API 오류) 를 직접
> 단언하는 형태**로 바꿨다. 원 rejection 경로는 §10 프로덕션 관측으로 갈음한다.

---

## 9. 직접 진입 · 새로고침 · 새 탭 검증

배포(`04d9385c1`) 후 프로덕션 read-only 실측.

| 시나리오 | URL 유지 | 크래시 | 목록 렌더 | 판정 |
|---|:--:|:--:|:--:|:--:|
| **직접 URL 입력** | ✅ | **없음** | ✅ | **PASS** |
| **새로고침** | ✅ | **없음** | ✅ | **PASS** |
| **다른 route 이동 후 재진입** | ✅ | **없음** | ✅ | **PASS** |
| **새 탭 딥링크** | ✅ | **없음** | ✅ | **PASS** |

렌더된 실제 내용:

```
HUB 공지 관리 · KPA Society HUB에 게시할 공지를 등록하고 관리합니다.
[공지 등록] [새로고침]
제목 | 상태 | 종료일 | 등록일 | 관리
공지사항 테스트 / 화면에 나오는지 확인 | 게시 중 | — | 2026. 4. 26. | [수정] [비공개]
```

> **제목·요약이 정상 표시**된다. 2차 수정 전에는 컬럼 규약 오류로 제목이 빈 칸이었다.
> 종료일 `null` 은 크래시 없이 `—` 로 표시된다.

---

## 10. 조회 API · 콘솔 검증

| 항목 | 결과 |
|---|---|
| `GET /kpa/news/admin/list` | **200** (4개 시나리오 전부) |
| 콘솔 오류 — 직접 진입 | **0** |
| 콘솔 오류 — 새로고침 | **0** |
| 콘솔 오류 — 새 탭 | **0** |
| 콘솔 오류 — 이동 후 재진입 | **2** (아래 참조) |
| `TypeError` 재발 | **없음** |

> 재진입 시나리오의 콘솔 오류 2건은 **경유지 `/admin/ops/metrics` 의 것**이다
> (`403` + `Failed to fetch ops metrics`). `hub-notices` 화면과 무관한 **기존 결함**이며
> 이번 변경 범위 밖이다. `hub-notices` 도착 후 발생한 오류는 0건이다.

---

## 11. 관련 관리자 화면 회귀 검증

read-only 조회만 수행.

| 화면 | route | 크래시 | 콘솔 | 판정 |
|---|---|:--:|:--:|:--:|
| HUB 콘텐츠 | `/operator/hub-contents` | 없음 | **0** | **PASS** |
| 콘텐츠 승인 | `/operator/approvals` | 없음 | **0** | **PASS** |
| 지부/분회 관리자 센터 | `/admin/yaksa` | 없음 | **0** | **PASS** |

`HubContentsPage` 는 **코드를 변경하지 않았고**(자기 endpoint 기준 정상) 회귀도 없다.
공지 상세·편집은 목록 화면 내 모달이며 **열지 않았다**(쓰기 회피).

---

## 12. 백엔드 · route · 메뉴 · 권한 · DB 변경 여부

| 항목 | 변경 |
|---|---:|
| 백엔드 API 계약 | **0** |
| route 경로 | **0** |
| 관리자 메뉴 | **0** |
| 권한·역할 정책 | **0** |
| 인증 처리 | **0** |
| DB schema·migration | **0** |
| 공지 데이터 | **0** |
| HubContentsPage·승인 화면 | **0** |
| Yaksa 메뉴·포인트·회원 분류 | **0** |
| 다른 앱 | **0** |

---

## 13. 운영 쓰기 및 데이터 변경

| 항목 | 값 |
|---|---:|
| 공지 생성·수정·삭제·게시·보관 실행 | **0** |
| 쓰기 endpoint 실행 | **0** |
| 운영 데이터 변경 | **0** |
| 민감정보 기록 | **0** (자격증명 env 주입) |

검증은 전부 조회 경로로 수행했다. 저장 검증이 필요한 지점은 없었다.

---

## 14. 배포 workflow 와 배포 commit

| 배포 | commit | 내용 | workflow 결과 |
|---|---|---|:--:|
| 1차 | **`7a4073cad`** | `totalPages` 봉투 불일치 + 상태 구분 + 테스트 | **success** |
| 2차 | **`04d9385c1`** | 컬럼 render 규약 교정 + 규약 테스트 | **success** |

| 항목 | 값 |
|---|---|
| workflow | `Deploy Admin Dashboard (Cloud Run)` |
| 백엔드 배포 | **불필요** (백엔드 변경 0) |
| 다른 서비스 배포 | **불필요** (다른 앱 변경 0) |

> 1차 배포 후 검증에서 2차 크래시가 드러나 **한 번 더 수정·배포**했다.
> 1차만으로 종료했다면 "고쳤다" 고 보고했겠지만 화면은 여전히 열리지 않았을 것이다.
> **배포 후 실측이 이를 잡아냈다.**

---

## 15. 프로덕션 검증 결과

| 항목 | 수정 전 | 수정 후 |
|---|---|---|
| 화면 | **ErrorBoundary 오류 화면** | **정상 목록** |
| `TypeError` | `…reading 'totalPages'` → (1차 후) `…reading 'expiresAt'` | **없음** |
| 목록 표시 | 없음 | 공지 1건 정상 |
| 제목 표시 | (렌더 도달 못 함) | **정상** |
| 종료일 `null` | (렌더 도달 못 함) | `—` |
| 조회 API | 200 | 200 |
| 콘솔 오류 | 3~6건 | **0건** |
| 직접 진입·새로고침·새 탭 | 전부 크래시 | **전부 정상** |

---

## 16. 미검증 항목

- **공지 등록·수정·비공개(archive) 동작** — 운영 쓰기이므로 **의도적으로 실행하지 않았다**.
  해당 경로의 코드는 변경하지 않았다(모달·mutation 무변경). 다만 이 화면이 그동안 열리지 않았으므로
  **쓰기 기능은 실사용 검증 이력이 없다** → §후속 참조.
- **데이터 2페이지 이상** 상황의 페이지네이션 — 현재 공지가 1건뿐이라 `totalPages > 1` 분기는
  프로덕션에서 미검증이다(단위 테스트로는 커버).
- **계약 위반 error state 의 실제 화면** — 서버가 정상 응답하므로 프로덕션에서 재현 불가.
  단위 테스트로만 검증했다.
- **operator 역할 계정** 동작 — super_admin 1계정으로만 확인.

### 후속 필요

| 항목 | 내용 |
|---|---|
| `O4OColumn.render` 의 `value: any` | 같은 유형의 실수를 타입이 잡지 못한다. 제네릭 강화는 **공용 패키지 변경**이라 이번 범위 밖 — 별도 WO 권장 |
| `/admin/ops/metrics` 403 | 기존 결함, 이번 범위 밖 |
| 공지 쓰기 경로 실사용 검증 | 운영 판단 필요 |

---

## 17. 최종 git status

```
내 산출물 3개 파일 — 전부 commit·push 완료
  apps/admin-dashboard/src/pages/kpa/HubNoticeListPage.tsx
  apps/admin-dashboard/src/tests/hub-notice-contract.test.ts   (신규)
  docs/checks/WO-O4O-ADMIN-HUB-NOTICES-CRASH-FIX-V1-CHECK.md   (신규)
HEAD...origin/main = 0 0
```

---

## 18. pnpm-lock.yaml 및 다른 세션 작업물

| 항목 | 상태 |
|---|---|
| `pnpm-lock.yaml` | **미변경·미포함** |
| HFF·OTC 작업물 | **미접촉** (작업 트리에 남아 있으나 stage·수정·삭제 없음) |
| 기존 staged·미추적 파일 | **미접촉** |
| commit 방식 | 전부 `--only -- <pathspec>` 로 범위 제한 |

---

## 19. 최종 판정

| 항목 | 결과 |
|---|:--:|
| 크래시 해소 | ✅ **해결** (2건 모두) |
| 직접 진입·새로고침·새 탭 | ✅ **정상** |
| 정상 빈 목록 / API 오류 / 비정상 응답 구분 | ✅ **분리됨** |
| 관련 화면 회귀 | ✅ **없음** |
| 백엔드·route·메뉴·권한·DB 변경 | ✅ **0** |
| 운영 데이터 변경·쓰기 실행 | ✅ **0** |
