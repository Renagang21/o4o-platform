# CHECK — WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1

- **작업일**: 2026-08-13
- **브랜치**: `work/commonization-my-store` (remote `work/commonization-my-store-shell-parts`) — main 병합 없음
- **선행**: `CHECK-O4O-MY-STORE-CONTENT-PRODUCTION-CROSSSERVICE-AUDIT-V1` (61b0c81b5) 의 단일 권고 대상
- **범위**: K-Cosmetics / GlycoPharm 의 POP 제작 흐름 전체를 `@o4o/store-ui-core` 로 공통화
- **제외**: KPA (고유 POP·다국어·asset-policy 축) / PharmacyHub (`store_pops` CRUD 모델) — 회귀 build 만

---

## 1. 조사 — 차이는 업무 규칙인가 서비스 config 인가

두 서비스 `StorePopPage` 전문을 `diff -u` 로 대조한 결과 **업무 규칙 차이는 0 건**이었다.
실제 차이는 다음 6 종뿐이며 전부 서비스 config 다.

| 축 | K-Cosmetics | GlycoPharm |
|---|---|---|
| accent color / soft bg | `#db2777` / `#fdf2f8` | `#ea580c` / `#fff7ed` |
| endpoint prefix | `/cosmetics` | `/glycopharm` |
| 템플릿 3번 라벨 | `매장 전문형` / `전문 매장 스타일` | `약국 전문형` / `전문 약국 스타일` |
| 문구 | 매장 (`매장 POP PDF`, `매장 정보를 확인할 수 없습니다`, `내 매장 POP`) | 약국 (동일 문장의 약국 표기) |
| localProduct import 경로 | `@/services/localProductApi` | `@/api/localProducts` |
| 주석/공백 | 서비스별 WO 이력 주석 | 동일 |

동일했던 업무 규칙(공통 Core 로 이관):
공급자 자료 **최대 8개** 선택 상한 · 생성 조건(**공급자 자료 또는 매장 자체 상품 1개 이상**) ·
`origin='local'` router state 재조회(404=차단 / 그 외=실패 분리, 로딩·실패를 빈 폼으로 위장하지 않음) ·
prefill 문구(`prefillPop`) 파싱 + `history.replaceState` · `save:true` + `title` 분기 ·
응답 blob(PDF) ↔ JSON(`data.fileUrl`) 분기 · 실패 시 선택 항목 유지.

---

## 2. 공통 Core (`packages/store-ui-core/src/components/pop/`)

거대 단일 컴포넌트를 피하고 재사용 단위로 분리했다 (총 1,239 L).

| 파일 | L | 역할 |
|---|---:|---|
| `types.ts` | 109 | 공통 타입 + `PopComposerApi` / `PopComposerLabels` / `PopAccentTheme` 주입 계약 |
| `popStyles.ts` | 116 | 인라인 style 상수 + accent 의존 factory (`popStepBadgeStyle` / `popGenerateBtnStyle` / `popSelectableStyle`) |
| `popHelpers.ts` | 85 | `htmlToPlainText` · `parsePopPrefillState` · `normalizeLocalProductForPop` · `isPopNotFoundError` · `popAiContentToHtml` · `buildPopGeneratePayload` |
| `usePopComposer.ts` | 241 | 상태 모델 전부 (자료 로드/선택 · local 재조회 · 문구 저장 · layout/template/QR · generate) |
| `PopStateBlocks.tsx` | 59 | loading / error / empty + 인라인 loading / error |
| `PopLocalProductSection.tsx` | 75 | 매장 자체 상품 섹션 |
| `PopSupplierItemSelector.tsx` | 101 | Step 1 공급자 자료 선택 |
| `PopAiContentPanel.tsx` | 75 | Step 2 가져온 POP 문구 (+ 콘텐츠로 저장) |
| `PopLayoutTemplateSection.tsx` | 79 | Step 3 레이아웃 · 템플릿 |
| `PopQrSelector.tsx` | 40 | QR 연결(선택) — QR 0 건이면 미노출 |
| `PopGenerateBar.tsx` | 46 | 생성 버튼 + 미선택 안내 |
| `StorePopComposerView.tsx` | 146 | 화면 본체 조립 (+ `headerExtra` / `footerExtra` slot) |
| `index.ts` | 67 | barrel |

