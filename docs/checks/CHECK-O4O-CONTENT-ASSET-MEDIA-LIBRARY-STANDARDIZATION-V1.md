# CHECK-O4O-CONTENT-ASSET-MEDIA-LIBRARY-STANDARDIZATION-V1

Status: DONE — 코드 완료 + 4서비스 typecheck EXIT0 + Cloud Run 배포 성공 + 통합 picker 프로덕션 브라우저 smoke PASS (2026-07-08)
WO: `WO-O4O-CONTENT-ASSET-MEDIA-LIBRARY-STANDARDIZATION-V1`

> **Unit A(공용 MediaPickerModal) 프로덕션 브라우저 smoke PASS** (kpa-society.co.kr, §6.1). Unit B 편집기 배선은 코드/typecheck/배포 검증(테스트 계정 게이트로 해당 DOM 미클릭, §6.1).

---

## 1. 작업 개요

IR-O4O-STANDARD-CONTENT-EDITOR-PLATFORM-EVALUATION-V1 P0 Gap "미디어 라이브러리 표준화"를 구현. 45개 RichTextEditor 소비 화면 중 3개(Neture)만 미디어 라이브러리 연동이던 구조를, 공용 컴포넌트 + Media Type 인지형 계약 + 전 서비스 배선으로 표준화.

**사용자 지시 순서 준수**: §7.1 접근성 선행 확인 → Neture 기준 구현 → 검증 → KPA/GP/KCos 확장. Shared Module Change Protocol 준수(소비처 전수 식별 후 동시 마이그레이션).

---

## 2. §7.1 선행 확인 결과 (착수 전, read-only)

**백엔드** `GET /api/v1/platform/media-library` (`media-library.controller.ts`) — 가드 = `authenticate`(JWT)만, **service scope 가드 없음**. 목록/조회/업로드는 인증 사용자면 접근, 폴더이동·삭제만 operator 전용.

| 서비스 | media API 클라이언트 | 판정 |
|---|---|---|
| KPA | 기존 `src/api/media.ts` | 접근 가능 |
| Neture | 기존 `src/lib/api/media.ts` | 접근 가능 |
| GlycoPharm | 신규 추가 | 접근 가능(엔드포인트 도달) |
| K-Cosmetics | 신규 추가 | 접근 가능(엔드포인트 도달) |

→ **접근 불가 서비스 없음. API 접근 표준화 WO 분리 불필요.**

**추가 발견**: WO는 "공용 picker 없음"을 가정했으나 실제로는 KPA·Neture에 거의 동일한 `MediaPickerModal` 2개 존재(KPA=Neture 이식판). WO §14.1(중복 증가 금지) 취지대로 **통합**으로 진행.

---

## 3. 구현 — Unit A (Picker 통합)

- **신규** `packages/store-ui-core/src/components/media/MediaPickerModal.tsx` — dumb 컴포넌트. UI/뷰 상태는 내부, IO는 `api`(MediaPickerApi 어댑터) 주입, 권한은 `isOperator` prop. store-ui-core는 auth/apiClient 무의존(기존 `StoreLocalProductsApi`/`SupplyCatalogApi` 관례 동일). `MediaPickerModal`/`MediaPickerApi`/`MediaAssetItem` export.
- Neture/KPA 로컬 `MediaPickerModal` → **얇은 wrapper**(서비스 `mediaApi`+`useAuth` isOperator 주입). 소비처 6파일 무변경.
- `web-neture` package.json + Dockerfile에 `@o4o/store-ui-core` 추가(기존 미의존).
- 커밋 `3781acda0` (683 ins / 1190 del — UI 중복 제거 순감)

## 4. 구현 — Unit B (편집기 계약 + 커버리지)

- **`@o4o/content-editor`**: `onMediaLibraryPick` 를 Media Type 인지형으로 전환(§8.1).
  - `types.ts`: `MediaInsert { type:'image'|'video'; url; title?; thumbnailUrl?; sourceType?:'youtube'|'o4o_storage'|'external' }` 신설+export. `onMediaLibraryPick: (insertMedia:(media:MediaInsert)=>void)=>void`.
  - `Toolbar.tsx`: `insertMediaIntoEditor` — image=insertImg, **video=기존 YouTube 경로(`setYoutubeVideo`)만**. mp4/O4O Storage/External은 WO-3(미구현).
- **Neture 소비처 3화면 동시 마이그레이션**: `SupplierProductImportPage`·`SupplierProductCreatePage`·`ProductDetailDrawer`(9개 onMediaLibraryPick 인스턴스 + state 타입 + picker onSelect→`{type:'image',url,title}`).
- **`ProductionMaterialEditorShell`**(공용 셸): `onMediaLibraryPick`/`onImageUpload` prop 추가(구조적 `InjectedMediaInsert`=content-editor MediaInsert 동일), 편집기에 forward. additive·하위호환.
- **GlycoPharm/K-Cosmetics**(신규 커버리지): media API client + 공용 picker wrapper 신설 + `ProductionMaterialEditorPage`에 미디어 라이브러리(이미지 삽입/업로드) 배선.
- 커밋 `c29e4e846` (13 files, 424 ins / 44 del) + `86b31b4e5` (neture Dockerfile fix)

---

## 5. 검증 (완료분)

