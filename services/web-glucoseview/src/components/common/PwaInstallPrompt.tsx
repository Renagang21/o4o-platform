/**
 * PwaInstallPrompt — PWA 설치 안내 배너
 * WO-GLUCOSEVIEW-PWA-ENABLE-V1
 *
 * beforeinstallprompt 이벤트 감지 → 상단 배너 표시.
 * 사용자가 설치하거나 닫으면 숨김.
 */

import { useState, useEffect, useCallback } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Skip if already installed as standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Check if user previously dismissed
    if (sessionStorage.getItem('pwa-install-dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  }, []);

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-3 min-w-0">
        <Download className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium truncate">
          홈 화면에 추가하여 앱처럼 사용하세요
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleInstall}
          className="px-4 py-1.5 text-sm font-medium bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
        >
          설치
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-blue-500 rounded transition-colors"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
