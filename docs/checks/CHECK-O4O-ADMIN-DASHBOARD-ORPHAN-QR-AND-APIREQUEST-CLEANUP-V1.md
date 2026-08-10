# CHECK-O4O-ADMIN-DASHBOARD-ORPHAN-QR-AND-APIREQUEST-CLEANUP-V1

> WO: `WO-O4O-ADMIN-DASHBOARD-ORPHAN-QR-AND-APIREQUEST-CLEANUP-V1`
> 선행 IR: [IR-O4O-ADMIN-DASHBOARD-API-PATH-CONVENTION-INVENTORY-V1](../investigations/IR-O4O-ADMIN-DASHBOARD-API-PATH-CONVENTION-INVENTORY-V1.md) (CLOSED)

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 착수 시점 main | `28ac3b690dcf774732d386b49ea099c4c26de0ec` (clean) |
| 결과 commit | `2a4552a02d8798e896b886fcea45073e30f0ae87` |
| 배포 리비전 | `o4o-admin-dashboard-01100-f5f` |
| 검증 일자 | 2026-08-10 |

---

## 2. 삭제 파일

| 파일 | 라인 | 비고 |
|---|---:|---|
| `apps/admin-dashboard/src/api/qr.api.ts` | 155 | `/pharmacy/qr/*` 6개 호출 보유 (마운트된 적 없는 경로) |
| `apps/admin-dashboard/src/pages/store/qr/QrCreatePage.tsx` | 882 | |
| `apps/admin-dashboard/src/pages/store/qr/QrListPage.tsx` | 377 | |
| **합계** | **1,414** | 3 files changed, 1414 deletions(-) |

### 2-1. ⚠️ `apiRequest.ts` — 삭제하지 않음 (HOLD)

WO §0 의 HOLD 조건 **"`apiRequest.ts` 가 live import 되고 있음"** 에 해당하여 제외했다.

**IR 판정 정정.** 선행 IR 은 `api/apiRequest.ts` 를 "호출부 0건 dead helper" 로 기록했으나 **오류였다.**
정적 스캐너가 `apiRequest<T>('...')` 형태의 **제네릭 타입 인자**를 처리하지 못해
`apiRequest\s*\(` 정규식이 매칭에 실패했고, 호출 7건이 누락됐다.

실제 live import 체인:

```text
/supplierops/*  (routes/apps.routes.tsx:147)
  └ pages/supplierops/pages/ProductCreatePage.tsx:15
      └ components/vendor/SupplierProductForm.tsx:18
          └ api/vendor/products.ts:5   →  apiRequest()  ×7
              →  fetch('/api/vendor/products…')  (admin 오리진, /api 프록시 없음)
```

`components/vendor/ProductApprovalManager.tsx` 도 같은 모듈을 import 하나, 이 컴포넌트 자체는 소비처가 없다.

→ 이 7건은 orphan 이 아니라 **IR §5-C `same-origin-no-proxy` 클래스의 live 결함**이다
(응답이 `index.html` HTTP 200 이라 `response.ok === true` 로 통과한 뒤 `response.json()` 에서 실패).
정리 대상이 아니라 **수정 대상**이므로 별도 WO 로 분리한다 (§9 후속 후보).

---

## 3. 삭제 전 참조 확인 결과

| 확인 항목 | 결과 |
|---|---|
| `/store/qr`, `/store/qr/create` 가 `StoreQrGuidePage` 로만 연결 | ✅ `routes/lms-marketing.routes.tsx:163,170` — 두 route 모두 `StoreQrGuidePage` |
| `QrCreatePage` / `QrListPage` lazy import 잔존 | ✅ 0건 (route 참조 없음) |
| `qr.api.ts` import 잔존 | ✅ 삭제 대상 2파일 외 0건 |
| barrel export (`api/index.ts`) 경유 노출 | ✅ 파일 자체가 없음 |
| 동적 import · 문자열 route 참조 | ✅ 0건 |
| 관련 테스트 파일 | ✅ 0건 |

