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
├── ios/                  # iOS 네이티브 프로젝트
├── android/              # Android 네이티브 프로젝트
├── www/                  # WebView 소스 (빌드 출력)
├── capacitor.config.ts   # Capacitor 설정
└── package.json
```

## 🚀 Phase 1: 초기화 완료 ✅

- [x] Capacitor 프로젝트 생성
- [x] iOS/Android 플랫폼 추가
- [x] 기본 WebView 테스트 화면
- [x] capacitor.config.ts 설정

## 📅 다음 단계 (Phase 2)

- [ ] React 웹 앱 빌드를 www로 연결
- [ ] 네이티브 플러그인 추가 (Camera, Push Notifications, Geolocation)
- [ ] API 서버 CORS 설정 업데이트
- [ ] 실제 O4O 서비스 UI 통합

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
- [Capacitor 공식 문서](https://capacitorjs.com/docs)

---

**작성일:** 2025-11-30
**브랜치:** feature/mobile-app-init
**Status:** Phase 1 완료
