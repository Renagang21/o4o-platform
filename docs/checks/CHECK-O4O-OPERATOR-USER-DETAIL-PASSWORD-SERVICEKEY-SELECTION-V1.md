# CHECK-O4O-OPERATOR-USER-DETAIL-PASSWORD-SERVICEKEY-SELECTION-V1

> WO: `WO-O4O-OPERATOR-USER-DETAIL-PASSWORD-SERVICEKEY-SELECTION-V1`
> 대상: 운영자 **회원 상세** 화면의 비밀번호 변경 모달에 대상 서비스(`serviceKey`) 선택 추가
> 기준: `origin/main` `b2f4f65ee`
> **판정: PASS**

---

## 0. 결론 요약

| 항목 | 결과 |
|---|---|
| `serviceKey` 미전송 결함 해소 | ✅ payload = `{ password, serviceKey }` |
| 후보 산출 = 운영자 관리 범위 ∩ 대상자 Membership | ✅ 상세 API 응답 그대로 사용 (신규 API 0) |
| 후보 0 / 1 / 복수 UI | ✅ 목록 모달과 동일 규칙 |
| 표시명 SSOT `getServiceDisplayName` | ✅ (모달 신규 코드) |
| 4개 서비스 typecheck | ✅ PASS |
| 4개 서비스 build | ✅ PASS |
| 신규 회귀 테스트 | ✅ **4/4 PASS** |
| 백엔드 · API 계약 · DB · role · membership 정책 | **무변경** |
| `package.json` · lockfile | **무변경** |

---

## 1. 문제 확정

`packages/ui/src/operator-user-detail/UserDetailPage.tsx` 의 `PasswordModal` 이

```ts
await apiAdapter.put(`/operator/members/${userId}`, { password });   // serviceKey 없음
```

로 요청했다. Identity V2 에서 비밀번호는 서비스별(`service_credentials`)로 독립하므로
백엔드 `MembershipConsoleController.changeMemberServicePassword` 는 대상 서비스가 모호하면
**400 `SERVICE_KEY_REQUIRED`** 로 거절한다. 자동 확정되는 경우(비-platform 운영자 + 후보 1개)만
우연히 동작했고, 다음 두 경우 화면에서 비밀번호 변경이 실패했다.

- **platform 관리자** — 후보 수와 무관하게 항상 명시적 선택 필요
- **후보가 2개 이상인 운영자** — 대상 회원이 관리 범위 안 2개 이상 서비스에 가입

영향 화면: GlycoPharm · K-Cosmetics · KPA-Society · Neture 4개 서비스의 회원 상세
(`services/web-*/src/pages/operator/UserDetailPage.tsx` 가 이 공통 컴포넌트를 감싼다).

### 1-1. 선행 CHECK 의 누락

`CHECK-O4O-SERVICE-PASSWORD-CHANGE-UI-SCOPE-AND-INTEGRATION-V2` §3 호출부 표는 공통 UI 로
`packages/operator-core-ui/.../OperatorMembersConsolePage.tsx` **한 곳만** 열거했다.
`packages/ui/src/operator-user-detail/**` 는 **두 번째 공통 UI** 인데 표에 없어 함께 갱신되지 않았다.
기록물은 소급 수정하지 않으므로(CLAUDE.md §16-1) 여기에 연결 기록만 남긴다.

---

## 2. 후보 산출의 안전성 — 관리 범위 밖 서비스 노출 없음

WO 중지 조건 "memberships 가 운영자 관리 범위로 제한되지 않으면 중지" 를 먼저 확인했다.

`apps/api-server/src/controllers/operator/MembershipConsoleController.ts` 회원 **상세** 응답:

```sql
-- scope.isPlatformAdmin
SELECT ... FROM service_memberships WHERE user_id = $1
-- 그 외
SELECT ... FROM service_memberships WHERE user_id = $1 AND service_key = ANY($2)  -- scope.serviceKeys
```

목록 API 와 **같은 필터**이며, 비밀번호 변경 백엔드가 쓰는 후보 정의
(`platform ? 대상 membership 전체 : 대상 membership ∩ scope.serviceKeys`)와도 일치한다.
따라서 상세 응답의 `memberships` 를 그대로 후보로 써도 관리 범위 밖 서비스가 노출되지 않는다.
**중지 조건 미해당** — 신규 API 를 추가하지 않았다.

platform 관리자도 상세 응답이 전체 membership 을 주므로 후보를 정확히 확정할 수 있다(중지 조건 4 미해당).

---

## 3. 변경 내용

### 3-1. `packages/ui/src/operator-user-detail/UserDetailPage.tsx`

| 변경 | 내용 |
|---|---|
| props | `PasswordModal` 에 `memberships: MembershipData[]` 추가 · 호출부에서 페이지 state 주입 |
| 후보 | `useMemo` 로 `memberships` → `serviceKey` 중복 제거 |
| 초기값 | 후보 1개면 자동 확정, 아니면 `''` |
| UI | 후보 0 = 경고 박스 / 1 = 대상 서비스 표시 박스 / 복수 = `<select>` (기본 "서비스를 선택하세요") |
| 제출 | `!serviceKey` 면 안내 후 중단 · 버튼 `disabled={loading \|\| !serviceKey}` |
| payload | `{ password, serviceKey }` |
| 성공 안내 | `` `${getServiceDisplayName(serviceKey)} 비밀번호가 변경되었습니다.` `` |

문구·분기 규칙은 `OperatorMembersConsolePage` 의 `PasswordModal` 을 그대로 따랐다.

### 3-2. 새 공용 계층을 만들지 않은 이유

