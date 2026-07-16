# CHECK-O4O-MULTILINGUAL-LANGUAGE-UI-CONSOLIDATION-V1 — 언어 UI 라벨 SSOT + 터치 44px

WO: `WO-O4O-MULTILINGUAL-LANGUAGE-UI-CONSOLIDATION-V1` · 일자: 2026-07-16 · 상태: 완료
대상: [OTC 디자인 GUIDE §5·§8-C](../guides/OTC-DESCRIPTION-DESIGN-GUIDE.md) · 선행: [8B-RENDER-PATH-AUDIT](CHECK-O4O-OTC-DESIGN-8B-RENDER-PATH-AUDIT-V1.md)

> **DB write 0** · SPD 렌더 구조 변경 **0** · 번역 콘텐츠 변경 **0** · 언어 추가 **0** · **라벨 문구·순서 불변**.
> 변경 파일 **1개** (`MultilingualProductPublicLandingPage.tsx`).

---

## 1. 결론

> **D 랜딩 언어 UI 정리 완료** — 로컬 라벨 제거(SSOT 사용) · 모바일 터치 **~30px → 44px** · 선택 상태 색 의존 해소.
> **16/16 PASS** (7개 로케일 전량 × 4폭 × 100/200%).
> ⚠️ **전수 확인에서 더 큰 사실이 나왔다: 라벨 정의는 4곳이 아니라 9곳이고, 그중 2곳은 값까지 다르다** (§3).
> 그 8곳 통합은 **4서비스+백엔드 Shared Module 변경**이라 이번 WO 범위 밖 — **기록만** 했다.

---

## 2. 변경 — 1파일

### 2-1. 라벨 SSOT 단일화

```diff
 import {
   resolvePublicMlc,
+  STORE_MLC_LOCALE_LABELS,
   type PublicMlcResolve,
   type StoreMlcLocale,
 } from '../../api/multilingualProductContentStore';
-
-const LOCALE_LABELS: Record<string, string> = {
-  ko: '한국어', en: 'English', zh: '中文', ja: '日本語', vi: 'Tiếng Việt', th: 'ภาษาไทย', id: 'Bahasa',
-};
```

**동작 무변경이 증명된다**:

| 확인 | 결과 |
|---|---|
| 값 일치 | 로컬 7개 = SSOT 7개 **완전 동일** (ko/en/zh/ja/vi/th `ภาษาไทย`/id `Bahasa`) |
| 이미 같은 모듈 사용 중 | 이 파일은 **이미** `StoreMlcLocale` 타입을 같은 모듈에서 import 하고 있었다 — 라벨만 재정의한 순수 중복 |
| 타입 안전 | `availableLocales: StoreMlcLocale[]` 로 인덱싱 → `Record<StoreMlcLocale, string>` 과 정합 |
| 순서 | 라벨은 `Record` 조회용일 뿐 순서를 만들지 않는다. 순서는 **서버의 `availableLocales`** 가 결정 → **불변** |

### 2-2. 모바일 터치 44px

```diff
-  className={`px-3 py-1.5 text-xs rounded-full border ${...}`}
+  aria-pressed={active}
+  className={`inline-flex items-center justify-center min-h-[44px] px-3.5 text-xs rounded-full border ${
+    active ? '... font-semibold' : '...'}`}
```

`py-1.5`(고정 높이) 대신 **`min-h-[44px]` + 수직 중앙정렬** — 글자 크기(`text-xs`)를 키우지 않고 터치 영역만 넓힌다. 태블릿 버튼(이미 44px)에도 `aria-pressed`·굵기를 동일 적용해 두 표면을 맞췄다.

### 2-3. 선택 상태 — 색 의존 해소 (신설 규칙 아님)

GUIDE **§6 "의미 전달을 색에만 의존하지 않는다"** 의 적용이다. 새 규칙을 만들지 않았다.

