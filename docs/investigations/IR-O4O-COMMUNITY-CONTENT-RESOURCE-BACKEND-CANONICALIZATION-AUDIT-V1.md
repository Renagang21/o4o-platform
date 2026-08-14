# IR-O4O-COMMUNITY-CONTENT-RESOURCE-BACKEND-CANONICALIZATION-AUDIT-V1

**커뮤니티 콘텐츠·자료실 backend 전수조사 및 canonicalization 방향 확정**

- 근거 WO: `WO-O4O-COMMUNITY-CONTENT-RESOURCE-BACKEND-CANONICALIZATION-AUDIT-V1`
- 선행 census: `IR-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-V1`
- 브랜치: `work/commonization-community` · 기준 commit `3adc6d729`
- 성격: **read-only 감사** — 코드 변경 0

---

## 0. 결론 요약

**판정 B — 물리 테이블 유지 + backend Core 공통화**를 주안으로 확정한다.

| 근거 | 내용 |
|---|---|
| 로직 동일성 | GlycoPharm ↔ K-Cosmetics `resources.controller.ts` **557줄 / 557줄, 기계 diff 26줄이 전부 주석·로그 접두어**. SQL·권한·DTO·검증 차이 **0** |
| KPA 대응 | 동일 6+3 handler 가 동일 권한 모델(owner-or-operator 403)·동일 가시성 규칙으로 존재. 차이는 파라미터·audit log·KPA 전용 handler 4종 |
| **통합 차단 요인** | 3원장 모두 **`service_key`/`organization_id` 컬럼이 없다**. 서비스 격리가 **물리 테이블 분리에만 의존**한다 → 테이블 통합 시 격리 메커니즘 자체가 사라진다 |
| Freeze | F4(HUB 3축)·F5(Content Stable) 는 **HUB/CMS/Signage** 대상이며 `{svc}_contents` 3원장을 대상으로 하지 않는다 → Freeze 위반 아님 |
| migration | Core 공통화는 migration **불필요**. 테이블 통합은 migration + 격리 계약 신설이 **필수** |

즉 **회수는 크고 위험은 0인 부분(Core)** 과 **위험이 큰 부분(테이블 통합)** 이 깨끗하게 분리된다.
후속은 Core 공통화 1건만 진행하고, 테이블 통합은 그 뒤에 독립 판단한다.

---

## 1. 조사 방법 · 모집단

문서 목록이 아니라 코드·schema 에서 모집단을 확정했다.

| 단계 | 대상 |
|---|---|
| 1 | `apps/api-server/src` 전역 `*content*` · `*resource*` 파일 전수 나열 (128건) → 커뮤니티 축 필터 |
| 2 | route mount (`bootstrap/register-routes.ts`) · 서비스별 `*.routes.ts` 의 `/contents` · `/operator/resources` mount |
| 3 | entity 3종 + `CmsContent` + physical DDL·후속 migration 전수 추적 |
| 4 | 프런트 API client 6종 → backend route 역추적 |
| 5 | `hub-content.service.ts` 가 실제로 읽는 원장 전수 확인 (F4/F5 적용 범위 판정) |
| 6 | Freeze 문서 2종(F4·F5) 의 **선언 범위** 원문 확인 |

---

## 2. 원장(entity/table) inventory

| # | 서비스 | entity | physical table | 생성 주체 | 격리 축 | 소비 화면 |
|---|---|---|---|---|---|---|
| L1 | KPA-Society | `KpaContent` | `kpa_contents` | 회원 + 운영자 | **테이블 분리** (키 컬럼 없음) | `/content*`, `/resources`, `/operator/resources` |
| L2 | GlycoPharm | `GlycopharmContent` | `glycopharm_contents` | 회원 + 운영자 | **테이블 분리** | `/content*`, `/resources`, `/operator/resources` |
| L3 | K-Cosmetics | `CosmeticsContent` | `cosmetics_contents` | 회원 + 운영자 | **테이블 분리** | `/content*`, `/resources`, `/operator/resources` |
| L4 | Neture(+플랫폼) | `CmsContent` | `cms_contents` | **운영자 전용** | `serviceKey` + `organizationId` 컬럼 | `/content`(라이브러리), `/notices`, `/resources` |
| L5 | Pharmacy-Hub | — | `kpa_store_contents` | 매장 | `organizationId`(매장) | `/store-owner/content` |

