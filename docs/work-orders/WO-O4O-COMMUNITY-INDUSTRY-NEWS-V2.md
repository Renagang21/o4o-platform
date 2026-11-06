# 커뮤니티 약업계 주요 소식 V2 — 전체 기사 AI 선별 · 자동 게시

> 상태: DRAFT · 작성일: 2026-11-06 · 범위: `community.neture.co.kr` 홈 '약업계 주요 소식'
> 선행: [WO-O4O-COMMUNITY-INDUSTRY-NEWS-V1](WO-O4O-COMMUNITY-INDUSTRY-NEWS-V1.md) (COMPLETED · PR #748)

## 1. 배경 — V1 과 사용자 의도의 차이

사용자 의도: **매일 지정 전문지의 기사 전체를 보고 AI 가 주요 소식을 선별**하고, 같은 뉴스가 약사공론에 있으면 약사공론 기사를 먼저 보여준다. 선별 품질은 사용자 클릭 패턴으로 발전시킨다.

V1 구현(2026-11-06 코드 대조):

| 항목 | V1 | 문제 |
|---|---|---|
| 수집 범위 | 매체별 첫 화면 주요 기사 **2건**(`community-news-collection.service.ts` `items.slice(0, 2)`) · 합계 최대 6건 | AI 가 기사 전체를 보지 않는다. 매체 편집자가 고른 2건을 정리할 뿐이다 |
| 약사공론 우선 | 위 6건 안에서만 AI 가 묶음 판단 | 같은 뉴스가 약사공론에 있어도 첫 화면 2건 밖이면 매칭되지 않는다 |
| 게시 | 수집·AI 결과 모두 `draft` · 운영자가 적용 후 직접 게시 | 운영자가 매일 처리하지 않으면 홈에 아무것도 나오지 않는다 → "가동되지 않음"으로 보인다 |
| 실행 | 앱 내 30분 tick · 한국시간 08시 이후 하루 1회 · `min-instances=0` | 하루 1회라 약사공론의 늦은 기사를 반영하지 못한다 |

## 2. 사용자 확정 (2026-11-06)

1. **뉴스 게시는 자동**이다. 운영자는 사후에 숨김 · 고정으로 조정한다.
2. **하루 2회(아침 · 오후) 실행**하고, 나중에 올라온 약사공론 기사로 같은 이슈의 대표 링크를 교체한다.
3. 선별 오류는 허용하고 **클릭 패턴으로 개선**한다.
4. 그 밖의 설계 판단은 개발 담당에게 위임한다(아래 §3).

이 확정은 [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §5 의 2026-10-21 "AI 는 운영 검토용 초안 · 게시 · 공개 지정은 운영자가 결정" 중 **게시 부분을 대체**한다. 구현 완료 시 정본 §5 를 갱신한다(TODO §6).

## 3. 위임 판단 (개발 담당 결정)

| 사안 | 결정 | 근거 |
|---|---|---|
| 수집 원천 | 매체별 공개 RSS · 최신기사 목록 · 사이트맵 중 **실제 접속해 확인된 경로**에서 최근 24시간 기사 전체 | V1 이 첫 화면만 쓴 이유는 당시 접속 검증 범위였다. 검증 없이 RSS 주소 · 선택자를 추정하지 않는 V1 원칙은 유지 |
| 기사 본문 | 수집 · 저장하지 않는다. **제목 + 리드(제공 요약 또는 첫 문단 일부) + 섹션 + 발행시각**만 | 선별에 충분 · 비용 수십 배 차이 · 매체 저작권/이용약관 위험 회피. 본문 일시 열람은 묶음 정확도 문제가 실제로 확인될 때 별도 판단 |
| 같은 뉴스 묶기 | 1단계: 서버 정규화(URL · 제목) 중복 제거 → AI 가 제목 · 리드로 이슈 묶음 생성. 임베딩 유사도는 품질 문제가 확인되면 2단계 | 하루 수백 건은 1회 호출로 처리 가능. 새 provider 기능 의존을 늦춘다 |
| 약사공론 대표 | **서버 규칙으로 강제** — 묶음에 약사공론 기사가 있으면 무조건 대표. AI 출력은 묶음 · 점수 · 이유만 | AI 오류가 사용자 확정 원칙(약사공론 우선)을 깨지 않게 한다 |
| 중요도 | AI 가 묶음 단위로 약사 관점 기준표(약가 · 제도 · 법령 / 약사회 / 의약품 안전성 · 회수 / 유통 · 공급 / 개국 실무)로 점수 · 이유. **여러 매체가 동시에 다룬 이슈 가산** | 다매체 동시 보도는 비용 없는 객관 신호 |
| 저장 | 새 테이블 2개(아래 §4). 후보 기사를 `cms_contents` 초안 행으로 쌓지 않는다 | 하루 수백 건 · 클릭 집계는 `cms_contents` 용도에 맞지 않는다. 홈 노출은 기존 `cms_contents` news(published) 경로를 그대로 쓴다 |
| 실행 시각 | 앱 내 job 유지 · **한국시간 08시 · 15시 두 창**. 창별 DB 예약으로 인스턴스 · revision 간 중복 방지 | 새 인프라 · IAM 없이 시작. 실행 누락이 운영 기록으로 확인되면 Cloud Scheduler 정시 호출을 별도 승인으로 추가 |
| 자동 게시 수 | 오전 상위 8묶음 게시 · 오후는 신규 중요 묶음 추가와 약사공론 대표 교체. 전날 자동 게시분은 `expiresAt` 으로 내려간다 | 홈 최근 10건 표시 구조(`editorialPreview`)와 맞춘다 |
| 탐색 슬롯 | 게시 8개 중 1개는 AI 순위 9~20위에서 순환 | AI 가 고른 기사만 클릭 데이터를 받는 자기강화 방지 |
| 클릭 수집 | 홈에서 노출 · 클릭을 **익명 집계**(기사 · 날짜 · 노출 위치별 횟수)로만 기록. 사용자별 기록 없음. `POST` beacon · rate limit | GET 으로 상태 변경 금지(CLAUDE.md §8). 개인정보 최소화 |
| 학습 | 1단계는 수집만. 4주 이상 데이터가 쌓이면 주 1회 주제 · 섹션 · 키워드 가중치를 **위치 보정 클릭률 + 운영자 고정/숨김(강한 신호)**으로 갱신해 AI 점수에 더한다 | 클릭 = 중요가 아니다(자극적 제목). 운영자 신호 · 다매체 신호와 섞는다 |
| 비용 상한 | 창별 AI 1회 · 단일 provider 시도 · 입력 기사 상한(예: 400건 · 제목 160자 · 리드 240자) · 출력 토큰 상한. 기존 `ai_query_policy` · quota · 사용량 기록 재사용 | V1 비용 원칙 유지 |
| 공개 방문 | AI 호출 · 외부 수집 없음(V1 유지) | |

## 4. 데이터 (migration 필요 — CI/CD 자동 적용 원칙)

- `community_news_articles` — 수집 후보 원장: `id` · `source`(kpanews/dailypharm/medipana) · `url`(정규화 · UNIQUE) · `title` · `lead` · `section` · `published_at` · `collected_at` · `day`(KST) · `cluster_key` · `ai_score` · `ai_reason` · `representative`(bool) · `published_content_id`(→ 게시된 `cms_contents.id`, nullable).
- `community_news_engagement_daily` — 익명 집계: `article_id` · `day` · `position` · `impressions` · `clicks` · PK(`article_id`,`day`,`position`). upsert 로만 증가.
- 보존: 후보 원장 90일 · 집계 1년(기존 이력 보존 정책 범위 안). 삭제 job 은 같은 앱 job 에 포함.
- Boundary: 모두 `serviceKey='community'` 전용 테이블이며 cross-domain JOIN 없음. Raw SQL 은 parameter binding.

## 5. 범위 밖

- 기사 본문 수집 · 저장 · 요약 게시.
- 사용자별 개인화 추천.
- 새 매체 추가(사용자 확정 3개 매체 유지).
- 독립 queue · Cloud Tasks · 상시 인스턴스.

## 6. TODO

- [ ] **선행 — 운영 기록 확인(읽기 전용).** 아래 §7 쿼리로 V1 이 실제로 어디서 멈췄는지 확정한다(수집 실패 / AI 실패 · 비활성 / 초안 미게시). 이 세션은 운영 DB 접속 수단이 없어 사용자 로컬 PC 의 Cloud SQL Proxy 로 실행한다([`SETUP.md`](../../SETUP.md) §4).
- [ ] 매체별 실제 RSS · 목록 · 사이트맵 경로 접속 확인 · robots 준수 · 하루 건수 측정.
- [ ] migration 2테이블 · 보존 job.
- [ ] 수집기 확장(최근 24시간 전체 · 리드만 · 중복 URL 제거). V1 의 timeout · 응답 크기 · redirect 금지 · robots 대기 유지.
- [ ] AI 묶음 · 점수 출력 계약 + 서버 검증(입력 기사 ID 만 · 길이 상한) · 약사공론 대표 서버 강제.
- [ ] 자동 게시 · 오후 대표 교체 · 탐색 슬롯 · 만료.
- [ ] 운영자 사후 조정: 숨김 · 고정 · 수동 실행 · 실행 결과(매체별 건수 · 실패) 조회. 숨김/고정은 학습 신호로 기록.
- [ ] 홈 노출 · 클릭 beacon(익명 집계 · rate limit).
- [ ] 테스트: 정책 · 묶음 검증 · 대표 강제 · 창 예약 중복 · 비용 상한 · 권한 · 격리 PostgreSQL · 웹 PC/모바일.
- [ ] 정본 갱신: ROLE-WORKSPACE §5 자동 게시 반영 · V1 WO 에 V2 링크.
- [ ] (2단계, 데이터 4주 이후) 가중치 학습 · 효과 측정.

## 7. 운영 기록 확인 쿼리 (읽기 전용 · SELECT 만)

```sql
-- 1) 최근 14일 수집 실행 기록: 날짜 · 상태 · 매체별 신규 건수/실패
SELECT metadata->>'day' AS day, metadata->>'state' AS state, metadata->'sources' AS sources, "createdAt", "updatedAt"
FROM cms_contents
WHERE "serviceKey"='community' AND "organizationId" IS NULL
  AND metadata->>'section'='community-editorial' AND metadata->>'kind'='news-collection' AND status='draft'
ORDER BY "createdAt" DESC LIMIT 14;

-- 2) 최근 14일 AI 정리 실행 기록: 날짜 · 상태 · 추천 묶음 수
SELECT metadata->>'day' AS day, metadata->>'state' AS state,
       jsonb_array_length(COALESCE(metadata->'items','[]'::jsonb)) AS groups, "createdAt", "updatedAt"
FROM cms_contents
WHERE "serviceKey"='community' AND "organizationId" IS NULL
  AND metadata->>'section'='community-editorial' AND metadata->>'kind'='news-review' AND status='draft'
ORDER BY "createdAt" DESC LIMIT 14;

-- 3) 뉴스 항목 상태별 건수 · 마지막 생성/게시 시각 (제목 · 링크 원문은 조회하지 않는다)
SELECT status, count(*) AS items, max("createdAt") AS last_created, max("updatedAt") AS last_updated
FROM cms_contents
WHERE "serviceKey"='community' AND "organizationId" IS NULL
  AND metadata->>'section'='community-editorial' AND metadata->>'kind'='news'
GROUP BY status;

-- 4) 중앙 AI 활성 여부
SELECT ai_enabled FROM ai_query_policy WHERE id=1;
```

판정: 1) 이 비었거나 오래됐으면 job 미실행(인스턴스 · 시각 조건) · `failed`/매체 실패면 수집 원천 문제 · 2) 가 `failed` 거나 4) 가 false 면 AI 문제 · 1) 2) 가 정상인데 3) 의 published 가 오래됐으면 **초안 미게시**(V1 설계상 운영자 수동 게시)다. 결과 보고 시 기사 제목 · URL · 계정 정보는 옮기지 않고 날짜 · 상태 · 건수만 적는다.
