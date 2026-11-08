# 커뮤니티 포럼 AI 1단계 — 글쓰기 도우미 · 비슷한 글 안내

> 상태: 구현 완료 · 통합 담당 인계 대기(미병합 · 미배포) · 작성일: 2026-11-06 · 구현일: 2026-11-07 · 범위: `community.neture.co.kr` 커뮤니티 포럼(작성 화면)

## 1. 사용자 확정 (2026-11-06)

포럼 AI 는 기획부터 한다. 제안 5개(① 글쓰기 도우미 ② 비슷한 글 안내 ③ 긴 글 · 토론 요약 ④ 운영 보조 1차 분류 ⑤ 주간 다이제스트) 중 **1단계는 ①②** 로 시작한다. 나머지 설계 판단은 개발 담당에게 위임한다.

## 2. 현재 상태 (2026-11-06 코드 대조)

- 커뮤니티 포럼은 `createServiceForumRouter` 공통 구조(`service-forum.routes.ts`)를 쓴다. 커뮤니티 컨텍스트 읽기 · 쓰기는 `authenticate` + `requireCommunityAccess` + write guard 를 지난다.
- 검색은 제목 · 요약 · 태그 `ILIKE` 부분 일치(`ForumPostController`)뿐이다. 신고 기능은 없다.
- 기존 `ForumAIService` · `/api/v1/forum/ai/*` 는 **실제 모델이 아닌 키워드 규칙**이며 화장품 피부타입 등 은퇴 서비스 잔재를 포함한다. 프론트 소비처가 없다. 이번 범위에서 재사용하지 않고 은퇴 정리는 별도 WO 로 분리한다.
- 공통 AI 기반: `@o4o/ai-core` `runAiExtension` · `createAccountedExtensionRuntime` · `ai_query_policy.ai_enabled` · quota · 사용량 기록 · `resolveEditingModel` (커뮤니티 뉴스 V1 이 같은 기반을 쓴다).

## 3. 기능 정의

### ① 글쓰기 도우미 (작성자 · 게시 전 · 요청할 때만)

- 작성 화면의 "AI 도움" 버튼으로만 실행한다. 자동 호출 없음.
- 출력: 제목 후보 3개 · 질문/본문 다듬기 제안(원문 대비 수정안) · 태그 후보 · 게시판 추천.
- **AI 는 제안만 한다.** 적용은 작성자가 항목별로 선택하고, 게시는 기존 저장 버튼으로만 한다.
- 게시판 추천은 **작성자가 현재 쓸 수 있는 게시판 목록을 서버가 계산해 입력으로 주고**, 출력은 그 ID 중에서만 허용한다(서버 검증).
- 의약 질문에 대한 답변 생성은 하지 않는다(다듬기 · 분류만).

### ② 비슷한 글 안내 (작성자 · 작성 중)

- 제목 입력 후(디바운스) 같은 커뮤니티 범위에서 **작성자가 읽을 수 있는 글만** 최대 5개 제시한다. 폐쇄 게시판 · 미승인 가입 · 삭제/초안 글 제외 — 기존 forum 읽기 권한 판정을 그대로 재사용한다.
- 1단계 검색은 **AI 없이** 제목 키워드 기반(기존 `ILIKE` 확장: 불용어 제거 · 키워드 OR · 최근성 가중). 결과가 부족하거나 사용자가 "더 찾기"를 누를 때만 AI 가 검색 키워드를 추출해 재검색한다.
- 결과 클릭은 새 탭 열람. 작성 중 입력은 보존한다.

## 4. 설계 판단 (개발 담당 결정)

| 사안 | 결정 | 근거 |
|---|---|---|
| 실행 위치 | API 서버 커뮤니티 forum 경로 아래 신규 2 endpoint(`POST .../forum/ai/compose-assist`, `GET .../forum/posts/similar`). guard 는 기존 커뮤니티 write/read guard 와 동일 순서 | 새 권한 개념을 만들지 않는다. **route · API contract 추가**이므로 구현 PR 에서 명시 |
| 모델 · 비용 | 기존 편집 모델 · 단일 시도 · 입력 상한(제목 160자 · 본문 4,000자) · 출력 토큰 상한 · 사용자별 일일 횟수 상한 · 기존 quota 재사용 | 뉴스 V1 비용 원칙과 동일 |
| 저장 | **새 테이블 없음.** AI 결과는 응답으로만 주고 저장하지 않는다 | 게시 전 초안은 작성자 화면 상태다 |
| 검색 개선 | 1단계는 기존 컬럼 + 쿼리 개선만. 전문 검색 인덱스(pg_trgm · tsvector)는 성능 문제 확인 시 별도 migration WO | migration 없이 시작 |
| 공개 방문 | 비로그인 · 열람만 하는 사용자에게 AI 호출 없음 | 비용 |
| AI 비활성 | `ai_enabled=false` · quota 초과 시 버튼 비활성 안내. 글쓰기 · 비슷한 글(키워드 검색)은 그대로 동작 | AI 는 선택 기능 |

