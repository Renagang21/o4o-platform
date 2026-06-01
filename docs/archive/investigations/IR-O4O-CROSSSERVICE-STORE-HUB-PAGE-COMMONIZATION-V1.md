# IR-O4O-CROSSSERVICE-STORE-HUB-PAGE-COMMONIZATION-V1

**유형:** 구조 결정 IR  
**작성일:** 2026-06-01  
**상태:** 완료  
**코드 변경:** 없음  
**전제:** Store HUB Cycle 1 기능 정렬 완료 상태 (6개 영역, 3서비스)

---

## 핵심 결론

**현 단계에서 공통 컴포넌트 추출은 보류가 적절하다.** 다음 근거:

1. 기능 정렬 완료와 공통 컴포넌트화 완료는 다른 단계 — 지금은 전자만 완료
2. Pop/QR은 GP↔K-Cos 간 ~96% 동일하지만, 공통화 이익 대비 추상화 비용이 현 단계에서 불명확
3. `ContentHubTemplate`(콘텐츠) 패턴이 올바른 방향 — 나머지 영역도 유사 패턴 채택 가능하지만 시급하지 않음
4. 1인 개발 환경에서 추상 레이어 추가는 속도보다 복잡도를 키울 수 있음

**단기 권장:** 현 service-local 상태 유지, `HubSignageLibraryTemplate` 1개만 장기 후보로 기록

---

## 1. 현재 service-local 복제 현황

### 파일 위치 및 라인 수

| 영역 | KPA | GlycoPharm | K-Cosmetics |
|------|-----|-----------|-------------|
| 상품 카탈로그 | `pharmacy/HubB2BCatalogPage.tsx` (793줄) | `hub/HubB2BCatalogPage.tsx` (368줄) | `hub/HubB2BPage.tsx` (369줄) |
| 블로그 | `pharmacy/HubBlogLibraryPage.tsx` (400줄) | `hub/HubBlogLibraryPage.tsx` (322줄) | `hub/HubBlogLibraryPage.tsx` (320줄) |
| POP | `pharmacy/HubPopLibraryPage.tsx` (374줄) | `hub/HubPopLibraryPage.tsx` (324줄) | `hub/HubPopLibraryPage.tsx` (320줄) |
| QR | `pharmacy/HubQrLibraryPage.tsx` (385줄) | `hub/HubQrLibraryPage.tsx` (324줄) | `hub/HubQrLibraryPage.tsx` (320줄) |
| 사이니지 | `pharmacy/HubSignageLibraryPage.tsx` (604줄) | `hub/HubSignageLibraryPage.tsx` (580줄) | `hub/HubSignagePage.tsx` (579줄) |
| 콘텐츠 | `pharmacy/HubContentLibraryPage.tsx` (171줄) | `hub/HubContentListPage.tsx` (206줄) | `hub/HubContentPage.tsx` (201줄) |

### 공통 패턴 사용 현황

| 패턴 | 상품 | 블로그 | POP | QR | 사이니지 | 콘텐츠 |
|------|------|--------|-----|-----|---------|--------|
| DataTable | ✅ 3서비스 | ✅ 3서비스 | ✅ 3서비스 | ✅ 3서비스 | ✅ 3서비스 | N/A |
| ActionBar | ✅ 3서비스 | ✅ 3서비스 | ✅ 3서비스 | ✅ 3서비스 | ✅ 3서비스 | N/A |
| BaseDetailDrawer | N/A | ✅ 3서비스 | ✅ 3서비스 | ✅ 3서비스 | ✅ 3서비스 | N/A |
| hubContentApi | N/A | ✅ 3서비스 | ✅ 3서비스 | ✅ 3서비스 | ✅ 3서비스 | ✅ 3서비스 |
| assetSnapshotApi.copy | N/A | N/A | N/A | N/A | ✅ 3서비스 | ✅ 3서비스 |
| importOperatorBlog/Pop/Qr | N/A | ✅ 3서비스 | ✅ 3서비스 | ✅ 3서비스 | N/A | N/A |
| ContentHubTemplate | N/A | N/A | N/A | N/A | N/A | ✅ 3서비스 |

---

## 2. 영역별 유사도 분석

### 2.1 사이니지 — 유사도 ~86%

KPA ↔ GlycoPharm diff: **86줄**. 주요 차이:
- 파일 헤더 주석 (WO 이름)
- `"내 매장에 추가"` vs `"내 약국에 추가"` (2곳)
- import 경로 (`../../api/` vs `@/api/`)
- `serviceKey` 명시 방식 (KPA 명시, GlycoPharm 자동 주입)

GlycoPharm ↔ K-Cosmetics diff: 거의 동일 (import 경로, 서비스 표현 정도)

### 2.2 POP / QR — 유사도 ~96% (GP↔K-Cos)

GlycoPharm `HubPopLibraryPage` (324줄) vs K-Cosmetics `HubPopLibraryPage` (320줄):
- 동일 패턴: `hubContentApi.list({ sourceDomain:'pop' })`, `importOperatorPop(slug, id)`, `getStoreSlug()`
- 차이: import 경로, 서비스 표현

