# CHECK-O4O-STORE-LIBRARY-DUPLICATE-COPY-UX-POLICY-V1

> **작업명:** WO-O4O-STORE-LIBRARY-DUPLICATE-COPY-UX-POLICY-V1
> **유형:** 저위험 UX 정책 정리 — 중복(재)복사 허용을 UI 에 일관 반영. API/DB/route/snapshot/dedup 무변경.
> **결과: PASS (A안) — 콘텐츠 browse 의 영구 "복사 완료" 재복사 차단 제거. '복사 완료'는 이력 표시로만 두고 **버튼은 다시 클릭 가능**(클릭 시 새 사본). 짧은 안내 추가. 카드(ContentHubCardGrid) + 테이블(DefaultTableView) 공통 수정. 중복 방지/unique/soft-dedup 미도입. typecheck(5) 0 errors.**
> 선행: `WO-O4O-STORE-HUB-CONTENT-BROWSE-COMPONENT-EXTRACTION-V1`(PASS) · `WO-O4O-STORE-CONTENT-TERMINOLOGY-AND-GUIDE-COPY-V1`(PASS) — 2026-06-15

---

## 1. 확정 정책 (사용자 승인 = A안)

```
재복사 허용:
- 같은 콘텐츠를 여러 번 복사할 수 있다.
- 다시 복사하면 새 사본으로 저장된다.
- 각 사본은 독립적으로 편집·삭제할 수 있다.
- '복사 완료' 표시는 차단이 아니라 이전 복사 이력 안내다.
- 안내는 과하지 않게 짧게 표시한다.
```

근거: 원본은 추후 수정될 수 있어 같은 원본을 다시 복사해 새 버전처럼 활용 가능해야 함. 불필요한 사본은 내 매장/약국에서 삭제. → **영구 차단 금지.**

## 2. 사전 조사 — 문제 (정책↔UX 불일치)

| 화면 | 이미 복사한 항목 상태 | 재복사 |
|------|----------------------|:------:|
| 콘텐츠 browse 카드(GP/KCos `ContentHubCardGrid`) | 버튼 `disabled` + 회색 | ❌ 영구 차단 |
| 콘텐츠 browse 테이블(KPA `DefaultTableView`) | 비클릭 `<span>복사 완료</span>` | ❌ 영구 차단 |
| POP/QR/Blog browse(ActionBar bulk-import) | copied 추적 없음(selectedIds) | ✅ 이미 허용 |

- `copiedIds` 는 `loadCopiedIds()`(기존 스냅샷 조회) → **영구 상태**(세션 한정 아님). 따라서 과거 복사 항목이 영구 비활성.
- backend 는 중복 복사 허용(unique constraint 제거됨, `WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1`). POP/QR/Blog 도 재가져오기 허용. **콘텐츠 browse 만 outlier** → A안으로 정합화.

## 3. 변경 (5 파일)

### 3.1 공통 — `packages/shared-space-ui/src/ContentHubTemplate.tsx`
- `recopyLabel?: string`(config) / `recopyLabel: string`(ItemContext) 추가, itemCtx 기본값 `'다시 복사'`.
- **DefaultTableView 복사 컬럼**: 기존 `alreadyCopied → 비클릭 span` 제거. 이제:
  - 복사 **직후**(`wasJustCopied` + afterCopyAction): "작업하러 가기" 링크(유지).
  - 그 외 항상 **클릭 가능 버튼**. 라벨 = copying→copyingLabel / alreadyCopied→copiedLabel / else→copyLabel. alreadyCopied 시 `title=recopyLabel`(툴팁). 클릭 시 `ctx.onCopy` → 새 사본.

### 3.2 공통 — `packages/shared-space-ui/src/ContentHubCardGrid.tsx`
- 카드 복사 버튼 `disabled={alreadyCopied || isCopying}` → **`disabled={isCopying}`**. alreadyCopied 회색/cursor-default 제거 → accent(클릭 가능) 유지. alreadyCopied 시 `<Check/> {copiedLabel}` + `title=recopyLabel`. 클릭 시 새 사본.

### 3.3 안내 문구 — 3 콘텐츠 browse (`infoTextAfter` 보강, 짧게)
- KPA/KCos: "…내 매장 사본은 영향받지 않습니다. **다시 복사하면 새 사본으로 저장되며, 필요 없는 사본은 내 매장에서 삭제할 수 있습니다.**"
- GP: 동일(용어 "내 약국").

> POP/QR/Blog 페이지는 이미 재가져오기 허용 + 충분한 안내 보유 → **미변경**.

## 4. 검증

- **TypeScript 0 errors:** `shared-space-ui` · `web-glycopharm` · `web-k-cosmetics` · `web-kpa-society` · `web-neture`(소비처) **각 0** (baseline 0).
- **정적:**
  - 카드/테이블 모두 alreadyCopied 시 **버튼 클릭 가능**(disabled 는 isCopying 한정). '복사 완료' = 이력 표시 + 툴팁 '다시 복사'.
  - `recopyLabel` additive(config optional, 기본 '다시 복사') — 미설정 소비처(KCos/Neture library 등) 무영향.
  - **API/DB/route/snapshot 구조/`onCopy`/`assetSnapshotApi.copy`/`loadCopiedIds` 변경 0.**
  - **unique constraint / soft-dedup / 중복 차단 / 확인 모달 미도입**(diff 확인).
  - 백엔드/엔티티/마이그레이션 변경 0.
  - 직전 WO 의 Copy 아이콘·accent·용어(GP 약국/KCos·KPA 매장) 보존.
- **browser smoke:** 미수행 — dev 서버 미기동·인증 guard. 상태/문구는 tsc + 정적 검증. (배포 후 이미 복사한 콘텐츠의 복사 버튼이 클릭 가능하고 재복사 시 새 사본 생성되는지 확인 권장.)

## 5. 완료 판정

**PASS (A안).** 콘텐츠 browse 의 영구 재복사 차단 제거 — '복사 완료'는 이력 표시, 버튼 재클릭 가능(새 사본), 짧은 안내 추가. 카드+테이블 공통 정합. 중복 방지/unique/soft-dedup 미도입, API/DB/route/snapshot 무변경, typecheck(5) 통과. POP/QR/Blog 와 정책 일치.

## 6. 후속

1. `IR-O4O-STORE-PRODUCTION-MATERIAL-TABLE-CONSOLIDATION-AUDIT-V1` — 다중 테이블 경계 audit.
2. `WO-O4O-OPERATOR-CONTENT-ROUTE-NAME-ALIGNMENT-V1` — `/operator/content` vs `/operator/content-management`.
3. (선택) browser smoke — 재복사 클릭 → 새 사본 + 내 매장 목록 구분 확인.
4. (선택) GP/KCos adapter 공통화 / KPA fold-in 재평가.

---

*Date: 2026-06-15 · WO-O4O-STORE-LIBRARY-DUPLICATE-COPY-UX-POLICY-V1 · A안 PASS — 영구 재복사 차단 제거('복사 완료'=이력 표시, 재클릭 가능), 짧은 안내. 카드+테이블 공통. unique/dedup/API/DB/route/snapshot 무변경. typecheck(5) 0.*
