# Pilot KPI Framework

## Work Order: WO-SIGNAGE-PHASE3-PILOT

### 목적

Pilot 기간 동안 수집할 KPI를 정의하고, 측정 방법과 목표를 명시합니다.

---

## 1. 운영 KPI (Operations)

### 1.1 매장 채택률 (Store Adoption Rate)

**정의:** Global 콘텐츠를 Clone한 매장 비율

```
채택률 = (Clone한 매장 수 / 전체 Pilot 매장 수) × 100
```

| 기간 | 목표 | 최소 |
|------|------|------|
| Week 1 | 30% | 20% |
| Week 2 | 50% | 40% |
| Week 3 | 70% | 60% |
| Week 4 | 80% | 70% |

**데이터 소스:** `seller_contents` (scope='store', parentContentId IS NOT NULL)

---

### 1.2 콘텐츠 활용도 (Content Utilization)

**정의:** 매장당 평균 활성 콘텐츠 수

```
활용도 = 전체 활성 콘텐츠 수 / 활성 매장 수
```

| 콘텐츠 유형 | 목표 |
|-------------|------|
| Pharmacy | ≥ 3개/매장 |
| Cosmetics | ≥ 5개/매장 |
| Seller | ≥ 2개/매장 |

---

### 1.3 콘텐츠 교체 주기 (Content Refresh Rate)

**정의:** 평균 콘텐츠 변경 간격

```
교체 주기 = Σ(콘텐츠 변경 시점 간격) / 변경 횟수
```

| 목표 | 경고 | 위험 |
|------|------|------|
| ≤ 7일 | 7-14일 | > 14일 |

---

### 1.4 Force 유지율 (Force Compliance)

**정의:** Force 콘텐츠 삭제 시도 차단율

```
유지율 = 차단된 삭제 시도 / 전체 삭제 시도 × 100
```

**목표:** 100% (Force 콘텐츠 삭제 불가)

---

### 1.5 Store 활성률 (Store Activity Rate)

**정의:** 주 1회 이상 시스템 접속 매장 비율

```
활성률 = (주간 접속 매장 수 / 전체 Pilot 매장 수) × 100
```

| 기간 | 목표 | 최소 |
|------|------|------|
| Week 1-4 | 80% | 70% |

---

## 2. 수익 KPI (Revenue - Seller Extension)

### 2.1 노출 수 (Impressions)

**정의:** Seller 콘텐츠가 Player에 표시된 횟수

```sql
SELECT SUM(impressions)
FROM seller_content_metrics
WHERE date BETWEEN :start AND :end
```

| 기간 | 목표 |
|------|------|
| Daily | ≥ 1,000 |
| Weekly | ≥ 7,000 |
| Total | ≥ 30,000 |

---

### 2.2 클릭률 (CTR - Click-Through Rate)

**정의:** 노출 대비 클릭 비율

```
CTR = (클릭 수 / 노출 수) × 100
```

| 콘텐츠 유형 | 목표 CTR |
|-------------|----------|
| Banner | ≥ 0.5% |
| Product Ad | ≥ 1.0% |
| Video | ≥ 2.0% |

---

### 2.3 QR 스캔율 (QR Scan Rate)

**정의:** 노출 대비 QR 스캔 비율

```
QR 스캔율 = (QR 스캔 수 / 노출 수) × 100
```

**목표:** ≥ 0.3%

---

### 2.4 영상 완료율 (VTR - Video Through Rate)

**정의:** 영상 시작 대비 완료 비율

```
VTR = (video_completes / video_starts) × 100
```

| 영상 길이 | 목표 VTR |
|-----------|----------|
| < 15초 | ≥ 80% |
| 15-30초 | ≥ 60% |
| > 30초 | ≥ 40% |

---

### 2.5 캠페인 효율성 (Campaign Efficiency)

**정의:** 캠페인당 평균 성과

```
효율성 = (총 노출 수 / 활성 캠페인 수)
```

| 지표 | 목표 |
|------|------|
| 캠페인당 노출 | ≥ 5,000 |
| 캠페인당 클릭 | ≥ 50 |
| 캠페인당 매장 도달 | ≥ 10개 |

---

## 3. 기술 KPI (Technical)

### 3.1 API 응답 시간 (Response Time)

**정의:** API 요청 평균 응답 시간

