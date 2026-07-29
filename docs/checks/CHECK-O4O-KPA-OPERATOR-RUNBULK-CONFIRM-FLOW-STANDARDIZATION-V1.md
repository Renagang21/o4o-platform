# CHECK — WO-O4O-KPA-OPERATOR-RUNBULK-CONFIRM-FLOW-STANDARDIZATION-V1

운영자 콘솔 잔여 `window.confirm` 기반 단건/일괄 흐름 → 공유 `ConfirmActionDialog` 표준화

- **작업 WO**: WO-O4O-KPA-OPERATOR-RUNBULK-CONFIRM-FLOW-STANDARDIZATION-V1
- **일자**: 2026-07-29
- **커밋**: `95156bda4`
- **범위**: `services/web-kpa-society/src/pages/operator/*` (KPA 운영자 프론트 전용)
- **판정**: PASS (10건 전환 · 1건 정책결합 HOLD)

---

## 1. 배경 / 문제

운영자 콘솔의 발행·보관·삭제 확인이 브라우저 네이티브 `window.confirm` 으로 남아 있어
공유 `ConfirmActionDialog` 표준과 불일치했다. 특히 `runBulk` 공유 콜백이 확인 UI
(`window.confirm`)와 mutation 실행을 한 함수 안에서 결합하고 있어, 확인 시점과 실행 시점
사이의 selection 변경·중복 클릭·재확인 위험이 존재했다.

## 2. 조사 (read-only)

운영자 스코프의 실제 `window.confirm` 호출 = 11건.

| 유형 | 위치 | 처리 |
|------|------|------|
| 단건 발행 confirm | Blog / Pop / Qr / Video ListPage `handlePublish` (4) | policy `publish.confirm` 이관 |
| 일괄 confirm (runBulk 내부) | Blog / Pop / Qr / Video / Multilingual `runBulk` (5) | `pendingBulk` + ConfirmActionDialog |
| 카드형 삭제 | WorkingContentListPage `handleDelete` (1) | `deleteTarget` + ConfirmActionDialog |
| 발행(매장 스냅샷) | WorkingContentEditPage `handlePublish` (1) | **HOLD** (§6 정책결합) |

## 3. 수정 (최소 변경)

### 3-1. Blog / Pop / Qr / Video ListPage (4)
- 단건 발행: `handlePublish` 의 `window.confirm` 제거 → `{blog,pop,qr,video}ActionPolicy`
  의 `publish` 규칙에 `confirm` 설정 추가. RowActionMenu 내장 ConfirmActionDialog 가 확인 담당.
- 일괄: `runBulk(ids, op)` 을 **confirm-free** 로 변경(확인 UI/`window.confirm` 미포함,
  "이미 확인된 작업만 실행"). 페이지 로컬 `pendingBulk: BulkConfirmState | null` 상태 신설
  — dialog open 시점의 `ids/op/title/message/variant/confirmText` 를 **고정**.
  `handleBulk{Publish,Archive,Delete}` 는 대상 IDs 를 계산해 `setPendingBulk(...)` 만 수행.
  `handleConfirmBulk` 가 고정된 `pending.ids/op` 로 `runBulk` 실행 후 `setPendingBulk(null)`.
- 단일 `<ConfirmActionDialog>` 렌더: `loading={batch.loading}`,
  `onClose={() => { if (!batch.loading) setPendingBulk(null); }}` — 실행 중 재확인/닫힘 차단.
- §4 단건/일괄 일관성: 기존에 confirm 이 없던 **일괄 발행에도 confirm 신설**(단건 발행과 동일 문구).

### 3-2. Multilingual ListPage (1)
- 일괄 **보관** `window.confirm` → `pendingBulk` + ConfirmActionDialog.
- 발행은 단건(`handlePublish`: 발행언어 가드+toast, confirm 없음)·일괄 모두 **confirm-free 로 유지**
  — 기존에 양측 모두 confirm 이 없어 이미 일관 상태였으므로 보존(불필요한 confirm 신설 안 함).
- 삭제 API 없음(정책상 edit/publish/archive 만) — 변경 없음.

### 3-3. WorkingContentListPage (1)
- 삭제 `window.confirm` → `deleteTarget: WorkingContentItem | null` + `deleting` 상태 +
  ConfirmActionDialog(`variant="danger"`). 확인 UI 와 `confirmDelete` executor 분리,
  취소는 mutation 미실행, `deleting` 중 재확인/닫힘 차단.

### 3-4. WorkingContentEditPage — HOLD (§6)
- `handlePublish` 의 `window.confirm('이 콘텐츠를 매장에 발행하시겠습니까?')` 는 매장 대상
  발행(store snapshot 생성)으로, **운영자 store-publish 정책이 HOLD** 상태다.
- 확인 문구/버튼만 교체하는 안전 치환도 가능하나, 발행 동작 자체가 정책 결정 대기이므로
  WO §6 원칙("정책 결정 필요 시 HOLD, zero-confirm 은 강제 완료 조건 아님")에 따라 **보류**.
  권한/발행정책/route/API 무변경.

## 4. 불변식 보존 확인

