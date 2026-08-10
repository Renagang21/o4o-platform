# CHECK-O4O-ADMIN-APIREQUEST-ORPHAN-CLEANUP-V1

> WO: `WO-O4O-ADMIN-APIREQUEST-ORPHAN-CLEANUP-V1`
> 선행: [CHECK-O4O-SUPPLIEROPS-PRODUCT-CREATE-LEGACY-UI-GUIDE-V1](CHECK-O4O-SUPPLIEROPS-PRODUCT-CREATE-LEGACY-UI-GUIDE-V1.md)
> **결과: PASS**

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 착수 시점 main | `4f483ede275c89cc4ac682715167bb0fd7f60b66` |
| 결과 commit | `23c04ef56772e6bbb12796afa99e756870918810` |
| 배포 리비전 | `o4o-admin-dashboard-01103-r28` |
| API 서버 | 재배포 없음 |
| 검증 일자 | 2026-08-10 |

---

## 2. clean worktree 확인

착수 시점 (§2 게이트):

```text
$ git status --porcelain
(출력 없음)
$ git rev-parse HEAD
4f483ede275c89cc4ac682715167bb0fd7f60b66
$ git status -sb
## main...origin/main          ← HEAD == origin/main
```

**✅ clean 확인 후 착수.**

### 2-1. 작업 중 다른 세션이 새 변경을 시작함 — 격리 확인

typecheck·build 진행 중 병렬 세션이 아래 변경을 시작했다 (내 착수 시점에는 없었다).

```text
 M packages/account-ui/package.json
 M services/web-glycopharm/src/components/GlycoGlobalHeader.tsx
 M services/web-k-cosmetics/src/components/KCosGlobalHeader.tsx
 M services/web-kpa-society/src/components/KpaGlobalHeader.tsx
 M services/web-kpa-society/src/components/KpaUserMenu.tsx
 M services/web-kpa-society/src/components/store/StoreUserDropdown.tsx
 M services/web-neture/src/components/NetureGlobalHeader.tsx
 M services/web-neture/src/components/NetureUserMenu.tsx
?? packages/account-ui/__tests__/
?? packages/account-ui/jest.config.cjs
```

직전 WO 의 지적(다른 세션 커밋을 함께 push 금지)을 반영해 다음을 강제했다.

```text
1. staged 집합 = 내 파일 1개뿐임을 commit 전 확인
2. git commit -- <pathspec> 로 커밋 범위 고정
3. push 직전 git log origin/main..HEAD 로 push 대상이 내 커밋 1개뿐임을 확인
4. push 결과 4f483ede2..23c04ef56 — 내 커밋만 반영
```

그 세션의 파일은 **읽지도 stage 하지도 커밋하지도 않았다.**

---

## 3. 삭제 전 참조 확인

| 확인 | 결과 |
|---|---|
| `apiRequest` import (`from '…/apiRequest'`) | **0건** |
| `apiRequest<T>(…)` 제네릭 호출 | **0건** |
| `apiRequest(…)` 일반 호출 | **0건** |
| `ApiRequestOptions` 타입 참조 | **0건** |
| `vendor/products` 실행 코드 | **0건** |

삭제 전 `apiRequest` 문자열 hit 3건의 정체:

```text
api/apiRequest.ts:12                              정의 자신 (삭제 대상)
pages/supplierops/pages/SupplierOpsProductGuidePage.tsx:14   이력 설명 주석
pages/supplierops/pages/SupplierOpsProductGuidePage.tsx:15   이력 설명 주석
```

주석 2줄은 이 helper 가 왜 제거됐는지를 설명하는 근거이므로 유지했다.

> 참조 검색은 직전 WO 에서 드러난 스캐너 오판(제네릭 인자 미탐)을 보정한
> `apiRequest\s*(<[^>]*>)?\s*\(` 패턴으로 수행했다.

---

## 4. 삭제 파일

```text
apps/admin-dashboard/src/api/apiRequest.ts      (56 lines)
```

commit diff: **1 file changed, 56 deletions(-)** — 추가·수정 0.
다른 API client 는 손대지 않았다.

---

## 5. 금지사항 준수 확인

| 금지 항목 | 상태 |
|---|---|
| authClient 수정 | ❌ 없음 |
| apiClient 수정 | ❌ 없음 |
| unifiedApi 수정 | ❌ 없음 |
| fetch 호출 전수 수정 | ❌ 없음 — 잔여 same-origin `fetch('/api…')` **36건은 그대로 두었다** (IR §5-C 소관, 이번 범위 밖) |
| supplierops 추가 정리 | ❌ 없음 |
| partnerops 수정 | ❌ 없음 |
| non-v1 mount 정책 수정 | ❌ 없음 |
| backend 변경 | ❌ 없음 |
| DB write · migration | ❌ 없음 (DB 접속 없음) |
| 무관한 dirty 파일 / lockfile 스테이징 | ❌ 없음 (§2-1) |
| 다른 세션 커밋 함께 push | ❌ 없음 (§2-1, push 전 검증) |

---

