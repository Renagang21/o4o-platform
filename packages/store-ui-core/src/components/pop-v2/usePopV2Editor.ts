/**
 * POP V2 편집 상태 — WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 *
 * 사용자 동선:
 *   대상 선택(상품 | 내 매장 콘텐츠) → 사용할 콘텐츠 결정 → 템플릿 → 편집
 *   → 저장 → 미리보기 → PDF/PNG 출력 → 나중에 다시 열어 수정
 *
 * 불변식
 *   I1 Source-Required — 소스를 하나도 고르지 않으면 저장 자체를 시도하지 않는다.
 *   I2 원본 불변       — 편집은 POP Document 의 fields 만 바꾼다. 원본 콘텐츠에 write 하지 않는다.
 *   자동 fallback 금지 — 상품 콘텐츠는 서버가 정한 축(product-linked → STORE canonical →
 *                        기본정보)만 사용하며 B2B/B2C 설명서로 자동 대체하지 않는다.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  PopV2Api,
  PopV2ContentCandidate,
  PopV2ContentType,
  PopV2Document,
  PopV2DocumentInput,
  PopV2Fields,
  PopV2Format,
  PopV2Layout,
  PopV2Notify,
  PopV2ProductOption,
  PopV2ResolvedFrom,
  PopV2Kind,
  PopV2Source,
  PopV2SourceOrigin,
} from './types';

const EMPTY_FIELDS: PopV2Fields = {
  title: '',
  bullets: [],
  shortText: '',
  longText: '',
  imageUrl: null,
};

export interface UsePopV2EditorOptions {
  api: PopV2Api;
  notify: PopV2Notify;
  /** 기존 POP 재편집이면 문서 id, 새 POP 이면 undefined */
  documentId?: string;
  defaultTemplateId: string;
  onSaved?: (doc: PopV2Document) => void;
}

export interface PopV2EditorState {
  loading: boolean;
  loadError: string | null;
  saving: boolean;
  rendering: PopV2Format | null;

  documentId: string | null;
  title: string;
  setTitle: (v: string) => void;
  popKind: PopV2Kind;
  chooseKind: (k: PopV2Kind) => void;
  contentType: PopV2ContentType | null;
  setContentType: (v: PopV2ContentType) => void;

  sources: PopV2Source[];
  resolvedFrom: PopV2ResolvedFrom | null;
  fields: PopV2Fields;
  setField: <K extends keyof PopV2Fields>(key: K, value: PopV2Fields[K]) => void;
  setBullet: (index: number, value: string) => void;
  addBullet: () => void;
  removeBullet: (index: number) => void;

  templateId: string;
  setTemplateId: (v: string) => void;
  layout: PopV2Layout;
  setLayout: (v: PopV2Layout) => void;
  qrCodeId: string | null;
  setQrCodeId: (v: string | null) => void;
  qrOptions: Array<{ id: string; title: string }>;

  contentCandidates: PopV2ContentCandidate[];
  contentCandidatesLoading: boolean;
  productOptions: PopV2ProductOption[];
  pickContentSource: (origin: PopV2SourceOrigin, id: string) => Promise<void>;
  pickProductSource: (productId: string, sourceType: 'listing' | 'local') => Promise<void>;

  canSave: boolean;
  save: () => Promise<PopV2Document | null>;
  render: (format: PopV2Format) => Promise<void>;
  lastOutputUrl: string | null;
}