KPA (374줄)는 `serviceKey: SERVICE_KEY` 명시 + slug 처리 방식이 약간 다름

### 2.3 블로그 — 유사도 ~85% (GP↔K-Cos)

동일 패턴: `importOperatorBlog(slug, id)`, `getStoreSlug()`, DataTable + ActionBar  
KPA는 `serviceKey` 명시 방식 차이 + 약간 더 복잡한 slug 로직

### 2.4 상품 카탈로그 — 유사도 낮음

KPA 793줄 vs GP/K-Cos 368-369줄: 규모 차이가 크다.  
KPA는 분회/약국 특성상 더 복잡한 필터, B2B 외 탭 구조.  
GP/K-Cos는 거의 동일.

### 2.5 콘텐츠 — 이미 `ContentHubTemplate` 공통화 완료

config-driven 패턴으로 이미 구조 공통화됨.  
서비스별 차이는 config 객체에만 존재.

---

## 3. 서비스별 유지해야 할 차이

| 항목 | KPA | GlycoPharm | K-Cosmetics |
|------|-----|-----------|-------------|
| serviceKey 명시 | `'kpa-society'` | 자동 주입 (`'glycopharm'`) | 자동 주입 (`'k-cosmetics'`) |
| assetSnapshot endpoint | `/kpa/assets/copy` | `/glycopharm/assets/copy` | `/cosmetics/assets/copy` |
| import path 규칙 | `../../api/` | `@/api/` | `@/api/` or `@/lib/api/` |
| 사용자 표현 | `'내 매장에'` | `'내 약국에'` (약국 정책) | `'내 매장에'` |
| 색상 테마 | slate (중립) | primary (blue) | pink |
| slug 로직 | 자체 복잡 구현 | `getStoreSlug()` | `getStoreSlug()` |
| Blog import | `importOperatorBlog` (공통 함수) | 동일 | 동일 |
| Pop/Qr import | `importOperatorPop/Qr` (공통 함수) | 동일 | 동일 |

---

## 4. 공통화 가능 영역 (장기 후보)

### 4.1 사이니지 — `HubSignageLibraryTemplate` (권장 1순위)

**이유:**
- KPA ↔ GP ↔ K-Cos가 600줄 기준 ~86% 동일
- `ContentHubTemplate` 성공 패턴을 그대로 적용 가능
- config 주입: `serviceKey`, `addLabel` (`'내 약국에'`/`'내 매장에'`), `storeLink`

**형태:**
```typescript
// packages/shared-space-ui/src/HubSignageLibraryTemplate.tsx
interface HubSignageLibraryConfig {
  assetSnapshotApi: { copy: (params) => Promise<any>; list: (params) => Promise<any>; }
  hubContentApi: { list: (params) => Promise<any>; }
  addLabel?: string;          // '내 매장에 추가' | '내 약국에 추가'
  storeSignageLink?: string;  // '/store/marketing/signage'
}
```

**주의:** `assetSnapshotApi`가 서비스마다 다른 endpoint를 씀 → 주입(prop drilling)으로 해결

### 4.2 POP + QR — `HubSlugImportTemplate` (권장 2순위)

**이유:**
- GP ↔ K-Cos가 ~96% 동일
- 공통 함수(`importOperatorPop`, `importOperatorQr`)가 이미 존재
- config 주입: `sourceDomain`, `importFn`, `addLabel`, `emptyMessage`

**KPA 제외 고려:** KPA는 slug 로직이 다르므로 초기에는 GP+K-Cos만 공통화, KPA는 기존 유지

### 4.3 블로그 — 보류 (중간 우선순위)

**이유:**
- POP/QR보다 구현이 약간 더 복잡 (content detail 보기 등)
- Blog slug 처리에 서비스별 미묘한 차이 존재
- POP/QR 공통화 후 패턴이 안정되면 재평가

---

## 5. 공통화 보류 영역

### 5.1 상품 카탈로그 — 서비스 차이 너무 큼

- KPA 793줄 vs GP/K-Cos 368줄 (2배 이상 차이)
- KPA는 약사회 조직 구조 반영, GP/K-Cos는 단순 상품 탐색
- 추상화 비용이 이익보다 큼

### 5.2 콘텐츠 — 이미 완료

`ContentHubTemplate` 공통화 완료. 추가 작업 불필요.

---

## 6. 공통화 위험 요소

| 위험 | 설명 | 완화 방법 |
|------|------|---------|
| import 경로 불일치 | KPA `../../api/` vs GP/K-Cos `@/api/` | 주입 패턴 사용 |
| assetSnapshot endpoint 차이 | 서비스마다 다른 endpoint | API 클라이언트 주입 |
| "내 약국" 표현 정책 | GlycoPharm 약국 전용 표현 유지 | `addLabel` prop |
| KPA slug 복잡도 | KPA HubBlog/Pop/Qr의 slug 로직이 다름 | KPA는 초기 제외 |
| 서비스 divergence | 공통화 후 특정 서비스만 기능 추가 시 | config-driven 설계로 확장 가능하게 |
| 과도한 추상화 | config prop이 많아지면 가독성 저하 | 2-3개 핵심 prop만 노출 |

