# CHECK-O4O-GLYCOPHARM-DOMAIN-MAPPING-SITEGUIDE-REMOVAL-V1

> **유형**: 인프라 확인 (read-only) — 코드/DB 무변경.
> **목적**: SiteGuide legacy 코드 제거(WO-O4O-SITEGUIDE-LEGACY-CODE-REMOVAL-V1) 후,
> `www.glycopharm.co.kr` 이 더 이상 SiteGuide 를 서빙하지 않는지 GCP 인프라 기준으로 확인.
> **결론(요약)**: **원인은 코드가 아니라 Global LB `o4o-global-lb` 의 와일드카드 host 규칙**.
> `path-matcher-siteguide-web <= ['*']` 이 **매칭되지 않은 모든 호스트를 SiteGuide 백엔드로** 보낸다.
> `glycopharm.co.kr`(apex)은 명시 규칙이 있어 정상이나, **`www.glycopharm.co.kr` 은 명시 규칙이 없어 `*` 로 떨어져 SiteGuide 를 서빙**. 수정은 인프라 변경(승인 필요).
> **작성일**: 2026-06-15

---

## 1. 현재 응답 (관찰)

| 도메인 | HTTP | `<title>` | 판정 |
|--------|:---:|-----------|------|
| `glycopharm.co.kr` (apex) | 200 | `GlycoPharm - 혈당관리 전문 플랫폼` | ✅ 정상 |
| `www.glycopharm.co.kr` | 200 | `SiteGuide - 방문자는 묻고, 웹사이트가 답합니다` | ❌ SiteGuide |
| `siteguide-web-…run.app` | 200 | `SiteGuide - …` | (동일 백엔드 확인) |

- DNS: `glycopharm.co.kr` / `www.glycopharm.co.kr` 모두 `136.110.132.35` (동일 Google LB anycast IP).
  → 같은 IP 에서 **Host 헤더 기반으로 다른 백엔드** 라우팅 = Global External LB host rule 문제.

## 2. 근본 원인 — `o4o-global-lb` host 규칙

```
path-matcher-glycopharm     <= ['glycopharm.co.kr']            → backend-glycopharm-web  ✅
path-matcher-siteguide-web  <= ['*']                           → backend-siteguide-web   ⚠️ catch-all
path-matcher-siteguide-web  <= ['siteguide.co.kr','www.siteguide.co.kr'] → backend-siteguide-web
...
(www.glycopharm.co.kr 에 대한 명시 host 규칙 없음)
```

- **`www.glycopharm.co.kr` 명시 규칙 부재** → 와일드카드 `['*']` 로 fallback → `backend-siteguide-web`.
- **확정 영향(실측, 2026-06-15)**: catch-all 로 떨어지는 **3개 www 도메인이 전부 SiteGuide 서빙 중**:

| 도메인 | 현재 title | 올바른 백엔드 |
|--------|-----------|--------------|
| `www.glycopharm.co.kr` | SiteGuide ❌ | backend-glycopharm-web |
| `www.kpa-society.co.kr` | SiteGuide ❌ | backend-kpa-society-web |
| `www.glucoseview.co.kr` | SiteGuide ❌ | backend-glucoseview-web-advanced |

> 명시 규칙 있는 `www.neture.co.kr`·`www.k-cosmetics.site` 는 정상. 즉 **www 누락 3건 + catch-all 대상이 SiteGuide** 인 것이 복합 원인.
> `backend-siteguide-core` 는 url-map 의 어떤 path rule 에서도 참조되지 않음(완전 orphan).

## 3. siteguide 잔존 인프라 (코드 제거됐으나 GCP 에 남음)

| 리소스 종류 | 이름 |
|------------|------|
| Cloud Run service | `siteguide-web`, `siteguide-core` |
| Backend service | `backend-siteguide-web`, `backend-siteguide-core` |
| Serverless NEG | `siteguide-web-neg`, `siteguide-core` |
| LB host rule | `path-matcher-siteguide-web` (`*` + `siteguide.co.kr`/`www.siteguide.co.kr`) |

→ 저장소 코드는 제거됐으나 **배포된 Cloud Run 서비스 + LB 배선은 그대로 살아 있다.**

## 4. 권장 수정 (인프라 — 별도 승인 필요)

> 코드 WO 범위 밖. 아래는 제안이며 실행 전 사용자 승인 필요. `*` 규칙을 건드리므로 **다른 도메인 영향 확인 후** 적용.

