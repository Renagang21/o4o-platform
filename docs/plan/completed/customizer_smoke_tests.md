# Customizer 스모크 테스트 체크리스트

**목적**: 저장 기능 안정성 검증 (프리뷰 OFF → ON 단계별)

---

## S1: 저장 일관성 테스트 (프리뷰 OFF)

### 목표
- 설정 저장 후 새로고침 시 값 유지 확인
- 네트워크 폭주 및 리로드 없음 확인

### 절차
1. Admin 로그인
2. `/admin/customize` 진입
3. **프리뷰 OFF 확인** (iframe 로드 안됨)
4. 다음 설정 변경:
   - 사이트 타이틀: "Test Site [타임스탬프]"
   - 로고 너비: 150px
   - Primary Color: #FF5733
5. "저장" 버튼 클릭
6. **Chrome DevTools Network 탭 확인**:
   - [ ] PUT `/api/v1/settings/customizer` 요청 1회
   - [ ] 응답 200 OK
   - [ ] `/me` 호출 ≤ 3회
   - [ ] 페이지 리로드 0회
7. 강제 새로고침 (Ctrl+Shift+R)
8. 설정값 확인:
   - [ ] 사이트 타이틀 유지
   - [ ] 로고 너비 유지
   - [ ] Primary Color 유지

### 합격 기준
- ✅ 2/2 저장/로드 성공
- ✅ `/me` 실패율 0%
- ✅ 리로드 0회
- ✅ Console 에러 0건

---

## S2: 동시성 테스트 (프리뷰 OFF)

### 목표
- 여러 탭에서 동시 저장 시 데이터 무결성 확인

### 절차
1. 탭 A: `/admin/customize` 진입
2. 탭 B: `/admin/customize` 진입 (같은 계정)
3. 탭 A에서 사이트 타이틀 변경: "Tab A Title"
4. 탭 B에서 사이트 타이틀 변경: "Tab B Title"
5. 탭 A 저장 → 5초 대기
6. 탭 B 저장
7. 두 탭 모두 강제 새로고침
8. 최종 값 확인

### 합격 기준
- ✅ 최종값 = 마지막 저장값 ("Tab B Title")
- ✅ 두 탭 모두 동일한 값 표시
- ✅ 중복 저장 없음
- ✅ 충돌 에러 없음

---

## S3: 실패 경로 품질 테스트 (프리뷰 OFF)

### 목표
- API 실패/네트워크 에러 시 적절한 처리 확인

### 시나리오 3-1: API 500 에러
1. **Chrome DevTools → Network → Request blocking 활성화**
2. 차단 URL 추가: `*/settings/customizer*` (500 응답 강제)
3. 설정 변경 → 저장 시도
4. 확인:
   - [ ] 토스트 에러 메시지 표시
   - [ ] 페이지 리로드 없음
   - [ ] 편집 내용 유지 (폼 리셋 안됨)
   - [ ] Console에 적절한 로그
   - [ ] Sentry 에러 전송 (있다면)

### 시나리오 3-2: 네트워크 오프라인
1. **Chrome DevTools → Network → Offline 모드**
2. 설정 변경 → 저장 시도
3. 확인:
   - [ ] "네트워크 연결을 확인하세요" 안내
   - [ ] 페이지 리로드 없음
   - [ ] 재시도 안내 표시

### 시나리오 3-3: 유효성 검증 실패 (400)
1. Console에서 강제로 잘못된 데이터 전송:
   ```javascript
   // 숫자 키가 포함된 데이터
   fetch('/api/v1/settings/customizer', {
     method: 'PUT',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ settings: { "0": "invalid" } })
   })
   ```
2. 확인:
   - [ ] 400 에러 응답
   - [ ] "잘못된 데이터" 안내
   - [ ] 페이지 리로드 없음

### 합격 기준
- ✅ 모든 실패 시나리오에서 리로드 없음
- ✅ 사용자 친화적 에러 메시지
- ✅ 편집 내용 보존
- ✅ 복구 가이드 제공 (있다면)

---

## S4: 프리뷰 ON 회귀 테스트 (v2 전용)

### 목표
- 프리뷰 활성화 후에도 저장 기능 정상 유지

### 절차
1. **프리뷰 ON 활성화** (환경변수/플래그)
2. `/admin/customize` 진입
3. iframe 로드 확인
4. **Network 탭 모니터링 시작** (5분간)
5. 설정 변경 (사이트 타이틀)
6. 저장 버튼 클릭
7. 새로고침 → 값 유지 확인

### 확인 사항
- [ ] iframe 로드 성공
- [ ] `/me` 호출 ≤3회 (iframe 내부에서만)
- [ ] 상위창 (admin)에서 `/me` 호출 0회
- [ ] 무한 루프 0회
- [ ] 리로드 0회
- [ ] 저장 성공
- [ ] TypeError 0건

### Chrome DevTools Initiator 추적
- `/me` 요청 선택 → Initiator 탭 확인
- 호출 파일: `index-[hash].js` (neture.co.kr)
- 호출 위치: AuthContext.tsx `checkAuthStatus`
- **상위창(admin) 스크립트에서 호출 없음 확인**

### 합격 기준
- ✅ S1, S2, S3 모두 통과
- ✅ iframe 내부에서만 인증 체크
- ✅ 재시도 ≤3회 후 중단
- ✅ 무한 루프 없음

---

## 📊 테스트 결과 보고 양식

### 테스트 실행 정보
- 실행자: [이름]
- 실행일시: YYYY-MM-DD HH:MM
- 브랜치: stabilize/customizer-save
- 커밋: [hash]
- 프리뷰 상태: OFF / ON

### 결과 요약
| 테스트 | 결과 | 실패 사유 | 재시도 | 최종 |
|--------|------|-----------|--------|------|
| S1 저장 일관성 | Pass/Fail | - | - | - |
| S2 동시성 | Pass/Fail | - | - | - |
| S3-1 500 에러 | Pass/Fail | - | - | - |
| S3-2 오프라인 | Pass/Fail | - | - | - |
| S3-3 유효성 실패 | Pass/Fail | - | - | - |
| S4 프리뷰 ON | Pass/Fail | - | - | - |

### 네트워크 지표
- `/me` 호출 건수: N회
- `/active` 호출 건수: N회
- 리로드 발생: N회
- Console 에러: N건

### 스크린샷
- [ ] Network 탭 (전체 요청 목록)
- [ ] Console 탭 (에러 로그)
- [ ] 저장 성공 토스트
- [ ] 새로고침 후 값 유지 화면

### 태그 생성 조건
- S1, S2, S3 모두 Pass → `customizer-save-v1` 생성
- S1~S4 모두 Pass → `customizer-save-v2` 생성

---

## 🔄 회귀 시 액션

### v1 실패 시
1. 현재 브랜치 롤백
2. 원인 분석 후 재작업
3. 재테스트

### v2 실패 시
1. `customizer-save-v1` 태그로 롤백
2. 프리뷰 OFF 유지
3. 프리뷰 로직 재설계

---

**다음 단계**: 테스트 통과 후 production 배포
