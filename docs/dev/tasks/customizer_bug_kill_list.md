# Customizer 버그 킬 리스트

**목적**: 해결되지 않은 버그만 신속히 압축 처리
**방식**: 재현 → 진단 → 판정 → 완료기준 (코드 제시 없음)

---

## 🟥 BUG-01: 간헐적 리소스 고갈/폭주

**우선순위**: P0 (가장 높음)

### A. 재현 방법
1. `/admin/customize` 진입
2. 3분 이상 체류
3. **프리셋/저장/패널 전환**을 10회 반복
4. DevTools Network 탭에서 `me`, `active`, `customizer` 연속 호출 패턴 관찰

### B. 진단 (관측만)
- **Network → Initiator 열**: 호출 주체 추적 (상위창/iframe/Service Worker/태그)
- **Performance → Main 스레드**: 루프성 setInterval/fetch 존재 여부 확인
- **React Profiler**: 특정 패널 전환 시 불필요 재마운트 급증 여부 확인

### C. 판정 기준
- "상위창에서 neture 호출 0건"인데도 폭주 → **SW/태그/프리로더 기여**로 판정
- 특정 패널 전환 시만 폭주 → 해당 패널의 **폴링/Effect 누수**로 판정

### D. 완료 기준 (DoD)
- ✅ 10분 체류/반복 조작에도 **동일 엔드포인트 초당 1회 이하** 유지
- ✅ 콘솔에 **INSUFFICIENT_RESOURCES 0건**
- ✅ 메모리 그래프 (Performance) **우상향 없음**

---

## 🟥 BUG-02: `TypeError: ... reading 'desktop'` (footer.widgets.columns)

**우선순위**: P0

### A. 재현 방법
1. "푸터 → 위젯 → Columns" 패널 열기
2. 프리셋 적용 → 취소 → 다른 패널 → 재진입을 5회 반복
3. 시크릿 창/확장 OFF에서도 재현 시도

### B. 진단 (관측)
- **Network → `/settings/customizer` 응답**: `columns`가 **항상 `{desktop, tablet, mobile}`인지** 3회 표본 확인
- **Redux/Store 스냅샷**: `columns`가 특정 타이밍에 **숫자/undefined**로 내려오는지 확인

### C. 판정 기준
- API/Store 어느 한쪽에서라도 **숫자/undefined** 발견 → **어댑터 누락 타이밍**으로 판정
- 둘 다 정상인데 렌더에서만 터짐 → **UI 가드 미적용 섹션**으로 판정

### D. 완료 기준 (DoD)
- ✅ 20회 반복 조작에도 **TypeError 0건**
- ✅ `columns`가 모든 시점에서 **객체 3분기 형태** 유지 (3개 표본 스냅샷 첨부)

---

## 🟧 BUG-03: 저장 후 일부 섹션만 값 미반영 (구간적 미적용)

**우선순위**: P1

### A. 재현 방법
1. "사이트 정보, 색상, 타이포그래피, 헤더/푸터 빌더" 중 **2개 이상 섹션을 교차 수정**
2. 저장 클릭
3. 새로고침
4. 값이 모두 유지되는지 확인

### B. 진단 (관측)
- **Save 요청 페이로드 vs 서버 응답**: 필드 단위 diff (누락/이름 불일치/경로 충돌 체크)
- **저장 직후 재조회 타이밍**: 응답 스냅샷 사용인지, 별도 fetch인지 확인

### C. 판정 기준
- 필드명/경로 오타·중복 → **스키마 매핑 누락**으로 판정
- 저장 후 **응답 대신 재조회 값**으로 덮임 → **응답 우선 정책 미준수**로 판정

### D. 완료 기준 (DoD)
- ✅ 교차 수정 10세트 연속 **모든 섹션 값 유지**
- ✅ 저장 성공 후 **응답 스냅샷만으로 상태 갱신** 확인

---

## 🟨 BUG-04: 프리셋 적용 시 미세 깜빡임/지연

**우선순위**: P2

### A. 재현 방법
1. 프리셋 5종을 순차 적용 (저장 없이)
2. 시각적 플리커/긴 프리즈 유무 관찰

### B. 진단 (관측)
- **Performance/CPU Throttle(4x)**: Layout/Style Recalc 폭증 구간 확인
- **Network**: 프리셋마다 불필요한 API 왕복 있는지 체크

