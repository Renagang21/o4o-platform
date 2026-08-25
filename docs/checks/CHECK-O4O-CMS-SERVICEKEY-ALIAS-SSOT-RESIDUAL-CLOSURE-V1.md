# CHECK-O4O-CMS-SERVICEKEY-ALIAS-SSOT-RESIDUAL-CLOSURE-V1

- WO: `WO-O4O-CMS-SERVICEKEY-ALIAS-SSOT-RESIDUAL-CLOSURE-V1`
- Branch: `work/cms-kpa-mutation-servicekey-canonicalization-v1`
- 기준 commit: `0795c6922` (직전 mutation WO)
- 판정: **PASS** — code SSOT 수렴 완료 / production write 0 / legacy row 는 `SAFE_MIGRATE` 판정 후 미수행

---

## 1. 선행 production smoke (§3)

**BLOCKED_ENV.** 사유가 이전 기록보다 정확해졌다: 자격증명 문제 이전에 **미배포**다.

```
Cloud Run o4o-core-api image = ...:4a692207f6c917153a0da5501aff1a40abd7dbdd
git merge-base --is-ancestor 0795c6922 4a692207f → NOT_DEPLOYED
```

production 은 mutation 수정이 없는 리비전을 돌리고 있으므로 "403 해소" 는 관측 대상 자체가
존재하지 않는다. 직전 CHECK 에 addendum 으로 기록했고 별도 WO 를 만들지 않았다.
alias census 는 이 항목에 막히지 않고 그대로 진행했다.

---

## 2. serviceKey literal census (§4)

### 2-1. CMS 원장(`cms_contents` / `cms_content_slots`)을 실제로 다루는 코드 — 전수

| file | symbol | 값 | 역할 | 분류 | 조치 |
|---|---|---|---|---|---|
| `routes/cms-content/cms-content-utils.ts` | `resolveCmsServiceKeys` 외 3 | resolver 파생 | alias/canonical 단일 구현 | SSOT | 유지 |
| `routes/cms-content/cms-content-mutation.handler.ts` | — | 주석뿐 | create/update/lifecycle 인가 | SSOT 소비 | 유지 |
| `routes/cms-content/cms-content-query.handler.ts` | — | 없음 | read 경계 | SSOT 소비 | 유지 |
| `routes/cms-content/cms-content-slot.handler.ts` | `KNOWN_PREFIXES` | `['kpa','cosmetics','neture','glycopharm']` | **어떤 서비스가 slot 운영 축을 갖는지**의 목록 (alias 표가 아님) | ROLE_SCOPE_KEY | 유지 |
| `routes/cms-content/cms-content-slot.handler.ts` | list/create/update | 문자열 동등 비교 | slot 관리 경계 | **DUPLICATED_ALIAS_LOGIC** | **수정** |
| `routes/kpa/kpa.routes.ts:1209` | `KPA_SERVICE_KEYS` | `['kpa-society','kpa']` | CMS news read+mutation 대상 집합 | **DUPLICATED_ALIAS_LOGIC** | **제거→파생** |
| `routes/kpa/kpa.routes.ts:1208` | `KPA_SERVICE_KEY` | `'kpa-society'` | 신규 row 저장 키 | CANONICAL_SERVICE_KEY | **파생으로 교체** |
| `routes/kpa/kpa.routes.ts:205` | `ContentQueryService.serviceKeys` | `['kpa-society','kpa']` | KPA 공개 콘텐츠 조회 | **DUPLICATED_ALIAS_LOGIC** | **제거→파생** |
| `routes/kpa/kpa.routes.ts:451` | `createStorePlaylistController(…)` | `'kpa-society'`, `'kpa'` 두 인자 | (ledger key, role prefix) **분리 전달** | CANONICAL + ROLE_SCOPE | 유지 |
| `routes/kpa/kpa.routes.ts` | `requireKpaScope('kpa:operator')` | role | 인가 축 | ROLE_SCOPE_KEY | 유지 |
| `routes/o4o-store/controllers/news.controller.ts:43` | `serviceKeys: [serviceKey]` | canonical 1개 | KCos/GP news 조회 | **alias 고립 위험** | **수정→파생** |
| `routes/cosmetics/cosmetics.routes.ts:441` | mount | `('k-cosmetics','cosmetics:operator')` | 두 축 분리 전달 | CANONICAL + ROLE_SCOPE | 유지 |
| `routes/glycopharm/glycopharm.routes.ts:756` | mount | `('glycopharm','glycopharm:operator')` | 동일 | CANONICAL + ROLE_SCOPE | 유지 |
| `routes/neture/controllers/neture.controller.ts:37` | `serviceKeys: ['neture']` | self-map 1개 | Neture 콘텐츠 조회 | CANONICAL_SERVICE_KEY | 유지 (alias 없음) |

