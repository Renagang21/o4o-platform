# CHECK-O4O-TABLET-VIEWER-LANGUAGE-SELECT-AND-SPD-FALLBACK-V1

> WO: `WO-O4O-TABLET-VIEWER-LANGUAGE-SELECT-AND-SPD-FALLBACK-V1`
> 성격: 태블렛 이용자 표시 언어 선택(7개) + STORE 설명서 선택→ko→없음 fallback. **DB·스키마·migration 0.** additive/optional.
> Date: 2026-07-22 · commit 28c811519 · 배포 API+kpa-society web success.

---

## 0. 결론 — ✅ PASS

태블렛 이용자 화면(kiosk-core)에 **표시 언어 선택(O4O 1차 7개 언어)** 을 추가하고, content_list 의 STORE canonical 설명서를 **선택 언어 → ko → 없음**(strict, 다른 외국어 임의 표시 없음)으로 표시한다. 선택값은 **브라우저 localStorage 에만** 유지(서버·Screen Set 미저장 → 다른 브라우저·이용자 전파 없음). 전 경로 additive/optional 로, QR·매장/운영자/공급자 미리보기 등 **기존 소비처는 byte-equivalent**. DB write 0.

## 1. 기존 언어 결정·SPD 조회 방식 (실행 1·2)

- 태블렛 뷰어 `TabletKioskPage`(kiosk-core)에 **표시 언어 상태·런타임 언어 파라미터 없었음**. content_list SPD 의 언어는 **저작 시점 config `item.language`(기본 ko)** 고정. 런타임 재선택 경로 부재.
- adapter `fetchProductDescription(masterId, language)` SQL 은 `(lang=$2) DESC,(lang='ko') DESC,updated_at DESC` → 선택→ko→**그 외 최신**(strict 아님, ko 도 없으면 다른 외국어 반환 가능).
- 공개 tablet endpoint `GET /:slug/tablet/screen` 은 `tabletId` 만 파싱(언어 없음).

## 2. 구현한 언어 선택 UI (실행 4)

- **7개 언어 = 기존 `LOCALE_LABELS` 재사용**(태블렛 전용 목록 신규 하드코딩 없음): `ko 한국어 · en English · zh 中文 · ja 日本語 · vi Tiếng Việt · th ภาษาไทย · id Bahasa`(값=매장 축 SSOT `STORE_MLC_LOCALE_LABELS` 와 동일, [[CHECK-O4O-MULTILINGUAL-LANGUAGE-UI-CONSOLIDATION-V1]]). 순서 = 정의 순(ko 우선).
- 좌상단 44px 셀렉터(우상단 QR 버튼과 대칭). **실 태블렛 런타임 + 적용 Screen Set(screen_set) 에서만 노출** — legacy/미리보기/임베드/fetchScreen 미주입 서비스(GP·KCos) 미노출.
- 7 언어 미정의 시 임의 결정 금지 조항 해당 없음: **공통 설정에 7개 전량 정의 확인**(gap 0).

## 3. 선택값 유지 범위 (실행 5) — 브라우저 로컬만

- `localStorage['o4o_tablet_viewer_lang']`. 서버·Screen Set·태블렛 데이터에 **저장하지 않음**. 다른 브라우저·이용자에게 전파 없음(§7 실측).

## 4. 선택 언어 → ko → 없음 검증표 (실행 6) — ✅ (트랜잭션 fixture, 7 언어 전량)

`fetchProductDescription` strict SQL(`language IN (선택, 'ko')` + `(lang=선택) DESC,(lang=ko) DESC`)을 BEGIN…ROLLBACK fixture 로 검증(영구 write 0):

| master 언어 보유 | ko | en | zh | ja | vi | th | id |
|---|---|---|---|---|---|---|---|
| **M1 ko+en+zh** | ko | **en** | **zh** | ko | ko | ko | ko |
| **M2 en+zh (ko 없음)** | **NONE** | en | zh | **NONE** | **NONE** | **NONE** | **NONE** |
| **M3 ko only** | ko | ko | ko | ko | ko | ko | ko |

- 선택 언어 존재 → 그 언어(M1 en/zh, M2 en/zh). 선택 없고 ko 있음 → ko(M1 ja/vi/th/id, M3 전량). **선택+ko 모두 없음 → 없음**(M2 ko/ja/vi/th/id) — **다른 외국어 임의 fallback 0**(ja 선택 시 en/zh 표시 안 함).

## 5. 설명서 없음 처리 (실행 7)

- strict 로 row 없음 → adapter null → resolver item skip(기존 "미존재 → 카드 생략" 계약 그대로). 카드 0 이면 content_list 섹션 자체 미표출(뷰어 기존 안전 빈 상태).

## 6. '태블릿' 잔여 사용자 노출 문구 (실행 8)

- **공유 편집기 `@o4o/tablet-screen-set-editor`**: 사용자 노출 '태블릿' → '태블렛' 25개소 통일(라벨·토스트·안내·확인창·예제 프롬프트). 운영자 nav 라벨 `매장 HUB 태블릿 화면` → `태블렛`.
- **코드 식별자·API·DB명 불변**: Korean '태블릿' 은 영문 식별자(`tablet`, `@o4o/tablet-*`, `/tablet/screen`, `key:'tablet'`)에 존재하지 않으므로 텍스트만 치환(식별자 0건 변경).
- 태블렛 소비자 뷰어(kiosk-core)·QR 뷰어엔 사용자 노출 '태블릿' 없음(주석만) → 신규 셀렉터는 '표시 언어' 문구 사용.

