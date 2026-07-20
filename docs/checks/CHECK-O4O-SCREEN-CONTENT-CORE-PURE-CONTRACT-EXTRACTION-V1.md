# CHECK-O4O-SCREEN-CONTENT-CORE-PURE-CONTRACT-EXTRACTION-V1

> WO: `WO-O4O-SCREEN-CONTENT-CORE-PURE-CONTRACT-EXTRACTION-V1`
> 성격: 리팩터 — KPA 태블릿 제작기의 순수 콘텐츠 로직을 `@o4o/screen-content-core`로 최소 추출, 제작기를 첫 소비자로 전환.
> Date: 2026-07-16

---

## 0. 결론

KPA 태블릿 제작기(`TabletScreenSetManager`)의 **검증된 순수 콘텐츠 함수**를 신규 순수 TS 패키지 `@o4o/screen-content-core`로 최소 추출하고, 제작기를 첫 실제 소비자로 전환했다. 화면·API·저장 payload·공개 렌더는 **불변**.

- Core = React/DOM/DB/API 무의존 순수 TS. 함수 본문을 **그대로 이동**(byte-equivalent by construction).
- 제작기는 Core 소비 + 로컬 중복 제거. 타입은 `api/tabletDisplays`(API DTO) 유지 → **구조적 호환**(계약 변경/재export 없음).
- fixture 동등성 **30 assertions PASS**. Core tsc 0 · web-kpa-society tsc 0. DB/migration 0.

---

## 1. P1b operator 409 검증 상태 (§1)
- `MEDIA_IN_USE_SCREEN_SET`(미디어 삭제 가드) 검증은 **operator 테스트 계정 필요** → 자동 로그인/권한 환경 없음 → **미검증(Deferred)** 유지. P1b CHECK 상태 그대로. Core 작업은 계속 진행(§1 지침).

## 2. Core로 추출한 타입·함수 (§2)
`packages/screen-content-core/src/index.ts`:
- **타입**: `ScreenBlockType`, `ScreenBlock`, `ContentListItem`(union), `ScreenSetDraft`.
- **함수**: `defaultConfig` · `normalizeCornerBody`(객체 {html,json}→HTML) · `normalizeBlocks`(동등성 서명) · `AUTO_BLOCK_TYPES`+`ensureAutoBlocks`(추가만) · `seedInitialBlocks`(코너 본문 hydrate) · content_list 연산 `contentItemKey`/`reindexContentItems`/`updateContentItem`/`moveContentItem`(oob→동일 ref)/`removeContentItem`/`addContentItems`(dedup) · `isValidScreenSetName`.
- 순수(부수효과 0). 함수 본문 = 제작기 원본 그대로.

## 3. KPA에서 제거한 로컬 중복 (§3)
`TabletScreenSetManager.tsx`:
- 삭제: 로컬 `normalizeBlocks`/`defaultConfig`/`AUTO_BLOCK_TYPES`/`normalizeCornerBody`(export 포함, 외부 소비처 0)/`seedInitialBlocks`/`ensureAutoBlocks`/`key2`.
- ContentListEditor 로컬 `reindex`/`upd`/`move`/`remove`/`add` → Core 함수 호출로 대체(UI 부수효과 setTitleHints/window.confirm/setPicking 만 로컬 유지).
- `nameValid = isValidScreenSetName(name)`. `key2` → `contentItemKey`.
- **UI/단계/API 함수/resolver/렌더러/저장 payload/미리보기 입력 불변**.

## 4. Extension에 남긴 책임 (§제외)
- UI 컴포넌트(ContentListEditor·ContentPickerModal·Step Builder), API/route/DB(`api/tabletDisplays` 저장 payload map 포함), resolver, kiosk 뷰어, 채널·권한 로직, 운영자·공급자 제작기, 코너 적용 로직, 템플릿 추가/삭제 — **이동 안 함**. 타입은 API DTO(tabletDisplays)에 유지.

## 5. payload 전후 동등성 (§5)
- Core 함수 = 원본 본문 그대로 이동 → **구조적 완전 동일(byte-equivalent by construction)**.
- **fixture 30 assertions PASS**: defaultConfig(각 타입)·cornerBody(string/{html}/{json}/null)·normalizeBlocks 서명·ensureAutoBlocks(순서 idle/corner/content/product/qr·qr 라벨·add-only·idempotent 동일 ref)·seed hydrate·content 연산(reindex 0/10/20·move swap+reindex·oob 동일 ref·remove·add dedup 30·update)·isValidScreenSetName.
- 저장 payload는 `saveScreenSetBlocks`(API, 미변경)가 `blocks.map((b,i)=>({blockType,sortOrder:i,isEnabled,config}))` 로 생성 — 입력 blocks 가 동일 로직 산출이므로 payload 동일.

## 6. typecheck·build (§6)
- `@o4o/screen-content-core` tsc: **0**. `@o4o/web-kpa-society` tsc: **0**.
- web build/deploy: **success** (806188ef2). **Docker 빌드 수정**: web-kpa-society Dockerfile 이 각 워크스페이스 package.json/소스를 선별 COPY → 신규 `screen-content-core` COPY 2줄 추가(누락 시 `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` 로 빌드 실패, 첫 배포 99d554424 실패 → Dockerfile fix 후 재배포 success). Core 가 Vite 빌드에 정상 번들됨.

