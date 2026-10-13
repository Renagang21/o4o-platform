/** Presentation only: requests, ownership headers, state and completion callbacks belong to the modal's internal saving controllers. */
interface CommunitySavePanelProps {
  communityTitle: string;
  setCommunityTitle: (value: string) => void;
  communityForumId: string;
  setCommunityForumId: (value: string) => void;
  communityForums: { id: string; name: string }[];
  communityForumsLoading: boolean;
  communitySaving: boolean;
  communitySaveStatus: { ok: boolean; error?: string; postId?: string } | null;
  handleCommunitySave: () => void | Promise<void>;
  onCancel: () => void;
}

export function CommunitySavePanel({
  communityTitle,
  setCommunityTitle,
  communityForumId,
  setCommunityForumId,
  communityForums,
  communityForumsLoading,
  communitySaving,
  communitySaveStatus,
  handleCommunitySave,
  onCancel,
}: CommunitySavePanelProps) {
  return (
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
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0369a1' }}>
        커뮤니티 게시글로 저장
      </div>

      {/* 제목 입력 */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            color: '#374151',
            marginBottom: '4px',
          }}
        >
          제목
        </label>
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
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            color: '#374151',
            marginBottom: '4px',
          }}
        >
          게시판 선택
        </label>
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
            {communityForumsLoading
              ? '게시판 목록 로딩 중...'
              : '게시판 선택 (선택사항)'}
          </option>
          {communityForums.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
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
          onClick={onCancel}
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
            background: communitySaveStatus?.ok
              ? '#d1fae5'
              : communitySaving
                ? '#bfdbfe'
                : '#0284c7',
            color: communitySaveStatus?.ok ? '#15803d' : 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor:
              communitySaving || communitySaveStatus?.ok
                ? 'not-allowed'
                : 'pointer',
          }}
        >
          {communitySaving
            ? '저장 중...'
            : communitySaveStatus?.ok
              ? '저장됨 ✓'
              : '게시글 저장'}
        </button>
      </div>
    </div>
  );
}

interface StoreSavePanelProps {
  storeTitle: string;
  setStoreTitle: (value: string) => void;
  storeSaving: boolean;
  storeSaveStatus: { ok: boolean; error?: string; contentId?: string } | null;
  handleStoreSave: () => void | Promise<void>;
  onCancel: () => void;
}

export function StoreSavePanel({
  storeTitle,
  setStoreTitle,
  storeSaving,
  storeSaveStatus,
  handleStoreSave,
  onCancel,
}: StoreSavePanelProps) {
  return (
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
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#15803d' }}>
        내 매장 콘텐츠로 저장
      </div>

      {/* 제목 입력 */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            color: '#374151',
            marginBottom: '4px',
          }}
        >
          제목
        </label>
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
          onClick={onCancel}
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
            background: storeSaveStatus?.ok
              ? '#dcfce7'
              : storeSaving
                ? '#bbf7d0'
                : '#16a34a',
            color: storeSaveStatus?.ok ? '#15803d' : 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor:
              storeSaving || storeSaveStatus?.ok ? 'not-allowed' : 'pointer',
          }}
        >
          {storeSaving
            ? '저장 중...'
            : storeSaveStatus?.ok
              ? '저장됨 ✓'
              : '매장에 저장'}
        </button>
      </div>
    </div>
  );
}

interface ProductionMaterialSavePanelProps {
  productionMaterialTitle: string;
  setProductionMaterialTitle: (value: string) => void;
  productionMaterialSaving: boolean;
  productionMaterialSaveStatus: {
    ok: boolean;
    error?: string;
    assetId?: string;
  } | null;
  handleProductionMaterialSave: () => void | Promise<void>;
  onCancel: () => void;
  mode: string;
  modeConfig?: { label: string; outputType: string };
}

export function ProductionMaterialSavePanel({
  productionMaterialTitle,
  setProductionMaterialTitle,
  productionMaterialSaving,
  productionMaterialSaveStatus,
  handleProductionMaterialSave,
  mode,
  onCancel,
  modeConfig,
}: ProductionMaterialSavePanelProps) {
  return (
    <div
      style={{
        border: '1px solid #c7d2fe',
        borderRadius: '8px',
        padding: '14px',
        background: '#eef2ff',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#4338ca' }}>
        매장 제작 자료로 저장
      </div>

      {/* 제목 입력 */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            color: '#374151',
            marginBottom: '4px',
          }}
        >
          제목
        </label>
        <input
          type="text"
          value={productionMaterialTitle}
          onChange={(e) => setProductionMaterialTitle(e.target.value)}
          placeholder="저장할 매장 제작 자료 제목을 입력하세요"
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

      {/* 분류 안내 (read-only) */}
      <div style={{ fontSize: '11px', color: '#6366f1' }}>
        분류:&nbsp;
        <strong>{modeConfig?.label ?? mode}</strong> (
        {modeConfig?.outputType ?? mode}
        {(() => {
          const ot = modeConfig?.outputType ?? mode;
          const ut = ot === 'pop' ? 'pop' : ot === 'store_qr' ? 'qr' : null;
          return ut ? ` · usageType=${ut}` : '';
        })()}
        )
      </div>

      {/* 저장 결과 */}
      {productionMaterialSaveStatus && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            color: productionMaterialSaveStatus.ok ? '#4338ca' : '#dc2626',
            background: productionMaterialSaveStatus.ok ? '#e0e7ff' : '#fef2f2',
          }}
        >
          {productionMaterialSaveStatus.ok
            ? `매장 제작 자료에 저장되었습니다 ✓`
            : `저장 실패: ${productionMaterialSaveStatus.error}`}
        </div>
      )}

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
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
          onClick={handleProductionMaterialSave}
          disabled={
            productionMaterialSaving ||
            Boolean(productionMaterialSaveStatus?.ok)
          }
          style={{
            padding: '7px 14px',
            border: 'none',
            borderRadius: '6px',
            background: productionMaterialSaveStatus?.ok
              ? '#e0e7ff'
              : productionMaterialSaving
                ? '#c7d2fe'
                : '#4f46e5',
            color: productionMaterialSaveStatus?.ok ? '#4338ca' : 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor:
              productionMaterialSaving || productionMaterialSaveStatus?.ok
                ? 'not-allowed'
                : 'pointer',
          }}
        >
          {productionMaterialSaving
            ? '저장 중...'
            : productionMaterialSaveStatus?.ok
              ? '저장됨 ✓'
              : '제작 자료로 저장'}
        </button>
      </div>
    </div>
  );
}
