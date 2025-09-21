import React from 'react';
import { X, Save, Undo, Redo, Eye, RefreshCw, ArrowLeft } from 'lucide-react';
import { useCustomizer } from '../../context/CustomizerContext';
import { useCustomizerState } from '../../hooks/useCustomizerState';

interface CustomizerHeaderProps {
  onClose: () => void;
  siteName?: string;
}

export const CustomizerHeader: React.FC<CustomizerHeaderProps> = ({
  onClose,
  siteName = 'O4O Platform',
}) => {
  const { state, saveSettings, publishSettings } = useCustomizer();
  const { isDirty, isSaving, undo, redo, canUndo, canRedo } = useCustomizerState();
  
  const requestClose = () => {
    if (isDirty) {
      const ok = window.confirm('변경사항이 저장되지 않았습니다. 종료하시겠습니까?');
      if (!ok) return;
    }
    onClose();
  };

  const handleSave = async () => {
    await saveSettings();
  };
  
  const handlePublish = async () => {
    await publishSettings();
    // After successful publish, return to admin via onClose
    onClose();
  };
  
  return (
    <header className="wp-customizer-header">
      <div className="wp-customizer-title">
        <button
          onClick={onClose}
          className="wp-customizer-close"
          title="Close Customizer"
        >
          <X size={20} />
        </button>
        <div>
          <h1>Customizing</h1>
          <span className="wp-customizer-site-name">{siteName}</span>
        </div>
      </div>
      
      <div className="wp-customizer-actions">
        {/* Back to Admin */}
        <button
          onClick={requestClose}
          className="wp-button wp-button-secondary"
          title="관리자로 돌아가기"
        >
          <ArrowLeft size={16} style={{ marginRight: 4 }} />
          관리자로 돌아가기
        </button>
        
        {/* Undo/Redo */}
        <div className="wp-customizer-history">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="wp-button-icon"
            title="Undo"
          >
            <Undo size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="wp-button-icon"
            title="Redo"
          >
            <Redo size={16} />
          </button>
        </div>
        
        {/* Preview */}
        <a
          href={state.previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="wp-button wp-button-secondary"
          title="Preview in new tab"
        >
          <Eye size={16} style={{ marginRight: 4 }} />
          Preview
        </a>
        
        {/* Save Status Indicator */}
        {isDirty && (
          <span className="wp-customizer-status">
            {isSaving ? (
              <>
                <RefreshCw size={14} className="spin" />
                Saving...
              </>
            ) : (
              <span className="unsaved">Unsaved changes</span>
            )}
          </span>
        )}
        
        {/* Save Draft */}
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="wp-button wp-button-secondary"
        >
          <Save size={16} style={{ marginRight: 4 }} />
          Save Draft
        </button>
        
        {/* Publish */}
        <button
          onClick={handlePublish}
          disabled={isSaving}
          className="wp-customizer-publish"
        >
          {isSaving ? 'Publishing...' : 'Publish'}
        </button>
      </div>
    </header>
  );
};
