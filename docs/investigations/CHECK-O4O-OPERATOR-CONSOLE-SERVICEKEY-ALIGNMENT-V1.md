# CHECK-O4O-OPERATOR-CONSOLE-SERVICEKEY-ALIGNMENT-V1

> **검증 보고서 (Verification Report)** — Production 배포 + 코드 정합 + Rena browser 검증 보류.
>
> `WO-O4O-OPERATOR-CONSOLE-SERVICEKEY-ALIGNMENT-V1` (commit `f4a9a0bfa`) 적용 후 Products / Stores list 호출에 serviceKey 가 명시되는지 검증.

- **검증일:** 2026-05-24
- **분류:** Verification Result (배포 + code review + browser 보류)
- **대상 환경:** Production (`api.neture.co.kr`, project `netureyoutube`)
- **검증 대상 WO:** `WO-O4O-OPERATOR-CONSOLE-SERVICEKEY-ALIGNMENT-V1` (commit `f4a9a0bfa`)
- **선행 IR:** [IR-O4O-OPERATOR-CONSOLE-FRONTEND-BOUNDARY-POLICY-ALIGNMENT-AUDIT-V1](IR-O4O-OPERATOR-CONSOLE-FRONTEND-BOUNDARY-POLICY-ALIGNMENT-AUDIT-V1.md)

---

## 0. 최종 판정

### ✅ 코드/배포 정합 완료, Browser 검증은 Rena 1 회 확인 필요

| 항목 | 결과 |
|---|---|
| A. 6 파일 코드 정렬 | ✅ commit `f4a9a0bfa` 에 정확히 6 파일 +22/-1 |
| B. TypeScript 검증 (3 service) | ✅ 새 에러 0 |
| C. Cloud Run revisions 배포 | ✅ 3 service 모두 새 revision (2026-05-24T02:17Z) |
| D. KPA AnalyticsPage 변경 없음 (의심 항목 해소) | ✅ ApiClient.get 시그니처 확인 결과 이미 정렬 |
| E. Neture 무변경 (회귀 없음) | ✅ web-neture 파일 본 WO 에서 제외 — 변경 0 |
| F. Backend 무변경 (회귀 없음) | ✅ controllers / serviceScope / Boundary Policy 모두 미변경 |
| G. Browser 검증 (3 service Products/Stores + KPA Dashboard) | ⏳ Rena 1 회 확인 |

---

## 1. 검증 환경

| 항목 | 값 |
|---|---|
| 본 WO commit | `f4a9a0bfa` |
| Push 시각 | 2026-05-24 (UTC, push 직후) |
| Deploy workflow | Run `26349414339` ✓ Complete |
| 신규 revisions | glycopharm-web-00709-gp6 / kpa-society-web-01127-l2d / k-cosmetics-web-00512-58b |
| 배포 시각 | 2026-05-24T02:17Z UTC |

---

## 2. 수정 파일 목록 (6 개, 정확히)

| # | 파일 | 변경 | 정렬 위치 |
|---|---|---|---|
| 1 | `web-glycopharm/src/pages/operator/ProductsPage.tsx` | +4 | `fetchProducts` 의 URLSearchParams 객체 인자에 `serviceKey: 'glycopharm'` |
| 2 | `web-k-cosmetics/src/pages/operator/ProductsPage.tsx` | +4 | 동일 패턴, `serviceKey: 'k-cosmetics'` |
| 3 | `web-glycopharm/src/pages/operator/StoresPage.tsx` | +4 | `glycoStoresApi.listStores` 의 qs.set + `serviceKey=glycopharm` |
| 4 | `web-kpa-society/src/pages/operator/OperatorStoresPage.tsx` | +4 | `kpaStoresApi.listStores` 의 qs.set + `serviceKey=kpa-society` |
| 5 | `web-k-cosmetics/src/pages/operator/StoresPage.tsx` | +4 | `fetchStores` 의 URLSearchParams 객체 인자에 `serviceKey: 'k-cosmetics'` |
| 6 | `web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx` | +2/-1 | line 64 의 `/operator/stores?limit=1` URL 에 `&serviceKey=kpa-society` 추가 |
| **합계** | | **+22 / -1** | **6 파일** |

본 WO 외 추가 파일 변경 없음. `pnpm-lock.yaml` 등 평행 세션의 staged 변경 없음 — git diff --cached --stat 사전 확인 + git show --stat HEAD 사후 확인 (이중 확인 적용).

---

## 3. 각 endpoint 별 serviceKey 추가 위치

