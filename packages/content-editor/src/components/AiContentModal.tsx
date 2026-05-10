/**
 * AiContentModal — AI 콘텐츠 변환 모달
 *
 * WO-AI-CONTENT-TRANSFORM-IMPLEMENTATION-V1
 * WO-AI-CONTENT-EDITOR-POLISH-V1
 * WO-STORE-AI-CONTENT-ASSIST-V1
 * WO-O4O-RICHTEXT-AI-URL-IMPORT-V1
 *
 * 사용자가 텍스트를 붙여넣으면 AI가 HTML 형식으로 변환/요약/정리.
 * 또는 URL을 입력하면 AI가 해당 페이지 콘텐츠를 HTML로 변환.
 * 결과를 에디터에 직접 삽입.
 *
 * - 인증: credentials: 'include' (쿠키 기반 fallback) + aiRequestHeaders prop (Bearer 토큰 등 명시 주입)
 * - 삽입: editor.commands.setContent(html) → TipTap onUpdate → onChange 자동 트리거
 * - 모드: 고객용 문장 정리 / 짧게 요약 / POP용 정리 / 제목 추천
 */

import { useState } from 'react';
import type { Editor } from '@tiptap/react';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
  'https://api.neture.co.kr';

interface AiContentResult {
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
}

interface AiContentModalProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
  /**
   * WO-O4O-LMS-LESSON-AI-ASSIST-V1: 삽입 시점에 결과(html / title / sourceUrl)를 추가로 활용.
   * - 호출 시점: editor.commands.setContent(html) 직후, handleClose() 직전
   * - editor 가 null 이어도 onInsert 가 있으면 결과 전달 (LessonModal 처럼 외부 form state 로 받는 케이스)
   * - 기존 사용처(Toolbar)는 onInsert 미전달 — 영향 없음
   */
  onInsert?: (data: { html: string; title: string; sourceUrl?: string }) => void;
  /**
   * WO-O4O-CONTENT-EDITOR-AI-AUTH-HEADERS-V1: AI API 요청 추가 헤더.
   * - Content-Type: application/json에 병합됨 (Authorization: Bearer 등)
   * - 미제공 시 credentials: 'include' fallback만 사용
   */
  aiRequestHeaders?: Record<string, string>;
  /**
   * WO-O4O-AI-CONTENT-AUTO-CHANNEL-SAVE-V1: AI 결과를 채널(product_ai_contents 등)에 저장.
   * - 호출 시점: "채널에 저장" 버튼 클릭 시
   * - 미제공 시 버튼 미표시 (선택적 기능)
   * - 반환값: { success, fieldLabel?, error? } — fieldLabel은 저장 성공 메시지에 표시
   */
  onChannelSave?: (data: {
    outputType: string;
    html: string;
    title: string;
    summary: string;
    mode: AiMode;
  }) => Promise<{ success: boolean; fieldLabel?: string; error?: string }>;
  /**
   * WO-O4O-AI-CONTENT-COMMUNITY-SAVE-INTEGRATION-V1: AI 결과를 커뮤니티(포럼)에 저장.
   * - true 시 "커뮤니티 저장" 버튼 표시 + 인라인 저장 패널 활성화
   * - 미제공(undefined/false) 시 버튼 미표시
   */
  showCommunitySave?: boolean;
  /**
   * WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1: AI 결과를 내 매장 콘텐츠로 저장.
   * - true 시 "내 매장 저장" 버튼 표시 + 인라인 저장 패널 활성화
   * - API 403 → store owner 아닌 경우 오류 메시지 표시
   * - 미제공(undefined/false) 시 버튼 미표시
   */
  showStoreSave?: boolean;
  /**
   * WO-O4O-AI-LESSON-FLOW-FIX-V1: 헤더/입력 라벨 LMS 문맥 오버라이드.
   * - 미제공 시 기존 기본값("AI 콘텐츠 정리", "https://example.com/article") 유지
   * - LMS 레슨 초안 진입처에서 "AI 레슨 초안 만들기" 등으로 명시
   */
  headerLabel?: string;
  urlPlaceholder?: string;
  /**
   * WO-O4O-AI-LESSON-INITIAL-URL-TAB-UX-FIX-V1: 모달 첫 진입 시 활성 탭.
   * - 미제공 시 기존 동작 유지 ('text' 모드로 시작)
   * - LMS 레슨 초안처럼 URL/유튜브 진입이 기본인 경우 'url' 지정
   * - 사용자가 탭을 전환하면 그 이후로는 사용자 선택을 유지 (re-mount 시점에만 적용)
   */
  initialSourceTab?: 'text' | 'url';
}

type AiMode = 'customer_rewrite' | 'summary' | 'pop' | 'title_suggest';
type ToneOption = 'friendly' | 'professional' | 'concise';
type LengthOption = 'short' | 'medium' | 'long';
type ResultTab = 'preview' | 'html';
type SourceTab = 'text' | 'url';
type UrlTone = 'normal' | 'professional' | 'store';
type UrlContentType = 'document' | 'explain';

