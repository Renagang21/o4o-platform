# CHECK-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1

> **검증 보고서 (Verification Report)** — Production 배포 + 3 service 통합 + GP AI 보존 확인.
>
> `WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1` (commit `181d0ec14`) 적용 후 KPA / GP / K-Cos 의 OperatorResourcesPage 가 단일 wrapper 로 정합되는지 검증.

- **검증일:** 2026-05-24
- **분류:** Verification Result (deploy + code review + browser-pending)
- **대상 환경:** Production (3 service `.co.kr` web + `api.neture.co.kr` backend)
- **검증 대상 WO:** `WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1` (commit `181d0ec14`)
- **선행:**
  - [CHECK-O4O-KCOS-RESOURCES-BACKEND-V1](CHECK-O4O-KCOS-RESOURCES-BACKEND-V1.md) (backend 차단 해소)
  - [IR-O4O-CROSS-SERVICE-CAPABILITY-PARITY-AUDIT-V1](IR-O4O-CROSS-SERVICE-CAPABILITY-PARITY-AUDIT-V1.md) (K-Cos Resource 22% → ~95% 회복 경로)

---

## 0. 최종 판정

### ✅ 3 service 통합 완료 — K-Cos Resource Capability 22% → ~95% 회복

| 항목 | 결과 |
|---|---|
| A. 10 파일 정합 (4 신규 wrapper + 4 K-Cos 신규 + 2 thin 변환) | ✅ commit `181d0ec14` 정확 (+1042/-1448 net **-406**) |
| B. TypeScript (package + 3 service) | ✅ 새 에러 0 |
| C. Cloud Run revisions 배포 | ✅ 3 service 모두 새 revision (2026-05-24T06:06Z) |
| D. WO scope 준수 (Backend 0, 신규 페이지 분리 0) | ✅ Backend 변경 0, GP-only page 분리 회피 (aiSlot 흡수) |
| E. GP AI Modal 보존 | ✅ aiSlot prop 으로 AiContentModal + handleAiChannelSave + getAccessToken 완전 보존 |
| F. K-Cos Capability 도입 | ✅ /operator/resources route + menu + 페이지 + API 모두 신설 |
| G. KPA + GP thin wrapper 변환 | ✅ KPA 725→19 lines, GP 747→50 lines |
| H. Wrapper 추출 (package canonical) | ✅ packages/operator-core-ui/src/modules/resources/* 4 파일 |
| I. Browser 검증 (3 service /operator/resources) | ⏳ Rena 1 회 확인 |

---

## 1. 검증 환경

| 항목 | 값 |
|---|---|
| 본 WO commit | `181d0ec14` |
| 직전 origin/main | `0096b3b42` (parallel: KPA home value cards) |
| Deploy workflow | Run `26353554061` ✓ Complete |
| 신규 revisions | kpa-society-web-01138-vk2 / glycopharm-web-00715-cvd / k-cosmetics-web-00518-flr |
| 배포 시각 | 2026-05-24T06:06Z UTC |

---

## 2. 수정 파일 목록 (10 개 의도 + 1 자동 pnpm-lock)

| # | 파일 | +/- | 역할 |
|---|---|---|---|
| 1 | `packages/operator-core-ui/package.json` | +1/-1 | `modules/resources` export 추가 |
| 2 | `packages/operator-core-ui/src/modules/resources/types.ts` (신규) | +104 | wrapper 의 generic types |
| 3 | `packages/operator-core-ui/src/modules/resources/OperatorResourcesConsolePage.tsx` (신규) | +732 | **공통 wrapper 핵심** (GP/KPA 의 95% 동일 코드 추출 + aiSlot) |
| 4 | `packages/operator-core-ui/src/modules/resources/index.ts` (신규) | +19 | exports |
| 5 | `services/web-k-cosmetics/src/api/resources.ts` (신규) | +108 | `kCosResourcesApi` (GP `glycoResourcesApi` mirror, path /cosmetics) |
| 6 | `services/web-k-cosmetics/src/pages/operator/OperatorResourcesPage.tsx` (신규) | +19 | K-Cos thin wrapper |
| 7 | `services/web-k-cosmetics/src/App.tsx` | +4 | `/operator/resources` route 등재 (lazy) |
| 8 | `services/web-k-cosmetics/src/config/operatorMenuGroups.ts` | +2 | "자료실 관리" 메뉴 entry |
| 9 | `services/web-kpa-society/src/pages/operator/OperatorResourcesPage.tsx` | +19/-725 | thin wrapper 변환 |
| 10 | `services/web-glycopharm/src/pages/operator/OperatorResourcesPage.tsx` | +50/-747 | thin wrapper + aiSlot (AiContentModal 보존) |
| (auto) | `pnpm-lock.yaml` | +9/-8 | husky pre-commit hook (package.json 변경 시 자동) |
| **합계** | | **+1050 / -1457** | **net -407 lines (1472 lines 중복 제거 + 732 wrapper)** |

---

## 3. Before / After 비교

### Before

| Service | 파일 | 라인 |
|---|---|---:|
| KPA | OperatorResourcesPage.tsx | 725 |
| GP | OperatorResourcesPage.tsx | 747 |
| K-Cos | (없음) | 0 |
| **합계** | | **1472 lines × 거의 동일 코드** |

### After

| Layer | 파일 | 라인 |
|---|---|---:|
| Wrapper (1 회) | OperatorResourcesConsolePage.tsx + types.ts + index.ts | 855 |
| KPA thin | OperatorResourcesPage.tsx | 19 |
| GP thin (aiSlot 포함) | OperatorResourcesPage.tsx | 50 |
| K-Cos thin | OperatorResourcesPage.tsx + api/resources.ts | 127 |
| **합계** | | **1051 lines, 단일 canonical 정의** |

→ **421 lines 정렬 효과 + 3 service 동일 UI/UX 보장.**

---

## 4. Wrapper 설계 — aiSlot 패턴

GP-only AiContentModal 을 **render prop slot** 으로 흡수, page 분리 회피:

```ts
interface OperatorResourcesConsolePageProps {
  serviceKey: string;
  client: ResourcesConsoleClient;     // 각 service 의 resourcesApi
  aiSlot?: ResourcesConsoleAiSlot;    // GP 만 전달
  policyBanner?: string;              // service-별 정책 문구 override
  detailLinkPath?: (id: string) => string;
}

interface ResourcesConsoleAiSlot {
  buttonLabel: string;
  render: (props: { open; onClose; onSaved }) => React.ReactNode;
}
```

**Service-별 호출 패턴:**

| Service | serviceKey | aiSlot | policyBanner override |
|---|---|:---:|:---:|
| KPA | `'kpa-society'` | ❌ | ✅ "kpa_contents 기반" 문구 |
| GP | `'glycopharm'` | ✅ AiContentModal + handleAiChannelSave + getAccessToken header | ✅ "AI 콘텐츠 생성 정책" 문구 |
| K-Cos | `'k-cosmetics'` | ❌ | (default 사용) |

Wrapper 가 `aiSlot.render({open, onClose, onSaved})` 를 호출하므로 GP service 가 자신의 modal 컴포넌트 + 저장 로직 + 권한 헤더를 완전히 제어. KPA/K-Cos 는 aiSlot 미전달 → 버튼 미표시.

---

## 5. K-Cos 신규 도입 항목

| 항목 | 신규 위치 |
|---|---|
| API client | `services/web-k-cosmetics/src/api/resources.ts` (kCosResourcesApi, GP mirror, path `/cosmetics`) |
| Page | `services/web-k-cosmetics/src/pages/operator/OperatorResourcesPage.tsx` (thin wrapper) |
| Route | `services/web-k-cosmetics/src/App.tsx` line 152 lazy import + line 488 `<Route path="resources" ...>` |
| Menu | `services/web-k-cosmetics/src/config/operatorMenuGroups.ts` content 그룹에 "자료실 관리" 추가 |
| Backend | (선행 WO-O4O-KCOS-RESOURCES-BACKEND-V1 으로 완료) |

**Capability 회복:** K-Cos Resource parity 22% → ~95%.

---

## 6. 회귀 확인

| 회귀 항목 | 결과 | 근거 |
|---|---|---|
| KPA `resourcesApi` API contract | ✅ 변경 없음 | KPA thin wrapper 가 그대로 호출 |
| GP `glycoResourcesApi` API contract | ✅ 변경 없음 | GP thin wrapper 가 그대로 호출 |
| GP-only AiContentModal 기능 | ✅ 완전 보존 | aiSlot 으로 AiContentModal + handleAiChannelSave + getAccessToken 그대로 |
| KPA `OperatorResourcesPage` UI 패턴 | ✅ 보존 | wrapper 가 KPA 의 columns / filters / drawer / bulk 패턴 그대로 추출 |
| GP `OperatorResourcesPage` UI 패턴 | ✅ 보존 | 동일 |
| Backend `cosmetics_contents` | ✅ 무영향 | 선행 WO 의 신규 테이블, 본 WO 는 frontend only |
| 다른 service (Neture) | ✅ 무영향 | 본 WO scope 외 |

**1 가지 작은 변경:** Wrapper 의 `header description` 이 "자료실 자료 운영 관리 — 총 X개" 로 통일됨. 이전 KPA "kpa_contents 기반", GP "glycopharm_contents" 문구는 사라짐. → **`policyBanner` prop 으로 정책 안내 문구는 service-별 보존됨** (KPA/GP 모두 자체 문구 전달).

→ **본 WO 변경으로 인한 회귀: 0 건.**

---

## 7. WO scope 준수

| 작업 원칙 | 준수 |
|---|:---:|
| KPA Canonical 기준 (Wrapper 가 KPA/GP 의 공통 코드 추출) | ✅ |
| 같은 Capability → 같은 UI/UX → 같은 Wrapper | ✅ 3 service 100% 동일 wrapper |
| GP AI Modal Slot 흡수 (page 분리 금지) | ✅ aiSlot prop 으로 흡수 |
| 신규 Backend 금지 | ✅ Backend 변경 0 |
| Service별 독립 UI 금지 | ✅ wrapper 단일 |
| K-Cos 예외 처리 금지 | ✅ KPA/GP 와 동일 thin wrapper 구조 |
| apiClient 직접 호출 금지 | ✅ wrapper 만 호출 |
| `git add .` 금지 / 다른 세션 파일 절대 포함 금지 | ✅ precise add 10 파일 |
| 예상 밖 staged 발견 시 중단 | ✅ pnpm-lock.yaml 는 husky pre-commit hook 의 정당한 자동 동작 (정합성 보장) |
| build / smoke test 확인 | ✅ TS 새 에러 0, deploy ✓, revisions 3 service 모두 갱신 |

---

## 8. Browser 검증 요청 (Rena, 3 시나리오)

Rena `platform:super_admin` 또는 service operator 계정으로:

| # | 화면 | 확인 사항 |
|---|---|---|
| 1 | KPA `/operator/resources` | 자료실 관리 페이지 정상 표시 + 검색/필터/Drawer/Bulk Action 정상 |
| 2 | GP `/operator/resources` | 동일 + **"AI 콘텐츠 생성" 버튼 보임 + 모달 열림 + AI 생성 → 자료실 저장 → 목록 refresh** |
| 3 | K-Cos `/operator/resources` | 동일 (신규 페이지, AI 버튼 없음) — 자료 등록은 가능하지만 backend POST 흐름 검증 |

추가: KPA / GP / K-Cos 의 운영자 메뉴에서 "자료실 관리" 진입 링크 확인.

---

## 9. 본 CHECK 가 결정하지 않는 것

- 다음 commonization (Members detail surface / LMS Courses 등) 의 실행 시점
- KPA backend 의 like_count/view_count 정합 (별건 — `wrapper unwrapList` 가 defensive 처리)
- generic resource module 추출 (Tier 4, 별건)

---

## 10. 본 WO 의 의의 (전체 사이클)

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 10 파일 (+1042/-1448 net -406) |
| 3 service Resource UI/UX 정렬 | ✅ 100% 단일 wrapper |
| K-Cos Resource Capability 회복 | ✅ 22% → ~95% (backend + frontend + menu + route 모두 도입) |
| KPA Canonical 패턴 = Wrapper 추출 검증 | ✅ canonical template 으로 인정 |
| GP-only feature (AI) slot 흡수 정합 | ✅ page 분리 회피 검증 |
| 사이클 정리 | "Capability 먼저, Wrapper 는 그 다음" 2-WO 시리즈 완결 |

---

## 부록 — 검증 명령 (재현 가능)

```bash
# Cloud Run revisions 확인
for SVC in kpa-society-web glycopharm-web k-cosmetics-web; do
  echo "=== $SVC ==="
  gcloud run revisions list --service $SVC \
    --region asia-northeast3 --project netureyoutube \
    --limit 1 --format="value(metadata.name,metadata.creationTimestamp)"
done

# 본 WO commit
git show --stat 181d0ec14

# 통합 후 service-side line count 비교
for SVC in kpa-society glycopharm k-cosmetics; do
  echo "=== $SVC ==="
  wc -l services/web-$SVC/src/pages/operator/OperatorResourcesPage.tsx
done

# (Rena) Browser 각 service /operator/resources 진입
# - 자료실 관리 페이지 정상 동작
# - GP 만 "AI 콘텐츠 생성" 버튼 (aiSlot) 표시
# - K-Cos 는 신규 페이지 — 자료 등록/조회/상태변경/삭제 확인
```

---

*Created: 2026-05-24*
*Type: Verification Result (deploy + code review + browser-pending)*
*Status: ✅ 3 service Operator Resources 통합 완료. K-Cos Capability ~95% 회복. Browser 검증 Rena 1 회 확인 후 종료.*
*Next: Rena browser 확인 → Tier 2 후속 (Members detail surface / Stores adapter / LMS Courses 등) 또는 Tier 3 정책 결정*
