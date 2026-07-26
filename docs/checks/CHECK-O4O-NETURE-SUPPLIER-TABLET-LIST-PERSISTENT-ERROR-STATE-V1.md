# CHECK-O4O-NETURE-SUPPLIER-TABLET-LIST-PERSISTENT-ERROR-STATE-V1

WO: `WO-O4O-NETURE-SUPPLIER-TABLET-LIST-PERSISTENT-ERROR-STATE-V1`
선행: `IR-O4O-NETURE-SUPPLIER-API-LOAD-ERROR-CONTRACT-AUDIT-V1` ·
`CHECK-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1 §15-1` (A− 등급 후속)
작성일: 2026-07-26 (KST)

---

## 1. 실제 route

```text
/supplier/tablet-screen-sets
```

WO 예상값 `/supplier/tablet` 이 아니다. `App.tsx:827` 의 canonical route 를 코드 기준으로 확정했다.
(사이드바 라벨은 `태블렛`, 경로는 `tablet-screen-sets`.)

## 2. 대상 API와 소비처

| 항목 | 값 |
|------|-----|
| 페이지 | `services/web-neture/src/pages/supplier/SupplierTabletScreenSetsPage.tsx` |
| 목록 API | `fetchSupplierScreenSets()` (`lib/api/supplierScreenSets.ts`) |
| 초기 로딩 함수 | `reload()` (`useCallback`, `useEffect` 최초 1회) |
| 소비처 | **해당 페이지 1곳** (전수 검색 결과 다른 소비처 없음) |

## 3. 기존 오류 처리 흐름

```ts
const reload = useCallback(async () => {
  setLoading(true);
  try {
    setSets(await fetchSupplierScreenSets());
  } catch (e: any) {
    setToast({ type: 'error', message: e?.message || '화면 세트를 불러오지 못했습니다.' });
    setSets([]);          // ← 실패를 정상 빈 배열로 확정
  } finally {
    setLoading(false);
  }
}, []);
```

- **`setSets([])` 존재 확인** — 실패가 정상 0건으로 확정되었다.
- 토스트는 `useEffect` 로 **4초 후 자동 소멸**한다 → 이후 화면은 `아직 만든 원본이 없습니다` 만 남아 정상 0건과 구분 불가.
- 토스트 문구가 `e?.message`(서버 원문 기반 normalize 결과)라 서버 원문이 화면에 노출되었다.

### API 계약 (조사)

`call<T>()` 은 4xx/5xx/네트워크 오류를 `normalizeError()` 로 rethrow 한다(이미 throw 계약).
다만 `return res.data?.data as T` 이므로 **200 이면서 `data` 가 배열이 아니면 `undefined` 를 반환**해 목록이 "정상 0건" 처럼 흐른다. WO §9 의 API 변경 허용 조건에 해당한다.

## 4. 변경한 상태 구조

```ts
const [sets, setSets] = useState<SupplierScreenSet[] | null>(null);  // null = 로딩/실패
const [loading, setLoading] = useState(true);
const [loadError, setLoadError] = useState(false);
```

```ts
catch {
  setSets(null);          // setSets([]) 제거
  setLoadError(true);
  setToast({ type: 'error', message: '태블렛 화면 목록을 불러오지 못했습니다.' });  // 고정 문구
}
```

렌더 분기: `loading` → `loadError` → `!sets || sets.length === 0` → 목록.
**오류 분기가 빈 상태 분기보다 앞에** 있어 두 상태가 같은 조건으로 렌더되지 않는다.

## 5. API 변경 (payload 검증)

`lib/api/supplierScreenSets.ts` — **목록 함수에만** 추가. 공통 `call()` 은 변경하지 않았다(WO §9 금지).

```text
SUPPLIER_SCREEN_SETS_LOAD_FAILED
```

```ts
catch            → console.warn(원문) 후 고정 코드 throw
!Array.isArray   → console.warn 후 고정 코드 throw   // 200 + 깨진 payload
```

## 6. 지속 오류 UI