### C. 판정 기준
- 렌더링 계산량 과다 → **동기 처리/대량 리렌더** 원인
- 네트워크 과다 → **중복 호출/동일 스냅샷 재요청** 원인

### D. 완료 기준 (DoD)
- ✅ 프리셋 10회 연속 적용 시 **UI 블록 ≤ 200ms**
- ✅ **눈에 띄는 플리커 없음**

---

## 🟩 BUG-05: Service Worker/캐시 간헐 과거값

**우선순위**: P2

### A. 재현 방법
1. 저장 직후 시크릿 창 새로 열기
2. 과거 값이 1회라도 보이면 히트

### B. 진단 (관측)
- **Application → Service Workers**: "Bypass for network" 켜고 재현성 비교
- **응답 헤더**: `Cache-Control`, `ETag`/버전 스트래티지 확인

### C. 판정 기준
- SW bypass 시 정상 → **SW 캐시 정책** 원인
- 둘 다 동일 증상 → **상단 프록시/CDN 캐시** 원인

### D. 완료 기준 (DoD)
- ✅ 저장 직후 신규 세션에서도 **항상 최신값**
- ✅ 캐시 무효화 규칙 문서화 (버전 쿼리/ETag/짧은 TTL 중 택1) 적용

---

## 📋 실행 순서 (반나절 내 압축 진행)

### 1단계: 스모크 v1 재실행 (10분)
- 현재 배포판에서 S1·S2·S3 한 사이클만 먼저 돌려
- "전체 리로드 0회"와 "저장→새로고침→유지" 확인

### 2단계: BUG-01/02 동시 진단 (30~60분)
- Performance/Network/Profiler 캡처 **3세트** 확보
  - 초당 호출수
  - Initiator
  - 재마운트 횟수
- `columns` 구조 스냅 **3건** 확보 (API/Store/렌더 전)

### 3단계: 판정 & 즉시 조치 (30분)
- BUG-01이 SW/태그 기여일 경우: **해당 경로 차단/무력화 (운영 플래그)**
- BUG-02가 어댑터 타이밍 문제면: **어댑터 적용 순서만 조정**

### 4단계: 나머지 BUG-03~05 순차 처리 (1~2시간)
- 증상 보고 기반으로 순차 처리
- 특히 03: 저장 응답 스냅샷 우선 반영이 지켜지는지 **관측**으로 확인

---

## 📊 공통 보고 양식 (짧게)

```markdown
### 버그ID/결과
- BUG-01: Pass/Fail
- BUG-02: Pass/Fail
- BUG-03: Pass/Fail
- BUG-04: Pass/Fail
- BUG-05: Pass/Fail

### 핵심 근거 (1줄)
- BUG-01: "Initiator=ServiceWorker로 확인, 빈번 폴링 존재"
- BUG-02: "API 응답에서 columns=4 (숫자) 확인"

### 조치
- BUG-01: "프리셋 패널 진입 시 폴링 비활성 (운영 플래그)"
- BUG-02: "normalizeCustomizerSettings 호출 타이밍 조정"

### 회귀 테스트 결과
- 스모크 S1~S4: Pass/Fail
```

---

## 🎯 진단 캡처 체크리스트

### BUG-01/02 필수 캡처
- [ ] Chrome DevTools → Performance 녹화 (3분, 패널 전환 10회 포함)
- [ ] Chrome DevTools → Network 탭 (Initiator 열 포함, 필터: `me|active|customizer`)
- [ ] React DevTools → Profiler (패널 전환 시 재마운트 횟수)
- [ ] Network → `/settings/customizer` 응답 스냅샷 3건 (Raw JSON)
- [ ] Redux/Store 스냅샷 (columns 필드 포함)

### BUG-03 필수 캡처
- [ ] Save 요청 페이로드 (전체 JSON)
- [ ] Save 응답 스냅샷 (전체 JSON)
- [ ] 저장 직후 상태 스냅샷 (Redux/Store)

### BUG-04 필수 캡처
- [ ] Performance 녹화 (CPU 4x throttle, 프리셋 5회 적용)
- [ ] Layout/Style Recalc 타임라인 스크린샷

### BUG-05 필수 캡처
- [ ] Application → Service Workers 상태 (Active/Waiting)
- [ ] Network 응답 헤더 (`Cache-Control`, `ETag`)

---

**다음 작업**: BUG-01/02 진단 캡처 수집 → 즉시 판정 → 조치
