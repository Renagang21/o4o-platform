# CHECK-O4O-NETURE-SUPPLIER-PARTNER-COMMISSIONS-LOAD-ERROR-CONTRACT-V1

WO: `WO-O4O-NETURE-SUPPLIER-PARTNER-COMMISSIONS-LOAD-ERROR-CONTRACT-V1`
대상: `/supplier/partner-commissions` — 목록 조회 오류 계약
작성일: 2026-07-25 (KST)
선행: `CHECK-O4O-NETURE-SUPPLIER-PARTNER-COMMISSIONS-UI-LOCALIZATION-V1` (`8daee03b5` · `b3a7ffed7` · `4c9ead09f`)

---

## 1. 기존 오류 삼킴 위치

**단일 지점** — `services/web-neture/src/lib/api/supplier.ts` `supplierCommissionApi.getCommissions()`:

```ts
try {
  const response = await api.get('/neture/supplier/partner-commissions');
  const result = response.data;
  return result.data || [];          // ← 200 이지만 payload 가 깨져도 []
} catch (error) {
  console.warn(...);
  return [];                          // ← 4xx/5xx/네트워크 오류를 [] 로 삼킴
}
```

페이지는 `commissions.length === 0` 만 보고 빈 상태를 렌더했으므로,
**실제 장애 상황에서도 "등록된 파트너 수수료 정책이 없습니다." 가 표시**되었다.

### backend 응답 계약 (조사 결과 — 무변경)

`apps/api-server/src/modules/neture/controllers/supplier-settlement.controller.ts:99`

| 상황 | 응답 |
|------|------|
| 성공 | `200 { success: true, data: rows }` (`rows` 는 항상 배열) |
| 실패 | `500 { success: false, error: 'INTERNAL_ERROR' }` |

→ **성공 0건과 실패는 backend 에서 이미 구분 가능**했다. 프론트에서만 뭉개고 있었으므로 backend 변경이 불필요하다.

### 소비처 조사

`supplierCommissionApi.getCommissions()` 의 소비처는 **`SupplierPartnerCommissionsPage` 단 1곳**.
(`partnerCommissionApi.getCommissions` / `adminCommissionApi.getCommissions` 는 이름만 같은 **다른 객체**로, 접촉하지 않았다.)
→ throw 계약으로 바꿔도 타 화면 영향 0.

## 2. 변경한 API client 계약

```ts
export const SUPPLIER_COMMISSION_LOAD_FAILED = 'SUPPLIER_COMMISSION_LOAD_FAILED';

async getCommissions(): Promise<SupplierPartnerCommission[]> {
  let response;
  try {
    response = await api.get('/neture/supplier/partner-commissions');
  } catch (error) {
    console.warn('[Supplier Commission API] Failed to fetch commissions:', extractApiError(error));
    throw new Error(SUPPLIER_COMMISSION_LOAD_FAILED);
  }
  const result = response.data;
  if (!result?.success || !Array.isArray(result.data)) {
    console.warn('[Supplier Commission API] Unexpected commissions payload shape');
    throw new Error(SUPPLIER_COMMISSION_LOAD_FAILED);
  }
  return result.data as SupplierPartnerCommission[];
}
```

| 규칙 | 적용 |
|------|------|
| 성공 → `SupplierPartnerCommission[]` | O |
| 실패 → throw (고정 sentinel) | O |
| 실패 시 `[]` 반환 | **제거** |
| 실패 시 null 을 정상값처럼 반환 | 없음 |
| HTTP 오류 원문 화면 노출 | 없음 (console 전용) |
| 임의 fallback 데이터 | 없음 |
| runtime schema 라이브러리 추가 | 없음 (`Array.isArray` 최소 검증만, §11 준수) |

`extractApiError()` 는 **로그 문자열 생성에만** 사용한다. 반환값이 화면으로 흐르지 않는다.

## 3. loading / error / empty 상태 분리

페이지에 `loadError` 상태를 추가하고, 목록 조회와 제품 목록을 `Promise.allSettled` 로 분리했다.
(`Promise.all` 은 목록이 throw 하면 제품 목록까지 함께 유실된다. 제품 목록은 폼 보조 데이터이므로 기존처럼 실패해도 화면을 막지 않는다.)

```ts
const [commsResult, prodsResult] = await Promise.allSettled([
  supplierCommissionApi.getCommissions(),
  supplierApi.getProducts(),
]);
if (commsResult.status === 'fulfilled') { setCommissions(commsResult.value); setLoadError(false); }
else { setCommissions([]); setLoadError(true); }
setProducts(prodsResult.status === 'fulfilled' ? prodsResult.value : []);
```

