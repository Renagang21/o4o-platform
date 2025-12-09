# 커스터마이저 프리뷰 OFF + 타입 에러 종결 + 교차호출 차단 핫픽스

**작성일**: 2025-11-09
**목적**: iFrame 프리뷰 제거 + 타입 에러 근절 + 교차 도메인 리소스 폭주 차단
**태그**: `customizer-save-stable-v2`

---

## 📋 배경

### 현재 문제
1. **iFrame 프리뷰 리로드 폭주**: 탭 전환/설정 변경 시 무한 리로드
2. **교차 호출 폭주**: `admin.neture.co.kr → neture.co.kr` 간 `/api/v1/auth/cookie/me`, `/pages/active*` 반복 호출
3. **타입 에러**: `Cannot read properties of undefined (reading 'normal'/'desktop')` 간헐적 발생
4. **저장 불안정**: 저장 후 재조회로 인한 상태 불일치

### 근본 원인
- iFrame 기반 프리뷰가 부모-자식 간 통신 복잡도 유발
- 교차 도메인 auth 체크가 iFrame 마운트마다 반복
- 타입 변환이 조건부로 적용되어 undefined 누락

---

## 🔧 즉시 패치 오더

### 1) 프리뷰 전면 OFF (iFrame 제거)

**대상**: `apps/admin-dashboard/src/pages/appearance/astra-customizer/`

**조치**:
1. `SimpleCustomizer.tsx`: iFrame 렌더링 로직 제거 또는 조건부 비활성화
2. `PreviewContext.tsx`: postMessage/bridge 훅 비활성화
3. 프리뷰 관련 라우트 제거 또는 404 처리
4. "미리보기" 버튼 → "새 탭에서 보기" (프론트 홈 또는 `/preview/site-style`)로 대체

**DoD**:
- [x] 커스터마이저 진입/탭 전환 시 리로드 0회
- [x] Network 필터 `me|active` 호출 0건
- [x] 콘솔 에러 0건

---

### 2) 교차 호출 차단 (상위창→하위창)

**대상**: `admin.neture.co.kr → neture.co.kr` 교차 호출

**조치 (Option A - AuthContext)**:
- `apps/main-site/src/contexts/AuthContext.tsx`:
  - iFrame/교차 도메인 상황 감지 시 auth check 스킵
  - `window !== window.top` 또는 환경 플래그로 분기

**조치 (Option B - Nginx)**:
- Nginx: Admin 기원 `/api/v1/auth/cookie/me` → 204 응답 처리

**DoD**:
- [x] 콘솔에 `ERR_CONNECTION_RESET`, `ERR_INSUFFICIENT_RESOURCES` 0건
- [x] Network 탭에서 교차 호출 0건

---

### 3) 타입 하드닝: 컨트롤 기준 강제

**대상**: `apps/admin-dashboard/src/pages/appearance/astra-customizer/utils/normalize-settings.ts`

**조치**:
1. **어댑터 단일 경로 강제**:
   - 초기 로드, 프리셋 적용, 롤백, 초기화, **저장 직전** 모두 `normalizeCustomizerSettings()` 경유

2. **Responsive 3분기 강제**:
   - `siteIdentity.logo.width`
   - `siteIdentity.siteTitle.typography.fontSize/lineHeight/letterSpacing`
   - `siteIdentity.tagline.typography.fontSize/lineHeight/letterSpacing`
   - 값이 number/string/undefined여도 **{desktop, tablet, mobile}**로 승격·보정

3. **Color 상태쌍 강제**:
   - `colors.linkColor`
   - `siteIdentity.siteTitle.color`
   - `siteIdentity.tagline.color`
   - 단일 문자열 입력도 **{normal, hover}** 구조로 승격

4. **UI 접근 가드**:
   - 어댑터 출력 전까지 섹션 읽기전용 처리 (로딩 스피너)

**DoD**:
- [x] 사이트정보/색상 패널: `…reading 'desktop'`, `…reading 'normal'` 에러 0건
- [x] 저장→강제 새로고침(Ctrl+Shift+R) 후 값 100% 유지 (3회 반복)
- [x] 프리셋 버튼 클릭 → 모든 값 정상 반영, 에러 0건

---

### 4) 데이터 핫픽스 (운영 DB 보정)

**대상**: `customizer_settings` 테이블 (DB)

**조치**:
운영 DB의 기존 설정 데이터를 테마 기본값으로 보정

```sql
-- 예시: 수동 쿼리 또는 API 엔드포인트로 실행
UPDATE customizer_settings
SET settings = jsonb_set(
  jsonb_set(
    jsonb_set(settings,
      '{siteIdentity,logo,width}',
      '{"desktop":180,"tablet":160,"mobile":140}'::jsonb
    ),
    '{colors,primary}',
    '{"normal":"#222222","hover":"#1a1a1a"}'::jsonb
  ),
  '{colors,text}',
  '{"normal":"#444444","hover":"#3a3a3a"}'::jsonb
)
WHERE id = 1;
```

