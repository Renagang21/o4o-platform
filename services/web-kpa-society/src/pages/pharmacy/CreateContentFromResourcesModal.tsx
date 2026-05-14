/**
 * CreateContentFromResourcesModal — 자료함 자료 → direct 콘텐츠 제작
 *
 * WO-O4O-STORE-CONTENT-CREATION-FROM-LIBRARY-RESOURCES-V1
 * WO-O4O-STORE-CONTENT-GENERATION-USER-INTENT-V1:
 *   "요약/정리" 중심의 AI 결과를 사용자 의도 기반 매장 콘텐츠 생성으로 전환.
 *   - 제작 요청 자유 입력(userIntent) + preset chips(분량/톤/내용 방향/이미지/URL) 추가
 *   - customPrompt + options(tone/length) 로 매핑하여 /api/ai/content 호출
 *   - 결과 미리보기를 O4O 표준 RichTextEditor 로 교체 → 검토/수정 동일 화면에서 수행
 *   - 원소스 sourceMetadata 에 url/file/assetType 포함 → 향후 제작 자료 흐름 재사용 가능
 *   - 본 결과는 "내 매장용 콘텐츠"로 저장됨 (production-materials 아님)
 *
 * 흐름:
 *   Step 1 (select):   자료 multi-select + 검색
 *      ↓ "다음"
 *   Step 2 (compose):  제작 요청 입력 + preset 선택 → "AI 콘텐츠 생성" → RichTextEditor 수정 → 제목
 *      ↓ "저장"
 *   POST /store-contents → 새 direct content id
 *      ↓
 *   navigate('/store/content/direct/:id') 로 이동
 *
 * 정책:
 *   - libraryItem 독립성 유지 — 자료를 다중 콘텐츠에 재활용 가능 (dedupe 금지)
 *   - source metadata 만 contentJson 에 기록, 운영 연결(FK) 없음
 *   - kpa:store_owner 권한은 백엔드 게이트에서 검증 (403 → 에러 표시)
 */

import { useEffect, useState, useCallback, useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Search,
  Sparkles,
  Loader2,
  FileText,
  FileDown,
  Link as LinkIcon,
  ArrowLeft,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { RichTextEditor, type EditorContent } from '@o4o/content-editor';
import {
  getStoreExecutionAssets,
  type StoreExecutionAsset,
  type AssetType,
} from '../../api/storeExecutionAssets';
import { assetSnapshotApi, type AssetSnapshotItem } from '../../api/assetSnapshot';
import { apiClient } from '../../api/client';
import { getAccessToken } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';

const FETCH_LIMIT = 100;
const AI_OUTPUT_TYPE = 'product_detail'; // 자료 정리 → 고객용 정리 톤 (AiContentModal mode 와 동일 endpoint)

// WO-O4O-STORE-AI-INPUT-INCLUDE-STORED-BODY-V1
// 자료별 본문(body/blocks/htmlContent)을 stripHtml 후 AI prompt 에 포함.
// 자료 다중 선택 시에도 전체 prompt 가 10000자 (handleGenerate 의 slice 한도) 안에서
// 의미 있는 분량이 유지되도록 자료당 본문은 3000자로 자른다.
const BODY_PER_RESOURCE_LIMIT = 3000;

// VITE_API_BASE_URL — AiContentModal 과 동일하게 raw 도메인 사용 (/api/ai/content 직접 호출)
// WO-O4O-STORE-AI-CONTENT-AUTH-TOKEN-FIX-V1: fallback 을 AiContentModal 과 동일하게 맞춤
const AI_API_BASE: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) || 'https://api.neture.co.kr';

// ─── Row Types ───────────────────────────────────────────────────────────────

type ResourceKind = 'library' | 'snapshot';

interface ResourceRow {
  id: string;          // selectionKey: 'lib:<uuid>' | 'snap:<uuid>'
  rawId: string;
  kind: ResourceKind;
  title: string;
  description: string;
  assetType: AssetType;
  url: string | null;       // 외부 URL 또는 fileUrl (있을 시 source 로 활용)
  sourceFileName: string | null;
  updatedAt: string;
  // WO-O4O-STORE-AI-INPUT-INCLUDE-STORED-BODY-V1
  // 저장된 본문(htmlContent / contentJson.body / blocks / html) → stripHtml 된 plain text.
  // composeSourceText 가 AI prompt 에 inline 으로 포함하기 위한 값.
  bodyText: string;
}

// ─── Body Text Extraction ────────────────────────────────────────────────────
// 저장된 HTML/blocks/contentJson 을 AI 입력용 plain text 로 normalize.
// 새 extraction pipeline 없이 이미 DB 에 저장된 usable text 만 재사용.

function stripHtmlText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .replace(/^\s+|\s+$/g, '');
}

