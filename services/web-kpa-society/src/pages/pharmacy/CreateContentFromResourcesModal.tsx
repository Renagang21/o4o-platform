/**
 * CreateContentFromResourcesModal — 자료함 자료 → direct 콘텐츠 제작
 *
 * WO-O4O-STORE-CONTENT-CREATION-FROM-LIBRARY-RESOURCES-V1
 *
 * "내 자료함 → 자료" 의 자료를 입력 source 로 사용하여 direct 콘텐츠(매장 전용)
 * 를 만든다. 새 editor / AI 시스템을 도입하지 않고 기존 자원만 재사용:
 *   - 자료 수집: storeExecutionAssets + assetSnapshotApi.list({type:'resource'})
 *     (StoreLibraryResourcesPage 와 동일 source)
 *   - AI 생성: POST /api/ai/content (AiContentModal 과 동일 endpoint, outputType='product_detail')
 *   - 직접 콘텐츠 저장: POST /api/v1/kpa/store-contents (AiContentModal showStoreSave 와 동일 destination)
 *
 * 흐름:
 *   Step 1 (select):  자료 multi-select + 검색
 *      ↓ "다음"
 *   Step 2 (compose): 자료 정보로 자동 작성된 source text 편집 + "AI 정리" + 결과 미리보기 + 제목
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
const AI_API_BASE: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) || '';

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
function composeSourceText(rows: ResourceRow[]): string {
  if (rows.length === 0) return '';
  const lines: string[] = ['다음 자료들을 참고하여 매장 콘텐츠로 정리해 주세요.', ''];
  rows.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.title}`);
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
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      setGeneratedHtml('');
      setAiError(null);
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
    const defaultTitle = selectedRows.length > 1
      ? `${firstTitle} 외 ${selectedRows.length - 1}개 자료 정리`
      : firstTitle;
    setTitle(defaultTitle);
    setStep('compose');
  }, [selectedRows]);

  // AI 생성 — AiContentModal 과 동일 endpoint(/api/ai/content) + outputType='product_detail'
  const handleGenerate = useCallback(async () => {
    if (!sourceText.trim()) {
      setAiError('자료 정보가 비어 있습니다. 자료를 선택하거나 직접 입력해 주세요.');
      return;
    }
    setGenerating(true);
    setAiError(null);
    try {
      const token = getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${AI_API_BASE}/api/ai/content`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          input: sourceText.trim().slice(0, 10000),
          outputType: AI_OUTPUT_TYPE,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || data?.error || 'AI 생성에 실패했습니다.');
      }
      setGeneratedHtml(data.html || '');
      if (data.title && !title.trim()) setTitle(data.title);
    } catch (err: any) {
      setAiError(err?.message || 'AI 서비스 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  }, [sourceText, title]);

  // 저장 — direct content 로 POST /store-contents (AiContentModal showStoreSave 와 동일)
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error('제목을 입력해 주세요');
      return;
    }
    if (!generatedHtml) {
      toast.error('AI 정리 결과가 없습니다. 먼저 "AI 정리"를 실행해 주세요.');
      return;
    }
    setSaving(true);
    try {
      // contentJson: AiContentModal 의 store 저장 형태(html only)를 그대로 사용.
      // source metadata 는 source 자료 식별자 + 라벨만 보존 (운영 연결 없음).
      const sourceMetadata = selectedRows.map((r) => ({
        origin: r.kind === 'library' ? 'library' : 'snapshot',
        id: r.rawId,
        title: r.title,
      }));
      const res = await apiClient.post<{ success: boolean; data: { id: string } }>(
        '/store-contents',
        {
          title: title.trim(),
          contentJson: {
            html: generatedHtml,
            sourceResources: sourceMetadata,
            generatedBy: 'create-from-resources',
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
  }, [title, generatedHtml, selectedRows, onCreated, onClose, navigate]);

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
            sourceText={sourceText}
            onSourceTextChange={setSourceText}
            generating={generating}
            onGenerate={handleGenerate}
            generatedHtml={generatedHtml}
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
                {generatedHtml ? <CheckCircle2 size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> : null}
                {generatedHtml ? 'AI 정리 완료 — 저장 가능' : '먼저 "AI 정리"를 실행해 주세요'}
              </span>
              <div style={styles.footerActions}>
                <button type="button" onClick={onClose} style={styles.secondaryBtn} disabled={saving}>
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!generatedHtml || saving || !title.trim()}
                  style={{ ...styles.primaryBtn, opacity: !generatedHtml || saving || !title.trim() ? 0.5 : 1 }}
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

function ComposeStep({
  selectedRows,
  title,
  onTitleChange,
  sourceText,
  onSourceTextChange,
  generating,
  onGenerate,
  generatedHtml,
  aiError,
}: {
  selectedRows: ResourceRow[];
  title: string;
  onTitleChange: (v: string) => void;
  sourceText: string;
  onSourceTextChange: (v: string) => void;
  generating: boolean;
  onGenerate: () => void;
  generatedHtml: string;
  aiError: string | null;
}) {
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
        <label style={styles.label}>선택한 자료 ({selectedRows.length}개)</label>
        <ul style={styles.chipList}>
          {selectedRows.map((r) => (
            <li key={r.id} style={styles.chip} title={r.title}>
              {r.title}
            </li>
          ))}
        </ul>
      </div>

      <div style={styles.composeRow}>
        <div style={styles.labelRow}>
          <label style={styles.label}>참고 자료 정보 (AI 입력)</label>
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating || !sourceText.trim()}
            style={{ ...styles.aiBtn, opacity: generating || !sourceText.trim() ? 0.5 : 1 }}
          >
            {generating ? (
              <>
                <Loader2 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} className="animate-spin" />
                AI 정리 중...
              </>
            ) : (
              <>
                <Sparkles size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                AI 정리
              </>
            )}
          </button>
        </div>
        <textarea
          value={sourceText}
          onChange={(e) => onSourceTextChange(e.target.value)}
          rows={6}
          style={styles.textarea}
          placeholder="자료를 정리할 방향을 자유롭게 추가하실 수 있습니다."
          maxLength={10000}
        />
        {aiError && <p style={styles.error}>{aiError}</p>}
      </div>

      <div style={styles.composeRow}>
        <label style={styles.label}>AI 정리 결과 미리보기</label>
        {generatedHtml ? (
          <div
            style={styles.preview}
            // AI 결과 HTML — 백엔드가 정제. 신뢰 컨텍스트는 백엔드 게이트.
            dangerouslySetInnerHTML={{ __html: generatedHtml }}
          />
        ) : (
          <div style={styles.previewEmpty}>
            {generating ? 'AI 정리 중입니다...' : '아직 결과가 없습니다. 위 "AI 정리" 버튼을 눌러주세요.'}
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
  preview: {
    padding: 12,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: 6,
    background: colors.neutral100,
    fontSize: 13,
    color: colors.neutral800,
    lineHeight: 1.55,
    maxHeight: 240,
    overflowY: 'auto',
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