렌더 분기 (순서 자체가 상호배타를 보장한다):

| 조건 | 렌더 |
|------|------|
| `loading` | `불러오는 중...` |
| `!loading && loadError` | **오류 카드** (빈 상태 문구 미표시) |
| `!loading && !loadError && length === 0` | 빈 상태 |
| `!loading && !loadError && length > 0` | 표 / 카드 |

## 4. 오류 UI 와 다시 시도

```text
수수료 정책을 불러오지 못했습니다.
잠시 후 다시 시도해 주세요.
[ ⟳ 다시 시도 ]
```

- `다시 시도` → 동일한 `fetchData()` 재호출 → `loading` 재진입
- 성공 시 `setLoadError(false)` 로 오류 해제, 실패 시 오류 상태 유지
- 아이콘은 이미 쓰던 `lucide-react` (`AlertCircle` / `RefreshCw`), 스타일은 이 파일의 기존 인라인 style 관용을 그대로 따랐다 — **신규 UI 패턴·컴포넌트·의존성 0**

## 5. 정상 빈 상태

`isLoading=false && loadError=false && commissions.length===0` 일 때만 표시:

```text
등록된 파트너 수수료 정책이 없습니다.
수수료 정책 추가 버튼을 눌러 첫 정책을 등록하세요.
```

## 6. 오류 메시지 보안

| 항목 | 처리 |
|------|------|
| 서버 error payload (`INTERNAL_ERROR`) | 화면 노출 **없음** — smoke 로 확인 |
| axios/fetch 원문, status code, stack | 화면 노출 **없음** — smoke 로 정규식 확인 (`HTTP_5`, `AxiosError`, `Request failed`, `status code`) |
| 내부 URL·토큰·헤더 | 노출 없음 |
| 진단 로그 | 기존 패턴대로 `console.warn` 만 (`extractApiError` 결과) |

화면에는 **고정 한국어 문구만** 표시된다.

## 7. mutation 오류 처리 — 무변경

`create` / `update` / `remove` 와 `commissionErrorMessage()`, validation 문구는 **일절 접촉하지 않았다.**
스모크에서 생성 폼 validation(`제품을 선택해 주세요.`)이 그대로 동작함을 확인했다.

## 8. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/lib/api/supplier.ts` | `getCommissions()` throw 계약 + sentinel export |
| `services/web-neture/src/pages/supplier/SupplierPartnerCommissionsPage.tsx` | `loadError` 상태 · `allSettled` · 오류 카드 · 다시 시도 |

합계 2 files, +66 / −9.

| 항목 | 값 |
|------|-----|
| backend 변경 | **0** |
| DB 변경 / migration | **0 / 0** |
| POST·PUT·DELETE 계약 | **무변경** |
| 수수료 계산·저장 단위·상태 파생(`getStatus`) | **무변경** |
| dependency / lockfile | **무변경** |
| 공통 API wrapper(`apiClient`, `authClient`) | **무접촉** |
| 타 서비스 소비처 | 영향 0 (소비처 1곳) |

## 9. 테스트

`services/web-neture` 에는 **테스트 인프라가 없다** — `package.json` 에 `test` 스크립트 없음, vitest/jest/testing-library/msw 의존성 0, `*.test.*` 파일 0.
WO §12·§16(의존성 추가 금지)에 따라 단위 테스트를 추가하지 않고 **Playwright route interception + 코드 검증**으로 대체했다.

## 10. Playwright 오류 주입 결과

### 실행 방식

프로덕션 API 는 `localhost` 오리진을 CORS 로 차단한다(실측: `No 'Access-Control-Allow-Origin' header`).
따라서 `vite preview` 로컬 서버로는 로그인 자체가 불가능하다.

→ **배포 전 검증**: Playwright 로 `https://neture.co.kr/**` 요청만 가로채 **로컬 `dist` 를 실제 오리진으로 서빙**하고,
API(`api.neture.co.kr`)는 실제 프로덕션을 그대로 사용했다. 오리진이 동일하므로 로그인·인증이 정상 동작한다.
오류 주입은 **클라이언트 측 interception** 이며 backend 를 중단·조작하지 않는다.

주입 대상: `GET **/neture/supplier/partner-commissions` (목록 GET 한정, mutation 경로 미주입)

동일 스크립트를 **두 번** 실행했다: ① 배포 전(로컬 `dist` 서빙) ② 배포 후(프로덕션 번들 `neture-web-01313-qr4`).
아래 결과는 **양쪽 모두 동일하게 20/20 PASS**.

