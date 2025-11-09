# Phase 2: 어댑터 우회 경로 인벤토리

**작성일**: 2025-11-09
**브랜치**: stabilize/customizer-save

---

## 🎯 목적

어댑터(`normalizeCustomizerSettings`)를 우회하는 직접 주입 경로를 발견하고 수정

---

## 📋 발견된 우회 경로

### ❌ BYPASS-01: 초기화 버튼 (SimpleCustomizer.tsx)

**파일**: `apps/admin-dashboard/src/pages/appearance/astra-customizer/SimpleCustomizer.tsx`
**라인**: 257-262

**현재 코드**:
```typescript
const handleReset = () => {
  if (window.confirm('모든 설정을 기본값으로 되돌리시겠습니까?')) {
    setSettings(getDefaultSettings());  // ❌ 어댑터 우회!
    setIsDirty(true);
  }
};
```

**문제**:
- `getDefaultSettings()`를 직접 호출해서 스토어에 주입
- `normalizeCustomizerSettings`를 거치지 않음
- `getDefaultSettings()`가 반환하는 기본값이 스키마를 보장하지 않음
- 특히 `columns`가 숫자 형태일 경우, UI에서 `{desktop, tablet, mobile}` 객체를 기대하고 접근할 때 **TypeError 발생**

**영향**:
- **BUG-02의 주요 원인**: `TypeError: ... reading 'desktop'`
- 초기화 버튼 클릭 시 타입 불일치 발생
- 3분기 객체 형태 미보장

**조치 필요**: ✅ 긴급

**수정 방향**:
```typescript
const handleReset = () => {
  if (window.confirm('모든 설정을 기본값으로 되돌리시겠습니까?')) {
    const defaults = getDefaultSettings();
    const normalized = normalizeCustomizerSettings(defaults);  // ✅ 어댑터 경유
    setSettings(normalized);
    setIsDirty(true);
  }
};
```

---

### ✅ PASS-01: 프리셋 적용 (PresetManager.tsx)

**파일**: `apps/admin-dashboard/src/pages/appearance/astra-customizer/components/PresetManager.tsx`
**라인**: 90-121

**현재 플로우**:
```
프리셋 적용 버튼 클릭
  → PresetManager.handleApplyPreset()
  → API POST /customizer-presets/{id}/apply (서버에서 처리)
  → onPresetApplied() 콜백
  → Customize.loadSettings() (재조회)
  → normalizeCustomizerSettings(응답) ✅
  → setInitialSettings
```

**판정**: ✅ **안전** - 서버 API로 처리 후 재조회, 어댑터 경유 확인됨

---

### ✅ PASS-02: 설정 로드 (Customize.tsx)

**파일**: `apps/admin-dashboard/src/pages/appearance/Customize.tsx`
**라인**: 50-77

**현재 플로우**:
```typescript
const loadSettings = async () => {
  try {
    setIsLoading(true);
    const response = await authClient.api.get('/settings/customizer');

    if (response.data?.success && response.data?.data) {
      const rawData = response.data.data;
      const settingsData = rawData.settings || rawData;

      // normalize 함수가 AstraCustomizerSettings 반환
      const normalized = normalizeCustomizerSettings(settingsData);  // ✅ 어댑터 경유
      setInitialSettings(normalized);
    } else {
      setInitialSettings(normalizeCustomizerSettings(null));  // ✅ 어댑터 경유
    }
  } catch (error: any) {
    setInitialSettings(normalizeCustomizerSettings(null));  // ✅ 어댑터 경유
    errorHandler.handleApiError(error, 'Settings Load');
  } finally {
    setIsLoading(false);
  }
};
```

**판정**: ✅ **안전** - 모든 경로에서 어댑터 경유 확인됨

---

### ✅ PASS-03: 설정 저장 (Customize.tsx)

**파일**: `apps/admin-dashboard/src/pages/appearance/Customize.tsx`
**라인**: 85-144

