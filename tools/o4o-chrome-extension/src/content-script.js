/**
 * Content Script — 등록 전용 (§10·§46·§47·§55)
 *
 * WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0
 *
 * 이 content script 는 **DOM executor 가 아니다.** 검색·클릭·입력·값 추출·form submit 을
 * 하지 않는다(§46·§47 — 그것은 WO-O4O-BROWSER-DOM-CONTROL-V0 로 넘긴다). 이번 WO 에서
 * content script 의 역할은 오직 "이 등재 site 탭에 O4O 확장이 붙어 있다" 는 사실을 알리는
 * 것뿐이다(§10 registration-only).
 *
 * 페이지 내용을 읽지 않는다. document.title·body·form·쿠키·localStorage 어느 것도 만지지
 * 않는다(§18·§45·§55). location.origin 만으로 등재 여부를 판정해 service worker 에 알린다.
 * matches 는 manifest 에서 https://neture.co.kr/* 로 좁혀져 있어 임의 URL 에서 돌지 않는다(§22).
 */

(() => {
  // 등재 origin 사실만 계산한다. 값(전체 URL·query·경로)은 보내지 않는다(§55).
  const origin = location.origin;
  const isNeture = origin === 'https://neture.co.kr';
  try {
    chrome.runtime.sendMessage({
      action: 'content.registered',
      origin, // 등재 판정에 쓰는 origin 뿐 — query·path·내용 없음
      isRegisteredSite: isNeture,
    });
  } catch {
    // service worker 미기동 등은 무시 — content script 는 관측만 하고 아무 것도 강제하지 않는다.
  }
})();