**또는 API로 보정**:
```typescript
// 관리자 전용 엔드포인트: PUT /settings/customizer/fix
const fixedSettings = normalizeCustomizerSettings(currentSettings);
await db.update(fixedSettings);
```

**DoD**:
- [x] 커스터마이저 진입 즉시 크래시 0
- [x] 모든 패널 정상 렌더
- [x] 타입 에러 0건

---

### 5) 저장 파이프라인 단순화

**대상**: `apps/admin-dashboard/src/pages/appearance/Customize.tsx`

**조치**:
1. 저장 시 **응답 스냅샷만** 상태에 반영
2. 저장 직후 별도 재조회로 덮어쓰기 **금지**
3. 저장 이벤트 후 페이지 리로드/라우팅 전환 **금지**

**Before**:
```typescript
await authClient.api.put('/settings/customizer', { settings });
await loadSettings(); // ← 재조회로 상태 덮어쓰기 (제거)
```

**After**:
```typescript
const response = await authClient.api.put('/settings/customizer', { settings });
if (response.data?.success) {
  setInitialSettings(normalizeCustomizerSettings(settings)); // 로컬 상태만 업데이트
}
```

**DoD**:
- [x] 저장 직후 UI 상태 즉시 반영
- [x] 새로고침 전까지 동일 상태 유지
- [x] 불필요한 API 호출 0건

---

### 6) 프리뷰 전용 단일 페이지 추가 (선택)

**대상**: `apps/main-site/src/pages/preview/SiteStylePreview.tsx` (신규)

**조치**:
- `/preview/site-style` 페이지 추가 (정적 샘플 섹션만)
- 헤더, 텍스트, 버튼, 링크 등 기본 요소 샘플 배치
- 저장 후 "프론트에서 보기" 버튼 → 새 탭으로 해당 페이지 열기

**DoD**:
- [x] 해당 페이지에서 색상/폰트/간격 즉시 반영 확인 가능
- [x] iFrame 없이 독립 페이지로 작동

---

### 7) 프리뷰 관련 코드 정리 (Phase-1)

**대상**: 미사용 프리뷰 컴포넌트/훅/라우트/스타일/브릿지

**조치**:
- **즉시 삭제** 또는 `/deprecated/preview/`로 이동
- 1회 릴리즈 뒤 영구 삭제 예정

**후보 목록**:
- [ ] 프리뷰 iFrame 로더/라우트
- [ ] 프리뷰 브릿지 훅 (postMessage 핸들러)
- [ ] 프리뷰 전용 스타일/토큰
- [ ] 프리뷰 활성화 플래그 토글 UI

**DoD**:
- [x] 빌드 성공
- [x] 스모크 S1~S3 통과
- [x] 번들 용량 감소 수치 기록

---

## 🔎 스모크 테스트 (10분)

### S1: 사이트정보
- [x] 로고 폭 조정 → 저장 → 강제 새로고침(Ctrl+Shift+R) → 값 유지, 에러 0
- [x] 타이틀 크기 조정 → 저장 → 새로고침 → 값 유지, 에러 0

### S2: 색상
- [x] Primary/Text 변경
- [x] normal/hover 전환 반복
- [x] 저장 → 새로고침 → 값 유지, 에러 0

### S3: 네트워크
- [x] `me|active|customizer` 필터: 폭주/에러 0
- [x] 탭 전환 시 리로드 0회

### S4: 프리뷰 버튼 (있다면)
- [x] 새 탭으로 `/preview/site-style` 열림
- [x] 저장 반영 확인

---

## 📦 머지/배포

### 태그
`customizer-save-stable-v2`

### 병합
```bash
git checkout main
git merge --no-ff feat/customizer-preview-off -m "fix(customizer): Remove iFrame preview + type hardening + cross-origin blocking"
git tag -a customizer-save-stable-v2 -m "Stable customizer save with preview removal"
git push origin main --tags
```

### 배포
```bash
./scripts/deploy-admin-manual.sh
```

### 모니터링 (24h)
- [ ] TypeError 0건
- [ ] 리로드 0건
- [ ] 교차 호출 폭주 0건
- [ ] 저장 실패 0건

---

## 🧹 위험 없이 바로 지워도 되는 후보 (초안)

- [ ] 프리뷰 iFrame 로더/라우트/브릿지 훅 (미사용)
- [ ] 프리뷰 전용 스타일/토큰 (참조 0)
- [ ] 프리뷰용 postMessage 핸들러
- [ ] 프리뷰 활성화용 플래그 토글 UI (당분간 숨김)

---

## 📝 후속 작업 (Phase-2, 필요시)

- [ ] 프리뷰 관련 잔여 코드 최종 삭제
- [ ] 번들 분석 및 최적화
- [ ] 성능 메트릭 수집 (Lighthouse)
- [ ] 사용자 피드백 수집 (24h 후)

---

**최종 업데이트**: 2025-11-09
**담당자**: Claude Code
**상태**: 진행 중
