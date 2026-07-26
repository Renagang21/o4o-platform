# CHECK-O4O-KPA-CONTENT-LIST-SEARCH-CONNECTION-V1

> **WO:** WO-O4O-KPA-CONTENT-LIST-SEARCH-CONNECTION-V1
> **근거 조사:** [IR-O4O-KPA-MAIN-HOME-COMMUNITY-USABILITY-AND-FLOW-AUDIT-V1](IR-O4O-KPA-MAIN-HOME-COMMUNITY-USABILITY-AND-FLOW-AUDIT-V1.md) **U1** (콘텐츠 목록에 검색 없음)
> **작성일:** 2026-07-25
> **유형:** frontend-only (2 파일). 백엔드·신규 API·DB·migration 0. 태그 정책 무변경.
> **상태:** ✅ 코드 완료 / tsc 0 · build 성공 — 브라우저 smoke 는 배포 후(§10)

---

## 1. 기존 콘텐츠 목록 구조 (조사 결과)

`/content` 는 **페이지네이션이 있는 목록이 아니라 2개 섹션 요약 허브**다.

| 화면 | 컴포넌트 | 구성 | 검색(작업 전) | URL 동기화 |
|------|----------|------|:----:|:----:|
| `/content` | `ContentListPage` | 문서형 6건 + 설문 6건 요약, 각 "전체 보기" | ❌ **없음** | — |
| `/content/documents` | `ContentDocumentsPage` | 전체 목록 + pagination | ✅ 있음 | ❌ 로컬 state |
| `/content/resources` | `ContentDocumentsPage` (subType) | 동일 | ✅ 있음 | ❌ 로컬 state |
| `/content/surveys` | `ContentSurveysPage` | 전체 목록 + pagination | ✅ 있음 | ✅ `?search=`·`?page=` |

**IR U1 의 실제 범위 확정:** 검색이 전혀 없던 것이 아니라 **허브(`/content`)에 검색 진입이 없었다.** 전체 목록에는 `WO-O4O-KPA-COMMUNITY-CONTENT-SEARCH-SURFACE-V1` 로 이미 구현되어 있었다.

→ 그래서 본 WO 는 **허브에 검색을 붙이고, 허브가 요약(6건)이라는 한계를 전체 목록으로 인계**하는 형태로 구현했다. 검색 전용 결과 페이지는 만들지 않았다(WO §5.5).

---

## 2. 서버 search 계약 (무변경)

| API | 파라미터 | 검색 대상 |
|-----|----------|-----------|
| `GET /api/v1/kpa/contents` | `search` | 제목 · 요약 · 본문 · 작성자 · **태그** — [kpa.routes.ts:1547](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L1547) `(c.title ILIKE … OR c.summary … OR c.body … OR c.author_name … OR c.tags::text …)` |
| `GET /api/v1/surveys` (`participationApi.getParticipationSets`) | `search` | 서버 계약 그대로 |

**백엔드 변경 0** — 두 API 모두 이미 `search` 를 지원하며 검색 대상·랭킹을 수정하지 않았다.

---

## 3. 재사용한 검색 컴포넌트·패턴

| 재사용 대상 | 출처 | 비고 |
|-------------|------|------|
| `CommunityContentSearchBar` | `@o4o/shared-space-ui` | `ContentDocumentsPage` 가 쓰던 **동일 컴포넌트**. 순수 controlled input (value/onChange/onClear) — 디바운스·조회·page 리셋은 소비처 책임 |
| 디바운스 **300ms** | `ContentDocumentsPage` 동일 값 | 새 값 도입 없음 |
| `?search=` query string | `ContentSurveysPage` · `CourseHubPage` · `ForumListPage` · `ForumFeedPage` | **KPA canonical 패턴** |
| 빈 결과 문구 `검색 결과가 없습니다` | `ContentDocumentsPage` 문구 그대로 | |

**신규 검색 컴포넌트 0.** 공용 컴포넌트(`CommunityContentSearchBar`)는 **변경하지 않고 그대로 사용**했다 → GP/K-Cosmetics 영향 0.

---

## 4. 검색어·pagination 상태 처리

### 4-1. 허브(`/content`)

```
입력 → 300ms 디바운스 → ?search= 갱신(replace) → 두 섹션 재조회
```

- 검색어를 `?search=` 에 보존(WO §5.4: 기존 KPA 목록이 쓰는 패턴이 있으므로 동일 적용, 새 전역 규칙 신설 아님).
- `replace: true` 로 갱신 → 타이핑 한 글자마다 history 가 쌓이지 않는다. 뒤로 가기 시 URL→입력값 동기화(`useEffect`).
- **허브에는 pagination 이 없다**(각 섹션 6건 요약, 작업 전과 동일). 따라서 "2페이지에서 검색 시 1페이지 초기화"는 허브에 해당하지 않는다.

