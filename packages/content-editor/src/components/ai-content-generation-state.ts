/** Internal modal state: grouped transitions, no requests or permission decisions. */
// WO-O4O-AI-USAGE-CONDITION-DETECTION-UX-V1
interface UsageWarning {
  detected: boolean;
  categories: string[];
  snippets: string[];
}

export interface AiContentResult {
  html: string;
  title: string;
  summary: string;
  /**
   * WO-O4O-AI-CONTENT-EDITOR-YOUTUBE-COMMAND-INSERT-V1:
   *   o4o/youtube 블록의 URL 목록.
   *   setContent 경로는 TipTap parseHTML 매칭 한계로 youtube embed 를 drop 하므로,
   *   handleInsert 에서 별도로 editor.commands.setYoutubeVideo({src}) 로 삽입한다.
   *   미리보기(blocksToHtml)에는 youtube wrapper 가 그대로 포함되므로 시각적 일관성 유지.
   */
  youtubeUrls?: string[];
  /** WO-O4O-AI-USAGE-CONDITION-DETECTION-UX-V1: 원문 이용조건 감지 결과 */
  usageWarning?: UsageWarning;
}

export interface AiContentGenerationState {
  loading: boolean;
  result: AiContentResult | null;
  error: string;
  resultTab: 'preview' | 'html';
  copied: boolean;
  showUsageSnippets: boolean;
}
export type AiContentGenerationEvent =
  | { type: 'started' }
  | { type: 'result'; result: AiContentResult }
  | { type: 'error'; error: string }
  | { type: 'finished' }
  | { type: 'result_tab'; tab: 'preview' | 'html' }
  | { type: 'copied'; copied: boolean }
  | { type: 'usage_snippets' }
  | { type: 'source_changed' }
  | { type: 'closed' };
export const INITIAL_GENERATION_STATE: AiContentGenerationState = {
  loading: false,
  result: null,
  error: '',
  resultTab: 'preview',
  copied: false,
  showUsageSnippets: false,
};
export function aiContentGenerationReducer(
  state: AiContentGenerationState,
  event: AiContentGenerationEvent,
): AiContentGenerationState {
  switch (event.type) {
    case 'started':
      return {
        ...state,
        loading: true,
        error: '',
        result: null,
        copied: false,
      };
    case 'result':
      return { ...state, result: event.result, resultTab: 'preview' };
    case 'error':
      return { ...state, error: event.error };
    case 'finished':
      return { ...state, loading: false };
    case 'result_tab':
      return { ...state, resultTab: event.tab };
    case 'copied':
      return { ...state, copied: event.copied };
    case 'usage_snippets':
      return { ...state, showUsageSnippets: !state.showUsageSnippets };
    case 'source_changed':
      return { ...state, loading: false, result: null, error: '' };
    case 'closed':
      return {
        ...state,
        loading: false,
        result: null,
        error: '',
        copied: false,
        showUsageSnippets: false,
      };
  }
}
