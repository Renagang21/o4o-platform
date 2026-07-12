# CHECK-O4O-KPA-PRE-EXISTING-CLEANUP-V1

> 목적: `WO-O4O-KPA-TABLET-TEMPLATE-SELECTION-EDITOR-V1`(커밋 `d41e93d9e`, push 완료) 이후 확인된
> **태블릿과 무관한 pre-existing 2건**을 최소 범위로 정리. 태블릿 기능은 건드리지 않는다.
> 다음 태블릿 WO(`SCREEN-SET-TEMPLATE-APPLY-V1`)의 build/smoke 신뢰성 확보용.

---

## 1. StoreDescriptionViewModal.tsx:169 TS2322 — **로컬 환경 문제(코드 결함 아님)**

### 증상
```
services/web-kpa-society/src/pages/pharmacy/StoreDescriptionViewModal.tsx(169,38):
  error TS2322: Type '"store-description"' is not assignable to
  type '"guide" | "product-detail" | undefined'.
```

### 원인 (조사 결과)
- `web-kpa-society` 는 `@o4o/content-editor` 를 **빌드 산출물(`dist/index.d.ts`)** 로 소비한다(`types: ./dist/index.d.ts`).
- 패키지 **소스**(`packages/content-editor/src/components/ContentRenderer.tsx`)는 이미
  `variant?: 'product-detail' | 'guide' | 'store-description'` 를 포함(커밋 `c26a6f41b`, committed).
- 그러나 로컬 `dist/index.d.ts`(2026-06-27 빌드)는 `'product-detail' | 'guide'` 만 담긴 **stale 산출물**.
- 근본 원인: `@tiptap/extension-table`(+ `-table-row`/`-table-header`/`-table-cell`) 4개가
  로컬 `node_modules` 에 **미설치** → `content-editor` 재빌드 시 `Toolbar.tsx` 표 명령 타입 에러로
  `--dts` 빌드가 실패하여 dist 가 갱신되지 못한 상태였다.
  - 해당 table deps 는 커밋 `5b63bb50a`(WO-2, TipTap Table 지원)에서 `package.json`·`pnpm-lock.yaml` 에
    추가됐으나, 로컬에서 이후 `pnpm install` 이 재실행되지 않아 미설치로 남음.

### 조치 (로컬 전용 — 커밋된 소스 변경 없음)
1. `pnpm install --frozen-lockfile` (lockfile 변경 없음, 누락 table deps 설치).
2. `packages/content-editor` 재빌드 → `dist/index.d.ts` 갱신 → `variant` 에 `store-description` 반영.

### 검증
| 항목 | 결과 |
|---|---|
| `content-editor` build (ESM + DTS) | ✅ 성공 |
| `web-kpa-society` `tsc --noEmit` | ✅ **exit 0** (TS2322 해소) |
| `web-kpa-society` `pnpm run build` (`tsc && vite build`) | ✅ **exit 0** (built in ~13s) |

### 결론
- **커밋된 코드는 정상**이었고 CI(clean install)에는 영향 없음. 순수 **로컬 stale 산출물 + 미설치 의존성** 문제.
- 향후 동일 TS2322 재발 시: **`pnpm install` 후 `content-editor` 재빌드**로 해소.
- **Git 변경 산출물 없음**(dist 는 `.gitignore`, 소스 무변경).

---

## 2. `CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1.md` — stash-pop 충돌 정리

### 상태
- `git status` 상 dirty(` M`). 실제로는 merge 가 아니라 **`git stash pop` 충돌 마커**가 남은 상태
  (`<<<<<<< Updated upstream` / `=======` / `>>>>>>> Stashed changes`, 파일 내 §12 영역).
- index 는 unmerged 아님(마커만 working tree 에 주입됨).

### 충돌 내용 (서로 다른 조사 기록 — 포맷 충돌 아님)
| 측 | §12 내용 |
|---|---|
| Updated upstream (committed/HEAD) | "게이트 B 실행 로그 — **재개 완료**" (230,841 master 완주, 검증 통과) |
| Stashed changes (local) | "게이트 B 재개 시도 로그(노트북) — **실패·정지(중복 barcode)**" 조사 노트 |

### 조치 (사용자 지시 = **두 섹션 모두 보존**, 내용 판단·정책 변경 없이 충돌 정리만)
- 충돌 마커 3개 제거.
- 기존 §12(재개 완료) **원문 그대로 유지**.
- stash 측 조사 노트는 **§13** 로 이동·보존(제목 `## 12.` → `## 13.`, 섹션 구분 `---` 추가).
- 본문·표·SQL·문구는 **무편집**(내부 "§13 승인" 참조 포함 원문 보존).

### 검증
| 항목 | 결과 |
|---|---|
| 잔여 충돌 마커 | ✅ 0 |
| 섹션 헤딩 | ✅ §11 / §12(재개 완료) / §13(실패·중복 barcode) |
| `git diff HEAD` | ✅ **추가만**(+41) — §12 완료 측 byte 무변경, §13 보존분만 추가 |

### 결론
- 정보 손실 없이 dirty 상태 해소. drug-seed 운영 데이터/정책 판단은 하지 않음(문서 정리 한정).

---

## 3. 범위 준수

- 태블릿 기능/`d41e93d9e` 커밋 **무접촉**.
- item 1 은 **로컬 환경 조치**(git 산출물 없음), item 2 는 **docs-only** 변경.
- 본 정리는 태블릿 TEMPLATE-SELECTION-EDITOR 커밋과 **분리된 별도 커밋**으로 남긴다.
