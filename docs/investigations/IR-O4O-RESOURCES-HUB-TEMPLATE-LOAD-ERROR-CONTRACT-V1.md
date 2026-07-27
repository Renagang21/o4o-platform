# IR-O4O-RESOURCES-HUB-TEMPLATE-LOAD-ERROR-CONTRACT-V1

> **성격:** 공통 UI 템플릿 조사 + 안전 additive 구현. backend/DB/migration 변경 0.
> **작성일:** 2026-07-27
> **선행:** 묶음3 (WO-O4O-NETURE-OPERATOR-HOMEPAGE-CMS-AND-CONTENT-ASSETS-LOAD-ERROR-CONTRACT-V1) 에서 `NetureResourcesPage` 를 "공통 `ResourcesHubTemplate` 제약 화면" 으로 남긴 것의 정식 종결.
> **판정:** 구현 진행 (공통 변경이 additive·후방호환·회귀 위험 낮음 → §3 "IR만" 트리거 불성립).

---

## 1. Executive Summary

`ResourcesHubTemplate` (`packages/shared-space-ui`) 의 `loadData` 가 `fetchItems` 실패를 `catch → setItems([])` 로 삼켜, 조회 장애가 "등록된 자료가 없습니다" 라는 **정상 빈 상태**로 표시되던 문제를 조사·정비했다.

- **소비처 전수 4개**(KPA / GlycoPharm / K-Cosmetics / Neture) 를 모두 확인했다. 4개 모두 같은 자료실 계약(`{items,total,totalPages}`)을 쓰며, **의도된 fail-open 은 0건** — 4개 전부 조회 실패를 빈 목록으로 표시하는 동일 anti-pattern 이었다(2개는 템플릿이 삼킴, 2개는 어댑터가 먼저 삼킴).
- 공통 템플릿에 **오류 상태 + 재시도**를 추가했다. 이는 **additive·후방호환** 변경이다: `fetchItems` 가 throw 할 때만 오류 UI 가 발동하고, 여전히 삼키는 어댑터가 있으면 종전과 동일하게 동작한다(회귀 0).
- 어댑터 레벨에서 삼키던 GlycoPharm·K-Cosmetics 의 `try/catch → 빈 목록`을 제거해 throw 를 전파하도록 정렬했다(K-Cosmetics 의 "서버 미구현" 주석은 stale — 엔드포인트 실재 확인). Neture·KPA 는 이미 throw 를 전파하므로 어댑터 변경 없이 템플릿 정비만으로 정상화된다.
- backend/DB/migration/공통 도메인 API 계약 변경 0.

---

## 2. 템플릿 위치와 전체 소비처

**템플릿:** `packages/shared-space-ui/src/ResourcesHubTemplate.tsx` (패키지 `@o4o/shared-space-ui`, `export` 는 `src/index.ts`). source-only 패키지 — 소비 앱 빌드 시점에 번들·타입체크된다.

**전체 소비처 (실사용 4):**

| 서비스 | 파일 | Route | API |
|--------|------|-------|-----|
| KPA | `services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx` | `/resources` | `resourcesApi.list` → `/contents?sub_type=resource` |
| GlycoPharm | `services/web-glycopharm/src/pages/resources/ResourcesPage.tsx` | `/resources` | `glycoResourcesApi.list` → `/glycopharm/contents?sub_type=resource` |
| K-Cosmetics | `services/web-k-cosmetics/src/pages/resources/ResourcesPage.tsx` | `/resources` | `api.get('/cosmetics/contents')` |
| Neture | `services/web-neture/src/pages/resources/NetureResourcesPage.tsx` | `/resources` | `cmsApi.getContents({type:'resource'})` → `/neture/content` |

(문서/아카이브 매치는 조사 참조용, 실사용 코드 아님.)

---

## 3. 기존 오류 삼킴 구조

