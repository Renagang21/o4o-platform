/**
 * SortableField Component
 * Draggable field item for field groups
 */

import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import {
  GripVertical,
  Edit2,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Type,
  Hash,
  Calendar,
  Link,
  Image,
  FileText,
  ToggleLeft,
  List,
  Database,
  Users,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Field {
  id: string;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
  description?: string;
  options?: any;
  order: number;
}

interface SortableFieldProps {
  field: Field;
  onEdit: (field: Field) => void;
  onDelete: (fieldId: string) => void;
  onDuplicate: (field: Field) => void;
}

const FIELD_TYPE_ICONS: Record<string, any> = {
  text: Type,
  textarea: FileText,
  number: Hash,
  email: Type,
  url: Link,
  select: List,
  checkbox: ToggleLeft,
  radio: ToggleLeft,
  date: Calendar,
  image: Image,
  file: FileText,
  wysiwyg: FileText,
  relationship: Database,
  post_object: Package,
  user: Users,
  true_false: ToggleLeft,
  repeater: Copy,
};

export function SortableField({ field, onEdit, onDelete, onDuplicate }: SortableFieldProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
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
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = FIELD_TYPE_ICONS[field.type] || Type;

  const getFieldTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      text: 'Text',
      textarea: 'Text Area',
      number: 'Number',
      email: 'Email',
      url: 'URL',
      select: 'Select',
      checkbox: 'Checkbox',
      radio: 'Radio',
      date: 'Date',
      image: 'Image',
      file: 'File',
      wysiwyg: 'WYSIWYG',
      relationship: 'Relationship',
      post_object: 'Post Object',
      user: 'User',
      true_false: 'True/False',
      repeater: 'Repeater',
    };
    return labels[type] || type;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg bg-white"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-move text-gray-400 hover:text-gray-600 mt-1"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Field Icon */}
          <div className="flex-shrink-0 mt-1">
            <Icon className="w-5 h-5 text-gray-500" />
          </div>

          {/* Field Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{field.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {field.name || 'auto-generated'}
                  </Badge>
                  {field.required && (
                    <Badge variant="destructive" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>{getFieldTypeLabel(field.type)}</span>
                  {field.placeholder && (
                    <span className="text-xs">• Placeholder: {field.placeholder}</span>
                  )}
                </div>
                {field.description && (
                  <p className="text-sm text-gray-500 mt-1">{field.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(field)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Field
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(field)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(field.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t ml-14">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Field Name:</span>
                <span className="ml-2 font-mono">{field.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Type:</span>
                <span className="ml-2">{getFieldTypeLabel(field.type)}</span>
              </div>
              {field.defaultValue && (
                <div>
                  <span className="text-gray-500">Default Value:</span>
                  <span className="ml-2">{field.defaultValue}</span>
                </div>
              )}
              {field.options?.postType && (
                <div>
                  <span className="text-gray-500">Related Post Type:</span>
                  <span className="ml-2">{field.options.postType}</span>
                </div>
              )}
              {field.options?.choices && (
                <div className="col-span-2">
                  <span className="text-gray-500">Choices:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {field.options.choices.map((choice: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {choice}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}