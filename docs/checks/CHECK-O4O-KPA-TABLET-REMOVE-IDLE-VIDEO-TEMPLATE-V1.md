# CHECK-O4O-KPA-TABLET-REMOVE-IDLE-VIDEO-TEMPLATE-V1

> WO: `WO-O4O-KPA-TABLET-REMOVE-IDLE-VIDEO-TEMPLATE-V1`
> 성격: UX 정리 — 신규 제작 템플릿 선택지에서 중복된 `대기 영상형(idle_touch_video)` 제거. legacy 콘텐츠·렌더러·서버 계약은 불변.
> Date: 2026-07-20

---

## 0. 결론

모든 템플릿이 **대기 화면(대기 영상)** 단계를 가지므로, 전용 템플릿 `대기 영상형(idle_touch_video)` 은 신규 제작에서 중복 선택지가 되었다. 이를 **신규 제작 카드**와 **콘텐츠 목록 템플릿 필터**에서 제거했다. 기존 idle_touch_video 화면 세트·공개 렌더·서버 whitelist·`@o4o/screen-content-core` 계약은 **불변**.

- 최종 신규 제작 템플릿 = **4종**: 기본 코너 안내형(`corner_information_basic_v1`) / 상품 집중형(`product_focus`) / 코너 소개형(`corner_overview_qr`) / 제품 진열형(`product_grid_qr`).
- **신규 선택 목록**(`SELECTABLE_TEMPLATE_OPTIONS`, 4종)과 **legacy 포함 metadata**(`TEMPLATE_OPTIONS`, 5종) 분리 → 기존 콘텐츠의 라벨·썸네일·편집 진입 유지.
- 모든 템플릿의 **대기 화면 입력 단계**는 그대로 유지(제거 대상 아님).

---

## 1. idle_touch_video 소비처 조사 (실행 1)

| 소비처 | 파일 | 조치 |
|--------|------|------|
| 신규 제작 카드 | `TabletScreenSetManager.tsx` step 0 grid | **제거** — `TEMPLATE_OPTIONS` → `SELECTABLE_TEMPLATE_OPTIONS`(4종) |
| 목록 템플릿 필터 | `TabletContentLibraryList.tsx` `templateOptions` | **제거** — `hiddenTemplateFilterKeys` 로 legacy 키 필터 (콘텐츠는 '템플릿 전체'에 유지) |
| 라벨 해석 | `templateMeta`/`templateLabel` | **유지** — `TEMPLATE_OPTIONS`(5종) 그대로 → 기존 콘텐츠 라벨 '대기 영상형' 해석 |
| 썸네일 | `TemplateThumb` switch `case 'idle_touch_video'` | **유지**(legacy 표시) |
| 서버 write whitelist | `store-tablet.routes.ts` `SET_TEMPLATE_KEYS_ALLOWED` | **유지**(idle_touch_video 포함) — 기존 세트 저장 시 key 유지 허용 |
| 공개 렌더러 | `tablet-kiosk-core` `TabletKioskPage` `isIdleTouch` + hero | **유지** — 태블릿/QR 공개 렌더 보존 |
| 순수 계약 | `@o4o/screen-content-core` | **무접촉**(템플릿 키 없음) |

## 2. 신규 선택 목록 / legacy metadata 분리 (실행 2)

`TabletScreenSetManager.tsx`:
- `TEMPLATE_OPTIONS`(5종, idle_touch_video 포함) = **legacy 포함 metadata** — `templateMeta`/`templateLabel`/`TemplateThumb` 가 소비. 기존 콘텐츠 표시·편집 진입에 필요.
- `export const LEGACY_ONLY_TEMPLATE_KEYS = ['idle_touch_video']`.
- `SELECTABLE_TEMPLATE_OPTIONS = TEMPLATE_OPTIONS.filter(t => !LEGACY_ONLY_TEMPLATE_KEYS.includes(t.key))`(4종) = **신규 제작 카드 + 필터 노출 목록**.

## 3. 신규 제작/필터에서 제거 (실행 3)

- 신규 제작 step 0 카드 grid: `SELECTABLE_TEMPLATE_OPTIONS.map`(4종). 신규 payload 로 idle_touch_video 생성 경로 없음.
- 목록 필터: `hiddenTemplateFilterKeys={LEGACY_ONLY_TEMPLATE_KEYS}` 전달 → 필터 드롭다운에서 '대기 영상형' 선택지 제거. **legacy 세트는 '템플릿 전체'에 그대로 노출**(badge/편집 유지, 필터 격리만 불가).

## 4. legacy 편집 진입 호환 (실행 4)

- 기존 idle_touch_video 세트 편집 진입: `templateKey` 초기값 = idle_touch_video(카드 4종에 없음 → '선택됨' 없음).
- step 0 상단에 **기존 템플릿 안내** 배너: "이 콘텐츠는 기존 템플릿 **대기 영상형**(으)로 만들어졌습니다. 그대로 저장하면 유지되며, 아래에서 다른 템플릿을 고르면 변경됩니다."
- 다른 4종 선택 시 변경 / 미선택 시 idle_touch_video 유지(서버 whitelist 허용). **자동 변환·일괄 변경 없음**.