### 결과 — 20/20 PASS

| 시나리오 | 검증 | 결과 |
|----------|------|:---:|
| **A. 정상 200 + 0건** | 빈 상태 문구 표시 | PASS |
| | 오류 문구 미표시 | PASS |
| | 다시 시도 버튼 미표시 | PASS |
| **B. 500 주입** | `수수료 정책을 불러오지 못했습니다.` 표시 | PASS |
| | `잠시 후 다시 시도해 주세요.` 표시 | PASS |
| | **빈 상태 문구 미표시 (핵심)** | PASS |
| | 다시 시도 버튼 1개 표시 | PASS |
| | 서버 원문 `INTERNAL_ERROR` 미노출 | PASS |
| | `HTTP_5`·`AxiosError`·`status code` 미노출 | PASS |
| **C. 다시 시도 (실패 지속)** | 오류 상태 유지 | PASS |
| | 빈 상태 문구 여전히 미표시 | PASS |
| **D. 다시 시도 (복구)** | 오류 문구 해제 | PASS |
| | 정상 빈 상태 복귀 | PASS |
| | 다시 시도 버튼 사라짐 | PASS |
| **E. 200 + 비배열 payload** | 조회 실패로 처리 | PASS |
| | 빈 상태 문구 미표시 | PASS |
| **F. mutation 무변경** | 생성 폼 제목 정상 | PASS |
| | validation `제품을 선택해 주세요.` 유지 | PASS |
| | **운영 데이터 write 요청 0건** | PASS |

**텔레메트리**: page error 0 · 주입분 외 4xx/5xx 0 · mutation 요청 0.
console error 2건은 **주입한 500 자체**에 대한 브라우저 기본 로그이며 결함이 아니다(정상 시나리오 A·D 에서는 0).

자격증명은 `docs/local/TEST-ACCOUNTS.local.md` 에서 스크립트가 직접 읽고, 명령행·로그에 남기지 않았다.

## 11. 반응형 (오류 카드)

| 뷰포트 | 가로 overflow | 다시 시도 버튼 |
|--------|:---:|------|
| Desktop 1440×900 | 없음 | 118×43 |
| Tablet 768×1024 | 없음 | 118×43 |
| Mobile 390×844 | 없음 | 118×43 (터치 타깃 충분, 겹침·잘림 없음) |

문구 잘림 없음. 오류 카드는 헤더/폼과 겹치지 않는다.

## 12. build / 배포 / 프로덕션 smoke

| 항목 | 결과 |
|------|:---:|
| `pnpm --filter @o4o/web-neture build` (`tsc && vite build`) | **PASS** (19.00s) |
| `pnpm --filter @o4o/web-neture test` | 실행 불가 — test 스크립트 없음 (§9) |
| commit | `6406c8125` |
| 배포 run | 30158469861 (push, sha `6406c8125`) — `detect-changes` success · `deploy-neture` **success** (타 3서비스 skipped) |
| Cloud Run revision | `neture-web-01312-rpg` → **`neture-web-01313-qr4`** |
| 프로덕션 재검증 | §10 시나리오 A~F 전체를 **배포된 프로덕션 번들 기준으로 재실행 → 20/20 PASS** (배포 전 로컬 dist 검증 결과와 동일) |

## 13. 실데이터 제한

| 항목 | 상태 | 사유 |
|------|:---:|------|
| 데이터 1건 이상일 때 표/카드 렌더 | **미확인** | 검증 계정에 수수료 정책 0건. WO §16 "테스트 데이터 생성" 금지에 따라 만들지 않았다 |
| 실제 backend 500 상황 | **미재현** | 운영 backend 를 고의로 중단하지 않는다(§13). 클라이언트 interception 으로 동등 검증 |

## 14. 후속 항목

| # | 항목 |
|---|------|
| 1 | `supplierApi.getProducts()` 도 실패를 `[]` 로 삼킨다. 이 화면에서는 폼 select 가 조용히 비는 정도지만, **소비처가 여러 곳**이라 동일 계약 정비는 별도 WO 필요(본 WO §15 범위 밖) |
| 2 | 데이터 1건 이상 확보 후 표·상태 배지·수정 폼 프리필 검증 (선행 CHECK 후속 항목과 동일) |
| 3 | web-neture 테스트 인프라(vitest + testing-library) 도입 검토 — 도입되면 본 WO §12 시나리오를 단위 테스트로 고정 가능 |