---

## 7. 공통 컴포넌트 위치 후보

### 현재 가장 적합: `packages/shared-space-ui`

**이유:**
- 이미 `ContentHubTemplate`, `SignageHubTemplate`, `LmsHubTemplate`, `ResourcesHubTemplate` 존재
- Store HUB 관련 template이 모이는 위치로 정착됨
- `HubSignageLibraryTemplate`을 여기에 추가하면 자연스러운 확장

**비추: 별도 패키지 생성**

- `store-hub-ui` 패키지 신규 생성은 과도함
- 현재 `shared-space-ui`에 충분히 수용 가능

---

## 8. 후속 WO 우선순위 (전체 보류 전제)

현재는 **모두 보류**가 권장이지만, 추후 진행 시 순서:

```
1단계 (낮은 복잡도):
WO-O4O-STORE-HUB-SIGNAGE-LIBRARY-TEMPLATE-V1
  - shared-space-ui에 HubSignageLibraryTemplate 추가
  - GP + K-Cos 사이니지 페이지를 template 소비자로 전환
  - KPA는 기존 유지 (호환성)

2단계 (중간 복잡도):
WO-O4O-STORE-HUB-POP-QR-IMPORT-TEMPLATE-V1
  - GP + K-Cos Pop/QR 페이지를 shared template으로 추출
  - KPA는 기존 유지

3단계 (낮은 우선순위):
WO-O4O-STORE-HUB-BLOG-LIBRARY-TEMPLATE-V1
  - 블로그 공통화 (POP/QR 완료 후 평가)

4단계 (평가 불필요):
상품 카탈로그 — 서비스 차이 과대, 공통화 불필요
```

---

## 9. Current Structure vs O4O Philosophy Conflict Check

### ① service-local 병렬 복제가 O4O 공통 구조 원칙과 충돌하는가?

**아니다.** O4O 공통 구조 원칙은 "데이터/DB/API 레이어의 구조를 공유"하는 것이 핵심이며, 프론트엔드 컴포넌트의 service-local 복제는 허용된다. 현재 service-local 복제는 **코드 수준의 반복**이지 **구조 철학 위반**이 아니다. `ContentHubTemplate`이 보여주듯, 공통화는 점진적으로 진행하면 된다.

### ② 1인 개발 속도 관점에서 지금 공통화가 유리한가?

**아니다.** Store HUB Cycle 1이 기능 정렬을 완료한 직후다. 지금 공통 컴포넌트 추출을 하면:
- 추상화 설계 + 기존 3서비스 마이그레이션 + 테스트 비용 발생
- 이 비용은 현재 발생하는 drift 문제 대비 불균형하다

현재 service-local 복제는 **관리 가능한 규모**다. 6개 영역 × 3서비스 = 18개 파일이지만, 각 파일이 명확하고 독립적이다.

### ③ 공통화로 인해 서비스별 차이를 과도하게 복잡하게 만들 위험이 있는가?

**있다.** 특히:
- `assetSnapshotApi` endpoint가 서비스마다 다르므로 DI(의존성 주입) 필요
- "내 약국" vs "내 매장" 레이블이 prop화되면 가독성 저하
- Blog/Pop/Qr에서 KPA와 GP/K-Cos의 slug 처리 방식 차이가 추상화를 어렵게 만든다

### ④ Store HUB 핵심 가치 "매장 실행 자산 탐색·가져가기" 흐름이 유지되는가?

**유지된다.** service-local 여부와 무관하게, 현재 6개 영역 모두 탐색 → 선택 → 가져가기 흐름이 구현됨. 공통화가 이 흐름을 개선하는 것은 아니다.

### ⑤ Neture를 잘못 포함하지 않았는가?

포함하지 않았다. Neture는 Store HUB / 내 매장 기능이 없으므로 이번 IR 범위에서 명시적으로 제외.

---

## 최종 권장

```
현 단계 (Cycle 1 완료 직후):
service-local 상태 유지

장기 후보 (Cycle 2 또는 별도 WO):
1. HubSignageLibraryTemplate (shared-space-ui)
   → 사이니지 3서비스 공통화
   → 가장 유사도 높고, ContentHubTemplate 패턴 그대로 적용 가능

2. HubSlugImportTemplate (shared-space-ui)
   → Pop + QR GP/K-Cos 공통화
   → KPA는 이후 평가

모니터링 기준:
"서비스별 기능 차이가 커서 sync가 어렵다"는 피드백이 나올 때 공통화 재검토
```

---

## 읽은 파일 (코드 변경 없음)

- `services/web-kpa-society/src/pages/pharmacy/Hub*.tsx` (6개)
- `services/web-glycopharm/src/pages/hub/Hub*.tsx` (8개)
- `services/web-k-cosmetics/src/pages/hub/Hub*.tsx` (7개)
- `packages/shared-space-ui/src/` (디렉토리)
- `packages/operator-ux-core/src/` (디렉토리)