### 2-2. Frontend / UI

| file | symbol | 값 | 역할 | 분류 | 조치 |
|---|---|---|---|---|---|
| `admin-dashboard/.../cms/{contents,slots,channels}/*.tsx` ×6 | `SERVICES` | 같은 배열 6벌, KPA 만 `'kpa'` | 화면 선택지 + 요청 serviceKey | UI_SERVICE_CATALOG **이자** service identity | **1벌로 통합 + canonical** |
| `services/web-kpa-society/src/api/cms.ts` ×3 | 기본값 | `'kpa'` | CMS read 요청 serviceKey | UI/CLIENT identity | **canonical 상수 1개로** |
| `admin-dashboard/.../cms/pages/CMSPageList.tsx:243` | `neture.co.kr` | 도메인 | 미리보기 링크 | 무관 (도메인) | 유지 |

### 2-3. CMS 원장을 다루지 않는 동명 리터럴 (오탐 방지용 기록)

`packages/capabilities/src/types.ts` 의 `ServiceKey = 'kpa'|'cosmetics'|'glycopharm'`,
`packages/ai-core`, `packages/auth-utils/profile-utils.ts`, `packages/asset-copy-core`,
`routes/glycopharm/**` 의 `serviceKey: 'glycopharm'` 등은 CMS 원장 축이 아니거나
self-map 서비스라 alias 위험이 없다 → 각각 ROLE_SCOPE_KEY / CANONICAL_SERVICE_KEY.
이번 WO 범위(CMS 및 직접 consumer) 밖이므로 변경하지 않는다.

**UNKNOWN = 0.**

---

## 3. `KPA_SERVICE_KEYS` 판정 (§6)

10개 사용처를 끝까지 추적한 결과:

- 전부 `contentRepo`(= `CmsContent`) 쿼리다. **CMS 외 legacy 계약을 겸하지 않는다** → §20 중지 조건 비해당.
- `read` 전용이 아니다. 기존 주석은 `// backward compat for reads` 였지만 실제로는
  `PUT /news/:id`, `DELETE /news/:id`, `/:id/hard`, `batch-publish`, `batch-archive`,
  `batch-hard-delete` 가 **같은 집합으로 대상 row 를 찾는다** — 즉 legacy row 수정 가능성이
  이 집합에 걸려 있다. 주석을 사실에 맞게 고쳤다.
- 집합은 `resolveCmsServiceKeys('kpa')` 와 **완전히 동일**하다.

→ 판정: **SSOT 중복. 로컬 배열 제거.**

```ts
const KPA_SERVICE_KEY = resolveCanonicalServiceKey('kpa');
const KPA_SERVICE_KEYS = resolveCmsServiceKeys('kpa');
```

새 공통 alias 배열을 만들지 않았다 — 기존 read 경계가 쓰던 함수를 그대로 재사용했다.

---

## 4. admin-dashboard `SERVICES` 판정 (§7)