### 2-1. 원장 의미 비교 (WO §3 표)

| 항목 | L1 `kpa_contents` | L2 `glycopharm_contents` | L3 `cosmetics_contents` | L4 `cms_contents` |
|---|---|---|---|---|
| PK | `id` uuid | 동일 | 동일 | 동일 |
| service key | **없음** | **없음** | **없음** | `"serviceKey"` varchar(50) |
| org key | **없음** | **없음** | **없음** | `"organizationId"` uuid |
| owner | `created_by` uuid | 동일(+`updated_by`) | 동일(+`updated_by`) | `"createdBy"` uuid |
| 본문 | `blocks` jsonb + `body` text | 동일 | 동일 | `body` text (blocks 없음) |
| 콘텐츠 타입 | **`content_type` varchar(30)** `information`\|`participation` | **없음** | **없음** | `type` varchar(50) |
| 하위 분류 | `sub_type` (자료실=`resource`) | 동일 | 동일 | 없음 |
| visibility | `status` `draft`\|`published`\|`private` | 동일 | 동일 | `status` + `visibilityScope` |
| lifecycle | soft delete `is_deleted` | 동일 | 동일 | `publishedAt`/`expiresAt` |
| 첨부 | `source_url` + `source_file_name` (단일) | 동일 | 동일 | `attachments` jsonb (다중) |
| 카테고리 | `category` varchar (FK 없음) | 동일 | 동일 | 없음 |
| 재사용 정책 | `reusable_policy` | 동일 | 동일 | 없음 |
| 통계 | `like_count`/`view_count` | 동일 | 동일 | 없음 |
| 노출 제어 | 없음 | 없음 | 없음 | `sortOrder`/`isPinned`/`isOperatorPicked` |
| 컬럼 표기 | snake_case | 동일 | 동일 | **camelCase(따옴표)** |

**DDL 기계 대조**: `glycopharm_contents` ↔ `cosmetics_contents` CREATE 문은 테이블명만 치환하면 **완전 동일**했다.

### 2-2. 원장 판정

| 원장 | 판정 | 사유 |
|---|:--:|---|
| L1 · L2 · L3 | **A 후보이나 B 로 수렴** | 업무 의미·lifecycle·권한 동일. 그러나 격리가 테이블 분리에만 의존 → 통합 시 격리 재설계 필요 (§6) |
| L4 `cms_contents` | **C — SERVICE_SPECIFIC** | 운영자 발행 CMS. 생성 주체·모델(publish/expire/pin/sortOrder)·컬럼 표기·격리 축이 다르다. **F5 Stable 범위 안**이기도 하다 |
| L5 `kpa_store_contents` | **C — 축이 다름** | 매장 실행 자산(Store Production Material, CLAUDE.md §5). 커뮤니티 자료실이 아니다 |

### 2-3. entity ↔ physical table drift (발견)

`KpaContent` 엔티티 클래스가 실제 테이블보다 **6개 컬럼 부족**하다.

| 컬럼 | 물리 테이블 | 엔티티 클래스 |
|---|:--:|:--:|
| `body` · `content_type` · `sub_type` · `like_count` · `view_count` · `author_name` | 있음 (`20260422300000-KpaContentHubCommunity`) | **없음** |

현재는 KPA 라우터가 전부 raw SQL 이라 런타임 영향이 없다. 그러나 **Core 공통화 때 TypeORM repository 로 접근하면 즉시 문제**가 된다 → 후속 WO 의 선행 항목.

---

## 3. Freeze / 기존 계약

