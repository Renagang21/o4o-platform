# 관리자 대시보드 TypeScript 정합 작업 현황

본 문서는 관리자 대시보드(admin-dashboard) 영역의 타입 정합 진행 상황을 정리한 기록입니다. 화면에서 로그가 빠르게 흘러 보지 못한 내용을 MD 파일로 고정해 제공합니다.

## 변경 요약
- WordPressTable 확장: `data + column.render` 방식, 외부 정렬/선택(`onSort`, `selectedItems`, `onSelectionChange`), `emptyState` 지원(기존 `rows` 방식 호환 유지).
- BulkActionBar 개선: 기존 드롭다운 방식 + 간단 버튼 액션(onClick) 모두 지원, `onCancel` 옵션 추가.
- 커스터마이저/에디터 타입 정합: `EditorHeader`(title/subtitle/actions) 확장, `WordPressEditorWrapper` 선택적 props 허용, 리듀서 타입 충돌 완화, PostMessage 타입 추가.
- PostFormWYSIWYG: `Select`의 `onValueChange` 시그니처 정정.
- StandaloneEditor: 콘텐츠 파싱/날짜 처리/상태 매핑(‘published’→‘publish’), 카테고리/태그 id 정규화, 미디어 라이브러리 불필요 props 제거.
- 미디어: `uploadedBy` 사용으로 필드 정합, 불필요 타입 import 제거.
- useBulkActions: 제어형 `selectedIds` 지원 및 집계/실행 로직 연동.

## 남은 TypeScript 에러(관리자 대시보드)
- StandaloneEditor
  - 상태 유니온(`scheduled`/`trash`) 포함 정합, slug를 항상 string으로 보장, 일부 setState 콜백 반환 타입 수정.
- 미디어
  - MediaListWordPress: `BreadcrumbItem`에 `href` 속성 전달 타입 보정, 일부 필드 모양 정리.
- 메뉴/폼
  - MenuList: `map` 콜백의 타입 미스매치 보정.
  - FormList: `useBulkActions` 제어형 선택 전달 방식 최종 정리.

## 다음 단계 제안(우선순위)
1. StandaloneEditor 상태/slug/콜백 반환 타입 정리 → 에디터 화면 에러 제거
2. MediaListWordPress breadcrumb/필드 타입 보정
3. MenuList/FormList 테이블/벌크액션 타입 정리

## ESLint 경고 처리
- `useBulkActions`에서 `react-hooks/exhaustive-deps` 경고 수정: 콜백 내부 참조를 `selectedIds.size` → 계산된 `selected.length`로 변경하여 의존성 누락 경고 제거. 또한 `isSelected`가 제어형 선택 집합과 동일하게 동작하도록 `currentSelected`를 사용하도록 보정.

## 커밋/브랜치
- 브랜치: `main`
- 주요 커밋:
  - `fix(admin-dashboard): type alignment for editor + customizer`
  - `fix(admin-dashboard): clear remaining TS errors in UI infra`

필요 시 위 우선순위대로 추가 수정 진행하겠습니다. 원하는 화면부터 처리해 달라고 지정해 주셔도 됩니다.
