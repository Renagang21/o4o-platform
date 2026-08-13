/**
 * usePopComposer — POP 제작 화면 상태 모델
 * WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1
 *
 * K-Cosmetics / GlycoPharm `StorePopPage` 의 state·effect·핸들러를 그대로 옮긴 것이다.
 * 업무 규칙(최대 8개, 자료 1개 이상, save=true 분기, 실패 시 선택 유지)은 변경하지 않는다.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { parseProductionRouterState } from '../../utils/productionUtils';
import {
  buildPopGeneratePayload,
  isPopNotFoundError,
  normalizeLocalProductForPop,
  parsePopPrefillState,
  popAiContentToHtml,
} from './popHelpers';
import type {
  PopAiContent,
  PopComposerApi,
  PopComposerLabels,
  PopLayout,
  PopLocalProductItem,
  PopQrOption,
  PopSupplierItem,
} from './types';

export interface UsePopComposerOptions {
  api: PopComposerApi;
  labels: PopComposerLabels;
  notify: { success: (m: string) => void; error: (m: string) => void };
  defaultTemplateId: string;
}

export function usePopComposer({ api, labels, notify, defaultTemplateId }: UsePopComposerOptions) {
  const location = useLocation();

  // ── 공급자 자료 ──────────────────────────────────────────────────────────
  const [items, setItems] = useState<PopSupplierItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadItems = useCallback(async () => {
    setItemsLoading(true);
    setItemsError(null);
    try {
      setItems(await api.fetchSupplierItems());
    } catch (err: any) {
      setItemsError(err?.message || '자료를 불러오지 못했습니다');
    } finally {
      setItemsLoading(false);
    }
  }, [api]);

  useEffect(() => { loadItems(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      if (prev.length >= 8) {
        notify.error('최대 8개까지 선택할 수 있습니다');
        return prev;
      }
      return [...prev, id];
    });
  }, [notify]);

  // ── 가져온 POP 문구 (prefill 전용) ───────────────────────────────────────
  const [popAiContent, setPopAiContent] = useState<PopAiContent | null>(null);

  useEffect(() => {
    const parsed = parsePopPrefillState(location.state);
    if (!parsed) return;
    setPopAiContent(parsed);
    window.history.replaceState({}, document.title);
  }, [location.state]);

  // ── 매장 자체 상품(origin='local') ───────────────────────────────────────
  //    source identity 만 router state 로 받고 본문은 재조회한다.
  const [localItems, setLocalItems] = useState<PopLocalProductItem[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const localIdsRef = useRef<string[]>([]);

  const loadLocalProducts = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setLocalLoading(true);
    setLocalError(null);
    const fetched: PopLocalProductItem[] = [];
    let failed = 0;
    let blocked = 0;
    for (const id of ids) {
      try {
        fetched.push(normalizeLocalProductForPop(await api.fetchLocalProduct(id)));
      } catch (e) {
        // 404 = 미존재 또는 다른 조직 상품(차단). 그 외 = 조회 실패.
        if (isPopNotFoundError(e)) blocked += 1;
        else failed += 1;
      }
    }
    if (fetched.length) {
      setLocalItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...fetched.filter((f) => !seen.has(f.id))];
      });
    }
    if (blocked > 0) setLocalError('해당 상품을 찾을 수 없습니다. 내 매장의 자체 상품인지 확인해 주세요.');
    else if (failed > 0) setLocalError('매장 자체 상품 정보를 불러오지 못했습니다.');
    setLocalLoading(false);
  }, [api]);

  useEffect(() => {
    const production = parseProductionRouterState(location.state);
    const ids = (production?.source?.items ?? [])
      .filter((it) => it.origin === 'local')
      .map((it) => it.id);
    if (!ids.length) return;
    localIdsRef.current = ids;
    loadLocalProducts(ids);
    window.history.replaceState({}, document.title);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const retryLocalProducts = useCallback(
    () => loadLocalProducts(localIdsRef.current),
    [loadLocalProducts],
  );
  const removeLocalItem = useCallback((id: string) => {
    setLocalItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // ── POP 콘텐츠로 저장 ────────────────────────────────────────────────────
  const [savingContent, setSavingContent] = useState(false);

  const saveAsContent = useCallback(async () => {
    if (!popAiContent) {
      notify.error('저장할 POP 문구가 없습니다. 먼저 AI 문구를 만들거나 가져온 POP으로 시작하세요.');
      return;
    }
    const slug = await api.getStoreSlug().catch(() => null);
    if (!slug) {
      notify.error(labels.storeMissingError);
      return;
    }
    setSavingContent(true);
    try {
      await api.createPopContent(slug, {
        title: popAiContent.title || 'POP',
        content: popAiContentToHtml(popAiContent),
        excerpt: popAiContent.shortText || undefined,
      });
      notify.success(labels.saveContentSuccess);
    } catch (e: any) {
      notify.error(e?.message || 'POP 콘텐츠 저장에 실패했습니다');
    } finally {
      setSavingContent(false);
    }
  }, [api, labels, notify, popAiContent]);

  // ── 레이아웃 / 템플릿 / QR ───────────────────────────────────────────────
  const [layout, setLayout] = useState<PopLayout>('A4');
  const [templateId, setTemplateId] = useState(defaultTemplateId);

  const [qrCodes, setQrCodes] = useState<PopQrOption[]>([]);
  const [selectedQrId, setSelectedQrId] = useState('');

  useEffect(() => {
    api.fetchQrCodes()
      .then((list) => setQrCodes(Array.isArray(list) ? list : []))
      .catch(() => setQrCodes([]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 생성 ─────────────────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const canGenerate = selectedIds.length > 0 || localItems.length > 0;

  const generate = useCallback(async () => {
    // 공급자 자료 / 매장 자체 상품 중 하나 이상이 필요하다.
    if (!canGenerate) {
      notify.error('자료를 최소 1개 선택해주세요');
      return;
    }
    // 매장 자체 상품 POP 은 결과를 매장 소유 제작 자료(store_execution_assets)로 저장한다
    // → 내 자료함(/store/library/production-materials)에서 다시 열고 출력할 수 있다.
    const hasLocal = localItems.length > 0;

    setGenerating(true);
    try {
      const resp = await api.generate(
        buildPopGeneratePayload({
          supplierItemIds: selectedIds,
          localItems,
          layout,
          templateId,
          aiContent: popAiContent,
          qrId: selectedQrId,
        }),
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error((errData as any)?.error?.message || 'POP 생성 실패');
      }

      if (hasLocal) {
        // save=true 응답은 JSON({ assetId, fileUrl, title })
        const result = await resp.json();
        const fileUrl: string | undefined = result?.data?.fileUrl;
        if (!fileUrl) throw new Error('POP 생성 결과를 확인할 수 없습니다');
        window.open(fileUrl, '_blank');
        notify.success('POP PDF가 생성되었습니다. 내 자료함에서 다시 열고 출력할 수 있습니다.');
        return;
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      notify.success('POP PDF가 생성되었습니다');
    } catch (err: any) {
      // 실패 시 선택 항목·문구는 유지한다(재시도 가능).
      notify.error(err?.message || 'POP 생성에 실패했습니다');
    } finally {
      setGenerating(false);
    }
  }, [api, canGenerate, layout, localItems, notify, popAiContent, selectedIds, selectedQrId, templateId]);

  return {
    items, itemsLoading, itemsError, loadItems,
    selectedIds, toggleItem,
    popAiContent, clearPopAiContent: () => setPopAiContent(null),
    localItems, localLoading, localError, retryLocalProducts, removeLocalItem,
    savingContent, saveAsContent,
    layout, setLayout, templateId, setTemplateId,
    qrCodes, selectedQrId, setSelectedQrId,
    generating, canGenerate, generate,
  };
}

export type PopComposerState = ReturnType<typeof usePopComposer>;