### 3-1. 실제 선언 범위 (원문 확인, 추정 아님)

**F5 `CONTENT-STABLE-DECLARATION-V1` §2 Stable 범위 9항목**

```text
HubProducer / HubVisibility / HubSourceDomain 모델
Producer↔authorRole · Producer↔source 매핑 (hub-content.service.ts)
HubContentQueryService
ServiceKey 격리 정책
scope='global' Public 보호 (Signage WHERE)
CMS visibilityScope 필터 (CMS WHERE)
```

**F4 `PLATFORM-CONTENT-POLICY-V1`**: "HUB 에 노출되는 모든 콘텐츠" 의 3축(Producer/Visibility/ServiceScope) 모델.

### 3-2. 3원장이 F4/F5 대상인가 — **아니다**

`hub-content.service.ts` 가 실제로 읽는 테이블을 전수 확인했다.

```text
store_blog_posts · signage_media · signage_playlists · store_pops
store_tablet_screen_sets · store_tablet_screen_blocks · store_videos · operator_qr_templates
```

`kpa_contents` / `glycopharm_contents` / `cosmetics_contents` 참조 **0건**.
→ 3원장은 HUB 집계에 들어가지 않으므로 **F4 3축 모델의 적용 대상이 아니다.**
→ F5 Stable 9항목에도 이름이 없다.

| 항목 | 판정 |
|---|---|
| Freeze 대상 | `cms_contents`(L4) 의 visibilityScope 필터 · HUB 집계 계층 · ServiceKey 격리 정책 |
| 금지되는 변경 | HUB 3축 의미 변경 · `GET /api/v1/hub/contents` 계약 변경 · CMS visibilityScope 필터 제거 |
| 허용되는 additive 변경 | 버그 수정 · 성능 개선 · 새 sourceDomain 추가(패턴 준수) · 테스트/문서 |
| L1~L3 table migration 가능 여부 | **Freeze 관점에서는 가능**. 단 §6 격리 사유로 별도 위험 |
| API facade / common service 추출 | **가능** — Freeze 무관. L1~L3 은 Stable 선언 밖 |

> ⚠️ 단, **후속에서 L1~L3 를 HUB 에 노출시키는 순간 F4/F5 대상으로 편입**된다. Core 공통화 자체는
> HUB 노출을 만들지 않으므로 이번 방향에는 해당 없음.

---

## 4. Backend duplication 실측

### 4-1. GlycoPharm ↔ K-Cosmetics — 기계 diff

서비스 토큰(`glycopharm`/`cosmetics` 및 대소문자 변형)을 정규화한 뒤 `diff`.

```text
파일        : routes/{glycopharm,cosmetics}/controllers/resources.controller.ts
LOC         : 557 / 557
diff 라인   : 26
  주석 3처(헤더 2 + WO 참조 1)
  console.error 로그 접두어 10처  ([Xx] ↔ [K-Xx])
  로직·SQL·권한·DTO·검증 차이 : 0
```

**census 판정("약 557줄 동일") 재확인.** 실제로는 *로그 문자열 외 100% 동일*이다.

### 4-2. handler inventory

| 그룹 | GP | KCos | KPA | 판정 |
|---|:--:|:--:|:--:|:--:|
| G1 contents list `GET /` | ✔ | ✔ | ✔ | `PARAMETERIZABLE` |
| G2 contents detail `GET /:id` | ✔ | ✔ | ✔ | `IDENTICAL` |
| G3 contents create `POST /` | ✔ | ✔ | ✔ | `DATA_MODEL_DIFFERENT` |
| G4 contents update `PATCH /:id` | ✔ | ✔ | ✔ | `DATA_MODEL_DIFFERENT` |
| G5 contents delete `DELETE /:id` | ✔ | ✔ | ✔ | `PARAMETERIZABLE` |
| G6 view count `POST /:id/view` | ✔ | ✔ | ✔ | `IDENTICAL` |
| G7 recommend `POST /:id/recommend` | — | — | ✔ | `UNIQUE` |
| G8 AI summarize | — | — | ✔ | `UNIQUE` |
| G9 AI extract | — | — | ✔ | `UNIQUE` |
| G10 AI tag | — | — | ✔ | `UNIQUE` |
| G11 operator list `GET /operator/resources` | ✔ | ✔ | ✔ | `PARAMETERIZABLE` |
| G12 operator create `POST /operator/resources` | ✔ | ✔ | **—** | `UNIQUE` |
| G13 operator status `PATCH /:id/status` | ✔ | ✔ | ✔ | `PARAMETERIZABLE` |
| G14 operator delete `DELETE /:id` | ✔ | ✔ | ✔ | `PARAMETERIZABLE` |