**A(UI 카탈로그)와 B(identity) 둘 다**였다. label·표시 순서·"전체" 선택지는 제품 UI 관심사라
security-core 가 대신할 수 없다(→ 카탈로그 자체는 유지). 그러나 각 항목의 `value` 는 그대로
서버에 `serviceKey` 로 전달되어 service identity 로 쓰인다.

문제는 **축이 섞여 있었다**는 것이다: KPA 만 role prefix `'kpa'`, K-Cosmetics 는 canonical
`'k-cosmetics'`. 게다가 같은 배열이 6개 파일에 복사돼 있었다.

→ 조치: `apps/admin-dashboard/src/pages/cms/cmsServiceCatalog.ts` 한 벌로 통합하고
`value` 를 전부 canonical 로 맞췄다(`kpa` → `kpa-society`). 하드코딩이라는 이유로
삭제하지 않았고, 카탈로그의 UI 성격은 그대로 두었다.

`pharmacy-hub` 는 카탈로그에 없다(콘텐츠 1건 존재). 제품 UI 노출 범위 결정이 필요하므로
**추가하지 않고 잔여 부채로 보고**한다.

---

## 5. 제거/수정한 로컬 alias logic (§7·§15)

1. `kpa.routes.ts` `KPA_SERVICE_KEYS = ['kpa-society','kpa']` → `resolveCmsServiceKeys('kpa')`
2. `kpa.routes.ts` `ContentQueryService({ serviceKeys: ['kpa-society','kpa'] })` → 동일 파생
3. `kpa.routes.ts` `KPA_SERVICE_KEY = 'kpa-society'` → `resolveCanonicalServiceKey('kpa')`
4. `news.controller.ts` `serviceKeys: [serviceKey]` → `resolveCmsServiceKeys(serviceKey)`
5. `cms-content-slot.handler.ts` 문자열 동등 필터 → alias 집합 필터
6. admin-dashboard `SERVICES` 6벌 → 카탈로그 1벌(canonical)
7. `web-kpa-society/api/cms.ts` `'kpa'` ×3 → canonical 상수 1개

---

## 6. slot 경계에서 발견한 실제 결함 (§8·§12)

census 중 드러난 것으로, 원래 WO 가 예상한 "리터럴 정리" 보다 무거운 실동작 결함이다.

production 실측:

```
cms_content_slots :  kpa-society 28  |  kpa 1
```

slot 관리 API(`GET/POST/PUT /cms/slots`)는 serviceKey 를 **문자열 동등**으로 다뤘다:

- `serviceKey=kpa-society` 필터 → legacy slot 1건이 **보이지 않음**
- `serviceKey=kpa` 필터 → canonical slot 28건이 **보이지 않음**
- 생성 시 입력값을 그대로 저장 → admin UI 가 `'kpa'` 를 보내던 동안 **새 legacy row 가 계속 생길 수 있었다**

→ 수정: 목록 필터는 `In(resolveCmsServiceKeys(...))`, 생성은 `canonicalizeCmsServiceKey`,
수정 시 alias 재전송은 `isSameCmsService` 로 "변경 아님" 판정(= legacy slot 을 조용히
migration 하지 않음), 실제 cross-service 이전만 `SERVICE_KEY_IMMUTABLE` 로 차단.

legacy content row 와 legacy slot row 는 **같은 시각에 생성된 한 쌍**이다
(content `7643a0af…` ← slot `intranet-hero`).

---

## 7. 신규 write canonical 보장 (§9)

| 입력 | 저장 | 경로 |
|---|---|---|
| `kpa` | `kpa-society` | `POST /cms/contents`, `POST /cms/slots` |
| `kpa-society` | `kpa-society` | 동일 |
| `cosmetics` | `k-cosmetics` | 동일 |
| `k-cosmetics` | `k-cosmetics` | 동일 |

legacy alias 는 **기존 row 의 read/mutation 호환에만** 쓰인다. 신규 legacy row 생성 경로 0.

