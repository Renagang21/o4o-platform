/**
 * ACF Field Selector Component
 * 
 * Allows users to select and configure ACF fields for display
 */

import { useState, useEffect } from '@wordpress/element';
import {
  CheckboxControl,
  PanelBody,
  Button,
  Notice,
  Spinner,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { dragHandle as grip, seen as eye, unseen as eyeOff, cog as settings } from '@wordpress/icons';
import apiFetch from '@wordpress/api-fetch';

interface ACFField {
  key: string;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  choices?: Record<string, string>;
  sub_fields?: ACFField[];
  return_format?: string;
}

// interface ACFFieldGroup {
//   id: string;
//   title: string;
//   fields: ACFField[];
//   location?: Array<Array<{
//     param: string;
//     operator: string;
//     value: string;
//   }>>;
// }

interface SelectedField {
  key: string;
  name: string;
  label: string;
  type: string;
  visible: boolean;
  customLabel?: string;
  displayFormat?: string;
}

// Sortable Field Item Component
const SortableFieldItem = ({ 
  field, 
  getFieldTypeIcon, 
  handleVisibilityToggle, 
  handleLabelChange 
}: {
  field: SelectedField;
  getFieldTypeIcon: (type: string) => string;
  handleVisibilityToggle: (key: string) => void;
  handleLabelChange: (key: string, label: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: isDragging ? '#e0e0e0' : '#fff',
        marginBottom: '8px',
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '4px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <span
            {...attributes}
            {...listeners}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              marginRight: '8px',
            }}
          >
            <Button
              icon={grip as any}
              size={"small" as any}
              variant="tertiary"
            />
          </span>
          
          <span style={{ marginRight: '8px' }}>
            {getFieldTypeIcon(field.type)}
          </span>
          
          <span style={{ flex: 1 }}>
            {field.customLabel || field.label}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <Button
            icon={(field.visible ? eye : eyeOff) as any}
            size={"small" as any}
            variant="tertiary"
            onClick={() => handleVisibilityToggle(field.key)}
            label={
              field.visible
                ? __('Hide field', 'o4o')
                : __('Show field', 'o4o')
            }
          />
          
          <Button
            icon={settings as any}
            size={"small" as any}
            variant="tertiary"
            onClick={() => {
              const newLabel = prompt(
                __('Custom label for this field:', 'o4o'),
                field.customLabel || field.label
              );
              if (newLabel !== null) {
                handleLabelChange(field.key, newLabel);
              }
            }}
            label={__('Edit label', 'o4o')}
          />
        </div>
      </div>
    </div>
  );
};

interface ACFFieldSelectorProps {
  postType: string;
  selectedFields: SelectedField[];
  onFieldsChange: (fields: SelectedField[]) => void;
}