WO 지시대로 **동작 일치만 우선**했다. 두 모달은 같은 후보 규칙을 쓰지만
`packages/ui` 와 `packages/operator-core-ui` 는 서로 의존하지 않고, 클라이언트 계약도
`apiAdapter.put(path, body)` vs `client.updatePassword(id, pw, key)` 로 다르다.
공용 helper 를 새로 만들려면 패키지 의존 방향을 신설해야 하므로 이번 범위에서 제외한다(§7 잔여 1).

### 3-3. 의도적으로 바꾸지 않은 것

| 항목 | 사유 |
|---|---|
| 비밀번호 최소 길이 6자 (목록 모달은 8자) | 비밀번호 **정책** 변경은 WO 범위 밖. 현행 유지하고 §7 잔여 2 로 분리 |
| 성공 안내를 `alert` 로 처리 | `packages/ui` 에 toast 의존성이 없다. 같은 파일의 다른 액션도 `alert`/`confirm` 을 쓴다. 의존성 추가 = 중지 조건 |
| 파일 상단 `SERVICE_LABELS` 하드코딩 맵 | 가입 서비스 **표** 에서만 쓰이는 기존 코드. 이번 모달 신규 코드만 `getServiceDisplayName` 사용. 표까지 교체하는 것은 범위 밖(§7 잔여 3) |

`@o4o/types` 는 `packages/ui` 의 기존 dependency 이므로 `package.json` 변경이 없다.

---

## 4. 회귀 테스트 (신규)

`packages/ui/src/operator-user-detail/__tests__/UserDetailPasswordModal.test.tsx` — **4/4 PASS**

```
npx vitest run --config packages/ui/vitest.config.mjs
```

| 케이스 | 검증 | 결과 |
|---|---|---|
| 후보 0개 | 안내 문구 노출 · `<select>` 없음 · 제출 버튼 disabled · `put` 호출 0 | ✅ |
| 후보 1개 | "대상 서비스" 표시 · `<select>` 없음 · 제출 활성 · payload `{ password, serviceKey:'glycopharm' }` | ✅ |
| 후보 복수 | 선택 전 제출 disabled + `put` 0 → 선택 후 payload `{ password, serviceKey:'k-cosmetics' }` | ✅ |
| 중복 serviceKey | 같은 키가 후보에 1번만 등장 | ✅ |

`packages/ui/vitest.config.mjs` 는 `packages/auth-react/vitest.config.mjs` 와 동일한 방식으로
**루트에 이미 설치된** vitest / jsdom / @testing-library 를 쓴다 — 의존성 추가 0.
`tsconfig.json` 의 `exclude` 가 `**/*.test.tsx` 를 이미 제외하므로 `dist` 산출물에 영향이 없다.

> CI 파이프라인 연결은 하지 않았다(CI 변경 = CLAUDE.md 중지 조건). §7 잔여 4.

---

## 5. 검증

```
packages/ui        npx tsc --noEmit         → exit 0
packages/ui        npx tsc --build          → exit 0
services 4개       npx tsc --noEmit         → PASS (glycopharm · k-cosmetics · kpa-society · neture)
services 4개       npx vite build           → PASS (4/4)
tests              vitest (packages/ui)     → 1 file / 4 tests PASS
DB write / migration                        → 0
package.json / lockfile                     → 무변경
apps/api-server                             → 무변경
```

**실브라우저 검증은 하지 않았다.** 다중 후보 상황을 재현하려면 관리 범위가 2개 이상인
운영자 계정이 필요한데 `docs/local/TEST-ACCOUNTS.local.md` 기준으로 확보하지 못했다.
대신 컴포넌트를 실제 DOM(jsdom)에 렌더해 클릭·선택·제출까지 수행하고 전송 payload 를 단언했다.

---

## 6. 금지사항 준수

- ❌ 새 API 추가 — 하지 않음(상세 응답의 `memberships` 재사용)
- ❌ 백엔드 · API 계약 변경 — `apps/api-server` diff 0
- ❌ role · membership · 권한 정책 변경 — 없음
- ❌ 관리 범위 밖 서비스 노출 — 상세 API 가 이미 scope 필터(§2)
- ❌ 후보 무시하고 조용히 첫 서비스 선택 — 하지 않음(0/1/복수 분기 명시)
- ❌ package · lockfile · CI 변경 — 없음

---

## 7. 잔여 (별도 WO)

| # | 항목 |
|---|---|
| 1 | 두 PasswordModal 의 후보 산출 규칙 중복 — 공용 helper 추출 여부 판단(패키지 의존 방향 신설 필요) |
| 2 | 비밀번호 최소 길이 불일치(상세 6자 / 목록 8자) — 정책 SSOT 정리 |
| 3 | `UserDetailPage` 가입 서비스 표의 `SERVICE_LABELS` 하드코딩 → `getServiceDisplayName` 정렬 |
| 4 | `packages/ui` 테스트의 CI 연결 · `.github/workflows/e2e-auth-runtime.yml` path filter 에 `packages/auth-react/src/**` 추가 |
| 5 | `apps/admin-dashboard/src/pages/account/AccountSettings.tsx:123` 동작 없는 "비밀번호 변경" 버튼 정리 |

---

## 8. 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 5건

발견 1건 = `CHECK-O4O-SERVICE-PASSWORD-CHANGE-UI-SCOPE-AND-INTEGRATION-V2` §3 호출부 표의
`packages/ui/src/operator-user-detail/**` 누락(§1-1). 기록물(`docs/checks/`)은 §16-1 상
정비 대상이 아니므로 소급 수정하지 않고 본 문서에 연결 기록만 남긴다.