판정 근거:

- **`IDENTICAL`(G2·G6)** — 조회/조회수 증가. 파라미터·권한·SQL 모양 동일.
- **`PARAMETERIZABLE`(G1·G5·G11·G13·G14)** — 가시성 규칙 코어가 동일하다:
  `my=true → created_by 일치` / 비로그인 → `status='published'` / 로그인 → `published OR 본인`.
  차이는 **필터 집합**(KPA `content_type`·`status=all` 운영자 확장 ↔ GP/KCos `usage_type`·`source_type`)과
  **KPA 의 `writeAuditLog` 호출**뿐 — 둘 다 옵션 주입으로 흡수 가능.
- **`DATA_MODEL_DIFFERENT`(G3·G4)** — KPA 만 `content_type varchar(30) NOT NULL DEFAULT 'information'` 을
  갖고 생성/수정 payload 에서 처리한다. GP/KCos 에는 **물리 컬럼 자체가 없다**. 로직이 아니라 스키마 차이다.
- **`POLICY_DIFFERENT` 0** — 3서비스 모두 write 권한이 `owner || operator/admin` → 403, 동일 error code
  (`FORBIDDEN`/`NOT_FOUND`), 동일 soft delete. **권한 정책 차이가 없다.**
- **`UNIQUE`(G7~G10·G12)** — KPA 전용 추천·AI 3종 / GP·KCos 전용 운영자 자료 직접 생성.

### 4-3. 중복 LOC 추정

| 구분 | LOC |
|---:|---:|
| GP `resources.controller.ts` | 557 |
| KCos `resources.controller.ts` | 557 |
| KPA `kpa.routes.ts` 내 contents + operator resources 인라인 | 약 700 (L1519~L2233) |
| **합계** | **약 1,814** |
| 공통화 가능(G1~G6·G11·G13·G14 = 9그룹) | **약 1,100~1,250** |
| 서비스에 남을 부분(UNIQUE 5그룹 + 배선) | 약 550~700 |

> KPA 인라인 구간은 AI handler 3종과 audit log 를 포함하므로 GP/KCos 대비 두껍다.
> 정확한 분리 LOC 은 후속 WO 의 추출 설계 단계에서 확정한다.

---

## 5. Frontend ↔ backend 연결

| 서비스 | 화면 | API client | backend route | 원장 |
|---|---|---|---|---|
| KPA | `/content*`, `/resources` | `api/content.ts`, `api/resources.ts` → `'/contents'` (base `/api/v1/kpa`) | `/api/v1/kpa/contents` | L1 |
| GlycoPharm | `/content*`, `/resources` | `api/content.ts`, `api/resources.ts` → `'/glycopharm/contents'` | `/api/v1/glycopharm/contents` | L2 |
| K-Cosmetics | `/content*`, `/resources` | `api/content.ts`, `api/resources.ts` → `'/cosmetics/contents'` | `/api/v1/cosmetics/contents` | L3 |
| Neture | `/content`, `/resources`, `/notices` | `lib/api/content.ts` → `'/neture/content'` | `/api/v1/neture/content` | **L4** |
| Pharmacy-Hub | `/store-owner/content` | store client | `/store-owner/content` | **L5** |