| 엔드포인트 | 목표 | 경고 | 위험 |
|-----------|------|------|------|
| GET (목록) | < 200ms | 200-500ms | > 500ms |
| GET (단일) | < 100ms | 100-300ms | > 300ms |
| POST | < 300ms | 300-500ms | > 500ms |
| Global Contents | < 500ms | 500ms-1s | > 1s |

---

### 3.2 오류율 (Error Rate)

**정의:** 전체 요청 대비 에러 응답 비율

```
오류율 = (에러 응답 수 / 전체 요청 수) × 100
```

| 에러 유형 | 목표 |
|----------|------|
| 4xx (Client) | < 5% |
| 5xx (Server) | < 0.5% |
| 전체 | < 5% |

---

### 3.3 Player 안정성 (Player Stability)

**정의:** Player 비정상 종료/오류 빈도

| 지표 | 목표 |
|------|------|
| 비정상 종료 | 0건 |
| 재생 오류 | < 1% |
| 콘텐츠 로드 실패 | < 0.5% |

---

### 3.4 Metrics 수집 정확도 (Metrics Accuracy)

**정의:** 이벤트 누락/중복 없이 정확히 수집된 비율

```
정확도 = (정상 이벤트 수 / 예상 이벤트 수) × 100
```

| 목표 | 최소 |
|------|------|
| ≥ 99.9% | 99% |

---

### 3.5 오프라인 복구율 (Offline Recovery Rate)

**정의:** 오프라인 기간 동안의 이벤트가 온라인 복구 후 전송된 비율

```
복구율 = (복구된 이벤트 수 / 오프라인 기간 이벤트 수) × 100
```

**목표:** 100%

---

## 4. 데이터 수집 쿼리

### 4.1 일별 Seller Metrics 집계

```sql
SELECT
  date,
  SUM(impressions) as total_impressions,
  SUM(clicks) as total_clicks,
  SUM(qr_scans) as total_qr_scans,
  SUM(video_starts) as total_video_starts,
  SUM(video_completes) as total_video_completes,
  ROUND(SUM(clicks)::numeric / NULLIF(SUM(impressions), 0) * 100, 2) as ctr,
  ROUND(SUM(video_completes)::numeric / NULLIF(SUM(video_starts), 0) * 100, 2) as vtr
FROM signage_seller.seller_content_metrics
WHERE organization_id = :orgId
  AND date BETWEEN :startDate AND :endDate
GROUP BY date
ORDER BY date;
```

### 4.2 캠페인별 성과

```sql
SELECT
  c.id as campaign_id,
  c.title as campaign_title,
  c.partner_id,
  c.start_at,
  c.end_at,
  COUNT(DISTINCT ct.id) as content_count,
  SUM(ct.total_impressions) as impressions,
  SUM(ct.total_clicks) as clicks,
  SUM(ct.clone_count) as clones
FROM signage_seller.seller_campaigns c
LEFT JOIN signage_seller.seller_contents ct ON ct.campaign_id = c.id
WHERE c.organization_id = :orgId
  AND c.status = 'active'
GROUP BY c.id, c.title, c.partner_id, c.start_at, c.end_at;
```

### 4.3 매장 채택 현황

```sql
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT id) as cloned_contents,
  COUNT(DISTINCT (metadata->>'clonedFrom')) as unique_sources
FROM signage_seller.seller_contents
WHERE organization_id = :orgId
  AND scope = 'store'
  AND parent_content_id IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date;
```

---

## 5. 모니터링 대시보드 구성

### 5.1 실시간 모니터링

- 현재 활성 매장 수
- 오늘 노출/클릭 수
- 오류 발생 현황
- Player 상태

### 5.2 일별 리포트

- KPI 달성률
- 트렌드 차트
- 이상 징후 알림
- Top/Bottom 콘텐츠

### 5.3 주간 리포트

- 주간 KPI 요약
- 목표 대비 달성률
- 개선 필요 영역
- 권장 조치

---

## 6. 알림 기준

### 6.1 긴급 (Critical)

- 5xx 오류율 > 5%
- Player 장애 발생
- Force 규칙 위반

### 6.2 경고 (Warning)

- API 응답 시간 > 1s
- 매장 채택률 < 50%
- Metrics 누락 > 1%

### 6.3 정보 (Info)

- 일별 KPI 달성
- 새 캠페인 시작
- 콘텐츠 승인 완료

---

*Document Version: 1.0.0*
*Created: 2026-01-20*
*Work Order: WO-SIGNAGE-PHASE3-PILOT*