| 항목 | 결과 |
|---|---|
| Neture typecheck | **EXIT 0** |
| KPA typecheck | **EXIT 0** |
| GlycoPharm typecheck | **EXIT 0** |
| K-Cosmetics typecheck | **EXIT 0** |
| content-editor build (tsup) | **EXIT 0** |
| Cloud Run 배포 — deploy-neture | **✓ success** (Dockerfile fix 후) |
| Cloud Run 배포 — deploy-kpa-society | **✓ success** |
| Cloud Run 배포 — deploy-glycopharm | **✓ success** |
| Cloud Run 배포 — deploy-k-cosmetics | **✓ success** |
| 4개 web 서비스 HTTP 200 | **✓** |

## 6. 미완/주의

### 6.1 브라우저 DOM smoke
**Unit A (공용 MediaPickerModal) — PASS.** kpa-society.co.kr, 2026-07-08, KPA admin(sohae2100). `내 약국 → 매장 경영활용 제품(/store/commerce/local-products) → 상품 등록 → "이미지 불러오기"` → **공용 MediaPickerModal 정상 렌더**:
- 제목 "제품 대표 이미지", 탭 "새 이미지 업로드"/"라이브러리"
- 폴더: 상품 대표이미지/설명 이미지/배너·홍보/브랜드·로고/기타 (공용 FOLDERS 일치)
- 동의 문구 = 공용 컴포넌트 CONSENT_TEXT 일치
- 라이브러리 탭: 폴더 필터·그리드/리스트 토글·빈 상태("등록된 이미지가 없습니다") — 주입 어댑터 `api.list` 정상 호출
- **Console 에러 0** (해당 인터랙션). 스크린샷 `wo1-media-picker-smoke-kpa.png`

→ store-ui-core 공용 picker가 KPA wrapper(주입 mediaApi+isOperator) 경유로 프로덕션에서 정상 동작. 기존 소비처(StoreLocalProductsPage) 회귀 없음.

**Unit B (편집기 onMediaLibraryPick 배선) — 코드/배포 검증(해당 DOM 미클릭).** 미디어-연동 편집기 화면(Neture 공급자 상품등록/ProductDetailDrawer, GP/KCos 제작편집)은 테스트 계정 게이트로 브라우저 도달 실패: (a) 작동하는 Neture 공급자 계정(sohae21@naver.com)은 **공급자 활성화 미완료**로 상품등록 게이트 차단, (b) 트라이얼/store-owner 계정(renagang21@gmail.com)은 **401(스테일 자격증명)**. typecheck EXIT 0 + 배포 성공 + 동일 계약(Neture 3화면=기존 연동, GP/KCos=셸 경유)으로 검증. 후속: 계정 활성화/자격증명 갱신 후 편집기 툴바 이미지→라이브러리 삽입 DOM 확인.

### 6.2 커버리지 범위 (범위 미확대 — WO §caution 준수)
이번 WO는 **표준 인프라(공용 picker·Media Type 계약·셸 prop) + 기준 배선**을 확립. 편집기 미디어 라이브러리 실제 배선은 **Neture 공급자 3화면 + GP/KCos 제작편집(셸 경로)**. KPA 및 GP/KCos의 개별 콘텐츠 화면(블로그·상품설명·QR 등 다수)의 화면별 배선은 회귀 위험 관리를 위해 **후속 커버리지 WO**로 분리(한 번에 40+ 화면 배선 지양).

### 6.3 video 범위
WO-1 명시대로 mp4/O4O Storage/External video **미구현**. 동영상은 기존 YouTube 경로만 유지. Media Type 계약은 WO-3가 시그니처 변경 없이 확장 가능하도록 설계.

---

## 7. 변경 파일

**공용 패키지**: `store-ui-core`(MediaPickerModal 신설·index export·ProductionMaterialEditorShell), `content-editor`(types·index·Toolbar)
**Neture**: MediaPickerModal wrapper·package.json·Dockerfile·supplier 3화면
**KPA**: MediaPickerModal wrapper
**GlycoPharm/K-Cosmetics**: media.ts·MediaPickerModal wrapper·ProductionMaterialEditorPage

## 8. 완료 기준 대비 (WO §14)

| 기준 | 상태 |
|---|---|
| 공용 Media Picker 컴포넌트 제공 | ✅ store-ui-core |
| 셸 Media Library 공통 지원 | ✅ onMediaLibraryPick/onImageUpload prop |
| 서비스별 중복 구현 제거 | ✅ Neture/KPA UI 중복 제거(wrapper) |
| 삽입 계약 Media Type 표준화 | ✅ MediaInsert |
| /media-library 접근성 CHECK 기록 | ✅ §2 |
| 기존 Neture 3화면 흡수 | ✅ §4 |
| 기존 기능 회귀 없음 | ✅ typecheck/deploy PASS + 통합 picker DOM 회귀 없음(§6.1) |
| typecheck / build | ✅ |
| 배포 | ✅ 4서비스 |
| 브라우저 smoke | ✅ Unit A PASS(§6.1) / Unit B 코드·배포 검증(DOM 미클릭·계정게이트) |
| CHECK / commit·push | ✅ 본 문서 |

---

*Status: DONE. 공용 picker 프로덕션 smoke PASS. Unit B 편집기 배선 DOM은 테스트 계정 게이트 해제 후 확인 권장(§6.1).*
