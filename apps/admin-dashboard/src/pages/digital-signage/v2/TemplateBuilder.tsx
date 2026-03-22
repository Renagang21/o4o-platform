/**
 * Template Builder — Container
 *
 * Sprint 2-5: Admin Dashboard - Template/Zone/Layout management
 * Phase 2: Digital Signage Production Upgrade
 *
 * WO-O4O-TEMPLATE-BUILDER-SPLIT-V1
 * Refactored: container with header/toolbar + grid compose + dialog mount
 */

import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Layout, Eye, RefreshCw } from 'lucide-react';
import { useTemplateBuilder } from './template-builder/useTemplateBuilder';
import { TemplateBuilderCanvas } from './template-builder/TemplateBuilderCanvas';
import { TemplateBuilderSidebar } from './template-builder/TemplateBuilderSidebar';
import { NewTemplateDialog } from './template-builder/NewTemplateDialog';
import { LayoutPresetDialog } from './template-builder/LayoutPresetDialog';
import { ZoneEditorDialog } from './template-builder/ZoneEditorDialog';
import { TemplatePreviewDialog } from './template-builder/TemplatePreviewDialog';

export default function TemplateBuilder() {
  const { templateId } = useParams<{ templateId?: string }>();
  const {
    // Data
    template,
    zones,
    playlists,
    loading,
    saving,
    selectedZoneId,
    setSelectedZoneId,
    canvasRef,
    // Forms
    templateForm,
    setTemplateForm,
    zoneForm,
    setZoneForm,
    editingZone,
    // Dialogs
    showNewTemplateDialog,
    setShowNewTemplateDialog,
    showPresetDialog,
    setShowPresetDialog,
    showZoneDialog,
    setShowZoneDialog,
    showPreviewDialog,
    setShowPreviewDialog,
    // Actions
    handleCreateTemplate,
    handleUpdateTemplate,
    handleApplyPreset,
    handleAddZone,
    handleUpdateZone,
    handleDeleteZone,
    openZoneEditor,
    handleZoneMouseDown,
    getPreviewUrl,
    navigate,
  } = useTemplateBuilder(templateId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/digital-signage/v2/templates')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {template ? template.name : 'New Template'}
            </h1>
            {template && (
              <p className="text-sm text-muted-foreground">
                {template.layoutConfig.width}x{template.layoutConfig.height} ({template.layoutConfig.orientation})
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPresetDialog(true)} disabled={!template}>
            <Layout className="h-4 w-4 mr-2" />
            Apply Preset
          </Button>
          <Button variant="outline" onClick={() => setShowPreviewDialog(true)} disabled={!template}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleUpdateTemplate} disabled={!template || saving}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {template && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <TemplateBuilderCanvas
              template={template}
              zones={zones}
              selectedZoneId={selectedZoneId}
              canvasRef={canvasRef}
              onZoneSelect={setSelectedZoneId}
              onZoneMouseDown={handleZoneMouseDown}
              onAddZone={() => openZoneEditor()}
            />
          </div>
          <div className="col-span-4">
            <TemplateBuilderSidebar
              templateForm={templateForm}
              setTemplateForm={setTemplateForm}
              zones={zones}
              playlists={playlists}
              selectedZoneId={selectedZoneId}
              onZoneSelect={setSelectedZoneId}
              onZoneEdit={openZoneEditor}
              onZoneDelete={handleDeleteZone}
            />
          </div>
        </div>
      )}

      {/* Dialogs */}
      <NewTemplateDialog
        open={showNewTemplateDialog}
        onOpenChange={setShowNewTemplateDialog}
        templateForm={templateForm}
        setTemplateForm={setTemplateForm}
        onCancel={() => navigate('/digital-signage/v2/templates')}
        onCreate={handleCreateTemplate}
        saving={saving}
      />

      <LayoutPresetDialog
        open={showPresetDialog}
        onOpenChange={setShowPresetDialog}
        onApplyPreset={handleApplyPreset}
      />

      <ZoneEditorDialog
        open={showZoneDialog}
        onOpenChange={setShowZoneDialog}
        editingZone={editingZone}
        zoneForm={zoneForm}
        setZoneForm={setZoneForm}
        playlists={playlists}
        onSave={editingZone ? handleUpdateZone : handleAddZone}
        saving={saving}
      />

      <TemplatePreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        previewUrl={getPreviewUrl()}
        hasTemplate={!!template}
      />
    </div>
  );
}
