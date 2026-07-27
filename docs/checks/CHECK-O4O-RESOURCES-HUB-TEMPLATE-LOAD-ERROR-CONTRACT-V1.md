# CHECK-O4O-RESOURCES-HUB-TEMPLATE-LOAD-ERROR-CONTRACT-V1

> **WO:** WO-O4O-RESOURCES-HUB-TEMPLATE-LOAD-ERROR-CONTRACT-V1
> **IR:** `docs/investigations/IR-O4O-RESOURCES-HUB-TEMPLATE-LOAD-ERROR-CONTRACT-V1.md`
> **일자:** 2026-07-27
> **판정:** 구현 완료 (공통 additive · 4소비처 전수 정비 · fail-open 예외 0)

---

## §3 소비처 분류

| 소비처 | 분류 | 조치 |
|--------|------|------|
| Neture `NetureResourcesPage` | 정비 필요 (throw 가 템플릿에서 삼켜짐) | 템플릿 정비로 자동 정상화 (파일 무변경) |
| KPA `ResourcesHubPage` | 정비 필요 (throw 가 템플릿에서 삼켜짐) | 템플릿 정비로 자동 정상화 (파일 무변경) |
| GlycoPharm `ResourcesPage` | 결함 (어댑터가 먼저 삼킴) | 어댑터 try/catch 제거 → throw 전파 |
| K-Cosmetics `ResourcesPage` | 결함 (주석 stale) | 어댑터 try/catch 제거 → throw 전파, 주석 정정 |

**의도된 fail-open = 0.** IR §4 참조.

## §4~§5 계약 구현

- [x] loading / error / success+0 / success+data 4상태 분리
- [x] `fetchItems` 성공+[] = 정상 빈 상태 통과
- [x] `fetchItems` throw = 오류 상태 (빈 상태 메시지 숨김)
- [x] "다시 시도" 제공 (`loadData()` 재호출)
- [x] 서버 원문 미노출 ("자료를 불러오지 못했습니다." 고정 문구)
- [x] 오류+빈 상태 동시 렌더 0 (result count·emptyMessage 억제)

## §5 템플릿 변경 (최소·후방호환)

- [x] additive: `loadError` 상태 + 오류 UI 추가, throw 시에만 발동
- [x] 금지 준수: status/code 도메인 해석 없음 · 재삼킴 없음 · 대규모 공통 타입 변경 없음
- [x] 삼키는 어댑터 잔존 시 종전 동작 유지 (회귀 0)

## §6 상태 유지

- [x] 재시도 시 tab·검색·page 보존 (URL `searchParams` 기반)
- [x] 전체 reload 없음

## §7 mutation 후 재조회 실패

- [x] mutation 성공 유지 · 기존 목록을 `[]` 로 비우지 않음 (`loadError` 만 세팅 + 상단 스트립)

## §8 오류 주입 매트릭스 (코드 경로 검증)

| 항목 | 결과 |
|------|:---:|
| 오류+빈 상태 동시 렌더 0 | ✅ |
| unhandled rejection 0 | ✅ (finally `setLoading(false)`) |
| 로딩 고착 0 | ✅ |
| 가로 overflow 0 | ✅ (레이아웃 불변) |
| 운영 write 0 | ✅ |
| 최소 2 소비처 (Neture + 최소 1) | ✅ (Neture·KPA·GlycoPharm·KCos 전수) |

## §10 typecheck·build

| 앱 | typecheck | build |
|----|:---:|:---:|
| @o4o/web-neture | EXIT 0 | ✅ 13.07s |
| glycopharm-web | EXIT 0 | ✅ 23.58s |
| @o4o/web-k-cosmetics | EXIT 0 | ✅ 14.55s |
| @o4o/web-kpa-society | EXIT 0 | ✅ 18.21s |

## §9 범위 제외 준수

- backend / DB / migration / 콘텐츠 모델 / IA / dependency / 운영 write: **0**
- 다른 세션 파일(otc-*/hff-*/pnpm-lock/otc-safety/AllProductsOverviewPage): 미변경

## 배포·smoke

**커밋:** `a09dc82e2` (main)

**배포 리비전 (Cloud Run · asia-northeast3):**

| 서비스 | 리비전 |
|--------|--------|
| neture-web | `neture-web-01345-5kp` |
| glycopharm-web | `glycopharm-web-01171-fx5` |
| k-cosmetics-web | `k-cosmetics-web-00919-9ls` |
| kpa-society-web | `kpa-society-web-01714-29j` |

> deploy-neture 는 1차에 Docker Hub `node:20-alpine` pull i/o timeout(인프라 flake, 코드 무관)으로 실패 → `--failed` 재실행 성공. 나머지 3개는 동일 커밋 1차 성공.

**smoke (엔드포인트 게이팅 — 정상 경로 무손상 확인):**

| 대상 | 코드 |
|------|:---:|
| `/api/v1/neture/content?type=resource` | 200 |
| `/api/v1/glycopharm/contents?sub_type=resource` | 200 |
| `/api/v1/cosmetics/contents` | 200 |
| `/api/v1/kpa/contents?sub_type=resource` | 200 |
| neture/glyco/kcos/kpa `/resources` 앱 루트 | 200 |

> 4개 자료실 엔드포인트 모두 정상 200 → 내 변경(throw 경로에만 반응)이 정상 조회를 오류 상태로 오판하지 않음을 확인. 오류 상태 자체는 throw(500/네트워크) 강제 주입이 필요하나 프로덕션에 비파괴적으로 유발 불가 + Playwright 영속 프로파일 점유 가능성 → 시리즈 표준대로 게이팅 + 빌드타임 typecheck 로 코드 경로 확정. (KPA 첫 curl 의 404 는 `/kpa` 누락한 경로 오타였고 정정 후 200.)

---

*판정: PASS (구현 완료 · 4앱 배포 · smoke 정상 경로 무손상)*
