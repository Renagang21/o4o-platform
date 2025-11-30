# O4O Mobile App

O4O Platform의 공식 모바일 애플리케이션 (Capacitor + React)

## 📱 개요

이 앱은 **WebView 기반 하이브리드 앱**으로, O4O Platform의 웹 서비스를 모바일 네이티브 앱으로 제공합니다.

## 🏗️ 기술 스택

- **Capacitor 7.4.4**: WebView 기반 네이티브 앱 프레임워크
- **React 18.2.0**: UI 프레임워크 (재사용)
- **iOS**: Swift + WKWebView
- **Android**: Kotlin + WebView

## 📂 프로젝트 구조

```
apps/mobile-app/
├── ios/                     # iOS 네이티브 프로젝트
├── android/                 # Android 네이티브 프로젝트
├── www/                     # WebView 소스
│   ├── index.html          # 메인 화면
│   └── app-settings.html   # 앱 설정 화면
├── src/                     # TypeScript 소스
│   ├── plugins/            # 네이티브 플러그인 래퍼
│   │   ├── camera.ts
│   │   ├── push.ts
│   │   ├── geolocation.ts
│   │   ├── barcode.ts
│   │   └── filesystem.ts
│   ├── bridge/
│   │   └── mobileBridge.ts
│   └── main.ts
├── capacitor.config.ts
└── package.json
```

## 🚀 Phase 1: 초기화 완료 ✅

- [x] Capacitor 프로젝트 생성
- [x] iOS/Android 플랫폼 추가
- [x] 기본 WebView 테스트 화면
- [x] capacitor.config.ts 설정

## 🚀 Phase 3: 네이티브 기능 통합 완료 ✅

- [x] 네이티브 플러그인 설치 (Camera, Push, GPS, Barcode, Filesystem)
- [x] 플러그인 래퍼 구현
- [x] 웹 ↔ 네이티브 브릿지 구현
- [x] window.O4O.mobile API 노출
- [x] 앱 설정 화면 구현
- [x] 권한 관리 기능

## 🚀 Phase 4: 앱스토어 제출 준비 (진행 중)

- [ ] 앱 아이콘 제작 및 적용
- [ ] iOS 권한 문구 설정
- [ ] 개인정보 처리방침 URL 준비
- [ ] 앱 스크린샷 촬영
- [ ] Firebase 설정
- [ ] iOS 서명 설정
- [ ] TestFlight 배포
- [ ] Play Console Internal Testing 배포

## 📱 네이티브 API 사용법

```javascript
// 카메라 촬영
const image = await window.O4O.mobile.camera.takePhoto();

// 위치 조회
const location = await window.O4O.mobile.location.getSimpleLocation();

// QR 코드 스캔
const result = await window.O4O.mobile.barcode.scanQR();

// 푸시 알림 초기화
await window.O4O.mobile.push.init(
  (token) => console.log('FCM Token:', token)
);
```

## 🛠️ 개발 명령어

```bash
# iOS/Android 동기화
pnpm run sync

# iOS 앱 열기 (macOS 필요)
pnpm run open:ios

# Android 앱 열기
pnpm run open:android
```

## 📖 참고 문서

- [모바일 앱 개발 조사 보고서](../../docs/dev/mobile/mobile_app_investigation_report.md)
- [앱스토어 제출 준비 가이드](../../docs/dev/mobile/mobile_app_appstore_preparation.md)
- [Capacitor 공식 문서](https://capacitorjs.com/docs)
- [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)

## 📋 Phase 4 작업 가이드

Phase 4는 대부분 Xcode와 Android Studio에서 직접 작업해야 합니다.
자세한 내용은 [앱스토어 제출 준비 가이드](../../docs/dev/mobile/mobile_app_appstore_preparation.md)를 참고하세요.

### 필수 작업

1. **앱 아이콘 제작** (1024×1024, 512×512)
2. **iOS 권한 설정** (Info.plist 수정)
3. **개인정보 처리방침** (URL 준비)
4. **스크린샷 촬영** (각 플랫폼별 7장)
5. **Firebase 설정** (GoogleService-Info.plist, google-services.json)
6. **서명 설정** (Apple Developer, Android Keystore)
7. **테스트 배포** (TestFlight, Play Console)

### 다음 단계 (Phase 5)

- [ ] 앱스토어 정식 심사 제출
- [ ] 앱 메타데이터 작성
- [ ] 심사 대응
- [ ] 정식 출시

---

**작성일:** 2025-11-30
**브랜치:** feature/mobile-app-phase4
**Status:** Phase 4 진행 중 (앱스토어 제출 준비)