관측:

- **동일 화면인데 API 만 다른 경우** — GP/KCos 콘텐츠 목록/상세/작성. 화면도 이미 census 에서 복제로 판정됐다.
- **동일 API 인데 View 가 다른 경우** — 해당 없음.
- **shared UI 존재** — `CommunityContentWriteShell` / `CommunityContentDetailView` / `CommunityContentSearchBar`
  (KPA·GP·KCos 3서비스 소비), `ResourcesHubTemplate`(4서비스).
  → **View 는 이미 상당 부분 공통, backend 는 전혀 공통이 아니다.** census 의 "backend duplication 이 본체" 판정 재확인.

> **View 가 같다고 원장을 합쳐도 된다고 추론하지 않았다.** Neture 는 `ResourcesHubTemplate`(공통 View)을
> 쓰면서도 원장은 L4(cms_contents)로 전혀 다르다 — View 공통성은 원장 통합의 근거가 되지 못한다는 반례다.

---

## 6. Service boundary

### 6-1. 격리가 어디서 적용되는가

| 원장 | read 격리 | write 격리 |
|---|---|---|
| L1·L2·L3 | **물리 테이블 분리** (쿼리에 서비스 조건 없음 — 있을 수 없다, 컬럼이 없으므로) | 동일 |
| L4 `cms_contents` | `"serviceKey"` WHERE + `visibilityScope` (F5 Stable) | `serviceKey` 매칭 role 검사 (`cms-content-mutation.handler.ts`) |

### 6-2. 현재 결함 — 없음 (S1급 신규 발견 0)

- 프런트 3서비스 모두 **서비스 prefix route** 만 호출한다 (`/api/v1/{kpa,glycopharm,cosmetics}/contents`).
  포럼에서 발견됐던 generic 무필터 route 소비(S1) 같은 패턴은 이 축에 **없다.**
- `serviceCode` 를 클라이언트 쿼리로 받는 지점 없음.
- 컨트롤러마다 다른 service key 변환 없음 (애초에 변환이 없다).

### 6-3. canonicalization 위험 — **이번 감사의 핵심**

> **L1~L3 의 서비스 경계는 "물리 테이블이 다르다"는 사실 그 자체다.**
> 세 테이블을 하나로 합치면 **경계를 만들던 유일한 장치가 사라진다.**

canonical table 통합을 하려면 최소한 다음이 함께 필요하다.

1. `service_key` 컬럼 신설 + 백필 (3테이블 → 1테이블 데이터 이관)
2. **모든** read/write 쿼리에 `service_key` 조건 강제 (누락 1곳이면 서비스 간 콘텐츠 노출)
3. 운영자 route 4종의 서비스 스코프 재검증
4. 롤백 계약 (데이터 이관 후 되돌리기)

이는 migration + 보안 계약 신설이며 **본 WO 의 제외 범위**다.
반면 **Core 공통화는 테이블을 그대로 두므로 이 위험이 0** 이다 — 각 서비스가 자기 테이블명을
주입하는 형태가 되어 경계가 오히려 **명시적으로 코드에 드러난다.**

---

## 7. A/B/C 최종 판정

### 주안: **판정 B — 물리 테이블 유지 + backend Core 공통화**

| 조건 (WO §8-B) | 충족 |
|---|:--:|
| physical/data semantics 차이 존재 | ✔ (`content_type` 유무 · `updated_by` 유무 · 격리 축 부재) |
| controller/service workflow 상당 부분 동일 | ✔ (GP↔KCos 100%, KPA 파라미터화 가능 — 9/14 그룹) |
| table migration 이 부적절 | ✔ (격리 재설계 필요 — §6-3) |

### 기능군별 분리 (A/B/C 혼합)