1. **즉시(서빙 정상화)**: `www.glycopharm.co.kr` 명시 host 규칙 추가 → `path-matcher-glycopharm`.
   - 동시에 다른 서비스의 `www.*`(예: `www.kpa-society.co.kr`)도 정상 백엔드로 명시 추가 검토.
2. **catch-all 정리**: 와일드카드 `['*']` 의 대상 백엔드를 SiteGuide 가 아닌 적절한 기본값(예: neture 또는 404 페이지)으로 변경. SiteGuide 는 제거 대상이므로 catch-all 에서 분리.
3. **리소스 삭제(서빙 분리 후)**: `path-matcher-siteguide-web` host 규칙 제거 → backend-siteguide-web/-core → NEG → Cloud Run `siteguide-web`/`siteguide-core` 순으로 정리.
   - `siteguide.co.kr` 도메인은 향후 별도 저장소 신규 서비스로 재개 시 다시 매핑.

## 4-A. 실행 결과 (2026-06-15, 승인 후 적용)

> 사용자 승인(1번: `*` catch-all 규칙 제거). 코드/DB 무변경, **인프라(LB + Cloud Run)만 변경**.

**Phase 2 — www 정상화 (url-map import):**
- `www.glycopharm.co.kr` → `path-matcher-glycopharm`
- `www.kpa-society.co.kr` → `path-matcher-kpa-society`
- `www.glucoseview.co.kr` → `path-matcher-glucoseview`
- `path-matcher-siteguide-web` host 규칙(`*`, `siteguide.co.kr`, `www.siteguide.co.kr`) + path matcher 제거
- url-map defaultService(`backend-neture-web-http`)는 그대로 — 미매칭 호스트는 여기로 fallback (신규 catch-all 미생성)

**Phase 3 — siteguide 리소스 삭제 (참조 역순):**
- backend-services: `backend-siteguide-web`, `backend-siteguide-core` ✅ 삭제
- serverless NEG: `siteguide-web-neg`, `siteguide-core` ✅ 삭제
- Cloud Run: `siteguide-web`, `siteguide-core` ✅ 삭제

**검증 (전 도메인 HTTP 200, 올바른 서비스):**

| 도메인 | 결과 |
|--------|------|
| glycopharm.co.kr / www.glycopharm.co.kr | GlycoPharm ✅ |
| kpa-society.co.kr / www.kpa-society.co.kr | KPA Society ✅ |
| glucoseview.co.kr / www.glucoseview.co.kr | GlucoseView ✅ |
| neture.co.kr / www.neture.co.kr | Neture ✅ |
| k-cosmetics.site | K-Cosmetics ✅ |
| siteguide.co.kr | Neture (url-map default — catch-all 제거 결과) |

- siteguide Cloud Run / backend / NEG 잔존 **0** (전수 확인).
- `siteguide.co.kr` 도메인은 향후 별도 저장소 신규 서비스 재개 시 다시 매핑.

## 5. 판정

```
- www.glycopharm.co.kr 현재 연결 대상: backend-siteguide-web (SiteGuide) — 오연결 확정
- 원인: LB host rule 와일드카드 ['*'] → siteguide-web (www.glycopharm 명시 규칙 부재)
- 코드 회귀 여부: 아니오 (저장소 코드는 제거 완료; 이건 순수 LB/Cloud Run 잔존 배선)
- 즉시 수정 가능 여부: 예(인프라) — 단 '*' 규칙 변경이라 영향범위 확인 후 승인 하 진행
- siteguide Cloud Run/LB 잔존: 예 (services 2 + backends 2 + NEG 2 + host rule 1)
```

## 6. 검증 명령 기록 (read-only)

```
gcloud run services list --region=asia-northeast3 --project=netureyoutube
gcloud compute url-maps describe o4o-global-lb --project=netureyoutube --format='json(hostRules)'
curl -s https://www.glycopharm.co.kr | grep -i '<title>'   # → SiteGuide
curl -s https://glycopharm.co.kr     | grep -i '<title>'   # → GlycoPharm
```

---

*Date: 2026-06-15 · read-only 인프라 CHECK · 코드/DB 무변경 · 원인=o4o-global-lb 와일드카드 host 규칙이 미매칭 호스트를 siteguide-web 으로 라우팅. www.glycopharm.co.kr 명시 규칙 부재. 수정은 인프라(LB host rule + Cloud Run/backend/NEG 정리) — 별도 승인 필요.*