| 축 | 근거 |
|---|---|
| **명도** | 선택 `bg-slate-900` vs 미선택 `bg-white` → **명도비 17.85:1**. 색맹은 **색조**를 구분 못 할 뿐 **밝기**는 본다 → 이 축만으로도 이미 색 의존이 아니다 |
| **굵기** | 선택 시 `font-semibold` — 시각적 이중화 |
| **의미** | `aria-pressed` — **스크린리더 전달**. 기존엔 라벨만 읽히고 선택 여부가 안 읽혔다(실제 결함) |

---

## 3. 전수 확인 — **라벨 정의 9곳 · 값 불일치 2곳**

GUIDE 는 "4곳 중복"으로 적고 있었으나 **실측은 9곳**이다.

| 파일 | 상수 | `th` | `id` |
|---|---|---|---|
| **`api/multilingualProductContentStore.ts:31`** | **`STORE_MLC_LOCALE_LABELS`** — 매장 축 SSOT | `ภาษาไทย` | `Bahasa` |
| `api/operatorMultilingualContent.ts:28` | `OPERATOR_MLC_LOCALE_LABELS` — **운영자 축**(타입 `OperatorMlcLocale` 별개) | `ภาษาไทย` | `Bahasa` |
| `pages/public/MultilingualProductPublicLandingPage.tsx` | ~~`LOCALE_LABELS`~~ → **SSOT 사용 (본 WO)** | — | — |
| `components/MultilingualContentBadge.tsx:17` | `LOCALE_LABELS` | `ภาษาไทย` | `Bahasa` |
| **`components/store/StoreAssetSelectorModal.tsx:110`** | `MLC_LOCALE_LABELS` | **`ไทย`** ❌ | **`Indonesia`** ❌ |
| `pages/pharmacy/HubMultilingualContentLibraryPage.tsx:33` | `LOCALE_LABELS` | `ภาษาไทย` | `Bahasa` |
| `pages/pharmacy/StoreMultilingualContentsMyPage.tsx:25` | `LOCALE_LABELS` | `ภาษาไทย` | `Bahasa` |
| `pages/pharmacy/StoreDescriptionViewModal.tsx:31` | `LANG_LABELS` | `ภาษาไทย` | `Bahasa` |
| **`web-neture/pages/ProductLandingPage.tsx:55`** | `LOCALE_LABELS` | `ภาษาไทย` | **`Bahasa Indonesia`** ❌ |
| `packages/tablet-kiosk-core/TabletKioskPage.tsx:76` | `LOCALE_LABELS` | `ภาษาไทย` | `Bahasa` |
| `api-server/services/qr-print.service.ts:329` | `QR_LANG_LABEL` — 백엔드 | `ภาษาไทย` | `Bahasa` |

> **같은 언어가 화면마다 다르게 불린다**: 태국어 `ภาษาไทย` / `ไทย` · 인도네시아어 `Bahasa` / `Bahasa Indonesia` / `Indonesia`.
>
> **정정하지 않았다** — WO 가 "라벨 문구 변경 금지"이고, 통합은 **4서비스 + 백엔드**에 걸친 Shared Module 변경이라 소비처 전수 영향 분석이 선행돼야 한다(CLAUDE.md §1). `OPERATOR_MLC_LOCALE_LABELS` 는 타입 축이 달라 **단순 병합 대상도 아니다** — 통합이냐 병존이냐가 설계 판단이다.

---

## 4. 검증 — **16/16 PASS**

소스에서 **실제 className 을 추출**해 렌더(하드코딩 아님), 라벨은 **SSOT 에서 추출한 7종 전량**. 4폭 × (100% / 200%줌).