### 4-2. 전체 목록 인계 (허브의 6건 한계 해소)

검색 중이면 각 섹션의 "전체 보기"가 **"검색 결과 전체 보기"** 로 바뀌며 검색어를 넘긴다.

```
/content?search=X → 문서형 "검색 결과 전체 보기" → /content/documents?search=X
                  → 설문   "검색 결과 전체 보기" → /content/surveys?search=X
```

- `ContentSurveysPage` 는 이미 `?search=` 를 읽으므로 **무변경**으로 동작한다.
- `ContentDocumentsPage` 는 검색을 로컬 state 로만 갖고 있어 `?search=` 를 무시했다 → **초기값을 `?search=` 에서 읽도록 2줄 추가**(형제 화면과 패턴 정렬). 기존 디바운스·page 리셋(`setPage(1)`)·pagination 로직은 그대로다.

→ 전체 목록 쪽 pagination 정합(검색 시 1페이지 초기화)은 **기존 구현이 이미 보장**하며 본 작업에서 건드리지 않았다.

---

## 5. 검색 대상별 처리

| 대상 | 경로 | 비고 |
|------|------|------|
| 제목 · 요약 · 본문 · 작성자 · 태그 | 서버 `GET /contents?search=` | 문서형 섹션 |
| 설문 | 서버 `GET /surveys?search=` | 설문 섹션 |

**두 섹션이 각자의 기존 `search` 파라미터로 조회**할 뿐, 결과를 병합·랭킹하지 않는다 → WO §7 의 "통합 검색" 신설에 해당하지 않는다. 허브 상단 단일 입력이 두 섹션 모두에 적용되므로 입력 위치와 적용 범위가 어긋나지 않는다.

---

## 6. 빈 결과·오류 처리

| 상태 | 표시 |
|------|------|
| 검색 결과 없음 | **`검색 결과가 없습니다`** (문서형·설문 각각, 데스크톱 표/모바일 카드 양쪽) |
| 검색 없이 데이터 없음 | 기존 문구 유지 (`아직 문서가 없습니다` / `아직 등록된 설문이 없습니다`) |
| API 오류 | **기존 처리 유지** — 기존 `.catch(() => setItems([]))` 그대로. 본 WO 에서 오류 계약을 바꾸지 않았다(IR §2-9 의 "오류/빈 상태 미구분"은 별도 후속 항목) |

→ 전체 목록과 검색 빈 결과가 문구로 구분된다(WO §8 "전체 목록과 혼동되지 않음").

---

## 7. 다른 서비스 영향

| 항목 | 영향 |
|------|:----:|
| `CommunityContentSearchBar` (공용) | **무변경** — props 사용만 |
| GlycoPharm / K-Cosmetics `ContentWritePage` 등 | **0** |
| 자료실(`/content/resources`) 검색 | 기존 동작 유지 + `?search=` 초기값 수용이 추가됨(동일 컴포넌트라 자동 적용, 기존 흐름 파괴 없음) |
| 포럼 검색 | **무변경** |
| 백엔드 | **무변경** |

---

## 8. 변경 파일 (2)

| 파일 | 변경 |
|------|------|
| [pages/contents/ContentListPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentListPage.tsx) | `CommunityContentSearchBar` 추가 · `?search=` 동기화(300ms 디바운스) · 두 섹션에 `search` 전달 · 빈 결과 문구 분기 · "검색 결과 전체 보기" 링크 |
| [pages/contents/ContentDocumentsPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx) | `?search=` 를 검색 초기값으로 수용(허브 인계). 그 외 로직 무변경 |

**다른 세션 WIP 미포함:** `docs/work-orders/WO-O4O-NETURE-SUPPLIER-ORDER-INVENTORY-SETTLEMENT-LOAD-ERROR-CONTRACT-V1.md`, `docs/checks/CHECK-O4O-ADMIN-DEDICATED-SUPER-ADMIN-CUTOVER-AND-LEGACY-CLEANUP-V1.md`

---

## 9. typecheck / build

| 대상 | 명령 | 결과 |
|------|------|------|
| web-kpa-society | `tsc --noEmit` | ✅ **0 errors** |
| web-kpa-society | `vite build` | ✅ **성공** (15.34s) |

---

## 10. 브라우저 smoke

