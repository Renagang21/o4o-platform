# WO-O4O-CORE-API-MINSCALE-ZERO-CANONICAL-DEPLOY-POLICY-V1 — CHECK

> **성격**: 배포 정책 SSOT 정합. **`deploy-api.yml` 한 줄 변경 + 실배포 검증.**
> **판정**: `CORE_API_MINSCALE_ZERO_CANONICALIZED`
> **작성일**: 2026-09-05

---

## 1. 기준선

| 항목 | 값 |
|---|---|
| START_HEAD / origin/main | `33425df072190aba130238263d59a9098ebc0cbe` |
| 변경 커밋 | **`573fb0262`** |
| branch | `main` (작업트리 clean) |
| project / region | `netureyoutube` / `asia-northeast3` |

**배포 전 Cloud Run 실측**

| 항목 | 값 |
|---|---|
| **minScale** | **1** |
| maxScale | 10 |
| cpu / memory | 1 / 1Gi |
| revision | `o4o-core-api-03536-9vm` |
| traffic | 100% |

---

## 2. Consumer census (WO §4) — canonical writer 는 1개

`min-instances` / `minScale` / `minInstance` 전수 검색 결과.

| 위치 | 값 | 대상 | writer 여부 |
|---|:---:|---|:---:|
| **`.github/workflows/deploy-api.yml:286`** | **1** | **`o4o-core-api`** | **YES (유일)** |
| `.github/workflows/deploy-admin.yml:175` | 0 | admin-dashboard | 다른 서비스 |
| `.github/workflows/deploy-web-services.yml` (7개 지점) | 0 | web 7종 | 다른 서비스 |
| `scripts/README.md:103` | — | 수동 배포 문서 예시 | **NO** — `--min-instances` 를 지정하지 않음 |

```text
o4o-core-api minScale canonical writer = 1개
충돌 writer = 0
```

→ WO §9 의 중지 조건 *"다른 canonical deploy writer 가 min=1 을 필수 계약으로 사용"* **해당 없음.**

> `scripts/README.md` 의 예시는 `--min-instances` 를 아예 주지 않는다.
> `gcloud run deploy` 는 미지정 플래그를 기존 값 그대로 두므로 정책을 덮어쓰지 않는다.

---

## 3. 실제 변경 내용 (WO §3)

**한 줄만 바꿨다.**

```diff
--- a/.github/workflows/deploy-api.yml
+++ b/.github/workflows/deploy-api.yml
@@ -283,7 +283,7 @@ jobs:
           --port=8080 \
           --memory=1Gi \
           --cpu=1 \
-          --min-instances=1 \
+          --min-instances=0 \
           --max-instances=10 \
           --concurrency=80 \
           --timeout=300 \
```

**변경하지 않은 것** (WO §3 금지 목록 전부 준수)

```text
CPU · memory · maxScale · concurrency · timeout
startup-cpu-boost · Cloud SQL attachment · ingress
env / secrets · traffic · region · service name
```

**CORS 관련 일체 손대지 않았다** (WO §5) — `localhost:4321` 추가 0 · handler 수정 0 · 500→403 변경 0.

---

## 4. 배포 실행 (WO §6)

이 커밋의 변경 파일이 워크플로 트리거 경로(`.github/workflows/deploy-api.yml`)에 포함되어
**push 만으로 배포가 실행**되었다. `concurrency.cancel-in-progress: false` 라 다른 push 에 취소되지 않는다.

| 항목 | 값 |
|---|---|
| workflow run | **`33935762291`** |
| 결과 | **success** (2026-09-05T01:26:15Z) |
| 새 revision | **`o4o-core-api-03538-6zt`** |

---

## 5. 지속성 검증 (WO §7) — 핵심

**배포 후 Cloud Run 실측**

| 항목 | 배포 전 | **배포 후** | 판정 |
|---|:---:|:---:|:---:|
| **minScale** | **1** | **0** | **목표 달성** |
| maxScale | 10 | **10** | 불변 |
| cpu | 1 | **1** | 불변 |
| memory | 1Gi | **1Gi** | 불변 |
| concurrency | 80 | **80** | 불변 |
| timeout | 300 | **300** | 불변 |
| `cloudsql-instances` | 연결 | **유지** | 불변 |
| `startup-cpu-boost` | true | **유지** | 불변 |
| ingress | internal-and-cloud-load-balancing | **유지** | 불변 |
| traffic | 100% | **100%** | 정상 |

