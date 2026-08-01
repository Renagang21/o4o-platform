# IR-O4O-ADMIN-SERVICE-MONITOR-SITES-TABLE-DISPOSITION-V1

> **성격**: 조사 전용 — 코드·migration·DB·API·배포 **변경 0건**
> **선행**: `docs/checks/WO-O4O-ADMIN-API-DOUBLE-PREFIX-RESIDUAL-FIX-V1-CHECK.md` (commit `951567cb3`, `a6275cd6c`)
> **일자**: 2026-08-01

---

## 1. 조사 기준

| 항목 | 값 |
|---|---|
| branch | `main` · 시작 HEAD `a6275cd6c` |
| 대상 | `/admin/services/overview` → `/api/v1/service/monitor/*` → `ServiceMonitorService` |
| 운영 DB read-only 확인 | ✅ Cloud SQL Auth Proxy, `SELECT`/`information_schema` 전용 |
| 코드·migration·DB·배포 변경 | **0** |

병렬 세션 산출물 미접촉. `pnpm-lock.yaml` 보호.

---

## 2. 현재 장애의 재현 구조

```
/admin/services/overview          (ServiceOverview.tsx, react-query 7개 queryFn)
  → GET /api/v1/service/monitor/{tenants,apps,themes,warnings,summary}
      → routes/service-monitor.routes.ts        (register-routes.ts:176 mount)
        → services/service-monitor.service.ts
          → AppDataSource.getRepository(Site)   ← modules/sites/site.entity.ts  @Entity('sites')
            → SELECT ... FROM sites
              → ✗ relation "sites" does not exist
```

운영 결과(선행 WO 실측):

| endpoint | HTTP | 사용자에게 보이는 것 |
|---|:--:|---|
| `summary` | **500** | 카드 미표시 |
| `tenants` · `apps` · `themes` · `warnings` | **200** | `No Services Found` — **정상 빈 상태처럼 보임** |

→ 화면의 "서비스 없음" 은 사실 **조회 실패**다.

---

## 3. `sites` 생명주기 조사

| 질문 | 결과 | 근거 |
|---|---|---|
| 생성 migration 이 있는가? | **없음** | `database/migrations`·`src/migrations` 전수 검색 0건 |
| Entity 는 존재하는가? | 있음 | `modules/sites/site.entity.ts` `@Entity('sites')` |
| DataSource 에 등록되었는가? | **등록됨** | `database/entities.ts:118, 647` |
| 최초 도입 | **2025-12-03** | `fe83e3896` "Complete Step 23 & Step 24 **Multi-Site Builder** with CMS Integration" |
| CRUD 라우트가 있는가? | 파일은 있으나 **mount 안 됨** | `modules/sites/sites.routes.ts` 존재. `register-routes.ts` 참조 0건, `git log -S"sites.routes"` **이력 0건 = 한 번도 mount된 적 없음** |
| **write 생산 경로가 있는가?** | **0건** | `siteRepository.{save,insert,create,update,delete}` 검색 0건 |
| 활성 read 소비처 | **ServiceMonitor 단 1곳** | `service-monitor.service.ts:124` |
| 운영 DB 실재 | **MISSING** | `information_schema` 확인 |

### 3-1. 동반 확인 — Multi-Site Builder 계열 전체가 미실현

| 테이블 | Entity | 운영 DB |
|---|---|:--:|
| `sites` | `modules/sites/site.entity.ts` | **없음** |
| `themes` | `entities/Theme.ts` | **없음** |
| `theme_installations` | `entities/Theme.ts:138` | **없음** |

`typeorm_migrations` 에서 관련 흔적은 `CreateSiteGuideTables1737330000000` 과
**`DropSiteGuideSchema20261113000000`** 뿐이다 — 별개의 "site guide" 스키마이며 **2026-11-13 에 폐기**됐다.

> **핵심**: `sites` 는 "운영 중 사라진 테이블" 이 아니라 **처음부터 프로덕션에 만들어진 적이 없는 설계 잔재**다.
> Multi-Site Builder(도메인 단위로 사이트를 scaffolding·배포하는 모델)는 코드만 남고 실현되지 않았다.

### 3-2. `Site` 모델이 전제한 세계

```ts
domain (unique) · template('default'|'ecommerce'|'forum') · apps: string[]
status: pending | scaffolding | deploying | ready | failed
config: { theme, layout, navigation, pages, variables }
```