interface UrlBlock {
  id?: string;
  type: string;
  content?: string;
  attributes?: Record<string, any>;
  innerBlocks?: UrlBlock[];
}

const MODE_CONFIG: { key: AiMode; label: string; outputType: string; desc: string }[] = [
  { key: 'customer_rewrite', label: '고객용 정리', outputType: 'product_detail', desc: '고객이 읽기 쉬운 상품 설명으로 정리' },
  { key: 'summary', label: '짧게 요약', outputType: 'summary', desc: '핵심만 남겨 3-5줄로 요약' },
  { key: 'pop', label: 'POP용 정리', outputType: 'pop', desc: 'POP 템플릿용 짧은 문구 세트' },
  { key: 'title_suggest', label: '제목 추천', outputType: 'title_suggest', desc: '콘텐츠/POP/QR 제목 후보 추천' },
];

const TONE_LABELS: Record<ToneOption, string> = {
  friendly: '친근함',
  professional: '전문적',
  concise: '간결함',
};

const LENGTH_LABELS: Record<LengthOption, string> = {
  short: '짧게',
  medium: '보통',
  long: '길게',
};

const URL_TONE_LABELS: Record<UrlTone, string> = {
  normal: '일반',
  professional: '전문',
  store: '매장용',
};

const URL_CONTENT_TYPE_LABELS: Record<UrlContentType, string> = {
  document: '문서형',
  explain: '설명형',
};

/**
 * HTML → Forum Block[] 변환 (프론트엔드 전용, DOMParser 사용)
 * WO-O4O-AI-CONTENT-COMMUNITY-SAVE-INTEGRATION-V1:
 *   forum post API는 Block[] JSON을 기대하지만 백엔드 normalizeContent가
 *   Node.js에서 DOMParser를 호출하므로 실패함 → 프론트에서 미리 변환해서 전달
 */
function htmlToForumBlocks(html: string): object[] {
  if (!html || !html.trim()) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks: object[] = [];
  doc.body.childNodes.forEach((node, index) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
      blocks.push({ id: `b${index}`, type: 'heading', content: el.textContent || '', attributes: { level: parseInt(tag[1]) } });
    } else if (tag === 'p') {
      const text = el.textContent?.trim();
      if (text) blocks.push({ id: `b${index}`, type: 'paragraph', content: el.innerHTML });
    } else if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(el.querySelectorAll('li')).map((li) => li.textContent?.trim() || '').filter(Boolean);
      if (items.length) blocks.push({ id: `b${index}`, type: 'list', content: { items }, attributes: { ordered: tag === 'ol' } });
    } else if (tag === 'blockquote') {
      const text = el.textContent?.trim();
      if (text) blocks.push({ id: `b${index}`, type: 'quote', content: text });
    } else if (tag === 'div' && el.getAttribute('data-youtube-video')) {
      const iframe = el.querySelector('iframe');
      const src = iframe?.getAttribute('src') || '';
      if (src) blocks.push({ id: `b${index}`, type: 'paragraph', content: `[YouTube: ${src}]` });
    } else {
      const text = el.textContent?.trim();
      if (text) blocks.push({ id: `b${index}`, type: 'paragraph', content: el.innerHTML });
    }
  });
  return blocks;
}

/** Block[] → HTML 변환 (RichTextEditor TipTap 기반) */
function blocksToHtml(blocks: UrlBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'o4o/heading': {
          const level = block.attributes?.level || 2;
          return `<h${level}>${block.content || ''}</h${level}>`;
        }
        case 'o4o/paragraph':
          return `<p>${block.content || ''}</p>`;
        case 'o4o/list': {
          const ordered = block.attributes?.ordered;
          const tag = ordered ? 'ol' : 'ul';
          return `<${tag}>${block.content || ''}</${tag}>`;
        }
        case 'o4o/youtube': {
          const url = block.attributes?.url || block.attributes?.src || '';
          if (!url) return '';
          const embedUrl = url.includes('watch?v=')
            ? url.replace('watch?v=', 'embed/')
            : url;
          // WO-O4O-AI-CONTENT-EDITOR-YOUTUBE-RENDER-V1:
          //   TipTap @tiptap/extension-youtube 의 parseHTML 규칙은
          //     { tag: 'div[data-youtube-video] iframe' }
          //   raw <iframe> 단독은 setContent 시 drop 되므로 wrapper 필수.
          return `<div data-youtube-video><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`;
        }
        case 'o4o/image': {
          const src = block.attributes?.url || block.attributes?.src || '';
          const alt = block.attributes?.alt || '';
          return src ? `<img src="${src}" alt="${alt}" style="max-width:100%;" />` : '';
        }
        case 'o4o/columns':
        case 'o4o/group': {
          if (block.innerBlocks && block.innerBlocks.length > 0) {
            return `<div>${blocksToHtml(block.innerBlocks)}</div>`;
          }
          return block.content ? `<div>${block.content}</div>` : '';
        }
        default:
          return block.content ? `<p>${block.content}</p>` : '';
      }
    })
    .filter(Boolean)
    .join('\n');
}

