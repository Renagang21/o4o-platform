# O4O-STANDARD-LIST-WORKSPACE-CONTRACT-V1

> **상태:** ACTIVE · **작성일:** 2026-11-06
> **성격:** 표준 테이블을 쓰는 **목록 업무 화면의 배치·동작 계약**과 신규 도입 · 기존 전환 기준.
> **관계:** 표 구조는 [O4O-OPERATOR-TABLE-CANONICAL-V1](O4O-OPERATOR-TABLE-CANONICAL-V1.md), 리스트 유형 분류는 [O4O-STANDARD-LIST-PHASE1-BASELINE-V1](../baseline/O4O-STANDARD-LIST-PHASE1-BASELINE-V1.md) 이 정한다. 이 문서는 그 위에 **화면 계약**을 더하며 표 체계를 새로 만들지 않는다.
> **적용 범위:** O4O 표준 테이블을 쓰는 모든 업무 화면과 앞으로 도입할 화면.

---

## 1. 화면 계약

```text
화면 제목                         [신규 등록]
검색 · 필터
선택 항목 작업 영역(ActionBar) — 선택이 있을 때만
테이블
페이지네이션
```

1. **목록이 먼저다.** 화면에 들어오면 기존 목록을 바로 본다.
2. **신규 등록은 상단 오른쪽 하나.** 빈 목록일 때만 중앙에 같은 동작의 버튼을 하나 더 둔다. 검색 결과가 없는 것은 빈 목록이 아니므로 중앙 버튼을 두지 않는다.
3. **등록 폼은 버튼을 눌러야 열린다.** 별도 화면이나 편집 영역으로 연다. 목록 앞에 폼을 펼쳐 두지 않는다.
4. **수정은 행 업무 진입 또는 체크 후 ActionBar.** 이름 링크는 상세로 간다.
5. **큰 AI 입력창과 반복 설명은 등록·수정 업무 안으로 옮긴다.** 꼭 필요한 안내는 접어 둔다(§4).
6. **목록을 접지 않는다.** '저장한 항목 선택'처럼 목록을 펼치는 중간 단계를 두지 않는다.
7. **오래된 선택과 상세를 비운다.** 검색 · 탭 · 페이지 · 계정 · 권한이 바뀌면 선택을 정리한다. 화면에 없는 키는 선택에 남기지 않는다.
8. **서버 결과가 기준이다.** 낙관적으로 성공을 표시하지 않는다. 실행 중에는 중복 실행을 막고, 실패하면 항목을 유지하고 다시 시도할 수 있게 한다.
9. **조회 실패를 빈 목록으로 보이지 않는다.** 오류와 재시도를 표시한다.

## 2. Core 와 Extension

| 구분 | 책임 | 위치 |
|---|---|---|
| Core | 목록 화면 배치, 제목 · 신규 버튼 위치, 검색 · 필터 자리, 선택 상태 · ActionBar, 페이지네이션 자리, 로딩 · 빈 목록 · 오류 · 처리 중 상태 | `@o4o/ui` `ListWorkspace` · `useListSelection` · `ActionBar` |
| Extension | 열 · 필터, 등록 · 상세 · 수정 화면, 선택 후 명령, 권한 기능, 서버 호출 | 각 업무 화면 |

Core 는 표 렌더러를 고르지 않는다. `DataTable` · `BaseTable` 은 `children` 으로 넘긴다. 권한 판단은 서버와 Extension 의 책임이며 Core 가 대신하지 않는다.

## 3. 신규 화면 도입 방법

```tsx
const selection = useListSelection(`${storeId}:${tab}:${query}`);

<ListWorkspace
  title="재생목록"
  createAction={{ label: '재생목록 만들기', onClick: openCreate }}
  filters={<Filters />}
  selection={{ selectedCount: selection.selectedCount, onClearSelection: selection.clear, actions }}
  loading={loading}
  error={loadError ? { message: '불러오지 못했습니다.', onRetry: reload } : undefined}
  isEmpty={rows.length === 0}
  filterActive={Boolean(query)}
  emptyMessage="아직 만든 재생목록이 없습니다."
  noResultsMessage="검색 조건에 맞는 재생목록이 없습니다."
  pagination={<Pagination />}
>
  <DataTable columns={columns} data={rows} rowKey="id" />
</ListWorkspace>
```

- **신규 화면은 `ListWorkspace` 를 쓴다.** 비슷한 머리 영역을 다시 짜지 않는다.
- `useListSelection(scope)` 의 `scope` 에 매장 · 계정 · 탭 · 검색 조건처럼 **선택을 무효로 만드는 값**을 넣는다. 값이 바뀌면 같은 렌더에서 선택이 비워진다. 목록을 다시 받은 뒤에는 `retain(visibleKeys)` 로 화면에 없는 키를 제거한다.
- 등록 화면이 별도 주소면 `createAction.render` 로 링크를 넘긴다. 받은 `className` 을 그대로 쓰면 위치와 모양이 유지된다.
- ActionBar 의 `onClick` 이 Promise 를 반환하면 끝날 때까지 다시 실행되지 않고, 실패해도 잠금이 풀린다.
- 샘플 구현: `services/web-store/src/pages/pharmacy/StoreSignagePage.tsx`.

