/** Generation/read cancellation and clipboard feedback. POST saves have a separate lifetime. */
import { useCallback, useLayoutEffect, useRef, type Dispatch } from 'react';
import { blocksToHtml, type UrlBlock } from './ai-content-conversion';
import type {
  AiContentGenerationEvent,
  AiContentResult,
} from './ai-content-generation-state';
import type { AiContentSession } from './useAiContentSession';
interface GenerationOptions {
  apiBaseUrl: string;
  aiRequestHeaders?: Record<string, string>;
  session: AiContentSession;
  dispatch: Dispatch<AiContentGenerationEvent>;
  onStart(): void;
}
type GenerationRequest = {
  epoch: number;
  controller: AbortController;
  timer?: ReturnType<typeof setTimeout>;
};
export function useAiContentGeneration({
  apiBaseUrl,
  aiRequestHeaders,
  session,
  dispatch,
  onStart,
}: GenerationOptions) {
  const active = useRef<GenerationRequest | null>(null);
  const copySequence = useRef(0);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const cancelRequests = useCallback(() => {
    if (active.current) {
      active.current.controller.abort();
      clearTimeout(active.current.timer);
      active.current = null;
    }
    copySequence.current += 1;
    clearTimeout(copyTimer.current);
    copyTimer.current = undefined;
  }, []);
  useLayoutEffect(() => cancelRequests, [cancelRequests]);
  const cancel = useCallback(
    (type: 'closed' | 'source_changed' = 'closed') => {
      cancelRequests();
      dispatch({ type });
    },
    [cancelRequests, dispatch],
  );
  const begin = (url = false): GenerationRequest => {
    cancelRequests();
    session.invalidate();
    onStart();
    const request = {
      epoch: session.capture(),
      controller: new AbortController(),
    } as GenerationRequest;
    if (url)
      request.timer = setTimeout(() => request.controller.abort(), 90000);
    active.current = request;
    dispatch({ type: 'started' });
    return request;
  };
  const current = (request: GenerationRequest) =>
    active.current === request && session.current(request.epoch);
  const finish = (request: GenerationRequest) => {
    clearTimeout(request.timer);
    if (current(request)) {
      active.current = null;
      dispatch({ type: 'finished' });
    }
  };
  const generate = async (body: {
    input: string;
    outputType: string;
    options: { tone: string; length: string };
    customPrompt: string;
  }) => {
    if (!body.input.trim()) {
      dispatch({ type: 'error', error: '변환할 텍스트를 입력해 주세요.' });
      return;
    }
    const request = begin();
    try {
      const response = await fetch(`${apiBaseUrl}/api/ai/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...aiRequestHeaders },
        credentials: 'include',
        signal: request.controller.signal,
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!current(request)) return;
      if (!response.ok || !data.success)
        throw new Error(data.error || 'AI 생성에 실패했습니다.');
      dispatch({
        type: 'result',
        result: {
          html: data.html,
          title: data.title || '',
          summary: data.summary || '',
          usageWarning: data.usageWarning,
        },
      });
    } catch (err: any) {
      if (current(request))
        dispatch({
          type: 'error',
          error: err.message || 'AI 서비스 오류가 발생했습니다.',
        });
    } finally {
      finish(request);
    }
  };
  const generateFromUrl = async (body: {
    url: string;
    tone: string;
    length: string;
    customInstruction: string;
  }) => {
    if (!body.url.trim()) {
      dispatch({ type: 'error', error: 'URL을 입력해 주세요.' });
      return;
    }
    try {
      new URL(body.url.trim());
    } catch {
      dispatch({
        type: 'error',
        error: '올바른 URL 형식이 아닙니다. (예: https://example.com)',
      });
      return;
    }
    const request = begin(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/ai/url-to-blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...aiRequestHeaders },
        credentials: 'include',
        signal: request.controller.signal,
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!current(request)) return;
      if (!response.ok || !data.success)
        throw new Error(data.error || 'URL 콘텐츠 생성에 실패했습니다.');
      if (!data.blocks || data.blocks.length === 0)
        throw new Error(
          '생성된 블록이 없습니다. URL 접근 가능 여부를 확인해 주세요.',
        );
      const html = blocksToHtml(data.blocks);
      if (!html.trim()) throw new Error('HTML 변환 결과가 비어있습니다.');
      const youtubeUrls = (data.blocks as UrlBlock[])
        .filter((b) => b.type === 'o4o/youtube')
        .map((b) => b.attributes?.url || b.attributes?.src || '')
        .filter((u): u is string => Boolean(u));
      dispatch({
        type: 'result',
        result: {
          html,
          title: typeof data.title === 'string' ? data.title : '',
          summary: `${data.blocks.length}개 블록 → HTML 변환 완료`,
          youtubeUrls,
          usageWarning: data.usageWarning,
        },
      });
    } catch (err: any) {
      if (current(request))
        dispatch({
          type: 'error',
          error:
            err?.name === 'AbortError'
              ? 'URL 분석 시간이 초과되었습니다. (90초) 다시 시도하거나 다른 URL을 입력해 주세요.'
              : err.message || 'URL 콘텐츠 생성 중 오류가 발생했습니다.',
        });
    } finally {
      finish(request);
    }
  };
  const copy = async (result: AiContentResult | null) => {
    if (!result) return;
    const epoch = session.capture(),
      sequence = ++copySequence.current;
    clearTimeout(copyTimer.current);
    const valid = () =>
      session.current(epoch) && copySequence.current === sequence;
    try {
      await navigator.clipboard.writeText(result.html);
    } catch {
      if (!valid()) return;
      const el = document.createElement('textarea');
      el.value = result.html;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    if (!valid()) return;
    dispatch({ type: 'copied', copied: true });
    copyTimer.current = setTimeout(() => {
      if (valid()) dispatch({ type: 'copied', copied: false });
    }, 2000);
  };
  return { generate, generateFromUrl, copy, cancel };
}
