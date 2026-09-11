/**
 * Windows Chrome 설치 감지 (§32)
 *
 * WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0 §2·§6·§32
 *
 * 웹 자동화의 기준 브라우저는 Google Chrome 하나다(§2). 이 모듈은 "Chrome 이 이 PC 에
 * 설치되어 있는가" 만 판정한다. **전체 프로그램을 훑지 않는다**(§32) — 레지스트리의
 * `App Paths\chrome.exe` 한 곳(먼저 HKCU, 없으면 HKLM)만 읽고, 없으면 알려진 설치
 * 위치 두 곳의 존재만 확인한다. Edge·Firefox·Safari 는 감지 대상이 아니다(§2).
 *
 * 부작용을 테스트에서 떼어 내기 위해 실제 조회는 주입 가능한 prober 로 분리했다.
 * prober 는 순수 판정에 필요한 최소 사실(레지스트리 값 존재 / 파일 존재)만 돌려준다.
 */

/**
 * @typedef {object} ChromeProbe
 * @property {() => boolean} appPathsHasChrome  레지스트리 App Paths\chrome.exe 존재 여부
 * @property {(p: string) => boolean} fileExists 알려진 설치 경로 존재 여부
 */

/** 알려진 기본 설치 위치 (§32 — 전량 스캔 대신 이 두 곳만 본다). */
export const KNOWN_CHROME_PATHS = Object.freeze([
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]);

/**
 * 순수 판정. prober 가 주는 사실만으로 설치 여부를 결정한다.
 * @param {ChromeProbe} probe
 * @returns {boolean}
 */
export function detectChromeInstalled(probe) {
  if (probe.appPathsHasChrome()) return true;
  return KNOWN_CHROME_PATHS.some((p) => probe.fileExists(p));
}

/**
 * 실제 Windows prober. 레지스트리 한 키 + 파일 존재만 본다.
 * `reg query` 는 값이 없으면 비정상 종료 코드를 준다 — 그것을 "없음" 으로 읽는다.
 */
export function makeWindowsChromeProbe({ execFileSync, fs } = {}) {
  return {
    appPathsHasChrome() {
      if (!execFileSync) return false;
      const key = 'SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe';
      for (const root of ['HKCU', 'HKLM']) {
        try {
          execFileSync('reg', ['query', `${root}\\${key}`], { stdio: 'ignore' });
          return true;
        } catch {
          // 이 root 에 없음 — 다음 root 확인
        }
      }
      return false;
    },
    fileExists(p) {
      if (!fs) return false;
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    },
  };
}