**현재 플로우** (Phase 4에서 수정 완료):
```typescript
const handleSave = async (settings: any) => {
  try {
    // Normalize settings: sanitize numeric keys + convert legacy formats + merge defaults
    const normalized = normalizeCustomizerSettings(settings);  // ✅ 어댑터 경유

    const response = await authClient.api.put('/settings/customizer', {
      settings: normalized
    });
    // ...
  }
};
```

**판정**: ✅ **안전** - Phase 4에서 이미 수정 완료

---

### ✅ PASS-04: 프리셋 롤백 (PresetManager.tsx)

**파일**: `apps/admin-dashboard/src/pages/appearance/astra-customizer/components/PresetManager.tsx`
**라인**: 123-151

**현재 플로우**:
```
롤백 버튼 클릭
  → PresetManager.handleRollback()
  → API POST /customizer-presets/rollback (서버에서 처리)
  → onPresetApplied() 콜백
  → Customize.loadSettings() (재조회)
  → normalizeCustomizerSettings(응답) ✅
  → setInitialSettings
```

**판정**: ✅ **안전** - 서버 API로 처리 후 재조회, 어댑터 경유 확인됨

---

## 📊 인벤토리 요약

| 경로 | 파일 | 라인 | 판정 | 조치 필요 |
|------|------|------|------|-----------|
| 초기화 | SimpleCustomizer.tsx | 257-262 | ❌ **우회** | ✅ **긴급** |
| 프리셋 적용 | PresetManager.tsx | 90-121 | ✅ 안전 | - |
| 설정 로드 | Customize.tsx | 50-77 | ✅ 안전 | - |
| 설정 저장 | Customize.tsx | 85-144 | ✅ 안전 | - |
| 프리셋 롤백 | PresetManager.tsx | 123-151 | ✅ 안전 | - |

**총 발견**: 5개 경로
**우회 경로**: **1개** (초기화 버튼)
**안전 경로**: 4개

---

## 🔧 조치 계획

### BYPASS-01 수정

**파일**: `apps/admin-dashboard/src/pages/appearance/astra-customizer/SimpleCustomizer.tsx`

**수정 전**:
```typescript
const handleReset = () => {
  if (window.confirm('모든 설정을 기본값으로 되돌리시겠습니까?')) {
    setSettings(getDefaultSettings());
    setIsDirty(true);
  }
};
```

**수정 후**:
```typescript
const handleReset = () => {
  if (window.confirm('모든 설정을 기본값으로 되돌리시겠습니까?')) {
    const defaults = getDefaultSettings();
    const normalized = normalizeCustomizerSettings(defaults);
    setSettings(normalized);
    setIsDirty(true);
  }
};
```

**필요한 import**:
```typescript
import { normalizeCustomizerSettings } from './utils/normalize-settings';
```

---

## 🧪 검증 계획

수정 후 다음 테스트 실행:

### 테스트 1: 초기화 후 타입 안전성
1. Customizer 진입
2. 일부 설정 변경
3. "초기화" 버튼 클릭
4. **확인**: TypeError 0건
5. **확인**: `footer.widgets.columns`가 `{desktop, tablet, mobile}` 형태

### 테스트 2: 초기화 후 저장-재로드
1. "초기화" 버튼 클릭
2. "저장" 버튼 클릭
3. 페이지 새로고침
4. **확인**: 기본값 유지
5. **확인**: Console 에러 0건

### 테스트 3: 초기화 반복
1. 설정 변경 → 초기화 → 저장 (10회 반복)
2. **확인**: TypeError 0건
3. **확인**: 메모리 누수 없음

---

## 📝 Phase 2 완료 기준 (DoD)

- [x] 프리셋 적용 경로 확인: ✅ 안전
- [x] 초기화 경로 확인: ❌ 우회 발견
- [x] 로드 경로 확인: ✅ 안전
- [x] 저장 경로 확인: ✅ 안전
- [ ] BYPASS-01 수정 완료
- [ ] 검증 테스트 1-3 Pass

---

**다음 작업**: BYPASS-01 수정 → 검증 테스트 실행
