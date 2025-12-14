/**
 * Display Form
 *
 * Create/Edit form for displays
 * Phase 6: Digital Signage Management UI
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { displayApi, type Display } from '@/lib/api/digitalSignage';

interface DisplayFormProps {
  display?: Display | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DisplayForm({
  display,
  onClose,
  onSuccess,
}: DisplayFormProps) {
  const isEditing = !!display;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: display?.name || '',
    description: display?.description || '',
    location: display?.location || '',
    deviceId: display?.deviceId || '',
    isActive: display?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = isEditing
        ? await displayApi.update(display.id, {
            name: formData.name,
            description: formData.description || undefined,
            location: formData.location || undefined,
            deviceId: formData.deviceId || undefined,
            isActive: formData.isActive,
          })
        : await displayApi.create({
            name: formData.name,
            description: formData.description || undefined,
            location: formData.location || undefined,
            deviceId: formData.deviceId || undefined,
          });

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error || 'Failed to save');
      }
    } catch (err) {
      setError('Failed to save display');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Display' : 'Add Display'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g., Main Lobby Display"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, location: e.target.value }))
              }
              placeholder="e.g., Building A, Floor 1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deviceId">Device ID</Label>
            <Input
              id="deviceId"
              value={formData.deviceId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, deviceId: e.target.value }))
              }
              placeholder="Unique device identifier"
            />
          </div>

          {isEditing && (
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
