# CHECK — 태블릿 Screen Set 런타임 상태 문구 정정 V1

> **WO:** WO-O4O-KPA-TABLET-SCREEN-SET-RUNTIME-STATUS-COPY-CORRECTION-V1
> **성격:** 문구 정합성 보정 (기능/로직/API/schema 변경 없음)
> **작성일:** 2026-07-12
> **선행 발견:** CHECK-...-OPERATION-USABILITY-PASS-V1 §9 (amber 경고 stale 가능성 지적) → 본 WO 로 확정·정정

---

## 1. 런타임 연결 검증 (문구 변경의 근거)

문구를 "이제 반영됩니다"로 바꾸기 전, 실제 런타임 체인이 존재하는지 **read-only 검증**:

| 단계 | 코드 | 확인 |
|---|---|---|
| 백엔드 엔드포인트 | `store-public-tablet.handler.ts:480` `GET /:slug/tablet/screen` | `current_screen_set_id` 읽어 blocks(`is_visible=true`)+`templateKey` 를 `{mode:'screen_set', sections, templateKey}` 로 반환. NULL 이면 `{mode:'legacy'}` |
| kiosk 소비 | `TabletKioskPage.tsx:384` `api.fetchScreen(slug)` → `screenSections`(393) 렌더 + `templateKey`(411) 레이아웃 분기 | opt-in(fetchScreen 주입 시) |
| **KPA 주입** | `TabletStorePage.tsx:71` `fetchScreen: (s)=>fetchTabletScreen(s, tabletId)` → `tablet.ts:172` `/tablet/screen` | ✅ KPA 공개 태블릿이 실제 주입·호출 |

→ **적용된 Screen Set 이 KPA 공개 태블릿 뷰어에 실제 반영됨**을 확정. 따라서 "공개 반영은 후속 단계" 류 문구는 **stale(오래됨)**.
(선행 완료 WO: PUBLIC-RUNTIME-READ / KIOSK-CORE-SCREEN-CONSUMER / TEMPLATE-APPLY.)

## 2. 발견한 오래된 문구 (정적 검색 `grep` 결과)

`TabletScreenSetManager.tsx` 3곳:

| 위치 | 오래된 문구 |
|---|---|
| L7 (헤더 주석) | `⚠️ Screen Set 적용은 저장되나 공개 태블릿 화면은 아직 바뀌지 않음(PUBLIC-RUNTIME-READ 후속).` |
| L183 (적용 토스트) | `"…" 적용됨 (공개 반영은 후속 단계)` |
| L255 (amber 경고) | `화면 세트 적용은 저장되지만, 공개 태블릿 화면 반영은 후속 PUBLIC-RUNTIME-READ 단계에서 활성화됩니다. 현재 공개 태블릿은 기존 진열/대기화면 경로를 계속 사용합니다.` |

> 그 외 매치는 범위 밖으로 미변경: L264 `저장…자동 적용되지 않습니다`(정확 — 저장≠적용), L420 `추가 템플릿은 후속 단계에서 제공`(미래 템플릿, 런타임 무관), 그리고 다른 기능 화면(StoreLocalProducts "타블렛 노출 후속", ProductRequests, tabletDisplays.ts is_visible 주석 등)은 Screen Set 과 무관.

## 3. 수정한 문구

| 위치 | 정정 후 |
|---|---|
| L7 | `적용된 Screen Set 은 공개 GET /:slug/tablet/screen → kiosk-core 뷰어에 반영됨(PUBLIC-RUNTIME-READ 완료).` |
| L183 | `"…" 적용됨 — 공개 태블릿 화면에 반영됩니다.` |
| L255 | `적용한 화면 세트는 공개 태블릿 뷰어(고객 화면)에 반영됩니다. 운영 환경에서는 브라우저 캐시·네트워크 상태에 따라 태블릿 새로고침이 필요할 수 있습니다.` |

- 저장/적용/공개확인 의미 분리는 선행 WO 의 개념 안내 카드(L262~265)가 유지 → 본 WO 는 "미반영" 오해만 제거하고 정확한 반영 안내 + 최소 캐시 주의(§5 허용 범위)로 대체.

## 4. 변경 파일 목록

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx` | 문구 3곳(주석/토스트/경고) 정정. 로직·상태·API·스타일 구조 무변경. |

## 5. 금지 범위 준수 (WO §6)

DB migration / API endpoint / public runtime 로직 / kiosk-core 렌더링 / templateKey whitelist / 새 템플릿 / block_type / Screen Set 데이터 생성·삭제 — **전부 없음**. 운영 샘플 무삭제. OPL/service_key·Supplier/Neture 미혼합. **문구 3줄만 변경 ✅**

## 6. typecheck / build

| 대상 | 결과 |
|---|---|
| web-kpa-society `tsc --noEmit` | **PASS** |
| web-kpa-society `vite build` | **PASS** (✓ 13.2s) |

## 7. Live smoke

- 문구 보정 중심 + `/store/commerce/tablet-displays` 인증 필요 → 무인증 정적/빌드 검증만 수행.
- **Live UI smoke: Deferred** — 운영 write/인증 자동 처리 금지(§9). 사용자가 태블릿 작업 묶음 완료 후 최종 브라우저 확인 예정.
- **Pending (manual):** 편집기에서 정정된 안내(반영됨 + 캐시 주의)·적용 토스트가 실제 렌더되는지 + 콘솔 error 0 육안 확인. (선택) 실제 적용 → 공개 뷰어 반영 육안 확인.

## 8. 완료 기준 (WO §11) 대비

- 저장/적용/공개 반영 문구가 현재 runtime 과 일치 ✅ · "후속 단계 공개 반영" 오래된 안내 제거 ✅
- 기능/로직/API/schema 변경 없음 ✅ · typecheck·build PASS ✅ · CHECK commit/push (본 문서)

## 9. 후속 후보 (WO §12)

- `WO-O4O-KPA-TABLET-SCREEN-SET-DIRTY-GUARD-V1` (편집기 미저장 변경 경고)
- `WO-O4O-KPA-TABLET-SCREEN-SET-PREVIEW-PANEL-V1`
- `WO-O4O-KPA-TABLET-TEMPLATE-IDLE-VIDEO-FIRST-V1`
