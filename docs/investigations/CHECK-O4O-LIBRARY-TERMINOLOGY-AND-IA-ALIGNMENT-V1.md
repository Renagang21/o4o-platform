# CHECK-O4O-LIBRARY-TERMINOLOGY-AND-IA-ALIGNMENT-V1

> **유형:** WO 실행 결과 (CHECK)
> **WO:** WO-O4O-LIBRARY-TERMINOLOGY-AND-IA-ALIGNMENT-V1
> **선행:** IR-O4O-LIBRARY-CROSSSURFACE-UIUX-AUDIT-V1 (보존 commit `53a1e91fa`)
> **작성:** 2026-06-13
> **판정:** **PASS** (자료실 용어/IA 미세 정렬 — 이미 공통화된 구조의 마무리)

---

## 1. 작업 개요

자료실은 signage 와 달리 **이미 shared template + cross-service 컴포넌트로 공통화 완료** 상태. 본 WO 는 남은 사용자-facing 용어 혼용(특히 "라이브러리" loanword)만 최소 정비. **구조/route/컴포넌트 무변경**.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| 작업 시작 HEAD | `6f69a5602` → IR 보존 commit `53a1e91fa` 후 진행 |
| origin ahead/behind | 0 / 0 |
| 다른 세션 WIP | lms-ui / operator-core-ui(product-applications) / GP·KCos App.tsx·operatorMenuGroups / pnpm-lock 등 다수 — **전부 미접촉** (내 편집과 미겹침) |
| staged | 없음 |

## 3. IR 보존

`docs/investigations/IR-O4O-LIBRARY-CROSSSURFACE-UIUX-AUDIT-V1.md` → path-specific commit `53a1e91fa`, push 완료(`6f69a5602..53a1e91fa`). untracked 유실 방지.

## 4. 용어 정렬 결과

### 4.1 점검 결과 — 자료실 핵심 surface 는 이미 정렬됨
| surface | KPA | GP | KCos | 상태 |
|---------|-----|-----|------|:--:|
| 커뮤니티 자료실 `/resources` | "자료실" | "자료실" | "자료실" | ✅ 이미 정합 |
| 내 매장 `/store/library/*` | "내 자료함"(콘텐츠/자료/제작 자료) | 동일 | 동일 | ✅ 동일 컴포넌트 |
| 운영자 `/operator/resources` | "자료 관리" | "자료 관리" | "자료 관리" | ✅ 정합 |
| "리소스" / "보관함" user-facing | 0 | 0 | 0 | ✅ 없음 |

→ 자료실 기본 용어("자료실"/"내 자료함"/"제작 자료")는 **변경 불요**.

### 4.2 정비한 항목 — "콘텐츠 라이브러리" → "콘텐츠 자료실" (라이브러리 loanword 제거)
| 파일 | 변경 |
|------|------|
| KCos `pages/library/ContentLibraryPage.tsx` | heroTitle "콘텐츠 라이브러리" → **"콘텐츠 자료실"** (`/library/content` IA 결정 §5) |
| KCos `pages/hub/HubContentPage.tsx` | heroDesc "…콘텐츠 라이브러리" → "…콘텐츠 자료실" |
| GP `pages/hub/HubContentListPage.tsx` | heroDesc "…콘텐츠 라이브러리" → "…콘텐츠 자료실" |
| KCos `pages/mobile/MobileStorePage.tsx` | 설명 prose "콘텐츠 라이브러리" → "콘텐츠 자료실" |
| GP `pages/mobile/MobilePharmacyPage.tsx` | 설명 prose "콘텐츠 라이브러리" → "콘텐츠 자료실" |

### 4.3 의도적 미변경
- **GP `operatorMenuGroups.ts` "콘텐츠 라이브러리" → `/operator/signage/library`** (2건): **signage 운영자 메뉴**(signage 도메인). 본 WO(자료실) 범위 외 + signage 는 별도 baseline 완료. **유지**. (signage 후속에서 검토 가능. 또한 작업 시점 다른 세션이 operatorMenuGroups 편집 중 → 미접촉.)
- 코드 주석/JSDoc "콘텐츠 라이브러리" 3건: 비-user-facing, 유지.
- KPA store-hub content "플랫폼 콘텐츠": 이미 비-라이브러리 Korean → 유지.

## 5. K-Cosmetics `/library/content` 판단

**판정: Option B (라벨 정리)** — route `/library/content` **유지**, 기능 보존, heroTitle "콘텐츠 라이브러리" → **"콘텐츠 자료실"**.

