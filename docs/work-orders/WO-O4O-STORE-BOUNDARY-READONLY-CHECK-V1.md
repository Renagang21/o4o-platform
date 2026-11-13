# 내 매장 경계 보강 후 운영 데이터 확인 (read-only)

> **상태**: ACTIVE
> **작성일**: 2026-11-13 · **최종 갱신**: 2026-11-13
> **실행 위치**: LOCAL
> **인계**: claude/wizardly-bardeen-ldq332 · 클라우드 세션 작성 → 로컬 세션이 §3 조회를 `o4o_readonly` 로 실행하고 §4 에 숫자만 기록 · push
> **근거**: [`IR-O4O-STORE-WORKSPACE-IMPROVEMENT-SURVEY-V1`](../investigations/IR-O4O-STORE-WORKSPACE-IMPROVEMENT-SURVEY-V1.md) P0 · P1-3 · P2, [`WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1`](WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1.md) 3단계

## 1. 목적

클라우드 세션은 운영 DB 를 볼 수 없다. 아래 판단에 필요한 **개수만** 확인한다. 개별 행 · 이름 · 이메일 · 내용은 기록하지 않는다.

1. 이미 고친 매장 경계(플레이리스트 · 마케팅 연결)에 예전에 들어간 다른 매장 데이터가 남았는가 — 남았으면 정리 WO(운영 DB write · 통합 담당 승인)를 따로 만든다.
2. 콘텐츠 공개 설정 API 의 「매장 없는 사용자는 예전 KPA 소속 조직으로」 규칙(P1-3)을 쓰기 경로에서 빼도 되는가.
3. 상담 2대 연결(고객 화면 짝짓기)과 관리자 일반/대형 배치 설정의 코드를 지워도 되는가.
4. 공용 상품 이미지 중 출처가 없는 이미지 규모(매장이 예전에 올린 이미지가 섞여 있다).

## 2. 실행 조건

- `SETUP.md` 운영 DB identity 절의 `o4o_readonly` 계정만 쓴다. write · DDL 없음. `/db-readonly` 스킬을 따른다.
- 결과는 아래 §4 표의 **숫자**만 적는다(`AGENTS.md` §5 공개 저장소 규칙).

## 3. 조회

```sql
-- Q1. 다른 매장 자료가 든 플레이리스트 항목 수
SELECT COUNT(*) AS cross_store_items
  FROM store_playlist_items i
  JOIN store_playlists p ON p.id = i.playlist_id
  JOIN o4o_asset_snapshots s ON s.id = i.snapshot_id
 WHERE s.organization_id <> p.organization_id;

-- Q2. 다른 매장 자산을 가리키는 상품 마케팅 연결 수
SELECT m.asset_type, COUNT(*) AS cross_store_links
  FROM product_marketing_assets m
 WHERE (m.asset_type = 'qr' AND NOT EXISTS (SELECT 1 FROM store_qr_codes q WHERE q.id = m.asset_id AND q.organization_id = m.organization_id))
    OR (m.asset_type = 'library' AND NOT EXISTS (SELECT 1 FROM store_execution_assets a WHERE a.id = m.asset_id AND a.organization_id = m.organization_id))
    OR m.asset_type NOT IN ('qr', 'library')
 GROUP BY m.asset_type;

-- Q3. 약국 매장이 아닌 조직이 가진 콘텐츠 공개 설정 수(공개 상태별)
SELECT c.publish_status, COUNT(*) AS controls
  FROM kpa_store_asset_controls c
 WHERE NOT EXISTS (SELECT 1 FROM neture_pharmacy_memberships m WHERE m.organization_id = c.organization_id)
 GROUP BY c.publish_status;

-- Q4. 상담 연결 행 — 방식별 · 기기 연결 · 최근 30일 사용
SELECT mode,
       COUNT(*) AS rows_total,
       COUNT(*) FILTER (WHERE device_hash IS NOT NULL) AS with_device,
       COUNT(*) FILTER (WHERE GREATEST(device_seen_at, operator_seen_at) > now() - interval '30 days') AS used_30d
  FROM store_consultation_stations
 GROUP BY mode;

-- Q5. 관리자 일반/대형 배치 값을 가진 약국 수
SELECT o.metadata->>'consultationLayout' AS layout, COUNT(*) AS stores
  FROM organizations o
 WHERE o.metadata ? 'consultationLayout'
 GROUP BY 1;

-- Q6. 공용 상품 이미지 출처별 수(삭제 제외)
SELECT COALESCE(source, '(없음)') AS source, COUNT(*) AS images,
       COUNT(*) FILTER (WHERE created_by IS NULL) AS without_author
  FROM product_images
 WHERE deleted_at IS NULL
 GROUP BY 1
 ORDER BY 2 DESC;
```

## 4. 결과 (로컬 세션 기록)

| 조회 | 결과(숫자만) | 판정 |
|---|---|---|
| Q1 | | 0 이면 정리 불필요 |
| Q2 | | 0 이면 정리 불필요 |
| Q3 | | 0 이면 P1-3 넘김 규칙을 쓰기 경로에서 제거 · 있으면 역할 확인 추가 |
| Q4 | | `counter-*` 행이 최근 30일 사용 0 이면 짝짓기 코드 제거 진행 |
| Q5 | | 값이 있어도 화면이 읽지 않음 — 코드 제거 진행(값은 남겨 둠) |
| Q6 | | 출처 없는 이미지 규모 — 매장별 이미지 결정(사용자) 참고 |

## 5. TODO

- [ ] 로컬: §3 실행 · §4 기록 · push
- [ ] 클라우드: 결과에 따라 정리 WO 또는 코드 제거 진행

## 6. 문서 정합

해당 없음.