**템플릿 (`loadData`, 삼킴 지점):**
```ts
try { const res = await config.fetchItems(...); setItems(res.items); ... }
catch { setItems([]); setTotal(0); setTotalPages(1); }   // ← 오류를 정상 0건으로 뒤집음
```
→ 오류 상태·재시도 없음. `BaseTable` 이 `emptyMessage`("등록된 자료가 없습니다") 를 렌더 → 장애가 빈 상태로 위장.

---

## 4. 소비처별 계약·위험도 분류

| 소비처 | API 래퍼 실패 시 | 어댑터 `fetchItems` | 실패 전파 | 분류 |
|--------|:---:|:---:|:---:|------|
| **Neture** | throw (묶음3에서 `cmsApi.getContents` 고정코드 throw) | try/catch 없음 | **throw 전파** | 정비 필요 — throw 가 템플릿에서 삼켜짐 (원 결함) |
| **KPA** | throw (`apiClient.get` 4xx/5xx throw) | try/catch 없음 (+usage_type 매핑) | **throw 전파** | 정비 필요 — throw 가 템플릿에서 삼켜짐 |
| **GlycoPharm** | throw (`api.get`) | **try/catch → 빈 목록** | 어댑터가 삼킴 | 결함 (문서화 안 됨) — 어댑터 먼저 삼킴 |
| **K-Cosmetics** | throw (`api.get`) | **try/catch → 빈 목록** ("서버 미구현" 주석) | 어댑터가 삼킴 | 결함 (주석 stale) — 엔드포인트 실재 확인 |

**의도된 fail-open = 0건.** K-Cosmetics 의 "서버 미구현 시 빈 목록" 주석은 검증 결과 stale 이다 — `apps/api-server/src/routes/cosmetics/cosmetics.routes.ts:265` 에서 `createCosmeticsContentsRouter` 가 마운트되어 `GET /api/v1/cosmetics/contents` 는 `{success:true,data:{items,total,page,limit,totalPages}}`(정상) / `500 {success:false}`(오류) 를 반환한다(`controllers/resources.controller.ts:64-149`). 따라서 4개 소비처 모두 조회 실패를 표면화해야 하며 fail-open 예외는 없다.

**위험도:** 낮음. 템플릿 변경은 오류 상태 추가(additive) 이고, 어댑터 변경은 삼킴 제거(throw 전파)뿐이다. 4개 소비처가 같은 계약을 공유하므로 계약 충돌 없음.

---

## 5. 공통 구현 가능 여부 & 적용한 error/retry 계약

**가능 — 구현함.** §3 의 "계약이 서로 다르면 IR만" 트리거는 불성립: 4개 계약이 동형이고, 오류 상태는 opt-in(throw 시에만 발동)이라 삼키는 어댑터에 회귀를 주지 않는다.

**템플릿 변경 (`ResourcesHubTemplate.tsx`):**
- 상태 추가: `const [loadError, setLoadError] = useState(false)`.
- `loadData`: 시작 시 `setLoadError(false)`, 성공 시 종전대로, **catch 시 `setLoadError(true)` 만** — `setItems([])`/`setTotal(0)` 제거(§7: 기존 목록을 비우지 않음).
- 렌더 우선순위: `loading` > (`loadError && items.length===0` → 오류 패널) > 정상(리스트/빈 상태).
  - 오류 패널: `AlertTriangle` + "자료를 불러오지 못했습니다." + "다시 시도"(`loadData()`). 서버 원문 미노출.
  - `loadError && items.length>0` (§7 재조회 실패): 상단 오류 스트립("이전 목록을 표시합니다" + 다시 시도) + 기존 목록 유지.
- Result count: `loadError && items.length===0` 일 때 stale 카운트 숨김 → **오류와 빈 상태 동시 렌더 0**.

**어댑터 변경:**
- GlycoPharm: `fetchItems`/`fetchDetail` 의 `try/catch → 빈 목록/null` 제거 → throw 전파.
- K-Cosmetics: `fetchItems` 의 `try/catch → 빈 목록` 제거 → throw 전파. stale 주석 정정.
- Neture·KPA: 변경 없음(이미 전파) — 템플릿 정비만으로 정상화.