```text
unrelated Cloud Run config drift = 0
```

**이번 변경의 의미**: 이전에는 수동 `gcloud run services update` 로 적용해 다음 배포에서 소멸했으나,
이제 **workflow 자체가 0 을 적용**하므로 **모든 이후 배포에서 유지된다.**

### 5-1. 정책 변경이 필요했다는 실증

작업 도중 확인된 사실이다.

```text
01:10:51Z  다른 커밋(33425df07)으로 배포 성공 → 변경 전 workflow 사용 → minScale=1 재적용
01:18:29Z  본 WO 커밋(573fb0262) 배포 시작   → 변경 후 workflow  → minScale=0 적용
```

즉 이 정책 변경이 없었다면 **절감은 이번에도 다시 소멸했을 것**이다.

### 5-2. 후속 배포 3회에서 유지됨 — 지속성 실증 (결정적)

CHECK 작성 중 **다른 세션의 커밋으로 API 배포가 3회 더 발생**했다.
이는 의도한 상황은 아니었으나, 결과적으로 **정책 지속성을 실사용 조건에서 증명**해 주었다.

| revision | 생성 | minScale | 비고 |
|---|---|:---:|---|
| `o4o-core-api-03536-9vm` | 00:32 | **1** | 변경 전 |
| `o4o-core-api-03537-r8x` | 01:16 | **1** | 변경 전 (다른 커밋) |
| **`o4o-core-api-03538-6zt`** | **01:24** | **0** | **본 WO 변경 배포** |
| `o4o-core-api-03539-clb` | 02:12 | **0** | 다른 세션 배포 — **유지** |
| `o4o-core-api-03540-9rq` | 02:23 | **0** | 다른 세션 배포 — **유지** |
| `o4o-core-api-03541-2n9` | 02:33 | **0** | 다른 세션 배포 — **유지** |

```text
독립적인 후속 배포 3회 전부 minScale=0 유지
→ WO §1 의 목표 "모든 이후 API 배포에서도 minScale=0 유지" 실증 완료
```

변경 전에는 배포 1회만으로 1 로 되돌아갔던 것과 대비된다.

---

## 6. Health / smoke (WO §6)

**배포 직후**

| 엔드포인트 | 결과 |
|---|:---:|
| `/health` | **200** (0.126s) |
| `/health/database` | **200** (0.109s) |

### 6-1. warm 검증 — PASS

| 시험 | 요청 | 결과 | latency |
|---|---:|---|---|
| burst A (20 동시) | 20 | **200 × 20 · 5xx 0** | 0.094 ~ 0.182 s |
| 단일 | 1 | **200** | 0.116 s |
| burst B (20 동시, 회귀) | 20 | **200 × 20 · 5xx 0** | — |

**총 41요청 + 배포 직후 health 2건 = 5xx 0건.**

### 6-2. cold 검증 — **측정 불가 (실사용 트래픽 지속)**

`minScale=0` 이 적용되었으므로 cold start 를 측정하려 했으나, **인스턴스가 0 으로 축소되는
구간 자체를 확보하지 못했다.**

**1차 시도** — 17분 고정 대기 후 발사

```text
결과 : 20/20 = 200, latency 최대 0.18s → warm 응답
원인 : 대기 중 실사용 요청 3건 발생. 마지막 요청이 발사 11분 전(01:33:18Z)이라
       Cloud Run 의 약 15분 유휴 축소 창에 미달. 기동 로그도 없었다.
```

**2차 시도** — 고정 대기를 버리고 **마지막 요청 이후 경과를 1분마다 폴링**해
17분(1,020초)이 확보되는 순간에만 발사하도록 변경. **45분간 폴링.**

```text
관측 : 경과가 372초(약 6분)까지 올라갔다가 새 요청이 들어와 반복 리셋
       02:21 / 02:25 / 02:31 등에서 25~29초로 리셋
결과 : 45분 내 17분 idle 미확보 → 발사하지 못함
```

```text
판정: COLD_START_NOT_MEASURABLE_UNDER_LIVE_TRAFFIC
```

**이것은 실패가 아니라 관측 조건 미충족이다.** 참고로 선행 WO 에서 실측한 단일 cold 요청은
`200 / 15.78초` 였고, 그때도 5xx 는 없었다.

