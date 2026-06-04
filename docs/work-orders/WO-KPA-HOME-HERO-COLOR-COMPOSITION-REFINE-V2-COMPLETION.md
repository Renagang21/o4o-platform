# WO-KPA-HOME-HERO-COLOR-COMPOSITION-REFINE-V2 — 완료 기록 (CHECK)

> **상태: 완료 고정 (PASS).** KPA-Society Home Hero 색상/시각 계층 V2 개선. 기능·배포 정상.
> 본 문서는 동시 세션 충돌로 인한 **Git 이력 예외**를 명시적으로 기록하기 위한 작업 기록이다 (코드 재작업·보정 커밋 없음).

- **작성일**: 2026-06-04
- **작업 유형**: 완료 기록 / CHECK
- **대상**: `services/web-kpa-society` Home Hero (fallback) + `packages/shared-space-ui/HeroBannerSection.tsx`
- **선행**: V1 = `style(kpa): refine home hero color composition` (`5eb39f347`)

---

## 1. 최종 판정

| 항목 | 결과 |
|------|------|
| Hero V2 visual 개선 (card-based hero) | ✅ PASS |
| production 반영 (kpa-society.co.kr) | ✅ PASS |
| 다른 서비스 영향 없음 (K-Cosmetics opt-in 미전달) | ✅ PASS |
| TypeScript / Build | ✅ PASS |
| Git 이력 | ⚠️ 예외 기록 후 수용 (아래 §3) |

## 2. 변경 요약 (V1 → V2)

- 외부 band: 중앙 white-fade 제거 → 끝까지 유지되는 soft blue (`#dbeafe→#e6f0ff→#f4f9ff`) 로 white card 대비 확보
- 내부 card: 불투명 white + 가시 blue border(`#c7dbf8`) + 강한 soft shadow + `minHeight`/flex 중앙정렬
- 장식: 우측 pale-blue circle / 좌하단 wave / **우상단 dot pattern**(신규) — 모두 zIndex 0(텍스트 뒤), 콘텐츠 zIndex 1
- 텍스트 계층: badge=blue gradient(white), headline=navy(`#1e3a8a`), subtitle=slate(`#475569`)
- 적용 방식: `HeroBannerFallback.decorated` opt-in 플래그 — KPA만 `true`, 타 서비스 미영향

## 3. Git 이력 예외 (중요)

동시 세션과 staging이 겹치며, 내가 path-specific 으로 stage 한 `HeroBannerSection.tsx`(V2 hero) 가 **다른 세션의 커밋에 함께 포함**되었다.

| 커밋 | 메시지 | 실제 포함 내용 |
|------|--------|---------------|
| `20f9f9694` | `fix(kpa): remove '이용 가이드' item from KPA-Society header nav` | **실제로는 `HeroBannerSection.tsx`(Hero V2) 만 포함** (51 ins / 27 del) — 메시지와 불일치 |
| `cd0ef7285` | `docs: audit O4O global icon usage` | `IR-O4O-GLOBAL-ICON-USAGE-AUDIT-V1.md` |
| `3e652a0cd` | `fix(kpa): remove '이용 가이드' item from KPA-Society header nav` | `navigation.ts` (실제 nav 변경) |

- **최종 `origin/main` = `3e652a0cd`** 이며, 그 트리에 Hero V2 변경이 포함되어 있음 (`git grep REFINE-V2 3e652a0cd` 확인).
- 즉 **Hero V2 변경은 `20f9f9694` 커밋에 들어 있다.** 커밋 메시지(nav)와 실제 diff(hero)가 불일치하므로, 향후 `git log`/`git blame`/회귀 추적 시 본 기록을 참조한다.

### 처리 방침 (확정)
- 코드 재작업 없음 / revert 없음
- 보정용 빈 커밋 없음 (실제 diff 없는 문서용 커밋은 추적 노이즈만 증가)
- 본 CHECK 문서로 예외만 명시

## 4. 배포

- `20f9f9694` (Hero V2 포함) → Deploy Web Services **success** (KPA + K-Cosmetics)
- `3e652a0cd` (nav) → Deploy Web Services **success** (KPA deploy, 나머지 skipped)
- production smoke (desktop 1440 / mobile 390): **PASS**

## 5. 후속(선택)

- 본 Hero `decorated` 패턴은 다른 서비스 Home 에도 opt-in 으로 확장 가능 (현재는 KPA 단독).
- 동시 세션 staging 충돌 재발 방지: 작업 단위별 즉시 commit 또는 세션 간 작업 파일 분리.