| Endpoint | Service | 위치 |
|---|---|---|
| `/operator/products` | GP | `ProductsPage.tsx:88` URLSearchParams 객체 인자 |
| `/operator/products` | K-Cos | `ProductsPage.tsx:78` 동일 |
| `/operator/stores` | GP | `StoresPage.tsx:45` `glycoStoresApi.listStores` |
| `/operator/stores` | KPA | `OperatorStoresPage.tsx:47` `kpaStoresApi.listStores` |
| `/operator/stores` | K-Cos | `StoresPage.tsx:93` URLSearchParams 객체 인자 |
| `/operator/stores?limit=1` (dashboard stats) | KPA | `KpaOperatorDashboard.tsx:65` URL string |

---

## 4. KPA ApiClient.get 시그니처 확인 결과

**선행 IR §5.B 의 분류 B (검증 후 결정) 해소:**

[services/web-kpa-society/src/api/client.ts:121-123](services/web-kpa-society/src/api/client.ts#L121-L123):
```ts
async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  return this.request<T>(endpoint, { method: 'GET', params });
}
```

→ **두번째 인자 = 직접 query params object.** axios 와 다름 (axios 는 `config.params` wrap 필요).

KPA AnalyticsPage 의 기존 호출:
```ts
platformApi.get('/operator/analytics/summary', { serviceKey: SERVICE_KEY, days })
```
→ **이미 정렬 상태.** Cloud Run 로그의 `analytics/summary?days=7` 400 호출은 다른 origin (admin-dashboard 또는 본 ApiClient fix 이전 build 의 잔재 cached 호출 등) 으로 추정.

**결론: KPA AnalyticsPage 변경 없음. WO 의 분류 B 가 모두 D 정상으로 재분류됨.**

---

## 5. 항목별 검증 결과

### A. Products (GP / K-Cos) — ⏳ Rena 1 회 확인

**예상 동작:**
- platform admin 접속 시 `?page=1&limit=20&sortBy=createdAt&sortOrder=DESC&serviceKey={glycopharm|k-cosmetics}` 으로 호출
- 200 OK (이전 400 해소)

**확인 방법:** 각 서비스 operator products 화면 진입 + DevTools Network 에서 serviceKey 확인.

### B. Stores (GP / KPA / K-Cos) — ⏳ Rena 1 회 확인

**예상:** 동일 패턴, `serviceKey={glycopharm|kpa-society|k-cosmetics}` 포함, 200 OK.

### C. KPA OperatorDashboard stores stats — ⏳ Rena 1 회 확인

**예상:** KPA 운영자 대시보드 진입 시 `/operator/stores?limit=1&serviceKey=kpa-society` 호출 → 200 (이전 400 해소). 대시보드 stats 정상 표시.

### D. KPA AnalyticsPage — ✅ 변경 없음 (이미 정렬)

ApiClient.get 시그니처가 axios 와 다르고 두번째 인자가 직접 query 로 직렬화됨. 변경 불필요. 실제 호출 URL 에 serviceKey 포함 보장.

### E. Neture 무변경 — ✅ 확정

본 WO commit 의 diff 에 `services/web-neture/**` 변경 0건. Neture 모든 화면 (StoreManagement / UsersManagement / AnalyticsPage) 정렬 상태 유지.

### F. 일반 service operator 회귀 — ✅ 코드 review 로 무영향 확정

`resolveOperatorScope` 의 first branch:
```ts
if (!scope.isPlatformAdmin) {
  return { mode: 'service-scoped', serviceKeys: scope.serviceKeys, crossService: false };
}
```
→ 비-platform-admin 호출자는 query.serviceKey 가 있든 없든 자동 service-scoped. serviceKey 추가는 이들에게 무영향.

### G. TypeScript / build — ✅ PASS

3 service 모두 `npx tsc --noEmit` 결과 **새 에러 0**. 본 WO 변경 무영향.

---

## 6. 회귀 확인 종합

| 회귀 항목 | 결과 | 근거 |
|---|---|---|
| Backend (MembershipConsole / ProductConsole / StoreConsole / analytics.routes / serviceScope / Boundary Policy) | ✅ 무변경 | 본 WO commit 의 diff 에 backend 파일 0건 |
| `/operator/members` (선행 WO 정렬 결과) | ✅ 무영향 | 본 WO 의 6 파일에 members 호출 코드 0건 |
| Neture 모든 화면 | ✅ 무변경 | diff 에 web-neture 0건 |
| KPA AnalyticsPage | ✅ 무변경 | ApiClient 시그니처 확인 후 변경 불필요 결정 |
| 비-platform-admin service operator | ✅ 무영향 | resolveOperatorScope first branch 즉시 return |
| Boundary Policy F6 정책 | ✅ 무변경 | 정책 자체는 그대로 |

→ **본 WO 변경으로 인한 회귀: 0 건.**

---

## 7. Browser 검증 항목 (Rena)

Rena `platform:super_admin` 계정으로 각 화면 접속 + DevTools Network 확인:

| # | 화면 | 확인 호출 URL |
|---|---|---|
| 1 | GlycoPharm /operator/products | `?serviceKey=glycopharm` 포함 + 200 |
| 2 | K-Cosmetics /operator/products | `?serviceKey=k-cosmetics` 포함 + 200 |
| 3 | GlycoPharm /operator/stores | `?serviceKey=glycopharm` 포함 + 200 |
| 4 | KPA /operator/stores (or 동등) | `?serviceKey=kpa-society` 포함 + 200 |
| 5 | K-Cosmetics /operator/stores | `?serviceKey=k-cosmetics` 포함 + 200 |
| 6 | KPA OperatorDashboard | stores stats 호출에 `&serviceKey=kpa-society` 포함 + 200 |
| 7 | KPA Analytics (변경 없음) | 기존 동작 유지 — 회귀 없음 확인 |

---

## 8. 남은 drift 여부

### 본 WO 적용 후 잔존 drift

**없음** (선행 IR 의 audit 기준).

| Endpoint | 정렬 상태 |
|---|---|
| `/operator/members` | ✅ 선행 WO |
| `/operator/members/stats` | ✅ 선행 WO |
| `/operator/products` | ✅ 본 WO |
| `/operator/stores` | ✅ 본 WO (KPA dashboard 부수 호출 포함) |
| `/operator/analytics/summary` | ✅ 기존 정렬 (KPA 는 ApiClient 시그니처 확인 후 변경 불필요) |
| `/operator/analytics/actions` | ✅ 동일 |
| `/operator/analytics/insight` | ✅ 동일 |

**7 strict-400 endpoint 모두 4 service frontend 정렬 완료.**

### 본 WO 범위 외 (후속 IR 후보)

- **`IR-O4O-ADMIN-DASHBOARD-OPERATOR-API-AUDIT-V1`** — admin-dashboard SPA 의 operator endpoint 호출 일괄 audit (별건)
- **KPA ApiClient 시그니처 표준화** — 다른 호출처 잠재 영향 audit (별건)
- **SERVICE_KEY 상수 / API helper 공통화** — Operator Core Design (별건)

---

## 9. 최종 PASS/FAIL/대기 매트릭스

| 항목 | 필수 | 결과 |
|---|:---:|:---:|
| A. GP Products browser 검증 | ★ | ⏳ Rena |
| B. K-Cos Products browser 검증 | ★ | ⏳ Rena |
| C. GP Stores browser 검증 | ★ | ⏳ Rena |
| D. KPA Stores browser 검증 | ★ | ⏳ Rena |
| E. K-Cos Stores browser 검증 | ★ | ⏳ Rena |
| F. KPA Dashboard stores stats 검증 | ★ | ⏳ Rena |
| G. KPA Analytics 무회귀 | △ | ✅ 변경 없음 (이미 정렬) |
| H. Neture 무회귀 | △ | ✅ 변경 0건 |
| I. 일반 operator 무회귀 | △ | ✅ 코드 review |
| J. Backend 무변경 | △ | ✅ commit diff 확인 |
| K. TypeScript / build | △ | ✅ 새 에러 0 |
| L. Cloud Run revisions 배포 | △ | ✅ 3 service 모두 |

**A–F 는 browser 측이라 Rena 1 회 확인 필요.** 코드/배포 측 모두 정합.

---

## 10. 본 CHECK 가 결정하지 않는 것

- 다른 operator endpoint 의 추가 drift — 선행 IR 의 audit 가 모든 strict-400 endpoint 를 커버. 추가 없음.
- admin-dashboard 의 operator endpoint 호출 audit — 별건 IR
- KPA ApiClient 표준화 — 별건
- SERVICE_KEY 상수화 / API helper 공통화 — 별건 (Operator Core Design)
- Rena 의 browser 확인 결과 — 후속 보고

---

## 부록 — 검증 명령 (재현 가능)

```bash
# Cloud Run revisions 배포 확인
for SVC in glycopharm-web kpa-society-web k-cosmetics-web; do
  echo "=== $SVC ==="
  gcloud run revisions list --service $SVC \
    --region asia-northeast3 --project netureyoutube \
    --limit 2 --format="value(metadata.name,metadata.creationTimestamp)"
done

# 본 WO commit 의 변경 확인
git show --stat f4a9a0bfa

# (Rena) Browser DevTools 에서 호출 URL 확인 (예시)
# https://glycopharm.co.kr/operator/products → Network 탭 → /operator/products 요청에
#   ?page=1&limit=20&sortBy=createdAt&sortOrder=DESC&serviceKey=glycopharm 포함 확인
```

---

*Created: 2026-05-24*
*Type: Verification Result (deploy + code review + browser-pending)*
*Status: 코드/배포 정합 완료, Browser 검증 (A–F) Rena 1 회 확인 후 종료*
*Next: Rena browser 확인 → 별건 후속 (`IR-O4O-ADMIN-DASHBOARD-OPERATOR-API-AUDIT-V1` 등) 진행 여부 결정*
