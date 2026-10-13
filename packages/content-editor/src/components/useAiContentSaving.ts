/** Internal saving controllers for this modal. Each business request remains explicit and independently owned. */
import { useState } from 'react';
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
};
type RequestOptions = Pick<
  SavingOptions,
  'apiBaseUrl' | 'aiRequestHeaders' | 'result'
>;

function useChannelSaving({
  result,
  onChannelSave,
  outputType,
  mode,
}: Pick<SavingOptions, 'result' | 'onChannelSave' | 'outputType' | 'mode'>) {
  const [channelJob, setChannelJob] = useState<SaveJob<ChannelStatus>>(idleJob);
  const handleChannelSave = async () => {
    if (!result || !onChannelSave) return;
    setChannelJob(PENDING_SAVE);
    try {
      const res = await onChannelSave({
        outputType,
        html: result.html,
        title: result.title,
        summary: result.summary,
        mode,
      });
      setChannelJob({
        saving: false,
        status: { ok: res.success, label: res.fieldLabel, error: res.error },
      });
    } catch (err: any) {
      setChannelJob({
        saving: false,
        status: {
          ok: false,
          error: err?.message || '저장 중 오류가 발생했습니다.',
        },
      });
    }
  };

  // WO-O4O-AI-CONTENT-COMMUNITY-SAVE-INTEGRATION-V1
  return {
    ...channelJob,
    save: handleChannelSave,
    reset: () => setChannelJob(idleJob()),
  };
}

function useCommunitySaving({
  apiBaseUrl,
  result,
  aiRequestHeaders,
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
  const [communityJob, setCommunityJob] =
    useState<SaveJob<CommunityStatus>>(idleJob);
  const [catalog, setCatalog] = useState<{
    items: { id: string; name: string }[];
    loading: boolean;
  }>({ items: [], loading: false });
  const { items: communityForums } = catalog;
  const setCommunityForumId = (forumId: string) =>
    setCommunityForm((previous) => ({ ...previous, forumId }));
  const setCommunityForumsLoading = (loading: boolean) =>
    setCatalog((previous) => ({ ...previous, loading }));
  const setCommunityForums = (items: { id: string; name: string }[]) =>
    setCatalog((previous) => ({ ...previous, items }));
  const handleOpenCommunitySavePanel = async () => {
    if (!result) return;
    setCommunityForm({ open: true, title: result.title || '', forumId: '' });
    setCommunityJob(clearReceipt);
    if (communityForums.length === 0) {
      setCommunityForumsLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/forum/categories`, {
          headers: { ...aiRequestHeaders },
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCommunityForums(
            data.data.map((f: any) => ({ id: f.id, name: f.name })),
          );
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
    setCommunityJob(PENDING_SAVE);
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
      setCommunityJob({
        saving: false,
        status: { ok: true, postId: data.data?.id },
      });
    } catch (err: any) {
      setCommunityJob({
        saving: false,
        status: {
          ok: false,
          error: err?.message || '저장 중 오류가 발생했습니다.',
        },
      });
    }
  };

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
      setCommunityJob(clearReceipt);
    },
    reset: () => {
      setCommunityForm({ open: false, title: '', forumId: '' });
      setCommunityJob(idleJob());
    },
  };
}

function useStoreSaving({
  apiBaseUrl,
  result,
  aiRequestHeaders,
}: RequestOptions) {
  const [storeForm, setStoreForm] = useState({ open: false, title: '' });
  const { open: showStoreSavePanel, title: storeTitle } = storeForm;
  const setStoreTitle = (title: string) =>
    setStoreForm((previous) => ({ ...previous, title }));
  const [storeJob, setStoreJob] = useState<SaveJob<StoreStatus>>(idleJob);
  // WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1
  const handleOpenStoreSavePanel = () => {
    if (!result) return;
    setStoreForm({ open: true, title: result.title || '' });
    setStoreJob(clearReceipt);
  };

  const handleStoreSave = async () => {
    if (!result) return;
    setStoreJob(PENDING_SAVE);
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
      setStoreJob({
        saving: false,
        status: { ok: true, contentId: data.data?.id },
      });
    } catch (err: any) {
      setStoreJob({
        saving: false,
        status: {
          ok: false,
          error: err?.message || '저장 중 오류가 발생했습니다.',
        },
      });
    }
  };

  return {
    open: showStoreSavePanel,
    title: storeTitle,
    ...storeJob,
    setTitle: setStoreTitle,
    save: handleStoreSave,
    show: handleOpenStoreSavePanel,
    hide: () => {
      setStoreForm((previous) => ({ ...previous, open: false }));
      setStoreJob(clearReceipt);
    },
    reset: () => {
      setStoreForm({ open: false, title: '' });
      setStoreJob(idleJob());
    },
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
  const [productionMaterialJob, setProductionMaterialJob] =
    useState<SaveJob<ProductionStatus>>(idleJob);
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
    setProductionMaterialJob(clearReceipt);
  };

  const handleProductionMaterialSave = async () => {
    if (!result) return;
    setProductionMaterialJob(PENDING_SAVE);
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
      setProductionMaterialJob({
        saving: false,
        status: { ok: true, assetId },
      });
      onProductionMaterialSaved?.(assetId);
    } catch (err: any) {
      setProductionMaterialJob({
        saving: false,
        status: {
          ok: false,
          error: err?.message || '저장 중 오류가 발생했습니다.',
        },
      });
    }
  };

  return {
    open: showProductionMaterialSavePanel,
    title: productionMaterialTitle,
    ...productionMaterialJob,
    setTitle: setProductionMaterialTitle,
    save: handleProductionMaterialSave,
    show: handleOpenProductionMaterialSavePanel,
    hide: () => {
      setProductionMaterialForm((previous) => ({ ...previous, open: false }));
      setProductionMaterialJob(clearReceipt);
    },
    reset: () => {
      setProductionMaterialForm({ open: false, title: '' });
      setProductionMaterialJob(idleJob());
    },
  };
}

export function useAiContentSaving(options: SavingOptions) {
  const channel = useChannelSaving(options);
  const community = useCommunitySaving(options);
  const store = useStoreSaving(options);
  const productionMaterial = useProductionMaterialSaving(options);
  return {
    channel,
    community,
    store,
    productionMaterial,
    reset: () => {
      channel.reset();
      community.reset();
      store.reset();
      productionMaterial.reset();
    },
  };
}