## 7. Screen Set·원본/사본·QR·권한 회귀 (실행 6·10) — ✅

- **언어 변경 시 Screen Set·콘텐츠 데이터 무수정**: 언어는 조회 파라미터일 뿐(서버 write 0). 공급자 원본·매장 사본 독립 불변.
- **QR 계약 유지**(별도 소비처): QR landing 은 language 미전달 → 기존 동작. 실측 content_list o4o 카드 = 태블렛 ko 와 동일(htmlLen 1147, 회귀 0).
- **로그인·매장 접근·비공개 정책 불변**: 태블렛/QR 공개 경로 무변경.
- **의약품 약국 전용 경계 불변**: 렌더 경로엔 drug 게이트 없음(게시·가져오기 시점 medication-guard 가 담당, 미접촉). SPD `STORE·canonical` 필터 유지(미승인·타 공급자 사유 콘텐츠 유입 없음).

## 8. typecheck·test·build·배포 (실행 9·10)

- tsc 0: api-server(변경 파일) · kiosk-core · tablet-screen-set-editor · web-kpa-society. **shared 소비처 build 0**: web-kpa-society · **web-glycopharm**(kiosk) · **web-neture**(editor). (GP/KCos 는 fetchScreen 미주입 → 셀렉터·언어 경로 dead → 무영향.)
- 배포: **Deploy API Server success** + **deploy-web(kpa-society) success**.

## 9. 프로덕션 브라우저 smoke (실행 10) — ✅ PASS

`/tablet/네뚜레-약국?tabletId=…`(구강 코너, 비로그인):
- **7개 언어 셀렉터 노출**(한국어/English/中文/日本語/Tiếng Việt/ภาษาไทย/Bahasa, 값 ko,en,zh,ja,vi,th,id), 기본 ko.
- en 선택 → `localStorage=en` + **`?language=en` 재조회**. th 선택 → localStorage=th. **새로고침 후 th 유지**(persisted). **새 컨텍스트(무 localStorage) → ko**(전파 없음).
- **console·pageerror 0.**
- 라이브 API: `?language=ko/en/vi/ja/zz/빈값` 전량 200·screen_set·o4o 2 카드(구강 master ko-only → 전부 ko fallback, 파라미터 threading + 미존재 언어 안전 확인). 잘못된 언어(zz) 무시(기본 동작).

## 10. DB·스키마 변경 (실행 10)

- **DB write 0 · 스키마 0 · migration 0 · 백필 0 · 자동 번역 0 · 자동 복사 0.** fixture 는 BEGIN…ROLLBACK(영구 write 0).

## 11. 변경 파일

```
apps/api-server/.../store-public-tablet-content-source.ts   (fetchProductDescription opts.strictFallback)
apps/api-server/.../store-public-tablet-content-resolve.ts   (resolveContentListItems viewerLanguage override)
apps/api-server/.../store-public-screen-set-resolve.ts       (ResolveScreenSetInput.viewerLanguage)
apps/api-server/.../store-public-tablet.handler.ts           (?language 파싱·검증 7종)
services/web-kpa-society/src/api/tablet.ts                    (fetchTabletScreen language 쿼리)
services/web-kpa-society/src/pages/tablet/TabletStorePage.tsx (fetchScreen params.language 전달)
services/web-kpa-society/src/config/operatorMenuGroups.ts     (nav 라벨 태블렛)
packages/tablet-kiosk-core/src/TabletKioskPage.tsx           (viewerLang 상태·localStorage·셀렉터 UI)
packages/tablet-kiosk-core/src/types.ts                      (fetchScreen params.language)
packages/tablet-screen-set-editor/src/index.tsx             (사용자 노출 태블릿→태블렛 25)
docs/checks/CHECK-O4O-TABLET-VIEWER-LANGUAGE-SELECT-AND-SPD-FALLBACK-V1.md
```

## 12. 공급자 태블렛 최종 E2E 착수 가능 여부 — ✅ 가능

`공급자 → 매장 가져오기 → 태블렛 적용 → 이용자 언어 선택` 전체 E2E 의 마지막 축(이용자 언어 선택 + SPD fallback)이 프로덕션 실증됨. 공급자 STORE 설명서 저장·철회(선행 WO), 매장 가져오기/태블렛 적용(선행 태블렛 트랙), 이용자 7개 언어 선택(본 WO)이 모두 계약 확정 → **최종 E2E 착수 가능**.

---

## 중지 조건 점검

| 조건 | 발생? |
|------|:-----:|
| 공용 SPD API 변경이 태블렛 외 화면 광범위 영향 | ❌ (viewerLanguage/opts 미전달 시 byte-equivalent, QR·미리보기 실측 무변경) |
| 선택 언어를 서버/Screen Set 저장해야 구현 가능 | ❌ (localStorage 만으로 충족) |
| QR 다국어 계약 충돌 | ❌ (QR 미전달 → 기존 동작) |
| 스키마 변경 필요 | ❌ (0) |
| 의약품 접근 경계 약화 | ❌ (렌더 경로 게이트 무접촉·STORE canonical 필터 유지) |
| 다른 언어 자동 생성·복사 | ❌ (조회만) |
