/**
 * ProductionMaterialEditorPage — AI 결과 검토/수정 전용 편집기 (GlycoPharm)
 *
 * WO-O4O-PRODUCTION-MATERIAL-EDITOR-SHELL-COMMONIZATION-V1:
 *   공통 ProductionMaterialEditorShell(@o4o/store-ui-core)로 추출. 본 파일은 thin wrapper —
 *   GlycoPharm api/template/auth/toast 어댑터만 주입한다.
 * WO-O4O-CONTENT-ASSET-MEDIA-LIBRARY-STANDARDIZATION-V1:
 *   공용 미디어 라이브러리(이미지 삽입/업로드) 배선 추가.
 *
 * 저장: POST /api/v1/glycopharm/store/assets (createStoreExecutionAsset)
 * 저장 후: /store/library/production-materials 이동
 */

import { useState } from 'react';
import { ProductionMaterialEditorShell } from '@o4o/store-ui-core';
import { RichTextEditor, type MediaInsert } from '@o4o/content-editor';
import { toast } from '@o4o/error-handling';
import { getAccessToken } from '@o4o/auth-client';
import { createStoreExecutionAsset } from '@/api/storeExecutionAssets';
import { findTemplate } from '@/config/productionTemplates';
import { mediaApi } from '@/lib/api/media';
import MediaPickerModal from '@/components/common/MediaPickerModal';

export default function ProductionMaterialEditorPage() {
  const [mediaPickerTarget, setMediaPickerTarget] = useState<((media: MediaInsert) => void) | null>(null);

  const handleImageUpload = async (file: File): Promise<string> => {
    const res = await mediaApi.upload(file, true, undefined, 'description');
    if (res.success && res.data) return res.data.url;
    throw new Error(res.error || '이미지 업로드에 실패했습니다.');
  };

  return (
    <>
      <ProductionMaterialEditorShell
        EditorComponent={RichTextEditor}
        findTemplate={findTemplate}
        createAsset={createStoreExecutionAsset}
        getAccessToken={getAccessToken}
        notify={{ success: toast.success, error: toast.error }}
        onImageUpload={handleImageUpload}
        onMediaLibraryPick={(insertMedia) => setMediaPickerTarget(() => insertMedia)}
      />
      <MediaPickerModal
        open={!!mediaPickerTarget}
        onClose={() => setMediaPickerTarget(null)}
        onSelect={(asset) => {
          mediaPickerTarget?.({ type: 'image', url: asset.url, title: asset.originalName });
          setMediaPickerTarget(null);
        }}
        title="설명 이미지 선택"
        defaultFolder="description"
      />
    </>
  );
}
