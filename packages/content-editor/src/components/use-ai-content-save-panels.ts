/** AiContentModal panel state owners; network actions remain in the modal. */
import { useState } from 'react';

export function useCommunitySavePanelState() {
  // WO-O4O-AI-CONTENT-COMMUNITY-SAVE-INTEGRATION-V1
  const [showCommunitySavePanel, setShowCommunitySavePanel] = useState(false);
  const [communityTitle, setCommunityTitle] = useState('');
  const [communityForumId, setCommunityForumId] = useState('');
  const [communityForums, setCommunityForums] = useState<{ id: string; name: string }[]>([]);
  const [communityForumsLoading, setCommunityForumsLoading] = useState(false);
  const [communitySaving, setCommunitySaving] = useState(false);
  const [communitySaveStatus, setCommunitySaveStatus] = useState<{ ok: boolean; error?: string; postId?: string } | null>(null);

  const openCommunitySavePanel = (title: string) => {
    setCommunityTitle(title);
    setCommunityForumId('');
    setCommunitySaveStatus(null);
    setShowCommunitySavePanel(true);
  };

  // Preserve forum list/loading: existing close never cleared those states.
  const resetCommunitySavePanel = () => {
    setShowCommunitySavePanel(false);
    setCommunityTitle('');
    setCommunityForumId('');
    setCommunitySaveStatus(null);
    setCommunitySaving(false);
  };

  return {
    visible: showCommunitySavePanel,
    setVisible: setShowCommunitySavePanel,
    title: communityTitle,
    setTitle: setCommunityTitle,
    forumId: communityForumId,
    setForumId: setCommunityForumId,
    forums: communityForums,
    setForums: setCommunityForums,
    forumsLoading: communityForumsLoading,
    setForumsLoading: setCommunityForumsLoading,
    saving: communitySaving,
    setSaving: setCommunitySaving,
    status: communitySaveStatus,
    setStatus: setCommunitySaveStatus,
    open: openCommunitySavePanel,
    reset: resetCommunitySavePanel,
  };
}

export function useStoreSavePanelState() {
  // WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1
  const [showStoreSavePanel, setShowStoreSavePanel] = useState(false);
  const [storeTitle, setStoreTitle] = useState('');
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeSaveStatus, setStoreSaveStatus] = useState<{ ok: boolean; error?: string; contentId?: string } | null>(null);

  const openStoreSavePanel = (title: string) => {
    setStoreTitle(title);
    setStoreSaveStatus(null);
    setShowStoreSavePanel(true);
  };

  const resetStoreSavePanel = () => {
    setShowStoreSavePanel(false);
    setStoreTitle('');
    setStoreSaveStatus(null);
    setStoreSaving(false);
  };

  return {
    visible: showStoreSavePanel,
    setVisible: setShowStoreSavePanel,
    title: storeTitle,
    setTitle: setStoreTitle,
    saving: storeSaving,
    setSaving: setStoreSaving,
    status: storeSaveStatus,
    setStatus: setStoreSaveStatus,
    open: openStoreSavePanel,
    reset: resetStoreSavePanel,
  };
}

export function useProductionMaterialSavePanelState() {
  // WO-O4O-AI-MODAL-PRODUCTION-MATERIAL-SAVE-V1
  const [showProductionMaterialSavePanel, setShowProductionMaterialSavePanel] = useState(false);
  const [productionMaterialTitle, setProductionMaterialTitle] = useState('');
  const [productionMaterialSaving, setProductionMaterialSaving] = useState(false);
  const [productionMaterialSaveStatus, setProductionMaterialSaveStatus] = useState<{ ok: boolean; error?: string; assetId?: string } | null>(null);

  const openProductionMaterialSavePanel = (title: string) => {
    setProductionMaterialTitle(title);
    setProductionMaterialSaveStatus(null);
    setShowProductionMaterialSavePanel(true);
  };

  const resetProductionMaterialSavePanel = () => {
    setShowProductionMaterialSavePanel(false);
    setProductionMaterialTitle('');
    setProductionMaterialSaveStatus(null);
    setProductionMaterialSaving(false);
  };

  return {
    visible: showProductionMaterialSavePanel,
    setVisible: setShowProductionMaterialSavePanel,
    title: productionMaterialTitle,
    setTitle: setProductionMaterialTitle,
    saving: productionMaterialSaving,
    setSaving: setProductionMaterialSaving,
    status: productionMaterialSaveStatus,
    setStatus: setProductionMaterialSaveStatus,
    open: openProductionMaterialSavePanel,
    reset: resetProductionMaterialSavePanel,
  };
}
