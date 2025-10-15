# O4O Platform 블록 인벤토리 (정리본)

본 문서는 현재 저장소에 분산된 블록 정의를 한 곳에서 파악할 수 있도록 정리한 참고 자료입니다. VS Code에서 스크롤 없이 빠르게 확인할 수 있도록 경로, 레지스트리 이름, 유형을 일관되게 나열했습니다.

## 기준 디렉터리
- Admin 정의(캐논 후보): `apps/admin-dashboard/src/blocks/definitions`
- Dynamic 패키지: `packages/blocks/dynamic/src/blocks`
- Interactive 패키지: `packages/blocks/interactive/src/blocks`

---

## 기본 블록 (core/*)

- core/paragraph — `apps/admin-dashboard/src/blocks/definitions/paragraph.tsx`
  - 문단 블록. 정렬/색상/드롭캡/글자크기 등 지원.
- core/heading — `apps/admin-dashboard/src/blocks/definitions/heading.tsx`
  - 제목 블록. 레벨/정렬/색상.
- core/list — `apps/admin-dashboard/src/blocks/definitions/list.tsx`
  - 목록 블록. 불릿/번호/스타일/번호매김/정렬.
- core/image — `apps/admin-dashboard/src/blocks/definitions/image.tsx`
  - 이미지 삽입/대체텍스트/캡션 등.
- core/gallery — `apps/admin-dashboard/src/blocks/definitions/gallery.tsx`
  - 갤러리 구성/정렬/캡션 등.
- core/file — `apps/admin-dashboard/src/blocks/definitions/file.tsx`
  - 파일 링크/다운로드 표시.
- core/cover — `apps/admin-dashboard/src/blocks/definitions/cover.tsx`
  - 커버(배경 이미지+오버레이) 블록.
- core/group — `apps/admin-dashboard/src/blocks/definitions/group.tsx`
  - 그룹 컨테이너/정렬/배경색.
- core/columns — `apps/admin-dashboard/src/blocks/definitions/columns.tsx`
  - 컬럼 레이아웃(열 배치/간격/정렬).
- core/column — `apps/admin-dashboard/src/blocks/definitions/column.tsx`
  - 단일 컬럼(너비/정렬/배경/패딩).
- core/button — `apps/admin-dashboard/src/blocks/definitions/button.tsx`
  - 버튼(스타일/정렬/색상/폭/URL).
- core/code — `apps/admin-dashboard/src/blocks/definitions/code.tsx`
  - 코드 블록(언어/코드/하이라이트).
- core/quote — `apps/admin-dashboard/src/blocks/definitions/quote.tsx`
  - 인용구/출처.
- core/table — `apps/admin-dashboard/src/blocks/definitions/table.tsx`
  - 표(헤더/풋/스타일/크기/캡션).
- core/video — `apps/admin-dashboard/src/blocks/definitions/video.tsx`
  - 비디오 임베드(autoplay/muted/loop/포스터 등).
- core/social-links — `apps/admin-dashboard/src/blocks/definitions/social.tsx`
  - 소셜 아이콘(링크/레이아웃/스타일/크기/정렬).
- core/shortcode — `apps/admin-dashboard/src/blocks/definitions/shortcode.tsx`
  - 숏코드 삽입(파라미터/미리보기/유효성).

---

## 상호작용/기본 성격 블록 (패키지 제공)

- o4o/buttons — `packages/blocks/interactive/src/blocks/buttons.tsx`
  - Buttons 컨테이너(레이아웃/가로·세로).
- o4o/button — `packages/blocks/interactive/src/blocks/buttons.tsx`
  - 개별 버튼(텍스트/URL/새탭/rel/스타일/색/폭).
- o4o/navigation — `packages/blocks/interactive/src/blocks/navigation.tsx`
  - 내비게이션 메뉴(아이템/방향).
- o4o/search — `packages/blocks/interactive/src/blocks/search.tsx`
  - 검색폼(라벨/플레이스홀더/버튼/위치/라벨표시).
- o4o/social-links — `packages/blocks/interactive/src/blocks/social-links.tsx`
  - 소셜 링크(아이콘 색/배경/크기).
- o4o/table — `packages/blocks/interactive/src/blocks/table.tsx`
  - 표(고정 레이아웃/섹션/색상).

---

## 커스텀 블록 (o4o/*)

- o4o/markdown-reader — `apps/admin-dashboard/src/blocks/definitions/markdown-reader.tsx`
  - 마크다운(.md) 렌더링(테마/폰트/파일정보).
- o4o/conditional — `apps/admin-dashboard/src/blocks/definitions/conditional.tsx`
  - 조건부 표시(로그인/권한/URL 등, AND/OR·표시/숨김 제어).
- o4o/slide — `apps/admin-dashboard/src/blocks/definitions/slide.tsx`
  - 슬라이드 프레젠테이션(비율/전환/자동재생/네비·페이지네이션).
- o4o/youtube — `apps/admin-dashboard/src/blocks/definitions/youtube.tsx`
  - YouTube 임베드(영상ID/옵션).

### 커스텀(패키지, dynamic)

- o4o/markdown-reader — `packages/blocks/dynamic/src/blocks/markdown-reader.tsx`
  - 마크다운 파일 선택/패치/파싱/테마(동일 슬러그, 구현 상이).
- o4o/cpt-acf-loop — `packages/blocks/dynamic/src/blocks/cpt-acf-loop.tsx`
  - CPT + ACF 루프(타입/정렬/페이지네이션, SSR 지향 placeholder 저장).
- o4o/spectra-form — `packages/blocks/dynamic/src/blocks/spectra-forms.tsx`
  - Spectra 스타일 폼(타입/라벨/버튼/성공 메시지, 클라이언트 렌더).
- o4o/reusable — `packages/blocks/dynamic/src/blocks/reusable.tsx`
  - 재사용 블록 선택/표시(모의 데이터 기반).

---

## 중복/충돌 포인트 (정리 필요)

- Markdown Reader (중복):
  - `apps` 정의: `o4o/markdown-reader` (카테고리: media)
  - `packages/dynamic` 정의: `o4o/markdown-reader` (카테고리: widgets, 속성체계 상이)
  - 조치 제안: 하나를 캐논으로 정하고 다른 쪽은 래퍼/위임 또는 제거.

- Social Links (유사 기능):
  - `core/social-links` (admin) vs `o4o/social-links` (interactive)
  - 조치 제안: 네임스페이스/기능 범위 정리 후 단일화.

- Table (유사 기능):
  - `core/table` (admin) vs `o4o/table` (interactive)
  - 조치 제안: 편집/저장 모델 비교 후 수렴.

- Button / Buttons (겹침):
  - `core/button` (admin) vs `o4o/button`, `o4o/buttons` (interactive)
  - 조치 제안: 컨테이너/개별 버튼 체계 통일, core 우선 여부 결정.

---

## 권장 운영 원칙(참고)

- 캐논 소스: `apps/admin-dashboard/src/blocks/definitions`를 우선으로 하고, 패키지 구현이 중복될 경우 admin 쪽에 위임/래핑.
- 레지스트리 충돌 방지: 동일 슬러그 중복 금지. core/* vs o4o/*는 역할과 네임스페이스를 분리.
- 단계적 정비: (1) 중복 슬러그 해결 → (2) 단일 레지스트리 진입점 확정 → (3) 파일 이동/정리.

본 문서는 현황 참조용이며, 실제 리팩토링은 별도 PR에서 단계적으로 진행하는 것을 권장합니다.