**배포:** Deploy Web Services ✅ success (`6c08753f6`)
**대상:** `https://kpa-society.co.kr` (Playwright 실브라우저) + 비인증 API 확인

**검증용 실데이터:** 문서형 2건 — `껌의 효능…`(작성자 `서Renagang21`, 태그 `껌`·`자일리톨`) / `해양 심층수 효능`(작성자 `서철환`, 태그 `해양심층수`·`미네락`). 설문 0건.

| # | 절차 | 결과 | 근거 |
|---|------|:----:|------|
| 1 | `/content` 검색 입력 노출 | ✅ **PASS** | `input[aria-label="콘텐츠 검색"]`, placeholder `제목, 내용, 태그로 검색` |
| 2 | **제목 검색** (`껌`) | ✅ **PASS** | 문서형 1건으로 필터, URL `?search=%EA%BB%8C` 반영 |
| 3 | **태그 검색** (`자일리톨`) | ✅ **PASS** | 제목·본문에 없는 **태그 전용어**로 해당 문서만 매칭 → 서버 `tags::text ILIKE` 경로 확인 |
| 4 | **작성자 검색** (`서철환`) | ✅ **PASS** | `해양 심층수 효능` 1건 매칭 |
| 5 | 결과 없는 검색어 | ✅ **PASS** | 두 섹션 모두 `검색 결과가 없습니다` **2회**, `아직 문서가 없습니다`/`아직 등록된 설문이 없습니다` **미노출**(전체 목록 빈 상태와 구분됨) |
| 6 | 검색어 삭제(X 버튼) | ✅ **PASS** | 전체 2건 복귀, URL `?search=` 제거되어 `/content`, 링크도 `전체 보기`로 원복 |
| 7 | **"검색 결과 전체 보기" 인계(문서)** | ✅ **PASS** | `/content/documents?search=자일리톨` 진입 시 검색창에 `자일리톨` 채워지고 1건 필터 적용 |
| 8 | **인계(설문)** | ✅ **PASS** | `/content/surveys?search=껌` → `"껌"에 해당하는 설문이 없습니다` (기존 페이지 무변경으로 동작) |
| 9 | 딥링크 복원 | ✅ **PASS** | `/content?search=껌` 직접 진입 시 입력값 `껌` 복원 + 필터 적용 |
| 10 | 회귀 — Drawer·가져가기 | ✅ **PASS** | 검색 상태에서 행 클릭 → Drawer 열림, `내 자료함 가져가기`·`전체 페이지` 액션 정상 |
| 11 | 콘솔 | ✅ **PASS** | 치명 오류 0 |

**서버 search 계약 재확인(비인증 curl):** `껌`=1건 · `해양`=1건 · `Renagang21`=1건 · `zzzz`=0건 → 검색 대상·동작 무변경 확인.

### 10-1. 검증 한계

- **설문 검색은 "결과 없음" 경로만 검증**되었다 — prod 에 설문 데이터가 0건이라 매칭 결과가 있는 경우를 확인할 수 없었다. 코드 경로는 문서형과 동일(`participationApi` 기존 `search` 파라미터)하며, 인계·빈 상태 문구는 정상 동작을 확인했다.
- **pagination 정합은 허브에서 검증 대상이 아니다**(허브는 6건 요약, pagination 없음). 전체 목록의 검색 시 1페이지 초기화는 기존 구현이며 본 작업에서 변경하지 않았다. 현재 데이터가 2건이라 2페이지 이상 상황 자체가 재현되지 않는다.
- **restricted 표시 회귀**는 prod 에 restricted 콘텐츠가 없어 별도 확인 불가(선행 CHECK 와 동일 제약). 본 작업은 restricted 로직을 건드리지 않았다.

---

## 11. 완료 기준 대조

| 기준 | 결과 |
|------|:----:|
| `/content` 검색 입력 제공 | ✅ |
| 기존 `GET /contents` search 사용 | ✅ |
| 제목·본문·작성자·태그 검색 | ✅ (서버 계약 그대로) |
| pagination 정합 | ✅ 허브는 pagination 없음 / 전체 목록은 기존 `setPage(1)` 유지 |
| 빈 결과 표시 | ✅ |
| 백엔드·신규 API·DB·migration | **0** |
| 태그 정책 변경 | **0** (태그는 검색 대상으로만 활용) |
| typecheck · build | ✅ · ✅ |
| 브라우저 smoke | ✅ **11/11 PASS** (한계 3건은 §10-1) |

---

*End of CHECK-O4O-KPA-CONTENT-LIST-SEARCH-CONNECTION-V1*
