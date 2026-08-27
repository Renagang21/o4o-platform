# WO-O4O-GLYCOPHARM-AI-REPORT-MOCK-RETIRE-OR-REALDATA-CONTRACT-CLOSURE-V1

GlycoPharm `/operator/ai-report` 가 실제 운영 기능인지 mock 화면인지 확정한다.

- 기준: `origin/main` `20dd1e09e`
- 작업 브랜치: `work/glyco-ai-report-mock-retire-v1`
- 시작 시점 main 은 다른 세션의 dirty 파일(`scripts/audit/check-block-registry.ts` 등)이 있어, **그 파일을 만지지 않도록 별도 worktree 에서 작업**했다.

---

## 1. 체인 census — 현재 코드에서 재확인

직전 WO 의 "mock 상수" 판정을 재사용하지 않고 다시 추적했다.

    메뉴        services/web-glycopharm/src/config/operatorMenuGroups.ts:101  { label: 'AI 리포트', path: '/operator/ai-report' }
    route       services/web-glycopharm/src/App.tsx:895                      <Route path="ai-report" element={<AiReportPage />} />
    page        services/web-glycopharm/src/pages/operator/AiReportPage.tsx  wrapper — @o4o/ui + config 주입
    config      services/web-glycopharm/src/pages/operator/aiReportConfig.tsx
    공통 UI      packages/ui/src/pages/operator/AiReportPage.tsx              AiReportPage({ config })
    API client  없음
    backend     없음
    DB source   없음

GlycoPharm 소스 전체에서 `ai-report` 진입점은 **위 3곳뿐**이다(메뉴 · route · wrapper 내 라벨). 별도 hub 카드나 딥링크 없음.

**backend 계약 0건 실측**: `apps/api-server/src` 전체에 `context_asset` / `ContextAsset` 참조 **0건**.
이 리포트가 표시하는 "Context Asset 노출 분석" 을 만들어 낼 수집·저장·집계 경로가 존재하지 않는다.

**표시 값 실측** (`aiReportConfig.tsx`, 155줄):

    kpiData        7d/30d/90d 하드코딩 — 1,456 / 4,523 / 178, 증감률까지 상수
    exposureData   가상 제품 "글루코스밸런스 프로" 등
    operatorInsights  가상 약국 "서초 건강약국" 조회 감소 추세 …
    qualitySignals    relatedAssets: ['프로바이오틱스 골드', '마그네슘 400mg', '코엔자임Q10']
    avgExposureChangePercent: 5.8

전부 상수다. fetch/axios/API client 호출 **0건**.

### 타 서비스 AI report 계약 비교 (핵심)

`/operator/ai-report` 는 GlycoPharm 전용이 아니라 **4개 서비스 공통 기능**이다(`WO-O4O-AI-REPORT-PAGE-COMMONIZATION-V1`).

| 서비스 | config | `mode` |
|---|---|:--:|
| Neture | `netureAiReportConfig` | `empty` |
| KPA-Society | `kpaSocietyAiReportConfig` | `empty` |
| K-Cosmetics | `kCosmeticsAiReportConfig` | `empty` |
| **GlycoPharm** | `glycopharmAiReportConfig` | **`full` (mock)** |

K-Cosmetics config 헤더 주석이 그 전환 근거를 그대로 담고 있다:

> `WO-O4O-OPERATOR-CROSSSERVICE-PRODUCTION-INTEGRATION-AND-REAL-USAGE-E2E-V1`:
> 기존 `mode: 'full'` + 하드코딩 Mock 데이터를 제거하고 empty mode 로 정렬한다. …
> canonical 은 이미 KPA-Society · Neture 가 쓰는 empty mode 다.

즉 **GlycoPharm 은 이미 결정된 계약의 미이행 잔여분**이다. UNJUDGED = 0.

---

## 2. 판정 — B. RETIRE_DEAD_OR_MOCK

A(REAL_DATA_ADOPTION) 조건 5개 중 **하나도 충족하지 않는다.**

| A 조건 | 실측 |
|---|:--:|
| 실제 backend read contract 존재 | ✕ (`context_asset` 0건) |
| GlycoPharm service scope 가능 | ✕ (scope 를 걸 데이터 자체가 없음) |
| 실데이터 source 명확 | ✕ |
| 타 서비스 데이터와 격리 가능 | ✕ |
| 기존 공통 UI 에 adapter/config 로 연결 가능 | ✕ (연결할 소스 없음) |

B 조건은 전부 충족한다: backend contract 0 / 표시 값 하드코딩 / 실데이터 source 신설 필요 / 격리에 schema·migration 필요 / 실제 사용 근거 없음.