## 6. typecheck / build 결과

| 명령 | 결과 |
|---|---|
| `pnpm run type-check` (`tsc --noEmit`) | ✅ PASS (출력 0) |
| `pnpm run build:prod` | ✅ PASS (`✓ built in 1m 19s`) |

---

## 7. 배포 결과

| 항목 | 값 |
|---|---|
| Workflow | `Deploy Admin Dashboard (Cloud Run)` run `31392642442` |
| 결론 | ✅ `success` |
| 리비전 | `o4o-admin-dashboard-01103-r28` |
| API 서버 | 재배포 없음 |

---

## 8. 실브라우저 smoke 결과

**환경**: Playwright(chromium, headless) · `https://admin.neture.co.kr` · 리비전 `01103-r28`
**계정**: `renariver21@gmail.com` (`platform:super_admin`) — 정식 폼 로그인 **200**, `/home` 착지, 콘솔 0
**좌측 메뉴**: 전 경로에서 정상 렌더 (Overview / Core / O4O 상품 DB / Content / CMS / AppStore / Forum / Yaksa(KPA) / Digital Signage / Ops Metrics …)

| 대상 | 최종 URL | 화면 | 콘솔 | 비-2xx | vendor/products | admin오리진 `/api` | HTML 응답 `/api` |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| `/supplierops/products` | `/error/app-disabled?app=supplierops` | 앱 비활성 안내 | 0 | 0 | 0 | 0 | 0 |
| `/supplierops/products/new` | 〃 | 〃 | 0 | 0 | 0 | 0 | 0 |
| `/supplierops/products/create` | 〃 | 〃 | 0 | 0 | 0 | 0 | 0 |
| `/posts` | **`/admin/cms/contents`** | legacy redirect 유지 ✅ | 0 | 0 | 0 | 0 | 0 |
| `/store/qr` | `/store/qr` | **매장 QR 안내 유지** ✅ | 0 | 0 | 0 | 0 | 0 |
| `/admin/cms/contents` | 동일 | CMS Contents 정상 | 0 | 0 | 0 | 0 | 0 |

**전 세션 합계: 콘솔 에러 0 · pageerror 0 · 비-2xx 0 · `/api/vendor/products` 0건 · admin 오리진 `/api` 요청 0건 · `text/html` 로 응답된 `/api` 요청 0건.**

### 8-1. supplierops 3경로가 안내 화면이 아닌 이유 (WO §6.2 기대와 일치)

`routes/apps.routes.tsx:148` 의 `<AppRouteGuard appId="supplierops">` 가 앞단에서 차단한다.

```text
GET /api/v1/apps/availability →
  membership-yaksa · annualfee-yaksa · reporting-yaksa ·
  digital-signage · digital-signage-core · partnerops        ← supplierops 없음
⇒ 비활성 판정 → /error/app-disabled?app=supplierops
```

WO §6.2 는 *"app-disabled 또는 안내 화면 중 **최신 상태와 일치**"* 를 기대치로 두었고,
직전 WO CHECK §10-2 에 기록된 상태와 동일하다. 앱 활성화는 상태 변경이므로 수행하지 않았다.
따라서 `SupplierOpsProductGuidePage` 의 렌더는 이번에도 미검증이며, 이 WO 의 검증 대상은 아니다.

---

## 9. commit / push

| 항목 | 값 |
|---|---|
| commit (코드) | `23c04ef56` |
| push | ✅ `4f483ede2..23c04ef56  main -> main` (내 커밋 1개만) |
| 완료 조건 | 이번 WO 범위 미커밋 변경 0건 · `HEAD == origin/main` |

---

## 10. 후속 후보

```text
WO-O4O-SUPPLIEROPS-REMAINING-DEMO-SCREENS-GUIDE-V1
  └ Dashboard · Orders · Settlement · Profile 모두 API 호출 0 데모

IR-O4O-PARTNEROPS-ACTIVE-LEGACY-API-AUDIT-V1
  └ partnerops 는 app registry 에서 active → legacy 16건이 실제 도달 가능 (우선순위 높음)

WO-O4O-ADMIN-APIREQUEST-SCANNER-RECHECK-V1
  └ 제네릭 호출 미탐 보정 후 IR 전체 재집계

IR-O4O-ADMIN-DASHBOARD-NONV1-MOUNT-POLICY-V1
  └ IR REVIEW-1 (/api/v1 밖 mount 9종)
```

> 참고: `apiRequest.ts` 는 사라졌지만 **same-origin `fetch('/api…')` 자체는 36건 남아 있다**
> (`hooks/useBlockPatterns` · `hooks/useReusableBlocks` · `utils/affiliateTrackingUtils` ·
> `utils/partnerTrackingUtils` · `components/shortcodes/admin/ApprovalQueue` · `services/cartService` 등).
> 동일한 "index.html 200 위장" 실패 구조이므로 별도 처리 대상이다.

---

*작성: 2026-08-10 · 기준 commit `23c04ef56` · 리비전 `o4o-admin-dashboard-01103-r28`*
