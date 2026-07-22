# CHECK-O4O-TABLET-SCREEN-SET-EDITOR-SHARED-EXTRACTION-V2A

> WO: `WO-O4O-TABLET-SCREEN-SET-EDITOR-SHARED-EXTRACTION-V2A`
> 성격: 선행 리팩터 — 태블릿 Screen Set authoring 편집기를 공유 패키지로 추출. 기능·저장·5섹션 계약 불변.
> 선행 HOLD: `CHECK-O4O-SUPPLIER-SCREEN-SET-AUTHORING-AND-HUB-PUBLISH-V2`
> Date: 2026-07-22

---

## 0. 결론

web-kpa-society 페이지에 있던 authoring 편집기(`TabletContentStepBuilder` + 내부 컴포넌트 + 템플릿 메타)를 신규 공유 패키지 **`@o4o/tablet-screen-set-editor`** 로 **값 이동**(byte-equivalent)했다. 역할별 API·권한은 기존 `ScreenSetBuilderApi` + `contentSources` capability 로 **주입**받는다(편집기는 앱/역할을 모른다). store/operator consumer 재연결, 회귀 0. **DB·migration·API 계약·저장 payload·5섹션 변경 0.**

## 1. 추출 전 편집기·의존성 (실행 2)

- 원본: `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx`(1313줄) — 리스트 페이지 + 편집기 혼재.
- 편집기 = `TabletContentStepBuilder`(export) + 내부 `TemplateThumb`·`ContentListEditor`·`ContentPickerModal`·`stripIdleForMobilePreview` + 인라인 kiosk 미리보기 + 템플릿 메타(`TEMPLATE_OPTIONS`/`templateMeta`/`templateLabel`/`SELECTABLE_TEMPLATE_OPTIONS`/`LEGACY_ONLY_TEMPLATE_KEYS`/`BUILDER_STEPS`/`CORNER_DESC_PROMPT`/`DEFAULT_TEMPLATE_KEY`/`DISCARD_MSG`).
- 공유 계약(이미 존재, 운영자 WO 도입): `ScreenSetBuilderApi`·`ContentSourceKind`·`DEFAULT_CONTENT_SOURCES`.
- 편집기 내부 유일 앱 결합 = `api = defaultStoreBuilderApi` 기본값 3곳(defaultStoreBuilderApi 가 store 런타임 함수 import) + `buildProductVariantLabel`(순수 util).

## 2. 생성한 공유 패키지·공개 인터페이스 (실행 5)

`packages/tablet-screen-set-editor/`(main=`src/index.tsx`, source-consumed=tablet-kiosk-core 패턴, tsconfig jsx=react-jsx·noEmit).
- **exports**: `TabletContentStepBuilder`(편집기), `templateLabel`, `LEGACY_ONLY_TEMPLATE_KEYS`, `ScreenSetBuilderApi`, `ContentSourceKind`, `DEFAULT_CONTENT_SOURCES`, `Toast`, API-DTO 타입(`ScreenSet`/`ScreenSetDetail`/`ScreenSetStatus`/`StoreContentSearchResult`/`O4oDescriptionSearchResult`) + re-export(`ScreenBlock`/`ScreenBlockType`/`ContentListItem`/`TabletKioskApi`/`TabletScreenResponse`).
- **peerDeps**: react/react-dom/lucide-react + `@o4o/screen-content-core`·`@o4o/tablet-kiosk-core`·`@o4o/content-editor`.

## 3. 공유 영역 / 앱 잔류 영역 (실행 3)

| 영역 | 위치 |
|------|------|
| 편집기 + 내부 + 템플릿 메타 + capability/adapter 타입 + buildProductVariantLabel | **패키지** |
| 리스트 페이지 `TabletScreenSetManager`(default) · `defaultStoreBuilderApi`(store API 인스턴스) · `ScreenSetUsageTablet` · `Props` · `TabletContentLibraryList` | **web-kpa-society 잔류** |

- 타입: `ScreenBlock`/`ScreenBlockType`/`ContentListItem` 은 `@o4o/screen-content-core`(단일 소스, 소비처 tabletDisplays 와 byte-identical → 구조적 호환). API-DTO 5종은 패키지가 정의(tabletDisplays 와 동일 shape → 계약 변경 0).

## 4. Adapter·callback·capability 계약 (실행 4)

- `TabletContentStepBuilder` props: `{ initialDetail, onCancel, onSaved, onToast, previewApi?, storeSlug?, api, contentSources? }` — **`api` 필수화**(기존 `defaultStoreBuilderApi` 기본값 제거 → consumer 명시 주입). `ContentListEditor`/`ContentPickerModal` 도 `api` 필수.
- 편집기는 **store/operator/supplier API 경로·membership·supplier_id/org 소유권·HUB 정책·의약품 정책·canonical·공개 QR 을 직접 모름**. 전부 주입/정책 밖.