### 삭제 후 잔여 참조 (전부 이력 설명 주석 — 실행 코드 0건)

```text
pages/kpa/StoreContentWorkspacePage.tsx:134   주석
pages/store/qr/StoreQrGuidePage.tsx:9         주석
routes/lms-marketing.routes.tsx:33            주석
routes/lms-marketing.routes.tsx:39            주석
```

주석은 교체 이력을 설명하는 근거이므로 유지했다.

번들 산출물 확인: `dist/assets/` 에 `StoreQrGuidePage-*.js` 존재 · `QrCreatePage` / `QrListPage` 청크 부재.

---

## 4. 유지한 route / 화면

| 대상 | 상태 |
|---|---|
| `apps/admin-dashboard/src/pages/store/qr/StoreQrGuidePage.tsx` | ✅ 유지 |
| `<Route path="/store/qr">` | ✅ 유지 → `StoreQrGuidePage` |
| `<Route path="/store/qr/create">` | ✅ 유지 → `StoreQrGuidePage` |
| `StoreContentWorkspacePage.tsx:139` 의 `navigate('/store/qr')` | ✅ 유지 (안내 화면으로 진입) |

---

## 5. 금지사항 준수 확인

| 금지 항목 | 상태 |
|---|---|
| StoreQrGuidePage 삭제 | ❌ 하지 않음 |
| `/store/qr`, `/store/qr/create` route 삭제 | ❌ 하지 않음 |
| QR 안내 화면 정책 변경 | ❌ 하지 않음 |
| QR 백엔드 route 수정 | ❌ 하지 않음 (api-server 무변경) |
| service segment 수정 | ❌ 하지 않음 |
| signage / ai / organizations / notifications 수정 | ❌ 하지 않음 |
| `/api/v1` 밖 mount 정책 수정 | ❌ 하지 않음 |
| content / cms 이관 수정 | ❌ 하지 않음 |
| fetch / apiClient / authClient canonical 화 | ❌ 하지 않음 |
| DB write · migration | ❌ 하지 않음 (DB 접속 없음) |
| 무관한 dirty 파일 / lockfile 스테이징 | ❌ 하지 않음 — commit 은 `git commit -- <3 pathspec>` 으로 범위 고정 |

커밋 diff: **3 files, deletions only.** 추가·수정 라인 0.

---

## 6. typecheck / build 결과

| 명령 | 결과 |
|---|---|
| `pnpm --filter @o4o/admin-dashboard run type-check` (`tsc --noEmit`) | ✅ PASS (출력 0) |
| `pnpm --filter @o4o/admin-dashboard run build:prod` (`vite build --mode production`) | ✅ PASS (`✓ built in 1m 23s`) |

---

## 7. 배포 결과

| 항목 | 값 |
|---|---|
| Workflow | `Deploy Admin Dashboard (Cloud Run)` run `31386860985` |
| Trigger | push to main (`apps/admin-dashboard/**` path filter 적중) |
| 결론 | ✅ `success / completed` |
| 리비전 | `o4o-admin-dashboard-01100-f5f` |
| API 서버 | **재배포 없음** — `o4o-core-api-03268-cq2` 유지 (마지막 배포 07:00, 본 변경 이전) |

---

## 8. 실브라우저 smoke 결과

**환경**: Playwright(chromium, headless) · `https://admin.neture.co.kr` · 배포 리비전 `01100-f5f`
**계정**: `renariver21@gmail.com` (`platform:super_admin`) — `docs/local/TEST-ACCOUNTS.local.md` §4-3
**로그인**: `POST /api/v1/auth/login` → **200**, `/home` 착지, 콘솔 에러 0 (토큰 주입 우회 아님, 정식 폼 로그인)