`packages/store-ui-core/src/index.ts` 에 `export * from './components/pop'` 1 줄 추가.
**dependency 변경 없음** — `react-router-dom` · `lucide-react` 는 이미 peerDependencies 다
(`package.json` / lockfile 무변경).

---

## 3. 서비스 적용 (thin adapter)

| 서비스 | 파일 | before → after |
|---|---|---:|
| K-Cosmetics | `services/web-k-cosmetics/src/pages/store/StorePopPage.tsx` | 650 L → **83 L** |
| GlycoPharm | `services/web-glycopharm/src/pages/store-management/StorePopPage.tsx` | 742 L → **85 L** |

합계 1,392 L → 168 L (**-1,224 L**), 공통 Core 1,239 L 신설. 중복 사본 2 벌 → 1 벌.

adapter 에 남은 것: `ACCENT` · `TEMPLATES` · `LABELS` · `popApi`(supplier-items GET / generate POST /
localProduct / QR / storeSlug / createStaffPopPost) · `notify=toast`.

**보존**: route(`/store/marketing/pop`) · router state 계약(`prefillPop`, `production.source.items`) ·
generate payload 필드·조건부 spread 순서 · endpoint · blob/JSON 처리 · `window.open` · 60 초 후 revoke ·
가이드 링크 · 권한/가드.

---

## 4. 함께 정리한 중복

duplicate type 2 벌(`SupplierItem` / `LocalProductPopItem` / `AiContent`) · style 상수 9 종 × 2 ·
loading/error/empty 블록 · payload 조립 · local product 정규화 · 404 판정 · HTML→text 변환 ·
문구→HTML 변환. POP 과 무관한 자료함/태블릿은 손대지 않았다.

---

## 5. 검증

| 항목 | 결과 |
|---|---|
| `pnpm run build:packages` + `store-ui-core` tsc build | PASS (dist 에 `components/pop` 생성, index 재수출 확인) |
| web-k-cosmetics `tsc --noEmit` / `vite build` | PASS / PASS (22.48s) |
| web-glycopharm `tsc --noEmit` / `vite build` | PASS / PASS (19.55s) |
| web-kpa-society 회귀 `tsc` / `vite build` | PASS / PASS (19.88s) |
| web-pharmacy-hub 회귀 `tsc` / `vite build` | PASS / PASS (12.79s) |
| generate payload 등가성 | 정적 대조 PASS — `buildPopGeneratePayload` 가 원본 조건부 spread 를 필드·순서까지 동일 재현 |
| prefill / local product 정규화 등가성 | 정적 대조 PASS (`git show HEAD:` 원본 vs `popHelpers.ts`) |
| loading / error / empty · 재시도 · 재생성 | 마크업·핸들러 동일 이관 (원본 JSX 대비 정적 확인) |
| PDF 결과 처리 (blob / `data.fileUrl`) | 분기·`window.open`·revoke 타이머 동일 |
| desktop / mobile | 레이아웃 값(`maxWidth 900`, `repeat(auto-fill, minmax(240px,1fr))`, `flexWrap`) 무변경 |

**자동 테스트 미추가**: 두 서비스와 `store-ui-core` 모두 test runner(vitest/jest) 가 없어
추가 시 `package.json`·lockfile 변경이 필요하다 → CLAUDE.md 중지 조건. 정적 등가 대조로 대체했다.

**브라우저 smoke 미수행**: 본 브랜치는 main 미병합이라 배포 대상이 아니다.

---

## 6. 변경하지 않은 것

backend 계약 · 신규 API · route · permission · DB / migration ·
PharmacyHub POP 모델 · KPA POP 화면 · 서비스별 accent·문구 통합 · source 종류 · PDF 의미.

---

## 7. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