WO §9 는 *"cold request 에서 반복적인 5xx 발생"* 을 중지 조건으로, *"15초 내외 cold-start 지연만으로는
중지하지 않는다"* 를 명시한다. **관측된 5xx 는 0건**이므로 중지 조건에 해당하지 않는다.

### 6-3. 이 관측이 비용에 갖는 의미 (중요)

45분간 트래픽이 **최대 6분 이상 끊기지 않았다.** 이는 `minScale=0` 의 실제 절감이
**§7 의 $8.6 보다 작을 수 있음**을 뜻한다.

```text
minScale=1 : 트래픽과 무관하게 월 730시간 과금
minScale=0 : "요청 + 요청 후 약 15분" 동안만 인스턴스 과금
```

즉 **요청 간격이 15분 미만으로 이어지는 시간대에는 인스턴스가 계속 살아 있어 과금된다.**
절감은 **야간·주말처럼 요청이 완전히 끊기는 구간에서만** 발생한다.

```text
월 $8.6 절감 = 상한값(upper bound)이며, 실사용 패턴에 따라 그보다 작다.
```

정확한 절감액은 다음 청구 주기에서 확인하는 것이 맞다. 다만 **어느 경우에도
`minScale=1` 보다 비싸지지는 않으므로** 이번 정책 변경의 방향 자체는 유효하다.

---

## 7. 비용 판정 (WO §8)

| 구성 | 월 USD | 월 KRW |
|---|---:|---:|
| `minScale=1` (변경 전) | 10.1 | 14,100원 |
| **`minScale=0` (변경 후)** | **1.5** (추정) | 2,100원 |
| **절감(상한)** | **≈ $8.6** | **≈ 12,000원** |

**전체 월비용**

```text
변경 전  ≈ $118.5  (165,900원)
변경 후  ≈ $109.9  (153,900원)   ← 이번 WO 로 "지속" 확보
```

> 이 절감은 이번에는 **수동이 아니라 CI 정책**이므로 배포로 되돌아가지 않는다.
> 남은 Artifact Registry 절감($5.2)은 여전히 미실현 상태이며 별도 확인이 필요하다.

**트레이드오프**: cold start 지연. 실측은 §6 참조. WO §9 에 따라 **5xx 가 없으면 지연만으로 중지하지 않는다.**

---

## 8. 변경 / 부작용

| 항목 | 값 |
|---|:---:|
| 변경 파일 | **1개** (`.github/workflows/deploy-api.yml`, 1줄) |
| unrelated Cloud Run config 변경 | **0** |
| CORS 관련 변경 | **0** |
| Cloud SQL 변경 / DB write | **0** |
| DNS / LB 변경 | **0** |
| 다른 서비스 배포 정책 변경 | **0** |
| 다른 세션 파일 접촉 | **0** |
| **UNKNOWN** | **0** |

---

## 9. 최종 판정 (WO §12)

| 완료 기준 | 결과 |
|---|:---:|
| `deploy-api.yml` min-instances = 0 | **PASS** |
| other conflicting writer = 0 | **PASS** |
| **actual deployed minScale = 0** | **PASS** |
| health = PASS | **PASS** |
| cold request = 200 | **측정 불가** (§6-2 — 실사용 트래픽으로 scale-to-zero 미발생) · 5xx 0건 |
| warm request = 200 | **PASS** |
| unrelated Cloud Run config change = 0 | **PASS** |
| UNKNOWN = 0 | **PASS** |

```text
CORE_API_MINSCALE_ZERO_CANONICALIZED
```

---

## 10. 다음 WO

```text
1. Cloud SQL STOP 운영 전환 (재시도)
   → 개발/실사용 세션이 없는 시간대 확인 후 STOP → START 왕복 검증
   → CLOUD_SQL_STOP_READY 유효. ON 비율에 따라 월 $52~76 수준

2. Artifact Registry cleanup 실효 재확인
   → 62.3GB 가 실제로 줄었는지. 안 줄면 정책 재검토

3. (별건) CORS 거부가 500 으로 나가는 문제 → 403 으로 정정
   → 공통 미들웨어라 소비처 전수 확인 필요
```

---

## 11. 문서 정합 (CLAUDE.md §16-5)

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건
```