export default function ACFFieldSelector({
  postType,
  selectedFields,
  onFieldsChange,
}: ACFFieldSelectorProps) {
  // const [fieldGroups, setFieldGroups] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<ACFField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [expandedField, setExpandedField] = useState<string | null>(null);

  // Fetch ACF field groups for the post type
  useEffect(() => {
    if (!postType) return;

    setIsLoading(true);
    setError(null);

    // Try to fetch ACF field groups
    apiFetch<any[]>({
      path: '/acf/v3/field-groups',
    })
      .then((groups) => {
        // Filter groups that apply to this post type
        const relevantGroups = groups.filter((group: any) => {
          if (!group.location) return false;
          
          return group.location.some((rule: any) =>
            rule.some((condition: any) =>
              condition.param === 'post_type' &&
              condition.operator === '==' &&
              condition.value === postType
            )
          );
        });

        // Collect all fields from relevant groups
        const allFields: ACFField[] = [];
        relevantGroups.forEach((group) => {
          if (group.fields) {
            allFields.push(...group.fields);
          }
        });

        setAvailableFields(allFields);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching ACF fields:', err);
        
        // Try alternative method - mock data for development
        if (postType) {
          setAvailableFields([
            {
              key: 'field_mock_text',
              name: 'custom_text',
              label: 'Custom Text',
              type: 'text',
            },
            {
              key: 'field_mock_image',
              name: 'featured_image',
              label: 'Featured Image',
              type: 'image',
              return_format: 'array',
            },
            {
              key: 'field_mock_select',
              name: 'category',
              label: 'Category',
              type: 'select',
              choices: {
                news: 'News',
                blog: 'Blog',
                tutorial: 'Tutorial',
              },
            },
            {
              key: 'field_mock_textarea',
              name: 'description',
              label: 'Description',
              type: 'textarea',
            },
            {
              key: 'field_mock_url',
              name: 'website_url',
              label: 'Website URL',
              type: 'url',
            },
            {
              key: 'field_mock_date',
              name: 'event_date',
              label: 'Event Date',
              type: 'date_picker',
            },
          ]);
        }
        
        setError(__('ACF REST API not available. Using sample fields.', 'o4o'));
        setIsLoading(false);
      });
  }, [postType]);

  // Handle field toggle
  const handleFieldToggle = (field: ACFField, checked: boolean) => {
    if (checked) {
      // Add field
      const newField: SelectedField = {
        key: field.key,
        name: field.name,
        label: field.label,
        type: field.type,
        visible: true,
      };
      onFieldsChange([...selectedFields, newField]);
    } else {
      // Remove field
      onFieldsChange(selectedFields.filter((f: any) => f.key !== field.key));
    }
  };

  // Handle field visibility toggle
  const handleVisibilityToggle = (fieldKey: string) => {
    onFieldsChange(
      selectedFields.map((field: any) =>
        field.key === fieldKey
          ? { ...field, visible: !field.visible }
          : field
      )
    );
  };

  // Handle custom label change
  const handleLabelChange = (fieldKey: string, label: string) => {
    onFieldsChange(
      selectedFields.map((field: any) =>
        field.key === fieldKey
          ? { ...field, customLabel: label }
          : field
      )
    );
  };

  // Set up drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Handle field reordering
  const handleDragEnd = (event: any) => {
    const { active, over } = event as any;

    if (active.id !== over.id) {
      const oldIndex = selectedFields.findIndex((f) => f.key === active.id);
      const newIndex = selectedFields.findIndex((f) => f.key === over.id);
      
      onFieldsChange(arrayMove(selectedFields, oldIndex, newIndex));
    }
  };

  // Get field type icon
  const getFieldTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      text: '📝',
      textarea: '📄',
      number: '🔢',
      email: '✉️',
      url: '🔗',
      image: '🖼️',
      file: '📎',
      select: '📋',
      checkbox: '☑️',
      radio: '⭕',
      true_false: '🔘',
      date_picker: '📅',
      color_picker: '🎨',
      repeater: '🔁',
      flexible_content: '🔀',
      group: '📦',
      relationship: '🔗',
      post_object: '📄',
      taxonomy: '🏷️',
    };

    return icons[type] || '📌';
  };

  if (isLoading) {
    return (
      <PanelBody title={__('ACF Fields', 'o4o')} initialOpen={false}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spinner />
          <p>{__('Loading ACF fields...', 'o4o')}</p>
        </div>
      </PanelBody>
    );
  }

  return (
    <PanelBody title={__('ACF Fields', 'o4o')} initialOpen={false}>
      {error && (
        <Notice status="info" isDismissible={false}>
          {error}
        </Notice>
      )}

      {availableFields.length === 0 ? (
        <Notice status="warning" isDismissible={false}>
          {__('No ACF fields found for this post type.', 'o4o')}
        </Notice>
      ) : (
        <>
          <h3 style={{ marginTop: 0, marginBottom: '10px' }}>
            {__('Available Fields', 'o4o')}
          </h3>
          
          <div style={{ marginBottom: '20px' }}>
            {availableFields.map((field: any) => (
              <CheckboxControl
                key={field.key}
                label={field.label + ` (${field.name})`}
                checked={selectedFields.some((f) => f.key === field.key)}
                onChange={(checked: any) => handleFieldToggle(field, checked)}
              />
            ))}
          </div>

          {selectedFields.length > 0 && (
            <>
              <h3 style={{ marginBottom: '10px' }}>
                {__('Selected Fields', 'o4o')}
              </h3>
              
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={selectedFields.map((f: any) => f.key)}
                  strategy={verticalListSortingStrategy}
                >
                  <div
                    style={{
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      padding: '8px',
                      background: '#f9f9f9',
                    }}
                  >
                    {selectedFields.map((field: any) => (
                      <SortableFieldItem
                        key={field.key}
                        field={field}
                        getFieldTypeIcon={getFieldTypeIcon}
                        handleVisibilityToggle={handleVisibilityToggle}
                        handleLabelChange={handleLabelChange}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}
        </>
      )}
    </PanelBody>
  );
}