## 7. 신규·수정·재진입 검증 (§7)
- 실제 신규 제작/수정/저장/재진입은 **매장 owner 인증 관리 화면 필요** → 자동 로그인 금지 → **DEFERRED**. 인증 세션 확인 항목:
  1. 신규 제작 저장 → 재진입 시 블록/추가 정보/표시상태 유지.
  2. content_list 추가/수정/삭제/순서/표시·숨김 동작.
  3. 5개 템플릿 동작.
  4. dirty guard(normalizeBlocks 서명) 이동 경고.

## 8. 타블렛·QR 공개 렌더 회귀 (§8)
- 이번 변경은 **제작기(프론트) 순수 로직 소비 전환뿐** — 공개 runtime(API `/tablet/screen`·`/qr/public`)·kiosk 뷰어·resolver 를 **접촉하지 않음** → 공개 렌더는 구조적으로 무영향.
- 배포 후 read-only 확인: **태블릿 sections 불변 PASS**(구강 mode=screen_set·content_list 5 / 피부 4, blockTypes idle_media/corner_description/content_list/product_list/qr_guide 5개 그대로). QR landing screen_set·무인증 정상.
  - (참고) QR landing 이 idle_media 를 제외(4 섹션)하는 것은 **resolver 레벨 동작**으로, 본 WO(프론트 순수 로직 추출, resolver 무접촉)와 무관하다(동시 진행 QR lifecycle/parity 계열 변경). 본 WO 의 회귀 판정 근거 = 태블릿 sections 5개 불변.

## 9. 보호 샘플 영향 없음 (§9)
- DB write 0. 보호 샘플(구강/피부)·current·연결 무접촉.

## 10. 변경 파일
```
packages/screen-content-core/{package.json,tsconfig.json,src/index.ts}   (신규 순수 패키지)
services/web-kpa-society/package.json                                     (@o4o/screen-content-core workspace:*)
services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx    (Core 소비, 로컬 중복 제거)
pnpm-lock.yaml                                                            (workspace link)
```
- **DB·migration 변경 0**. API/route/resolver/kiosk/공개 뷰어 무변경.

## 11. 중지 조건 점검 (§중지)
| 조건 | 발생? |
|------|:-----:|
| 순환 의존성 | ❌ (Core 는 무의존, 소비처만 Core import) |
| 공통 타입 이동이 API 계약 변경 | ❌ (타입은 tabletDisplays 유지·구조적 호환, 재export 없음) |
| 저장 payload/정렬 결과 상이 | ❌ (fixture 30 동일) |
| Core 미사용 빈 패키지 | ❌ (제작기가 12개 심볼 실사용) |
| UI/권한/채널까지 옮겨야만 추출 | ❌ (순수 함수만 분리 가능) |

## 12. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| Core 실제 KPA 제작기에서 사용 | ✅ |
| 미사용 추상화·미래 API 없음 | ✅ |
| 신규·수정 payload 완전 동일 | ✅ (fixture 30) |
| 객체형 corner_description.body 방어 | ✅ (normalizeCornerBody) |
| 추가정보 수정·삭제·순서·표시 유지 | ✅ (content ops) |
| 5개 템플릿 동작 | ✅ (template 로직 무변경) / 실화면 ⏸ 인증 |
| 저장 후 재진입 유지 | ⏸ DEFERRED(인증) |
| 타블렛·Screen Set QR 결과 불변 | ✅ (공개 경로 무접촉) |
| 보호 샘플·current 불변 | ✅ (write 0) |
| console·pageerror·API 오류 0 | ⏸ 실화면 인증 후 |
| DB·migration 0 | ✅ |
| commit/push·배포 | ✅ (99d554424 + Dockerfile fix 806188ef2 · web deploy success) |

## 13. 참고(주의)
- 커밋 `99d554424` 에 동시 세션 pre-staged 파일 2개(apps/api-server/src/scripts/drug-otc-grounded-upgrade-runner.ts, docs/checks/CHECK-O4O-OTC-GROUNDED-UPGRADE-RUNNER-HARDENING-DA-V1.md)가 pathspec 없는 `git commit` 로 딸려 커밋됨(내용 보존·push 완료, 데이터 손실 0). 이미 push된 main 을 동시 세션과 rewrite 하지 않음. 교훈=`git commit -- <paths>`.

---

*@o4o/screen-content-core 순수 추출(타입+defaultConfig/normalizeCornerBody/normalizeBlocks/ensureAutoBlocks/seedInitialBlocks/content ops/isValidScreenSetName). 제작기 Core 소비·로컬 중복 제거. 타입=tabletDisplays 유지(구조적 호환·계약 무변경). fixture 30 PASS·tsc 0·DB 0·공개 렌더 무접촉. 실화면 저장/재진입 smoke·P1b operator 409=인증 DEFERRED.*
