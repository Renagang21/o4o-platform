import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import type { CustomField } from '@o4o/types'

interface FieldEditorProps {
  field: CustomField
  onChange: (field: CustomField) => void
}

const FieldEditor: React.FC<FieldEditorProps> = ({ field, onChange }) => {
  const generateKey = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  const handleNameChange = (name: string) => {
    onChange({
      ...field,
      name,
      key: generateKey(name),
      label: name,
    })
  }

  return (
    <div className="space-y-4">
      {/* Basic Field Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${field.id}-name`}>필드 이름</Label>
          <Input
            id={`${field.id}-name`}
            value={field.name}
            onChange={(e: any) => handleNameChange(e.target.value)}
            placeholder="예: 가격"
          />
        </div>
        <div>
          <Label htmlFor={`${field.id}-key`}>필드 키</Label>
          <Input
            id={`${field.id}-key`}
            value={field.key}
            onChange={(e: any) => onChange({ ...field, key: e.target.value })}
            placeholder="예: price"
          />
        </div>
      </div>

      <div>
        <Label htmlFor={`${field.id}-label`}>레이블</Label>
        <Input
          id={`${field.id}-label`}
          value={field.label}
          onChange={(e: any) => onChange({ ...field, label: e.target.value })}
          placeholder="편집 화면에 표시될 레이블"
        />
      </div>

      <div>
        <Label htmlFor={`${field.id}-description`}>설명 (선택)</Label>
        <Textarea
          id={`${field.id}-description`}
          value={field.description || ''}
          onChange={(e: any) => onChange({ ...field, description: e.target.value })}
          placeholder="필드 사용 방법에 대한 설명"
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor={`${field.id}-placeholder`}>플레이스홀더 (선택)</Label>
        <Input
          id={`${field.id}-placeholder`}
          value={field.placeholder || ''}
          onChange={(e: any) => onChange({ ...field, placeholder: e.target.value })}
          placeholder="입력 필드에 표시될 힌트 텍스트"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id={`${field.id}-required`}
          checked={field.required || false}
          onCheckedChange={(checked) => onChange({ ...field, required: checked })}
        />
        <Label htmlFor={`${field.id}-required`}>필수 필드</Label>
      </div>

      {/* Type-specific options */}
      {field.type === 'number' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${field.id}-min`}>최소값</Label>
            <Input
              id={`${field.id}-min`}
              type="number"
              value={field.min || ''}
              onChange={(e: any) => onChange({ 
                ...field, 
                min: e.target.value ? parseInt(e.target.value) : undefined 
              })}
            />
          </div>
          <div>
            <Label htmlFor={`${field.id}-max`}>최대값</Label>
            <Input
              id={`${field.id}-max`}
              type="number"
              value={field.max || ''}
              onChange={(e: any) => onChange({ 
                ...field, 
                max: e.target.value ? parseInt(e.target.value) : undefined 
              })}
            />
          </div>
        </div>
      )}

      {(field.type === 'text' || field.type === 'textarea') && (
        <div>
          <Label htmlFor={`${field.id}-maxLength`}>최대 길이</Label>
          <Input
            id={`${field.id}-maxLength`}
            type="number"
            value={field.maxLength || ''}
            onChange={(e: any) => onChange({ 
              ...field, 
              maxLength: e.target.value ? parseInt(e.target.value) : undefined 
            })}
          />
        </div>
      )}

      {(field.type === 'select' || field.type === 'checkbox' || field.type === 'radio') && (
        <div>
          <Label>옵션</Label>
          <div className="space-y-2 mt-2">
            {(field.options || []).map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="레이블"
                  value={option.label}
                  onChange={(e: any) => {
                    const newOptions = [...(field.options || [])]
                    newOptions[index] = { ...option, label: e.target.value }
                    onChange({ ...field, options: newOptions })
                  }}
                />
                <Input
                  placeholder="값"
                  value={option.value}
                  onChange={(e: any) => {
                    const newOptions = [...(field.options || [])]
                    newOptions[index] = { ...option, value: e.target.value }
                    onChange({ ...field, options: newOptions })
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newOptions = field.options?.filter((_, i: any) => i !== index)
                    onChange({ ...field, options: newOptions })
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newOptions = [...(field.options || []), { label: '', value: '' }]
                onChange({ ...field, options: newOptions })
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              옵션 추가
            </Button>
          </div>
        </div>
      )}

      {field.type === 'image' && (
        <div>
          <Label>이미지 설정</Label>
          <div className="space-y-2 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`${field.id}-minWidth`}>최소 너비 (px)</Label>
                <Input
                  id={`${field.id}-minWidth`}
                  type="number"
                  value={field.minWidth || ''}
                  onChange={(e: any) => onChange({ 
                    ...field, 
                    minWidth: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                />
              </div>
              <div>
                <Label htmlFor={`${field.id}-minHeight`}>최소 높이 (px)</Label>
                <Input
                  id={`${field.id}-minHeight`}
                  type="number"
                  value={field.minHeight || ''}
                  onChange={(e: any) => onChange({ 
                    ...field, 
                    minHeight: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {field.type === 'wysiwyg' && (
        <div>
          <Label htmlFor={`${field.id}-rows`}>에디터 행 수</Label>
          <Input
            id={`${field.id}-rows`}
            type="number"
            value={field.rows || 10}
            onChange={(e: any) => onChange({ 
              ...field, 
              rows: e.target.value ? parseInt(e.target.value) : 10 
            })}
          />
        </div>
      )}

      {/* Default Value */}
      <div>
        <Label htmlFor={`${field.id}-defaultValue`}>기본값 (선택)</Label>
        {field.type === 'textarea' || field.type === 'wysiwyg' ? (
          <Textarea
            id={`${field.id}-defaultValue`}
            value={field.defaultValue || ''}
            onChange={(e: any) => onChange({ ...field, defaultValue: e.target.value })}
            placeholder="필드의 기본값"
            rows={3}
          />
        ) : field.type === 'checkbox' || field.type === 'true_false' ? (
          <div className="flex items-center space-x-2 mt-2">
            <Switch
              id={`${field.id}-defaultValue`}
              checked={field.defaultValue === true}
              onCheckedChange={(checked) => onChange({ ...field, defaultValue: checked })}
            />
            <Label htmlFor={`${field.id}-defaultValue`}>
              기본적으로 체크됨
            </Label>
          </div>
        ) : (
          <Input
            id={`${field.id}-defaultValue`}
            value={field.defaultValue || ''}
            onChange={(e: any) => onChange({ ...field, defaultValue: e.target.value })}
            placeholder="필드의 기본값"
          />
        )}
      </div>
    </div>
  )
}

export default FieldEditor