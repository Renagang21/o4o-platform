/**
 * Sortable Form Field Component
 * Draggable field item for form builder
 */

import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Type,
  Hash,
  Calendar,
  Mail,
  Link,
  FileText,
  ToggleLeft,
  List,
  CheckSquare,
  Radio,
  Image,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: any;
  validation?: any;
  order: number;
}

interface SortableFormFieldProps {
  field: FormField;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const fieldIcons: Record<string, any> = {
  text: Type,
  number: Hash,
  email: Mail,
  url: Link,
  date: Calendar,
  textarea: FileText,
  select: List,
  checkbox: CheckSquare,
  radio: Radio,
  true_false: ToggleLeft,
  file: Image,
  relationship: Database
};

export function SortableFormField({
  field,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete
}: SortableFormFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = fieldIcons[field.type] || Type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg bg-white",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center gap-2 p-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-move text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Field Icon */}
        <Icon className="w-4 h-4 text-gray-500" />

        {/* Field Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{field.label}</span>
            <span className="text-sm text-gray-500">({field.name})</span>
            {field.required && (
              <Badge variant="secondary" className="text-xs">
                Required
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {field.type}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-12 pb-3 border-t">
          <div className="pt-3 space-y-2 text-sm">
            {field.placeholder && (
              <div>
                <span className="font-medium text-gray-600">Placeholder:</span>{' '}
                <span className="text-gray-700">{field.placeholder}</span>
              </div>
            )}
            {field.description && (
              <div>
                <span className="font-medium text-gray-600">Description:</span>{' '}
                <span className="text-gray-700">{field.description}</span>
              </div>
            )}
            {field.type === 'select' && field.options?.choices && (
              <div>
                <span className="font-medium text-gray-600">Options:</span>{' '}
                <span className="text-gray-700">
                  {Array.isArray(field.options.choices) 
                    ? field.options.choices.join(', ')
                    : Object.entries(field.options.choices as Record<string, string>)
                        .map(([key, value]) => `${value} (${key})`)
                        .join(', ')
                  }
                </span>
              </div>
            )}
            {field.type === 'relationship' && field.options?.postType && (
              <div>
                <span className="font-medium text-gray-600">Related CPT:</span>{' '}
                <span className="text-gray-700">{field.options.postType}</span>
              </div>
            )}
            {field.validation && (
              <div>
                <span className="font-medium text-gray-600">Validation:</span>{' '}
                <span className="text-gray-700">
                  {JSON.stringify(field.validation)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}