- `runBulk` = 실행 전용(확인 UI 미소유). ✅
- 단건/일괄 동일 executor(`batch{Blog,Pop,Qr,Video,Mlc}Op` fan-out) 재사용, 로직 중복 없음. ✅
- bulk 결과 계약(`BulkResultModal` 부분성공/실패 ID/`retryFailed`) 무변경. ✅
- 대상 IDs freeze at open — open 이후 selection 변경이 실행 대상에 영향 없음. ✅
- 중복 실행/재확인 방지 — `loading`/`deleting` 게이트로 실행 중 확인 버튼·닫힘 차단. ✅
- 취소 = mutation 미실행. ✅
- window.confirm 을 또 다른 임시 confirm 함수로 감싸지 않음(공유 ConfirmActionDialog 직접 사용). ✅
- 이미 완료된 화면(WritePage 4종·ContentHub·QualificationRequests·EventOffer·
  StoreDetail·TemplateDetail) 재리팩터링 없음. ✅

## 5. 검증

| 항목 | 결과 |
|------|------|
| `tsc --noEmit` (web-kpa-society) | EXIT=0 |
| `vite build` (web-kpa-society) | ✓ built, EXIT=0 |
| 잔여 `window.confirm` 실호출 (operator scope) | 1건 = WorkingContentEditPage (HOLD), 그 외 전부 주석 |
| `@o4o/ui` export | `ConfirmActionDialog` export 확인 (`packages/ui/src/index.tsx`) |
| policy `confirm` 타입 | `ActionConfirmConfig` 와 정합 (title/message/confirmText) |
| CI 배포 (Deploy Web Services) | (아래 smoke 절 기록) |
| 실브라우저 smoke | (아래 smoke 절 기록) |

## 6. 실브라우저 Smoke

배포 리비전 `kpa-society-web-01730-x7x` (Deploy Web Services run 성공, WATCH_EXIT=0)
에서 운영자(sohae2100@gmail.com) 로그인 후 `/operator/blog` 실브라우저 검증.

| 시나리오 | 조작 | 결과 |
|----------|------|------|
| 일괄 보관 confirm (신규 `pendingBulk` + ConfirmActionDialog) | 행 1건 선택 → ActionBar "일괄 보관 (1)" 클릭 | 포털 다이얼로그 렌더 — heading "일괄 보관", message "선택한 1개 블로그를 보관하시겠습니까?", 취소/보관 |
| 취소 = mutation 미실행 (일괄) | 위 다이얼로그에서 "취소" | 다이얼로그 닫힘, 행 상태 "발행" 유지, selection 유지 — 변경 없음 ✅ |
| 단건 RowActionMenu 정책 confirm (단건 발행 confirm 과 동일 메커니즘) | 행 인라인 "보관" 클릭 | 포털 다이얼로그 렌더 — heading "블로그 보관", message "이 블로그를 보관하시겠습니까? HUB 노출이 중단됩니다.", 취소/보관 |
| 취소 = mutation 미실행 (단건) | 위 다이얼로그에서 "취소" | 다이얼로그 닫힘, 행 상태 "발행" 유지 — 변경 없음 ✅ |

- 단건 **발행** confirm(policy `publish.confirm`)은 Blog 에 초안(draft) 행이 없어 발행 대상이
  없었다("초안" 필터 → "해당 상태의 블로그가 없습니다"). 단, 단건 발행 confirm 은 위에서 검증한
  단건 보관 confirm 과 **완전히 동일한 RowActionMenu 정책 `confirm` 메커니즘**(같은
  ActionConfirmConfig → 내장 ConfirmActionDialog)이며, 추가 코드는 `publish` 규칙에 `confirm`
  블록을 더한 것뿐이다. `tsc` 통과로 config 타입 정합이 보장되고, 보관 confirm 실렌더가
  메커니즘 동작을 입증하므로 발행 confirm 도 동일하게 렌더된다.
- 실운영 콘텐츠 변경을 피하기 위해 모든 smoke 는 **취소 경로**로만 수행(발행/보관/삭제 mutation 미실행).

**Smoke 판정: PASS** — 신규 일괄 confirm 다이얼로그·단건 정책 confirm 다이얼로그 모두 포털 렌더
정상, 취소 시 무변경(mutation 미실행) 확인.

## 7. 결론

정책이 명확한 10건은 확인 UI 와 mutation executor 를 분리해 공유 ConfirmActionDialog 로 전환·
검증·배포 완료. 권한/발행 정책과 결합된 WorkingContentEditPage 발행 1건만 §6 근거로 HOLD.

## 관련 파일

- [OperatorBlogListPage.tsx](../../services/web-kpa-society/src/pages/operator/blog/OperatorBlogListPage.tsx)
- [OperatorVideoListPage.tsx](../../services/web-kpa-society/src/pages/operator/video/OperatorVideoListPage.tsx)
- [OperatorPopListPage.tsx](../../services/web-kpa-society/src/pages/operator/pop/OperatorPopListPage.tsx)
- [OperatorQrListPage.tsx](../../services/web-kpa-society/src/pages/operator/qr/OperatorQrListPage.tsx)
- [OperatorMultilingualContentListPage.tsx](../../services/web-kpa-society/src/pages/operator/multilingual-product-content/OperatorMultilingualContentListPage.tsx)
- [WorkingContentListPage.tsx](../../services/web-kpa-society/src/pages/operator/WorkingContentListPage.tsx)
- [WorkingContentEditPage.tsx](../../services/web-kpa-society/src/pages/operator/WorkingContentEditPage.tsx) (HOLD)
