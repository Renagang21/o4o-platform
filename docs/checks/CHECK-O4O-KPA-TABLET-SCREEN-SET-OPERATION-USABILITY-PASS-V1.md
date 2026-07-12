# CHECK — 태블릿 Screen Set 운영 사용성 점검 V1

> **WO:** WO-O4O-KPA-TABLET-SCREEN-SET-OPERATION-USABILITY-PASS-V1
> **성격:** 운영 사용성 점검 + 최소 프론트 문구 보정 (신규 기능/스키마/API 없음)
> **작성일:** 2026-07-12

---

## 1. 점검한 사용자 흐름 (WO §4)

`/store/commerce/tablet-displays` → 코너 선택 → 현재 적용 세트 확인 → 세트 생성/이름·설명 수정 →
템플릿 선택 → 블록 추가·수정·정렬·숨김 → idle_media/corner_description/product_list/qr_guide 구성 →
저장 → 적용 → 공개 뷰어(미리보기/공개 URL) 확인 → 적용 해제/기본 복귀. 전 흐름을 편집기(`TabletScreenSetManager`) +
호스트 페이지(`StoreTabletDisplaysPage`) 코드로 정적 점검.

## 2. 발견한 혼동 지점 (WO §7·§9)

| # | 혼동 | 위치 |
|---|---|---|
| 1 | **저장 vs 적용 vs 해제** — `정보 저장`/`블록 저장` 2개 + `적용` + `적용 해제`가 모두 같은 스타일, 차이 설명 없음. 저장해도 태블릿에 반영 안 될 수 있음 | TSM 편집기 |
| 2 | **템플릿 vs 블록** 관계 불명 — 템플릿=배치, 블록=내용이라는 안내 없음 | TSM |
| 3 | **내부 jargon 노출** — `legacy`, `store_tablet_displays`, `archive` 가 약사에게 그대로 노출 | TSM |
| 4 | **product_list 0건** 안내 부재 — 진열 제품이 없을 때 목록이 비는 이유 설명 없음 | TSM product_list 블록 |
| 5 | **현재 적용 세트 표기** 가 "현재 적용:"으로 주어 모호 | TSM |
| 6 | (미보정) 공개 반영 amber 경고가 최신 런타임 상태와 어긋날 수 있음 | TSM §8-1 — 아래 후속 |
| 7 | (미보정) 편집기 미저장 변경 경고(dirty) 없음 | TSM — 아래 후속 |

## 3. 최소 보정한 항목 (WO §5, 순수 문구/안내 — 로직 무변경)

1. **개념 안내 카드 추가** (편집기 상단): 화면 세트/템플릿/블록/저장/적용/적용 해제 정의를 3줄로 설명 → #1·#2 핵심 해소.
2. `현재 적용:` → **`이 코너에 적용 중:`**, `없음 (기존 legacy 경로)` → **`없음 (기본 화면 사용 중)`** (#5·#3).
3. `정보 저장` → **`세트 정보 저장`** (저장≠적용, 세트 메타 저장임을 명확화, #1).
4. **블록 섹션 헤딩 + 안내 추가**: "화면에 표시할 블록" + "화면에 들어가는 내용… 변경 후 ‘블록 저장’을 눌러야 저장됩니다" (#1·#2).
5. 블록 표시 체크박스 `표시` → **`화면에 표시`** (#2).
6. 템플릿 도움말 → **"템플릿은 같은 내용을 어떤 배치로 보여줄지만 정합니다(표시할 내용은 아래 블록에서 관리)"** (#2).
7. product_list 도움말 → **"이 코너에 진열된 제품 목록을 그대로 사용… 진열된 제품이 없으면 목록이 비어 보입니다"** (jargon 제거 + #4).
8. 토스트/확인 de-jargon: `적용 해제됨 (기존 legacy 경로 사용)` → **`적용 해제됨 (기본 화면으로 복귀)`**; 보관 확인 `보관(archive)…` → **"보관하시겠습니까? 목록에서 숨겨지며, 적용 중인 세트는 먼저 적용 해제…"** (#3).

## 4. 변경 파일 목록

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx` | 위 8항목 문구/안내 (20+/8-, 로직·상태·API 무변경) |

`StoreTabletDisplaysPage.tsx` / `tabletDisplays.ts` 는 미변경 — 코너 선택·공개 URL 복사·미리보기·빈 상태(0 태블릿)가
이미 존재·발견 가능하여 추가 보정 불필요로 판단.

## 5. 금지 범위 준수 (WO §6)

DB migration / API endpoint / block_type / template_key 추가 없음. idle_video_first·comparison·product_focus 변경 없음.
public runtime·kiosk-core 구조 무변경. 운영 샘플(네뚜레-약국/구강관리) 무삭제. 대량 테스트 데이터 생성 없음.
OPL/service_key·Supplier/Neture 작업 미혼합. **전부 준수 ✅** (변경은 프론트 문구 1파일 한정.)

## 6. typecheck / build

| 대상 | 결과 |
|---|---|
| web-kpa-society `tsc --noEmit` | **PASS** |
| web-kpa-society `vite build` | **PASS** (✓ 13.4s, StoreTabletDisplaysPage 번들 정상) |

## 7. 브라우저 smoke 가능 범위 / Live smoke

- `/store/commerce/tablet-displays`는 **인증 필요** → 무인증 화면 로딩 불가. 정적(코드/문구)·typecheck·build 로 검증.
- **Live UI smoke: Deferred.** 프로덕션 인증/운영 write 자동 처리는 보안 가드로 차단되며(§11 원칙), 사용자가 태블릿
  작업 묶음 완료 후 최종 브라우저 육안 확인 예정.
- **Pending (manual):** 편집기에서 개념 안내·라벨·블록 헤딩·product_list 안내가 실제로 렌더되는지 + 콘솔 error 0 육안 확인.

## 8. 완료 기준 (WO §13) 대비

- 저장/적용/템플릿/블록 개념 이해 가능하도록 문구 보정 ✅
- 현재 적용 세트·공개 화면 확인 경로 명확화(적용중 표기 + 기존 미리보기/공개 URL 유지) ✅
- 기존 공개 화면 동작 불변(런타임 미변경) ✅ · 신규 schema/API/template 없음 ✅
- typecheck/build 통과 ✅ · CHECK commit/push (본 문서)

## 9. 후속 개선 후보 (WO §14 + 점검 발견)

- `WO-O4O-KPA-TABLET-SCREEN-SET-PREVIEW-PANEL-V1` (편집기 내 미리보기 연동)
- `WO-O4O-KPA-TABLET-TEMPLATE-IDLE-VIDEO-FIRST-V1` / `-COMPARISON-V1` / `-CORNER-SET-LIBRARY-V1`
- **(발견) amber 경고 최신화**: "공개 반영은 후속 단계" 문구가 현재 PUBLIC-RUNTIME-READ 상태와 일치하는지 런타임 소유자 확인 후 문구 정합 (본 WO는 런타임 미변경 원칙으로 미터치).
- **(발견) 편집기 미저장 변경(dirty) 경고**: 패널 닫기/코너 전환 시 미저장 블록 편집 유실 방지 안내.