### B 의 실행 형태 — 명시적 판단

WO §3-B 체크리스트는 `메뉴 제거 / route 제거 / mock config 제거 / dead API·client 제거 / consumer 0` 이다.
이 중 **mock config 제거 · dead API/client 0 · consumer 0** 은 그대로 이행한다.
**메뉴·route 는 제거하지 않는다.** 근거:

1. `/operator/ai-report` 는 GlycoPharm 전용 화면이 아니라 4서비스 공통 route 다. GlycoPharm 만 route 를 지우면 §4 가 금지한 "타 서비스 report 계약을 억지 복사" 의 반대 방향으로 **공통 계약을 깨는** 결과가 된다.
2. 동일 문제(=`mode: 'full'` mock)를 앞서 처리한 K-Cosmetics 는 **메뉴·route 를 유지하고 config 만 empty mode 로 전환**했고, 그것이 Neture · KPA 와 같은 canonical 이다. GlycoPharm 만 다른 형태로 은퇴시키면 4서비스 계약이 다시 갈라진다.
3. `packages/ui` 공통 컴포넌트는 empty mode 를 **정식 상태로 구현**하고 있다(`AiReportPage.tsx:397` `if (config.mode === 'empty')` → `EmptyState` "분석 데이터 준비 중"). dead link 가 아니라 정의된 계약이다.

따라서 B 의 canonical 형태는 **empty mode 정렬**이다. 이는 "mock 숫자를 다른 상수로 교체" 가 아니다 — 숫자를 **표시하지 않는다.**

---

## 3. 수정

변경 파일 **1개**.

    services/web-glycopharm/src/pages/operator/aiReportConfig.tsx   155줄 → 36줄

- `mode: 'full'` → `mode: 'empty'`
- `kpiData` · `exposureData` · `reasonData` · `dailyTrendData` · `qualitySignals` · `operatorInsights` · `avgExposureChangePercent` **전량 삭제** (mock 상수 0)
- `assetTypes: []` (empty mode 에서 미렌더 — 3개 서비스와 동일), `lucide-react` 아이콘 import 제거
- `theme: 'green'` 과 GlycoPharm 문구(`제품, 약국, 콘텐츠, 공급사`)는 유지
- `emptyStateDescription` 추가 — 3개 서비스와 동일 문구

**하지 않은 것**: 랜덤/가짜 데이터 0, 다른 상수로 교체 0, 기존 analytics 수치 재포장 0, DB schema/migration 0, 새 AI 집계 시스템 0, 타 서비스 계약 복사 0.

### 유지된 실기능

wrapper 가 주입하는 `headerActions = <AiSummaryButton contextLabel="AI 리포트 분석" serviceId="glycopharm" />` 는 그대로 둔다.
`@o4o/ai-components` 의 실제 동작 컴포넌트이고, 공통 페이지가 empty mode 에서도 `headerActions` 를 렌더하도록 이미 처리돼 있다(`AiReportPage.tsx:405-411`, K-Cosmetics 전환 때 같은 이유로 추가됨). wrapper 파일은 무변경.

---

## 4. 공통 컴포넌트 영향 (§5)

- `packages/ui` **무변경**. `AiReportPage` 는 4서비스가 모두 사용 중이므로 삭제 대상이 아니다.
- 제거 대상은 GlycoPharm 전용 config 의 mock 상수뿐이며, 그 상수들의 consumer 는 같은 파일 안의 `glycopharmAiReportConfig` **하나뿐**이었다 → consumer 0 확인.
- `packages/types/src/operator-routes.ts:26` 의 `AI_REPORT: '/operator/ai-report'` 상수는 참조처가 없지만 route 자체가 유지되므로 dead 가 아니다. 무변경.
- 공통 파일을 건드리지 않았으므로 §7 의 "공통 파일 수정 시 4서비스 회귀" 조건에는 해당하지 않는다. 그럼에도 4서비스 config 를 전수 비교해 GlycoPharm 외에는 `mode: 'full'` 이 없음을 확인했다.

---

## 5. 검증 (§7 회귀)

| 항목 | 결과 |
|---|---|
| `pnpm --filter @o4o/ui run type-check` | **exit 0** |
| `node scripts/dev.mjs type-check:frontend` | **OK** (admin-dashboard · web-account · glycopharm · k-cosmetics · kpa-branch · kpa-society · neture · pharmacy-hub 전체) |
| `pnpm --filter glycopharm-web run build` | **✓ built in 39.14s** |
| ESLint `aiReportConfig.tsx` | **0 problems** |