| 항목 | 태블릿 헤더 | 모바일 pill | 판정 |
|---|---:|---:|:---:|
| **최소 높이** | **46px** | **44px** (이전 ~30px) | ✅ |
| 최소 너비 | 74px | 54px | ✅ (≥44) |
| **200% 확대** | 92px | 88px | ✅ |
| **명도비** | **17.85:1** | **17.85:1** | ✅ |
| 굵기 구분 | ✅ | ✅ | ✅ |
| `aria-pressed` | 전 버튼 | 전 버튼 | ✅ |
| 텍스트 넘침 | **0** | **0** | ✅ |
| 가로 스크롤 | **0** | **0** | ✅ |

- **긴 언어명·다국어 조합**: 7개 동시 렌더 → 375px 에서 **2~3줄 접힘**, 200%에서 4~7줄. **넘침·가로 스크롤 0**
- **키보드**: 포커스 가능 · `outline:auto 1px` **브라우저 기본 유지**(제거 안 됨) · Tab 으로 다음 언어 이동 확인
- **언어 전환 회귀 0**: `switchLocale` · URL `?locale=` · `?mode=tablet` · fallback 표시 — **전부 미변경**

### 4-1. typecheck / build

| 대상 | 결과 |
|---|---|
| `web-kpa-society` typecheck | ✅ **exit 0** |
| `web-kpa-society` build | ✅ **exit 0** (built in 21.00s) |

> 변경이 **1개 서비스의 1개 페이지**에 갇혀 있어 타 서비스 영향 없음(공유 패키지 미변경).

---

## 5. 문서 반영

| 문서 | 변경 |
|---|---|
| [OTC 디자인 GUIDE](../guides/OTC-DESCRIPTION-DESIGN-GUIDE.md) **V0.8 → V0.9** | §5 중복 **4곳 → 9곳** 정정 · **§5-1 신설**(값 불일치 표) · D 터치 44px 반영 · 색 의존 금지를 **§6 기존 규칙의 적용**으로 연결 · **§8-C 부분 해소** |
| [디자인 TEST-LOG](../guides/OTC-DESCRIPTION-DESIGN-TEST-LOG.md) **V0.7 → V0.8** | **D-11** 기록 |

**중복 규칙 신설 0** — 44px 은 §5 에 이미 있던 기준(D 가 못 지키던 것), 색 의존 금지는 §6 기존 규칙. 새로 만든 것은 **기준이 아니라 §5-1 실측 기록**이다.

---

## 6. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| `LOCALE_LABELS` SSOT 단일화 | ✅ D 랜딩 로컬 정의 제거 (⚠️ 저장소 전체로는 8곳 잔존 — §3) |
| 모바일 터치 영역 44px 이상 | ✅ **44px** (200%에서 88px) |
| 언어 전환 회귀 없음 | ✅ 동작 코드 미변경 · 라벨 값 동일 · 순서 서버 결정 |
| 반응형 검증 통과 | ✅ **16/16** (375·768·1024·1280·200%) |
| typecheck·build 결과 기록 | ✅ §4-1 |
| commit·push | ✅ |
| 제외 준수 (SPD·번역·DB·언어추가·재설계) | ✅ 전부 미변경 |

---

## 7. 남은 것

| 항목 | 비고 |
|---|---|
| **라벨 정의 8곳 통합 + 값 불일치 2곳 정정** | `ไทย`→`ภาษาไทย` · `Indonesia`/`Bahasa Indonesia`→`Bahasa`. **4서비스+백엔드 Shared Module WO** 필요. `OPERATOR_MLC_LOCALE_LABELS` 병존 여부는 설계 판단 |
| 언어 전환 **공통 컴포넌트 추출** | A·B·C·D 4형태 각자 구현 — §8-C 잔여 |
| §8-E 표 가로 스크롤 | 설명서는 `<table>` 미사용이라 우회 중 |
| **B군 608 약사 검토** | 생약 2그룹(은행엽 203 · 포도엽 96 = 299) 우선 — **다음 작업** |
| build 선행 결함 | 타 세션 `e41c78157`(content-guard) — api-server, 본 WO 무관 |
