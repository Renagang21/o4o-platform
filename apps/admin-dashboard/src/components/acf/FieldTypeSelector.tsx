import { ComponentType, FC } from 'react';
import {
  Type,
  Hash,
  Calendar,
  Image,
  FileText,
  Link,
  Mail,
  Palette,
  ToggleLeft,
  List,
  Radio,
  Copy,
  Database,
  Users,
  MapPin,
  Layers,
  Group,
  Package,
  Images,
  GitBranch
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FieldType {
  value: string
  label: string
  icon: ComponentType<{ className?: string }>
  category: 'basic' | 'content' | 'choice' | 'relational' | 'layout' | 'advanced'
  description: string
}

const fieldTypes: FieldType[] = [
  // Basic Fields
  { value: 'text', label: '텍스트', icon: Type, category: 'basic', description: '단일 행 텍스트 입력' },
  { value: 'textarea', label: '텍스트 영역', icon: FileText, category: 'basic', description: '여러 행 텍스트 입력' },
  { value: 'number', label: '숫자', icon: Hash, category: 'basic', description: '숫자 입력' },
  { value: 'email', label: '이메일', icon: Mail, category: 'basic', description: '이메일 주소 입력' },
  { value: 'url', label: 'URL', icon: Link, category: 'basic', description: '웹사이트 주소 입력' },
  
  // Content Fields
  { value: 'wysiwyg', label: '에디터', icon: FileText, category: 'content', description: 'WYSIWYG 리치 텍스트 에디터' },
  { value: 'image', label: '이미지', icon: Image, category: 'content', description: '단일 이미지 업로드' },
  { value: 'gallery', label: '갤러리', icon: Images, category: 'content', description: '여러 이미지 갤러리' },
  { value: 'file', label: '파일', icon: FileText, category: 'content', description: '파일 업로드' },
  
  // Choice Fields
  { value: 'select', label: '선택', icon: List, category: 'choice', description: '드롭다운 선택' },
  { value: 'checkbox', label: '체크박스', icon: ToggleLeft, category: 'choice', description: '다중 선택 체크박스' },
  { value: 'radio', label: '라디오', icon: Radio, category: 'choice', description: '단일 선택 라디오 버튼' },
  { value: 'button_group', label: '버튼 그룹', icon: Group, category: 'choice', description: '버튼 형태의 선택' },
  { value: 'true_false', label: '참/거짓', icon: ToggleLeft, category: 'choice', description: '토글 스위치' },
  
  // Relational Fields
  { value: 'relationship', label: '관계', icon: GitBranch, category: 'relational', description: '게시물 간 관계 설정' },
  { value: 'post_object', label: '게시물 선택', icon: Database, category: 'relational', description: '게시물 선택기' },
  { value: 'taxonomy', label: '분류', icon: Database, category: 'relational', description: '카테고리/태그 선택' },
  { value: 'user', label: '사용자', icon: Users, category: 'relational', description: '사용자 선택' },
  
  // Layout Fields
  { value: 'repeater', label: '반복 필드', icon: Copy, category: 'layout', description: '반복 가능한 필드 그룹' },
  { value: 'flexible_content', label: '유연한 콘텐츠', icon: Layers, category: 'layout', description: '유연한 레이아웃 블록' },
  { value: 'group', label: '그룹', icon: Package, category: 'layout', description: '필드 그룹화' },
  { value: 'clone', label: '복제', icon: Copy, category: 'layout', description: '다른 필드 복제' },
  
  // Advanced Fields
  { value: 'date_picker', label: '날짜 선택', icon: Calendar, category: 'advanced', description: '날짜 선택기' },
  { value: 'date_time_picker', label: '날짜/시간', icon: Calendar, category: 'advanced', description: '날짜와 시간 선택' },
  { value: 'color_picker', label: '색상', icon: Palette, category: 'advanced', description: '색상 선택기' },
  { value: 'google_map', label: '구글 지도', icon: MapPin, category: 'advanced', description: '위치 선택' },
]

interface FieldTypeSelectorProps {
  onSelect: (type: string) => void
  selectedType?: string
}

const FieldTypeSelector: FC<FieldTypeSelectorProps> = ({ onSelect, selectedType }) => {
  const categories = [
    { key: 'basic', label: '기본 필드' },
    { key: 'content', label: '콘텐츠 필드' },
    { key: 'choice', label: '선택 필드' },
    { key: 'relational', label: '관계 필드' },
    { key: 'layout', label: '레이아웃 필드' },
    { key: 'advanced', label: '고급 필드' },
  ]

  return (
    <div className="space-y-6">
      {categories.map((category: any) => {
        const categoryFields = fieldTypes.filter((field: any) => field.category === category.key)
        
        return (
          <div key={category.key}>
            <h4 className="text-sm font-medium text-gray-700 mb-3">{category.label}</h4>
            <div className="grid grid-cols-2 gap-2">
              {categoryFields.map((field: any) => {
                const Icon = field.icon
                const isSelected = selectedType === field.value
                
                return (
                  <Button
                    key={field.value}
                    variant={isSelected ? 'default' : 'outline'}
                    size={"sm" as const}
                    className="justify-start h-auto py-3 px-3"
                    onClick={() => onSelect(field.value)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium">{field.label}</div>
                        <div className="text-xs text-gray-500 font-normal">
                          {field.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default FieldTypeSelector
export { fieldTypes }