> 실측 메모(숨기지 않고 기록): 새 worktree 의 첫 `type-check:frontend` 는 8건 실패했다. 원인은 전부
> `Cannot find module '@o4o/auth-utils' / @o4o/lms-client / @o4o/forum-core / @o4o/organization-care …'`
> 즉 **워크스페이스 패키지 미빌드**였고, 이번 변경과 무관하다(`aiReportConfig.tsx` 관련 오류 0건).
> 해당 패키지들을 빌드한 뒤 재실행해 `type-check:frontend: OK` 를 얻었다.

KPA / K-Cosmetics / Neture AI report 는 config 무변경이며 type-check 전수 통과. 공통 `@o4o/ui` 도 무변경.

---

## 6. Production E2E (배포 후 실측)

- 배포: `Deploy Web Services (Cloud Run)` `fbcd9550d` **success**
- 절차: 로그인 → `/operator/ai-report` deep link → **hard refresh** → 본문·네트워크·콘솔 수집
- mock 문자열 탐지: `글루코스밸런스 프로` · `서초 건강약국` · `프로바이오틱스 골드` · `1,456` · `4,523` · `수분크림 글로우`

| 서비스 | 뷰포트 | 메뉴 `AI 리포트` | `분석 데이터 준비 중` | mock 문자열 | white screen | JS exception | 4xx/5xx |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|
| **GlycoPharm** | **1440×900** | ○ | ○ | **0** | ✕ | **0** | 0 / 0 |
| **GlycoPharm** | **390×844** | ○ | ○ | **0** | ✕ | **0** | 0 / 0 |
| K-Cosmetics | 1440×900 | ○ | ○ | 0 | ✕ | 0 | 0 / 0 |
| KPA-Society | 1440×900 | ○ | ○ | 0 | ✕ | 0 | 4 / 0 (아래 주) |
| Neture | 1440×900 | ○ | ○ | 0 | ✕ | 0 | 0 / 0 |

GlycoPharm 실측 본문(1440×900):

    … 공통 분석 AI 리포트 운영 분석 시스템
    AI/Context Asset 리포트   AI 응답에서 노출된 Context Asset 현황을 분석합니다   [AI 요약]
    Context Asset은 AI 응답에 포함된 제품, 약국, 콘텐츠, 공급사 정보입니다. …
    분석 데이터 준비 중

- **가짜 KPI·가짜 제품명·가짜 약국명이 화면에서 사라졌다.** `mock operational UI = 0`.
- `AI 요약`(=`AiSummaryButton`) 은 empty mode 에서도 렌더된다 → **실기능 회귀 0**.
- deep link · hard refresh 모두 `/operator/ai-report` 유지. dead link 0, unexpected 404/redirect 0.

> KPA-Society 의 4xx 4건은 `/api/v1/public/services/kpa-society/policies/{terms,privacy}` ·
> `/api/v1/kpa/legal/documents/published/{terms,privacy}` 404 다. AI 리포트와 무관한 **약관/개인정보 문서 미등록**
> 이슈이고, 이번 변경은 KPA 파일을 건드리지 않는다. 범위 밖이므로 수정하지 않고 그대로 기록한다.

---

## 7. 완료 기준 판정

```text
UNJUDGED                    = 0
mock operational UI         = 0
dead menu                   = 0   (4서비스 공통 route 유지 — §2 근거)
dead route                  = 0
unexpected 403/404/500      = 0   (GlycoPharm 기준. KPA 약관 404 는 범위 밖·기존 이슈로 명시)
cross-service leak          = 0   (표시 데이터 자체가 없음)
```

```text
GLYCOPHARM_AI_REPORT_CONTRACT = CLOSED
PRODUCTION_E2E                = PASS
MUST_FIX_BEFORE_CLOSE         = 0
```

### 잔여 (별도 WO 권장, 종료를 막지 않음)

1. **`@o4o/ui` `AiReportPage` 의 full mode 가 현재 consumer 0.** 4서비스가 모두 empty mode 가 되면서 full 렌더 경로(약 300줄)가 미사용이 됐다. 실데이터 연동 WO 가 다시 쓸 자산이므로 이번에 삭제하지 않았다. 실데이터 계획이 확정되지 않으면 제거 검토 대상.
2. **AI 응답 분석 인프라 부재.** Context Asset 수집·저장·집계가 없어 4서비스 전부 empty 다. 실데이터 연동은 인프라 WO 선행 필요.
3. KPA-Society 약관/개인정보 문서 404 4건 (위 주석).