**도메인마다 사이트를 찍어내는 프로비저닝 모델**이다. 현행 O4O 는 이 구조가 아니다.

---

## 4. 현행 SSOT 비교

운영 DB 실측 — `platform_services` **존재 · 6행**:

| code | name | service_type | status |
|---|---|---|---|
| `glycopharm` | GlycoPharm | tool | active |
| `kpa-society` | KPA Society | community | active |
| `k-cosmetics` | K-Cosmetics | extension | active |
| `neture` | Neture | community | active |
| `kpa` | KPA Product Domain | tool | active |
| `cosmetics` | Cosmetics Product Domain | tool | active |

migration `CreatePlatformServicesCatalog2026020500001` + `SeedPlatformServices2026020500002` **적용 완료**
(seed 2026-02-02, 추가 2건 2026-03-09).

| 개념 | `sites` 기대값 | 현행 후보 | Write 생산자 | Read 소비처 | SSOT 판정 |
|---|---|---|---|---|---|
| 서비스 | `Site` 행 | **`platform_services`** (6행) | `platform-service-catalog.service.ts`, `service-registry.service.ts` | 서비스 카탈로그·가입 흐름 | ✅ **현행 SSOT** |
| 서비스 식별자 | `domain` | **`platform_services.code`** (+ 전 플랫폼 `serviceKey`) | 위와 동일 | 광범위 | ✅ 현행 |
| 진입 URL | `domain` | `platform_services.entry_url` | 위와 동일 | 카탈로그 | ✅ 현행 |
| 조직/tenant | `Site` 1행 = 1 tenant | **`organizations`** (17행) | 조직 생성 흐름 | 광범위 | ✅ 현행 (단 의미 불일치, §7) |
| 설치 앱 | `apps: string[]` | **`app_registry`** (6행) + `appsCatalog.serviceGroups` | seed/migration | AppStore 화면 | ⚠️ **부분 대응** — app_registry 는 **플랫폼 전역**이라 서비스별 설치 개념이 없다 |
| 테마 | `config.theme` | **없음** | — | — | ❌ **현행 SSOT 부재** |
| 활성 상태 | `pending/scaffolding/deploying/ready/failed` | `platform_services.status` (`active`) | 카탈로그 | 카탈로그 | ⚠️ **의미 불일치** — 프로비저닝 진행 상태 vs 카탈로그 게시 상태 |
| 건강도·격리 점수 | Site 기반 산식 | **없음** | — | — | ❌ 부재 |

---

## 5. ServiceMonitor endpoint 판정

| Endpoint | 목적 | 참조 | `sites` 의존 | 오류 처리 | 운영 결과 | 거짓 200 |
|---|---|---|:--:|---|:--:|:--:|
| `GET /tenants` | tenant 목록 | `siteRepository.find` | ✅ | `catch → return []` (L142-144) | 200 빈 배열 | **예** |
| `GET /apps` | 앱 매트릭스 | 〃 | ✅ | `catch → return {빈 구조}` (L187-189) | 200 빈 구조 | **예** |
| `GET /themes` | 테마 상태 | 〃 | ✅ | `catch → return []` (L236-238) | 200 빈 배열 | **예** |
| `GET /warnings` | 경고 | 〃 | ✅ | (summary 계열 산식 공유) | 200 | **예** |
| `GET /summary` | 시스템 요약 | 〃 | ✅ | **`catch → throw`** (L365-367) | **500** | 아니오 |
| `GET /tenant/:id` | tenant 상세 | 〃 | ✅ | catch (L385) | 미검증 | 미확정 |
| `POST /validate` | 검증 실행 | 〃 | ✅ | `catch → return {결과객체}` (L428-430) | 200 | **예** |
| `GET /report` | 리포트 | 〃 | ✅ | 미검증 | 미검증 | 미확정 |

**8개 endpoint 전부 `sites` 단일 의존**이다. 대체 데이터 소스를 쓰는 endpoint 는 하나도 없다.

문제를 축으로 분리하면:

1. **데이터 소스가 미실현 구형 모델** — 8/8
2. **서버 오류를 빈 결과로 치환** — 최소 5개 endpoint
3. **프런트가 실패/정상빈값을 구분하지 않음** — `queryFn` 에 `try/catch`·오류 UI 없음 → `No Services Found`
4. 실제 0건인 경우와 구분 불가