export function usePopV2Editor(options: UsePopV2EditorOptions): PopV2EditorState {
  const { api, notify, defaultTemplateId, onSaved } = options;

  const [loading, setLoading] = useState(!!options.documentId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState<PopV2Format | null>(null);

  const [documentId, setDocumentId] = useState<string | null>(options.documentId ?? null);
  const [title, setTitle] = useState('');
  const [popKind, setPopKind] = useState<PopV2Kind>('content');
  const [contentType, setContentType] = useState<PopV2ContentType | null>('general');
  const [sources, setSources] = useState<PopV2Source[]>([]);
  const [resolvedFrom, setResolvedFrom] = useState<PopV2ResolvedFrom | null>(null);
  const [fields, setFields] = useState<PopV2Fields>(EMPTY_FIELDS);
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const [layout, setLayout] = useState<PopV2Layout>('A4');
  const [qrCodeId, setQrCodeId] = useState<string | null>(null);
  const [qrOptions, setQrOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [contentCandidates, setContentCandidates] = useState<PopV2ContentCandidate[]>([]);
  const [contentCandidatesLoading, setContentCandidatesLoading] = useState(false);
  const [productOptions, setProductOptions] = useState<PopV2ProductOption[]>([]);
  const [lastOutputUrl, setLastOutputUrl] = useState<string | null>(null);

  // ── 기존 POP 열기 (재편집) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!options.documentId) return;
    let alive = true;
    setLoading(true);
    setLoadError(null);
    api
      .get(options.documentId)
      .then((doc) => {
        if (!alive) return;
        setDocumentId(doc.id);
        setTitle(doc.title);
        setPopKind(doc.popKind);
        setContentType(doc.contentType);
        setSources(doc.sources ?? []);
        setFields({ ...EMPTY_FIELDS, ...(doc.fields ?? {}) });
        setTemplateId(doc.templateId || defaultTemplateId);
        setLayout(doc.layout);
        setQrCodeId(doc.qrCodeId);
      })
      .catch((e) => {
        if (!alive) return;
        setLoadError(e instanceof Error ? e.message : 'POP 을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api, options.documentId, defaultTemplateId]);

  // ── 보조 목록 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    api
      .listQrCodes()
      .then((list) => alive && setQrOptions(list))
      .catch(() => alive && setQrOptions([]));
    return () => {
      alive = false;
    };
  }, [api]);

  const loadContentCandidates = useCallback(async () => {
    setContentCandidatesLoading(true);
    try {
      setContentCandidates(await api.listContentSources());
    } catch (e) {
      setContentCandidates([]);
      notify.error(e instanceof Error ? e.message : '내 매장 콘텐츠를 불러오지 못했습니다.');
    } finally {
      setContentCandidatesLoading(false);
    }
  }, [api, notify]);

  const loadProductOptions = useCallback(async () => {
    if (!api.listProductOptions) return;
    try {
      setProductOptions(await api.listProductOptions());
    } catch {
      setProductOptions([]);
    }
  }, [api]);

  const chooseKind = useCallback(
    (k: PopV2Kind) => {
      setPopKind(k);
      // 종류를 바꾸면 이전 소스는 유효하지 않다 — 남겨두면 엉뚱한 원장을 참조한 채 저장된다.
      setSources([]);
      setResolvedFrom(null);
      if (k === 'content') {
        setContentType((prev) => prev ?? 'general');
        void loadContentCandidates();
      } else {
        void loadProductOptions();
      }
    },
    [loadContentCandidates, loadProductOptions],
  );

  useEffect(() => {
    if (options.documentId) return;
    // 새 POP 은 기본이 "일반 내 매장 콘텐츠" 다.
    void loadContentCandidates();
  }, [options.documentId, loadContentCandidates]);

  // ── 소스 선택 ─────────────────────────────────────────────────────────────
  const applyResolved = useCallback(
    (resolved: { sources: PopV2Source[]; fields: PopV2Fields; resolvedFrom: PopV2ResolvedFrom }) => {
      setSources(resolved.sources);
      setResolvedFrom(resolved.resolvedFrom);
      setFields({ ...EMPTY_FIELDS, ...resolved.fields });
      setTitle((prev) => prev || resolved.fields.title || '');
    },
    [],
  );

  const pickContentSource = useCallback(
    async (origin: PopV2SourceOrigin, id: string) => {
      try {
        applyResolved(await api.resolveContentSource(origin, id));
      } catch (e) {
        notify.error(e instanceof Error ? e.message : '콘텐츠를 불러오지 못했습니다.');
      }
    },
    [api, notify, applyResolved],
  );

  const pickProductSource = useCallback(
    async (productId: string, sourceType: 'listing' | 'local') => {
      try {
        applyResolved(await api.resolveProductSource(productId, sourceType));
      } catch (e) {
        notify.error(e instanceof Error ? e.message : '상품 콘텐츠를 불러오지 못했습니다.');
      }
    },
    [api, notify, applyResolved],
  );

  // ── 필드 편집 ─────────────────────────────────────────────────────────────
  const setField = useCallback(
    <K extends keyof PopV2Fields>(key: K, value: PopV2Fields[K]) => {
      setFields((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const setBullet = useCallback((index: number, value: string) => {
    setFields((prev) => {
      const bullets = [...prev.bullets];
      bullets[index] = value;
      return { ...prev, bullets };
    });
  }, []);

  const addBullet = useCallback(() => {
    setFields((prev) => ({ ...prev, bullets: [...prev.bullets, ''] }));
  }, []);

  const removeBullet = useCallback((index: number) => {
    setFields((prev) => ({ ...prev, bullets: prev.bullets.filter((_, i) => i !== index) }));
  }, []);

  // ── 저장 / 출력 ───────────────────────────────────────────────────────────
  const canSave = useMemo(
    () => !!title.trim() && sources.length > 0 && !!templateId && !saving,
    [title, sources, templateId, saving],
  );

  const buildInput = useCallback(
    (): PopV2DocumentInput => ({
      title: title.trim(),
      popKind,
      contentType: popKind === 'content' ? (contentType ?? 'general') : null,
      sources,
      fields: {
        ...fields,
        title: fields.title || title.trim(),
        bullets: fields.bullets.filter((b) => b.trim()),
      },
      templateId,
      layout,
      qrCodeId,
    }),
    [title, popKind, contentType, sources, fields, templateId, layout, qrCodeId],
  );

  const save = useCallback(async (): Promise<PopV2Document | null> => {
    if (sources.length === 0) {
      notify.error('POP 으로 만들 콘텐츠를 먼저 선택해 주세요.');
      return null;
    }
    setSaving(true);
    try {
      const input = buildInput();
      const doc = documentId ? await api.update(documentId, input) : await api.create(input);
      setDocumentId(doc.id);
      notify.success('POP 을 저장했습니다.');
      onSaved?.(doc);
      return doc;
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'POP 저장에 실패했습니다.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [api, notify, documentId, buildInput, sources, onSaved]);

  const render = useCallback(
    async (format: PopV2Format) => {
      // 출력은 저장된 문서를 대상으로 한다 — 저장 전이면 먼저 저장한다.
      let id = documentId;
      if (!id) {
        const saved = await save();
        if (!saved) return;
        id = saved.id;
      } else if (canSave) {
        await save();
      }
      setRendering(format);
      try {
        const result = await api.render(id, format);
        setLastOutputUrl(result.fileUrl);
        notify.success(`${format.toUpperCase()} 파일을 만들었습니다.`);
        if (typeof window !== 'undefined' && result.fileUrl) {
          window.open(result.fileUrl, '_blank', 'noopener');
        }
      } catch (e) {
        notify.error(e instanceof Error ? e.message : '출력에 실패했습니다.');
      } finally {
        setRendering(null);
      }
    },
    [api, notify, documentId, save, canSave],
  );

  return {
    loading,
    loadError,
    saving,
    rendering,
    documentId,
    title,
    setTitle,
    popKind,
    chooseKind,
    contentType,
    setContentType,
    sources,
    resolvedFrom,
    fields,
    setField,
    setBullet,
    addBullet,
    removeBullet,
    templateId,
    setTemplateId,
    layout,
    setLayout,
    qrCodeId,
    setQrCodeId,
    qrOptions,
    contentCandidates,
    contentCandidatesLoading,
    productOptions,
    pickContentSource,
    pickProductSource,
    canSave,
    save,
    render,
    lastOutputUrl,
  };
}
