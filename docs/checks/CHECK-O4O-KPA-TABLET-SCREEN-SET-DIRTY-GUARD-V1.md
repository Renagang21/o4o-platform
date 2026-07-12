# CHECK-O4O-KPA-TABLET-SCREEN-SET-DIRTY-GUARD-V1

> WO: `WO-O4O-KPA-TABLET-SCREEN-SET-DIRTY-GUARD-V1`
> 성격: **운영 실수 방지** — 편집기 미저장 변경 경고. 프론트엔드 단일 파일. API/DB/public runtime/kiosk-core 변경 0.
> 대상: `/store/commerce/tablet-displays` · `TabletScreenSetManager.tsx`.

---

## 0. 결론

Screen Set 편집기에 **Dirty Guard** 추가: 세트 정보·블록을 baseline과 비교해 미저장 변경을 감지 → UI 배지/배너 표시 + 이동/적용/해제/보관/생성/이탈 시 확인창. 저장 성공 시 baseline 갱신으로 dirty 해제. 기존 저장/적용/해제 로직 불변.

## 1. dirty로 간주한 변경 (§4)

세트 이름 · 상태 · **templateKey** · block 추가/삭제/순서/표시토글/config — 전부 감지.

## 2. dirty state 구조 (§7 결정)

**파생(derived) 2-flag** — 별도 dirty state를 저장하지 않고 매 렌더 baseline(editDetail)과 비교:
```ts
infoDirty  = editDetail && (editName ≠ name || editStatus ≠ status || editTemplateKey ≠ (templateKey ?? 기본))
blocksDirty= editDetail && normalizeBlocks(blocks) ≠ normalizeBlocks(editDetail.blocks)   // 타입/표시/config+순서, sort_order 값 무시
isDirty    = infoDirty || blocksDirty
```
- **세트 정보 저장 / 블록 저장이 분리**되어 있어 flag도 분리(§7 권장 setInfoDirty/blocksDirty 채택). "블록만 미저장" 같은 상태를 배지로 구분 표시.
- 저장 성공 시 `editDetail`(baseline)을 저장 결과로 갱신 → 해당 flag 해제(별도 reset 로직 불필요, 파생이라 자동).

## 3. guard 적용 동작 (§5)

| 행동 | guard |
|---|---|
| 다른 세트 편집(목록 ‘편집’) | isDirty면 확인창(취소=유지) |
| 화면 세트 적용 | 적용 전용 문구 확인창(미저장은 적용에 반영 안 됨) |
| 적용 해제 | 확인창 |
| 보관(archive) — 편집 중인 세트 | dirty 확인창 → 기존 보관 확인창 |
| 새 세트 생성(handleCreate) | 확인창(생성 후 새 세트 편집 전환 손실 방지) |
| 편집 패널 닫기(X) | 확인창 |
| **브라우저 새로고침/닫기** | `beforeunload` 기본 이탈 경고 |
| (deferred) 다른 코너/태블릿 선택 | **미포함** — StoreTabletDisplaysPage 범위 → 후속 WO(§8) |

확인 문구: 이동/닫기 = "저장되지 않은 변경이 있습니다. …계속하시겠습니까?", 적용 = 적용 전용 문구(§6).

## 4. UI 표시 (§8)

- 편집 패널 헤더에 **변경됨** 배지 + 상단 **미저장 경고 배너**(isDirty).
- "세트 정보 저장" 옆 **저장 필요**(infoDirty), "블록 저장" 옆 **블록 저장 필요**(blocksDirty). 저장 후 배지 사라짐(=저장됨).
- 기존 디자인 내 최소 표시(색/구조 과변경 없음).

## 5. 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx` | dirty 파생 계산 + confirmDiscard + beforeunload + save 성공 시 baseline 갱신 + 목록/적용/해제/보관/생성/닫기 guard + 배지/배너 |

> **단일 프론트 파일.** API/DB/kiosk-core/public runtime/StoreTabletDisplaysPage 무변경.

## 6. 금지 범위 준수

DB migration / API 추가·변경 / public runtime / kiosk-core / templateKey whitelist / 새 템플릿 / block_type / Screen Set 데이터 생성·삭제 / 운영 샘플 삭제 / product_focus 레이아웃 / OPL·service_key·Supplier 혼합 — **전부 없음.**

## 7. 검증 결과

| 항목 | 결과 |
|---|:--:|
| web-kpa-society typecheck | ✅ PASS (exit 0) |
| web-kpa-society build | ✅ PASS (exit 0) |
| 배포 (Deploy Web Services) | ✅ success (run 29191733768, `468a27e57`) |
| browser smoke (비저장) | ✅ PASS (아래) |

### Browser smoke (production, 약국 계정) — 비저장 ✅ PASS

편집기 열기 → 이름 in-memory 편집(저장 안 함) → guard 확인창 dismiss(취소). **저장/write 0 → 운영 샘플 무변경.**

| 항목 | 결과 |
|---|:--:|
| 편집기 열림 · 편집 전 dirty 배지 없음 | ✅ / ✅ |
| in-memory 편집 후 **변경됨** 배지 | ✅ |
| 미저장 경고 배너 | ✅ |
| **저장 필요** 표시 | ✅ |
| 이동 시 guard 확인창 발동 | ✅ ("저장되지 않은 변경이 있습니다 … 계속하시겠습니까?") |
| 취소 시 편집 유지 · 변경됨 유지(무저장) | ✅ |
| console error | ✅ 0 |

> smoke는 dismiss(취소)만 수행 — 저장/적용 write 없음 → 운영 샘플(구강관리 코너) 무변경. beforeunload/적용-전용 문구는 코드+동일 confirmDiscard 경로로 커버.

## 8. 완료 기준 / 후속

- [x] 미저장 변경 UI 표시(배지/배너)
- [x] 이동/적용/해제/보관/생성/닫기 확인창 + beforeunload
- [x] 저장 성공 시 dirty 초기화(baseline 갱신)
- [x] 기존 저장/적용/해제/public runtime 불변
- [x] typecheck/build
- [x] 배포 + browser smoke (비저장) PASS
- [x] CHECK 작성 · commit/push

**후속 후보**: `WO-O4O-KPA-TABLET-CORNER-SWITCH-GUARD-V1`(다른 코너/태블릿 선택 시 guard — StoreTabletDisplaysPage 필요) · PREVIEW-PANEL · TEMPLATE-IDLE-VIDEO-FIRST.