**금지 준수:** 템플릿은 일반 load error 만 처리(status/code 도메인 해석 없음), 서버 원문 미노출, 공통 타입 대규모 변경 없음. not-found/권한 등 도메인 처리는 각 API·소비처 담당.

---

## 6. 상태·필터·page 유지

재시도(`loadData()`)는 `currentPage`/`searchQuery` 를 URL `searchParams` 에서 읽으므로 현재 tab·검색어·page 를 자동 보존한다. 페이지 전체 reload 없음. 화면 전환 시 `loadError` 는 `loadData` 시작 시 리셋되어 이전 오류가 다른 조건으로 넘어가지 않는다.

---

## 7. mutation 후 재조회

템플릿 mutation(`handleDeleteItem`/`handleBulkDelete`/`handleToggleRecommend`)은 성공 후 `loadData()` 재조회한다. 정비 후: 재조회 실패 시 mutation 성공은 유지(별도 toast/optimistic), `loadError` 만 세팅되어 **기존 목록을 `[]` 로 비우지 않고** 상단 스트립으로 표면화. mutation 실패로 뒤집지 않음.

---

## 8. 대표 소비처 오류 주입 (코드 경로)

| 시나리오 | 결과 |
|----------|------|
| 정상 0건 (200 빈 배열) | 성공 통과 → "등록된 자료가 없습니다" (빈 상태) |
| 정상 데이터 | 리스트 렌더 |
| 500 / 401·403 / 네트워크 | 어댑터 throw → 템플릿 catch → 오류 패널 + 재시도 |
| 깨진 payload (Neture: `cmsApi` success!==true/비배열) | 고정코드 throw → 오류 패널 |
| 재시도 실패 | 오류 패널 유지 |
| 재시도 성공 | 정상 리스트 |
| 필터·page 유지 | searchParams 기반 보존 |
| 오류+빈 상태 동시 렌더 | 0 (result count·emptyMessage 억제) |
| unhandled rejection / 로딩 고착 | 0 (finally always `setLoading(false)`) |
| 가로 overflow | 0 (기존 레이아웃 불변) |
| 운영 write | 0 |

---

## 9. typecheck·build

| 앱 | typecheck | build |
|----|:---:|:---:|
| @o4o/web-neture | EXIT 0 | EXIT 0 (13.07s) |
| glycopharm-web | EXIT 0 | EXIT 0 (23.58s) |
| @o4o/web-k-cosmetics | EXIT 0 | EXIT 0 (14.55s) |
| @o4o/web-kpa-society | EXIT 0 | EXIT 0 (18.21s) |

`@o4o/shared-space-ui` 는 source-only(build script 없음) — 4개 소비 앱 빌드로 타입/번들 검증.

---

## 10. 범위 제외 (준수)

- backend / DB / migration / 콘텐츠 데이터 모델 / Resources Hub IA / dependency 추가 / 운영 write: **0**.
- 각 도메인 API 계약 재설계 안 함(K-Cosmetics `sub_type` 필터 정렬 등은 load-error 범위 밖 → 보류).
- 다른 세션 작업 파일(otc-*/hff-*/pnpm-lock/otc-safety/AllProductsOverviewPage): 미변경. `shared-space-ui` 는 동시 세션 미점유.

---

## 11. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/shared-space-ui/src/ResourcesHubTemplate.tsx` | loadError 상태 + 오류 패널/스트립 + 재시도, catch 삼킴 제거 |
| `services/web-glycopharm/src/pages/resources/ResourcesPage.tsx` | 어댑터 try/catch 삼킴 제거 → throw 전파 |
| `services/web-k-cosmetics/src/pages/resources/ResourcesPage.tsx` | 어댑터 try/catch 삼킴 제거 → throw 전파, stale 주석 정정 |

CHECK: `docs/checks/CHECK-O4O-RESOURCES-HUB-TEMPLATE-LOAD-ERROR-CONTRACT-V1.md`

---

*판정: 구현 완료 · 4소비처 전수 정비 · fail-open 예외 0 · backend/DB 변경 0*
