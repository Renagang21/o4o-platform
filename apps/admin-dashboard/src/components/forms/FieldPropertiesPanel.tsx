import { ChangeEvent, FC } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { FormField, FieldValidation } from '@o4o/types';

interface FieldPropertiesPanelProps {
  field: FormField | null;
  onUpdate: (field: FormField) => void;
  onClose: () => void;
}

export const FieldPropertiesPanel: FC<FieldPropertiesPanelProps> = ({
  field,
  onUpdate,
  onClose,
}) => {
  if (!field) return null;

  const updateField = (updates: Partial<FormField>) => {
    onUpdate({ ...field, ...updates });
  };

  const updateValidation = (updates: Partial<FieldValidation>) => {
    updateField({
      validation: { ...field.validation, ...updates },
    });
  };

  return (
    <div className="w-96 bg-white border-l h-full overflow-y-auto">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-medium">Field Properties</h3>
        <Button variant={"ghost" as const} size={"icon" as const} onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="general" className="p-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div>
            <Label>Field Label</Label>
            <Input
              value={field.label}
              onChange={(e) => updateField({ label: e.target.value })}
            />
          </div>

          <div>
            <Label>Field Name</Label>
            <Input
              value={field.name}
              onChange={(e) => updateField({ name: e.target.value })}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={field.description || ''}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateField({ description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label>Placeholder</Label>
            <Input
              value={field.placeholder || ''}
              onChange={(e) => updateField({ placeholder: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Required</Label>
            <Switch
              checked={field.required}
              onCheckedChange={(checked: boolean) => updateField({ required: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Read Only</Label>
            <Switch
              checked={field.readonly || false}
              onCheckedChange={(checked: boolean) => updateField({ readonly: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Hidden</Label>
            <Switch
              checked={field.hidden || false}
              onCheckedChange={(checked: boolean) => updateField({ hidden: checked })}
            />
          </div>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          {field.type === 'text' || field.type === 'textarea' ? (
            <>
              <div>
                <Label>Min Length</Label>
                <Input
                  type="number"
                  value={field.validation?.minLength || ''}
                  onChange={(e) => updateValidation({ minLength: parseInt(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label>Max Length</Label>
                <Input
                  type="number"
                  value={field.validation?.maxLength || ''}
                  onChange={(e) => updateValidation({ maxLength: parseInt(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label>Pattern (RegEx)</Label>
                <Input
                  value={field.validation?.pattern || ''}
                  onChange={(e) => updateValidation({ pattern: e.target.value || undefined })}
                />
              </div>
            </>
          ) : field.type === 'number' ? (
            <>
              <div>
                <Label>Min Value</Label>
                <Input
                  type="number"
                  value={field.validation?.min || ''}
                  onChange={(e) => updateValidation({ min: parseFloat(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label>Max Value</Label>
                <Input
                  type="number"
                  value={field.validation?.max || ''}
                  onChange={(e) => updateValidation({ max: parseFloat(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label>Step</Label>
                <Input
                  type="number"
                  value={field.validation?.step || ''}
                  onChange={(e) => updateValidation({ step: parseFloat(e.target.value) || undefined })}
                />
              </div>
            </>
          ) : null}

          <div>
            <Label>Custom Error Message</Label>
            <Input
              value={field.validation?.customMessage || ''}
              onChange={(e) => updateValidation({ customMessage: e.target.value || undefined })}
            />
          </div>
        </TabsContent>

        <TabsContent value="options" className="space-y-4">
          {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
            <div>
              <Label>Options (one per line)</Label>
              <Textarea
                value={field.options?.map(opt => `${opt.value}|${opt.label}`).join('\n') || ''}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                  const options = e.target.value.split('\n').map(line => {
                    const [value, label] = line.split('|');
                    return { value: value || '', label: label || value || '' };
                  }).filter(opt => opt.value);
                  updateField({ options });
                }}
                rows={5}
                placeholder="value|Label"
              />
            </div>
          )}

          {field.type === 'file' && (
            <>
              <div>
                <Label>Allowed File Types</Label>
                <Input
                  value={field.fileConfig?.allowedTypes?.join(', ') || ''}
                  onChange={(e) => updateField({
                    fileConfig: {
                      ...field.fileConfig,
                      allowedTypes: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                    }
                  })}
                  placeholder="jpg, png, pdf"
                />
              </div>
              <div>
                <Label>Max File Size (MB)</Label>
                <Input
                  type="number"
                  value={field.fileConfig?.maxSize || ''}
                  onChange={(e) => updateField({
                    fileConfig: {
                      ...field.fileConfig,
                      maxSize: parseInt(e.target.value) || undefined,
                    }
                  })}
                />
              </div>
            </>
          )}

          <div>
            <Label>CSS Classes</Label>
            <Input
              value={field.cssClass || ''}
              onChange={(e) => updateField({ cssClass: e.target.value })}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};