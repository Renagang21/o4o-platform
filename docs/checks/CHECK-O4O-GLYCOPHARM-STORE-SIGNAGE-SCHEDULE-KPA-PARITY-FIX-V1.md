# CHECK-O4O-GLYCOPHARM-STORE-SIGNAGE-SCHEDULE-KPA-PARITY-FIX-V1

> GlycoPharm 매장 디지털 사이니지(`/store/marketing/signage/*`) 버튼 배치·스케줄 게이트를 KPA-Society 기준과 정렬.
> **결과: PASS** — frontend-local 1파일. GP tsc 0.
> 기준: `services/web-kpa-society/src/pages/pharmacy/StoreSignagePage.tsx` · 작업일 2026-06-16

---

## 1. 목적

KPA canonical 화면과 비교해 어긋난 두 지점을 정렬한다.
1. 상단 헤더의 "콘텐츠 추가" 버튼이 KPA 기준에 없음 → 제거하고 각 탭 액션 버튼을 KPA 위치로.
2. 스케줄 탭이 약국 context 미해석 시 "약국 정보를 불러올 수 없습니다" 차단 배너를 띄움 → KPA처럼 차단 제거.

사용자 요청(추가): **새 스케줄 / 새 플레이리스트 / 새 동영상(콘텐츠 추가) 버튼을 KPA-society와 같은 위치**로.

---

## 2. KPA canonical 기준 (StoreSignagePage.tsx)

| 위치 | KPA |
|---|---|
| 상단 헤더 | **새로고침만** (콘텐츠 추가 없음) |
| 내 동영상 탭 헤더(우측) | "동영상 등록" 버튼 (`setShowVideoRegForm`) |
| 내 플레이리스트 탭 헤더(우측) | "새 플레이리스트" (`setShowCreateForm`) |
| 스케줄 탭 헤더(우측) | "새 스케줄" (`setShowScheduleForm`) — **차단 배너 없음**, 항상 렌더 |

→ 패턴: 상단 헤더는 새로고침만, 각 탭은 `flex justify-between`로 `<h2>탭명</h2>` + "새 X" 버튼을 우측에.

---

## 3. GlycoPharm 변경 (StoreSignageMainPage.tsx — 1파일)

| # | 변경 | KPA 대응 |
|---|---|---|
| 1 | 상단 헤더 "콘텐츠 추가" 버튼 **제거** → "새로고침"만 | KPA 상단 = 새로고침만 |
| 2 | "내 동영상" 탭 헤더 우측의 `<p>허브에서 가져온…</p>` → **"콘텐츠 추가" 버튼**(라이브러리 이동)으로 교체 | KPA "동영상 등록" 위치 |
| 3 | 스케줄 탭 `!organizationId` **차단 배너 제거** → orgResolving 후 스케줄 UI/"새 스케줄" 항상 렌더 | KPA 스케줄 탭 = 차단 없음 |
| — | "새 플레이리스트"는 이미 탭 헤더 우측에 위치 — **무변경** | 이미 일치 |

### 아키텍처 차이 메모 (라벨 선택)
- KPA "내 동영상" = URL 직접 등록 모달(`createSignageMedia`). GlycoPharm "내 동영상" = **허브에서 가져온 자산**(`storeAssetControlApi`, 직접 등록 플로우 없음).
- 따라서 GlycoPharm은 KPA "동영상 등록" **위치**에 GlycoPharm의 실제 동작(라이브러리 이동)을 가진 **"콘텐츠 추가"** 라벨을 둔다. 직접 등록 모달/백엔드 신설은 본 WO 범위 외(frontend-local 원칙).

### 스케줄 context 처리
- `organizationId` 는 기존대로 store-hub overview(`/glycopharm/store-hub/overview`)에서 해석 — GlycoPharm 적합 소스(KPA의 `kpaMembership` 강제 안 함). API 호출에 그대로 사용.
- 차단 배너만 제거: org 미해석이어도 스케줄 UI는 렌더되고, 목록은 빈 상태로 표시(KPA와 동일 동작). 유효한 매장 계정은 overview가 org를 반환하므로 스케줄 정상 동작.
- 로딩 문구 "약국 정보를 불러오는 중…" → 중립 "불러오는 중…".

---

## 4. 완료 기준 충족

| 기준 | 결과 |
|---|---|
| 상단 "콘텐츠 추가" 제거 | ✅ |
| 상단 "새로고침" 유지 | ✅ |
| 내 동영상 탭: KPA 위치에 콘텐츠 추가 버튼 | ✅ |
| 내 플레이리스트 탭: "새 플레이리스트" 우측 | ✅ (기존 일치) |
| 스케줄 탭: "새 스케줄" 노출(차단 배너 제거) | ✅ |
| "약국 정보를 불러올 수 없습니다" 배너 제거 | ✅ |
| 스케줄 없을 때 KPA식 empty state | ✅ (기존 "스케줄이 없습니다…" 유지) |
| 내 동영상/플레이리스트/TV 재생 회귀 | 없음(탭 헤더·게이트만 수정) |

---

## 5. 검증

- **GP tsc**: `tsc --noEmit -p tsconfig.app.json` → PASS (0). unused import 없음(AlertCircle/ExternalLink/Plus 모두 잔존 사용처 확인).
- KPA-Society / operator·admin 사이니지 / backend / migration / 공통 core / package dependency — **무변경**.
- Smoke(배포 후 권장): GlycoPharm `/store/marketing/signage/{videos,playlist,schedules}` 에서 상단=새로고침만, 각 탭 우측 버튼, 스케줄 차단 배너 미표시. 기준 비교 = KPA `/store/marketing/signage/schedules`.

---

## 6. 제외 / 후속

- 라벨: 내 동영상 탭 버튼을 "콘텐츠 추가"로 유지(GlycoPharm 실제 동작 정확). KPA식 "동영상 등록" 직접 모달이 필요하면 별도 WO(백엔드 동영상 등록 플로우 동반).
- 스케줄 org 가 특정 계정에서 overview로도 미해석되는 경우(있다면) 백엔드 store-hub overview 조사 별도 — 본 WO는 frontend-local 차단 제거까지.

**판정: PASS**