function blockToText(block: unknown): string {
  if (!block || typeof block !== 'object') return '';
  const b = block as Record<string, any>;
  const type = typeof b.type === 'string' ? b.type : '';

  // image / video / youtube 류는 본문 텍스트로 의미 없음
  if (/image|video|youtube/i.test(type)) return '';

  // list: items 배열을 줄바꿈으로 평면화
  if (/list/i.test(type)) {
    const items = Array.isArray(b.items)
      ? b.items
      : Array.isArray(b.content?.items) ? b.content.items
      : Array.isArray(b.attributes?.items) ? b.attributes.items
      : [];
    return items
      .map((it: unknown) => (typeof it === 'string' ? stripHtmlText(it) : ''))
      .filter(Boolean)
      .join('\n');
  }

  // text-ish — content / text / value / data.{content,text} 중 string 인 것 사용
  const raw =
    (typeof b.content === 'string' ? b.content : '') ||
    (typeof b.text === 'string' ? b.text : '') ||
    (typeof b.value === 'string' ? b.value : '') ||
    (typeof b.data?.content === 'string' ? b.data.content : '') ||
    (typeof b.data?.text === 'string' ? b.data.text : '') ||
    '';
  return raw ? stripHtmlText(raw) : '';
}

function blocksToFlatText(blocks: unknown[]): string {
  return blocks
    .map(blockToText)
    .filter((s) => s.length > 0)
    .join('\n')
    .trim();
}

function extractBodyFromContentJson(cj: unknown): string {
  if (!cj) return '';
  // contentJson 자체가 블록 배열인 경우 (StoreDirectContentPage parseBlocks 참고)
  if (Array.isArray(cj)) return blocksToFlatText(cj);
  if (typeof cj !== 'object') return '';
  const obj = cj as Record<string, unknown>;

  // 1) body: string(HTML/plain) 또는 블록 배열
  if (typeof obj.body === 'string' && obj.body.trim()) {
    return stripHtmlText(obj.body);
  }
  if (Array.isArray(obj.body)) {
    const t = blocksToFlatText(obj.body);
    if (t) return t;
  }

  // 2) blocks: 블록 배열
  if (Array.isArray(obj.blocks)) {
    const t = blocksToFlatText(obj.blocks);
    if (t) return t;
  }

  // 3) html: AiContentModal 저장 형태 (html only)
  if (typeof obj.html === 'string' && obj.html.trim()) {
    return stripHtmlText(obj.html);
  }

  // 4) htmlContent: 일부 snapshot 이 그대로 carry 하는 경우
  if (typeof obj.htmlContent === 'string' && obj.htmlContent.trim()) {
    return stripHtmlText(obj.htmlContent);
  }

  return '';
}

function truncateBody(text: string, max: number): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '… (이하 생략)';
}

const ASSET_TYPE_META: Record<AssetType, { label: string; bg: string; color: string; Icon: typeof FileText }> = {
  file:            { label: '파일',     bg: '#EFF6FF', color: '#2563EB', Icon: FileDown },
  content:         { label: '문서',     bg: '#DCFCE7', color: '#16A34A', Icon: FileText },
  'external-link': { label: '외부 링크', bg: '#FEF3C7', color: '#D97706', Icon: LinkIcon },
};

function libraryToRow(it: StoreExecutionAsset): ResourceRow {
  // assetType==='content' 인 직접 작성 자료는 htmlContent 에 본문이 들어있음.
  // 그 외 type 도 htmlContent 가 채워져 있으면 동일하게 사용 (방어적).
  const bodyText = it.htmlContent ? stripHtmlText(it.htmlContent) : '';
  return {
    id: `lib:${it.id}`,
    rawId: it.id,
    kind: 'library',
    title: it.title,
    description: it.description ?? '',
    assetType: it.assetType,
    url: it.assetType === 'file' ? it.fileUrl : it.assetType === 'external-link' ? it.url : null,
    sourceFileName: it.fileName,
    updatedAt: it.updatedAt,
    bodyText,
  };
}

function snapshotToRow(snap: AssetSnapshotItem): ResourceRow {
  const cj = snap.contentJson as Record<string, unknown> | undefined;
  const sourceUrl = (cj?.sourceUrl as string | null | undefined) ?? null;
  const sourceFileName = (cj?.sourceFileName as string | null | undefined) ?? null;
  const summary = (cj?.summary as string | null | undefined) ?? '';
  const sourceType = (cj?.sourceType as string | null | undefined) ?? null;
  const assetType: AssetType =
    sourceType === 'external' ? 'external-link'
    : sourceType === 'upload' ? 'file'
    : 'content';
  // contentJson.body / blocks / html 중 존재하는 것을 plain text 로 추출.
  // summary 는 description 으로 이미 노출되므로 본문 추출 fallback 으로는 사용하지 않는다
  // (중복 방지).
  const bodyText = extractBodyFromContentJson(snap.contentJson);
  return {
    id: `snap:${snap.id}`,
    rawId: snap.id,
    kind: 'snapshot',
    title: snap.title,
    description: summary,
    assetType,
    url: sourceUrl,
    sourceFileName,
    updatedAt: snap.createdAt,
    bodyText,
  };
}

