# O4O Platform — 유니버셜 블록 Phase 3 구현 지시서

*작성일: 2025-10-31*
*대상: 코더/로컬 에이전트*
*실행 중심 간결 지시서*

## 0) 사전 동기화(필수)

* [ ] `main` 최신 동기화 → 로컬/서버 둘 다 `git fetch --all && git pull`
* [ ] 패키지 설치/정합성 점검: `pnpm i && pnpm -w build`
* [ ] CI 파이프라인 상태 확인(빌드/테스트 통과)

## 1) 브랜치/릴리스 전략

* 작업 브랜치: `feature/universal-block-phase3`
* 마일스톤 PR 3개(3주): `phase3.1`(서버 쿼리엔진) → `phase3.2`(프론트 DSL+헬퍼) → `phase3.3`(Preset Manager+최적화)
* 배포 전략: Canary(10%→50%→100%), 즉시 롤백 스크립트 포함

## 2) 구현 범위(요약)

* **서버**: Advanced Query Engine(expand/where/sort/aggregate, cursor 페이지네이션), DataLoader, Allow-list 검증기, Rate-Limit, Redis 캐시, 민감데이터 필터링
* **프런트**: `useUniversalBlock` 훅 + UniversalBlock 속성 확장(DSL), TanStack Query 캐시 키 규칙, ViewPreset 연동
* **템플릿 헬퍼**: 표준 20+ 헬퍼 등록(ACF/관계/미디어/포맷/조건/컬렉션/계산), 샌드박스 검증
* **Query Preset Manager**: 드래그앤드롭 빌더, 실시간 프리뷰, 버전관리, 복잡도/성능 인사이트
* **보안/성능**: 쿼리 복잡도 한도, N+1 제거, 캐시 적중률 개선, RPS/동시성 목표 충족

## 3) 디렉터리/주요 산출 파일(예시 경로)

```
apps/api-server/
├── src/
│   ├── services/
│   │   ├── AdvancedQueryService.ts      # 고급 쿼리 엔진
│   │   └── QueryComplexityAnalyzer.ts   # 복잡도 분석
│   ├── security/
│   │   ├── QuerySecurityValidator.ts    # Allow-list 검증
│   │   └── DataSanitizer.ts            # 민감 데이터 필터링
│   ├── loaders/
│   │   └── PresetDataLoader.ts         # DataLoader 구현
│   └── routes/
│       └── v2/
│           └── data.routes.ts          # /api/v2/data/* 엔드포인트

packages/shortcodes/
├── src/
│   ├── hooks/
│   │   └── useUniversalBlock.ts        # 새로운 훅
│   ├── components/
│   │   └── view-presets/
│   │       ├── PresetRenderer.tsx      # 렌더러
│   │       └── QueryBuilder.tsx        # 쿼리 빌더
│   └── template/
│       ├── TemplateRenderer.ts         # 템플릿 엔진
│       └── helpers/
│           ├── acf.ts                  # ACF 헬퍼
│           ├── relation.ts             # 관계 헬퍼
│           ├── media.ts                # 미디어 헬퍼
│           └── format.ts               # 포맷 헬퍼

apps/admin-dashboard/
└── src/
    └── features/
        └── query-preset/
            ├── QueryBuilder.tsx         # 드래그앤드롭 빌더
            ├── PreviewPane.tsx         # 실시간 프리뷰
            └── VersionHistory.tsx      # 버전 관리

docs/dev/
└── impl/
    └── universal-block_phase3_impl.md  # 구현 결과 문서
```

## 4) 작업 순서(3 스텝)

### Step 1) 서버 구현 (Week 1)

#### 작업 항목
* [ ] `GET/POST /api/v2/data/query|execute` 엔드포인트
* [ ] `AdvancedQueryParams` 검증(Zod) + **Allow-list** 필드/관계/연산자
* [ ] DataLoader 도입(ACF 관계/미디어/사용자) → N+1 제거
* [ ] Cursor 페이지네이션, 다중 정렬, 집계(count/sum/avg)
* [ ] Redis 캐시(key=source+params+role+tenant, TTL 기본 300s)
* [ ] Rate-Limit(엔드포인트/사용자/복잡도별) + 민감데이터 필터링

