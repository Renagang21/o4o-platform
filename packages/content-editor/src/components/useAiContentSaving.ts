import type { AiContentSession } from './useAiContentSession';
/** Internal saving controllers for this modal. Each business request remains explicit and independently owned. */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { htmlToForumBlocks } from './ai-content-conversion';
import type { AiContentModalProps, AiMode } from './AiContentModal';
import type { AiContentResult } from './ai-content-generation-state';

type SaveJob<T> =
  | { saving: true; status: null }
  | { saving: false; status: T | null };
const PENDING_SAVE = { saving: true, status: null } as const;
function idleJob<T>(): SaveJob<T> {
  return { saving: false, status: null };
}
function clearReceipt<T>(job: SaveJob<T>): SaveJob<T> {
  return job.saving ? job : idleJob();
}
/** Per-destination write ownership: resets suppress old receipts, never abort or retry a submitted write. */
function useSaveJob<T>(session: AiContentSession) {
  const [job, setJob] = useState<SaveJob<T>>(idleJob);
  const pending = useRef<object | null>(null);
  const begin = () => {
    if (pending.current || !session.current(session.capture())) return null;
    const ticket = { epoch: session.capture() };
    pending.current = ticket;
    setJob(PENDING_SAVE);
    return ticket;
  };
  const update = (ticket: { epoch: number }, next: SaveJob<T>) => {
    if (pending.current === ticket && session.current(ticket.epoch))
      setJob(next);
  };
  const finish = (ticket: { epoch: number }) => {
    if (pending.current !== ticket) return;
    pending.current = null;
    if (session.mounted())
      setJob((previous) =>
        session.current(ticket.epoch) ? previous : idleJob(),
      );
  };
  const reset = useCallback(
    () => setJob(pending.current ? PENDING_SAVE : idleJob()),
    [],
  );
  return {
    job,
    begin,
    update,
    finish,
    reset,
    clearReceipt: () => setJob(clearReceipt),
  };
}
type ChannelStatus = { ok: boolean; label?: string; error?: string };
type CommunityStatus = { ok: boolean; error?: string; postId?: string };
type StoreStatus = { ok: boolean; error?: string; contentId?: string };
type ProductionStatus = { ok: boolean; error?: string; assetId?: string };
type SavingOptions = Pick<
  AiContentModalProps,
  | 'aiRequestHeaders'
  | 'onChannelSave'
  | 'onProductionMaterialSaved'
  | 'sourceMetadata'
  | 'templateId'
> & {
  apiBaseUrl: string;
  result: AiContentResult | null;
  mode: AiMode;
  outputType: string;
  session: AiContentSession;
};
type RequestOptions = Pick<
  SavingOptions,
  'apiBaseUrl' | 'aiRequestHeaders' | 'result' | 'session'
>;

function useChannelSaving({
  result,
  onChannelSave,
  outputType,
  mode,
  session,
}: Pick<
  SavingOptions,
  'result' | 'onChannelSave' | 'outputType' | 'mode' | 'session'
>) {
  const channelWrite = useSaveJob<ChannelStatus>(session);
  const channelJob = channelWrite.job;
  const handleChannelSave = async () => {
    if (!result || !onChannelSave) return;
    const ticket = channelWrite.begin();
    if (!ticket) return;
    try {
      const res = await onChannelSave({
        outputType,
        html: result.html,
        title: result.title,
        summary: result.summary,
        mode,
      });
      channelWrite.update(ticket, {
        saving: false,
        status: { ok: res.success, label: res.fieldLabel, error: res.error },
      });
    } catch (err: any) {
      channelWrite.update(ticket, {
        saving: false,
        status: {
          ok: false,
          error: err?.message || '저장 중 오류가 발생했습니다.',
        },
      });
    } finally {
      channelWrite.finish(ticket);
    }
  };

  // WO-O4O-AI-CONTENT-COMMUNITY-SAVE-INTEGRATION-V1
  return {
    ...channelJob,
    save: handleChannelSave,
    reset: channelWrite.reset,
  };
}

