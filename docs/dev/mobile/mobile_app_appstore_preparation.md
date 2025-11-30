# 앱스토어 제출 준비 가이드 (Phase 4)

O4O Mobile App을 Apple App Store와 Google Play Store에 제출하기 위한 필수 작업 가이드입니다.

## ✅ Phase 4 완료 체크리스트

### 필수 작업

- [ ] Bundle ID / Application ID 확정 (`com.o4o.mobile`)
- [ ] 앱 아이콘 제작 및 적용 (1024×1024, 512×512)
- [ ] iOS Info.plist 권한 문구 추가
- [ ] Android 권한 확인
- [ ] 개인정보 처리방침 URL 준비 (`https://neture.co.kr/privacy`)
- [ ] 이용약관 URL 준비 (`https://neture.co.kr/terms`)
- [ ] 스크린샷 촬영 (iOS 6.7", Android 1080×1920)
- [ ] 앱 버전 설정 (1.0.0)
- [ ] Firebase 프로젝트 생성
- [ ] iOS GoogleService-Info.plist 추가
- [ ] Android google-services.json 추가
- [ ] iOS 서명 설정 (Xcode)
- [ ] Android 서명 설정 (Keystore)
- [ ] TestFlight 배포 성공
- [ ] Play Console Internal Testing 배포 성공

## 📋 상세 가이드

자세한 작업 방법은 다음 섹션들을 참고하세요.

### 1. 앱 정보 확정

**Bundle Identifier (iOS):** `com.o4o.mobile`
**Application ID (Android):** `com.o4o.mobile`
**앱 이름:** `O4O Mobile`

### 2. 앱 아이콘 제작

- iOS: 1024×1024 App Store Icon
- Android: 512×512 Play Store Icon
- 디자인: O4O 플랫폼 대표 로고

### 3. iOS 권한 설정

**Info.plist 추가 항목:**

```xml
<key>NSCameraUsageDescription</key>
<string>상품 등록, 리뷰 작성, 프로필 이미지 업로드를 위해 카메라 접근이 필요합니다.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>사진 업로드를 위해 사진첩 접근이 필요합니다.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>방문 인증 및 사용자 위치 기반 기능 제공을 위해 위치 정보가 필요합니다.</string>

<key>NSUserNotificationUsageDescription</key>
<string>주문 상태 알림, 공지사항 전달을 위해 알림 권한이 필요합니다.</string>
```

### 4. 개인정보 처리방침

**필수 URL:**
- 개인정보 처리방침: `https://neture.co.kr/privacy`
- 이용약관: `https://neture.co.kr/terms`
- 지원 페이지: `https://neture.co.kr/support`
- 지원 이메일: `support@neture.co.kr`

### 5. 앱 스크린샷

**촬영할 화면 (7장):**
1. 로그인 화면
2. Neture 홈 화면
3. 마이페이지
4. 드랍쉬핑 판매자 대시보드
5. QR/바코드 스캔 화면
6. 위치 기반 서비스
7. 카메라 촬영 화면

### 6. Firebase 설정

**iOS:**
1. Firebase Console에서 iOS 앱 추가
2. `GoogleService-Info.plist` 다운로드
3. `ios/App/App/` 폴더에 복사

**Android:**
1. Firebase Console에서 Android 앱 추가
2. `google-services.json` 다운로드
3. `android/app/` 폴더에 복사

### 7. 테스트 배포

**iOS TestFlight:**
1. Xcode → Product → Archive
2. Distribute App → App Store Connect
3. TestFlight 테스트 그룹 생성

**Android Internal Testing:**
1. `./gradlew bundleRelease`
2. Play Console → Internal testing
3. AAB 업로드

## 📚 참고 문서

- [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Console](https://support.google.com/googleplay/android-developer)
- [Firebase Documentation](https://firebase.google.com/docs)

---

**작성일:** 2025-11-30
**버전:** 1.0.0
