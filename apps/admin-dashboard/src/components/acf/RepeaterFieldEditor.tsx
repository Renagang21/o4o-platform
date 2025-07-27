import { useState, FC } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CustomField, ACFRepeaterField } from '@o4o/types'
import FieldEditor from './FieldEditor'

interface RepeaterFieldEditorProps {
  field: ACFRepeaterField
  onChange: (field: ACFRepeaterField) => void
}

const RepeaterFieldEditor: FC<RepeaterFieldEditorProps> = ({ field, onChange }) => {
  const [expandedFields, setExpandedFields] = useState<string[]>([])

  const handleAddSubField = () => {
    const newSubField: CustomField = {
      id: `field-${Date.now()}`,
      name: '',
      key: '',
      type: 'text',
      label: '',
      required: false,
    }

    onChange({
      ...field,
      subFields: [...(field.subFields || []), newSubField],
    })
  }

  const handleUpdateSubField = (index: number, updatedField: CustomField) => {
    const newSubFields = [...(field.subFields || [])]
    newSubFields[index] = updatedField
    onChange({
      ...field,
      subFields: newSubFields,
    })
  }

  const handleDeleteSubField = (index: number) => {
    const newSubFields = field.subFields?.filter((_, i) => i !== index) || []
    onChange({
      ...field,
      subFields: newSubFields,
    })
  }

  const toggleFieldExpanded = (fieldId: string) => {
    setExpandedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    )
  }

  return (
    <div className="space-y-4">
      {/* Repeater Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="minRows">최소 행 수</Label>
          <Input
            id="minRows"
            type="number"
            min="0"
            value={field.minRows || ''}
            onChange={(e: any) => onChange({
              ...field,
              minRows: e.target.value ? parseInt(e.target.value) : undefined,
            })}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="maxRows">최대 행 수</Label>
          <Input
            id="maxRows"
            type="number"
            min="0"
            value={field.maxRows || ''}
            onChange={(e: any) => onChange({
              ...field,
              maxRows: e.target.value ? parseInt(e.target.value) : undefined,
            })}
            placeholder="무제한"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="buttonLabel">추가 버튼 텍스트</Label>
        <Input
          id="buttonLabel"
          value={field.buttonLabel || ''}
          onChange={(e: any) => onChange({
            ...field,
            buttonLabel: e.target.value,
          })}
          placeholder="행 추가"
        />
      </div>

      {/* Sub Fields */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">하위 필드</h4>
          <Button
            variant={"outline" as const}
            size={"sm" as const}
            onClick={handleAddSubField}
          >
            <Plus className="w-4 h-4 mr-2" />
            필드 추가
          </Button>
        </div>

        {field.subFields?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-center py-6">
              <p className="text-sm text-gray-500 mb-3">
                아직 하위 필드가 없습니다
              </p>
              <Button
                variant={"outline" as const}
                size={"sm" as const}
                onClick={handleAddSubField}
              >
                <Plus className="w-4 h-4 mr-2" />
                첫 필드 추가
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {field.subFields?.map((subField: CustomField, index: number) => (
              <Card key={subField.id}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleFieldExpanded(subField.id)}
                      className="flex items-center gap-2 text-left flex-1"
                    >
                      {expandedFields.includes(subField.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {subField.label || '(제목 없음)'}
                          </span>
                          <Badge variant={"outline" as const} className="text-xs">
                            {subField.type}
                          </Badge>
                          {subField.required && (
                            <Badge variant="destructive" className="text-xs">
                              필수
                            </Badge>
                          )}
                        </div>
                        {subField.key && (
                          <div className="text-xs text-gray-500 mt-1">
                            {subField.key}
                          </div>
                        )}
                      </div>
                    </button>
                    <Button
                      variant={"ghost" as const}
                      size={"sm" as const}
                      onClick={() => handleDeleteSubField(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardHeader>
                {expandedFields.includes(subField.id) && (
                  <CardContent className="pt-0">
                    <FieldEditor
                      field={subField}
                      onChange={(updated) => handleUpdateSubField(index, updated)}
                    />
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RepeaterFieldEditor