function useCommunitySaving({
  apiBaseUrl,
  result,
  aiRequestHeaders,
  session,
}: RequestOptions) {
  const [communityForm, setCommunityForm] = useState({
    open: false,
    title: '',
    forumId: '',
  });
  const {
    open: showCommunitySavePanel,
    title: communityTitle,
    forumId: communityForumId,
  } = communityForm;
  const setCommunityTitle = (title: string) =>
    setCommunityForm((previous) => ({ ...previous, title }));
  const communityWrite = useSaveJob<CommunityStatus>(session);
  const communityJob = communityWrite.job;
  const [catalog, setCatalog] = useState<{
    items: { id: string; name: string }[];
    loading: boolean;
  }>({ items: [], loading: false });
  const { items: communityForums } = catalog;
  const catalogRequest = useRef(0);
  const headersKey = JSON.stringify(
    Object.entries(aiRequestHeaders ?? {}).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  );
  const catalogOwner = useRef(headersKey);
  useLayoutEffect(() => {
    if (catalogOwner.current !== headersKey) {
      catalogOwner.current = headersKey;
      catalogRequest.current += 1;
      setCatalog({ items: [], loading: false });
    }
  }, [headersKey]);
  const setCommunityForumId = (forumId: string) =>
    setCommunityForm((previous) => ({ ...previous, forumId }));
  const setCommunityForumsLoading = (loading: boolean) =>
    setCatalog((previous) => ({ ...previous, loading }));
  const setCommunityForums = (items: { id: string; name: string }[]) =>
    setCatalog((previous) => ({ ...previous, items }));
  const handleOpenCommunitySavePanel = async () => {
    if (!result) return;
    setCommunityForm({ open: true, title: result.title || '', forumId: '' });
    communityWrite.clearReceipt();
    if (communityForums.length === 0) {
      setCommunityForumsLoading(true);
      const epoch = session.capture(),
        requestId = ++catalogRequest.current;
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/forum/categories`, {
          headers: { ...aiRequestHeaders },
          credentials: 'include',
        });
        const data = await res.json();
        if (
          session.current(epoch) &&
          requestId === catalogRequest.current &&
          data.success &&
          Array.isArray(data.data)
        ) {
          setCommunityForums(
            data.data.map((f: any) => ({ id: f.id, name: f.name })),
          );
        }
      } catch {
        // 포럼 목록 로딩 실패 — 사용자는 포럼 없이 저장 가능
      } finally {
        if (session.mounted() && requestId === catalogRequest.current)
          setCommunityForumsLoading(false);
      }
    }
  };

  const handleCommunitySave = async () => {
    if (!result) return;
    const ticket = communityWrite.begin();
    if (!ticket) return;
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
      const res = await fetch(`${apiBaseUrl}/api/v1/forum/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...aiRequestHeaders },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '커뮤니티 저장에 실패했습니다.');
      }
      communityWrite.update(ticket, {
        saving: false,
        status: { ok: true, postId: data.data?.id },
      });
    } catch (err: any) {
      communityWrite.update(ticket, {
        saving: false,
        status: {
          ok: false,
          error: err?.message || '저장 중 오류가 발생했습니다.',
        },
      });
    } finally {
      communityWrite.finish(ticket);
    }
  };

  const resetWrite = communityWrite.reset;
  const reset = useCallback(() => {
    catalogRequest.current += 1;
    setCommunityForumsLoading(false);
    setCommunityForm({ open: false, title: '', forumId: '' });
    resetWrite();
  }, [resetWrite]);
  return {
    open: showCommunitySavePanel,
    title: communityTitle,
    forumId: communityForumId,
    forums: communityForums,
    forumsLoading: catalog.loading,
    ...communityJob,
    setTitle: setCommunityTitle,
    setForumId: setCommunityForumId,
    save: handleCommunitySave,
    show: handleOpenCommunitySavePanel,
    hide: () => {
      setCommunityForm((previous) => ({ ...previous, open: false }));
      communityWrite.clearReceipt();
    },
    reset,
  };
}