---

## 6. 영향 범위

| 소비처 | 경로 | 활성 | 영향 | 분류 |
|---|---|:--:|---|---|
| 서비스 현황 화면 | `/admin/services/overview`, `/admin/services` | ✅ (menu-less) | 전체 무력 | **ACTIVE** |
| `sites.routes.ts` CRUD | mount 안 됨 | ❌ | 없음 | **DORMANT** |
| `Site` entity 등록 | `entities.ts:647` | ✅ 등록 | 테이블 부재라 조회 시 예외 | **LEGACY** |
| `Theme` entity | `entities/Theme.ts` | 등록 여부 확인, 테이블 없음 | 동일 계열 | **LEGACY** |
| 배치·알림·외부 API | 검색 결과 없음 | — | 없음 | **UNKNOWN(미발견)** |

→ **`sites` 부재로 실제 피해를 보는 활성 기능은 `/admin/services/overview` 하나뿐**이다.
다른 화면·배치·알림에서 `Site` 를 쓰는 곳은 발견되지 않았다.

---

## 7. 최종 처분 — **D. `REDESIGN_MONITORING_CONTRACT`**

### 선택 근거

1. **B(RESTORE_SITES_TABLE) 기각** — `sites` 는 누락된 필수 테이블이 아니다.
   생성 migration 이 애초에 없었고, **write 생산 경로가 0건**이라 테이블을 만들어도 **영구히 빈 테이블**이다.
   CRUD 라우트도 한 번도 mount 된 적이 없다. 복원은 문제를 500 에서 "빈 목록" 으로 바꿀 뿐이다.
2. **A(REMAP_TO_CURRENT_SSOT) 부분 기각** — 현행 SSOT(`platform_services`)로 옮길 수 있는 것은
   **tenants·summary 의 일부**뿐이다. 다음은 **대응 SSOT 가 아예 없다**:
   - `themes` — `themes`/`theme_installations` 테이블 자체가 프로덕션에 없다
   - 서비스별 설치 앱 — `app_registry` 는 플랫폼 전역이라 서비스 축이 없다
   - 건강도·격리 점수 — Multi-Site Builder 의 `status(pending/scaffolding/deploying/ready/failed)` 를
     전제한 산식이라 `platform_services.status(active)` 로 치환하면 **무의미한 숫자**가 나온다
   근거 없이 매핑하면 "정상처럼 보이는 틀린 지표" 가 되어 현재보다 나쁘다.
3. **C(RETIRE) 미채택** — 서비스 현황을 대체하는 화면이 있는지 확인하지 못했다(`/admin/ops/metrics` 는 미조사).
   폐기 판단에는 대체 수단 확인이 선행되어야 한다.
4. **D 채택** — 현행 SSOT 는 존재하나 기존 응답 계약에 직접 매핑할 수 없다.
   **모니터링 지표의 정의·범위를 제품 차원에서 다시 정하는 것**이 맞다.

### 결론

| 항목 | 판정 |
|---|---|
| `sites` 테이블 복원 | **불필요** |
| migration 필요 | **없음** (본 처분에서는) |
| DB 데이터 이관 | **불필요** (원본 데이터가 존재한 적 없음) |
| ServiceMonitor 데이터 소스 | **현행 SSOT 기준으로 재설계 필요** |
| `Site`/`Theme` entity 등록 | 별도 정리 검토 대상(미실현 모델이 DataSource 에 등록되어 있음) |

---

## 8. 오류 처리 처분 (데이터 모델과 별개 축)

| # | 결정 |
|---|---|
| 1 | **DB/schema/query 오류를 빈 배열·0·정상 상태로 반환하는 것을 금지**한다. 현재 5개 endpoint 가 위반. |
| 2 | 정상 빈 상태 = 쿼리 성공 + 결과 0건. 시스템 실패 = 예외·연결 실패·스키마 오류. **둘을 절대 합치지 않는다.** |
| 3 | API 계약: 조회 실패는 **5xx + 일반화된 코드**(내부 relation·SQL 미노출). 정상 0건은 200 + 빈 배열. |
| 4 | 프런트는 **loading / 정상 데이터 / 정상 0건 / 부분 실패 / 전체 실패** 5상태를 구분한다. |
| 5 | **부분 실패는 화면 전체를 막지 않는다** — 실패한 카드에만 오류와 재시도를 표시한다. |
| 6 | 운영자에게 "데이터 없음" 과 "조회 실패" 를 **다른 문구·다른 시각 표현**으로 보여준다. 현재의 `No Services Found` 는 후자를 전자로 위장한다. |

