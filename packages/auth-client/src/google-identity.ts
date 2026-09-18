/**
 * Google Identity Services(GIS) 로더 — WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 (WO-2D)
 *
 * 브라우저에서 `https://accounts.google.com/gsi/client` 를 1회 로드하고 Google 버튼을 렌더한다.
 * 결과는 **ID token(credential) 문자열**뿐이며, 검증·조회·세션은 전부 서버(/auth/google/*)가 한다.
 * React 에 의존하지 않는다(admin-dashboard · auth-react 가 함께 쓴다). secret 은 없다 — Client ID 는 공개값.
 */

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: { credential?: string; select_by?: string }) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  ux_mode?: 'popup' | 'redirect';
  itp_support?: boolean;
  use_fedcm_for_prompt?: boolean;
}

export interface GoogleButtonConfiguration {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number | string;
  locale?: string;
}

interface GoogleAccountsId {
  initialize(config: GoogleIdConfiguration): void;
  renderButton(parent: HTMLElement, options: GoogleButtonConfiguration): void;
  prompt(): void;
  cancel(): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

let loadPromise: Promise<GoogleAccountsId> | null = null;

/** GIS 스크립트를 1회 로드한다. SSR/비브라우저에서는 reject. */
export function loadGoogleIdentityScript(): Promise<GoogleAccountsId> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Google Identity Services requires a browser environment'));
  }
  const existing = window.google?.accounts?.id;
  if (existing) return Promise.resolve(existing);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<GoogleAccountsId>((resolve, reject) => {
    const finish = () => {
      const id = window.google?.accounts?.id;
      if (id) resolve(id);
      else reject(new Error('Google Identity Services failed to initialize'));
    };
    const current = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (current) {
      current.addEventListener('load', finish, { once: true });
      current.addEventListener('error', () => reject(new Error('Google Identity Services script failed to load')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = finish;
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Google Identity Services script failed to load'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

export interface RenderGoogleButtonOptions {
  clientId: string;
  container: HTMLElement;
  /** Google 이 돌려준 ID token. 서버 검증 전이므로 그대로 /auth/google/* 에 넘기기만 한다. */
  onCredential: (idToken: string) => void;
  onError?: (error: Error) => void;
  button?: GoogleButtonConfiguration;
}

/**
 * 컨테이너에 Google 버튼을 렌더한다. 여러 화면이 같은 clientId 로 다시 initialize 해도 GIS 는 마지막 callback 을 쓴다 —
 * 모달을 열 때마다 호출해도 안전하다. 반환값은 정리 함수(컨테이너 비우기).
 */
export async function renderGoogleButton(options: RenderGoogleButtonOptions): Promise<() => void> {
  const { clientId, container, onCredential, onError, button } = options;
  try {
    const id = await loadGoogleIdentityScript();
    id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) onCredential(response.credential);
        else onError?.(new Error('Google credential missing'));
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true,
    });
    container.innerHTML = '';
    id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      locale: 'ko',
      width: container.clientWidth > 0 ? Math.min(container.clientWidth, 400) : undefined,
      ...button,
    });
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
  return () => { container.innerHTML = ''; };
}