| 기능군 | 원장 | 판정 | 처리 |
|---|---|:--:|---|
| 회원 콘텐츠 CRUD + 자료실 (G1~G6) | L1·L2·L3 | **B** | 서비스 파라미터 주입형 공통 Core 추출 |
| 운영자 자료 관리 (G11·G13·G14) | L1·L2·L3 | **B** | 동일 Core 에 operator 모듈로 포함 |
| 운영자 자료 직접 생성 (G12) | L2·L3 | **C** | GP/KCos 전용 유지 (KPA 에 신설 금지) |
| KPA 추천·AI 3종 (G7~G10) | L1 | **C** | KPA 전용 유지 |
| Neture 콘텐츠 라이브러리 | L4 | **C** | `cms_contents` — 운영자 CMS. F5 Stable. 통합 금지 |
| Pharmacy-Hub 매장 콘텐츠 | L5 | **C** | 매장 실행 자산 축 — 커뮤니티 아님 |
| canonical table 통합 | L1·L2·L3 | **A 보류** | §6-3 선결 조건 충족 시 별도 판단 |

### 판정 A 를 지금 하지 않는 이유

원장 의미·lifecycle·권한은 통합 가능 수준으로 동일하다. 그러나 **격리 장치가 테이블 그 자체**라
통합은 "리팩터링" 이 아니라 **보안 경계 재설계 + 데이터 이관**이다. Core 공통화로 회수의 대부분
(약 1,100~1,250 LOC, 중복 3벌 → 1벌)을 **migration 없이** 얻을 수 있으므로, 위험을 나중으로 미루는 것이
순서상 옳다. Core 공통화가 끝나면 쿼리 진입점이 한 곳으로 모여 **테이블 통합 시 조건 누락 위험도 크게 줄어든다.**

---

## 8. 후속 구현 범위 (제안)

```text
WO-O4O-COMMUNITY-CONTENT-RESOURCE-BACKEND-CORE-COMMONIZATION-V1
```

| 항목 | 내용 |
|---|---|
| 범위 | G1~G6 · G11 · G13 · G14 (9 handler 그룹) 을 테이블명·필터셋·audit 훅을 주입받는 공통 factory 로 추출 |
| 유지 | 물리 테이블 3개 · route path 3벌 · UNIQUE 5그룹 · 권한 정책 |
| 선행 | `KpaContent` 엔티티 ↔ 물리 테이블 drift 6컬럼 해소 (§2-3) — raw SQL 유지 시 불필요, repository 전환 시 필수 |
| migration | **불필요** |
| 검증 | GP↔KCos 응답 동등성 · KPA 회귀(추천·AI·audit log) · 서비스 간 조회 격리 |
| 비범위 | 테이블 통합 · `service_key` 신설 · L4/L5 · frontend |

---

## 9. 완료 판정 숫자 (WO §12)

```text
조사 기능: 14
조사 backend handler: 35
조사 entity/table: 5
IDENTICAL: 2
PARAMETERIZABLE: 5
POLICY_DIFFERENT: 0
DATA_MODEL_DIFFERENT: 2
UNIQUE: 5
미조사: 0
```

- 조사 기능 14 = handler 그룹 G1~G14
- 조사 handler 35 = GP 10 + KCos 10 + KPA 13 + Neture 2
- 조사 entity/table 5 = L1~L5
- 판정 합 2+5+0+2+5 = **14** = 기능 수 ✔

### 9-1. census 셀 재판정 (6분류 · 새 라벨 없음)