## 5·6. consumer 재연결 (실행 6·7)

| consumer | 변경 |
|----------|------|
| `TabletScreenSetManager.tsx`(store 리스트) | 편집기·라벨·상수·타입을 패키지에서 import, `defaultStoreBuilderApi` 잔류·`api={defaultStoreBuilderApi}` 명시 주입 |
| `OperatorTabletScreenSetsPage.tsx` | `TabletContentStepBuilder`+`templateLabel` → 패키지(2 import→1). 운영자 api 주입 불변 |
| `api/operatorTabletScreenSets.ts` | `type ScreenSetBuilderApi` → 패키지 |
| `StoreTabletDisplaysPage.tsx` | default `TabletScreenSetManager` 잔류 import + `templateLabel` → 패키지 |
| `TabletCornerContentsPanel.tsx`·`TabletCornerSwapModal.tsx`·`HubScreenSetLibraryPage.tsx` | `templateLabel` → 패키지 |
- `services/web-kpa-society/package.json` + Dockerfile(package.json 레이어 + 소스 레이어 COPY 2줄) 추가.

## 7·8·9. 회귀·불변 (실행 9·10)

- **패키지 역의존 0**: 패키지가 web-kpa 앱 파일(tabletDisplays/TabletContentLibraryList/productVariantLabel)·auth·router·toast singleton 을 import 하지 않음(주석 언급 제외 실 import 0). 순환 의존 없음(패키지→core/kiosk/editor 만).
- **저장 payload·5섹션·블록 계약·store/operator API 불변**: 편집기 함수 본문 값 이동, 저장은 주입된 api 로 동일 라우팅. 옛 경로 잔존 import 0.
- **회귀 테스트**: `store-public-tablet-content-resolve` 5 PASS(편집기가 소비하는 순수 로직).

## 10·11. 데이터·역의존 (실행 8·12)

- DB write 0 · migration 0. operator 9행·store 27행(직전 실측) 무변경(코드만 이동).

## 12·13. typecheck·build (실행 10)

- `@o4o/tablet-screen-set-editor` tsc `--noEmit`: **0**.
- `@o4o/web-kpa-society` tsc `--noEmit`: **0**.
- **vite build: success**(53s, StoreTabletDisplaysPage·OperatorRoutes 청크 정상 번들 — source-consumed 패키지 반영). Dockerfile COPY 2줄 추가(누락 시 배포 실패 방지).

## 14. 브라우저 smoke (실행 11) — DEFERRED(배포 후)

- [ ] 매장: 태블릿 콘텐츠 신규 제작 4템플릿·저장·재진입·추가 정보(추가/순서/표시/삭제)·미리보기 정상.
- [ ] 운영자: 운영자 원본 제작·저장·재진입 정상.
- [ ] 매장 HUB(운영자 원본) 목록·미리보기·가져오기 정상(templateLabel 라벨 정상).

## 15. 후속 supplier consumer 연결 가능 여부 (실행 15)

- ✅ 확보. supplier authoring 화면(web-neture, V2c)은 `@o4o/tablet-screen-set-editor` 를 dep 추가 후 `TabletContentStepBuilder` 에 **supplier ScreenSetBuilderApi** + `contentSources`(예 `['spd','o4o']`) 주입만으로 재사용. 편집기 코드 무변경.

## 16. 중지 조건 점검

| 조건 | 발생? |
|------|:-----:|
| 패키지가 web-kpa 앱 파일 역import 필요 | ❌ |
| DB·migration·API 계약 변경 필요 | ❌ |
| 저장 payload/조회 응답 변경 | ❌ |
| store/operator 동작 유지 불가 | ❌ (tsc 0·build 0·테스트 PASS) |
| 5섹션·QR 4섹션 계약 변경 | ❌ |
| 역할 권한을 편집기 내부 혼합 | ❌ (주입) |
| picker/preview 앱 강결합 | ❌ (props 주입) |
| supplier 구현해야만 검증 가능 | ❌ (store/operator 로 검증) |

## 17. 변경 파일

```
packages/tablet-screen-set-editor/{package.json,tsconfig.json,src/index.tsx}   (신규 공유 편집기 패키지)
services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx          (리스트 페이지 잔류 + 패키지 소비 + api 주입)
services/web-kpa-society/src/pages/operator/tablet/OperatorTabletScreenSetsPage.tsx  (패키지 import)
services/web-kpa-society/src/api/operatorTabletScreenSets.ts                    (ScreenSetBuilderApi 타입 패키지)
services/web-kpa-society/src/pages/pharmacy/{StoreTabletDisplaysPage,TabletCornerContentsPanel,TabletCornerSwapModal,HubScreenSetLibraryPage}.tsx  (templateLabel 패키지)
services/web-kpa-society/package.json + Dockerfile + pnpm-lock.yaml             (workspace dep + COPY)
```
- **supplier 기능 구현 0 · 중복 편집기 0 · DB/migration 0.**
