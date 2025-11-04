/**
 * Preset Manager Component
 * Simple UI for managing customizer presets (save/apply/rollback)
 */

import React, { useState, useEffect } from 'react';
import { Save, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

interface Preset {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  isDefault: boolean;
}

interface PresetManagerProps {
  onPresetApplied?: () => void;
  currentSettings?: any;
}

export const PresetManager: React.FC<PresetManagerProps> = ({
  onPresetApplied,
  currentSettings
}) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [canRollback, setCanRollback] = useState(false);

  // Load presets on mount
  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const response = await authClient.api.get('/v1/customizer-presets');
      if (response.data.success) {
        setPresets(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authClient.api.post('/v1/customizer-presets', {
        name: presetName,
        description: presetDescription,
      });

      if (response.data.success) {
        const preset = response.data.data;
        toast.success(`Preset '${preset.name}' saved successfully`);

        // Refresh presets list
        await loadPresets();

        // Clear form and close dialog
        setPresetName('');
        setPresetDescription('');
        setShowSaveDialog(false);
      }
    } catch (error: any) {
      toast.error(`Failed to save preset: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPreset = async () => {
    if (!selectedPreset) {
      toast.error('Please select a preset to apply');
      return;
    }

    if (!window.confirm('Apply this preset? Current settings will be overwritten.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await authClient.api.post(`/v1/customizer-presets/${selectedPreset}/apply`);

      if (response.data.success) {
        const { changes } = response.data;
        toast.success(`Preset applied successfully (${changes.itemsChanged} items changed, version: ${changes.oldVersion} → ${changes.newVersion})`);

        // Enable rollback
        setCanRollback(true);

        // Notify parent component
        if (onPresetApplied) {
          onPresetApplied();
        }
      }
    } catch (error: any) {
      toast.error(`Failed to apply preset: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!canRollback) {
      toast.error('No changes to rollback');
      return;
    }

    if (!window.confirm('Rollback to previous settings?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await authClient.api.post('/v1/customizer-presets/rollback');

      if (response.data.success) {
        const { changes } = response.data;
        toast.success(`Settings rolled back successfully (version: ${changes.oldVersion} → ${changes.newVersion})`);

        // Disable rollback after use
        setCanRollback(false);

        // Notify parent component
        if (onPresetApplied) {
          onPresetApplied();
        }
      }
    } catch (error: any) {
      toast.error(`Failed to rollback: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="preset-manager flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
        {/* Preset Selector */}
        <Select value={selectedPreset} onValueChange={setSelectedPreset}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select preset..." />
          </SelectTrigger>
          <SelectContent>
            {presets.length === 0 ? (
              <SelectItem value="none" disabled>No presets available</SelectItem>
            ) : (
              presets.map(preset => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                  {preset.isDefault && ' (Default)'}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {/* Action Buttons */}
        <Button
          onClick={() => setShowSaveDialog(true)}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="gap-1"
        >
          <Save className="w-4 h-4" />
          Save Preset
        </Button>

        <Button
          onClick={handleApplyPreset}
          disabled={isLoading || !selectedPreset}
          size="sm"
          variant="outline"
          className="gap-1"
        >
          <Download className="w-4 h-4" />
          Apply Preset
        </Button>

        <Button
          onClick={handleRollback}
          disabled={isLoading || !canRollback}
          size="sm"
          variant="outline"
          className="gap-1"
        >
          <RotateCcw className="w-4 h-4" />
          Rollback
        </Button>
      </div>

      {/* Save Preset Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current Settings as Preset</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="preset-name">Preset Name *</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., Summer Theme"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="preset-description">Description (Optional)</Label>
              <Input
                id="preset-description"
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                placeholder="Brief description of this preset"
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePreset}
              disabled={isLoading || !presetName.trim()}
            >
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};