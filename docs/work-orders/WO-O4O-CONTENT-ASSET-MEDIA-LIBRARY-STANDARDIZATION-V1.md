# WO-O4O-CONTENT-ASSET-MEDIA-LIBRARY-STANDARDIZATION-V1

## 1. 작업명

WO-O4O-CONTENT-ASSET-MEDIA-LIBRARY-STANDARDIZATION-V1

---

## 2. 배경

[`IR-O4O-STANDARD-CONTENT-EDITOR-PLATFORM-EVALUATION-V1`](../investigations/IR-O4O-STANDARD-CONTENT-EDITOR-PLATFORM-EVALUATION-V1.md) 결과, O4O 표준 편집기(TipTap 기반 `@o4o/content-editor`)는 장기 표준으로 유지하기로 확정하였다. 교체 근거는 발견되지 않았다.

그러나 가장 큰 Gap(P0)은 다음이었다.

- RichTextEditor 사용 화면 : **45개**
- Media Library 연동 : **3개** (Neture만)
- KPA : **0**
- GlycoPharm : **0**
- K-Cosmetics : **0**

원인은 `ProductionMaterialEditorShell` 이 Media Library 관련 prop 자체를 공통으로 노출하지 않는 **구조적 차단**이다.

이번 WO는 이 구조를 제거하여 O4O 콘텐츠 플랫폼 전체의 Media Library 표준 인터페이스를 만든다.

---

## 3. 목적

모든 콘텐츠 제작 화면에서 동일한 방식으로 **이미지 / 동영상**을 삽입할 수 있도록 공통 Media Picker 구조를 만든다.

이번 WO는 **"Media Library 표준화"** 가 목적이며, **동영상(mp4) 기능 구현은 목적이 아니다.**

---

## 4. 적용 범위

**공통**
- `packages/content-editor`
- `packages/store-ui-core`

**서비스**
- Neture / KPA / GlycoPharm / K-Cosmetics

**공통 편집기** — `RichTextEditor`
**공통 셸** — `ProductionMaterialEditorShell`

---

## 5. 구현 원칙

### 5.1 HTML은 미디어를 관리하지 않는다

HTML에는 `img` / `iframe` / `video` 의 **URL만 저장**한다.

### 5.2 Media Library가 미디어를 관리한다

관리 대상: 이미지 / 동영상. 향후 PDF·기타 파일 확장이 가능하도록 한다.

### 5.3 RichTextEditor는 Media Picker를 호출한다

Media Picker는 선택된 미디어 정보를 반환하고, RichTextEditor는 **URL만 삽입**한다.

---

## 6. 공통 인터페이스 표준화

`ProductionMaterialEditorShell` 에 다음 인터페이스를 공통 제공한다.

- `onMediaLibraryPick`
- `onImageUpload`
- `existingImages`

서비스별 별도 구현을 만들지 않는다. 모든 소비 화면이 동일 인터페이스를 사용한다.

---

## 7. Media Picker 표준

Media Picker는 공용 컴포넌트로 구현한다. **권장 위치: `packages/store-ui-core`.** 서비스마다 Picker를 만들지 않는다.

### 7.1 공용 Picker 설계 원칙

공용 Picker는 **우선 dumb UI 컴포넌트로 설계**한다. 다음을 props로 받는다.

- `assets` 목록
- `loading`
- `error`
- `onSelect`
- `onClose`

**API fetch는 각 셸/소비처 또는 표준 hook에서 담당**한다. (`store-ui-core` 는 UI-core 패키지이므로 컴포넌트가 직접 API를 호출하지 않는 것을 원칙으로 하며, 데이터 주입은 셸/소비처 책임. API 직접 호출이 불가피할 경우 CLAUDE.md `authClient.api` 규칙을 준수한다.)

**착수 전 read-only 선행 확인 (필수):** 다음 각 서비스가 `GET /media-library` 또는 동등 API에 접근 가능한지 확인한다.

- KPA web / GlycoPharm web / K-Cosmetics web / Neture web
- `authClient` / service scope / 권한 문제 여부

접근 불가 시 **무리하게 구현하지 말고 CHECK에 보고한 뒤 "API 접근 표준화 WO"로 분리**한다.

> 배경: IR 워크플로우 조사에서 `GET /media-library` 를 소비하는 picker UI는 admin-dashboard에만 존재함이 확인됨. web 서비스 프런트의 실제 접근성은 미확인 상태이며, 이 결과가 WO 규모를 가른다.

---

## 8. 미디어 삽입 계약 (중요)

이번 WO에서 삽입 계약을 **이미지 전용으로 만들지 않는다.** 반드시 **Media Type 인지형**으로 설계한다.

이번 WO에서는 실제 구현은 **image / YouTube 까지만** 수행한다. 그러나 삽입 계약은 video 확장을 고려하여 설계한다. WO-3에서 **삽입 계약 변경 없이** O4O Storage·External URL을 추가할 수 있어야 한다.

### 8.1 기존 onMediaLibraryPick 마이그레이션

현재 `onMediaLibraryPick` 시그니처는 이미지 전용이다.

