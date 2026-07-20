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

## 1. P1b operator 409 검증 상태 (§1) — ✅ PASS (프로덕션 브라우저, operator 인증, 2026-07-20)
- operator 계정으로 `DELETE /api/v1/platform/media-library/{referenced}` → **409 `MEDIA_IN_USE_SCREEN_SET`** + 자산 보존(GET 200) 실검증. 상세는 `CHECK-O4O-SCREEN-SET-MEDIA-DELETE-GUARD-V1.md` §operator 409 갱신 참조. (Core 작업과 별개 WO — §1 지침대로 병행 완료.)

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

## 7. 신규·수정·재진입 검증 (§7) — ✅ PASS (프로덕션 브라우저, 매장 owner 인증 세션, 2026-07-20)
`https://kpa-society.co.kr/store/commerce/tablet-displays` (테스트 약국 매장, 보호 샘플 org):
- **신규 제작·저장**: "[검증] Core추출 테스트 코너" 생성 → 저장 성공(POST /store/screen-sets 201 + PUT /blocks 200, 토스트 "생성됨"), **블록 수 5**(ensureAutoBlocks).
- **5개 템플릿 전환**: 기본 코너 안내형/대기 영상형/제품 진열형/코너 소개형/상품 집중형 — 각 선택 시 미리보기 반영 + dirty("변경됨"), 기본형 복귀 시 dirty 해제(normalizeBlocks 서명 baseline 일치).
- **추가 정보(content_list)**: 3건 추가(addContentItems dedup) → **숨기기**(updateContentItem visible=false, 미리보기 2카드로 반영) → **순서 아래로**(moveContentItem swap+reindex) → **삭제**(window.confirm "…원본 콘텐츠는 삭제되지 않습니다" → removeContentItem, 2건으로 재정렬).
- **저장 payload(API 직접 조회)**: **`corner_description.config.body` = string**("<p>이것은 Core 추출 검증용…") — normalizeCornerBody(RichTextEditor {html,json}→HTML) 정상. content_list 2건 **visible=[true,false]** 유지. blockTypes 5개.
- **재진입(더보기→수정)**: 편집기 하이드레이트(seedInitialBlocks) — 제목·본문·템플릿·추가 정보 2건·표시상태([표시,숨김]) 동일 유지, dirty 없음(baseline 일치).
- **미리보기**: 태블릿 화면 / QR 모바일 화면 토글 정상.
- **테스트 데이터 정리**: 테스트 콘텐츠 삭제(soft-delete 200). 보호 샘플 구강/피부·current 무변경.
- **오류**: console error = 초기 auth 부트스트랩 401(→refresh→200, benign 크로스서비스) 1건뿐. pageerror 0, 예상 외 API 오류 0(모든 tablet API 200/201).

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
| 5개 템플릿 동작 | ✅ (실화면 5종 전환 PASS §7) |
| 저장 후 재진입 유지 | ✅ (실화면 재진입 동일 유지 §7) |
| 타블렛·Screen Set QR 결과 불변 | ✅ (공개 경로 무접촉·태블릿 sections 불변) |
| 보호 샘플·current 불변 | ✅ (테스트 세트만 사용·삭제, write 0 on 보호샘플) |
| console·pageerror·API 오류 0 | ✅ (auth 부트스트랩 401만·pageerror0·API 오류0 §7) |
| DB·migration 0 | ✅ |
| commit/push·배포 | ✅ (99d554424 + Dockerfile fix 806188ef2 · web deploy success) |

## 13. 참고(주의)
- 커밋 `99d554424` 에 동시 세션 pre-staged 파일 2개(apps/api-server/src/scripts/drug-otc-grounded-upgrade-runner.ts, docs/checks/CHECK-O4O-OTC-GROUNDED-UPGRADE-RUNNER-HARDENING-DA-V1.md)가 pathspec 없는 `git commit` 로 딸려 커밋됨(내용 보존·push 완료, 데이터 손실 0). 이미 push된 main 을 동시 세션과 rewrite 하지 않음. 교훈=`git commit -- <paths>`.

---

*@o4o/screen-content-core 순수 추출(타입+defaultConfig/normalizeCornerBody/normalizeBlocks/ensureAutoBlocks/seedInitialBlocks/content ops/isValidScreenSetName). 제작기 Core 소비·로컬 중복 제거. 타입=tabletDisplays 유지(구조적 호환·계약 무변경). fixture 30 PASS·tsc 0·DB 0·공개 렌더 무접촉. 실화면 저장/재진입 smoke·P1b operator 409=인증 DEFERRED.*
