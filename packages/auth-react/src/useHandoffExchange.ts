import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  clearStoredTokens,
  exchangeHandoffToken,
  storeTokens,
} from '@o4o/auth-client';
import {
  buildHandoffDestination,
  resolveHandoffReturnTo,
} from '@o4o/auth-utils';

interface Options {
  apiBaseUrl: string;
  basename?: string;
  missingTokenMessage?: string;
  networkErrorMessage?: string;
}
export type HandoffExchangeState =
  | { status: 'loading'; returnTo: string }
  | { status: 'success'; returnTo: string }
  | {
      status: 'error';
      returnTo: string;
      code: string;
      message: string;
      data: unknown;
    };

/** One exchange per mounted receiver, including StrictMode effect replay. UI stays service-owned. */
export function useHandoffExchange(
  options: Readonly<Options>,
): HandoffExchangeState {
  const initial = useRef({
    ...options,
    params: new URLSearchParams(window.location.search),
  });
  const returnTo = useRef(
    resolveHandoffReturnTo(
      initial.current.params.get('returnTo'),
      window.location.origin,
    ),
  ).current;
  const started = useRef(false);
  const cleared = useRef(false);
  const mounted = useRef(false);
  const [state, setState] = useState<HandoffExchangeState>({
    status: 'loading',
    returnTo,
  });

  useLayoutEffect(() => {
    if (!cleared.current) {
      cleared.current = true;
      clearStoredTokens();
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const cfg = initial.current;
    const token = cfg.params.get('token');
    if (!token) {
      setState({
        status: 'error',
        returnTo,
        code: '',
        data: null,
        message:
          cfg.missingTokenMessage ??
          '이동 정보가 없습니다. 다시 시도해 주세요.',
      });
      return;
    }
    void (async () => {
      try {
        const response = await exchangeHandoffToken(cfg.apiBaseUrl, token);
        const data = await response.json().catch(() => null);
        if (!mounted.current) return;
        const tokens = data?.data?.tokens;
        if (response.ok && data?.success && tokens?.accessToken) {
          storeTokens({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          });
          setState({ status: 'success', returnTo });
          window.location.replace(
            buildHandoffDestination(
              returnTo,
              window.location.origin,
              cfg.basename ?? '',
            ),
          );
          return;
        }
        setState({
          status: 'error',
          returnTo,
          data,
          code: typeof data?.code === 'string' ? data.code : '',
          message:
            typeof data?.error === 'string'
              ? data.error
              : '서비스 이동에 실패했습니다.',
        });
      } catch {
        if (mounted.current)
          setState({
            status: 'error',
            returnTo,
            data: null,
            code: '',
            message:
              cfg.networkErrorMessage ??
              '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
          });
      }
    })();
  }, [returnTo]);
  return state;
}