---

## 8. legacy `kpa` row 최신 census 와 판정 (§10·§11)

```
cms_contents      glycopharm 66 | kpa-society 53 | neture 6 | kpa 1 | pharmacy-hub 1
cms_content_slots kpa-society 28 | kpa 1 | glycopharm 1

cms_contents 의 legacy row:
  id             7643a0af-6c9f-426b-98a6-0f9ee12b2853
  type/status    hero / published
  visibility     platform      authorRole admin      organizationId (null)
  title          대한약사회에 오신 것을 환영합니다
  created        2026-01-09 06:58:30  (updatedAt 동일 — 생성 후 수정된 적 없음)
  consumer       slot `intranet-hero` (serviceKey='kpa') 가 이 row 를 참조
  mutation       가능 (alias 계약으로 KPA operator 수정 가능)
  title/type 충돌  kpa-society 쪽과 0건
  unique 제약    serviceKey 관련 unique index 없음
```

### 판정: **SAFE_MIGRATE — 단, 이번 WO 에서 수행하지 않음**

기술적으로는 안전하다(충돌 0, 제약 0, 참조는 contentId 기반이라 무관, read/write 결과 동일).
그럼에도 UPDATE 를 하지 않은 이유:

1. **§11 의 "대상 정확히 1행" 을 넘는다.** 축을 일관되게 맞추려면 `cms_contents` 1행 +
   `cms_content_slots` 1행, **2 테이블 2행**이다.
2. 코드가 alias 를 완전 호환하므로 migration 의 **운영상 이득이 0**이다(긴급도 없음).
3. §11 마지막 문장에 따라 production UPDATE 는 명시 승인 대상으로 남긴다.

→ **production migration 수행 여부: 미수행. DB write 0건.**

---

## 9. Alias 제거 후 호환성 (§12) — production read-only 재확인

```
serviceKey IN ('kpa-society','kpa')       → cms_contents 54 (53+1) / slots 29 (28+1)
serviceKey IN ('k-cosmetics','cosmetics') → 0 / 0   (legacy cosmetics 데이터 없음)
serviceKey IN ('glycopharm')              → 66 / 1  (타 서비스 유입 0)
serviceKey IN ('pharmacy-hub')            → 1
alias 집합 밖의 serviceKey / NULL         → 0건
```

로컬 alias 배열을 제거한 뒤에도 legacy row 는 canonical 요청에 **함께** 잡힌다 → 고립 0.

---

## 10. 권한·read 회귀 (§13·§14)

| 항목 | 결과 |
|---|---|
| KPA operator → KPA canonical/legacy 만 mutation | PASS |
| KCos operator → KCos 만 | PASS |
| GP operator → GP 만 | PASS |
| PH operator → PH 만 | PASS |
| platform admin cross-service 관리 계약 | 유지 (PASS) |
| read: serviceKey 없음 → 400 / 자기 service 정상 / 타 service 404 / KPA·KCos alias 정상 / admin 역할 근거 cross-service | PASS (기존 스위트 무변경 통과) |

---

## 11. 자동 테스트 (§16)

신규 `apps/api-server/src/__tests__/cms-servicekey-alias-ssot-closure.spec.ts` — **28건 전부 PASS**

- SSOT: KPA/KCos alias 집합이 security-core resolver 왕복 결과와 동일, self-map 3서비스 단일 alias
- Write: alias 입력 → canonical 저장 (slot create, operator·platform admin 양쪽)
- Existing legacy: legacy slot 을 canonical 요청으로 read/mutation 가능, alias 재전송 시 migration 0
- Cross-service: GP/KCos operator 가 KPA alias row 차단
- **No local mapping regression (static contract)**: CMS 소스 6종에 `['kpa-society','kpa']` /
  `['k-cosmetics','cosmetics']` 배열과 `{ 'kpa-society': … }` 매핑 객체 **재도입 금지**,
  `kpa.routes.ts` 가 resolver 파생임을 소스로 고정, admin 카탈로그가 canonical value 만 쓰는지 고정