## 4. 기존 화면 전환 기준

**한 번에 `ListWorkspace` 로 교체하지 않아도 된다.** 기존 화면은 계약 §1 을 만족하도록 배치를 옮기는 것으로 전환을 인정한다. 그 화면을 구조 변경할 때 `ListWorkspace` 로 옮긴다. 업무 기능과 서버 권한 검사는 그대로 둔다.

| 위반 | 전환 방법 |
|---|---|
| 신규 버튼이 필터 행 · 표 위에 있음 | 머리 영역 오른쪽으로 옮긴다 |
| 등록 · 계산 폼이 목록 앞에 펼쳐져 있음 | 상단 버튼으로 연다. 또는 별도 화면으로 옮긴다 |
| 상시 설명 카드가 목록 앞에 있음 | `GuideBlock` 의 `collapsible` 로 접는다. `GuideBlock` 이 아니면 `<details>` 로 접는다 |
| 보조 도구 · 다른 대기열이 목록 앞에 있음 | 접거나 표 뒤로 옮긴다 |
| 처리 사유 입력이 목록 앞에 있음 | 선택이 있을 때만 ActionBar 와 함께 표시한다 |
| 목록을 접거나 선택 단계로 숨김 | 중간 단계를 없앤다 |

## 5. 예외

예외는 근거와 범위를 함께 기록한다. 적용 화면의 전체 목록은 [TODO §5](../work-orders/TODO-O4O-STANDARD-LIST-WORKSPACE-CONTRACT-V1.md#5-소비처-표) 에 있다.

| 예외 | 범위 | 근거 |
|---|---|---|
| 읽기 전용 목록 | 등록 기능이 없는 조회 · 감사 화면 | 신규 버튼이 없다. 나머지 순서 · 상태 계약은 그대로 지킨다 |
| 설정 화면 안의 목록 탭 | `ServiceLegalSettingsPage` 정책 문서 탭 | 화면 제목은 설정 전체의 제목이다. 신규 버튼은 탭 안의 오른쪽 위에 두고 편집 영역은 버튼으로만 연다 |
| 콘솔 레이아웃 안의 탭 화면 | `ProductMastersPage` | 제목은 콘솔이 소유한다. 신규 버튼은 탭 본문의 오른쪽 위에 둔다 |
| 요약 KPI 카드 | `AdminSettlementsPage` 등 | 목록을 대체하지 않는 현황 지표는 제목과 필터 사이에 둘 수 있다. 입력 폼은 해당하지 않는다 |
| 작업대형 화면 | `StoreOrderWorktablePage` | 표와 주문 요약이 나란히 있는 수량 입력 작업대다. 신규 등록 대상이 아니며 설명 조회만 접는다 |
| 내 매장 AI 입력 한 줄 | `StoreWorkspaceShell` 기본 위치 | 화면 업무가 아니라 매장 업무공간 전체의 보조 기능이다. 한 줄로 고정되며 대화는 눌러야 열린다. 목록 화면에서 본문 안에 따로 배치하지 않는다 |

## 6. 사이니지 적용 결과

탭과 화면 제목은 **동영상 / 재생목록 / 디스플레이 재생**이다.

| 탭 | 목록 열 | 상단 버튼 | 등록 · 상세 |
|---|---|---|---|
| 동영상 | 체크 · 썸네일 · 영상 이름 · 출처 · 등록일 | `동영상 등록` | `/store/marketing/signage/videos/new`: O4O 영상 등록 / 외부 영상 연결. AI 는 제목 · 설명 작성 보조로 이 화면 안에 둔다 |
| 재생목록 | 체크 · 이름 · 동영상 수 · 총 재생시간 · 수정일 | `재생목록 만들기` | `/store/marketing/signage/playlist/:playlistId`: 이름 수정, 영상 추가 · 제거 · 순서 변경 |
| 디스플레이 재생 | 해당 없음 | 해당 없음 | 디스플레이 브라우저 새 탭 → 재생목록 선택 → 재생 시작 → 전체화면 반복 |

디스플레이 재생은 선택을 재생 주소에 담는다. 그래서 화면마다 다른 재생목록을 틀어도 서로 덮어쓰지 않는다. 매장 재생 일정은 폐기됐다. 필수 영상 노출 기간과 다른 소비처의 공통 일정은 별개이며 유지한다.

## 7. 변경 절차

`@o4o/ui` 의 `ListWorkspace` · `useListSelection` · `ActionBar` 변경은 [공통 모듈 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) 를 따른다. 소비처를 먼저 식별하고 2개 이상의 소비처에서 확인한다.
