/**
 * ProductionMaterialEditorPage — AI 결과 검토/수정 전용 편집기 (K-Cosmetics)
 *
 * WO-O4O-PRODUCTION-MATERIAL-EDITOR-SHELL-COMMONIZATION-V1:
 *   공통 ProductionMaterialEditorShell(@o4o/store-ui-core)로 추출. 본 파일은 thin wrapper —
 *   K-Cosmetics api/template/auth/toast 어댑터만 주입한다. (이전: WO-O4O-PRODUCTION-AI-EDITOR-CROSSSERVICE-PHASE2-I-V1 / -J-V1)
 *
 * 저장: POST /api/v1/cosmetics/store/assets (createStoreExecutionAsset)
 * 저장 후: /store/library/production-materials 이동
 * 진입: StoreLibraryContentsPage → AiContentModal.onInsert → navigate('/store/library/production-materials/new', { state })
 */

import { ProductionMaterialEditorShell } from '@o4o/store-ui-core';
import { RichTextEditor } from '@o4o/content-editor';
import { toast } from '@o4o/error-handling';
import { getAccessToken } from '@o4o/auth-client';
import { createStoreExecutionAsset } from '../../api/storeExecutionAssets';
import { findTemplate } from '../../config/productionTemplates';

export default function ProductionMaterialEditorPage() {
  return (
    <ProductionMaterialEditorShell
      EditorComponent={RichTextEditor}
      findTemplate={findTemplate}
      createAsset={createStoreExecutionAsset}
      getAccessToken={getAccessToken}
      notify={{ success: toast.success, error: toast.error }}
    />
  );
}