**기존 구조:**
```ts
onMediaLibraryPick(insertImage: (url: string) => void)
```

이번 WO에서 Media Type 인지형 계약으로 전환한다.

**신규 구조 (예):**
```ts
onMediaLibraryPick(insertMedia: (media: {
  type: 'image' | 'video'
  url: string
  title?: string
  thumbnailUrl?: string
  sourceType?: 'youtube' | 'o4o_storage' | 'external'
}) => void)
```

이번 WO에서는 `type='image'` 와 `type='video'` 중 **YouTube 경로만 실제 삽입**한다. mp4 / O4O Storage / External video는 WO-3에서 처리한다.

> 이 전환은 기존 prop의 breaking change이며, 소비처(§14.1 Neture 3화면)를 동시에 마이그레이션한다.

---

## 9. 이미지 정책

이미지는 **Media Library URL만 사용**한다. 외부 URL 자동 다운로드 / 자동 업로드 / 자동 변환 등은 구현하지 않는다.

---

## 10. 동영상 정책 (이번 WO)

이번 WO에서 동영상은 **"동영상"이라는 하나의 개념**으로 취급한다. UI에서 YouTube를 특별한 기능으로 노출하지 않고 동영상 삽입 기능으로 제공한다.

단, 이번 WO에서 실제 지원하는 동영상은 **기존 YouTube Embed 만** 사용한다. (기존 기능 유지 목적)

---

## 11. 이번 WO에서 하지 않는 것

- HTML5 `<video>` 노드
- mp4 업로드
- O4O Storage 동영상
- External URL 동영상
- YouTube 자동 업로드
- 외부 URL 자동 다운로드
- 동영상 권한 관리
- Table 지원
- HTML Import 개선
- HTML Snippet
- Template 개선

---

## 12. 후속 WO 연계

**WO-2 · HTML Table 지원** — 독립 진행.

**WO-3 · Video(mp4) 표준화** — 다음 항목 추가: HTML5 video node / O4O Storage / External URL / sanitize 확장 / 동영상 정책. **이번 WO에서 만든 Media Type 인터페이스를 그대로 사용하며 시그니처 변경은 하지 않는다.**

---

## 13. 검증

Neture / KPA / GlycoPharm / K-Cosmetics 모든 RichTextEditor 소비 화면에서:

- 동일한 Media Picker 호출 가능
- 이미지 삽입 가능
- 동영상(YouTube) 삽입 가능
- HTML 저장 → 재로드 정상 동작
- 기존 기능 회귀 없음

---

## 14. 완료 기준

- `ProductionMaterialEditorShell` 이 Media Library를 공통 지원한다.
- Media Picker가 공용 컴포넌트로 제공된다.
- 서비스별 중복 구현이 제거된다.
- RichTextEditor 소비 화면이 공통 인터페이스를 사용한다.
- 삽입 계약이 Media Type 기반으로 표준화된다.
- **web 서비스의 `/media-library` 접근성 확인 결과를 CHECK에 기록한다.**
- **접근 불가 서비스가 있으면 구현 범위를 무리하게 확대하지 않고 별도 WO로 분리한다.**
- 기존 기능 회귀 없음.
- typecheck 통과 / build 통과.
- CHECK 작성 / commit·push 완료.

### 14.1 기존 Neture 3화면 흡수

현재 Media Library를 이미 사용하는 Neture 3화면은 자체 picker를 가지고 있다.

**대상:**
- `SupplierProductCreatePage`
- `SupplierProductImportPage`
- `ProductDetailDrawer`

이번 WO 완료 기준에 다음을 포함한다.

- 위 3화면의 자체 Media Picker 구현을 공용 Picker로 이관
- 기존 기능 회귀 없음 · 기존 이미지 삽입 동작 유지
- 기존 `onMediaLibraryPick` 소비처를 신규 Media Type 계약으로 **동시 마이그레이션**
- 공용 Picker 도입 후 **중복 구현 증가 금지**

---

## 15. 산출물

CHECK — `CHECK-O4O-CONTENT-ASSET-MEDIA-LIBRARY-STANDARDIZATION-V1.md`

---

## 16. 작업 원칙

- 기존 TipTap 표준 유지 · RichTextEditor 구조 유지
- Media Library 재사용
- 서비스별 구현 금지 · 공통 컴포넌트 우선 · 코드 중복 금지
- 최소 범위(additive) 구현
- DB 변경은 필요한 경우에만 최소 범위 적용

---

## 17. 목표 구조

```text
RichTextEditor
        │
        ▼
ProductionMaterialEditorShell
        │
        ▼
공용 Media Picker
        │
        ▼
Media Library
        │
        ▼
선택된 Media(type, url, ...)
        │
        ▼
RichTextEditor 삽입
```

이 구조만 완성되면 이후 WO-2(Table)와 WO-3(Video 표준화)는 기존 인터페이스를 변경하지 않고 자연스럽게 확장할 수 있다. 이것이 이번 WO의 가장 중요한 설계 목표다.

---

*Status: 확정 (핸드오프 대기). 실행은 별도 지시로 착수.*