export function AiContentModal({ open, onClose, editor, onInsert, aiRequestHeaders, onChannelSave, showCommunitySave, showStoreSave, headerLabel, urlPlaceholder, initialSourceTab }: AiContentModalProps) {
  // 기존 text 모드 상태
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<AiMode>('customer_rewrite');
  const [tone, setTone] = useState<ToneOption>('professional');
  const [length, setLength] = useState<LengthOption>('medium');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiContentResult | null>(null);
  const [error, setError] = useState('');
  const [resultTab, setResultTab] = useState<ResultTab>('preview');
  const [copied, setCopied] = useState(false);
  // WO-O4O-AI-CONTENT-AUTO-CHANNEL-SAVE-V1
  const [channelSaving, setChannelSaving] = useState(false);
  const [channelSaveStatus, setChannelSaveStatus] = useState<{ ok: boolean; label?: string; error?: string } | null>(null);

  // WO-O4O-AI-CONTENT-COMMUNITY-SAVE-INTEGRATION-V1
  const [showCommunitySavePanel, setShowCommunitySavePanel] = useState(false);
  const [communityTitle, setCommunityTitle] = useState('');
  const [communityForumId, setCommunityForumId] = useState('');
  const [communityForums, setCommunityForums] = useState<{ id: string; name: string }[]>([]);
  const [communityForumsLoading, setCommunityForumsLoading] = useState(false);
  const [communitySaving, setCommunitySaving] = useState(false);
  const [communitySaveStatus, setCommunitySaveStatus] = useState<{ ok: boolean; error?: string; postId?: string } | null>(null);

  // WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1
  const [showStoreSavePanel, setShowStoreSavePanel] = useState(false);
  const [storeTitle, setStoreTitle] = useState('');
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeSaveStatus, setStoreSaveStatus] = useState<{ ok: boolean; error?: string; contentId?: string } | null>(null);

  // URL 모드 상태 (WO-O4O-RICHTEXT-AI-URL-IMPORT-V1)
  // WO-O4O-AI-LESSON-INITIAL-URL-TAB-UX-FIX-V1: caller가 initialSourceTab='url' 지정 시 URL 모드로 시작
  const [sourceTab, setSourceTab] = useState<SourceTab>(initialSourceTab ?? 'text');
  const [urlInput, setUrlInput] = useState('');
  const [urlTone, setUrlTone] = useState<UrlTone>('normal');
  const [urlContentType, setUrlContentType] = useState<UrlContentType>('document');

  // WO-O4O-AI-CONTENT-CUSTOM-PROMPT-AND-CORE-EXTENSION-AUDIT-V1:
  //   사용자 자유 입력 — text 모드는 customPrompt, URL 모드는 customInstruction 으로 매핑.
  //   미입력 시 기존 동작 유지. 500자 제한은 백엔드에서도 다시 trim.
  const [customPrompt, setCustomPrompt] = useState('');
  const CUSTOM_PROMPT_MAX = 500;

  if (!open) return null;

  const currentConfig = MODE_CONFIG.find((m) => m.key === mode)!;
  const showToneLength = mode !== 'title_suggest';

  const handleGrabFromEditor = () => {
    if (!editor) return;
    const text = editor.getText();
    if (text.trim()) {
      setInput(text.trim());
    }
  };

  const handleGenerate = async () => {
    if (!input.trim()) {
      setError('변환할 텍스트를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    setCopied(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...aiRequestHeaders },
        credentials: 'include',
        body: JSON.stringify({
          input: input.trim(),
          outputType: currentConfig.outputType,
          options: showToneLength ? { tone, length } : {},
          // WO-O4O-AI-CONTENT-CUSTOM-PROMPT-AND-CORE-EXTENSION-AUDIT-V1
          customPrompt: customPrompt.trim().slice(0, CUSTOM_PROMPT_MAX),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'AI 생성에 실패했습니다.');
      }

      setResult({ html: data.html, title: data.title || '', summary: data.summary || '' });
      setResultTab('preview');
    } catch (err: any) {
      setError(err.message || 'AI 서비스 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromUrl = async () => {
    if (!urlInput.trim()) {
      setError('URL을 입력해 주세요.');
      return;
    }
    try {
      new URL(urlInput.trim());
    } catch {
      setError('올바른 URL 형식이 아닙니다. (예: https://example.com)');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setCopied(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/url-to-blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...aiRequestHeaders },
        credentials: 'include',
        body: JSON.stringify({
          url: urlInput.trim(),
          contentType: urlContentType,
          tone: urlTone,
          // WO-O4O-AI-CONTENT-CUSTOM-PROMPT-AND-CORE-EXTENSION-AUDIT-V1:
          //   동일한 customPrompt 입력란을 URL 모드의 customInstruction 으로도 매핑한다.
          customInstruction: customPrompt.trim().slice(0, CUSTOM_PROMPT_MAX),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'URL 콘텐츠 생성에 실패했습니다.');
      }

      if (!data.blocks || data.blocks.length === 0) {
        throw new Error('생성된 블록이 없습니다. URL 접근 가능 여부를 확인해 주세요.');
      }

      const html = blocksToHtml(data.blocks);
      if (!html.trim()) {
        throw new Error('HTML 변환 결과가 비어있습니다.');
      }

      // WO-O4O-AI-CONTENT-EDITOR-YOUTUBE-COMMAND-INSERT-V1:
      //   o4o/youtube URL 목록을 별도로 보존 — handleInsert 에서
      //   editor.commands.setYoutubeVideo({src}) 로 삽입한다.
      const youtubeUrls = (data.blocks as UrlBlock[])
        .filter((b) => b.type === 'o4o/youtube')
        .map((b) => b.attributes?.url || b.attributes?.src || '')
        .filter((u): u is string => Boolean(u));

      // WO-O4O-AI-URL-BLOCKS-TITLE-AUTO-FILL-V1:
      //   백엔드가 추출한 제목(YouTube oEmbed / HTML <title>·og·twitter / blocks fallback)을 사용.
      //   미추출 시 빈 문자열 — 호출 측(ContentWritePage / ResourceWritePage)이 자체 fallback 적용.
      setResult({
        html,
        title: typeof data.title === 'string' ? data.title : '',
        summary: `${data.blocks.length}개 블록 → HTML 변환 완료`,
        youtubeUrls,
      });
      setResultTab('preview');
    } catch (err: any) {
      setError(err.message || 'URL 콘텐츠 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select + execCommand
      const el = document.createElement('textarea');
      el.value = result.html;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInsert = () => {
    if (!result) return;
    // editor 가 있을 때는 setContent(html, true) — emitUpdate=true 로 onUpdate → onChange 트리거
    if (editor) {
      editor.commands.setContent(result.html, true);
      // WO-O4O-AI-CONTENT-EDITOR-YOUTUBE-COMMAND-INSERT-V1:
      //   setContent 후 에디터 HTML에 YouTube URL이 없을 때만 setYoutubeVideo 호출.
      //   TipTap DOMParser 가 <div data-youtube-video><iframe> wrapper 를 파싱하면
      //   이미 삽입됐으므로 중복 삽입 방지.
      if (result.youtubeUrls && result.youtubeUrls.length > 0) {
        const currentHtml = editor.getHTML();
        const ytCommand = (editor.commands as unknown as {
          setYoutubeVideo?: (options: { src: string }) => boolean;
        }).setYoutubeVideo;
        if (typeof ytCommand === 'function') {
          for (const src of result.youtubeUrls) {
            const embedUrl = src.includes('watch?v=') ? src.replace('watch?v=', 'embed/') : src;
            const alreadyInserted = currentHtml.includes(embedUrl) || currentHtml.includes(src);
            if (!alreadyInserted) {
              try { ytCommand({ src }); } catch { /* invalid url — skip */ }
            }
          }
        }
      }
    }
    // WO-O4O-LMS-LESSON-AI-ASSIST-V1: onInsert 가 있으면 외부 form state 로 결과 전달
    if (onInsert) {
      onInsert({
        html: result.html,
        title: result.title,
        sourceUrl: sourceTab === 'url' ? urlInput.trim() : undefined,
      });
    }
    handleClose();
  };

  const handleChannelSave = async () => {
    if (!result || !onChannelSave) return;
    setChannelSaving(true);
    setChannelSaveStatus(null);
    try {
      const res = await onChannelSave({
        outputType: currentConfig.outputType,
        html: result.html,
        title: result.title,
        summary: result.summary,
        mode,
      });
      setChannelSaveStatus({ ok: res.success, label: res.fieldLabel, error: res.error });
    } catch (err: any) {
      setChannelSaveStatus({ ok: false, error: err?.message || '저장 중 오류가 발생했습니다.' });
    } finally {
      setChannelSaving(false);
    }
  };

  // WO-O4O-AI-CONTENT-COMMUNITY-SAVE-INTEGRATION-V1
  const handleOpenCommunitySavePanel = async () => {
    if (!result) return;
    setCommunityTitle(result.title || '');
    setCommunityForumId('');
    setCommunitySaveStatus(null);
    setShowCommunitySavePanel(true);
    if (communityForums.length === 0) {
      setCommunityForumsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/forum/categories`, {
          headers: { ...aiRequestHeaders },
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCommunityForums(data.data.map((f: any) => ({ id: f.id, name: f.name })));
        }
      } catch {
        // 포럼 목록 로딩 실패 — 사용자는 포럼 없이 저장 가능
      } finally {
        setCommunityForumsLoading(false);
      }
    }
  };

  const handleCommunitySave = async () => {
    if (!result) return;
    setCommunitySaving(true);
    setCommunitySaveStatus(null);
    try {
      // WO-O4O-AI-CONTENT-COMMUNITY-SAVE-INTEGRATION-V1:
      //   백엔드 normalizeContent가 Node.js에서 DOMParser를 사용해 실패하므로
      //   프론트에서 HTML → Block[] 변환 후 전달 (백엔드는 Array인 경우 그대로 저장)
      const contentBlocks = htmlToForumBlocks(result.html);
      const body: Record<string, any> = {
        title: communityTitle.trim() || 'AI 생성 콘텐츠',
        content: contentBlocks.length > 0 ? contentBlocks : result.html,
        type: 'discussion',
      };
      if (communityForumId) body.forumId = communityForumId;
      const res = await fetch(`${API_BASE_URL}/api/v1/forum/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...aiRequestHeaders },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '커뮤니티 저장에 실패했습니다.');
      }
      setCommunitySaveStatus({ ok: true, postId: data.data?.id });
    } catch (err: any) {
      setCommunitySaveStatus({ ok: false, error: err?.message || '저장 중 오류가 발생했습니다.' });
    } finally {
      setCommunitySaving(false);
    }
  };

  // WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1
  const handleOpenStoreSavePanel = () => {
    if (!result) return;
    setStoreTitle(result.title || '');
    setStoreSaveStatus(null);
    setShowStoreSavePanel(true);
  };

  const handleStoreSave = async () => {
    if (!result) return;
    setStoreSaving(true);
    setStoreSaveStatus(null);
    try {
      const contentBlocks = htmlToForumBlocks(result.html);
      const res = await fetch(`${API_BASE_URL}/api/v1/kpa/store-contents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...aiRequestHeaders },
        credentials: 'include',
        body: JSON.stringify({
          title: storeTitle.trim() || 'AI 생성 콘텐츠',
          contentJson: contentBlocks.length > 0 ? contentBlocks : { html: result.html },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = res.status === 403
          ? '매장 소속이 없습니다. 매장 경영자만 내 매장에 저장할 수 있습니다.'
          : (data.error?.message || data.error || '내 매장 저장에 실패했습니다.');
        throw new Error(msg);
      }
      setStoreSaveStatus({ ok: true, contentId: data.data?.id });
    } catch (err: any) {
      setStoreSaveStatus({ ok: false, error: err?.message || '저장 중 오류가 발생했습니다.' });
    } finally {
      setStoreSaving(false);
    }
  };

  const handleClose = () => {
    setInput('');
    setResult(null);
    setError('');
    setLoading(false);
    setCopied(false);
    setChannelSaveStatus(null);
    setChannelSaving(false);
    setUrlInput('');
    setShowCommunitySavePanel(false);
    setCommunityTitle('');
    setCommunityForumId('');
    setCommunitySaveStatus(null);
    setCommunitySaving(false);
    setShowStoreSavePanel(false);
    setStoreTitle('');
    setStoreSaveStatus(null);
    setStoreSaving(false);
    setCustomPrompt('');
    setSourceTab(initialSourceTab ?? 'text');
    onClose();
  };

  const handleSourceTabChange = (tab: SourceTab) => {
    setSourceTab(tab);
    setResult(null);
    setError('');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          maxWidth: '92vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>✨</span>
            <span style={{ fontWeight: 600, fontSize: '15px', color: '#111827' }}>{headerLabel ?? 'AI 콘텐츠 정리'}</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              color: '#6b7280',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto' }}>

          {/* Source Tab — 기존 입력 / URL에서 가져오기 */}
          <div
            style={{
              display: 'flex',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {(['text', 'url'] as SourceTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleSourceTabChange(tab)}
                style={{
                  flex: 1,
                  minHeight: '40px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  lineHeight: 1.4,
                  fontWeight: sourceTab === tab ? 600 : 400,
                  background: sourceTab === tab ? '#4f46e5' : '#f9fafb',
                  color: sourceTab === tab ? 'white' : '#6b7280',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {tab === 'text' ? '기존 입력' : 'URL에서 가져오기'}
              </button>
            ))}
          </div>

          {/* WO-O4O-AI-CONTENT-CUSTOM-PROMPT-AND-CORE-EXTENSION-AUDIT-V1:
              추가 요청사항 — text/url 모드 공통 적용. 미입력 시 기존 동작 유지. */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                추가 요청사항 <span style={{ color: '#9ca3af', fontWeight: 400 }}>(선택)</span>
              </label>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                {customPrompt.length}/{CUSTOM_PROMPT_MAX}
              </span>
            </div>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value.slice(0, CUSTOM_PROMPT_MAX))}
              placeholder={
                '예) 약국 고객이 이해하기 쉽게 작성\n블로그 스타일로 길게 정리\nPOP에 맞게 짧고 강조형으로 작성\n전문가 칼럼 스타일로 작성\n소제목 중심으로 정리'
              }
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '13px',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                background: '#fafafa',
              }}
            />
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>
              모든 모드(텍스트/URL)에 공통 적용됩니다. 공통 원칙·출력 형식은 그대로 유지됩니다.
            </p>
          </div>

          {/* TEXT MODE */}
          {sourceTab === 'text' && (
            <>
              {/* Mode Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  정리 모드
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {MODE_CONFIG.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => { setMode(m.key); setResult(null); setError(''); }}
                      title={m.desc}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        border: `1px solid ${mode === m.key ? '#6366f1' : '#d1d5db'}`,
                        borderRadius: '16px',
                        background: mode === m.key ? '#eef2ff' : 'white',
                        color: mode === m.key ? '#4f46e5' : '#6b7280',
                        cursor: 'pointer',
                        fontWeight: mode === m.key ? 600 : 400,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', margin: '4px 0 0' }}>
                  {currentConfig.desc}
                </p>
              </div>

              {/* Input */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                    원본 텍스트
                  </label>
                  {editor && (
                    <button
                      type="button"
                      onClick={handleGrabFromEditor}
                      style={{
                        padding: '3px 10px',
                        fontSize: '11px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: '#f9fafb',
                        color: '#6b7280',
                        cursor: 'pointer',
                      }}
                    >
                      에디터에서 가져오기
                    </button>
                  )}
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="원본 정보를 입력하거나 에디터에서 가져오세요..."
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Options — hide for title_suggest */}
              {showToneLength && (
                <div style={{ display: 'flex', gap: '16px' }}>
                  {/* Tone */}
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                      톤
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(Object.keys(TONE_LABELS) as ToneOption[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTone(t)}
                          style={{
                            flex: 1,
                            padding: '6px 4px',
                            fontSize: '12px',
                            border: `1px solid ${tone === t ? '#6366f1' : '#d1d5db'}`,
                            borderRadius: '6px',
                            background: tone === t ? '#eef2ff' : 'white',
                            color: tone === t ? '#4f46e5' : '#6b7280',
                            cursor: 'pointer',
                            fontWeight: tone === t ? 600 : 400,
                          }}
                        >
                          {TONE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Length */}
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                      분량
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(Object.keys(LENGTH_LABELS) as LengthOption[]).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setLength(l)}
                          style={{
                            flex: 1,
                            padding: '6px 4px',
                            fontSize: '12px',
                            border: `1px solid ${length === l ? '#6366f1' : '#d1d5db'}`,
                            borderRadius: '6px',
                            background: length === l ? '#eef2ff' : 'white',
                            color: length === l ? '#4f46e5' : '#6b7280',
                            cursor: 'pointer',
                            fontWeight: length === l ? 600 : 400,
                          }}
                        >
                          {LENGTH_LABELS[l]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Generate button (text mode) */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || !input.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  background: loading || !input.trim() ? '#d1d5db' : '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? '생성 중...' : `✨ ${currentConfig.label} 시작`}
              </button>
            </>
          )}

          {/* URL MODE */}
          {sourceTab === 'url' && (
            <>
              {/* URL Input */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  URL
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder={urlPlaceholder ?? 'https://example.com/article'}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  공개 접근 가능한 URL을 입력하세요
                </p>
              </div>

              {/* URL Options */}
              <div style={{ display: 'flex', gap: '16px' }}>
                {/* Content Type */}
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                    콘텐츠 유형
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(Object.keys(URL_CONTENT_TYPE_LABELS) as UrlContentType[]).map((ct) => (
                      <button
                        key={ct}
                        type="button"
                        onClick={() => setUrlContentType(ct)}
                        style={{
                          flex: 1,
                          padding: '6px 4px',
                          fontSize: '12px',
                          border: `1px solid ${urlContentType === ct ? '#6366f1' : '#d1d5db'}`,
                          borderRadius: '6px',
                          background: urlContentType === ct ? '#eef2ff' : 'white',
                          color: urlContentType === ct ? '#4f46e5' : '#6b7280',
                          cursor: 'pointer',
                          fontWeight: urlContentType === ct ? 600 : 400,
                        }}
                      >
                        {URL_CONTENT_TYPE_LABELS[ct]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone */}
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                    톤
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(Object.keys(URL_TONE_LABELS) as UrlTone[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setUrlTone(t)}
                        style={{
                          flex: 1,
                          padding: '6px 4px',
                          fontSize: '12px',
                          border: `1px solid ${urlTone === t ? '#6366f1' : '#d1d5db'}`,
                          borderRadius: '6px',
                          background: urlTone === t ? '#eef2ff' : 'white',
                          color: urlTone === t ? '#4f46e5' : '#6b7280',
                          cursor: 'pointer',
                          fontWeight: urlTone === t ? 600 : 400,
                        }}
                      >
                        {URL_TONE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate button (url mode) */}
              <button
                type="button"
                onClick={handleGenerateFromUrl}
                disabled={loading || !urlInput.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  background: loading || !urlInput.trim() ? '#d1d5db' : '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading || !urlInput.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'URL 분석 중...' : '🔗 URL로 생성'}
              </button>
            </>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#dc2626',
              }}
            >
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              {/* Result header */}
              <div
                style={{
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ color: '#16a34a', fontSize: '13px' }}>✓</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#15803d' }}>AI 생성 완료</span>
                {result.title && (
                  <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>— {result.title}</span>
                )}
              </div>

              {/* Tabs */}
              <div
                style={{
                  display: 'flex',
                  borderBottom: '1px solid #e5e7eb',
                  background: '#f9fafb',
                }}
              >
                {(['preview', 'html'] as ResultTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setResultTab(tab)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: resultTab === tab ? 600 : 400,
                      color: resultTab === tab ? '#4f46e5' : '#6b7280',
                      background: 'none',
                      border: 'none',
                      borderBottom: resultTab === tab ? '2px solid #4f46e5' : '2px solid transparent',
                      cursor: 'pointer',
                      marginBottom: '-1px',
                    }}
                  >
                    {tab === 'preview' ? '미리보기' : 'HTML'}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {resultTab === 'preview' ? (
                <div
                  style={{
                    padding: '14px',
                    fontSize: '14px',
                    lineHeight: 1.7,
                    maxHeight: '240px',
                    overflowY: 'auto',
                  }}
                  dangerouslySetInnerHTML={{ __html: result.html }}
                />
              ) : (
                <pre
                  style={{
                    margin: 0,
                    padding: '14px',
                    fontSize: '12px',
                    lineHeight: 1.6,
                    maxHeight: '240px',
                    overflowY: 'auto',
                    background: '#1e1e2e',
                    color: '#cdd6f4',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                  }}
                >
                  {result.html}
                </pre>
              )}

              {/* Summary */}
              {result.summary && (
                <div
                  style={{
                    padding: '8px 14px',
                    background: '#f9fafb',
                    borderTop: '1px solid #e5e7eb',
                    fontSize: '12px',
                    color: '#6b7280',
                  }}
                >
                  {result.summary}
                </div>
              )}
            </div>
          )}

          {/* WO-O4O-AI-CONTENT-COMMUNITY-SAVE-INTEGRATION-V1: 커뮤니티 저장 패널 */}
          {showCommunitySave && result && showCommunitySavePanel && (
            <div
              style={{
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '14px',
                background: '#f0f9ff',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0369a1' }}>커뮤니티 게시글로 저장</div>

              {/* 제목 입력 */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#374151', marginBottom: '4px' }}>제목</label>
                <input
                  type="text"
                  value={communityTitle}
                  onChange={(e) => setCommunityTitle(e.target.value)}
                  placeholder="게시글 제목을 입력하세요"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 게시판 선택 */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#374151', marginBottom: '4px' }}>게시판 선택</label>
                <select
                  value={communityForumId}
                  onChange={(e) => setCommunityForumId(e.target.value)}
                  disabled={communityForumsLoading}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    background: 'white',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">
                    {communityForumsLoading ? '게시판 목록 로딩 중...' : '게시판 선택 (선택사항)'}
                  </option>
                  {communityForums.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* 저장 결과 */}
              {communitySaveStatus && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: communitySaveStatus.ok ? '#15803d' : '#dc2626',
                    background: communitySaveStatus.ok ? '#f0fdf4' : '#fef2f2',
                  }}
                >
                  {communitySaveStatus.ok
                    ? `게시글이 저장되었습니다 ✓`
                    : `저장 실패: ${communitySaveStatus.error}`}
                </div>
              )}

              {/* 버튼 */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowCommunitySavePanel(false); setCommunitySaveStatus(null); }}
                  style={{
                    padding: '7px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: 'white',
                    fontSize: '13px',
                    cursor: 'pointer',
                    color: '#374151',
                  }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleCommunitySave}
                  disabled={communitySaving || Boolean(communitySaveStatus?.ok)}
                  style={{
                    padding: '7px 14px',
                    border: 'none',
                    borderRadius: '6px',
                    background: communitySaveStatus?.ok ? '#d1fae5' : communitySaving ? '#bfdbfe' : '#0284c7',
                    color: communitySaveStatus?.ok ? '#15803d' : 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: communitySaving || communitySaveStatus?.ok ? 'not-allowed' : 'pointer',
                  }}
                >
                  {communitySaving ? '저장 중...' : communitySaveStatus?.ok ? '저장됨 ✓' : '게시글 저장'}
                </button>
              </div>
            </div>
          )}

          {/* WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1: 내 매장 저장 패널 */}
          {showStoreSave && result && showStoreSavePanel && (
            <div
              style={{
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '14px',
                background: '#f0fdf4',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#15803d' }}>내 매장 콘텐츠로 저장</div>

              {/* 제목 입력 */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#374151', marginBottom: '4px' }}>제목</label>
                <input
                  type="text"
                  value={storeTitle}
                  onChange={(e) => setStoreTitle(e.target.value)}
                  placeholder="저장할 콘텐츠 제목을 입력하세요"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 저장 결과 */}
              {storeSaveStatus && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: storeSaveStatus.ok ? '#15803d' : '#dc2626',
                    background: storeSaveStatus.ok ? '#dcfce7' : '#fef2f2',
                  }}
                >
                  {storeSaveStatus.ok
                    ? `내 매장 콘텐츠에 저장되었습니다 ✓`
                    : `저장 실패: ${storeSaveStatus.error}`}
                </div>
              )}

              {/* 버튼 */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowStoreSavePanel(false); setStoreSaveStatus(null); }}
                  style={{
                    padding: '7px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: 'white',
                    fontSize: '13px',
                    cursor: 'pointer',
                    color: '#374151',
                  }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleStoreSave}
                  disabled={storeSaving || Boolean(storeSaveStatus?.ok)}
                  style={{
                    padding: '7px 14px',
                    border: 'none',
                    borderRadius: '6px',
                    background: storeSaveStatus?.ok ? '#dcfce7' : storeSaving ? '#bbf7d0' : '#16a34a',
                    color: storeSaveStatus?.ok ? '#15803d' : 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: storeSaving || storeSaveStatus?.ok ? 'not-allowed' : 'pointer',
                  }}
                >
                  {storeSaving ? '저장 중...' : storeSaveStatus?.ok ? '저장됨 ✓' : '매장에 저장'}
                </button>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, textAlign: 'center' }}>
            AI가 생성한 내용은 참고용입니다. 반드시 검토 후 사용하세요.
          </p>
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0 }}>
          {/* WO-O4O-AI-CONTENT-AUTO-CHANNEL-SAVE-V1: 채널 저장 상태 메시지 */}
          {channelSaveStatus && (
            <div
              style={{
                padding: '6px 20px',
                fontSize: '12px',
                color: channelSaveStatus.ok ? '#16a34a' : '#dc2626',
                background: channelSaveStatus.ok ? '#f0fdf4' : '#fef2f2',
                borderTop: '1px solid #e5e7eb',
                textAlign: 'right',
              }}
            >
              {channelSaveStatus.ok
                ? `저장 완료${channelSaveStatus.label ? ` — ${channelSaveStatus.label}` : ''} ✓`
                : `저장 실패: ${channelSaveStatus.error}`}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              padding: '12px 20px',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb',
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#374151',
              }}
            >
              취소
            </button>
            {result && (
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: copied ? '#f0fdf4' : 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: copied ? '#16a34a' : '#374151',
                  fontWeight: copied ? 600 : 400,
                }}
              >
                {copied ? '복사됨 ✓' : '복사'}
              </button>
            )}
            {/* WO-O4O-AI-CONTENT-COMMUNITY-SAVE-INTEGRATION-V1: 커뮤니티 저장 버튼 */}
            {showCommunitySave && result && (
              <button
                type="button"
                onClick={showCommunitySavePanel ? () => { setShowCommunitySavePanel(false); setCommunitySaveStatus(null); } : handleOpenCommunitySavePanel}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${showCommunitySavePanel ? '#0369a1' : '#0284c7'}`,
                  borderRadius: '6px',
                  background: showCommunitySavePanel ? '#e0f2fe' : '#f0f9ff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: '#0369a1',
                  fontWeight: 600,
                }}
              >
                {communitySaveStatus?.ok ? '저장됨 ✓' : showCommunitySavePanel ? '커뮤니티 저장 ▲' : '커뮤니티 저장'}
              </button>
            )}
            {/* WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1: 내 매장 저장 버튼 */}
            {showStoreSave && result && (
              <button
                type="button"
                onClick={showStoreSavePanel ? () => { setShowStoreSavePanel(false); setStoreSaveStatus(null); } : handleOpenStoreSavePanel}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${showStoreSavePanel ? '#15803d' : '#16a34a'}`,
                  borderRadius: '6px',
                  background: showStoreSavePanel ? '#dcfce7' : '#f0fdf4',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: '#15803d',
                  fontWeight: 600,
                }}
              >
                {storeSaveStatus?.ok ? '저장됨 ✓' : showStoreSavePanel ? '내 매장 저장 ▲' : '내 매장 저장'}
              </button>
            )}
            {/* WO-O4O-AI-CONTENT-AUTO-CHANNEL-SAVE-V1: onChannelSave가 있을 때만 표시 */}
            {onChannelSave && result && (
              <button
                type="button"
                onClick={handleChannelSave}
                disabled={channelSaving}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #059669',
                  borderRadius: '6px',
                  background: channelSaving ? '#d1fae5' : channelSaveStatus?.ok ? '#d1fae5' : '#ecfdf5',
                  fontSize: '14px',
                  cursor: channelSaving ? 'not-allowed' : 'pointer',
                  color: '#059669',
                  fontWeight: 600,
                }}
              >
                {channelSaving ? '저장 중...' : channelSaveStatus?.ok ? '저장됨 ✓' : '채널에 저장'}
              </button>
            )}
            <button
              type="button"
              onClick={handleInsert}
              disabled={!result}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: '6px',
                background: result ? '#4f46e5' : '#d1d5db',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: result ? 'pointer' : 'not-allowed',
              }}
            >
              에디터에 삽입
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default AiContentModal;
