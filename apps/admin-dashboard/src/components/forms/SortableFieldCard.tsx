import { FC } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Trash2 } from 'lucide-react';
import { SortableFormField } from './SortableFormField';
import type { FormField } from '@o4o/types';

interface SortableFieldCardProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const SortableFieldCard: FC<SortableFieldCardProps> = ({
  field,
  isSelected,
  onSelect,
  onUpdate: _onUpdate,
  onDelete,
  onDuplicate,
}) => {
  return (
    <SortableFormField field={field}>
      <Card 
        className={`cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{field.label}</h4>
              <p className="text-sm text-gray-500">{field.name} - {field.type}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={"ghost" as const}
                size={"icon" as const}
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant={"ghost" as const}
                size={"icon" as const}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </SortableFormField>
  );
};