> 이번 IR 은 요구사항만 정의한다. 구현하지 않았다.

---

## 9. 후속 WO 분리안

```text
1) WO-…-SERVICE-MONITOR-METRIC-CONTRACT-DESIGN   [제품 결정 선행]
   목표: 서비스 현황이 보여줄 지표·범위·정의 확정
        (현행 SSOT: platform_services / organizations / app_registry 기준)
   산출: 지표 정의서 + API 응답 계약(안)
   독립 실행: 아니오 (제품 결정 필요)

2) WO-…-SERVICE-MONITOR-ERROR-CONTRACT-FIX       [독립 실행 가능]
   목표: 거짓 200 제거 — 5개 endpoint 의 catch→빈결과 치환을 5xx 전파로 교정
   범위: service-monitor.service.ts (백엔드 단독)
   선행: 없음. 데이터 소스 재설계와 무관하게 먼저 가능
   효과: 최소한 "실패를 실패로" 보이게 만든다

3) WO-…-SERVICE-OVERVIEW-EMPTY-VS-ERROR-UI       [2 이후]
   목표: 프런트 5상태 구분 + 카드별 부분 실패 표시
   범위: ServiceOverview.tsx

4) WO-…-SERVICE-MONITOR-DATASOURCE-REMAP         [1 이후]
   목표: 확정된 계약대로 데이터 소스를 현행 SSOT 로 교체
   범위: service-monitor.service.ts

5) WO-…-UNREALIZED-ENTITY-REGISTRATION-CLEANUP   [별도 검토]
   목표: Site·Theme 등 프로덕션 테이블이 없는 entity 의 DataSource 등록 정리
   주의: 다른 미실현 entity 도 함께 조사해야 함 (범위 확대 주의)
```

**권장 순서: 2 → 1 → 4 → 3 → 5**
(오류를 먼저 정직하게 만들고, 지표를 정한 뒤, 소스를 갈아끼우고, UI 를 맞춘다.)

---

## 10. 최종 상태

| 항목 | 값 |
|---|---|
| `/admin/services/overview` | **HOLD** |
| 메뉴 연결 가능 여부 | **불가** — 데이터 소스 재설계 전까지 연결 금지 |
| 이유 | 이중 프리픽스는 해소됐으나 참조 모델 자체가 미실현이라 **어떤 지표도 표시할 수 없다** |

> 선행 CHECK 의 `READY_AFTER_FIX` 에서 **`HOLD` 로 하향**한다.
> "수정하면 된다" 가 아니라 "무엇을 보여줄지부터 정해야 한다" 가 실제 상태이기 때문이다.

### 미확정 사항

- `GET /tenant/:id`, `GET /report` 의 운영 동작 미검증(화면에서 호출되지 않아 확인 못 함)
- `/admin/ops/metrics` 가 서비스 현황을 대체할 수 있는지 미조사 → C(RETIRE) 판단 보류
- `Theme` entity 의 DataSource 등록 여부 미확인(테이블 부재만 확인)
- 미실현 entity 가 `Site`·`Theme` 외에 더 있는지 미조사

---

## 11. 검증

| # | 항목 | 결과 |
|---|---|:--:|
| 1 | `sites` 참조 전수 검색 | ✅ Entity 1 · 소비처 2(1개는 dead) |
| 2 | Entity·migration·쿼리 정합성 | ✅ migration 0건 확인 |
| 3 | endpoint 전수 목록 | ✅ 8개 |
| 4 | 각 endpoint 오류 처리 | ✅ §5 |
| 5 | 프런트 loading/error/empty | ✅ 구분 없음 확인 |
| 6 | 현행 SSOT 생산·소비 경로 | ✅ §4 |
| 7 | 운영 DB read-only 사실 확인 | ✅ |
| 8 | 소스·DB 변경 | **0** |
| 9 | 문서 외 diff | **0** |

*조사 전용 · 코드 0 · migration 0 · DB write 0 · 배포 없음*