| 대상 | 최종 URL | 화면 | 콘솔 에러 | 비-2xx API | `/pharmacy/qr/*` |
|---|---|---|:---:|:---:|:---:|
| `/store/qr` | `/store/qr` | **매장 QR 안내** ("이 화면에서는 QR을 직접 생성하지 않습니다") | 0 | 0 | **0건** |
| `/store/qr/create` | `/store/qr/create` | **매장 QR 안내** (동일) | 0 | 0 | **0건** |
| `/kpa/content-workspace` | 동일 | 매장 콘텐츠 작업 공간 | 1 | 1 (403) | 0건 |
| `/admin/cms/contents` | 동일 | CMS Contents | 0 | 0 | 0건 |
| `/content-resource/media-assets` | 동일 | Content Resource Media Assets | 0 | 0 | 0건 |
| `/forum/categories` | 동일 | 포럼 카테고리 (목록 렌더) | 0 | 0 | 0건 |
| `/posts` | **`/admin/cms/contents`** | CMS Contents — **legacy redirect 유지** ✅ | 0 | 0 | 0건 |

**전체 세션 `/api/v1/pharmacy/qr/*` 호출: 0건** (WO §6.2 기대 충족)

### 8-1. `/kpa/content-workspace` 403 — 이번 변경과 무관

```text
GET /api/v1/kpa/store/assets?page=1&limit=50   →  403
```

- smoke 계정 `renariver21` 의 membership 은 **`platform` 단일**이다 (`docs/local/TEST-ACCOUNTS.local.md` §4-3).
  KPA scope 자원에 403 이 나는 것은 **계정 권한 범위**에 따른 결과다.
- 본 변경은 **어떤 route 도 참조하지 않던 프런트 파일 3개의 삭제뿐**이며, 공용 모듈·guard·API 계약을 건드리지 않았다.
- 403 을 반환한 api-server 는 **재배포되지 않았다** (`o4o-core-api-03268-cq2`, 07:00 배포 — 본 변경 이전).

→ 회귀가 아니라 계정 scope 산물로 판단한다.
**단, 이전 리비전과의 BEFORE/AFTER 대조는 수행하지 않았다** (미검증 항목으로 명시).

---

## 9. 후속 후보

| 후보 | 근거 |
|---|---|
| **WO-O4O-ADMIN-VENDOR-APIREQUEST-SAME-ORIGIN-FIX-V1** (신규) | §2-1 — `apiRequest` 7건이 admin 오리진으로 나가 `index.html` 200 을 받는다. `/supplierops/*` 에서 live |
| `IR-O4O-ADMIN-DASHBOARD-NONV1-MOUNT-POLICY-V1` | IR REVIEW-1 (`/api/v1` 밖 mount 9종) |
| `WO-O4O-ADMIN-SIGNAGE-API-PATH-ALIGN-V1` | IR §5-A / §6 — 위 정책 결정 선행 |
| `WO-O4O-ADMIN-AI-ORGANIZATIONS-NOTIFICATIONS-PATH-ALIGN-V1` | IR §5-A |
| `WO-O4O-ADMIN-API-CLIENT-CANONICALIZATION-V1` | IR REVIEW-3 |

> **IR 스캐너 보정 필요**: 제네릭 타입 인자를 가진 호출(`fn<T>(...)`)이 누락된다.
> IR 의 "동적 68건 / UNRESOLVED" 외에 **이 유형의 미탐이 추가로 존재할 수 있다.**
> 위 후속 WO 착수 전 스캐너를 보정해 재집계할 것을 권고한다.

---

## 10. commit / push

| 항목 | 값 |
|---|---|
| commit | `2a4552a02` (코드) |
| commit | *(본 CHECK 문서 — 아래 참조)* |
| push | ✅ `28ac3b690..2a4552a02  main -> main` |
| 완료 조건 | 이번 WO 범위 미커밋 변경 0건 · `HEAD == origin/main` |

---

*작성: 2026-08-10 · 기준 commit `2a4552a02` · 리비전 `o4o-admin-dashboard-01100-f5f`*