// 선택된 자료 → AI prompt source text 자동 작성
// WO-O4O-STORE-AI-INPUT-INCLUDE-STORED-BODY-V1:
//   metadata(title/description/url/file)만 넣던 title-only prompt 를
//   "본문:" 섹션이 포함된 body-aware prompt 로 확장.
//   자료당 본문은 BODY_PER_RESOURCE_LIMIT 자로 truncate (전체는 handleGenerate 에서 10000자 cap).
// WO-O4O-STORE-CONTENT-GENERATION-USER-INTENT-V1:
//   요약/정리 지향 → 콘텐츠 작성 지향으로 prompt 도입부 환원.
//   원소스의 URL/이미지/파일이 단순 텍스트가 아닌 콘텐츠 구성 요소임을 명시.
function composeSourceText(rows: ResourceRow[]): string {
  if (rows.length === 0) return '';
  const lines: string[] = [
    '다음 원소스를 참고하여 매장에서 그대로 게시·재사용할 수 있는 완성 콘텐츠를 작성해 주세요.',
    '- 단순 요약/정리가 아니라 구조화된 본문(소제목/문단/목록)으로 작성합니다.',
    '- 원소스의 URL/이미지/파일은 본문 내 링크·이미지·참고 출처로 활용할 수 있습니다.',
    '- 출력은 HTML(<h2>, <p>, <ul>, <a>, <img> 등)로 구성합니다.',
    '',
    '[원소스]',
  ];
  rows.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.title}`);
    lines.push(`유형: ${ASSET_TYPE_META[r.assetType].label}`);
    if (r.description) lines.push(`설명: ${r.description}`);
    if (r.url) lines.push(`URL: ${r.url}`);
    if (r.sourceFileName) lines.push(`파일: ${r.sourceFileName}`);
    if (r.bodyText) {
      lines.push('본문:');
      lines.push(truncateBody(r.bodyText, BODY_PER_RESOURCE_LIMIT));
    }
    lines.push('');
  });
  return lines.join('\n').trim();
}

// ─── User Intent Presets ─────────────────────────────────────────────────────
// WO-O4O-STORE-CONTENT-GENERATION-USER-INTENT-V1
//
// 사용자가 자유 입력한 제작 요청과 함께 customPrompt 로 합성된다.
// 자유 입력이 가장 우선이며, preset 은 보조 지시문이다.
// customPrompt 백엔드 cap=500자, 자유 입력이 길면 preset 지시문이 잘릴 수 있다.

type LengthPreset = 'short' | 'medium' | 'a4' | 'detailed';
type TonePreset = 'friendly' | 'professional' | 'pharmacist' | 'consumer';
type DirectionPreset = 'health-info' | 'persuasion' | 'consult' | 'education' | 'product';
type ImagePreset = 'include' | 'position' | 'caption';
type UrlPreset = 'keep' | 'cite' | 'card';

const LENGTH_OPTIONS: { key: LengthPreset; label: string }[] = [
  { key: 'short',    label: '짧게' },
  { key: 'medium',   label: '보통' },
  { key: 'a4',       label: 'A4 1장' },
  { key: 'detailed', label: '상세하게' },
];

const TONE_OPTIONS: { key: TonePreset; label: string }[] = [
  { key: 'friendly',     label: '친근하게' },
  { key: 'professional', label: '전문적으로' },
  { key: 'pharmacist',   label: '약사 설명 느낌' },
  { key: 'consumer',     label: '소비자 친화적으로' },
];

const DIRECTION_OPTIONS: { key: DirectionPreset; label: string }[] = [
  { key: 'health-info', label: '건강정보 중심' },
  { key: 'persuasion',  label: '소비자 설득 중심' },
  { key: 'consult',     label: '상담 보조용' },
  { key: 'education',   label: '교육용' },
  { key: 'product',     label: '제품 이해 중심' },
];

const IMAGE_OPTIONS: { key: ImagePreset; label: string }[] = [
  { key: 'include',  label: '이미지 포함' },
  { key: 'position', label: '이미지 위치 제안' },
  { key: 'caption',  label: '이미지 설명 포함' },
];

const URL_OPTIONS: { key: UrlPreset; label: string }[] = [
  { key: 'keep', label: '링크 유지' },
  { key: 'cite', label: '출처 표시' },
  { key: 'card', label: '참고 링크 카드 포함' },
];

interface IntentState {
  userIntent: string;
  length: LengthPreset | null;
  tone: TonePreset | null;
  direction: DirectionPreset | null;
  image: ImagePreset | null;
  url: UrlPreset | null;
}

// preset → customPrompt 합성. userIntent 우선, 500자 cap.
function buildCustomPrompt(s: IntentState): string {
  const lines: string[] = [];
  if (s.userIntent.trim()) lines.push(s.userIntent.trim());

  if (s.length === 'a4')
    lines.push('A4 1장 분량(약 800~1200자, 단락 5~7개)으로 작성해 주세요.');
  if (s.length === 'detailed')
    lines.push('상세하게 풀어 쓰되 하위 섹션과 예시를 포함해 주세요.');

  if (s.tone === 'pharmacist')
    lines.push('약사가 매장에서 고객에게 설명하는 자연스러운 어조로 작성해 주세요.');
  if (s.tone === 'consumer')
    lines.push('전문 용어 사용을 줄이고 소비자가 이해하기 쉬운 단어로 풀어 주세요.');

  if (s.direction === 'health-info')
    lines.push('판매 유도보다는 건강 정보 전달에 무게를 두세요.');
  if (s.direction === 'persuasion')
    lines.push('소비자가 사용 또는 구매를 결정할 수 있도록 설득력 있는 흐름으로 구성하세요.');
  if (s.direction === 'consult')
    lines.push('상담 시 보조 자료로 쓸 수 있도록 객관 정보 중심으로 정리하세요.');
  if (s.direction === 'education')
    lines.push('교육 자료로 활용할 수 있게 학습 흐름과 핵심 요약을 포함하세요.');
  if (s.direction === 'product')
    lines.push('제품의 성분·특징·효능 이해를 돕는 구조로 작성하세요.');

  if (s.image === 'include')
    lines.push('가능한 위치에 원소스의 이미지를 <img>로 본문에 삽입해 주세요.');
  if (s.image === 'position')
    lines.push('이미지가 들어가면 좋을 위치를 "[이미지: 설명]" 형태로 표시해 주세요.');
  if (s.image === 'caption')
    lines.push('각 이미지에는 짧은 설명 캡션을 함께 작성해 주세요.');

  if (s.url === 'keep')
    lines.push('원소스 URL은 본문 내 적절한 위치에 <a> 링크로 유지해 주세요.');
  if (s.url === 'cite')
    lines.push('원소스 URL을 본문 안에 "출처: …" 형태로 표시해 주세요.');
  if (s.url === 'card')
    lines.push('원소스 URL을 본문 끝에 "참고 링크" 섹션으로 묶어 주세요.');

  // userIntent / preset 모두 비어 있으면 기본 지시문을 채워 default 요약 결과를 방지.
  if (lines.length === 0) {
    lines.push('단순 요약이 아니라 매장에서 사용할 완성 콘텐츠를 구조화된 HTML로 작성해 주세요.');
  }

  const merged = lines.join('\n');
  return merged.length > 500 ? merged.slice(0, 500) : merged;
}

// preset → backend options.tone 매핑. 미선택 시 undefined.
function mapBackendTone(p: TonePreset | null): 'friendly' | 'professional' | 'concise' | undefined {
  if (p === 'friendly' || p === 'consumer') return 'friendly';
  if (p === 'professional' || p === 'pharmacist') return 'professional';
  return undefined;
}

// preset → backend options.length 매핑. 미선택 시 undefined.
function mapBackendLength(p: LengthPreset | null): 'short' | 'medium' | 'long' | undefined {
  if (p === 'short') return 'short';
  if (p === 'medium') return 'medium';
  if (p === 'a4' || p === 'detailed') return 'long';
  return undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  /** 저장 성공 시 부모가 호출됨 (예: 콘텐츠 목록 새로고침) */
  onCreated?: (newContentId: string) => void;
}

export function CreateContentFromResourcesModal({ open, onClose, onCreated }: Props) {
  const navigate = useNavigate();

  // step
  const [step, setStep] = useState<'select' | 'compose'>('select');

  // select step
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  // compose step
  const [title, setTitle] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [editorHtml, setEditorHtml] = useState('');
  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // WO-O4O-STORE-CONTENT-GENERATION-USER-INTENT-V1: 사용자 제작 의도
  const [userIntent, setUserIntent] = useState('');
  const [presetLength, setPresetLength] = useState<LengthPreset | null>(null);
  const [presetTone, setPresetTone] = useState<TonePreset | null>(null);
  const [presetDirection, setPresetDirection] = useState<DirectionPreset | null>(null);
  const [presetImage, setPresetImage] = useState<ImagePreset | null>(null);
  const [presetUrl, setPresetUrl] = useState<UrlPreset | null>(null);

  // 자료 로딩 — open 시점에만 fetch
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingResources(true);
    (async () => {
      const [libRes, snapRes] = await Promise.allSettled([
        getStoreExecutionAssets({ page: 1, limit: FETCH_LIMIT }),
        assetSnapshotApi.list({ type: 'resource', page: 1, limit: FETCH_LIMIT }),
      ]);
      if (cancelled) return;
      const libRows = libRes.status === 'fulfilled'
        ? (libRes.value.data?.items ?? []).map(libraryToRow)
        : [];
      const snapRows = snapRes.status === 'fulfilled'
        ? (snapRes.value.data?.items ?? []).map(snapshotToRow)
        : [];
      const merged = [...libRows, ...snapRows].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setResources(merged);
      setLoadingResources(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // open/close 시 상태 초기화
  useEffect(() => {
    if (!open) {
      setStep('select');
      setSelected(new Set());
      setSearch('');
      setTitle('');
      setSourceText('');
      setEditorHtml('');
      setAiGenerated(false);
      setAiError(null);
      setUserIntent('');
      setPresetLength(null);
      setPresetTone(null);
      setPresetDirection(null);
      setPresetImage(null);
      setPresetUrl(null);
    }
  }, [open]);

  const filteredResources = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resources;
    return resources.filter(
      (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
    );
  }, [resources, search]);

  const selectedRows = useMemo(
    () => resources.filter((r) => selected.has(r.id)),
    [resources, selected],
  );

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const goCompose = useCallback(() => {
    if (selectedRows.length === 0) return;
    setSourceText(composeSourceText(selectedRows));
    const firstTitle = selectedRows[0]?.title ?? '';
    // WO-O4O-STORE-CONTENT-GENERATION-USER-INTENT-V1: "정리" → "콘텐츠"
    const defaultTitle = selectedRows.length > 1
      ? `${firstTitle} 외 ${selectedRows.length - 1}개 자료 콘텐츠`
      : firstTitle;
    setTitle(defaultTitle);
    setStep('compose');
  }, [selectedRows]);

  // AI 콘텐츠 생성 — AiContentModal 과 동일 endpoint(/api/ai/content) + outputType='product_detail'
  // WO-O4O-STORE-CONTENT-GENERATION-USER-INTENT-V1:
  //   사용자 제작 요청(userIntent) + preset(tone/length/direction/image/url) 을
  //   customPrompt 와 options 로 매핑하여 의도 반영. input 은 원소스 bundle 텍스트.
  const handleGenerate = useCallback(async () => {
    if (!sourceText.trim()) {
      setAiError('원소스 정보가 비어 있습니다. 자료를 선택해 주세요.');
      return;
    }
    setGenerating(true);
    setAiError(null);
    try {
      const token = getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const customPrompt = buildCustomPrompt({
        userIntent,
        length: presetLength,
        tone: presetTone,
        direction: presetDirection,
        image: presetImage,
        url: presetUrl,
      });
      const backendTone = mapBackendTone(presetTone);
      const backendLength = mapBackendLength(presetLength);
      const options: Record<string, string> = {};
      if (backendTone) options.tone = backendTone;
      if (backendLength) options.length = backendLength;

      // WO-O4O-STORE-AI-CONTENT-AUTH-TOKEN-FIX-V1:
      // credentials:'include' 제거 — stale httpOnly cookie 간섭 방지.
      // 인증은 Bearer token(headers.Authorization) 단독으로 처리.
      const res = await fetch(`${AI_API_BASE}/api/ai/content`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          input: sourceText.trim().slice(0, 10000),
          outputType: AI_OUTPUT_TYPE,
          options,
          customPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || data?.error || 'AI 생성에 실패했습니다.');
      }
      setEditorHtml(data.html || '');
      setAiGenerated(true);
      if (data.title && !title.trim()) setTitle(data.title);
    } catch (err: any) {
      setAiError(err?.message || 'AI 서비스 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  }, [sourceText, title, userIntent, presetLength, presetTone, presetDirection, presetImage, presetUrl]);

  // 저장 — direct content 로 POST /store-contents (AiContentModal showStoreSave 와 동일).
  // WO-O4O-STORE-CONTENT-GENERATION-USER-INTENT-V1:
  //   sourceResources 에 url/file/assetType 포함 → 향후 매장 제작 자료 흐름에서 원본으로 재사용 가능.
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error('제목을 입력해 주세요');
      return;
    }
    const html = editorHtml.trim();
    if (!html || html === '<p></p>') {
      toast.error('콘텐츠 본문이 비어 있습니다. AI 콘텐츠 생성을 먼저 실행하거나 직접 작성해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const sourceMetadata = selectedRows.map((r) => ({
        origin: r.kind === 'library' ? 'library' : 'snapshot',
        id: r.rawId,
        title: r.title,
        assetType: r.assetType,
        url: r.url,
        fileName: r.sourceFileName,
      }));
      const res = await apiClient.post<{ success: boolean; data: { id: string } }>(
        '/store-contents',
        {
          title: title.trim(),
          contentJson: {
            html,
            sourceResources: sourceMetadata,
            generatedBy: 'create-from-resources',
            userIntent: userIntent.trim() || undefined,
            presets: {
              length: presetLength,
              tone: presetTone,
              direction: presetDirection,
              image: presetImage,
              url: presetUrl,
            },
          },
        },
      );
      const newId = res?.data?.id;
      toast.success('내 자료함 콘텐츠로 저장되었습니다');
      onCreated?.(newId);
      onClose();
      if (newId) navigate(`/store/content/direct/${newId}`);
    } catch (err: any) {
      if (err?.status === 403) {
        toast.error('매장 경영자 권한이 필요합니다');
      } else {
        toast.error(err?.message || '저장에 실패했습니다');
      }
    } finally {
      setSaving(false);
    }
  }, [title, editorHtml, selectedRows, userIntent, presetLength, presetTone, presetDirection, presetImage, presetUrl, onCreated, onClose, navigate]);

  if (!open) return null;

  return (
    <div style={styles.backdrop} role="presentation" onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            {step === 'compose' && (
              <button
                type="button"
                onClick={() => setStep('select')}
                style={styles.iconBtn}
                aria-label="이전"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 style={styles.title}>
              {step === 'select' ? '자료 선택' : '콘텐츠 작성'}
            </h2>
            <span style={styles.stepBadge}>{step === 'select' ? '1 / 2' : '2 / 2'}</span>
          </div>
          <button type="button" onClick={onClose} style={styles.iconBtn} aria-label="닫기">
            <X size={16} />
          </button>
        </header>

        {step === 'select' ? (
          <SelectStep
            loading={loadingResources}
            resources={filteredResources}
            allResources={resources}
            search={search}
            onSearchChange={setSearch}
            selected={selected}
            onToggle={toggleOne}
          />
        ) : (
          <ComposeStep
            selectedRows={selectedRows}
            title={title}
            onTitleChange={setTitle}
            userIntent={userIntent}
            onUserIntentChange={setUserIntent}
            presetLength={presetLength}
            onPresetLengthChange={setPresetLength}
            presetTone={presetTone}
            onPresetToneChange={setPresetTone}
            presetDirection={presetDirection}
            onPresetDirectionChange={setPresetDirection}
            presetImage={presetImage}
            onPresetImageChange={setPresetImage}
            presetUrl={presetUrl}
            onPresetUrlChange={setPresetUrl}
            generating={generating}
            onGenerate={handleGenerate}
            editorHtml={editorHtml}
            onEditorHtmlChange={setEditorHtml}
            aiGenerated={aiGenerated}
            aiError={aiError}
          />
        )}

        <footer style={styles.footer}>
          {step === 'select' ? (
            <>
              <span style={styles.footerHint}>{selected.size}개 선택됨</span>
              <div style={styles.footerActions}>
                <button type="button" onClick={onClose} style={styles.secondaryBtn}>
                  취소
                </button>
                <button
                  type="button"
                  onClick={goCompose}
                  disabled={selected.size === 0}
                  style={{ ...styles.primaryBtn, opacity: selected.size === 0 ? 0.5 : 1 }}
                >
                  다음 →
                </button>
              </div>
            </>
          ) : (
            <>
              <span style={styles.footerHint}>
                {aiGenerated ? <CheckCircle2 size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> : null}
                {aiGenerated
                  ? 'AI 콘텐츠 생성 완료 — 편집기에서 수정 후 저장하세요'
                  : '먼저 "AI 콘텐츠 생성"을 실행해 주세요'}
              </span>
              <div style={styles.footerActions}>
                <button type="button" onClick={onClose} style={styles.secondaryBtn} disabled={saving}>
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!editorHtml.trim() || saving || !title.trim()}
                  style={{ ...styles.primaryBtn, opacity: !editorHtml.trim() || saving || !title.trim() ? 0.5 : 1 }}
                >
                  {saving ? <Loader2 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} className="animate-spin" /> : <Save size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />}
                  {saving ? '저장 중...' : '내 자료함 콘텐츠로 저장'}
                </button>
              </div>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

// ─── Select Step ─────────────────────────────────────────────────────────────

function SelectStep({
  loading,
  resources,
  allResources,
  search,
  onSearchChange,
  selected,
  onToggle,
}: {
  loading: boolean;
  resources: ResourceRow[];
  allResources: ResourceRow[];
  search: string;
  onSearchChange: (v: string) => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div style={styles.body}>
      <div style={styles.searchWrap}>
        <Search size={14} style={styles.searchIcon} />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="자료 제목·설명 검색"
          style={styles.searchInput}
        />
      </div>

      {loading ? (
        <div style={styles.empty}>불러오는 중...</div>
      ) : resources.length === 0 ? (
        <div style={styles.empty}>
          {allResources.length === 0
            ? '내 자료함에 자료가 없습니다. 자료를 먼저 추가해 주세요.'
            : '검색 결과가 없습니다'}
        </div>
      ) : (
        <ul style={styles.list}>
          {resources.map((r) => {
            const meta = ASSET_TYPE_META[r.assetType];
            const Icon = meta.Icon;
            const isSelected = selected.has(r.id);
            return (
              <li key={r.id}>
                <label
                  style={{
                    ...styles.listItem,
                    borderColor: isSelected ? colors.primary : colors.neutral200,
                    background: isSelected ? '#F5F3FF' : colors.white,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(r.id)}
                    style={styles.checkbox}
                  />
                  <div style={{ ...styles.assetBadge, background: meta.bg, color: meta.color }}>
                    <Icon size={12} />
                    {meta.label}
                  </div>
                  <div style={styles.itemMain}>
                    <span style={styles.itemTitle} title={r.title}>{r.title}</span>
                    {r.description && (
                      <span style={styles.itemDesc} title={r.description}>{r.description}</span>
                    )}
                  </div>
                  <span style={styles.itemSource}>{r.kind === 'library' ? '직접 업로드' : '가져온 자료'}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Compose Step ────────────────────────────────────────────────────────────
// WO-O4O-STORE-CONTENT-GENERATION-USER-INTENT-V1:
//   제작 요청 자유 입력 + preset chips + AI 콘텐츠 생성 + RichTextEditor 검토/수정.

function PresetChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div style={styles.presetGroup}>
      <span style={styles.presetGroupLabel}>{label}</span>
      <div style={styles.presetChipRow}>
        {options.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(active ? null : opt.key)}
              style={{
                ...styles.presetChip,
                ...(active ? styles.presetChipActive : {}),
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ComposeStep({
  selectedRows,
  title,
  onTitleChange,
  userIntent,
  onUserIntentChange,
  presetLength,
  onPresetLengthChange,
  presetTone,
  onPresetToneChange,
  presetDirection,
  onPresetDirectionChange,
  presetImage,
  onPresetImageChange,
  presetUrl,
  onPresetUrlChange,
  generating,
  onGenerate,
  editorHtml,
  onEditorHtmlChange,
  aiGenerated,
  aiError,
}: {
  selectedRows: ResourceRow[];
  title: string;
  onTitleChange: (v: string) => void;
  userIntent: string;
  onUserIntentChange: (v: string) => void;
  presetLength: LengthPreset | null;
  onPresetLengthChange: (v: LengthPreset | null) => void;
  presetTone: TonePreset | null;
  onPresetToneChange: (v: TonePreset | null) => void;
  presetDirection: DirectionPreset | null;
  onPresetDirectionChange: (v: DirectionPreset | null) => void;
  presetImage: ImagePreset | null;
  onPresetImageChange: (v: ImagePreset | null) => void;
  presetUrl: UrlPreset | null;
  onPresetUrlChange: (v: UrlPreset | null) => void;
  generating: boolean;
  onGenerate: () => void;
  editorHtml: string;
  onEditorHtmlChange: (v: string) => void;
  aiGenerated: boolean;
  aiError: string | null;
}) {
  const handleEditorChange = useCallback(
    (content: EditorContent) => onEditorHtmlChange(content.html),
    [onEditorHtmlChange],
  );
  const aiHeaders = useMemo<Record<string, string> | undefined>(() => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }, []);

  return (
    <div style={styles.body}>
      <div style={styles.composeRow}>
        <label style={styles.label}>제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="콘텐츠 제목"
          style={styles.input}
          maxLength={200}
        />
      </div>

      <div style={styles.composeRow}>
        <label style={styles.label}>선택한 원소스 ({selectedRows.length}개)</label>
        <ul style={styles.chipList}>
          {selectedRows.map((r) => (
            <li key={r.id} style={styles.chip} title={r.title}>
              {r.title}
            </li>
          ))}
        </ul>
      </div>

      <div style={styles.composeRow}>
        <label style={styles.label} htmlFor="cgu-user-intent">제작 요청 (자유 입력)</label>
        <textarea
          id="cgu-user-intent"
          value={userIntent}
          onChange={(e) => onUserIntentChange(e.target.value)}
          rows={3}
          style={styles.textarea}
          placeholder='예: "당뇨 고객에게 도움이 된다는 내용을 설득력 있게 A4 1장 분량으로 작성해 주세요." / "약사가 고객에게 설명하는 느낌으로 쉽게 풀어 주세요."'
          maxLength={400}
        />
        <span style={styles.helpText}>
          원소스를 어떻게 활용할지 자유롭게 입력하세요. 선택한 원소스의 본문·URL·이미지가 함께 AI에 전달됩니다.
        </span>
      </div>

      <div style={styles.composeRow}>
        <span style={styles.label}>보조 옵션 (선택)</span>
        <PresetChipGroup label="분량"      options={LENGTH_OPTIONS}    value={presetLength}    onChange={onPresetLengthChange} />
        <PresetChipGroup label="문장 톤"   options={TONE_OPTIONS}      value={presetTone}      onChange={onPresetToneChange} />
        <PresetChipGroup label="내용 방향" options={DIRECTION_OPTIONS} value={presetDirection} onChange={onPresetDirectionChange} />
        <PresetChipGroup label="이미지"    options={IMAGE_OPTIONS}     value={presetImage}     onChange={onPresetImageChange} />
        <PresetChipGroup label="URL"       options={URL_OPTIONS}       value={presetUrl}       onChange={onPresetUrlChange} />
      </div>

      <div style={styles.composeRow}>
        <div style={styles.labelRow}>
          <label style={styles.label}>AI 매장 콘텐츠 생성</label>
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            style={{ ...styles.aiBtn, opacity: generating ? 0.5 : 1 }}
          >
            {generating ? (
              <>
                <Loader2 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} className="animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Sparkles size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                AI 콘텐츠 생성
              </>
            )}
          </button>
        </div>
        {aiError && <p style={styles.error}>{aiError}</p>}
      </div>

      <div style={styles.composeRow}>
        <label style={styles.label}>매장 콘텐츠 본문 (편집 가능)</label>
        {aiGenerated || editorHtml ? (
          <div style={styles.editorWrap}>
            <RichTextEditor
              value={editorHtml}
              onChange={handleEditorChange}
              placeholder="AI 생성 결과가 여기에 표시됩니다. 자유롭게 수정한 뒤 저장하세요."
              minHeight="320px"
              preset="full"
              aiRequestHeaders={aiHeaders}
            />
          </div>
        ) : (
          <div style={styles.previewEmpty}>
            {generating
              ? 'AI 콘텐츠 생성 중입니다...'
              : '아직 결과가 없습니다. 위 "AI 콘텐츠 생성" 버튼을 눌러주세요.'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '90vh',
    background: colors.white,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: `1px solid ${colors.neutral200}`,
    background: colors.white,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: colors.neutral800,
  },
  stepBadge: {
    fontSize: 11,
    color: colors.neutral500,
    padding: '2px 8px',
    background: colors.neutral100,
    borderRadius: 999,
  },
  iconBtn: {
    width: 28,
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: colors.neutral500,
    cursor: 'pointer',
    borderRadius: 6,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  searchWrap: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    color: colors.neutral400,
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px 8px 30px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    background: colors.white,
    boxSizing: 'border-box',
  },
  empty: {
    padding: '40px 16px',
    textAlign: 'center',
    color: colors.neutral400,
    fontSize: 13,
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: 8,
    cursor: 'pointer',
  },
  checkbox: {
    width: 14,
    height: 14,
    flexShrink: 0,
    cursor: 'pointer',
  },
  assetBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: 999,
    flexShrink: 0,
  },
  itemMain: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.neutral800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemDesc: {
    fontSize: 12,
    color: colors.neutral500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemSource: {
    fontSize: 11,
    color: colors.neutral400,
    flexShrink: 0,
  },
  composeRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: colors.neutral700,
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    background: colors.white,
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    background: colors.white,
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.5,
  },
  aiBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    border: `1px solid ${colors.primary}`,
    borderRadius: 6,
    background: '#F5F3FF',
    color: colors.primary,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
  helpText: {
    fontSize: 11,
    color: colors.neutral500,
    lineHeight: 1.5,
  },
  presetGroup: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  presetGroupLabel: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 500,
    color: colors.neutral600,
    paddingTop: 4,
    minWidth: 64,
  },
  presetChipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  presetChip: {
    padding: '4px 10px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: 999,
    background: colors.white,
    color: colors.neutral700,
    fontSize: 12,
    cursor: 'pointer',
  },
  presetChipActive: {
    background: '#EFF6FF',
    borderColor: colors.primary,
    color: colors.primary,
    fontWeight: 500,
  },
  editorWrap: {
    border: `1px solid ${colors.neutral200}`,
    borderRadius: 6,
    overflow: 'hidden',
    background: colors.white,
  },
  previewEmpty: {
    padding: 24,
    border: `1px dashed ${colors.neutral300}`,
    borderRadius: 6,
    fontSize: 12,
    color: colors.neutral400,
    textAlign: 'center',
  },
  chipList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  chip: {
    padding: '4px 10px',
    fontSize: 12,
    color: colors.neutral700,
    background: colors.neutral100,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: 999,
    maxWidth: 220,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  error: {
    margin: '6px 0 0',
    fontSize: 12,
    color: '#DC2626',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 18px',
    borderTop: `1px solid ${colors.neutral200}`,
    background: colors.neutral100,
    flexWrap: 'wrap',
    gap: 8,
  },
  footerHint: {
    fontSize: 12,
    color: colors.neutral500,
  },
  footerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  secondaryBtn: {
    padding: '8px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: 6,
    background: colors.white,
    color: colors.neutral700,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 14px',
    border: 'none',
    borderRadius: 6,
    background: colors.primary,
    color: colors.white,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
};