function useStoreSaving({
  apiBaseUrl,
  result,
  aiRequestHeaders,
  session,
}: RequestOptions) {
  const [storeForm, setStoreForm] = useState({ open: false, title: '' });
  const { open: showStoreSavePanel, title: storeTitle } = storeForm;
  const setStoreTitle = (title: string) =>
    setStoreForm((previous) => ({ ...previous, title }));
  const storeWrite = useSaveJob<StoreStatus>(session);
  const storeJob = storeWrite.job;
  // WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1
  const handleOpenStoreSavePanel = () => {
    if (!result) return;
    setStoreForm({ open: true, title: result.title || '' });
    storeWrite.clearReceipt();
  };

  const handleStoreSave = async () => {
    if (!result) return;
    const ticket = storeWrite.begin();
    if (!ticket) return;
    try {
      const contentBlocks = htmlToForumBlocks(result.html);
      const res = await fetch(`${apiBaseUrl}/api/v1/kpa/store-contents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...aiRequestHeaders },
        credentials: 'include',
        body: JSON.stringify({
          title: storeTitle.trim() || 'AI 생성 콘텐츠',
          contentJson:
            contentBlocks.length > 0 ? contentBlocks : { html: result.html },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg =
          res.status === 403
            ? '매장 소속이 없습니다. 매장 경영자만 내 매장에 저장할 수 있습니다.'
            : data.error?.message ||
              data.error ||
              '내 매장 저장에 실패했습니다.';
        throw new Error(msg);
      }
      storeWrite.update(ticket, {
        saving: false,
        status: { ok: true, contentId: data.data?.id },
      });
    } catch (err: any) {
      storeWrite.update(ticket, {
        saving: false,
        status: {
          ok: false,
          error: err?.message || '저장 중 오류가 발생했습니다.',
        },
      });
    } finally {
      storeWrite.finish(ticket);
    }
  };

  const resetWrite = storeWrite.reset;
  const reset = useCallback(() => {
    setStoreForm({ open: false, title: '' });
    resetWrite();
  }, [resetWrite]);
  return {
    open: showStoreSavePanel,
    title: storeTitle,
    ...storeJob,
    setTitle: setStoreTitle,
    save: handleStoreSave,
    show: handleOpenStoreSavePanel,
    hide: () => {
      setStoreForm((previous) => ({ ...previous, open: false }));
      storeWrite.clearReceipt();
    },
    reset,
  };
}

function useProductionMaterialSaving({
  apiBaseUrl,
  result,
  aiRequestHeaders,
  outputType,
  onProductionMaterialSaved,
  sourceMetadata,
  templateId,
  session,
}: RequestOptions &
  Pick<
    SavingOptions,
    'outputType' | 'onProductionMaterialSaved' | 'sourceMetadata' | 'templateId'
  >) {
  const [productionMaterialForm, setProductionMaterialForm] = useState({
    open: false,
    title: '',
  });
  const {
    open: showProductionMaterialSavePanel,
    title: productionMaterialTitle,
  } = productionMaterialForm;
  const setProductionMaterialTitle = (title: string) =>
    setProductionMaterialForm((previous) => ({ ...previous, title }));
  const productionMaterialWrite = useSaveJob<ProductionStatus>(session);
  const productionMaterialJob = productionMaterialWrite.job;
  // WO-O4O-AI-MODAL-PRODUCTION-MATERIAL-SAVE-V1
  //   매장 제작 자료(store_execution_assets)로 AI 결과 저장.
  //   - assetType=content / sourceType=generated 고정.
  //   - category 는 outputType 그대로 (free-form) — 통합 리스트에서 유형 분류 키.
  //   - usageType 은 enum 매핑 가능한 경우만 지정 (pop, qr). 그 외 null.
  //     · pop outputType → 'pop'
  //     · store_qr outputType → 'qr'
  //     · blog / product_detail / summary / title_suggest / store_sns → null (category 만 사용)
  //   - showStoreSave / showCommunitySave 와 독립.
  const handleOpenProductionMaterialSavePanel = () => {
    if (!result) return;
    setProductionMaterialForm({ open: true, title: result.title || '' });
    productionMaterialWrite.clearReceipt();
  };

  const handleProductionMaterialSave = async () => {
    if (!result) return;
    const ticket = productionMaterialWrite.begin();
    if (!ticket) return;
    try {
      const usageType =
        outputType === 'pop' ? 'pop' : outputType === 'store_qr' ? 'qr' : null;
      const res = await fetch(`${apiBaseUrl}/api/v1/kpa/store/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...aiRequestHeaders },
        credentials: 'include',
        body: JSON.stringify({
          title: productionMaterialTitle.trim() || 'AI 생성 매장 제작 자료',
          description: result.summary || null,
          assetType: 'content',
          htmlContent: result.html,
          category: outputType,
          usageType,
          sourceType: 'generated',
          // WO-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-AI-BRIDGE-V1: source 추적 메타 (선택적)
          ...(sourceMetadata ? { sourceMetadata } : {}),
          // WO-O4O-STORE-PRODUCTION-TEMPLATE-REGISTRY-V1: template id 추적 (선택적)
          ...(templateId ? { templateId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg =
          res.status === 403
            ? '매장 소속이 없습니다. 매장 경영자만 매장 제작 자료를 저장할 수 있습니다.'
            : data.error?.message ||
              data.error ||
              '매장 제작 자료 저장에 실패했습니다.';
        throw new Error(msg);
      }
      const assetId: string | undefined = data.data?.id;
      productionMaterialWrite.update(ticket, {
        saving: false,
        status: { ok: true, assetId },
      });
      onProductionMaterialSaved?.(assetId);
    } catch (err: any) {
      productionMaterialWrite.update(ticket, {
        saving: false,
        status: {
          ok: false,
          error: err?.message || '저장 중 오류가 발생했습니다.',
        },
      });
    } finally {
      productionMaterialWrite.finish(ticket);
    }
  };

  const resetWrite = productionMaterialWrite.reset;
  const reset = useCallback(() => {
    setProductionMaterialForm({ open: false, title: '' });
    resetWrite();
  }, [resetWrite]);
  return {
    open: showProductionMaterialSavePanel,
    title: productionMaterialTitle,
    ...productionMaterialJob,
    setTitle: setProductionMaterialTitle,
    save: handleProductionMaterialSave,
    show: handleOpenProductionMaterialSavePanel,
    hide: () => {
      setProductionMaterialForm((previous) => ({ ...previous, open: false }));
      productionMaterialWrite.clearReceipt();
    },
    reset,
  };
}

export function useAiContentSaving(options: SavingOptions) {
  const channel = useChannelSaving(options);
  const community = useCommunitySaving(options);
  const store = useStoreSaving(options);
  const productionMaterial = useProductionMaterialSaving(options);
  const resetChannel = channel.reset,
    resetCommunity = community.reset,
    resetStore = store.reset,
    resetProduction = productionMaterial.reset;
  const reset = useCallback(() => {
    resetChannel();
    resetCommunity();
    resetStore();
    resetProduction();
  }, [resetChannel, resetCommunity, resetStore, resetProduction]);
  return {
    channel,
    community,
    store,
    productionMaterial,
    reset,
  };
}