## 5. 범위 밖 (후속 후보)

- ③ 요약 · ④ 운영 보조 1차 분류 · ⑤ 주간 다이제스트.
- AI 자동 답변 · 자동 게시 · 자동 숨김(하지 않는다).
- `ForumAIService` · `/api/v1/forum/ai/*` · forum recommendation 라우트 은퇴 정리(별도 WO).

## 6. TODO

- [x] 커뮤니티 forum 작성 화면 · 게시판 쓰기 가능 목록 · 읽기 권한 판정 함수 위치 확정. (`ForumWritePage` · `ForumAiAssistController` · `checkClosedForumAccess`)
- [x] `compose-assist` 출력 계약 · 서버 검증(게시판 ID 화이트리스트 · 길이 · 형식) · 비용 상한.
- [x] `similar` 키워드 검색 · 권한 필터 · 결과 상한 · AI 키워드 재검색(요청 시).
- [x] 웹: AI 도움 패널(항목별 적용) · 비슷한 글 목록 · AI 비활성/한도 안내 · PC/모바일. (PC/모바일은 로컬 fixture 로만 확인 — 아래 7절)
- [x] 테스트: 권한(폐쇄 게시판 · 미가입 · 타 커뮤니티 글 비노출) · 게시판 ID 위조 거부 · 비용 상한 · AI mock. (DB · 모델 mock — 아래 7절)
- [x] 정본 반영: forum 공통 구조 문서에 AI 보조 계약 추가. (`docs/o4o-common-structure.md`)

## 7. 구현 기록 (2026-11-07)

**API contract 추가** (`/api/v1/communities/community/forum` 아래, 다른 forum mount 는 건너뜀): `GET /ai/status` · `POST /ai/compose-assist` · `GET /posts/similar` · `POST /ai/similar-search`. 계약은 `docs/o4o-common-structure.md`.

**4절 · 3절과 다르게 정한 것**

| 사안 | WO | 구현 | 이유 |
|---|---|---|---|
| AI 키워드 재검색 경로 | `GET .../posts/similar` 안에서 | 별도 `POST /ai/similar-search` | quota · 사용 원장을 쓰므로 GET 상태 변경 금지(AGENTS.md §5) 준수 |
| 결과 부족 시 AI | 자동 또는 "더 찾기" | "더 찾기" 버튼만. 부족하면 버튼을 보여 준다 | 제목 입력 중 자동 호출은 일일 횟수를 소모한다 |
| 상태 확인 | 언급 없음 | `GET /ai/status` 추가 | 버튼 비활성 안내를 누르기 전에 보여 주기 위함 |
| 적용 범위 | `community.neture.co.kr` | `communityKey = community` 만. 사업 회원 공간(`business:*`) · 펀딩 · Neture mount 제외 | WO 범위 유지 |
| 입력 상한 초과 | 상한만 명시 | 자르지 않고 400 | 잘린 본문의 수정안을 적용하면 글이 사라진다 |

**공유 모듈 변경 (additive)**: `ForumWriteForm` 에 선택 prop `renderAfterTitle` · `onDraftChange` · `draftPatch` 추가(소비처 web-neture · web-pharmacy-business · web-pharmacy-coop 은 미지정 시 동작 동일). `AiQuotaService.checkQuota` 에 선택 `serviceKey` 인자 추가.

**확인하지 못한 것**

- 로컬 PostgreSQL 이 없어 실제 DB 실행 검증은 하지 않았다. TypeORM 이 만든 SQL 문자열과 바인딩만 확인했다.
- 실제 모델 호출은 하지 않았다(mock).
- 브라우저 확인은 API 를 stub 한 로컬 fixture 로만 했다. 실제 로그인 · 실제 API 연동은 미확인.

**남은 한계**: 일일 횟수 초과 방지는 건수 확인과 예약이 별도 트랜잭션이라 인스턴스 간 동시 요청에서 소폭 초과할 수 있다. 일일 횟수는 같은 `community` 서비스의 다른 AI 사용(뉴스 편집 초안)과 합산된다.
