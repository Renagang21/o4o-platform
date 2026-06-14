# CHECK-O4O-KPA-COMMUNITY-CONTENT-SEARCH-SURFACE-V1

> **유형:** WO 실행 결과 (CHECK)
> **WO:** WO-O4O-KPA-COMMUNITY-CONTENT-SEARCH-SURFACE-V1
> **선행:** IR-O4O-KPA-COMMUNITY-CONTENT-LIST-AND-EDITOR-AUDIT-V1 (판정 B안)
> **작성:** 2026-06-14
> **판정:** **PASS** (커뮤니티 콘텐츠 리스트 검색 UI 노출 — 기존 API 활용, 제품 구조 미추가)

---

## 1. 목적

IR 에서 확인된 "검색(제목/본문/태그)이 백엔드 API엔 있으나 커뮤니티 콘텐츠 리스트 UI에 미노출" 을 해소. **구조 변경 없이 검색창만 노출**하는 경미한 UX 개선.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `a426d8d8` · origin 0/0 |
| 다른 세션 WIP | pnpm-lock · GP NotFoundPage · IR-LMS-QUIZ(staged, 타 세션) · CHECK-CODEX — **미접촉**(path-specific 커밋으로 배제) |
| 조사 기준 commit | `a426d8d8` |

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx` | 검색창 UI + 디바운스 + `contentApi.list({search})` 연결 + 검색 결과 empty state |
| `docs/investigations/CHECK-...-V1.md` | 본 문서 |

**무변경:** backend / API(신규 0) / DB·migration / 편집기 / AI / 자료실 구조 / 운영자·내매장 흐름 / package.json / 다른 컴포넌트.

## 4. 적용한 검색 UI

- **위치**: ContentDocumentsPage(`/content/documents` = 문서형 콘텐츠 전체 목록) header 하단.
- **입력**: 단일 검색창(placeholder "제목, 내용, 태그로 검색") + Search 아이콘 + 입력 시 X(검색 초기화) 버튼.
- **동작**: 300ms 디바운스 → `search` 확정 + 1페이지로 리셋 → `contentApi.list({ ..., search })` 재조회.
- **empty**: 검색어 있고 결과 0 → "검색 결과가 없습니다." (작성 CTA 는 검색 중 숨김).
- 스타일: 기존 Tailwind 패턴(`@o4o/ui` 컬러 토큰 focus ring).

## 5. 기존 API 활용 (신규 0)

- `contentApi.list` 의 `search?` 파라미터 **이미 존재**(`ContentListParams`) → 신규 API/엔드포인트/DTO **0**.
- 백엔드 `GET /api/v1/kpa/contents` 의 `search` 는 title/summary/body/author/tags 를 ILIKE 검색(태그 텍스트 포함). → **제목·본문·태그 검색 동시 충족.**
- 별도 `tag` 파라미터(`@>`)는 미사용 — `search` 가 태그 텍스트까지 포괄하므로 단일 검색창으로 충분(태그 클릭→검색 주입은 후순위, 미적용).

## 6. 제품 콘텐츠 구조 미추가 확인

✅ **제품 탭 / 제품명 필터 / productId 조회 / B2B·B2C·공통 필터 추가 0.** 검색은 제목·내용·태그만. 커뮤니티 콘텐츠는 제품-비종속 구조 유지(IR 정합).

## 7. 자료실 영향 (경계 명시)

- ContentDocumentsPage 는 **`subType` prop 으로 `/content/documents`(content) 와 `/content/resources`(resource) 두 route 를 공유**하는 컴포넌트.
- 따라서 검색창은 **`/content/resources` 보조 목록 뷰에도 동일 노출**됨. 단 이는 **자료실 구조 변경이 아니라 동일 list affordance**(검색은 title/tag 보조 검색일 뿐, usage_type·등록흐름·복사정책 무변경).
- 자료실의 **주 surface 는 `/resources`(ResourcesHubPage, ResourcesHubTemplate — 이미 자체 검색 보유)** 이며 본 변경과 무관. `/content/resources` 는 보조 뷰.
- 결론: WO "자료실 제외" 의도(자료실 구조·제품화 변경 금지)는 충족. 공유 컴포넌트 특성상 보조 뷰에 검색이 함께 보이는 것은 무해.

## 8. 검증

| 항목 | 결과 |
|------|------|
| web-kpa-society `npx tsc --noEmit` | ✅ PASS (exit 0) |
| 리스트 렌더/검색 입력/초기화 로직 | 정적 검증(디바운스 effect + search→load 재조회 + page 리셋) |
| 상세/작성/수정/가져가기/삭제 흐름 | 미변경(검색 외 로직 무수정) |
| 제품 탭·필터 미추가 | ✅ 확인 |
| 다른 세션 WIP | 미포함(path-specific) |
| browser smoke | ⚠️ 라이브 미수행(배포 필요) — 권장: KPA `/content/documents` 검색어 입력 시 결과 필터·초기화·empty 확인 |

## 9. 공통화 가능성 판단

- **검색 패턴은 GP/KCos 커뮤니티 콘텐츠에도 동일 적용 가능.** GP/KCos 도 동형 콘텐츠 리스트(ContentDocumentsPage 류 또는 ContentHubTemplate) 보유 가능성 높음 → 확인 후 동일 검색 노출.
- **공통 컴포넌트화 여부**: ContentDocumentsPage 는 현재 **KPA-local**(자료실 IR 에서 확인). 3서비스가 같은 콘텐츠 리스트 컴포넌트를 쓰는지 먼저 확인 필요. 이미 공유 템플릿(예: ContentHubTemplate)이 있으면 거기에 `searchable` config 로 확장이 적절(신규 컴포넌트 추출보다).
- **이번 WO 미확산**: KPA 적용만. 확산은 후속.

## 10. 후속 WO 제안

| 후보 | 내용 |
|------|------|
| `IR-O4O-COMMUNITY-CONTENT-LIST-CROSSSERVICE-PARITY-V1` | GP/KCos 커뮤니티 콘텐츠 리스트가 KPA 와 동형/공유인지 확인 후 검색 패턴 공통화 방향 결정 |
| `WO-O4O-COMMUNITY-CONTENT-SEARCH-CROSSSERVICE-APPLY-V1` | GP/KCos 에 동일 검색 UI 적용(공통 컴포넌트 or config) |
| (선택) 태그 클릭 → 검색 주입 | drawer 태그 클릭 시 검색어 채우기(경미) |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 변경 파일 | ContentDocumentsPage.tsx + CHECK (2개) |
| 검색 UI | 제목·내용·태그 단일 검색창 + 초기화 + 디바운스 + empty |
| 기존 API 활용 | ✅ `contentApi.list({search})` — 신규 API 0 |
| 제품 구조 미추가 | ✅ 제품 탭/필터/productId/B2B·B2C 0 |
| 자료실 구조 변경 | ✅ 없음(공유 컴포넌트 보조 뷰에 검색 동반 노출만, 무해) |
| TypeScript | ✅ KPA PASS |
| browser smoke | 라이브 보류(배포 필요) |
| 공통화 | 가능 — 후속 parity IR 후 GP/KCos 확산 |
| 다른 세션 WIP | 미포함(path-specific) |