| census # | 기능 | KPA | KCos | NET | GP | PH |
|---|---|:--:|:--:|:--:|:--:|:--:|
| F10 | 콘텐츠 목록 | `VIEW_DUPLICATED` | `VIEW_DUPLICATED` | `SERVICE_SPECIFIC` | `VIEW_DUPLICATED` | `NOT_IMPLEMENTED` |
| F11 | 콘텐츠 상세 | `FULLY_COMMON` | `FULLY_COMMON` | `SERVICE_SPECIFIC` | `FULLY_COMMON` | `NOT_IMPLEMENTED` |
| F12 | 콘텐츠 작성·수정 | `FULLY_COMMON` | `FULLY_COMMON` | `NOT_IMPLEMENTED` | `FULLY_COMMON` | `NOT_IMPLEMENTED` |
| F13 | 콘텐츠 삭제 | `CORE_ONLY` | `NOT_IMPLEMENTED` | `NOT_IMPLEMENTED` | `NOT_IMPLEMENTED` | `NOT_IMPLEMENTED` |
| F14 | 콘텐츠 섹션 분리 | `SERVICE_SPECIFIC` | `NOT_IMPLEMENTED` | `NOT_IMPLEMENTED` | `NOT_IMPLEMENTED` | `NOT_IMPLEMENTED` |
| F21 | 자료실 목록·상세 | `FULLY_COMMON` | `FULLY_COMMON` | `FULLY_COMMON` | `FULLY_COMMON` | `OUT_OF_SCOPE` |
| F22 | 회원 자료 등록·수정 | `SERVICE_SPECIFIC` | `NOT_IMPLEMENTED` | `NOT_IMPLEMENTED` | `NOT_IMPLEMENTED` | `NOT_IMPLEMENTED` |

**census 대비 변경 0.** 이번 감사는 View 라벨을 바꾸지 않는다 — 발견의 본체가 **라벨에 반영되지 않는
backend 중복**(모든 F10~F14·F21 셀 뒤에 3벌 복제 backend 가 깔려 있다)이기 때문이다.
census §1-3 규칙 6 의 "`FULLY_COMMON` 이어도 백엔드=DUP 표기" 가 정확히 이 상황을 가리킨다.

### 9-2. census 정정 사항

| census 서술 | 정정 |
|---|---|
| "`resources.controller.ts` 는 557줄 라인 단위 동일" | **정확.** 다만 diff 26줄이 존재하며 **전부 주석·로그 접두어**임을 실측으로 특정 |
| "KPA 는 같은 계약을 `kpa.routes.ts` 인라인 ~550줄로 또 갖고 있다" | **약 700줄**(L1519~L2233)로 정정. KPA 전용 AI 3종·추천·audit log 포함 |
| "물리 테이블 3개" | **정확.** 추가로 **3원장 모두 service/org 키 컬럼이 없다**는 사실을 확인 (통합 판단의 결정 요인) |

---

## 10. 검증 (WO §10)

| 항목 | 결과 |
|---|---|
| 대상 route/controller/entity 전수 대조 | 완료 (128 후보 → 커뮤니티 축 확정) |
| physical table / migration 추적 | 완료 (`kpa_contents` 6 migration · GP 1+1 · KCos 1+1 · cms 다수) |
| GP/KCos controller 기계 diff | 완료 — 26줄, 전부 주석·로그 |
| KPA 대응 handler 기능 매핑 | 완료 — 14 그룹 판정 |
| API client → backend route 역추적 | 완료 — 6 client / 5 원장 |
| shared export 역방향 소비 확인 | 완료 (`CommunityContent*` 3서비스 · `ResourcesHubTemplate` 4서비스) |
| 표본 코드 역추적 | 완료 — 아래 10건 |
| read-only DB schema 확인 | **미실측** (사유 §11) |

### 10-1. 표본 10건 역추적