```text
태블렛 화면 목록을 불러오지 못했습니다.
잠시 후 다시 시도해 주세요.
[다시 시도]
```

- 페이지 본문(목록 카드 영역)에 렌더 → **토스트 소멸과 무관하게 유지**.
- 오류 상태에서 `아직 만든 원본이 없습니다` 빈 상태 문구는 표시하지 않는다.
- 기존 카드 컨테이너·타이포 패턴을 그대로 재사용했다(신규 UI 패턴·공통 Core 변경 0).

## 7. 토스트 유지·제거 여부

**유지**했다(WO §6 "보조 알림으로 유지 가능"). 단 두 가지를 바꿨다.

```text
서버 원문(e?.message) → 고정 문구 '태블렛 화면 목록을 불러오지 못했습니다.'
토스트가 유일한 오류 신호였던 구조 → 본문 지속 오류가 주 신호, 토스트는 보조
```

## 8. 다시 시도 방식

`다시 시도` → `reload()` → **`fetchSupplierScreenSets()` 만 재호출**.
페이지 전체 재로딩·다른 API 재호출 없음.

## 9. 오류 주입·복구 결과 — 8/8 PASS

프로덕션에서 XHR `open()` URL 재작성(도달 불가 주소 / 404) 및 합성 200 응답으로 목록 요청만 조작. **운영 데이터 write 0.**

| 시나리오 | 조건 | 결과 | 관측값 |
|----------|------|:---:|--------|
| A | 정상 응답 + 0건 | PASS | `아직 만든 원본이 없습니다` 표시, 오류 미표시, 로딩 미고착 |
| B | 정상 응답 + 합성 데이터 | PASS | 합성 행(`합성 화면 세트`) 목록 렌더, 오류·빈 상태 미표시 |
| C | 4xx (404 주입) | PASS | 지속 오류 + 다시 시도, 빈 상태 미노출 |
| D | 네트워크 실패 | PASS | 동일 |
| E | 200 + payload 깨짐(`data` 비배열) | PASS | **정상 0건으로 흐르지 않고** 오류 상태 |
| F | 다시 시도 실패 | PASS | 오류 유지, 빈 상태 미노출 |
| G | 다시 시도 성공 + 0건 | PASS | 오류 해제 → 정상 빈 상태 복구 |
| H | 다시 시도 성공 + 데이터 | PASS | 오류 해제 → 목록 표시 (B 와 동일 경로) |

## 10. 토스트 소멸 후 검증 (본 WO 핵심) — PASS

| 시점 | `태블렛 화면 목록을 불러오지 못했습니다` 출현 횟수 | 본문 오류 | 다시 시도 | 빈 상태 문구 |
|------|:---:|:---:|:---:|:---:|
| 오류 직후 | **2** (본문 + 토스트) | 유지 | 유지 | 미노출 |
| 5.2초 대기 후 (토스트 4초 자동 소멸 초과) | **1** (본문만) | **유지** | **유지** | **미노출** |

`잠시 후 다시 시도해 주세요.` 안내 문구도 함께 유지됨을 확인했다.
→ 기존 문제(토스트 소멸 후 정상 0건과 구분 불가)가 제거되었다.

## 11. 기존 목록 액션 회귀

| 항목 | 결과 |
|------|:---:|
| `원본 만들기` 버튼 | 정상 노출·동작 |
| 목록 렌더(합성 데이터 기준) | 정상 |
| 저장·삭제·복제·게시·비활성화·보관·미리보기 API | **코드 무변경** (mutation 계약 미수정) |
| mutation 후 목록 재조회 실패 시 | mutation 성공 자체는 성공 처리, 후속 목록 실패만 목록 오류 상태로 표시(구조상 `reload()` 경유) |
| 검색·필터·pagination | 해당 페이지에 **존재하지 않음** (검증 대상 아님) |

## 12. 라우트 회귀

