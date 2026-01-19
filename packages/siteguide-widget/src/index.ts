/**
 * SiteGuide Widget Entry Point
 *
 * @service SiteGuide
 * @domain siteguide.co.kr
 * @audience 외부 사업자 (모든 홈페이지 운영자)
 * @independence Neture 종속 아님 - 독립 서비스
 *
 * 사용법:
 * <script src="https://siteguide.co.kr/widget.js"></script>
 * <script>
 *   SiteGuide.init({ apiKey: 'your-api-key' });
 * </script>
 */

import { SiteGuideWidget } from './widget.js';
import type { SiteGuideConfig, PageContext } from './types.js';

let instance: SiteGuideWidget | null = null;

/**
 * SiteGuide 위젯 초기화
 */
function init(config: SiteGuideConfig): SiteGuideWidget {
  if (instance) {
    console.warn('[SiteGuide] Widget already initialized');
    return instance;
  }

  instance = new SiteGuideWidget(config);
  return instance;
}

/**
 * SiteGuide 위젯 열기
 */
function open(): void {
  instance?.open();
}

/**
 * SiteGuide 위젯 닫기
 */
function close(): void {
  instance?.close();
}

/**
 * SiteGuide 위젯 제거
 */
function destroy(): void {
  instance?.destroy();
  instance = null;
}

// Export for IIFE bundle
export { init, open, close, destroy };
export type { SiteGuideConfig, PageContext };

// Auto-init from data attributes
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const script = document.querySelector('script[data-siteguide-key]');
    if (script) {
      const apiKey = script.getAttribute('data-siteguide-key');
      if (apiKey) {
        init({
          apiKey,
          position: (script.getAttribute('data-position') as SiteGuideConfig['position']) || 'bottom-right',
          theme: (script.getAttribute('data-theme') as SiteGuideConfig['theme']) || 'light',
          primaryColor: script.getAttribute('data-color') || '#3b82f6',
        });
      }
    }
  });
}