| # | 표본 | 확인 |
|---|---|---|
| 1 | GP `api/resources.ts` → `/glycopharm/contents?sub_type=resource` → `glycopharm.routes.ts:576` `createGlycopharmContentsRouter` → `glycopharm_contents` | ✔ |
| 2 | KCos 동일 경로 → `cosmetics.routes.ts:269` → `cosmetics_contents` | ✔ |
| 3 | KPA `api/content.ts` → `apiClient('/api/v1/kpa')` + `/contents` → `kpa.routes.ts:2063` `contentRouter` → `kpa_contents` | ✔ |
| 4 | GP↔KCos `resources.controller.ts` 정규화 diff = 26줄(주석·로그) | ✔ |
| 5 | `kpa_contents` `content_type` 컬럼 존재(`20260422300000`) / GP·KCos DDL 부재 | ✔ |
| 6 | `KpaContent` 엔티티에 `content_type`·`body`·`sub_type`·`like_count`·`view_count`·`author_name` 선언 없음 | ✔ |
| 7 | `hub-content.service.ts` 의 FROM 8종에 `{svc}_contents` 없음 | ✔ |
| 8 | F5 §2 Stable 9항목에 `{svc}_contents` 없음 | ✔ |
| 9 | 3원장 migration 전체에 `service_key`/`organization_id` 0건 | ✔ |
| 10 | Neture `/content` → `neture.controller.ts:126` → `cms_contents`(`serviceKey='neture'`) | ✔ |

---

## 11. 미실측 · 불확실성

| 항목 | 사유 |
|---|---|
| **프로덕션 DB schema/row 실측** (테이블 존재·row 수·null key 분포) | Cloud SQL Auth Proxy 바이너리 미설치. `gcloud sql connect` 는 인스턴스 authorized networks 를 변경하므로 read-only 감사 범위에서 실행하지 않았다 (WO §10 단서 적용) |
| KPA 인라인 구간 LOC "약 700" | 라인 범위(L1519~L2233) 기준 추정. AI/추천 handler 경계가 인접해 정확한 분리 LOC 은 추출 설계 시 확정 |
| G2·G6 `IDENTICAL` 판정 | GP↔KCos 는 기계 diff 로 확정. KPA 는 **권한·쿼리 모양 대조**로 판정했고 라인 단위 diff 는 하지 않았다 (파일 구조가 인라인 라우터라 직접 diff 불가) |
| `cms_contents` 가 HUB `sourceDomain:'cms'` 에 어떻게 연결되는지 | `hub-content.service.ts` 의 FROM 목록에 `cms_contents` 가 없어 매핑 경로를 특정하지 못했다. **본 감사 결론에는 영향 없음**(3원장 비포함이 확정적이므로) |
| 3원장의 실제 데이터 규모 | 미실측 — 테이블 통합 판단 시 필수 입력 |

---

## 12. 중지 / 보안 발견

| WO §13 항목 | 발생 |
|---|:--:|
| 개인정보/서비스 간 데이터 노출 가능성 | **없음** (현재). 단 §6-3 통합 시 위험 발생 |
| table 의미가 기존 문서와 반대 | 없음 |
| Freeze 위반 가능성 | **없음** — L1~L3 는 F4/F5 선언 범위 밖 (§3-2) |
| **migration 없이 해결 불가능** | **해당** — canonical table 통합에 한해 발생 → 판정 B 로 회피 |
| 한 테이블을 여러 도메인이 공유 | 없음 (L1~L3 는 단일 서비스 전용) |
| 다른 세션 WIP 충돌 | 없음 (감사 · 코드 변경 0) |

**신규 S1 급 보안 결함 0건.** 구현 우선순위를 올릴 사유는 발견되지 않았다.

---

## 13. 잔존 위험

1. **`KpaContent` 엔티티 drift (6컬럼)** — 지금은 무해하나 Core 공통화에서 repository 접근으로 바꾸면 즉시 결함.
2. **격리가 테이블 이름에 암묵적으로 의존** — Core 추출 시 테이블명을 파라미터로 주입하게 되는데,
   기본값을 두면 실수로 타 서비스 테이블을 조회할 수 있다. **기본값 없는 필수 파라미터**로 설계해야 한다.
3. **KPA `status=all` 운영자 확장** — 공통화 시 이 분기를 놓치면 KPA 운영자 콘텐츠 허브가 회귀한다.
4. **GP/KCos `POST /operator/resources` 를 KPA 로 확산시키지 말 것** — UNIQUE 판정(G12)이며 KPA 는 의도적으로 없다.
5. **프로덕션 데이터 규모 미실측** — 향후 판정 A 검토 시 선행 필요.