## 5. typecheck·build (실행 5)

- `@o4o/web-kpa-society` tsc `--noEmit`: **0**.
- 배포: (아래 커밋) → Deploy Web Services (web-kpa-society).

## 6. 프로덕션 브라우저 검증 (실행 6) — ✅ PASS (프로덕션 브라우저, 매장 owner 인증 세션, 2026-07-20)

`https://kpa-society.co.kr/store/commerce/tablet-displays` (테스트 약국 매장, 보호 샘플 org · 배포 734ca208a):

- [x] **신규 제작 카드 4종만**: 태블릿 화면 만들기 → 기본 코너 안내형(선택됨)/상품 집중형/코너 소개형/제품 진열형. **대기 영상형 카드 없음** ✅.
- [x] **4종 선택·미리보기**: 각 카드 클릭 가능, 오른쪽 미리보기 반영. (저장은 이번 WO가 손대지 않은 `handleSave`/`createScreenSet`/`saveScreenSetBlocks` 경로 — 직전 Core WO 413f9b445 에서 5종 전체 신규 제작·저장 PASS 검증됨. 이번 변경은 카드 목록 소스만 4종으로 축소하므로 저장 경로 회귀 없음.)
- [x] **대기 화면 입력 단계 유지**: 신규·수정 셸 모두 단계 2 '대기 화면' 존재 ✅ (제거 대상 아님).
- [x] **목록 템플릿 필터 4종**: 템플릿 전체/기본 코너 안내형/상품 집중형/제품 진열형/코너 소개형. **대기 영상형 선택지 없음** ✅.
- [x] **기존 대기 영상형 콘텐츠 legacy 호환**: '구강관리 대기 영상형'·'피부관리 대기 영상형'(idle_touch_video) 세트가 목록 '템플릿 전체'에 **badge '대기 영상형' 그대로 노출** ✅. 편집 진입(더보기→수정) OK → step 0 상단 **기존 템플릿 안내 배너** 표시("이 콘텐츠는 기존 템플릿 **대기 영상형**(으)로 만들어졌습니다. 그대로 저장하면 유지되며…") ✅, 카드 4종 중 **선택됨 없음**(현재 key=idle_touch_video 는 4종 밖) → 다른 4종 선택 시 변경 가능 ✅. **저장하지 않고 목록 복귀 → template key 유지**(총 12건·대기 영상형 세트 불변) — 자동 변환 0 ✅.
- [x] **legacy 공개 렌더 보존**: 편집 진입 미리보기가 idle_touch_video hero("화면을 터치하여 자세히 보세요 / Touch to explore" + 코너 콘텐츠 5카드) 정상 렌더 ✅ (kiosk `isIdleTouch` 유지).
- [x] **보호 샘플·current 무변경**: 편집 진입만 하고 **저장 안 함**(read-only 확인), DB write 0. 총 12건·구강/피부 세트 불변 ✅.
- [x] **오류 0**: console error = 초기 auth 부트스트랩 `/auth/me` 401 1건뿐(benign 크로스서비스). pageerror 0, 예상 외 API 오류 0. migration/일괄 변경 0 ✅.

## 7. 변경 파일

```
services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx   (신규 선택/legacy metadata 분리, 카드 4종, legacy 안내)
services/web-kpa-society/src/pages/pharmacy/TabletContentLibraryList.tsx (필터 hiddenTemplateFilterKeys)
```

- **DB·migration·API 계약·서버 whitelist·kiosk 렌더러·screen-content-core 무변경.**

## 8. 중지 조건 점검

| 조건 | 발생? |
|------|:-----:|
| 기존 대기 영상형 콘텐츠 편집 진입 불가 | ❌ (편집 진입 유지 + legacy 안내) |
| template key 자동 변경 | ❌ (미선택 시 유지, 자동 변환 0) |
| 신규 옵션 숨기려 공개 렌더 호환 제거 필요 | ❌ (kiosk isIdleTouch 유지) |
| 다른 템플릿에서 대기 화면 단계 사라짐 | ❌ (BUILDER_STEPS '대기 화면' 유지) |

---

*신규 제작 템플릿에서 대기 영상형(idle_touch_video) 제거 — SELECTABLE_TEMPLATE_OPTIONS(4종) / TEMPLATE_OPTIONS(legacy 5종) 분리, 필터 hiddenTemplateFilterKeys. legacy 편집 진입 안내 배너 + 자동 변환 0. 서버 whitelist·kiosk 렌더러·screen-content-core 불변. tsc 0·프로덕션 브라우저 실검증 PASS(신규 4종·필터 4종·legacy 편집 진입·공개 렌더·write 0). commit 734ca208a.*