#### 구현 예시
```typescript
// AdvancedQueryService.ts
export class AdvancedQueryService {
  constructor(
    private dataLoader: PresetDataLoader,
    private validator: QuerySecurityValidator,
    private cache: RedisCache
  ) {}

  async executeQuery(params: AdvancedQueryParams): Promise<QueryResult> {
    // 1. 보안 검증
    this.validator.validate(params);

    // 2. 캐시 확인
    const cacheKey = this.generateCacheKey(params);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // 3. 쿼리 실행
    const result = await this.buildAndExecute(params);

    // 4. DataLoader로 관계 로드
    if (params.expand) {
      await this.loadRelations(result, params.expand);
    }

    // 5. 결과 캐싱
    await this.cache.set(cacheKey, result, 300);

    return result;
  }
}
```

#### DoD (Definition of Done)
* 단위테스트 80%+, 복합 expand 2단/AND+OR 조건 통과
* 부하테스트(샘플)에서 N+1 없음(쿼리 횟수 상한 문서화)

### Step 2) 프런트 DSL + 훅 + 헬퍼 (Week 2)

#### 작업 항목
* [ ] `UniversalBlockProps`: `source, expand[], where, sort[], limit, cache`
* [ ] `useUniversalBlock()` 구현(캐시 키 정규화, 실패 재시도 규칙)
* [ ] ViewPreset와 호환 유지(기존 `usePreset` 불변)
* [ ] 템플릿 헬퍼 20+ 등록 및 샌드박싱(허용 헬퍼 화이트리스트)

#### 구현 예시
```typescript
// useUniversalBlock.ts
export function useUniversalBlock(props: UniversalBlockProps) {
  const queryKey = generateQueryKey(props);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.post('/api/v2/data/query', {
        source: props.source,
        expand: props.expand,
        where: props.where,
        sort: props.sort,
        page: { limit: props.limit || 10 }
      });

      return response.data;
    },
    staleTime: props.cache?.ttl ? props.cache.ttl * 1000 : 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });
}

// Template Helper 예시
const helpers = {
  acf: (field, fallback) => data.acf_fields?.[field] || fallback,
  media: (id, size = 'thumb') => `/media/${id}/${size}`,
  priceFormat: (value, currency = 'KRW') =>
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency }).format(value)
};
```

#### DoD
* 샘플 페이지에서 card/grid/list/table 모드 정상
* ACF/관계/미디어/포맷 헬퍼 렌더 검증(E2E 스냅샷)

### Step 3) Query Preset Manager + 최적화 (Week 3)

#### 작업 항목
* [ ] 빌더(드래그앤드롭, expand/where/sort/aggregate 구성)
* [ ] 실시간 프리뷰(상위 5건), 복잡도 점수/실행시간 표시
* [ ] 버전관리(작성자/시각/변경사유) + 롤백
* [ ] 캐시 관찰(히트율) + 무효화 버튼

#### 구현 예시
```tsx
// QueryBuilder.tsx
const QueryBuilder: FC<QueryBuilderProps> = ({ cptSlug, onSave }) => {
  const [query, setQuery] = useState<AdvancedQueryParams>({});

  return (
    <div className="query-builder">
      <ExpandBuilder
        value={query.expand}
        onChange={expand => setQuery({ ...query, expand })}
      />

      <FilterBuilder
        value={query.where}
        onChange={where => setQuery({ ...query, where })}
      />

      <PreviewPane query={query} />

      <QueryComplexityAnalyzer query={query} />

      <Button onClick={() => onSave(query)}>Save Preset</Button>
    </div>
  );
};
```

#### DoD
* 비개발자 시나리오(필드 드래그→프리뷰→저장→적용) 성공
* 버전 롤백/비교 화면 동작

## 5) 테스트/품질 기준

| 항목 | 기준 | 측정 방법 |
|------|------|----------|
| 단위 테스트 | 커버리지 80%+ | Jest/Vitest |
| 통합 테스트 | 복합 쿼리 800ms 이하 | E2E 테스트 |
| 부하 테스트 | 동시 200 사용자, 에러율 < 0.5% | K6/Artillery |
| 보안 검증 | 금지 필드 차단, Rate-Limit 동작 | 보안 테스트 |
| 접근 제어 | 역할/테넌트 격리 | 캐시 키 검증 |

## 6) CI/CD