- 근거: WO §1 이 "라이브러리"/"콘텐츠 라이브러리"를 혼용 대상으로 명시 + baseline 이 "자료실" 우선. KCos `/library/content` 는 커뮤니티 콘텐츠 라이브러리(KPA `/content` 대응)로 **live surface** — 삭제하지 않고 명칭만 자료실 baseline 으로 정렬.
- "콘텐츠 자료실"은 일반 "자료실"(사용자 자료)과 구분되는 **콘텐츠(CMS) 자료실**로, 두 surface 의 성격 차이를 유지하면서 loanword 제거.
- route path·진입 카드("콘텐츠" → `/library/content`)·기능 무변경.

## 6. `/store/library/*` 구조 유지 확인

✅ KPA/GP/KCos 3서비스 `/store/library/{contents,resources,production-materials}` 3단 구조·동일 컴포넌트(StoreLibraryContentsPage / StoreLibraryResourcesPage / StoreProductionMaterialsPage) **무변경**. 콘텐츠/자료/제작 자료 의미 구분 유지. POP/QR/블로그/디지털사이니지 연결 표현 무변경.

## 7. operator resources 차이

✅ GP operator AI 생성 slot vs KCos 부재 = **의도된 정책 차이로 보존**(IR 기록). 공통 컴포넌트 신규 추출 없음, AI slot 강제 정렬 없음. operator "자료 관리" 제목은 이미 정합 → 변경 없음.

## 8. Neture 제외 확인

✅ Neture **미수정**. 매장형 `/store/library/*` 없음. `/supplier/library`(공급자, supplierId) + `/resources`(공유 ResourcesHubTemplate)는 본 WO 대상 아님. 공급자 자료실은 후속 `IR-O4O-SUPPLIER-LIBRARY-POLICY-V1` 로 분리.

## 9. 범위 / 무변경 확인

| 항목 | 결과 |
|------|------|
| backend / API / DB / migration | ✅ 무변경 |
| shared data model / component 구조 | ✅ 무변경 |
| route path / live route 삭제 | ✅ 무변경/없음 |
| StoreLibrary inline style 정규화 | ✅ 안 함(보류) |
| 신규 공통 컴포넌트 추출 | ✅ 없음 |
| Neture | ✅ 미수정 |
| KPA | 변경 없음(이미 정합) |
| 변경 = GP 2 + KCos 3 (user-facing copy only) | 5파일 |

## 10. TypeScript 검증

| 패키지 | 결과 |
|--------|------|
| web-glycopharm (`npx tsc --noEmit`) | ✅ PASS (exit 0) |
| web-k-cosmetics (`npx tsc --noEmit`) | ✅ PASS (exit 0) |
| web-kpa-society | 변경 없음 → 영향 없음 |
| user-facing "콘텐츠 라이브러리" 잔존 | signage operator 메뉴 2(범위 외) + 주석 3 만. 타깃 surface 0 |

## 11. browser smoke

⚠️ **라이브 미수행(보류).** 변경은 hero/desc/prose 문자열 5건(로직·route·컴포넌트 무변경), GP·KCos tsc PASS. 회귀 위험 낮아 정적 검증 갈음.
- 권장 후속(사람 확인): KCos `/library/content` 제목 "콘텐츠 자료실", GP/KCos `/store-hub/content` heroDesc, mobile 진입 설명 육안 확인.

## 12. 후속 backlog (보류, blocker 아님)

| 후보 | 내용 |
|------|------|
| `WO-O4O-STORE-LIBRARY-STYLING-NORMALIZATION-V1` | 내 매장 StoreLibrary* inline style → shared/Tailwind |
| `IR-O4O-SUPPLIER-LIBRARY-POLICY-V1` | Neture 공급자 자료실 별도 설계 |
| `IR-O4O-LIBRARY-OPERATOR-AI-SLOT-POLICY-V1` | GP/KCos operator AI 생성 정책 정렬 |
| store-hub content 제목 정합 | KPA "플랫폼 콘텐츠" vs GP/KCos "매장에서 바로 쓰는 콘텐츠" — 콘텐츠 축(자료실 아님), 선택 정렬 |
| signage operator 메뉴 "콘텐츠 라이브러리" 라벨 | signage 후속에서 검토 |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| IR 보존 | `53a1e91fa` (push 완료) |
| 수정 파일 | GP 2 + KCos 3 = 5 (user-facing copy) |
| 용어 정렬 | "콘텐츠 라이브러리" → "콘텐츠 자료실"(타깃 surface 0 잔존). 자료실 핵심 용어는 이미 정합 |
| KCos `/library/content` | **Option B** — route 유지, "콘텐츠 자료실" 라벨 |
| `/store/library/*` 구조 | 3서비스 동일 유지 |
| Neture | 미수정(제외) |
| backend/API/DB/migration | 무변경 |
| TypeScript | GP·KCos PASS |
| browser smoke | tsc+grep 정적 갈음(라이브 보류) |
| 다른 세션 WIP | 미포함(path-specific) |