| route | 렌더 | 로딩 고착 | 오탐 오류 | 가로 overflow |
|-------|:---:|:---:|:---:|:---:|
| `/supplier/tablet-screen-sets` | OK | 없음 | 없음 | 없음 |

정상 상태 **콘솔 오류 0**, unhandled rejection 0.

## 13. 반응형 (오류 상태 기준)

| 폭 | 결과 |
|----|:---:|
| Desktop 1440×900 | PASS |
| Tablet 768×1024 | PASS — 다시 시도 높이 38px, **`원본 만들기` 버튼과 겹침 없음**, scrollWidth 768 = viewport |
| Mobile 390×844 | PASS — 다시 시도 89×38px 터치 가능, 텍스트 잘림 0, scrollWidth 390 = viewport |

빈 상태와 오류 상태가 동시에 렌더되는 경우는 전 폭에서 0건.

## 14. 배포 및 프로덕션 smoke

| 항목 | 값 |
|------|-----|
| commit | `cb5341ca7` |
| workflow | `Deploy Web Services (Cloud Run)` — **success** (run 30190673419) |
| jobs | `detect-changes` success · `deploy-neture` **success** (타 3서비스 skipped) |
| Cloud Run revision | `neture-web-01317-vb4` → **`neture-web-01319-lpz`** |

§9~§13 의 모든 검증은 배포된 프로덕션에서 수행했다.

## 15. 무변경 확인

| 항목 | 값 |
|------|-----|
| 태블렛 데이터 모델 · 화면 세트 상태 ENUM | **무변경** |
| 게시 정책 · 매장 가져오기 계약 | **무변경** |
| 태블렛 제작기 / 편집기 (`@o4o/tablet-screen-set-editor`) | **무변경** |
| 저장·삭제·복제·게시 API | **무변경** |
| 공통 `call()` wrapper · 공통 UI Core | **무변경** |
| dependency / lockfile | **무변경** |
| 사이드바 · 대시보드 | **무변경** |
| backend / DB / migration | 0 / 0 / 0 |
| 운영 데이터 write | **0** |
| typecheck | PASS |
| build | PASS (10.08s) |

## 16. 변경 파일

```text
services/web-neture/src/lib/api/supplierScreenSets.ts          (목록 payload 검증 + 고정 코드)
services/web-neture/src/pages/supplier/SupplierTabletScreenSetsPage.tsx (지속 오류 상태)
```

2 파일 — 같은 구현 커밋(`cb5341ca7`). 부분 반영 0.

## 17. 실데이터 제한

| 항목 | 상태 | 사유 |
|------|:---:|------|
| 정상 0건 ↔ 오류 구분 | 확인 완료 | 계정 화면 세트 0건 — 본 WO 핵심 회귀 검증에 적합 |
| 목록 행 렌더 | **합성 200 응답으로 확인** | 실제 화면 세트 없음. WO §11-2 허용 방식, 운영 데이터 생성 0 |
| 실데이터 기준 행 액션(수정·복제·게시·삭제) 동작 | **미확인** | 대상 데이터 없음. 테스트 데이터 생성은 WO 금지. 해당 코드 경로는 무변경 |
| mutation 후 목록 재조회 실패 경로 | **미확인** | mutation 실행에 실데이터 필요 |

## 18. 후속 항목

| # | 항목 |
|---|------|
| 1 | IR E 등급 2건(`getShipment` / `getOrderCondition`) — backend 404 vs 5xx 계약 확인 후 판단 |
| 2 | 잔여 C 등급: `getLibraryItems()` · `listSpotPolicies()` · `getOnboarding()` · `regulatedCategory.list()` — 소비처 확인 후 필요 시 별도 WO |
| 3 | `supplierScreenSets.ts` 의 상세·mutation 함수도 `call()` 이 `undefined` 를 통과시킬 수 있음 — 목록과 달리 소비처가 즉시 오류를 내므로 우선순위 낮음. 필요 시 일괄 검증 도입 검토 |
| 4 | 실데이터 보유 계정으로 행 액션·mutation 후 재조회 재검증 |