```yaml
# .github/workflows/phase3-ci.yml
name: Phase 3 CI/CD
on:
  push:
    branches: [feature/universal-block-phase3]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm i
      - run: pnpm test --coverage
      - run: pnpm build

  canary-deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: ./scripts/deploy-canary.sh 10  # 10% 트래픽
      - run: ./scripts/monitor-canary.sh 30m
      - run: ./scripts/deploy-canary.sh 50  # 50% 트래픽
      - run: ./scripts/monitor-canary.sh 30m
      - run: ./scripts/deploy-canary.sh 100 # 100% 트래픽
```

## 7) 성능 목표(측정 항목 고정)

| 메트릭 | 목표 | 현재 | 측정 도구 |
|--------|------|------|----------|
| 평균 응답시간(단순) | 150ms | 200ms | APM |
| 평균 응답시간(복합) | ≤ 800ms | N/A | APM |
| 캐시 적중률 | ≥ 85% | 60% | Redis Monitor |
| DB 쿼리 횟수 | 메인 1 + 배치 2~3 | N+1 발생 | Query Log |
| 메모리 사용량 | ≤ 2GB | N/A | Container Metrics |
| 동시 사용자 | 200명 | 50명 | Load Test |

### 메트릭 엔드포인트
```typescript
// GET /metrics
{
  "response_time": {
    "p50": 120,
    "p95": 450,
    "p99": 800
  },
  "cache": {
    "hit_rate": 0.87,
    "dataloader_hit_rate": 0.92
  },
  "queries": {
    "avg_per_request": 2.3,
    "max_per_request": 4
  }
}
```

## 8) 산출물 & 보고

* **코드**: 서버/프론트/UI 컴포넌트
* **테스트**: 단위/통합/E2E/부하 테스트
* **스크립트**: 배포/롤백/모니터링
* **문서**: `docs/dev/impl/universal-block_phase3_impl.md`
* **릴리스 노트**: CHANGELOG.md 업데이트

### 문서 템플릿
```markdown
# Phase 3 구현 결과

## 구현 완료 항목
- [ ] Advanced Query Engine
- [ ] DataLoader 패턴
- [ ] Template Helper System
- [ ] Query Preset Manager

## 성능 지표
| 메트릭 | 목표 | 달성 |
|--------|------|------|
| ... | ... | ... |

## 제약사항
- ...

## 후속 과제
- ...
```

## 9) 위험요인 & 완화

| 위험 | 영향도 | 완화 방안 |
|------|--------|----------|
| 복잡 쿼리 과사용 | 높음 | 복잡도 제한(100점) + 경고 UI |
| 캐시 키 누락 | 높음 | 키 구성 유닛테스트 필수 |
| 템플릿 헬퍼 남용 | 중간 | 화이트리스트 + 10KB 제한 |
| N+1 쿼리 재발생 | 높음 | DataLoader 필수 사용 |
| Rate Limit 우회 | 중간 | IP + User ID 조합 |

## 10) 승인 기준(최종)

### 기능 체크리스트
- [ ] 교차 CPT 조회 동작
- [ ] 다중 정렬 (3개 필드)
- [ ] Cursor 페이지네이션
- [ ] 집계 함수 (count/sum/avg)
- [ ] 템플릿 헬퍼 20개+ 동작
- [ ] Query Preset Manager 비개발자 사용 가능
- [ ] 버전 관리/롤백 동작

### 성능 체크리스트
- [ ] 단순 쿼리 150ms 이하
- [ ] 복합 쿼리 800ms 이하
- [ ] 캐시 적중률 85% 이상
- [ ] 동시 200 사용자 처리

### 보안 체크리스트
- [ ] Allow-list 검증 동작
- [ ] Rate Limiting 동작
- [ ] 민감 데이터 필터링
- [ ] 템플릿 샌드박싱

### 배포 체크리스트
- [ ] Canary 10% 성공
- [ ] Canary 50% 성공
- [ ] Canary 100% 성공
- [ ] 롤백 스크립트 테스트

---

## 연락처 & 지원

* **기술 리드**: @tech-lead
* **DevOps**: @devops-team
* **QA**: @qa-team
* **Slack 채널**: #universal-block-phase3

---

*최종 업데이트: 2025-10-31*
*작성: O4O Platform 개발팀*