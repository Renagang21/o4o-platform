/**
 * Schedule Form
 *
 * Create/Edit form for schedules
 * Phase 6: Digital Signage Management UI
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  scheduleApi,
  mediaListApi,
  displaySlotApi,
  type Schedule,
  type ScheduleType,
  type DayOfWeek,
  type MediaList,
  type DisplaySlot,
} from '@/lib/api/digitalSignage';

interface ScheduleFormProps {
  schedule?: Schedule | null;
  onClose: () => void;
  onSuccess: () => void;
}

const SCHEDULE_TYPES: { value: ScheduleType; label: string }[] = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function ScheduleForm({
  schedule,
  onClose,
  onSuccess,
}: ScheduleFormProps) {
  const isEditing = !!schedule;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaLists, setMediaLists] = useState<MediaList[]>([]);
  const [displaySlots, setDisplaySlots] = useState<DisplaySlot[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  const [formData, setFormData] = useState({
    name: schedule?.name || '',
    scheduleType: schedule?.scheduleType || 'daily' as ScheduleType,
    startTime: schedule?.startTime || '09:00',
    endTime: schedule?.endTime || '18:00',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    daysOfWeek: schedule?.daysOfWeek || [],
    mediaListId: schedule?.mediaListId || '',
    displaySlotId: schedule?.displaySlotId || '',
    priority: schedule?.priority || 10,
    isActive: schedule?.isActive ?? true,
  });

  useEffect(() => {
    const loadOptions = async () => {
      setIsLoadingOptions(true);
      try {
        const [mediaRes, slotsRes] = await Promise.all([
          mediaListApi.list(),
          displaySlotApi.list(),
        ]);

        if (mediaRes.success && mediaRes.data) {
          setMediaLists(mediaRes.data.data || []);
        }
        if (slotsRes.success && slotsRes.data) {
          setDisplaySlots(slotsRes.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load options:', err);
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        scheduleType: formData.scheduleType,
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        daysOfWeek: formData.daysOfWeek.length > 0 ? formData.daysOfWeek : undefined,
        mediaListId: formData.mediaListId,
        displaySlotId: formData.displaySlotId,
        priority: formData.priority,
        isActive: formData.isActive,
      };

      const response = isEditing
        ? await scheduleApi.update(schedule.id, payload)
        : await scheduleApi.create(payload);

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error || 'Failed to save');
      }
    } catch (err) {
      setError('Failed to save schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDayOfWeek = (day: DayOfWeek) => {
    setFormData((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  const dayOptions: { value: DayOfWeek; label: string }[] = [
    { value: 'sun', label: 'Sun' },
    { value: 'mon', label: 'Mon' },
    { value: 'tue', label: 'Tue' },
    { value: 'wed', label: 'Wed' },
    { value: 'thu', label: 'Thu' },
    { value: 'fri', label: 'Fri' },
    { value: 'sat', label: 'Sat' },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Schedule' : 'Create Schedule'}
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
              placeholder="e.g., Morning Promotions"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduleType">Schedule Type *</Label>
            <Select
              value={formData.scheduleType}
              onValueChange={(value: ScheduleType) =>
                setFormData((prev) => ({ ...prev, scheduleType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, startTime: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, endTime: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
          </div>

          {formData.scheduleType === 'weekly' && (
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex gap-1">
                {dayOptions.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    size="sm"
                    variant={formData.daysOfWeek.includes(day.value) ? 'default' : 'outline'}
                    className="flex-1 px-1"
                    onClick={() => toggleDayOfWeek(day.value)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="mediaListId">Media List *</Label>
            <Select
              value={formData.mediaListId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, mediaListId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingOptions ? 'Loading...' : 'Select media list'} />
              </SelectTrigger>
              <SelectContent>
                {mediaLists.map((ml) => (
                  <SelectItem key={ml.id} value={ml.id}>
                    {ml.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displaySlotId">Display Slot *</Label>
            <Select
              value={formData.displaySlotId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, displaySlotId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingOptions ? 'Loading...' : 'Select display slot'} />
              </SelectTrigger>
              <SelectContent>
                {displaySlots.map((slot) => (
                  <SelectItem key={slot.id} value={slot.id}>
                    {slot.name} ({slot.display?.name || slot.displayId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority (1-100)</Label>
            <Input
              id="priority"
              type="number"
              min={1}
              max={100}
              value={formData.priority}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  priority: parseInt(e.target.value) || 10,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Higher priority schedules take precedence when overlapping
            </p>
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
            <Button type="submit" disabled={isSubmitting || isLoadingOptions}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