---

## 12. Build / Test (§18)

| 항목 | 결과 |
|---|---|
| security-core build | PASS (자체 테스트 스위트는 없음 — resolver 계약은 위 spec 이 커버) |
| CMS read/mutation/slot tests | PASS |
| api-server `tsc --noEmit` | **0 errors** |
| api-server 전체 Jest | **187 suites / 3097 tests, 0 fail** |
| admin-dashboard typecheck | **0 errors** |
| admin-dashboard production build | PASS |
| web-kpa-society typecheck / build | PASS |
| production DB write | **0건** |

---

## 13. 잔여 부채

1. **legacy `kpa` 쌍 (content 1 + slot 1)** — `SAFE_MIGRATE` 판정, 승인 대기. 미수행.
2. **`routes/channels/channels.routes.ts`** — serviceKey 를 문자열 동등으로 필터하고,
   `channel.serviceKey` 로 slot 을 조인한다(`slot.serviceKey = :serviceKey OR IS NULL`).
   `channels` 테이블은 현재 **0행**이라 실피해는 없지만, `'kpa'` 채널이 생기면 canonical
   slot 28건을 잃는 잠복 결함이다. CMS 밖 라우트 도메인이라 이번 WO 에서 건드리지 않았다.
3. **`cms-content-slot.handler.ts` `KNOWN_PREFIXES` 에 `pharmacy-hub` 없음** — PH 는 slot 운영
   축을 갖지 않는다. 의도인지 누락인지 제품 결정 필요.
4. **admin-dashboard 카탈로그에 `pharmacy-hub` 없음** (콘텐츠 1건 존재). UI 노출 범위 결정 필요.
5. **선행 mutation WO 의 production smoke** — 미배포로 여전히 열림 (§1).

---

## 14. 변경 파일 (path-specific)

```
M apps/api-server/src/routes/cms-content/cms-content-slot.handler.ts
M apps/api-server/src/routes/kpa/kpa.routes.ts
M apps/api-server/src/routes/o4o-store/controllers/news.controller.ts
A apps/api-server/src/__tests__/cms-servicekey-alias-ssot-closure.spec.ts
A apps/admin-dashboard/src/pages/cms/cmsServiceCatalog.ts
M apps/admin-dashboard/src/pages/cms/channels/ChannelFormModal.tsx
M apps/admin-dashboard/src/pages/cms/channels/ChannelList.tsx
M apps/admin-dashboard/src/pages/cms/contents/CMSContentList.tsx
M apps/admin-dashboard/src/pages/cms/contents/ContentFormModal.tsx
M apps/admin-dashboard/src/pages/cms/slots/CMSSlotList.tsx
M apps/admin-dashboard/src/pages/cms/slots/SlotFormModal.tsx
M services/web-kpa-society/src/api/cms.ts
A docs/checks/CHECK-O4O-CMS-SERVICEKEY-ALIAS-SSOT-RESIDUAL-CLOSURE-V1.md
M docs/checks/CHECK-O4O-CMS-KPA-MUTATION-SERVICEKEY-CANONICALIZATION-V1.md  (addendum)
```

§19 범위 밖 항목(platform+organizationId 정책, GP dead getContent, Resource category/tag,
PH operator upload UI, CMS 아키텍처 재설계, role hierarchy, service membership 정책) 전부 미접촉.
§20 중지 조건: `KPA_SERVICE_KEYS` 는 CMS 전용으로 확인되어 비해당, `SERVICES` 는 카탈로그
성격을 유지한 채 value 만 canonical 로 맞춰 비해당, resolver 로 기존 semantics 전부 표현 가능,
legacy row 는 정책 결정이 필요하므로 **판정만 하고 중지**(§11 준수), 다른 세션 WIP 충돌 없음.
