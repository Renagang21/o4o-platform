# CHECK-O4O-CONTENT-ASSET-MEDIA-LIBRARY-STANDARDIZATION-V1

Status: 코드 완료 + 4서비스 typecheck EXIT0 + Cloud Run 배포 성공 (2026-07-08)
WO: `WO-O4O-CONTENT-ASSET-MEDIA-LIBRARY-STANDARDIZATION-V1`

> **브라우저 DOM smoke는 미수행(환경 blocked)** — Playwright 프로파일 잠금(§6.2). 코드/배포 검증은 완료.

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

### 6.1 브라우저 DOM smoke — **미수행(환경 blocked)**
Playwright 프로파일 `C:\Users\home\.playwright-o4o-profile` 이 이미 실행 중인 Chrome 창에 점유되어 자동화 브라우저 프로세스가 즉시 종료("이미 실행 중인 세션"). 코드/배포 문제 아님. **재현/후속**: 해당 Chrome 창 종료 후 Neture 공급자 상품등록 편집기 → 이미지 툴바 → "라이브러리에서 선택" → 공용 MediaPickerModal 모달 렌더·목록 로드·삽입 확인 필요.

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
| 기존 기능 회귀 없음 | typecheck/deploy PASS. **DOM 회귀 확인은 §6.1 blocked** |
| typecheck / build | ✅ |
| 배포 | ✅ 4서비스 |
| 브라우저 smoke | ⚠ **미수행(§6.1)** |
| CHECK / commit·push | ✅ 본 문서 |

---

*Status: 코드·배포 완료. 브라우저 DOM smoke는 프로파일 잠금 해제 후 수행 필요(§6.1).*
